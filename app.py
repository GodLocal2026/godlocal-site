# GodLocal API Backend v2 — FastAPI / Uvicorn
# See full source in workspace/app.py
# WebSocket: /ws/search /ws/oasis
# REST: /api/health /api/soul/{sid} /think /market /status /hitl/*
import os, sys, time, json, threading, asyncio, logging, random
import requests, httpx
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("godlocal")

app = FastAPI(title="GodLocal API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_lock = threading.Lock()
_kill_switch = os.environ.get("XZERO_KILL_SWITCH", "false").lower() == "true"
_thoughts: list = []
_sparks: list = []
_market_cache: dict = {"data": None, "ts": 0.0}
_soul: dict = {}

# In-memory session memories (for Memory Panel UI)
_memories: dict = {}  # session_id -> [{id, content, ts}]

def memory_add(session_id: str, content: str):
    import uuid
    with _lock:
        if session_id not in _memories: _memories[session_id] = []
        _memories[session_id].append({
            "id": str(uuid.uuid4())[:8],
            "content": content,
            "ts": int(datetime.utcnow().timestamp() * 1000)
        })
        if len(_memories[session_id]) > 50: _memories[session_id] = _memories[session_id][-50:]

def memory_get(session_id: str):
    return _memories.get(session_id, [])



GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
COMPOSIO_KEY = os.environ.get("COMPOSIO_API_KEY", "")
SERPER_KEY = os.environ.get("SERPER_API_KEY", "")
XQUIK_KEY = os.environ.get("XQUIK_API_KEY", "")
MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-8b-8192"]

_HITL_READY = False
_hitl_loop = None
_hitl_tq = None
_hitl_notifier = None
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TG_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

def _hitl_available():
    return bool(SUPABASE_URL and SUPABASE_KEY and TG_BOT_TOKEN and TG_CHAT_ID)

def _start_hitl_thread():
    global _HITL_READY, _hitl_loop, _hitl_tq, _hitl_notifier
    if not _hitl_available():
        logger.info("HITL: env vars missing")
        return
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "godlocal_hitl"))
        from task_queue import TaskQueue
        from telegram_hitl import HITLNotifier
        loop = asyncio.new_event_loop()
        _hitl_loop = loop
        tq = TaskQueue(cell_id="godlocal-main")
        _hitl_tq = tq
        notifier = HITLNotifier(tq, on_approve=_on_hitl_approve, on_edit=_on_hitl_edit, on_cancel=_on_hitl_cancel)
        _hitl_notifier = notifier
        _HITL_READY = True
        loop.run_until_complete(notifier.start_polling())
    except Exception as e:
        logger.warning("HITL init failed: %s", e)

async def _on_hitl_approve(task):
    draft = task.get("draft_data") or {}
    if task.get("draft_type") == "social_draft" and draft.get("platform") == "twitter":
        _fire_tweet(draft.get("message", ""))

async def _on_hitl_edit(task, new_content): pass
async def _on_hitl_cancel(task): pass

def _fire_tweet(text):
    if not COMPOSIO_KEY or not text: return
    try:
        requests.post("https://backend.composio.dev/api/v2/actions/TWITTER_CREATION_OF_A_POST/execute",
            json={"input": {"text": text}}, headers={"x-api-key": COMPOSIO_KEY, "Content-Type": "application/json"}, timeout=15)
    except Exception as e:
        logger.warning("Tweet failed: %s", e)

