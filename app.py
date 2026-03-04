# GodLocal API Backend v14 — FastAPI / Uvicorn
# WebSocket: /ws/oasis /ws/deep /ws/search
# REST: /health /ping /status /v2/chat /v2/council /memory /profile /mission /market /think /hitl/*
import os, sys, time, json, threading, asyncio, logging, random, hashlib
import requests, httpx
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Body
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("godlocal")

app = FastAPI(title="GodLocal API", version="14.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_lock = threading.Lock()
_kill_switch = os.environ.get("XZERO_KILL_SWITCH", "false").lower() == "true"
_thoughts: list = []
_sparks: list = []
_market_cache: dict = {"data": None, "ts": 0.0}
_soul: dict = {}
_compression_cache: dict = {}
_memories: dict = {}
_user_profiles: dict = {}

GROQ_KEY     = os.environ.get("GROQ_API_KEY", "")
COMPOSIO_KEY = os.environ.get("COMPOSIO_API_KEY", "")
SERPER_KEY   = os.environ.get("SERPER_API_KEY", "")
XQUIK_KEY    = os.environ.get("XQUIK_API_KEY", "")
PINCHTAB_URL = os.environ.get("PINCHTAB_URL", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TG_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "")

# Speed-optimised model list: 8b-instant first (~5x faster)
MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "llama-3.3-70b-specdec",
]

_HITL_READY = False

# ─── Supabase helpers ────────────────────────────────────────────────────────

def _sb_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

def memory_add(session_id: str, content: str, agent_id: str = "godlocal", mem_type: str = "fact"):
    import uuid
    entry = {"id": str(uuid.uuid4())[:8], "content": content, "type": mem_type,
              "agent_id": agent_id, "ts": int(datetime.utcnow().timestamp() * 1000)}
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            requests.post(f"{SUPABASE_URL}/rest/v1/agent_memories",
                json={"session_id": session_id, **entry}, headers=_sb_headers(), timeout=5)
        except Exception as e:
            logger.warning("Supabase memory_add failed: %s", e)
    with _lock:
        if session_id not in _memories: _memories[session_id] = []
        _memories[session_id].append(entry)
        if len(_memories[session_id]) > 100:
            _memories[session_id] = _memories[session_id][-100:]

def memory_get(session_id: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/agent_memories",
                params={"session_id": f"eq.{session_id}", "order": "ts.desc", "limit": "50"},
                headers=_sb_headers(), timeout=5)
            if r.status_code == 200:
                rows = r.json()
                if isinstance(rows, list): return list(reversed(rows))
        except Exception as e:
            logger.warning("Supabase memory_get failed: %s", e)
    return _memories.get(session_id, [])

def profile_get(session_id: str) -> dict:
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/user_profiles",
                params={"session_id": f"eq.{session_id}"}, headers=_sb_headers(), timeout=5)
            if r.status_code == 200:
                rows = r.json()
                if rows and isinstance(rows, list): return rows[0].get("profile", {})
        except Exception as e:
            logger.warning("Supabase profile_get failed: %s", e)
    return _user_profiles.get(session_id, {})

