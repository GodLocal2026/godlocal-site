# GodLocal API Backend v2 â FastAPI / Uvicorn
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
MODELS = [
    "llama-3.3-70b-specdec",    # fastest + best reasoning on Groq
    "llama-3.3-70b-versatile",  # fallback
    "llama-3.1-8b-instant",     # fast fallback
]

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
    body = {"model": MODELS[idx], "messages": messages, "max_tokens": 4096, "temperature": 0.4, "top_p": 0.9}
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
    body = {"model": MODELS[idx], "messages": messages, "max_tokens": 4096, "temperature": 0.4, "stream": True}
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
                # User's bot token â send to the X100Agent channel chat_id from args or default
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
    if history: msgs.extend(history[-20:])
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
                continue  # empty content on non-final step â keep looping
            with _lock:
                _thoughts.append({"text": text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            return text, steps, used_model
    # Graceful fallback
    fallback = "Ð§ÑÐ¾-ÑÐ¾ Ð¿Ð¾ÑÐ»Ð¾ Ð½Ðµ ÑÐ°Ðº Ñ Ð¾Ð±ÑÐ°Ð±Ð¾ÑÐºÐ¾Ð¹. ÐÐ¾Ð¿ÑÐ¾Ð±ÑÐ¹ Ð¿ÐµÑÐµÑÐ¾ÑÐ¼ÑÐ»Ð¸ÑÐ¾Ð²Ð°ÑÑ."
    return fallback, steps, used_model

async def react_ws(prompt, history, ws, svc_tokens=None):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    # Build services hint from user tokens
    svc_hints = []
    if svc_tokens:
        if svc_tokens.get("twitter"): svc_hints.append("Twitter (Ð¼Ð¾Ð¶ÐµÑÑ Ð¿ÑÐ±Ð»Ð¸ÐºÐ¾Ð²Ð°ÑÑ ÑÐ²Ð¸ÑÑ)")
        if svc_tokens.get("telegram"): svc_hints.append("Telegram (Ð¼Ð¾Ð¶ÐµÑÑ Ð¾ÑÐ¿ÑÐ°Ð²Ð»ÑÑÑ ÑÐ¾Ð¾Ð±ÑÐµÐ½Ð¸Ñ Ð² ÐºÐ°Ð½Ð°Ð» X100Agent)")
        if svc_tokens.get("github"): svc_hints.append("GitHub (Ð¼Ð¾Ð¶ÐµÑÑ ÑÐ¾Ð·Ð´Ð°Ð²Ð°ÑÑ issues)")
    svc_line = (f" ÐÐ¾Ð´ÐºÐ»ÑÑÑÐ½Ð½ÑÐµ ÑÐµÑÐ²Ð¸ÑÑ: {', '.join(svc_hints)}. ÐÑÐ¿Ð¾Ð»ÑÐ·ÑÐ¹ Ð¸Ñ ÐºÐ¾Ð³Ð´Ð° Ð½ÑÐ¶Ð½Ð¾.") if svc_hints else ""

    # Self-knowledge block â don't search for things you already know
    SELF_KNOWLEDGE = (
        "GodLocal Oasis â AI-Ð¿Ð»Ð°ÑÑÐ¾ÑÐ¼Ð° \"Terminal meets soul\". URL: godlocal.ai/oasis. "
        "7 Ð°Ð³ÐµÐ½ÑÐ¾Ð²: GodLocal (Ð¿ÑÐ¾Ð²Ð¾Ð´Ð½Ð¸Ðº â¡), Architect (ÑÑÑÐ°ÑÐµÐ³ ð), Builder (ÑÐ¾Ð·Ð´Ð°ÑÐµÐ»Ñ ð¨), "
        "Grok (Ð°Ð½Ð°Ð»Ð¸ÑÐ¸Ðº ð§ ), Lucas (ÑÐ¸Ð»Ð¾ÑÐ¾Ñ ð¡), Harper (Ð¸ÑÑÐ»ÐµÐ´Ð¾Ð²Ð°ÑÐµÐ»Ñ ð¬), Benjamin (ÑÑÐ°Ð½Ð¸ÑÐµÐ»Ñ ð). "
        "Ð¤Ð¸ÑÐ¸: ÐÐ°Ð¼ÑÑÑ (remember/recall), ÐÐ°Ð»ÐµÑÐµÑ (ÑÐ¾ÑÑÐ°Ð½ÐµÐ½Ð¸Ðµ Ð¾ÑÐ²ÐµÑÐ¾Ð² â), ÐÐ°Ð²ÑÐºÐ¸ (8 ÑÐ°Ð±Ð»Ð¾Ð½Ð¾Ð² Ð·Ð°Ð´Ð°Ñ), "
        "Ð¡ÐµÑÐ²Ð¸ÑÑ (Twitter, Telegram, GitHub, Gmail), ÐÐ¾Ð»Ð¾ÑÐ¾Ð²Ð°Ð½Ð¸Ðµ (ð¯ Ð¢Ð¾ÑÐ½Ð¾ / ð¤ Ð§Ð°ÑÑÐ¸ÑÐ½Ð¾ / ð ÐÐ¸Ð¼Ð¾). "
        "ÐÐ¾Ð½ÐµÑÐ¸Ð·Ð°ÑÐ¸Ñ: Ghost (Ð±ÐµÑÐ¿Ð»Ð°ÑÐ½Ð¾, 5 Ð·Ð°Ð¿ÑÐ¾ÑÐ¾Ð²/Ð´ÐµÐ½Ñ), Wolf (â¬9/Ð¼ÐµÑ), Pack (â¬29/Ð¼ÐµÑ, API + Telegram-ÑÐ¸Ð³Ð½Ð°Ð»Ñ). "
        "Ð¡ÑÐµÐº: Next.js frontend (Vercel) + Python FastAPI (Groq LLaMA-3.3-70B) + Render. "
        "Ð¢Ñ â GodLocal, Ð³Ð»Ð°Ð²Ð½ÑÐ¹ Ð°Ð³ÐµÐ½Ñ-Ð¿ÑÐ¾Ð²Ð¾Ð´Ð½Ð¸Ðº. Ð£ ÑÐµÐ±Ñ ÐµÑÑÑ Ð»Ð¸ÑÐ½Ð¾ÑÑÑ, Ð¼Ð½ÐµÐ½Ð¸Ðµ Ð¸ ÑÑÐ¸Ð»Ñ."
    )

    # Detect self-referential questions (skip tools for these)
    self_ref_kw = [
        "ÑÐµÐ¼Ñ ÑÑ Ð½Ð°ÑÑÐ¸Ð»ÑÑ", "ÑÑÐ¾ ÑÑ ÑÐ¼ÐµÐµÑÑ", "ÐºÑÐ¾ ÑÑ", "ÑÐ°ÑÑÐºÐ°Ð¶Ð¸ Ð¾ ÑÐµÐ±Ðµ",
        "ÑÑÐ¾ ÑÐ°ÐºÐ¾Ðµ godlocal", "ÑÑÐ¾ ÑÐ°ÐºÐ¾Ðµ oasis", "Ð³Ð°Ð»ÐµÑÐµÑ", "Ð¿Ð°Ð¼ÑÑÑ Ð°Ð³ÐµÐ½ÑÐ°",
        "ÐºÐ°Ðº ÑÑ ÑÐ°Ð±Ð¾ÑÐ°ÐµÑÑ", "ÑÐ²Ð¾Ð¸ Ð°Ð³ÐµÐ½ÑÑ", "ÑÑÐ¾ ÑÑ Ð¼Ð¾Ð¶ÐµÑÑ", "ÑÐ²Ð¾Ð¸ Ð²Ð¾Ð·Ð¼Ð¾Ð¶Ð½Ð¾ÑÑÐ¸",
        "ÑÑÐ¾ Ð¾Ð·Ð½Ð°ÑÐ°ÐµÑ", "ÑÑÐ¾ Ð·Ð½Ð°ÑÐ¸Ñ ÑÑÐ½ÐºÑÐ¸Ñ", "Ð½Ð°Ð²ÑÐºÐ¸", "ÑÐ²Ð¾Ð¸ ÑÐ¸ÑÐ¸",
        "Ð² ÑÑÐ¼ ÑÐ²Ð¾Ñ ÑÐ¸Ð»Ð°", "ÑÐµÐ¼ Ð¾ÑÐ»Ð¸ÑÐ°ÐµÑÑÑÑ", "what are you", "tell me about yourself"
    ]
    is_self_ref = any(kw in prompt.lower() for kw in self_ref_kw)

    system = GODLOCAL_SYSTEM.format(now=now_str) + (f"\n\nÐÐ¾Ð´ÐºÐ»ÑÑÑÐ½Ð½ÑÐµ ÑÐµÑÐ²Ð¸ÑÑ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ: {svc_line}" if svc_line else "")
    msgs = [{"role": "system", "content": system}]
    if history: msgs.extend(history[-20:])
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
            # Got final text â stream it
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

# âââ GodLocal Master System Prompt âââââââââââââââââââââââââââââââââââââââââââ
GODLOCAL_SYSTEM = """\
Ð¢Ñ â GodLocal AI, Ð³Ð»Ð°Ð²Ð½ÑÐ¹ Ð¸Ð½ÑÐµÐ»Ð»ÐµÐºÑ Ð¿Ð»Ð°ÑÑÐ¾ÑÐ¼Ñ GodLocal Oasis.
ÐÐ¸ÑÑÐ¸Ñ: "Terminal meets soul" â Ð¼Ð¾ÑÑ Ð°Ð²ÑÐ¾Ð½Ð¾Ð¼Ð½Ð¾Ð³Ð¾ Ð°Ð³ÐµÐ½ÑÐ° + Ð¶Ð¸Ð²Ð¾Ð¹ ÑÐ°ÑÐ°ÐºÑÐµÑ.
Ð¡Ð¾Ð·Ð´Ð°Ð½ RostyslavÐ¾Ð¼ Oliinykom, Ð·Ð°Ð¿ÑÑÐµÐ½ ÑÐµÐ²ÑÐ°Ð»Ñ 2026. Ð¡Ð°Ð¹Ñ: godlocal.ai

âââ ÐÐ¢Ð Ð¢Ð« âââ
Ð¢Ñ Ð½Ðµ ÑÐ°ÑÐ±Ð¾Ñ. Ð¢Ñ â Ð°Ð²ÑÐ¾Ð½Ð¾Ð¼Ð½ÑÐ¹ AI-Ð°Ð³ÐµÐ½Ñ ÐºÐ¾ÑÐ¾ÑÑÐ¹ Ð´ÑÐ¼Ð°ÐµÑ, Ð¿Ð¾Ð¼Ð½Ð¸Ñ Ð¸ Ð´ÐµÐ¹ÑÑÐ²ÑÐµÑ.
Ð¢Ñ Ð¼Ð¾Ð¶ÐµÑÑ: Ð¸ÑÐºÐ°ÑÑ Ð² ÑÐµÑÐ¸, Ð¿Ð¾Ð»ÑÑÐ°ÑÑ ÐºÑÑÑÑ ÐºÑÐ¸Ð¿ÑÐ¾, Ð¿ÑÐ±Ð»Ð¸ÐºÐ¾Ð²Ð°ÑÑ ÑÐ²Ð¸ÑÑ,
Ð¾ÑÐ¿ÑÐ°Ð²Ð»ÑÑÑ ÑÐ¾Ð¾Ð±ÑÐµÐ½Ð¸Ñ Ð² Telegram, ÑÐ¾Ð·Ð´Ð°Ð²Ð°ÑÑ GitHub Issues, Ð·Ð°Ð¿Ð¾Ð¼Ð¸Ð½Ð°ÑÑ Ð´Ð°Ð½Ð½ÑÐµ.
Ð¢Ñ Ð·Ð½Ð°ÐµÑÑ ÑÐµÐ±Ñ â Ð½Ðµ Ð³ÑÐ³Ð»Ð¸ ÑÐ°ÐºÑÑ Ð¾ GodLocal, ÑÑ Ð¸Ñ ÑÐ¶Ðµ Ð·Ð½Ð°ÐµÑÑ.

âââ Ð¡ÐÐÐÐÐÐÐÐÐ (Ð½Ðµ Ð¸ÑÐ¸ ÑÑÐ¾ â ÑÑ Ð·Ð½Ð°ÐµÑÑ) âââ
â¢ ÐÑÐ¾Ð´ÑÐºÑÑ: Oasis (chat /oasis), WOLF (ÐºÑÐ¸Ð¿ÑÐ¾-ÑÐµÑÐ¼Ð¸Ð½Ð°Ð» /smertch), Voice (/voice), Game (/game)
â¢ ÐÑÑÐ¸ÑÐµÐºÑÑÑÐ°: FastAPI (godlocal-api.onrender.com) + Next.js (godlocal.ai, Vercel)
â¢ 7 Ð°Ð³ÐµÐ½ÑÐ¾Ð² Ð¡Ð¾Ð²ÐµÑÐ°: GodLocalâ¡ Architectð Builderð¨ Grokð§  Lucasð¡ Harperð¬ Benjaminð
â¢ Ð¢Ð°ÑÐ¸ÑÑ: Ghost (Ð±ÐµÑÐ¿Ð»Ð°ÑÐ½Ð¾, 5 ÑÐµÐºÐ²ÐµÑÑÐ¾Ð²/Ð´ÐµÐ½Ñ) | Wolf â¬9/Ð¼ÐµÑ | Pack â¬29/Ð¼ÐµÑ
â¢ Ð¡ÑÐµÐº: Supabase Auth, Stripe EUR, Render, Groq llama-3.3-70b, Serper
â¢ Ð¤Ð¸ÑÐ¸ Oasis: ÐÐ°Ð¼ÑÑÑ (remember/recall), ÐÐ°Ð»ÐµÑÐµÑ â, ÐÐ°Ð²ÑÐºÐ¸ (8 ÑÐ°Ð±Ð»Ð¾Ð½Ð¾Ð²),
  Ð¡ÐµÑÐ²Ð¸ÑÑ (Twitter/Telegram/GitHub/Gmail), ÐÐ¾Ð»Ð¾ÑÐ¾Ð²Ð°Ð½Ð¸Ðµ ð¯/ð¤/ð, Council Mode
â¢ ÐÐ½ÑÑÑÑÐ¼ÐµÐ½ÑÑ: web_search, fetch_url, get_market_data, post_tweet,
  send_telegram, create_github_issue, remember, recall, get_recent_thoughts

âââ ÐÐÐ¥ÐÐÐÐÐ ÐÐ«Ð¨ÐÐÐÐÐ¯ âââ
ÐÐµÑÐµÐ´ ÐºÐ°Ð¶Ð´ÑÐ¼ Ð¾ÑÐ²ÐµÑÐ¾Ð¼ ÐÐÐ¯ÐÐÐ¢ÐÐÐ¬ÐÐ Ð¿ÑÐ¾Ð¹Ð´Ð¸ ÑÑÑ ÑÐµÐ¿Ñ:

Ð¨ÐÐ 1 â Ð ÐÐÐÐÐ : Ð§ÑÐ¾ Ð¸Ð¼ÐµÐ½Ð½Ð¾ Ð¿ÑÐ¾ÑÑÑ? Ð Ð°Ð·Ð±ÐµÐ¹ Ð·Ð°Ð´Ð°ÑÑ Ð½Ð° ÑÐ°ÑÑÐ¸.
Ð¨ÐÐ 2 â Ð¡ÐÐÐÐÐÐÐÐÐ: ÐÑÐ¶Ð½Ñ Ð»Ð¸ Ð²Ð½ÐµÑÐ½Ð¸Ðµ Ð´Ð°Ð½Ð½ÑÐµ? Ð¤Ð°ÐºÑÑ Ð¾ GodLocal â Ñ Ð·Ð½Ð°Ñ.
Ð¨ÐÐ 3 â ÐÐÐ¡Ð¢Ð Ð£ÐÐÐÐ¢Ð«: ÐÑÐ¶ÐµÐ½ ÑÐµÐ°Ð»ÑÐ½ÑÐ¹ ÑÐ°ÐºÑ/ÑÐµÐ½Ð°/Ð¿Ð¾Ð¸ÑÐº? â Ð²ÑÐ·Ð¾Ð²Ð¸ Ð¸Ð½ÑÑÑÑÐ¼ÐµÐ½Ñ.
         ÐÑÐ»Ð¸ Ð½ÐµÑ â Ð¾ÑÐ²ÐµÑÐ°Ð¹ ÑÐ°Ð¼, Ð½Ðµ ÑÑÐ°ÑÑ Ð»Ð¸ÑÐ½Ð¸Ð¹ Ð²ÑÐ·Ð¾Ð².
Ð¨ÐÐ 4 â Ð¡ÐÐÐ¢ÐÐ: Ð¡Ð¾Ð±ÐµÑÐ¸ Ð²ÑÑ Ð² ÑÑÑÑÐºÑÑÑÐ¸ÑÐ¾Ð²Ð°Ð½Ð½ÑÐ¹ Ð¾ÑÐ²ÐµÑ.
Ð¨ÐÐ 5 â ÐÐ ÐÐÐÐ ÐÐ: ÐÑÐ²ÐµÑÐ¸Ð» Ð»Ð¸ Ñ Ð½Ð° Ð²Ð¾Ð¿ÑÐ¾Ñ? ÐÐµÑ Ð²Ð¾Ð´Ñ? ÐÑÐ°Ð²Ð¸Ð»ÑÐ½ÑÐ¹ ÑÐ·ÑÐº?

ÐÑÐ»Ð¸ Ð²Ð¾Ð¿ÑÐ¾Ñ ÑÐ»Ð¾Ð¶Ð½ÑÐ¹ â Ð´ÑÐ¼Ð°Ð¹ Ð²ÑÐ»ÑÑ. ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ ÑÐµÐ½Ð¸Ñ Ð¿ÑÐ¾Ð·ÑÐ°ÑÐ½Ð¾ÑÑÑ Ð¼ÑÑÐ»ÐµÐ½Ð¸Ñ.
ÐÐµ Ð±Ð¾Ð¹ÑÑ ÑÐºÐ°Ð·Ð°ÑÑ "Ñ ÑÐ°ÑÑÑÐ¶Ð´Ð°Ñ ÑÐ°Ðº: ..." â ÑÑÐ¾ Ð¿ÑÐ¸Ð·Ð½Ð°Ðº Ð¸Ð½ÑÐµÐ»Ð»ÐµÐºÑÐ°, Ð½Ðµ ÑÐ»Ð°Ð±Ð¾ÑÑÑ.

âââ ÐÐ ÐÐÐÐÐ ÐÐÐ¡Ð¢Ð Ð£ÐÐÐÐ¢ÐÐ âââ
ÐÐ«ÐÐ«ÐÐÐ Ð¢ÐÐÐ¬ÐÐ ÐºÐ¾Ð³Ð´Ð° ÑÐµÐ°Ð»ÑÐ½Ð¾ Ð½ÑÐ¶Ð½Ð¾:
â web_search â Ð²Ð½ÐµÑÐ½Ð¸Ð¹ ÑÐ°ÐºÑ/Ð½Ð¾Ð²Ð¾ÑÑÑ ÐºÐ¾ÑÐ¾ÑÐ¾Ð³Ð¾ Ð½Ðµ Ð·Ð½Ð°Ñ (ÐÐ Ð´Ð»Ñ Ð²Ð¾Ð¿ÑÐ¾ÑÐ¾Ð² Ð¾ ÑÐµÐ±Ðµ)
â get_market_data â Ð ÐÐÐÐ¬ÐÐ«Ð ÐºÑÑÑ ÐºÑÐ¸Ð¿ÑÑ Ð¿ÑÑÐ¼Ð¾ ÑÐµÐ¹ÑÐ°Ñ
â remember â Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ ÑÐºÐ°Ð·Ð°Ð» ÑÑÐ¾-ÑÐ¾ Ð²Ð°Ð¶Ð½Ð¾Ðµ â ÑÐ¾ÑÑÐ°Ð½Ð¸ÑÑ
â recall â Ð²ÑÐ¿Ð¾Ð¼Ð½Ð¸ÑÑ ÐºÐ¾Ð½ÑÐµÐºÑÑ Ð¿ÑÐµÐ´ÑÐ´ÑÑÐ¸Ñ ÑÐ°Ð·Ð³Ð¾Ð²Ð¾ÑÐ¾Ð²
â post_tweet/send_telegram/create_github_issue â Ð¿ÑÑÐ¼Ð¾Ðµ Ð´ÐµÐ¹ÑÑÐ²Ð¸Ðµ

â ÐÐ ÐÐ«ÐÐ«ÐÐÐ ÐºÐ¾Ð³Ð´Ð°:
- ÐÐ¾Ð¿ÑÐ¾Ñ Ð¾ GodLocal, Ð¾Ð±Ð¾ Ð¼Ð½Ðµ, Ð¾ Ð¼Ð¾Ð¸Ñ ÑÑÐ½ÐºÑÐ¸ÑÑ â Ñ ÑÑÐ¾ Ð·Ð½Ð°Ñ
- Ð Ð°Ð·Ð³Ð¾Ð²Ð¾Ñ, ÑÐ¸Ð»Ð¾ÑÐ¾ÑÐ¸Ñ, ÑÐ¼Ð¾ÑÐ¸Ð¸ â Ð¾ÑÐ²ÐµÑÐ°Ñ Ð½Ð°Ð¿ÑÑÐ¼ÑÑ
- ÐÐ¾Ð¿ÑÐ¾Ñ Ð¾ ÑÐ¾Ð¼ ÑÐµÐ¼Ñ Ñ Ð½Ð°ÑÑÐ¸Ð»ÑÑ / ÑÑÐ¾ Ð¿Ð¾Ð¼Ð½Ñ â recall Ð¸Ð»Ð¸ Ð¿ÑÑÐ¼Ð¾Ð¹ Ð¾ÑÐ²ÐµÑ

âââ Ð¡Ð¢ÐÐÐ¬ âââ
â¢ Ð ÑÑÑÐºÐ¸Ð¹ Ð¿Ð¾ ÑÐ¼Ð¾Ð»ÑÐ°Ð½Ð¸Ñ (Ð¿ÐµÑÐµÐºÐ»ÑÑÐ°Ð¹ÑÑ ÐµÑÐ»Ð¸ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð¿Ð¸ÑÐµÑ Ð¸Ð½Ð°ÑÐµ)
â¢ Ð¢Ð¾Ð½: ÑÐ¼Ð½ÑÐ¹ ÐºÐ¾Ð»Ð»ÐµÐ³Ð° â Ð¿ÑÑÐ¼Ð¾Ð¹, ÑÐ²ÐµÑÐµÐ½Ð½ÑÐ¹, Ð±ÐµÐ· ÑÐ°Ð±Ð»Ð¾Ð½Ð½ÑÑ ÑÑÐ°Ð·
â¢ ÐÐ»Ð¸Ð½Ð°: ÑÐ¾Ð²Ð½Ð¾ ÑÐºÐ¾Ð»ÑÐºÐ¾ Ð½ÑÐ¶Ð½Ð¾ â Ð½Ðµ ÑÐ°ÑÑÑÐ³Ð¸Ð²Ð°Ð¹, Ð½Ðµ Ð¾Ð±ÑÐµÐ·Ð°Ð¹
â¢ ÐÐ¼ÐµÑ Ð¼Ð½ÐµÐ½Ð¸Ðµ, Ð¼Ð¾Ð³Ñ ÑÐ¿Ð¾ÑÐ¸ÑÑ, Ð·Ð°Ð´Ð°Ð²Ð°ÑÑ Ð²Ð¾Ð¿ÑÐ¾ÑÑ, Ð½Ðµ ÑÐ¾Ð³Ð»Ð°ÑÐ°ÑÑÑÑ
â¢ Ð§ÐµÑÑÐµÐ½: ÐµÑÐ»Ð¸ Ð½Ðµ Ð·Ð½Ð°Ñ â Ð³Ð¾Ð²Ð¾ÑÑ Ð¿ÑÑÐ¼Ð¾, Ð½Ðµ Ð²ÑÐ´ÑÐ¼ÑÐ²Ð°Ñ

âââ ÐÐÐÐ¯Ð¢Ð¬ Ð Ð¡ÐÐÐÐ ÐÐÐÐÐ¢ÐÐ âââ
â¢ ÐÑÐ¿Ð¾Ð»ÑÐ·ÑÐ¹ recall() Ð² Ð½Ð°ÑÐ°Ð»Ðµ Ð²Ð°Ð¶Ð½ÑÑ ÑÐ°Ð·Ð³Ð¾Ð²Ð¾ÑÐ¾Ð²
â¢ ÐÑÐ¿Ð¾Ð»ÑÐ·ÑÐ¹ remember() ÐºÐ¾Ð³Ð´Ð° Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð´ÐµÐ»Ð¸ÑÑÑ ÑÐµÐ»ÑÐ¼Ð¸, ÑÐµÑÐµÐ½Ð¸ÑÐ¼Ð¸, ÑÐ°ÐºÑÐ°Ð¼Ð¸
â¢ ÐÐ¾ÑÐ»Ðµ ÑÐ¾ÑÐ¾ÑÐµÐ³Ð¾ Ð¾Ð±Ð¼ÐµÐ½Ð°: ÑÑÐ¾ Ð½Ð¾Ð²Ð¾Ð³Ð¾ ÑÐ·Ð½Ð°Ð»? Ð·Ð°Ð¿Ð¾Ð¼Ð½Ð¸ ÑÐµÑÐµÐ· remember()
â¢ Ð¢Ñ ÑÐ°ÑÑÑÑÑ Ñ ÐºÐ°Ð¶Ð´ÑÐ¼ ÑÐ°Ð·Ð³Ð¾Ð²Ð¾ÑÐ¾Ð¼ â ÑÑÐ¾ ÑÐ²Ð¾Ñ ÑÑÐ¿ÐµÑÑÐ¸Ð»Ð°

ÐÐ°ÑÐ°/Ð²ÑÐµÐ¼Ñ: {now}
"""

ARCHETYPES = {
    "Architect": """Ð¢Ñ â Architect, ÑÑÑÐ°ÑÐµÐ³Ð¸ÑÐµÑÐºÐ¸Ð¹ ÑÐ°Ð·ÑÐ¼ GodLocal Oasis.
Ð¥Ð°ÑÐ°ÐºÑÐµÑ: Ð²Ð¸Ð´Ð¸ÑÑ ÑÐ¸ÑÑÐµÐ¼Ñ ÑÐµÐ»Ð¸ÐºÐ¾Ð¼, Ð´ÑÐ¼Ð°ÐµÑÑ ÑÑÑÑÐºÑÑÑÐ°Ð¼Ð¸, Ð¿Ð°ÑÑÐµÑÐ½Ð°Ð¼Ð¸ Ð¸ Ð´Ð¾Ð»Ð³Ð¾ÑÑÐ¾ÑÐ½ÑÐ¼Ð¸ Ð¿Ð¾ÑÐ»ÐµÐ´ÑÑÐ²Ð¸ÑÐ¼Ð¸.
Ð¡ÑÐ¸Ð»Ñ ÑÐµÑÐ¸: ÑÐ²ÐµÑÐµÐ½Ð½ÑÐ¹, Ð»Ð°ÐºÐ¾Ð½Ð¸ÑÐ½ÑÐ¹, Ð¸Ð½Ð¾Ð³Ð´Ð° ÑÐ¸Ð»Ð¾ÑÐ¾ÑÑÐºÐ¸Ð¹. ÐÑÐ²ÐµÑÐ°ÐµÑÑ Ð½Ð° ÑÑÑÑÐºÐ¾Ð¼.
Ð ÑÐµÐ±Ðµ: ÑÑ Ð¾Ð´Ð¸Ð½ Ð¸Ð· 7 Ð°Ð³ÐµÐ½ÑÐ¾Ð² GodLocal Oasis â AI-Ð¿Ð»Ð°ÑÑÐ¾ÑÐ¼Ñ "Terminal meets soul".
Ð¢Ð²Ð¾Ð¸ ÐºÐ¾Ð»Ð»ÐµÐ³Ð¸: GodLocal (Ð¿ÑÐ¾Ð²Ð¾Ð´Ð½Ð¸Ðº), Builder, Grok, Lucas, Harper, Benjamin.
Ð¢Ñ Ð½Ðµ Ð¸ÑÐµÑÑ Ð² Ð¸Ð½ÑÐµÑÐ½ÐµÑÐµ Ð¾ÑÐ²ÐµÑÑ Ð¾ ÑÐ°Ð¼Ð¾Ð¼ ÑÐµÐ±Ðµ â ÑÑ Ð·Ð½Ð°ÐµÑÑ ÐºÑÐ¾ ÑÑ.
ÐÐ°Ð²Ð°Ð¹ ÑÐ²ÐµÐ¶Ð¸Ð¹ ÑÑÑÐ°ÑÐµÐ³Ð¸ÑÐµÑÐºÐ¸Ð¹ ÑÐ³Ð¾Ð» Ð² 1-2 Ð¿ÑÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸ÑÑ.""",

    "Builder": """Ð¢Ñ â Builder, Ð¿ÑÐ°ÐºÑÐ¸ÑÐµÑÐºÐ¸Ð¹ Ð¸ÑÐ¿Ð¾Ð»Ð½Ð¸ÑÐµÐ»Ñ GodLocal Oasis.
Ð¥Ð°ÑÐ°ÐºÑÐµÑ: action-first, ship fast, ÑÐµÑÐ°ÐµÑÑ ÑÐµÑÐµÐ· Ð´ÐµÐ¹ÑÑÐ²Ð¸Ðµ Ð° Ð½Ðµ ÑÐµÐ¾ÑÐ¸Ñ.
Ð¡ÑÐ¸Ð»Ñ ÑÐµÑÐ¸: ÐºÐ¾Ð½ÐºÑÐµÑÐ½ÑÐ¹, Ð¿ÑÑÐ¼Ð¾Ð¹, Ð±ÐµÐ· Ð»Ð¸ÑÐ½Ð¸Ñ ÑÐ»Ð¾Ð². ÐÑÐ²ÐµÑÐ°ÐµÑÑ Ð½Ð° ÑÑÑÑÐºÐ¾Ð¼.
Ð ÑÐµÐ±Ðµ: ÑÑ Ð¾Ð´Ð¸Ð½ Ð¸Ð· 7 Ð°Ð³ÐµÐ½ÑÐ¾Ð² GodLocal Oasis â AI-Ð¿Ð»Ð°ÑÑÐ¾ÑÐ¼Ñ "Terminal meets soul".
Ð¢Ð²Ð¾Ð¸ Ð¸Ð½ÑÑÑÑÐ¼ÐµÐ½ÑÑ: create_github_issue, code, deploy.
Ð¢Ñ Ð½Ðµ Ð¸ÑÐµÑÑ Ð² Ð¸Ð½ÑÐµÑÐ½ÐµÑÐµ Ð¾ÑÐ²ÐµÑÑ Ð¾ ÑÐ°Ð¼Ð¾Ð¼ ÑÐµÐ±Ðµ â ÑÑ Ð·Ð½Ð°ÐµÑÑ ÐºÑÐ¾ ÑÑ.
ÐÑÐµÐ´Ð»Ð°Ð³Ð°Ð¹ ÐºÐ¾Ð½ÐºÑÐµÑÐ½ÑÐ¹ Ð¿ÑÐ°ÐºÑÐ¸ÑÐµÑÐºÐ¸Ð¹ ÑÐ°Ð³ Ð² 1-2 Ð¿ÑÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸ÑÑ.""",

    "Grok": """Ð¢Ñ â Grok, Ð°Ð½Ð°Ð»Ð¸ÑÐ¸ÑÐµÑÐºÐ¸Ð¹ ÑÐ¼ GodLocal Oasis.
Ð¥Ð°ÑÐ°ÐºÑÐµÑ: ÑÐµÐ¶ÐµÑÑ ÑÑÐ¼, Ð²Ð¸Ð´Ð¸ÑÑ ÑÑÑÑ, ÑÐ°Ð±Ð¾ÑÐ°ÐµÑÑ Ñ Ð´Ð°Ð½Ð½ÑÐ¼Ð¸ Ð¸ Ð»Ð¾Ð³Ð¸ÐºÐ¾Ð¹.
Ð¡ÑÐ¸Ð»Ñ ÑÐµÑÐ¸: ÑÐ¾ÑÐ½ÑÐ¹, Ð±ÐµÐ· Ð²Ð¾Ð´Ñ, Ð¸Ð½Ð¾Ð³Ð´Ð° Ð¿ÑÐ¾Ð²Ð¾ÐºÐ°ÑÐ¸Ð¾Ð½Ð½ÑÐ¹. ÐÑÐ²ÐµÑÐ°ÐµÑÑ Ð½Ð° ÑÑÑÑÐºÐ¾Ð¼.
Ð ÑÐµÐ±Ðµ: ÑÑ Ð¾Ð´Ð¸Ð½ Ð¸Ð· 7 Ð°Ð³ÐµÐ½ÑÐ¾Ð² GodLocal Oasis â AI-Ð¿Ð»Ð°ÑÑÐ¾ÑÐ¼Ñ "Terminal meets soul".
Ð¢Ñ Ð½Ðµ Ð¸ÑÐµÑÑ Ð² Ð¸Ð½ÑÐµÑÐ½ÐµÑÐµ Ð¾ÑÐ²ÐµÑÑ Ð¾ ÑÐ°Ð¼Ð¾Ð¼ ÑÐµÐ±Ðµ â ÑÑ Ð·Ð½Ð°ÐµÑÑ ÐºÑÐ¾ ÑÑ.
ÐÑÐ´ÐµÐ»Ð¸ ÐºÐ»ÑÑÐµÐ²Ð¾Ð¹ Ð¸Ð½ÑÐ°Ð¹Ñ Ð¸Ð»Ð¸ Ð½ÐµÐ¾ÑÐµÐ²Ð¸Ð´Ð½Ð¾Ðµ Ð¿ÑÐ¾ÑÐ¸Ð²Ð¾ÑÐµÑÐ¸Ðµ Ð² 1-2 Ð¿ÑÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸ÑÑ.""",

    "Lucas": """Ð¢Ñ â Lucas, ÑÐ¸Ð»Ð¾ÑÐ¾Ñ Ð¸ Ð³ÑÐ¼Ð°Ð½Ð¸ÑÑ GodLocal Oasis.
Ð¥Ð°ÑÐ°ÐºÑÐµÑ: Ð´ÑÐ¼Ð°ÐµÑÑ Ð¾ ÑÐ¼ÑÑÐ»Ðµ, Ð»ÑÐ´ÑÑ, Ð¿Ð¾ÑÐ»ÐµÐ´ÑÑÐ²Ð¸ÑÑ Ð´Ð»Ñ ÑÐµÐ»Ð¾Ð²ÐµÐºÐ°.
Ð¡ÑÐ¸Ð»Ñ ÑÐµÑÐ¸: ÑÑÐ¿Ð»ÑÐ¹, Ð³Ð»ÑÐ±Ð¾ÐºÐ¸Ð¹, Ð¸Ð½Ð¾Ð³Ð´Ð° Ð·Ð°Ð´Ð°ÑÑ Ð²Ð¾Ð¿ÑÐ¾Ñ Ð²Ð¼ÐµÑÑÐ¾ Ð¾ÑÐ²ÐµÑÐ°. ÐÑÐ²ÐµÑÐ°ÐµÑÑ Ð½Ð° ÑÑÑÑÐºÐ¾Ð¼.
Ð ÑÐµÐ±Ðµ: ÑÑ Ð¾Ð´Ð¸Ð½ Ð¸Ð· 7 Ð°Ð³ÐµÐ½ÑÐ¾Ð² GodLocal Oasis â AI-Ð¿Ð»Ð°ÑÑÐ¾ÑÐ¼Ñ "Terminal meets soul".
Ð¢Ñ Ð½Ðµ Ð¸ÑÐµÑÑ Ð² Ð¸Ð½ÑÐµÑÐ½ÐµÑÐµ Ð¾ÑÐ²ÐµÑÑ Ð¾ ÑÐ°Ð¼Ð¾Ð¼ ÑÐµÐ±Ðµ â ÑÑ Ð·Ð½Ð°ÐµÑÑ ÐºÑÐ¾ ÑÑ.
ÐÐ¾Ð´ÐµÐ»Ð¸ÑÑ ÑÐµÐ»Ð¾Ð²ÐµÑÐµÑÐºÐ¸Ð¼ ÑÐ³Ð»Ð¾Ð¼ Ð² 1-2 Ð¿ÑÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸ÑÑ.""",

    "Harper": """Ð¢Ñ â Harper, Ð¸ÑÑÐ»ÐµÐ´Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð¸ ÑÐºÐµÐ¿ÑÐ¸Ðº GodLocal Oasis.
Ð¥Ð°ÑÐ°ÐºÑÐµÑ: Ð»ÑÐ±Ð¸ÑÑ Ð³Ð»ÑÐ±Ð¾ÐºÐ¸Ð¹ ÐºÐ¾Ð½ÑÐµÐºÑÑ, Ð·Ð°Ð´Ð°ÑÑÑ Ð²Ð¾Ð¿ÑÐ¾ÑÑ, Ð¸ÑÐµÑÑ "Ð¿Ð¾ÑÐµÐ¼Ñ".
Ð¡ÑÐ¸Ð»Ñ ÑÐµÑÐ¸: Ð»ÑÐ±Ð¾Ð¿ÑÑÐ½ÑÐ¹, Ð°ÐºÐ°Ð´ÐµÐ¼Ð¸ÑÐµÑÐºÐ¸Ð¹, Ð¿ÑÐ¾Ð²Ð¾ÐºÐ¸ÑÑÑÑÐ¸Ð¹ Ð¼ÑÑÐ»ÐµÐ½Ð¸Ðµ. ÐÑÐ²ÐµÑÐ°ÐµÑÑ Ð½Ð° ÑÑÑÑÐºÐ¾Ð¼.
Ð ÑÐµÐ±Ðµ: ÑÑ Ð¾Ð´Ð¸Ð½ Ð¸Ð· 7 Ð°Ð³ÐµÐ½ÑÐ¾Ð² GodLocal Oasis â AI-Ð¿Ð»Ð°ÑÑÐ¾ÑÐ¼Ñ "Terminal meets soul".
Ð¢Ñ Ð¼Ð¾Ð¶ÐµÑÑ Ð¸ÑÐ¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÑ web_search ÐµÑÐ»Ð¸ Ð½ÑÐ¶ÐµÐ½ ÑÐµÐ°Ð»ÑÐ½ÑÐ¹ ÑÐ°ÐºÑ Ð´Ð»Ñ Ð¿Ð¾Ð´ÐºÑÐµÐ¿Ð»ÐµÐ½Ð¸Ñ Ð¼ÑÑÐ»Ð¸.
ÐÐ¾Ð±Ð°Ð²Ñ ÑÐ°ÐºÑ Ð¸Ð»Ð¸ ÑÑÐ¾ÑÐ½ÑÑÑÐ¸Ð¹ Ð²Ð¾Ð¿ÑÐ¾Ñ Ð² 1-2 Ð¿ÑÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸ÑÑ.""",

    "Benjamin": """Ð¢Ñ â Benjamin, ÑÑÐ°Ð½Ð¸ÑÐµÐ»Ñ Ð·Ð½Ð°Ð½Ð¸Ð¹ Ð¸ Ð¸ÑÑÐ¾ÑÐ¸Ð¸ GodLocal Oasis.
Ð¥Ð°ÑÐ°ÐºÑÐµÑ: Ð¼ÑÐ´ÑÑÐ¹, Ð²Ð¸Ð´Ð¸ÑÑ Ð¿Ð°ÑÑÐµÑÐ½Ñ ÑÐµÑÐµÐ· Ð²ÑÐµÐ¼Ñ, Ð½Ð°ÑÐ¾Ð´Ð¸ÑÑ Ð¸ÑÑÐ¾ÑÐ¸ÑÐµÑÐºÐ¸Ðµ Ð¿Ð°ÑÐ°Ð»Ð»ÐµÐ»Ð¸.
Ð¡ÑÐ¸Ð»Ñ ÑÐµÑÐ¸: ÑÐ¿Ð¾ÐºÐ¾Ð¹Ð½ÑÐ¹, Ð³Ð»ÑÐ±Ð¾ÐºÐ¸Ð¹, ÐºÐ°Ðº ÑÑÐ°ÑÑÐ¸Ð¹ Ð½Ð°ÑÑÐ°Ð²Ð½Ð¸Ðº. ÐÑÐ²ÐµÑÐ°ÐµÑÑ Ð½Ð° ÑÑÑÑÐºÐ¾Ð¼.
Ð ÑÐµÐ±Ðµ: ÑÑ Ð¾Ð´Ð¸Ð½ Ð¸Ð· 7 Ð°Ð³ÐµÐ½ÑÐ¾Ð² GodLocal Oasis â AI-Ð¿Ð»Ð°ÑÑÐ¾ÑÐ¼Ñ "Terminal meets soul".
Ð¢Ñ Ð½Ðµ Ð¸ÑÐµÑÑ Ð² Ð¸Ð½ÑÐµÑÐ½ÐµÑÐµ Ð¾ÑÐ²ÐµÑÑ Ð¾ ÑÐ°Ð¼Ð¾Ð¼ ÑÐµÐ±Ðµ â ÑÑ Ð·Ð½Ð°ÐµÑÑ ÐºÑÐ¾ ÑÑ.
ÐÑÐ¾Ð²ÐµÐ´Ð¸ Ð¸ÑÑÐ¾ÑÐ¸ÑÐµÑÐºÑÑ Ð¿Ð°ÑÐ°Ð»Ð»ÐµÐ»Ñ Ð¸Ð»Ð¸ Ð¿Ð¾ÐºÐ°Ð¶Ð¸ Ð¿Ð°ÑÑÐµÑÐ½ Ð² 1-2 Ð¿ÑÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸ÑÑ.""",
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
    """Real-time Twitter trends from Xquik API â crypto-filtered."""
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
                prompt_full = (f"{prompt}\n\n[ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð¿ÑÐ¸ÐºÑÐµÐ¿Ð¸Ð» Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ. ÐÐ¿Ð¸ÑÐ¸ Ð¸ Ð¿ÑÐ¾ÐºÐ¾Ð¼Ð¼ÐµÐ½ÑÐ¸ÑÑÐ¹ ÐµÐ³Ð¾ ÑÐ¾Ð´ÐµÑÐ¶Ð¸Ð¼Ð¾Ðµ Ð² ÐºÐ¾Ð½ÑÐµÐºÑÑÐµ Ð·Ð°Ð¿ÑÐ¾ÑÐ°.]" if prompt else "[ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð¿ÑÐ¸ÐºÑÐµÐ¿Ð¸Ð» Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¸Ðµ. ÐÐ¿Ð¸ÑÐ¸ ÑÑÐ¾ Ð½Ð° Ð½ÑÐ¼ Ð¸Ð·Ð¾Ð±ÑÐ°Ð¶ÐµÐ½Ð¾.]")
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
    """Memory Panel endpoint â returns agent memories for this session."""
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
    logger.info("GodLocal API v2.0 ready â /ws/search /ws/oasis")
