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
    body = {"model": MODELS[idx], "messages": messages, "max_tokens": 512, "temperature": 0.6}
    if tools: body["tools"] = tools; body["tool_choice"] = "auto"
    try:
        r = requests.post("https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers, timeout=30)
        if r.status_code == 429: return groq_call(messages, tools, idx + 1)
        r.raise_for_status(); return r.json(), None
    except Exception as e:
        return groq_call(messages, tools, idx + 1) if idx < len(MODELS) - 1 else (None, str(e))

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

def run_tool(name, args):
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
            if _HITL_READY and _hitl_tq and _hitl_notifier and _hitl_loop:
                task = _hitl_tq.create(title="Tweet @kitbtc", executor="human", draft_type="social_draft", draft_data={"platform": "twitter", "message": text}, why_human="Agent wants to tweet")
                asyncio.run_coroutine_threadsafe(_hitl_notifier.send_card(task["id"]), _hitl_loop)
                return json.dumps({"ok": True, "hitl": True, "task_id": task["id"]})
            r = requests.post(f"{base}/TWITTER_CREATION_OF_A_POST/execute", json={"input": {"text": text}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
        if name == "send_telegram":
            if _HITL_READY and _hitl_notifier and _hitl_loop:
                asyncio.run_coroutine_threadsafe(_hitl_notifier.notify(args.get("text", "")), _hitl_loop)
                return json.dumps({"ok": True, "via": "hitl_bot"})
            r = requests.post(f"{base}/TELEGRAM_SEND_MESSAGE/execute", json={"input": {"text": args.get("text", "")}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
        if name == "create_github_issue":
            r = requests.post(f"{base}/GITHUB_CREATE_AN_ISSUE/execute", json={"input": {"owner": "GodLocal2026", "repo": "godlocal-site", "title": args.get("title", ""), "body": args.get("body", "")}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
    except Exception as e: return json.dumps({"error": str(e)})
    return json.dumps({"error": f"unknown tool: {name}"})

def react(prompt, history=None):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    msgs = [{"role": "system", "content": f"You are GodLocal AI agent. Date: {now_str}. ReAct loop max 8 steps."}]
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
            text = msg.get("content") or ""
            with _lock:
                _thoughts.append({"text": text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            return text, steps, used_model
    return "Internal error", steps, used_model

async def react_ws(prompt, history, ws):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    msgs = [{"role": "system", "content": f"You are GodLocal AI agent. Date: {now_str}. ReAct max 6 steps."}]
    if history: msgs.extend(history[-4:])
    msgs.append({"role": "user", "content": prompt})
    tools = all_tools(); used_model = MODELS[0]
    for step in range(6):
        if step == 5:
            full_text = ""
            async for token in groq_stream(msgs):
                full_text += token
                await ws.send_json({"t": "token", "v": token})
            with _lock:
                _thoughts.append({"text": full_text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            await ws.send_json({"t": "done", "m": used_model})
            return full_text
        resp, err = await asyncio.to_thread(groq_call, msgs, tools)
        if err or not resp:
            await ws.send_json({"t": "error", "v": err or "no response"})
            return ""
        choice = resp["choices"][0]; msg = choice["message"]
        used_model = resp.get("model", MODELS[0])
        if msg.get("tool_calls"):
            msgs.append(msg)
            for tc in msg["tool_calls"]:
                fn_name = tc["function"]["name"]
                fn_args = json.loads(tc["function"].get("arguments") or "{}")
                await ws.send_json({"t": "tool_start", "n": fn_name})
                result = await asyncio.to_thread(run_tool, fn_name, fn_args)
                await ws.send_json({"t": "tool_done", "n": fn_name, "r": result[:200]})
                msgs.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
        else:
            text = msg.get("content") or ""
            for word in text.split(" "):
                await ws.send_json({"t": "token", "v": word + " "})
                await asyncio.sleep(0.01)
            with _lock:
                _thoughts.append({"text": text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            await ws.send_json({"t": "done", "m": used_model})
            return text
    return ""

ARCHETYPES = {
    "Architect": "You are the Architect - strategic, sees systems. Reply in 1-2 sentences.",
    "Builder": "You are the Builder - pragmatic, action-oriented. Reply in 1-2 sentences.",
    "Grok": "You are Grok - philosophical, questions assumptions. Reply in 1-2 sentences.",
    "Lucas": "You are Lucas - empathetic, human-centered. Reply in 1-2 sentences.",
}

async def get_archetype_reply(name, system, main_reply, user_msg):
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": f"User: {user_msg}\nGodLocal: {main_reply[:300]}\nYour take:"}]
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

@app.get("/agent/tick"); @app.post("/agent/tick")
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
            if not prompt: await ws.send_json({"t": "error", "v": "prompt required"}); continue
            history = soul_history(sid)
            soul_add(sid, "user", prompt)
            await ws.send_json({"t": "agent_start", "agent": "GodLocal"})
            main_reply = await react_ws(prompt, history, ws)
            if main_reply: soul_add(sid, "assistant", main_reply)
            for arch_name, arch_system in random.sample(list(ARCHETYPES.items()), 2):
                await ws.send_json({"t": "arch_start", "agent": arch_name})
                arch_reply = await get_archetype_reply(arch_name, arch_system, main_reply, prompt)
                if arch_reply: await ws.send_json({"t": "arch_reply", "agent": arch_name, "v": arch_reply})
            await ws.send_json({"t": "session_done"})
    except WebSocketDisconnect: pass
    except Exception as e:
        try: await ws.send_json({"t": "error", "v": str(e)})
        except: pass

@app.on_event("startup")
async def startup():
    threading.Thread(target=_start_hitl_thread, daemon=True).start()
    logger.info("GodLocal API v2.0 ready — /ws/search /ws/oasis")