def profile_update(session_id: str, updates: dict):
    current = profile_get(session_id)
    current.update(updates)
    current["updated_at"] = datetime.utcnow().isoformat()
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            requests.post(f"{SUPABASE_URL}/rest/v1/user_profiles",
                json={"session_id": session_id, "profile": current},
                headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates"}, timeout=5)
        except Exception as e:
            logger.warning("Supabase profile_update failed: %s", e)
    with _lock:
        _user_profiles[session_id] = current
    return current

def kv_set(session_id: str, key: str, value: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            requests.post(f"{SUPABASE_URL}/rest/v1/agent_kv",
                json={"session_id": session_id, "key": key, "value": value,
                      "ts": datetime.utcnow().isoformat()},
                headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates"}, timeout=5)
            return
        except Exception as e:
            logger.warning("Supabase kv_set failed: %s", e)
    with _lock:
        if "_kv" not in _soul: _soul["_kv"] = {}
        _soul["_kv"][f"{session_id}::{key}"] = value

def kv_get(session_id: str, key: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/agent_kv",
                params={"session_id": f"eq.{session_id}", "key": f"eq.{key}"},
                headers=_sb_headers(), timeout=5)
            if r.status_code == 200:
                rows = r.json()
                if rows: return rows[0].get("value")
        except Exception as e:
            logger.warning("Supabase kv_get failed: %s", e)
    return _soul.get("_kv", {}).get(f"{session_id}::{key}")

# ─── Groq helpers ────────────────────────────────────────────────────────────

def groq_call(messages, tools=None, idx=0, max_tokens=1500):
    if not GROQ_KEY or idx >= len(MODELS): return None, "all models exhausted"
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    if not tools:
        messages = [m for m in messages if m.get("role") != "tool"]
    body = {"model": MODELS[idx], "messages": messages, "max_tokens": max_tokens,
            "temperature": 0.4, "top_p": 0.9}
    if tools: body["tools"] = tools; body["tool_choice"] = "auto"
    try:
        r = requests.post("https://api.groq.com/openai/v1/chat/completions",
            json=body, headers=headers, timeout=15)
        if r.status_code == 429:
            time.sleep(1.5); return groq_call(messages, tools, idx + 1, max_tokens)
        r.raise_for_status(); return r.json(), None
    except Exception as e:
        if idx < len(MODELS) - 1:
            time.sleep(0.5); return groq_call(messages, tools, idx + 1, max_tokens)
        return None, str(e)

async def groq_stream(messages, idx=0, max_tokens=1500):
    if not GROQ_KEY or idx >= len(MODELS): return
    messages = [m for m in messages if m.get("role") != "tool"]
    body = {"model": MODELS[idx], "messages": messages,
            "max_tokens": max_tokens, "temperature": 0.4, "stream": True}
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("POST", "https://api.groq.com/openai/v1/chat/completions",
                                     json=body, headers=headers) as resp:
                if resp.status_code in (429, 400):
                    if idx < len(MODELS) - 1:
                        async for tok in groq_stream(messages, idx + 1, max_tokens): yield tok
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

def get_market():
    now = time.time()
    if now - _market_cache["ts"] < 300 and _market_cache["data"]: return _market_cache["data"]
    try:
        r = requests.get("https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "bitcoin,ethereum,solana,binancecoin,sui",
                    "vs_currencies": "usd", "include_24hr_change": "true"}, timeout=8)
        data = r.json(); _market_cache["data"] = data; _market_cache["ts"] = now
        return data
    except Exception as e: return {"error": str(e)}

# ─── Tools ───────────────────────────────────────────────────────────────────

BASE_TOOLS = [
    {"type": "function", "function": {"name": "get_market_data", "description": "Live crypto prices",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "get_system_status", "description": "System state",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "set_kill_switch", "description": "Enable/disable trading",
        "parameters": {"type": "object", "properties": {"active": {"type": "boolean"}, "reason": {"type": "string"}}, "required": ["active"]}}},
    {"type": "function", "function": {"name": "web_search", "description": "Search web via Serper",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "fetch_url", "description": "Fetch full content of any URL",
        "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}},
    {"type": "function", "function": {"name": "youtube_transcript",
        "description": "Get transcript from YouTube video URL",
        "parameters": {"type": "object", "properties": {
            "url": {"type": "string"}, "lang": {"type": "string"}}, "required": ["url"]}}},
    {"type": "function", "function": {"name": "remember", "description": "Save to persistent memory",
        "parameters": {"type": "object", "properties": {"key": {"type": "string"}, "value": {"type": "string"}}, "required": ["key", "value"]}}},
    {"type": "function", "function": {"name": "recall", "description": "Retrieve from persistent memory",
        "parameters": {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}}},
    {"type": "function", "function": {"name": "update_profile",
        "description": "Update user profile (name, goals, trading style, active mission)",
        "parameters": {"type": "object", "properties": {
            "field": {"type": "string"}, "value": {"type": "string"}}, "required": ["field", "value"]}}},
]
COMPOSIO_TOOLS = [
    {"type": "function", "function": {"name": "post_tweet", "description": "Post tweet @kitbtc",
        "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "send_telegram", "description": "Send Telegram message",
        "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "create_github_issue", "description": "Create GitHub issue",
        "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "body": {"type": "string"}}, "required": ["title"]}}},
]
XQUIK_TOOLS = [
    {"type": "function", "function": {"name": "get_twitter_trends",
        "description": "Get real-time Twitter trending topics, filtered for crypto.",
        "parameters": {"type": "object", "properties": {"woeid": {"type": "integer"}}, "required": []}}},
    {"type": "function", "function": {"name": "get_account_posts",
        "description": "Get recent tweets from a specific Twitter/X account.",
        "parameters": {"type": "object", "properties": {"username": {"type": "string"}}, "required": ["username"]}}},
]
PINCHTAB_TOOLS = [
    {"type": "function", "function": {"name": "browser_action",
        "description": "Control a real browser via Pinchtab. Supports: navigate, click, type, scroll, snapshot, screenshot.",
        "parameters": {"type": "object", "properties": {
            "action": {"type": "string", "enum": ["navigate", "click", "type", "scroll", "snapshot", "screenshot"]},
            "url": {"type": "string"}, "selector": {"type": "string"},
            "text": {"type": "string"}, "session_id": {"type": "string"}}, "required": ["action"]}}},
]

def all_tools():
    return BASE_TOOLS \
        + (COMPOSIO_TOOLS if COMPOSIO_KEY else []) \
        + (XQUIK_TOOLS if XQUIK_KEY else []) \
        + (PINCHTAB_TOOLS if PINCHTAB_URL else [])

TOOL_LABELS = {
    "web_search": "\U0001f310 \u043f\u043e\u0438\u0441\u043a", "fetch_url": "\U0001f4c4 \u0447\u0438\u0442\u0430\u044e", "get_market_data": "\U0001f4ca \u0440\u044b\u043d\u043e\u043a",
    "post_tweet": "\U0001d54f \u043f\u043e\u0441\u0442", "send_telegram": "\u2708\ufe0f Telegram", "create_github_issue": "\U0001f419 issue",
    "remember": "\U0001f9e0 \u0437\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u044e", "recall": "\U0001f9e0 \u0432\u0441\u043f\u043e\u043c\u0438\u043d\u0430\u044e", "get_twitter_trends": "\U0001f4c8 \u0442\u0440\u0435\u043d\u0434\u044b",
    "browser_action": "\U0001f30d \u0431\u0440\u0430\u0443\u0437\u0435\u0440", "youtube_transcript": "\U0001f3ac \u0432\u0438\u0434\u0435\u043e",
}

# ─── Tool executor ────────────────────────────────────────────────────────────

def run_tool(name: str, args: dict, session_id: str = ""):
    try:
        if name == "get_market_data":
            return json.dumps(get_market())
        if name == "get_system_status":
            return json.dumps({"kill_switch": _kill_switch, "sparks": len(_sparks),
                               "thoughts": len(_thoughts), "uptime_ok": True})
        if name == "set_kill_switch":
            global _kill_switch
            _kill_switch = args.get("active", False)
            return json.dumps({"ok": True, "kill_switch": _kill_switch})
        if name == "web_search":
            q = args.get("query", "")
            if not SERPER_KEY: return json.dumps({"error": "no SERPER_KEY"})
            r = requests.post("https://google.serper.dev/search",
                json={"q": q, "num": 5}, headers={"X-API-KEY": SERPER_KEY}, timeout=10)
            data = r.json()
            results = data.get("organic", [])[:5]
            return json.dumps([{"title": x.get("title"), "snippet": x.get("snippet"), "url": x.get("link")} for x in results])
        if name == "fetch_url":
            url = args.get("url", "")
            r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            text = r.text[:6000]
            return json.dumps({"url": url, "content": text})
        if name == "youtube_transcript":
            url = args.get("url", ""); lang = args.get("lang", "en")
            return _get_youtube_transcript(url, lang)
        if name == "remember":
            kv_set(session_id, args["key"], args["value"])
            return json.dumps({"ok": True, "key": args["key"]})
        if name == "recall":
            val = kv_get(session_id, args["key"])
            return json.dumps({"key": args["key"], "value": val})
        if name == "update_profile":
            profile_update(session_id, {args["field"]: args["value"]})
            return json.dumps({"ok": True, "field": args["field"]})
        if name == "post_tweet" and COMPOSIO_KEY:
            _fire_tweet(args.get("text", ""))
            return json.dumps({"ok": True})
        if name == "send_telegram" and TG_BOT_TOKEN and TG_CHAT_ID:
            requests.post(f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage",
                json={"chat_id": TG_CHAT_ID, "text": args.get("text", "")}, timeout=10)
            return json.dumps({"ok": True})
        if name == "create_github_issue" and COMPOSIO_KEY:
            requests.post("https://backend.composio.dev/api/v2/actions/GITHUB_CREATE_AN_ISSUE/execute",
                json={"input": {"title": args.get("title", ""), "body": args.get("body", "")}},
                headers={"x-api-key": COMPOSIO_KEY, "Content-Type": "application/json"}, timeout=15)
            return json.dumps({"ok": True})
        if name == "get_twitter_trends" and XQUIK_KEY:
            woeid = args.get("woeid", 1)
            r = requests.get(f"https://api.xquik.com/v1/trends?woeid={woeid}",
                headers={"Authorization": f"Bearer {XQUIK_KEY}"}, timeout=10)
            return json.dumps(r.json())
        if name == "get_account_posts" and XQUIK_KEY:
            un = args.get("username", "")
            r = requests.get(f"https://api.xquik.com/v1/user/{un}/tweets",
                headers={"Authorization": f"Bearer {XQUIK_KEY}"}, timeout=10)
            return json.dumps(r.json())
        if name == "browser_action" and PINCHTAB_URL:
            r = requests.post(f"{PINCHTAB_URL}/action", json=args, timeout=30)
            return json.dumps(r.json())
        return json.dumps({"error": f"unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})

def _get_youtube_transcript(url: str, lang: str = "en") -> str:
    import re
    vid = None
    for pattern in [r"v=([A-Za-z0-9_-]{11})", r"youtu\.be/([A-Za-z0-9_-]{11})", r"shorts/([A-Za-z0-9_-]{11})"]:
        m = re.search(pattern, url)
        if m: vid = m.group(1); break
    if not vid: return json.dumps({"error": "cannot extract video ID"})
    try:
        api_url = f"https://www.youtube.com/api/timedtext?v={vid}&lang={lang}&fmt=json3"
        r = requests.get(api_url, timeout=10)
        if r.status_code == 200 and r.text.strip():
            data = r.json()
            events = data.get("events", [])
            segs = [s.get("utf8", "") for e in events for s in e.get("segs", [])]
            text = " ".join(segs).replace("\n", " ").strip()[:6000]
            if text: return json.dumps({"video_id": vid, "transcript": text})
    except: pass
    try:
        r2 = requests.get(f"https://www.youtube.com/watch?v={vid}",
            headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if r2.status_code == 200:
            m = re.search(r'"shortDescription":"(.*?)"(?:,"isCrawlable")', r2.text)
            desc = m.group(1).replace("\\n", " ")[:2000] if m else ""
            tm = re.search(r'"title":\{"runs":\[\{"text":"(.*?)"\}', r2.text)
            title = tm.group(1) if tm else ""
            return json.dumps({"video_id": vid, "title": title, "description": desc,
                               "note": "transcript unavailable, showing description"})
    except: pass
    return json.dumps({"error": "transcript not available"})

def _fire_tweet(text: str):
    if not COMPOSIO_KEY or not text: return
    try:
        requests.post("https://backend.composio.dev/api/v2/actions/TWITTER_CREATION_OF_A_POST/execute",
            json={"input": {"text": text}},
            headers={"x-api-key": COMPOSIO_KEY, "Content-Type": "application/json"}, timeout=15)
    except Exception as e:
        logger.warning("Tweet failed: %s", e)

# ─── System prompt ────────────────────────────────────────────────────────────

AGENT_SYSTEM = """You are GodLocal \u26a1 \u2014 a sovereign AI assistant and strategic partner.
You are direct, insightful, and action-oriented. You think in first principles.
You have access to tools: web search, market data, memory, browser control, and more.
When you need to use a tool, use it. When you have enough information, respond directly.
Speak the user's language (Russian/Ukrainian/English \u2014 match what they use).
Be concise but complete. No filler phrases."""

# ─── react_ws: single-agent ReAct loop ───────────────────────────────────────

async def react_ws(ws: WebSocket, prompt: str, session_id: str, history: list,
                   image_base64: str = None, lang: str = "ru"):
    """Fast single-agent ReAct loop. Uses 8b-instant by default."""
    tools = all_tools()
    profile = profile_get(session_id)
    mems = memory_get(session_id)
    mem_text = ""
    if mems:
        mem_text = "\n\nUser memory:\n" + "\n".join(f"- {m.get('content','')}" for m in mems[-10:])
    if profile:
        mem_text += f"\n\nUser profile: {json.dumps(profile, ensure_ascii=False)[:500]}"
    sys_msg = {"role": "system", "content": AGENT_SYSTEM + mem_text}
    hist = [m for m in history[-20:] if m.get("role") in ("user", "assistant")]
    if image_base64:
        user_content = [{"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_base64}}]
    else:
        user_content = prompt
    messages = [sys_msg] + hist + [{"role": "user", "content": user_content}]
    full_response = ""
    for iteration in range(4):
        resp_data, err = groq_call(messages, tools=tools if iteration < 3 else None)
        if err or not resp_data:
            await ws.send_json({"t": "token", "v": "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u044f \u0441 AI. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430."})
            break
        choice = resp_data["choices"][0]
        msg = choice["message"]
        finish = choice.get("finish_reason", "")
        if finish == "tool_calls" and msg.get("tool_calls"):
            messages.append({"role": "assistant", "content": msg.get("content") or "", "tool_calls": msg["tool_calls"]})
            for tc in msg["tool_calls"]:
                fn = tc["function"]["name"]
                args = json.loads(tc["function"].get("arguments", "{}"))
                label = TOOL_LABELS.get(fn, f"\U0001f527 {fn}")
                await ws.send_json({"t": "tool_start", "v": label})
                result = await asyncio.get_event_loop().run_in_executor(
                    None, lambda fn=fn, args=args: run_tool(fn, args, session_id))
                await ws.send_json({"t": "tool_done", "v": label})
                messages.append({"role": "tool", "tool_call_id": tc["id"], "name": fn, "content": result})
            continue
        content = msg.get("content") or ""
        if content:
            async for tok in groq_stream(messages, max_tokens=1200):
                full_response += tok
                await ws.send_json({"t": "token", "v": tok})
            if not full_response and content:
                full_response = content
                for i in range(0, len(content), 4):
                    await ws.send_json({"t": "token", "v": content[i:i+4]})
                    await asyncio.sleep(0.01)
        break
    if full_response and len(full_response) > 50:
        try:
            asyncio.get_event_loop().run_in_executor(None,
                lambda: memory_add(session_id, f"[{datetime.utcnow().strftime('%Y-%m-%d')}] Q: {prompt[:80]} \u2192 A: {full_response[:120]}"))
        except: pass
    await ws.send_json({"t": "done"})
    return full_response

# ─── Council Mode ─────────────────────────────────────────────────────────────

ARCHETYPES = [
    {"id": "grok", "name": "Grok", "emoji": "\U0001f525",
     "system": "You are Grok \u2014 a sharp market strategist. Identify patterns, risks, and opportunities. Be direct and contrarian when needed. Max 200 words."},
    {"id": "lucas", "name": "Lucas", "emoji": "\U0001f4d0",
     "system": "You are Lucas \u2014 a systems architect. Break problems into first principles. Find structural solutions. Max 200 words."},
    {"id": "harper", "name": "Harper", "emoji": "\U0001f30a",
     "system": "You are Harper \u2014 a growth catalyst. Focus on human dynamics, psychology, and traction. Max 200 words."},
    {"id": "navi", "name": "Navi", "emoji": "\U0001f9ed",
     "system": "You are Navi \u2014 a pragmatic navigator. Focus on what to do NOW, concrete next steps. Max 200 words."},
    {"id": "rex", "name": "Rex", "emoji": "\U0001f4b0",
     "system": "You are Rex \u2014 a capital strategist. Focus on ROI, monetisation, resource allocation. Max 200 words."},
]

async def council_stream(user_id: str, message: str):
    mems = memory_get(user_id)
    mem_ctx = ""
    if mems:
        mem_ctx = "\n\nContext from memory:\n" + "\n".join(f"- {m.get('content','')}" for m in mems[-5:])
    responses = []
    for arch in ARCHETYPES:
        yield f"data: {json.dumps({'t': 'arch_start', 'id': arch['id'], 'name': arch['name'], 'emoji': arch['emoji']})}\n\n"
        arch_msgs = [{"role": "system", "content": arch["system"] + mem_ctx},
                     {"role": "user", "content": message}]
        arch_response = ""
        async for tok in groq_stream(arch_msgs, max_tokens=300):
            arch_response += tok
            yield f"data: {json.dumps({'t': 'arch_token', 'id': arch['id'], 'v': tok})}\n\n"
        responses.append({"name": arch["name"], "response": arch_response})
        yield f"data: {json.dumps({'t': 'arch_done', 'id': arch['id']})}\n\n"
    yield f"data: {json.dumps({'t': 'synth_start'})}\n\n"
    synth_input = "\n\n".join([f"{r['name']}: {r['response']}" for r in responses])
    synth_msgs = [
        {"role": "system", "content": "You are the Synthesis voice of GodLocal \u26a1. Synthesise the council's perspectives into ONE clear, actionable insight. Be decisive. Max 150 words. Speak in the user's language."},
        {"role": "user", "content": f"Original question: {message}\n\nCouncil perspectives:\n{synth_input}"}
    ]
    async for tok in groq_stream(synth_msgs, max_tokens=300):
        yield f"data: {json.dumps({'t': 'synth_token', 'v': tok})}\n\n"
    yield f"data: {json.dumps({'t': 'synth_done'})}\n\n"
    yield f"data: {json.dumps({'t': 'council_done'})}\n\n"

# ─── WebSocket: /ws/oasis ─────────────────────────────────────────────────────

@app.websocket("/ws/oasis")
async def ws_oasis(ws: WebSocket, sid: str = "default"):
    await ws.accept()
    session_id = sid or "default"
    history: list = []
    logger.info("WS /ws/oasis connected: %s", session_id)
    try:
        while True:
            raw = await ws.receive_text()
            try: data = json.loads(raw)
            except: continue
            if data.get("t") == "ping":
                await ws.send_json({"t": "pong"}); continue
            prompt = data.get("prompt", "").strip()
            if not prompt: continue
            image_b64 = data.get("image_base64")
            lang = data.get("lang", "ru")
            history.append({"role": "user", "content": prompt})
            response = await react_ws(ws, prompt, session_id, history[:-1],
                                      image_base64=image_b64, lang=lang)
            if response:
                history.append({"role": "assistant", "content": response})
            if len(history) > 40:
                history = history[-40:]
    except WebSocketDisconnect:
        logger.info("WS /ws/oasis disconnected: %s", session_id)
    except Exception as e:
        logger.error("WS /ws/oasis error: %s", e)
        try: await ws.send_json({"t": "error", "v": str(e)})
        except: pass

# ─── WebSocket: /ws/deep ─────────────────────────────────────────────────────

@app.websocket("/ws/deep")
async def ws_deep(ws: WebSocket):
    await ws.accept()
    try:
        raw = await asyncio.wait_for(ws.receive_text(), timeout=30)
        data = json.loads(raw)
        prompt = data.get("prompt", "")
        sid = data.get("session_id", "default")
        if not prompt:
            await ws.send_json({"t": "session_done"}); return
        await ws.send_json({"t": "plan", "v": "\U0001f5fa Составляю план исследования..."})
        plan_msgs = [
            {"role": "system", "content": "You are a research planner. Create a concise 3-step research plan. Output as numbered list. Max 100 words."},
            {"role": "user", "content": prompt}
        ]
        plan_text = ""
        async for tok in groq_stream(plan_msgs, max_tokens=200):
            plan_text += tok
            await ws.send_json({"t": "plan_token", "v": tok})
        await ws.send_json({"t": "plan_done"})
        search_results = ""
        if SERPER_KEY:
            await ws.send_json({"t": "research", "v": "\U0001f50d Собираю данные..."})
            try:
                r = requests.post("https://google.serper.dev/search",
                    json={"q": prompt, "num": 5}, headers={"X-API-KEY": SERPER_KEY}, timeout=10)
                results = r.json().get("organic", [])[:5]
                search_results = "\n".join([f"- {x.get('title')}: {x.get('snippet')}" for x in results])
                await ws.send_json({"t": "research_done", "v": f"\u041d\u0430\u0439\u0434\u0435\u043d\u043e {len(results)} \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u043e\u0432"})
            except:
                await ws.send_json({"t": "research_done", "v": "\u041f\u043e\u0438\u0441\u043a \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d"})
        await ws.send_json({"t": "build", "v": "\u270d\ufe0f \u0424\u043e\u0440\u043c\u0438\u0440\u0443\u044e \u043e\u0442\u0432\u0435\u0442..."})
        synth_ctx = f"Research plan:\n{plan_text}\n\n"
        if search_results: synth_ctx += f"Search results:\n{search_results}\n\n"
        synth_msgs = [
            {"role": "system", "content": "You are a deep research synthesiser. Provide a comprehensive, well-structured answer. Use markdown. Speak in user's language."},
            {"role": "user", "content": f"Original question: {prompt}\n\n{synth_ctx}"}
        ]
        async for tok in groq_stream(synth_msgs, max_tokens=1200):
            await ws.send_json({"t": "token", "v": tok})
        await ws.send_json({"t": "session_done"})
    except asyncio.TimeoutError:
        await ws.send_json({"t": "session_done"})
    except WebSocketDisconnect: pass
    except Exception as e:
        logger.error("WS /ws/deep error: %s", e)
        try: await ws.send_json({"t": "error", "v": str(e)})
        except: pass

# ─── REST endpoints ───────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/health")
def health():
    return JSONResponse({"status": "ok", "version": "14.0.0",
                         "supabase": bool(SUPABASE_URL and SUPABASE_KEY),
                         "groq": bool(GROQ_KEY), "serper": bool(SERPER_KEY)})

@app.get("/ping")
def ping():
    return JSONResponse({"pong": True})

@app.get("/status")
def status():
    return JSONResponse({"kill_switch": _kill_switch, "thoughts": len(_thoughts),
                         "sparks": len(_sparks), "hitl_ready": _HITL_READY})

@app.get("/market")
def market():
    return JSONResponse(get_market())

@app.post("/think")
async def think(request: Request):
    body = await request.json()
    prompt = body.get("prompt", "")
    if not prompt: return JSONResponse({"error": "no prompt"}, status_code=400)
    resp_data, err = groq_call([{"role": "system", "content": AGENT_SYSTEM},
                                 {"role": "user", "content": prompt}])
    if err: return JSONResponse({"error": err}, status_code=500)
    return JSONResponse({"response": resp_data["choices"][0]["message"]["content"]})

@app.post("/v2/chat")
async def v2_chat(request: Request):
    body = await request.json()
    prompt = body.get("message", body.get("prompt", ""))
    sid = body.get("user_id", body.get("session_id", "default"))
    if not prompt: return JSONResponse({"error": "no message"}, status_code=400)
    async def generate():
        mems = memory_get(sid)
        mem_ctx = ""
        if mems: mem_ctx = "\n\nUser memory:\n" + "\n".join(f"- {m.get('content','')}" for m in mems[-8:])
        messages = [{"role": "system", "content": AGENT_SYSTEM + mem_ctx},
                    {"role": "user", "content": prompt}]
        async for tok in groq_stream(messages):
            yield f"data: {json.dumps({'t': 'token', 'v': tok})}\n\n"
        yield f"data: {json.dumps({'t': 'done'})}\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.post("/v2/council")
async def v2_council(request: Request):
    body = await request.json()
    message = body.get("message", body.get("prompt", ""))
    user_id = body.get("user_id", body.get("session_id", "default"))
    if not message: return JSONResponse({"error": "no message"}, status_code=400)
    return StreamingResponse(council_stream(user_id, message), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.get("/memory")
def get_memory(session_id: str = "default"):
    return JSONResponse(memory_get(session_id))

@app.delete("/memory/{session_id}/{mem_id}")
def delete_memory(session_id: str, mem_id: str):
    with _lock:
        if session_id in _memories:
            _memories[session_id] = [m for m in _memories[session_id] if m.get("id") != mem_id]
    return JSONResponse({"ok": True})

@app.get("/profile")
def get_profile(session_id: str = "default"):
    return JSONResponse(profile_get(session_id))

@app.post("/profile")
async def set_profile(request: Request):
    body = await request.json()
    sid = body.pop("session_id", "default")
    profile_update(sid, body)
    return JSONResponse({"ok": True})

@app.get("/mission")
def get_mission(session_id: str = "default"):
    return JSONResponse({"mission": profile_get(session_id).get("active_mission", "")})

@app.post("/mission")
async def set_mission(request: Request):
    body = await request.json()
    profile_update(body.get("session_id", "default"), {"active_mission": body.get("mission", "")})
    return JSONResponse({"ok": True})

@app.get("/hitl/status")
def hitl_status():
    return JSONResponse({"available": _HITL_READY})

@app.get("/hitl/tasks")
def hitl_tasks():
    return JSONResponse({"tasks": []})
