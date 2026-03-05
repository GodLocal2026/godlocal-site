"""
GodLocal API Backend — Flask / Gunicorn for Render
Routes: /health /status /mobile/status /mobile/kill-switch /market /think /agent/tick
        /hitl/task  /hitl/tasks
        /ws/oasis   WebSocket — streams thinking + token events to Oasis UI

HITL layer:
  - TaskQueue   → Supabase (SUPABASE_URL + SUPABASE_SERVICE_KEY)
  - HITLNotifier → Telegram bot (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
  - Runs in background asyncio thread; graceful fallback if env vars missing.
"""
import os, sys, time, json, threading, asyncio, logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("godlocal.server")

app = Flask(__name__)
CORS(app)

# -- State ------------------------------------------------------------------
_lock         = threading.Lock()
_kill_switch  = os.environ.get("XZERO_KILL_SWITCH", "false").lower() == "true"
_thoughts: list = []
_sparks:   list = []
_market_cache: dict = {"data": None, "ts": 0.0}

GROQ_KEY      = os.environ.get("GROQ_API_KEY", "")
COMPOSIO_KEY  = os.environ.get("COMPOSIO_API_KEY", "")
MODELS        = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-8b-8192"]

# -- HITL bootstrap ---------------------------------------------------------
_HITL_READY   = False
_hitl_loop    = None
_hitl_tq      = None
_hitl_notifier= None

SUPABASE_URL  = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY", "")
TG_BOT_TOKEN  = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT_ID    = os.environ.get("TELEGRAM_CHAT_ID", "")

def _hitl_available():
    return bool(SUPABASE_URL and SUPABASE_KEY and TG_BOT_TOKEN and TG_CHAT_ID)

def _start_hitl_thread():
    global _HITL_READY, _hitl_loop, _hitl_tq, _hitl_notifier
    if not _hitl_available():
        logger.info("HITL: env vars missing — running without HITL")
        return
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "godlocal_hitl"))
        from task_queue import TaskQueue
        from telegram_hitl import HITLNotifier
        loop = asyncio.new_event_loop()
        _hitl_loop = loop
        tq = TaskQueue(cell_id="godlocal-main")
        _hitl_tq = tq
        notifier = HITLNotifier(
            tq,
            on_approve=_on_hitl_approve,
            on_edit=_on_hitl_edit,
            on_cancel=_on_hitl_cancel,
        )
        _hitl_notifier = notifier
        _HITL_READY = True
        logger.info("HITL: TaskQueue + HITLNotifier ready")
        loop.run_until_complete(notifier.start_polling())
    except Exception as e:
        logger.warning("HITL thread error: %s", e)

async def _on_hitl_approve(task):
    logger.info("HITL approved: %s", task.get("title"))
    draft = task.get("draft_data") or {}
    dtype = task.get("draft_type", "")
    if dtype == "social_draft" and draft.get("platform") == "twitter":
        _fire_and_forget_tweet(draft.get("message", ""))

async def _on_hitl_edit(task, new_content):
    logger.info("HITL edited: %s → %s", task.get("title"), new_content[:60])

async def _on_hitl_cancel(task):
    logger.info("HITL cancelled: %s", task.get("title"))

def _fire_and_forget_tweet(text: str):
    if not COMPOSIO_KEY or not text:
        return
    try:
        requests.post(
            "https://backend.composio.dev/api/v2/actions/TWITTER_CREATION_OF_A_POST/execute",
            json={"input": {"text": text}},
            headers={"x-api-key": COMPOSIO_KEY, "Content-Type": "application/json"},
            timeout=15,
        )
    except Exception as e:
        logger.warning("Tweet fire-and-forget failed: %s", e)

# -- Market -----------------------------------------------------------------
def get_market():
    now = time.time()
    if now - _market_cache["ts"] < 300 and _market_cache["data"]:
        return _market_cache["data"]
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "bitcoin,ethereum,solana,binancecoin,sui",
                    "vs_currencies": "usd", "include_24hr_change": "true"},
            timeout=8,
        )
        data = r.json()
        _market_cache["data"] = data
        _market_cache["ts"]   = now
        return data
    except Exception as e:
        return {"error": str(e)}

# -- Groq -------------------------------------------------------------------
def groq_call(messages, tools=None, idx=0):
    if idx >= len(MODELS):
        return None, "all models exhausted"
    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type":  "application/json",
        "User-Agent":    "groq-python/0.21.0",
    }
    body = {"model": MODELS[idx], "messages": messages,
            "max_tokens": 512, "temperature": 0.6}
    if tools:
        body["tools"]       = tools
        body["tool_choice"] = "auto"
    try:
        r = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=body, headers=headers, timeout=30,
        )
        if r.status_code == 429:
            return groq_call(messages, tools, idx + 1)
        r.raise_for_status()
        return r.json(), None
    except Exception as e:
        return groq_call(messages, tools, idx + 1) if idx < len(MODELS) - 1 else (None, str(e))