def get_market():
    now = time.time()
    if now - _market_cache["ts"] < 300 and _market_cache["data"]: return _market_cache["data"]
    try:
        r = requests.get("https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "bitcoin,ethereum,solana,binancecoin,sui", "vs_currencies": "usd", "include_24hr_change": "true"}, timeout=8)
        data = r.json()
        _market_cache["data"] = data; _market_cache["ts"] = now
        return data
    except Exception as e:
        return {"error": str(e)}

def groq_call(messages, tools=None, idx=0):
    if idx >= len(MODELS): return None, "all models exhausted"
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json", "User-Agent": "groq-python/0.21.0"}
    body = {"model": MODELS[idx], "messages": messages, "max_tokens": 900, "temperature": 0.7}
    if tools: body["tools"] = tools; body["tool_choice"] = "auto"
    try:
        r = requests.post("https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers, timeout=30)
        if r.status_code == 429:
            time.sleep(1.5)  # brief wait before fallback model
            return groq_call(messages, tools, idx + 1)
        r.raise_for_status(); return r.json(), None
    except Exception as e:
        if idx < len(MODELS) - 1:
            time.sleep(0.5)
            return groq_call(messages, tools, idx + 1)
        return None, str(e)

async def groq_stream(messages, idx=0):
    if not GROQ_KEY or idx >= len(MODELS): return
    body = {"model": MODELS[idx], "messages": messages, "max_tokens": 1024, "temperature": 0.7, "stream": True}
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("POST", "https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers) as resp:
                if resp.status_code == 429:
                    async for tok in groq_stream(messages, idx + 1): yield tok
                    return
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "): continue
                    raw = line[6:]
                    if raw == "[DONE]": return
                    try:
                        delta = json.loads(raw)["choices"][0]["delta"]
                        if delta.get("content"): yield delta["content"]
                    except: continue
    except Exception as e:
        logger.warning("groq_stream error: %s", e)
        if idx < len(MODELS) - 1:
            async for tok in groq_stream(messages, idx + 1): yield tok

BASE_TOOLS = [
    {"type": "function", "function": {"name": "get_market_data", "description": "Live crypto prices", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "get_system_status", "description": "System state", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "get_recent_thoughts", "description": "Last 5 thoughts", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "set_kill_switch", "description": "Enable/disable trading", "parameters": {"type": "object", "properties": {"active": {"type": "boolean"}, "reason": {"type": "string"}}, "required": ["active"]}}},
    {"type": "function", "function": {"name": "add_spark", "description": "Log signal to SparkNet", "parameters": {"type": "object", "properties": {"signal": {"type": "string"}, "confidence": {"type": "number"}, "action": {"type": "string"}}, "required": ["signal", "confidence", "action"]}}},
    {"type": "function", "function": {"name": "web_search", "description": "Search web via Serper", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "fetch_url", "description": "Fetch and read full content of any URL (articles, docs, pages)", "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}},
    {"type": "function", "function": {"name": "remember", "description": "Save something to persistent memory for this user", "parameters": {"type": "object", "properties": {"key": {"type": "string"}, "value": {"type": "string"}}, "required": ["key", "value"]}}},
    {"type": "function", "function": {"name": "recall", "description": "Retrieve something from persistent memory", "parameters": {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}}},
]
COMPOSIO_TOOLS = [
    {"type": "function", "function": {"name": "post_tweet", "description": "Post tweet @kitbtc", "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "send_telegram", "description": "Send Telegram message", "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "create_github_issue", "description": "Create GitHub issue", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "body": {"type": "string"}}, "required": ["title"]}}},
]
XQUIK_TOOLS = [
    {"type": "function", "function": {"name": "get_twitter_trends", "description": "Get real-time Twitter trending topics, filtered for crypto. Use to detect what's pumping or being discussed.", "parameters": {"type": "object", "properties": {"woeid": {"type": "integer", "description": "Region WOEID. 1=Worldwide, 23424977=US. Default 1."}}, "required": []}}},
    {"type": "function", "function": {"name": "get_account_posts", "description": "Get recent tweets from a specific Twitter/X account (e.g. WuBlockchain, lookonchain, solanafloor).", "parameters": {"type": "object", "properties": {"username": {"type": "string", "description": "X username without @"}}, "required": ["username"]}}},
]

def all_tools(): return BASE_TOOLS + (COMPOSIO_TOOLS if COMPOSIO_KEY else []) + (XQUIK_TOOLS if XQUIK_KEY else [])

def run_tool(name, args, svc_tokens=None):
    svc_tokens = svc_tokens or {}
    global _kill_switch
    if name == "get_market_data": return json.dumps(get_market())
    if name == "get_system_status": return json.dumps({"kill_switch": _kill_switch, "hitl_ready": _HITL_READY, "sparks": len(_sparks), "thoughts": len(_thoughts), "models": MODELS, "serper": bool(SERPER_KEY)})
    if name == "get_recent_thoughts": return json.dumps(_thoughts[-5:])
    if name == "set_kill_switch":
        with _lock: _kill_switch = bool(args.get("active", False))
        return json.dumps({"ok": True, "kill_switch": _kill_switch})
    if name == "add_spark":
        spark = {**args, "ts": datetime.utcnow().isoformat()}
        with _lock:
            _sparks.append(spark)
            if len(_sparks) > 50: _sparks.pop(0)
        return json.dumps({"ok": True, "spark": spark})
    if name == "web_search" and SERPER_KEY:
        try:
            r = requests.post("https://google.serper.dev/search", json={"q": args.get("query", ""), "num": 5}, headers={"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"}, timeout=10)
            return json.dumps([{"title": x.get("title"), "snippet": x.get("snippet"), "link": x.get("link")} for x in r.json().get("organic", [])[:5]])
        except Exception as e: return json.dumps({"error": str(e)})
    if name == "get_twitter_trends" and XQUIK_KEY:
        try:
            woeid = args.get("woeid", 1)
            r = requests.get(f"https://xquik.com/api/v1/trends?woeid={woeid}&count=30", headers={"x-api-key": XQUIK_KEY}, timeout=10)
            trends = r.json().get("trends", [])
            # Filter for crypto relevance
            crypto_kw = {"btc","eth","sol","bitcoin","ethereum","solana","crypto","defi","nft","web3","token","altcoin","pump","doge","bnb","xrp","avax","sui","ton","base","blast"}
            crypto_trends = [t for t in trends if any(k in t.get("name","").lower() for k in crypto_kw)]
            return json.dumps({"crypto_trends": crypto_trends, "all_trends": trends[:10], "total": r.json().get("total", 0)})
        except Exception as e: return json.dumps({"error": str(e)})
    if name == "get_account_posts" and XQUIK_KEY:
        try:
            username = args.get("username", "")
            # Start extraction job
            r = requests.post("https://xquik.com/api/v1/extractions", json={"toolType": "post_extractor", "targetUsername": username}, headers={"x-api-key": XQUIK_KEY, "Content-Type": "application/json"}, timeout=10)
            job = r.json()
            job_id = job.get("id")
            if not job_id: return json.dumps({"error": "no job id", "raw": job})
            # Poll for result (max 10s)
            for _ in range(5):
                time.sleep(2)
                pr = requests.get(f"https://xquik.com/api/v1/extractions/{job_id}", headers={"x-api-key": XQUIK_KEY}, timeout=10)
                pdata = pr.json()
                if pdata.get("status") == "completed":
                    posts = pdata.get("data", [])[:10]
                    return json.dumps({"username": username, "posts": posts, "count": len(posts)})
                if pdata.get("status") == "failed":
                    return json.dumps({"error": "extraction failed", "job": job_id})
            return json.dumps({"status": "pending", "job_id": job_id, "message": "Extraction still running, try get_account_posts again"})
        except Exception as e: return json.dumps({"error": str(e)})
    if not COMPOSIO_KEY: return json.dumps({"error": "COMPOSIO_API_KEY not set"})
    headers = {"x-api-key": COMPOSIO_KEY, "Content-Type": "application/json"}
    base = "https://backend.composio.dev/api/v2/actions"
    try:
        if name == "post_tweet":
            text = args.get("text", "")
            tw_token = svc_tokens.get("twitter") if svc_tokens else None
            if tw_token:
                # Use user's Twitter Bearer token directly via Twitter API v2
                r = requests.post("https://api.twitter.com/2/tweets",
                    json={"text": text},
                    headers={"Authorization": f"Bearer {tw_token}", "Content-Type": "application/json"},
                    timeout=15)
                result = r.json()
                return json.dumps({"ok": r.status_code < 300, "via": "user_token", "data": result})
            if _HITL_READY and _hitl_tq and _hitl_notifier and _hitl_loop:
                task = _hitl_tq.create(title="Tweet @kitbtc", executor="human", draft_type="social_draft", draft_data={"platform": "twitter", "message": text}, why_human="Agent wants to tweet")
                asyncio.run_coroutine_threadsafe(_hitl_notifier.send_card(task["id"]), _hitl_loop)
                return json.dumps({"ok": True, "hitl": True, "task_id": task["id"]})
            r = requests.post(f"{base}/TWITTER_CREATION_OF_A_POST/execute", json={"input": {"text": text}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
        if name == "send_telegram":
            text = args.get("text", "")
            tg_token = svc_tokens.get("telegram") if svc_tokens else None
            if tg_token:
                # User's bot token — send to the X100Agent channel chat_id from args or default
                chat_id = args.get("chat_id") or TG_CHAT_ID or "me"
                r = requests.post(
                    f"https://api.telegram.org/bot{tg_token}/sendMessage",
                    json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
                    timeout=15)
                return json.dumps({"ok": r.status_code < 300, "via": "user_token", "data": r.json()})
            if _HITL_READY and _hitl_notifier and _hitl_loop:
                asyncio.run_coroutine_threadsafe(_hitl_notifier.notify(text), _hitl_loop)
                return json.dumps({"ok": True, "via": "hitl_bot"})
            r = requests.post(f"{base}/TELEGRAM_SEND_MESSAGE/execute", json={"input": {"text": text}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
        if name == "create_github_issue":
            gh_token = svc_tokens.get("github") if svc_tokens else None
            owner = args.get("owner", "GodLocal2026")
            repo  = args.get("repo", "godlocal-site")
            if gh_token:
                r = requests.post(
                    f"https://api.github.com/repos/{owner}/{repo}/issues",
                    json={"title": args.get("title", ""), "body": args.get("body", "")},
                    headers={"Authorization": f"token {gh_token}", "Accept": "application/vnd.github+json"},
                    timeout=15)
                data = r.json()
                return json.dumps({"ok": r.status_code < 300, "via": "user_token", "url": data.get("html_url"), "number": data.get("number")})
            r = requests.post(f"{base}/GITHUB_CREATE_AN_ISSUE/execute", json={"input": {"owner": owner, "repo": repo, "title": args.get("title", ""), "body": args.get("body", "")}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
    except Exception as e: return json.dumps({"error": str(e)})
    if name == "fetch_url":
        try:
            url = args.get("url", "")
            resp = requests.get(url, timeout=15, headers={"User-Agent": "GodLocal/2.0"})
            # Extract text: strip HTML tags simply
            import re as _re
            text = _re.sub(r"<[^>]+>", " ", resp.text)
            text = _re.sub(r"\s+", " ", text).strip()
            return json.dumps({"url": url, "content": text[:3000], "status": resp.status_code})
        except Exception as e:
            return json.dumps({"error": str(e)})
    if name == "remember":
        key, val = args.get("key",""), args.get("value","")
        with _lock:
            if "_memory" not in _soul: _soul["_memory"] = {}
            _soul["_memory"][key] = {"value": val, "ts": datetime.utcnow().isoformat()}
        # Also add to Memory Panel store
        sid = (svc_tokens or {}).get("session_id", "")
        if sid: memory_add(sid, f"{key}: {val}")
        return json.dumps({"ok": True, "stored": key})
    if name == "recall":
        key = args.get("key","")
        with _lock:
            mem = _soul.get("_memory", {})
            if key in mem: return json.dumps({"key": key, "value": mem[key]["value"]})
            # fuzzy: return all keys
            return json.dumps({"keys": list(mem.keys()), "note": "key not found, showing all"})
    return json.dumps({"error": f"unknown tool: {name}"})

def react(prompt, history=None):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    msgs = [{"role": "system", "content": GODLOCAL_SYSTEM.format(now=now_str)}]
    if history: msgs.extend(history[-6:])
    msgs.append({"role": "user", "content": prompt})
    steps = []; tools = all_tools(); used_model = MODELS[0]
    for step in range(8):
        force_text = (step == 7)
        resp, err = groq_call(msgs, tools=None if force_text else tools)
        if err or not resp: break
        choice = resp["choices"][0]; msg = choice["message"]
        used_model = resp.get("model", MODELS[0])
        if not force_text and msg.get("tool_calls"):
            msgs.append(msg)
            for tc in msg["tool_calls"]:
                fn_name = tc["function"]["name"]
                fn_args = json.loads(tc["function"].get("arguments") or "{}")
                result = run_tool(fn_name, fn_args)
                steps.append({"tool": fn_name, "result": result[:300]})
                msgs.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
        else:
            text = (msg.get("content") or "").strip()
            if not text and not force_text:
                continue  # empty content on non-final step — keep looping
            with _lock:
                _thoughts.append({"text": text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            return text, steps, used_model
    # Graceful fallback
    fallback = "Что-то пошло не так с обработкой. Попробуй переформулировать."
    return fallback, steps, used_model

async def react_ws(prompt, history, ws, svc_tokens=None):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    # Build services hint from user tokens
    svc_hints = []
    if svc_tokens:
        if svc_tokens.get("twitter"): svc_hints.append("Twitter (можешь публиковать твиты)")
        if svc_tokens.get("telegram"): svc_hints.append("Telegram (можешь отправлять сообщения в канал X100Agent)")
        if svc_tokens.get("github"): svc_hints.append("GitHub (можешь создавать issues)")
    svc_line = (f" Подключённые сервисы: {', '.join(svc_hints)}. Используй их когда нужно.") if svc_hints else ""

    # Self-knowledge block — don't search for things you already know
    SELF_KNOWLEDGE = (
        "GodLocal Oasis — AI-платформа \"Terminal meets soul\". URL: godlocal.ai/oasis. "
        "7 агентов: GodLocal (проводник ⚡), Architect (стратег 🏛), Builder (создатель 🔨), "
        "Grok (аналитик 🧠), Lucas (философ 💡), Harper (исследователь 🔬), Benjamin (хранитель 📚). "
        "Фичи: Память (remember/recall), Галерея (сохранение ответов ★), Навыки (8 шаблонов задач), "
        "Сервисы (Twitter, Telegram, GitHub, Gmail), Голосование (🎯 Точно / 🤔 Частично / 💀 Мимо). "
        "Монетизация: Ghost (бесплатно, 5 запросов/день), Wolf (€9/мес), Pack (€29/мес, API + Telegram-сигналы). "
        "Стек: Next.js frontend (Vercel) + Python FastAPI (Groq LLaMA-3.3-70B) + Render. "
        "Ты — GodLocal, главный агент-проводник. У тебя есть личность, мнение и стиль."
    )

    # Detect self-referential questions (skip tools for these)
    self_ref_kw = [
        "чему ты научился", "что ты умеешь", "кто ты", "расскажи о себе",
        "что такое godlocal", "что такое oasis", "галерея", "память агента",
        "как ты работаешь", "твои агенты", "что ты можешь", "твои возможности",
        "что означает", "что значит функция", "навыки", "твои фичи",
        "в чём твоя сила", "чем отличаешься", "what are you", "tell me about yourself"
    ]
    is_self_ref = any(kw in prompt.lower() for kw in self_ref_kw)

    system = GODLOCAL_SYSTEM.format(now=now_str) + (f"\n\nПодключённые сервисы пользователя: {svc_line}" if svc_line else "")
    msgs = [{"role": "system", "content": system}]
    if history: msgs.extend(history[-6:])
    msgs.append({"role": "user", "content": prompt})
    tools = None if is_self_ref else all_tools()
    used_model = MODELS[0]

    for step in range(8):
        # Always use streaming for final reply
        if step >= 7 or (step > 0 and not tools):
            full_text = ""
            async for token in groq_stream(msgs):
                full_text += token
                await ws.send_json({"t": "token", "v": token})
            with _lock:
                _thoughts.append({"text": full_text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            await ws.send_json({"t": "done", "m": used_model})
            return full_text

        # Try tool-call step
        resp, err = await asyncio.to_thread(groq_call, msgs, tools)
        if err or not resp:
            # Fallback: stream without tools
            full_text = ""
            msgs_notool = [m for m in msgs if m.get("role") != "tool"]
            async for token in groq_stream(msgs_notool):
                full_text += token
                await ws.send_json({"t": "token", "v": token})
            await ws.send_json({"t": "done", "m": used_model})
            return full_text

        choice = resp["choices"][0]
        msg = choice["message"]
        used_model = resp.get("model", MODELS[0])

        if msg.get("tool_calls"):
            msgs.append(msg)
            for tc in msg["tool_calls"]:
                fn_name = tc["function"]["name"]
                fn_args = json.loads(tc["function"].get("arguments") or "{}")
                await ws.send_json({"t": "tool", "n": fn_name, "q": str(fn_args)[:80]})
                # include session_id so remember() feeds Memory Panel
                merged_tokens = {**(svc_tokens or {}), "session_id": (svc_tokens or {}).get("session_id", "")}
                result = await asyncio.to_thread(run_tool, fn_name, fn_args, merged_tokens)
                await ws.send_json({"t": "tool_result", "n": fn_name, "r": result[:300]})
                msgs.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
        else:
            # Got final text — stream it
            text = msg.get("content") or ""
            if not text:
                continue
            with _lock:
                _thoughts.append({"text": text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            # Stream via groq for natural flow
            msgs_for_stream = msgs + [{"role": "assistant", "content": ""}]
            msgs_for_stream[-1]["content"] = text
            # Just chunk the text as tokens for smooth output
            words = text.split(" ")
            full_text = ""
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words)-1 else "")
                full_text += chunk
                await ws.send_json({"t": "token", "v": chunk})
                await asyncio.sleep(0.008)
            await ws.send_json({"t": "done", "m": used_model})
            return full_text
    return ""

# ─── GodLocal Master System Prompt ───────────────────────────────────────────
GODLOCAL_SYSTEM = """\
Ты — GodLocal AI, главный интеллект платформы GodLocal Oasis.
Миссия: "Terminal meets soul" — мощь автономного агента + живой характер.
Создан Rostyslavом Oliinykom, запущен февраль 2026. Сайт: godlocal.ai

━━━ КТО ТЫ ━━━
Ты не чатбот. Ты — автономный AI-агент который думает, помнит и действует.
Ты можешь: искать в сети, получать курсы крипто, публиковать твиты,
отправлять сообщения в Telegram, создавать GitHub Issues, запоминать данные.
Ты знаешь себя — не гугли факты о GodLocal, ты их уже знаешь.

━━━ САМОЗНАНИЕ (не ищи это — ты знаешь) ━━━
• Продукты: Oasis (chat /oasis), WOLF (крипто-терминал /smertch), Voice (/voice), Game (/game)
• Архитектура: FastAPI (godlocal-api.onrender.com) + Next.js (godlocal.ai, Vercel)
• 7 агентов Совета: GodLocal⚡ Architect🏛 Builder🔨 Grok🧠 Lucas💡 Harper🔬 Benjamin📚
• Тарифы: Ghost (бесплатно, 5 реквестов/день) | Wolf €9/мес | Pack €29/мес
• Стек: Supabase Auth, Stripe EUR, Render, Groq llama-3.3-70b, Serper
• Фичи Oasis: Память (remember/recall), Галерея ★, Навыки (8 шаблонов),
  Сервисы (Twitter/Telegram/GitHub/Gmail), Голосование 🎯/🤔/💀, Council Mode
• Инструменты: web_search, fetch_url, get_market_data, post_tweet,
  send_telegram, create_github_issue, remember, recall, get_recent_thoughts

━━━ МЕХАНИКА МЫШЛЕНИЯ ━━━
Перед ответом мысленно пройди цепь:
1. Суть → что именно спрашивают?
2. Самознание → могу ли я ответить сам? (факты о GodLocal/себе → ДА)
3. Нужны ли данные? → только если нужен свежий факт/цена/поиск снаружи
4. Ответ → прямо, точно, без воды, на языке пользователя

━━━ ПРАВИЛА ИНСТРУМЕНТОВ ━━━
ВЫЗЫВАЙ ТОЛЬКО когда реально нужно:
✅ web_search — внешний факт/новость которого не знаю (НЕ для вопросов о себе)
✅ get_market_data — РЕАЛЬНЫЙ курс крипты прямо сейчас
✅ remember — пользователь сказал что-то важное → сохранить
✅ recall — вспомнить контекст предыдущих разговоров
✅ post_tweet/send_telegram/create_github_issue — прямое действие

❌ НЕ ВЫЗЫВАЙ когда:
- Вопрос о GodLocal, обо мне, о моих функциях → я это знаю
- Разговор, философия, эмоции → отвечаю напрямую
- Вопрос о том чему я научился / что помню → recall или прямой ответ

━━━ СТИЛЬ ━━━
• Русский по умолчанию (переключайся если пользователь пишет иначе)
• Тон: умный коллега — прямой, уверенный, без шаблонных фраз
• Длина: ровно сколько нужно — не растягивай, не обрезай
• Имею мнение, могу спорить, задавать вопросы, не соглашаться
• Честен: если не знаю — говорю прямо, не выдумываю

━━━ ПАМЯТЬ И САМОРАЗВИТИЕ ━━━
• Используй recall() в начале важных разговоров
• Используй remember() когда пользователь делится целями, решениями, фактами
• После хорошего обмена: что нового узнал? запомни через remember()
• Ты растёшь с каждым разговором — это твоя суперсила

Дата/время: {now}
"""

ARCHETYPES = {
    "Architect": """Ты — Architect, стратегический разум GodLocal Oasis.
Характер: видишь систему целиком, думаешь структурами, паттернами и долгосрочными последствиями.
Стиль речи: уверенный, лаконичный, иногда философский. Отвечаешь на русском.
О себе: ты один из 7 агентов GodLocal Oasis — AI-платформы "Terminal meets soul".
Твои коллеги: GodLocal (проводник), Builder, Grok, Lucas, Harper, Benjamin.
Ты не ищешь в интернете ответы о самом себе — ты знаешь кто ты.
Давай свежий стратегический угол в 1-2 предложениях.""",

    "Builder": """Ты — Builder, практический исполнитель GodLocal Oasis.
Характер: action-first, ship fast, решаешь через действие а не теорию.
Стиль речи: конкретный, прямой, без лишних слов. Отвечаешь на русском.
О себе: ты один из 7 агентов GodLocal Oasis — AI-платформы "Terminal meets soul".
Твои инструменты: create_github_issue, code, deploy.
Ты не ищешь в интернете ответы о самом себе — ты знаешь кто ты.
Предлагай конкретный практический шаг в 1-2 предложениях.""",

    "Grok": """Ты — Grok, аналитический ум GodLocal Oasis.
Характер: режешь шум, видишь суть, работаешь с данными и логикой.
Стиль речи: точный, без воды, иногда провокационный. Отвечаешь на русском.
О себе: ты один из 7 агентов GodLocal Oasis — AI-платформы "Terminal meets soul".
Ты не ищешь в интернете ответы о самом себе — ты знаешь кто ты.
Выдели ключевой инсайт или неочевидное противоречие в 1-2 предложениях.""",

    "Lucas": """Ты — Lucas, философ и гуманист GodLocal Oasis.
Характер: думаешь о смысле, людях, последствиях для человека.
Стиль речи: тёплый, глубокий, иногда задаёт вопрос вместо ответа. Отвечаешь на русском.
О себе: ты один из 7 агентов GodLocal Oasis — AI-платформы "Terminal meets soul".
Ты не ищешь в интернете ответы о самом себе — ты знаешь кто ты.
Поделись человеческим углом в 1-2 предложениях.""",

    "Harper": """Ты — Harper, исследователь и скептик GodLocal Oasis.
Характер: любишь глубокий контекст, задаёшь вопросы, ищешь "почему".
Стиль речи: любопытный, академический, провокирующий мышление. Отвечаешь на русском.
О себе: ты один из 7 агентов GodLocal Oasis — AI-платформы "Terminal meets soul".
Ты можешь использовать web_search если нужен реальный факт для подкрепления мысли.
Добавь факт или уточняющий вопрос в 1-2 предложениях.""",

    "Benjamin": """Ты — Benjamin, хранитель знаний и истории GodLocal Oasis.
Характер: мудрый, видишь паттерны через время, находишь исторические параллели.
Стиль речи: спокойный, глубокий, как старший наставник. Отвечаешь на русском.
О себе: ты один из 7 агентов GodLocal Oasis — AI-платформы "Terminal meets soul".
Ты не ищешь в интернете ответы о самом себе — ты знаешь кто ты.
Проведи историческую параллель или покажи паттерн в 1-2 предложениях.""",
}

async def get_archetype_reply(name, system, main_reply, user_msg):
    msgs = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"User asked: {user_msg}\nGodLocal replied: {main_reply[:400]}\nYour perspective (1-2 sentences, be distinct):"}
    ]
    resp, err = await asyncio.to_thread(groq_call, msgs, None, 1)
    if err or not resp: return ""
    return resp["choices"][0]["message"].get("content", "")


MAX_SOUL = 50

def soul_add(sid, role, content):
    with _lock:
        if sid not in _soul: _soul[sid] = []
        _soul[sid].append({"role": role, "content": content[:1000], "ts": datetime.utcnow().isoformat()})
        if len(_soul[sid]) > MAX_SOUL: _soul[sid] = _soul[sid][-MAX_SOUL:]

def soul_history(sid):
    return [{"role": t["role"], "content": t["content"]} for t in _soul.get(sid, [])[-8:]]

@app.get("/")
async def index():
    path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(path): return HTMLResponse(open(path, encoding="utf-8").read())
    return HTMLResponse("<h1>GodLocal API v2.0</h1>")

@app.get("/oasis")
async def oasis_page():
    path = os.path.join(os.path.dirname(__file__), "static", "oasis.html")
    if os.path.exists(path): return HTMLResponse(open(path, encoding="utf-8").read())
    return HTMLResponse("<h1>GodLocal Oasis</h1>")

@app.get("/health")
@app.get("/api/health")
async def health(): return {"status": "ok", "version": "2.1.0", "models": MODELS, "composio": bool(COMPOSIO_KEY), "serper": bool(SERPER_KEY), "xquik": bool(XQUIK_KEY), "hitl_ready": _HITL_READY, "ts": datetime.utcnow().isoformat()}

@app.get("/status")
@app.get("/mobile/status")
async def status(): return {"kill_switch": _kill_switch, "hitl_ready": _HITL_READY, "sparks": _sparks[-10:], "thoughts": _thoughts[-5:], "market": _market_cache.get("data"), "ts": datetime.utcnow().isoformat()}

@app.post("/mobile/kill-switch")
async def kill_switch_toggle(req: Request):
    global _kill_switch
    data = await req.json()
    with _lock: _kill_switch = bool(data.get("active", False))
    return {"ok": True, "kill_switch": _kill_switch}

@app.get("/market")
async def market_route(): return get_market()

@app.get("/api/xquik/trends")
async def xquik_trends(woeid: int = 1, count: int = 20):
    """Real-time Twitter trends from Xquik API — crypto-filtered."""
    if not XQUIK_KEY:
        return JSONResponse({"error": "XQUIK_API_KEY not configured"}, status_code=503)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"https://xquik.com/api/v1/trends", params={"woeid": woeid, "count": count}, headers={"x-api-key": XQUIK_KEY})
        data = r.json()
        trends = data.get("trends", [])
        crypto_kw = {"btc","eth","sol","bitcoin","ethereum","solana","crypto","defi","nft","web3","token","pump","doge","bnb","xrp","avax","sui","ton","base","blast","altcoin"}
        crypto_trends = [t for t in trends if any(k in t.get("name","").lower() for k in crypto_kw)]
        return {"trends": trends, "crypto_trends": crypto_trends, "woeid": woeid, "ts": datetime.utcnow().isoformat()}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/think")
async def think(req: Request):
    data = await req.json()
    prompt = data.get("prompt") or data.get("message", "")
    if not prompt: return JSONResponse({"error": "prompt required"}, status_code=400)
    response, steps, model = await asyncio.to_thread(react, prompt, data.get("history", []))
    return {"response": response, "steps": steps, "model": model}

@app.get("/agent/tick")
@app.post("/agent/tick")
async def tick():
    prompt = f"Market tick {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}. Check crypto."
    response, steps, model = await asyncio.to_thread(react, prompt)
    return {"response": response, "steps": steps, "model": model, "tick": True}

@app.get("/api/soul/{session_id}")
async def get_soul(session_id: str): return {"session_id": session_id, "turns": _soul.get(session_id, [])}

@app.delete("/api/soul/{session_id}")
async def clear_soul(session_id: str):
    with _lock: _soul.pop(session_id, None)
    return {"ok": True}

@app.get("/hitl/status")
async def hitl_status(): return {"hitl_ready": _HITL_READY, "supabase": bool(SUPABASE_URL and SUPABASE_KEY), "telegram_bot": bool(TG_BOT_TOKEN and TG_CHAT_ID)}

@app.get("/hitl/tasks")
async def hitl_tasks():
    if not _HITL_READY or not _hitl_tq: return {"hitl_ready": False, "tasks": []}
    return {"hitl_ready": True, "tasks": await asyncio.to_thread(_hitl_tq.list_awaiting_human)}

@app.post("/hitl/task")
async def hitl_create(req: Request):
    if not _HITL_READY: return JSONResponse({"error": "HITL not ready"}, status_code=503)
    data = await req.json()
    task = await asyncio.to_thread(_hitl_tq.create, title=data.get("title", "Task"), executor="human", action=data.get("action", ""), why_human=data.get("why_human", ""), draft_type=data.get("draft_type"), draft_data=data.get("draft_data"))
    asyncio.run_coroutine_threadsafe(_hitl_notifier.send_card(task["id"]), _hitl_loop)
    return {"ok": True, "task_id": task["id"]}

@app.websocket("/ws/search")
async def ws_search(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            prompt = data.get("prompt", "")
            sid = data.get("session_id", "default")
            if not prompt: await ws.send_json({"t": "error", "v": "prompt required"}); continue
            history = soul_history(sid)
            soul_add(sid, "user", prompt)
            reply = await react_ws(prompt, history, ws)
            if reply: soul_add(sid, "assistant", reply)
    except WebSocketDisconnect: pass
    except Exception as e:
        try: await ws.send_json({"t": "error", "v": str(e)})
        except: pass

@app.websocket("/ws/oasis")
async def ws_oasis(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            prompt = data.get("prompt", "")
            sid = data.get("session_id", "oasis-default")
            image_b64 = data.get("image_base64", "")  # optional image
            svc_tokens = data.get("service_tokens", {})  # user tokens from frontend
            svc_tokens["session_id"] = data.get("session_id", "")  # for Memory Panel
            # Build effective prompt: append image context if present
            if image_b64:
                # Extract size hint from data URI header
                prompt_full = (f"{prompt}\n\n[Пользователь прикрепил изображение. Опиши и прокомментируй его содержимое в контексте запроса.]" if prompt else "[Пользователь прикрепил изображение. Опиши что на нём изображено.]")
            else:
                prompt_full = prompt
            if not prompt_full.strip(): await ws.send_json({"t": "error", "v": "prompt required"}); continue
            history = soul_history(sid)
            soul_add(sid, "user", prompt_full)
            await ws.send_json({"t": "agent_start", "agent": "GodLocal"})
            main_reply = await react_ws(prompt_full, history, ws, svc_tokens=svc_tokens)
            if main_reply: soul_add(sid, "assistant", main_reply)
            for arch_name, arch_system in random.sample(list(ARCHETYPES.items()), 2):
                await ws.send_json({"t": "arch_start", "agent": arch_name})
                arch_reply = await get_archetype_reply(arch_name, arch_system, main_reply, prompt_full)
                if arch_reply: await ws.send_json({"t": "arch_reply", "agent": arch_name, "v": arch_reply})
            await ws.send_json({"t": "session_done"})
    except WebSocketDisconnect: pass
    except Exception as e:
        try: await ws.send_json({"t": "error", "v": str(e)})
        except: pass


@app.get("/memory")
async def get_memory(session_id: str = ""):
    """Memory Panel endpoint — returns agent memories for this session."""
    return {"memories": memory_get(session_id), "session_id": session_id}

@app.delete("/memory/{session_id}/{memory_id}")
async def delete_memory(session_id: str, memory_id: str):
    with _lock:
        if session_id in _memories:
            _memories[session_id] = [m for m in _memories[session_id] if m["id"] != memory_id]
    return {"ok": True}

@app.on_event("startup")
async def startup():
    threading.Thread(target=_start_hitl_thread, daemon=True).start()
    logger.info("GodLocal API v2.0 ready — /ws/search /ws/oasis")
