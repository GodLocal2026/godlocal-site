"""
GodLocal API Backend — Flask / Gunicorn for Render
Routes: /health /status /mobile/status /mobile/kill-switch /market /think /agent/tick
"""
import os, time, json, threading
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ── State ──────────────────────────────────────────────────────────────────
_lock = threading.Lock()
_kill_switch = os.environ.get("XZERO_KILL_SWITCH", "false").lower() == "true"
_thoughts: list = []
_sparks:   list = []
_market_cache: dict = {"data": None, "ts": 0.0}

GROQ_KEY      = os.environ.get("GROQ_API_KEY", "")
COMPOSIO_KEY  = os.environ.get("COMPOSIO_API_KEY", "")
MODELS        = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-8b-8192"]

# ── Market ─────────────────────────────────────────────────────────────────
def get_market():
    now = time.time()
    if now - _market_cache["ts"] < 300 and _market_cache["data"]:
        return _market_cache["data"]
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "bitcoin,ethereum,solana,binancecoin,sui",
                    "vs_currencies": "usd", "include_24hr_change": "true"},
            timeout=8
        )
        data = r.json()
        _market_cache["data"] = data
        _market_cache["ts"]   = now
        return data
    except Exception as e:
        return {"error": str(e)}

# ── Groq ───────────────────────────────────────────────────────────────────
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
            json=body, headers=headers, timeout=30
        )
        if r.status_code == 429:
            return groq_call(messages, tools, idx + 1)
        r.raise_for_status()
        return r.json(), None
    except Exception as e:
        return groq_call(messages, tools, idx + 1) if idx < len(MODELS)-1 else (None, str(e))

# ── Tool schemas ───────────────────────────────────────────────────────────
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
        "description": "Post tweet to @kitbtc via Composio",
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

# ── Tool executor ──────────────────────────────────────────────────────────
def run_tool(name, args):
    global _kill_switch
    if name == "get_market_data":
        return json.dumps(get_market())
    if name == "get_system_status":
        return json.dumps({"kill_switch": _kill_switch,
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
            r = requests.post(f"{base}/TWITTER_CREATION_OF_A_POST/execute",
                json={"input": {"text": args.get("text", "")}},
                headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
        if name == "send_telegram":
            r = requests.post(f"{base}/TELEGRAM_SEND_MESSAGE/execute",
                json={"input": {"text": args.get("text", "")}},
                headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
        if name == "create_github_issue":
            r = requests.post(f"{base}/GITHUB_CREATE_AN_ISSUE/execute",
                json={"input": {"owner": "GodLocal2026", "repo": "godlocal-site",
                                "title": args.get("title", ""),
                                "body": args.get("body", "")}},
                headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
    except Exception as e:
        return json.dumps({"error": str(e)})
    return json.dumps({"error": f"unknown tool: {name}"})

# ── ReAct loop ─────────────────────────────────────────────────────────────
def react(prompt, history=None):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    msgs = [{"role": "system", "content":
        f"You are GodLocal autonomous AI agent.\n"
        f"Date: {now_str}\nUse ReAct: think → tool → observe → respond.\n"
        f"Max 8 steps. Last step MUST be plain text."}]
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
            break
        choice = resp["choices"][0]
        msg    = choice["message"]
        used_model = resp.get("model", MODELS[0])
        if not force_text and msg.get("tool_calls"):
            msgs.append(msg)
            for tc in msg["tool_calls"]:
                fn_name = tc["function"]["name"]
                fn_args = json.loads(tc["function"].get("arguments") or "{}")
                result  = run_tool(fn_name, fn_args)
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

# ── Routes ─────────────────────────────────────────────────────────────────
@app.route("/",        methods=["GET"])
@app.route("/health",  methods=["GET"])
def health():
    return jsonify({"status": "ok", "models": MODELS,
                    "composio": bool(COMPOSIO_KEY),
                    "ts": datetime.utcnow().isoformat()})

@app.route("/status",        methods=["GET"])
@app.route("/mobile/status", methods=["GET"])
def status():
    return jsonify({"kill_switch": _kill_switch,
                    "sparks":    _sparks[-10:],
                    "thoughts":  _thoughts[-5:],
                    "market":    _market_cache.get("data"),
                    "ts":        datetime.utcnow().isoformat()})

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

@app.route("/think", methods=["POST"])
def think():
    data    = request.get_json() or {}
    prompt  = data.get("prompt") or data.get("message", "")
    history = data.get("history", [])
    if not prompt:
        return jsonify({"error": "prompt required"}), 400
    response, steps, model = react(prompt, history)
    return jsonify({"response": response, "steps": steps, "model": model})

@app.route("/agent/tick", methods=["GET", "POST"])
def tick():
    prompt = (f"Autonomous market analysis tick. "
              f"Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}. "
              f"Check crypto markets, evaluate signals.")
    response, steps, model = react(prompt)
    return jsonify({"response": response, "steps": steps,
                    "model": model, "tick": True})

# ── Entry ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