# -- Tool schemas -----------------------------------------------------------
BASE_TOOLS = [
    {"type": "function", "function": {
        "name": "get_market_data",
        "description": "Live crypto prices BTC/ETH/SOL/BNB/SUI",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "get_system_status",
        "description": "Kill switch + circuit breaker state",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "get_recent_thoughts",
        "description": "Last 5 agent thoughts",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "set_kill_switch",
        "description": "Enable/disable trading",
        "parameters": {"type": "object",
                       "properties": {"active": {"type": "boolean"},
                                      "reason": {"type": "string"}},
                       "required": ["active"]}}},
    {"type": "function", "function": {
        "name": "add_spark",
        "description": "Log trading signal to SparkNet",
        "parameters": {"type": "object",
                       "properties": {"signal":     {"type": "string"},
                                      "confidence": {"type": "number"},
                                      "action":     {"type": "string"}},
                       "required": ["signal", "confidence", "action"]}}},
]

COMPOSIO_TOOLS = [
    {"type": "function", "function": {
        "name": "post_tweet",
        "description": "Post tweet to @kitbtc via Composio (requires HITL approval if HITL active)",
        "parameters": {"type": "object",
                       "properties": {"text": {"type": "string"}},
                       "required": ["text"]}}},
    {"type": "function", "function": {
        "name": "send_telegram",
        "description": "Send Telegram message via Composio",
        "parameters": {"type": "object",
                       "properties": {"text": {"type": "string"}},
                       "required": ["text"]}}},
    {"type": "function", "function": {
        "name": "create_github_issue",
        "description": "Create GitHub issue in GodLocal2026/godlocal-site",
        "parameters": {"type": "object",
                       "properties": {"title": {"type": "string"},
                                      "body":  {"type": "string"}},
                       "required": ["title"]}}},
]

def all_tools():
    return BASE_TOOLS + (COMPOSIO_TOOLS if COMPOSIO_KEY else [])

# -- Tool executor ----------------------------------------------------------
def run_tool(name, args):
    global _kill_switch
    if name == "get_market_data":
        return json.dumps(get_market())
    if name == "get_system_status":
        return json.dumps({"kill_switch": _kill_switch,
                           "hitl_ready": _HITL_READY,
                           "sparks": len(_sparks), "thoughts": len(_thoughts)})
    if name == "get_recent_thoughts":
        return json.dumps(_thoughts[-5:])
    if name == "set_kill_switch":
        with _lock:
            _kill_switch = bool(args.get("active", False))
        return json.dumps({"ok": True, "kill_switch": _kill_switch})
    if name == "add_spark":
        spark = {**args, "ts": datetime.utcnow().isoformat()}
        with _lock:
            _sparks.append(spark)
            if len(_sparks) > 50: _sparks.pop(0)
        return json.dumps({"ok": True, "spark": spark})

    if not COMPOSIO_KEY:
        return json.dumps({"error": "COMPOSIO_API_KEY not set"})
    headers = {"x-api-key": COMPOSIO_KEY, "Content-Type": "application/json"}
    base = "https://backend.composio.dev/api/v2/actions"
    try:
        if name == "post_tweet":
            text = args.get("text", "")
            if _HITL_READY and _hitl_tq and _hitl_notifier and _hitl_loop:
                task = _hitl_tq.create(
                    title="Опубликовать твит @kitbtc",
                    executor="human",
                    draft_type="social_draft",
                    draft_data={"platform": "twitter", "message": text},
                    why_human="Агент хочет опубликовать твит — подтвердите"
                )
                asyncio.run_coroutine_threadsafe(
                    _hitl_notifier.send_card(task["id"]), _hitl_loop)
                return json.dumps({"ok": True, "hitl": True, "task_id": task["id"]})
            r = requests.post(f"{base}/TWITTER_CREATION_OF_A_POST/execute",
                json={"input": {"text": text}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})

        if name == "send_telegram":
            if _HITL_READY and _hitl_notifier and _hitl_loop:
                asyncio.run_coroutine_threadsafe(
                    _hitl_notifier.notify(args.get("text", "")), _hitl_loop)
                return json.dumps({"ok": True, "via": "hitl_bot"})
            r = requests.post(f"{base}/TELEGRAM_SEND_MESSAGE/execute",
                json={"input": {"text": args.get("text", "")}},
                headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})

        if name == "create_github_issue":
            r = requests.post(f"{base}/GITHUB_CREATE_AN_ISSUE/execute",
                json={"input": {"owner": "GodLocal2026", "repo": "godlocal-site",
                               "title": args.get("title", ""),
                               "body":  args.get("body", "")}},
                headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
    except Exception as e:
        return json.dumps({"error": str(e)})
    return json.dumps({"error": f"unknown tool: {name}"})

# -- ReAct loop (with optional ws_emit for Oasis thinking stream) -----------
def react(prompt, history=None, ws_emit=None):
    """
    Run ReAct loop.
    ws_emit(event_type, value) -- optional callback for WebSocket streaming.
    Called with ('thinking', text) before each step and ('tool_done', result)
    after each tool call, so Oasis can display live reasoning.
    """
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    msgs = [{"role": "system", "content":
        f"You are GodLocal autonomous AI agent.\n"
        f"Date: {now_str}\nUse ReAct: think → tool → observe → respond.\n"
        f"Max 8 steps. Last step MUST be plain text.\n"
        f"HITL active: {_HITL_READY} (tweets require human approval via Telegram)."
    }]
    if history:
        msgs.extend(history[-6:])
    msgs.append({"role": "user", "content": prompt})
    steps = []
    tools = all_tools()
    used_model = MODELS[0]
    for step in range(8):
        force_text = (step == 7)
        resp, err = groq_call(msgs, tools=None if force_text else tools)
        if err or not resp:
            if ws_emit:
                ws_emit("thinking", f"[error] {err}")
            break
        choice = resp["choices"][0]
        msg    = choice["message"]
        used_model = resp.get("model", MODELS[0])
        if not force_text and msg.get("tool_calls"):
            msgs.append(msg)
            for tc in msg["tool_calls"]:
                fn_name = tc["function"]["name"]
                fn_args = json.loads(tc["function"].get("arguments") or "{}")
                if ws_emit:
                    ws_emit("thinking", f"→ {fn_name}({json.dumps(fn_args)[:100]})")
                result  = run_tool(fn_name, fn_args)
                if ws_emit:
                    ws_emit("thinking", f"✓ {fn_name}: {result[:120]}")
                steps.append({"tool": fn_name, "result": result[:300]})
                msgs.append({"role": "tool",
                             "tool_call_id": tc["id"],
                             "content": result})
        else:
            text = msg.get("content") or ""
            with _lock:
                _thoughts.append({"text": text[:200],
                                  "ts": datetime.utcnow().isoformat(),
                                  "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            return text, steps, used_model
    return "Internal error", steps, used_model


# -- Follow-up question generator -------------------------------------------
def generate_follow_up(prompt: str, response: str) -> list:
    if not GROQ_KEY:
        return []
    try:
        msgs = [
            {"role": "system", "content":
                "You are a helpful assistant. Based on the user's question and the AI's answer, "
                "generate exactly 3 short follow-up questions the user might want to ask next. "
                "Rules:\n"
                "- Each question must be under 8 words\n"
                "- Questions should deepen understanding or explore next steps\n"
                "- Respond ONLY with a JSON array of 3 strings, no other text\n"
                "- Example: [\"How does X work?\", \"What about Y?\", \"Can I do Z?\"]\n"
                "- Match the language of the user's question (Russian or English)"},
            {"role": "user", "content":
                f"User asked: {prompt[:300]}\n\nAI answered: {response[:400]}\n\n"
                f"Generate 3 short follow-up questions as JSON array:"}
        ]
        resp, err = groq_call(msgs, tools=None, idx=1)
        if err or not resp:
            return []
        content = resp["choices"][0]["message"].get("content", "")
        start = content.find("[")
        end   = content.rfind("]") + 1
        if start == -1 or end == 0:
            return []
        questions = json.loads(content[start:end])
        if isinstance(questions, list):
            return [str(q) for q in questions[:3]]
        return []
    except Exception as e:
        logger.warning("follow_up generation failed: %s", e)
        return []


# -- WebSocket (flask-sock) -------------------------------------------------
try:
    from flask_sock import Sock
    sock = Sock(app)
    _WS_AVAILABLE = True
except ImportError:
    _WS_AVAILABLE = False
    logger.info("flask-sock not installed — /ws/oasis WebSocket disabled")

if _WS_AVAILABLE:
    @sock.route("/ws/oasis")
    def ws_oasis(ws):
        """Stream thinking + tokens to Oasis UI in real time."""
        while True:
            try:
                raw = ws.receive()
                if raw is None:
                    break
                data    = json.loads(raw)
                message = data.get("message", "").strip()
                img_b64 = data.get("image_base64")
                if not message and not img_b64:
                    continue

                def emit(t, v=""):
                    try:
                        ws.send(json.dumps({"t": t, "v": v}))
                    except Exception:
                        pass

                def ws_emit(event_type, value):
                    emit("thinking", value)

                prompt = message or "[Image] Describe this."

                emit("thinking_start")
                response_text, steps, model = react(prompt, ws_emit=ws_emit)
                emit("thinking_done")

                # Stream response word-by-word
                words = response_text.split(" ")
                for i, word in enumerate(words):
                    emit("token", word + (" " if i < len(words) - 1 else ""))

                emit("done")

            except Exception as e:
                try:
                    ws.send(json.dumps({"t": "error", "v": str(e)}))
                except Exception:
                    pass
                break


# -- REST Routes ------------------------------------------------------------
@app.route("/",        methods=["GET"])
@app.route("/health",  methods=["GET"])
def health():
    return jsonify({"status": "ok", "models": MODELS,
                    "composio": bool(COMPOSIO_KEY),
                    "hitl_ready": _HITL_READY,
                    "ws_oasis": _WS_AVAILABLE,
                    "ts": datetime.utcnow().isoformat()})

@app.route("/status",         methods=["GET"])
@app.route("/mobile/status",  methods=["GET"])
def status():
    return jsonify({"kill_switch": _kill_switch,
                    "hitl_ready":  _HITL_READY,
                    "sparks":      _sparks[-10:],
                    "thoughts":    _thoughts[-5:],
                    "market":      _market_cache.get("data"),
                    "ts":          datetime.utcnow().isoformat()})

@app.route("/mobile/kill-switch", methods=["POST"])
def kill_switch_toggle():
    global _kill_switch
    data = request.get_json() or {}
    with _lock:
        _kill_switch = bool(data.get("active", False))
    return jsonify({"ok": True, "kill_switch": _kill_switch})

@app.route("/market", methods=["GET"])
def market():
    return jsonify(get_market())

@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"pong": True})

@app.route("/think", methods=["POST"])
def think():
    data    = request.get_json() or {}
    prompt  = data.get("prompt") or data.get("message", "")
    history = data.get("history", [])
    if not prompt:
        return jsonify({"error": "prompt required"}), 400
    response, steps, model = react(prompt, history)
    follow_up = generate_follow_up(prompt, response)
    return jsonify({"response": response, "steps": steps,
                    "model": model, "follow_up_questions": follow_up})

@app.route("/agent/tick", methods=["GET", "POST"])
def tick():
    prompt = (f"Autonomous market analysis tick. "
              f"Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}. "
              f"Check crypto markets, evaluate signals.")
    response, steps, model = react(prompt)
    return jsonify({"response": response, "steps": steps,
                    "model": model, "tick": True})

@app.route("/hitl/tasks", methods=["GET"])
def hitl_tasks():
    if not _HITL_READY or not _hitl_tq:
        return jsonify({"hitl_ready": False, "tasks": []})
    tasks = _hitl_tq.list_awaiting_human()
    return jsonify({"hitl_ready": True, "tasks": tasks})

@app.route("/hitl/task", methods=["POST"])
def hitl_create_task():
    if not _HITL_READY or not _hitl_tq or not _hitl_notifier or not _hitl_loop:
        return jsonify({"error": "HITL not ready"}), 503
    data = request.get_json() or {}
    task = _hitl_tq.create(
        title=data.get("title", "HITL Task"),
        executor="human",
        action=data.get("action", ""),
        why_human=data.get("why_human", ""),
        draft_type=data.get("draft_type"),
        draft_data=data.get("draft_data"),
    )
    asyncio.run_coroutine_threadsafe(
        _hitl_notifier.send_card(task["id"]), _hitl_loop)
    return jsonify({"ok": True, "task_id": task["id"]})

@app.route("/hitl/status", methods=["GET"])
def hitl_status():
    return jsonify({
        "hitl_ready":   _HITL_READY,
        "supabase":     bool(SUPABASE_URL and SUPABASE_KEY),
        "telegram_bot": bool(TG_BOT_TOKEN and TG_CHAT_ID),
    })

# -- Entry ------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    t = threading.Thread(target=_start_hitl_thread, daemon=True)
    t.start()
    app.run(host="0.0.0.0", port=port, debug=False)
else:
    t = threading.Thread(target=_start_hitl_thread, daemon=True)
    t.start()
