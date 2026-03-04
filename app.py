# GodLocal API Backend v13 — Council Mode v2 (smart select, dedup, synthesis) — FastAPI / Uvicorn
# Improvements: Supabase persistent memory, compression cache (v10 perf fix),
#               agent disagreement, user profile model, active mission
# WebSocket: /ws/search /ws/oasis
# REST: /api/health /api/soul/{sid} /think /market /status /hitl/* /memory /profile /mission
import os, sys, time, json, threading, asyncio, logging, random
import requests, httpx
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Body
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("godlocal")

app = FastAPI(title="GodLocal API", version="9.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_lock = threading.Lock()
_kill_switch = os.environ.get("XZERO_KILL_SWITCH", "false").lower() == "true"
_thoughts: list = []
_sparks: list = []
_market_cache: dict = {"data": None, "ts": 0.0}

# ─── In-memory fallback (used when Supabase not configured) ───────────────────
_soul: dict = {}         # session_id -> [{role, content, ts}]
_compression_cache: dict = {}  # session_id -> {hash, result}  v10 perf fix
_memories: dict = {}     # session_id -> [{id, content, ts}]
_user_profiles: dict = {}  # session_id -> {name, goals, style, facts, mission}

GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
COMPOSIO_KEY = os.environ.get("COMPOSIO_API_KEY", "")
SERPER_KEY = os.environ.get("SERPER_API_KEY", "")
XQUIK_KEY = os.environ.get("XQUIK_API_KEY", "")
PINCHTAB_URL = os.environ.get("PINCHTAB_URL", "")  # e.g. http://localhost:7171
MODELS = [
    "llama-3.3-70b-specdec",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

_HITL_READY = False
_hitl_loop = None
_hitl_tq = None
_hitl_notifier = None
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TG_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# ─── IMPROVEMENT 1: Supabase Persistent Memory ───────────────────────────────

def _sb_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

def memory_add(session_id: str, content: str, agent_id: str = "godlocal", mem_type: str = "fact"):
    import uuid
    entry = {
        "id": str(uuid.uuid4())[:8],
        "content": content,
        "type": mem_type,
        "agent_id": agent_id,
        "ts": int(datetime.utcnow().timestamp() * 1000)
    }
    # Supabase first
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/agent_memories",
                json={"session_id": session_id, **entry},
                headers=_sb_headers(), timeout=5
            )
        except Exception as e:
            logger.warning("Supabase memory_add failed: %s", e)
    # Always keep in-memory cache
    with _lock:
        if session_id not in _memories: _memories[session_id] = []
        _memories[session_id].append(entry)
        if len(_memories[session_id]) > 100:
            _memories[session_id] = _memories[session_id][-100:]

def memory_get(session_id: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/agent_memories",
                params={"session_id": f"eq.{session_id}", "order": "ts.desc", "limit": "50"},
                headers=_sb_headers(), timeout=5
            )
            if r.status_code == 200:
                rows = r.json()
                if isinstance(rows, list): return list(reversed(rows))
        except Exception as e:
            logger.warning("Supabase memory_get failed: %s", e)
    return _memories.get(session_id, [])


# ─── IMPROVEMENT 4: Structured User Profile ──────────────────────────────────

def profile_get(session_id: str) -> dict:
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/user_profiles",
                params={"session_id": f"eq.{session_id}"},
                headers=_sb_headers(), timeout=5
            )
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
            requests.post(
                f"{SUPABASE_URL}/rest/v1/user_profiles",
                json={"session_id": session_id, "profile": current},
                headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates"},
                timeout=5
            )
        except Exception as e:
            logger.warning("Supabase profile_update failed: %s", e)
    with _lock:
        _user_profiles[session_id] = current
    return current


# ─── IMPROVEMENT 5: Active Mission ──────────────────────────────────────────

def mission_get(session_id: str) -> str:
    profile = profile_get(session_id)
    return profile.get("active_mission", "")

def mission_set(session_id: str, mission: str):
    profile_update(session_id, {"active_mission": mission})


# ─── remember / recall via Supabase ──────────────────────────────────────────

def kv_set(session_id: str, key: str, value: str):
    """Persistent key-value memory (replaces in-memory _soul["_memory"])"""
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/agent_kv",
                json={"session_id": session_id, "key": key, "value": value,
                      "ts": datetime.utcnow().isoformat()},
                headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates"},
                timeout=5
            )
            return
        except Exception as e:
            logger.warning("Supabase kv_set failed: %s", e)
    # Fallback: in-memory
    with _lock:
        if "_kv" not in _soul: _soul["_kv"] = {}
        _soul["_kv"][f"{session_id}::{key}"] = value

def kv_get(session_id: str, key: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/agent_kv",
                params={"session_id": f"eq.{session_id}", "key": f"eq.{key}"},
                headers=_sb_headers(), timeout=5
            )
            if r.status_code == 200:
                rows = r.json()
                if rows: return rows[0].get("value")
        except Exception as e:
            logger.warning("Supabase kv_get failed: %s", e)
    # Fallback
    return _soul.get("_kv", {}).get(f"{session_id}::{key}")

def kv_list(session_id: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/agent_kv",
                params={"session_id": f"eq.{session_id}", "select": "key,value"},
                headers=_sb_headers(), timeout=5
            )
            if r.status_code == 200:
                return {row["key"]: row["value"] for row in r.json()}
        except Exception as e:
            logger.warning("Supabase kv_list failed: %s", e)
    prefix = f"{session_id}::"
    return {k[len(prefix):]: v for k, v in _soul.get("_kv", {}).items() if k.startswith(prefix)}


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
            time.sleep(1.5)
            return groq_call(messages, tools, idx + 1)
        r.raise_for_status(); return r.json(), None
    except Exception as e:
        if idx < len(MODELS) - 1:
            time.sleep(0.5)
            return groq_call(messages, tools, idx + 1)
        return None, str(e)

async def groq_stream(messages, idx=0, max_tokens=4096):
    if not GROQ_KEY or idx >= len(MODELS): return
    body = {"model": MODELS[idx], "messages": messages, "max_tokens": max_tokens, "temperature": 0.4, "stream": True}
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("POST", "https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers) as resp:
                if resp.status_code in (429, 400):
                    if idx < len(MODELS) - 1:
                        async for tok in groq_stream(messages, idx + 1, max_tokens=max_tokens): yield tok
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
    {"type": "function", "function": {"name": "fetch_url", "description": "Fetch and read full content of any URL", "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}},
    {"type": "function", "function": {"name": "youtube_transcript", "description": "Get transcript/subtitles from a YouTube video URL. Use when user shares a YouTube link and wants the content summarized or analyzed.", "parameters": {"type": "object", "properties": {"url": {"type": "string", "description": "Full YouTube video URL"}, "lang": {"type": "string", "description": "Language code for captions, e.g. en, ru (optional, defaults to en)"}}, "required": ["url"]}}},
    {"type": "function", "function": {"name": "remember", "description": "Save something to persistent memory for this user", "parameters": {"type": "object", "properties": {"key": {"type": "string"}, "value": {"type": "string"}}, "required": ["key", "value"]}}},
    {"type": "function", "function": {"name": "recall", "description": "Retrieve something from persistent memory", "parameters": {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}}},
    {"type": "function", "function": {"name": "update_profile", "description": "Update user profile (name, goals, trading style, active mission)", "parameters": {"type": "object", "properties": {"field": {"type": "string", "description": "e.g. name, goals, style, active_mission"}, "value": {"type": "string"}}, "required": ["field", "value"]}}},
]
PINCHTAB_TOOLS = [
    {"type": "function", "function": {"name": "browser_action", "description": "Control a real browser via Pinchtab HTTP API. Supports: navigate, click, type, scroll, snapshot, screenshot. Use for web interactions that require a real browser (login flows, JS-rendered pages, form fills).", "parameters": {"type": "object", "properties": {"action": {"type": "string", "enum": ["navigate", "click", "type", "scroll", "snapshot", "screenshot"], "description": "Action to perform"}, "url": {"type": "string", "description": "URL to navigate to (for navigate action)"}, "selector": {"type": "string", "description": "Element selector or ref ID (for click/type actions)"}, "text": {"type": "string", "description": "Text to type (for type action)"}, "session_id": {"type": "string", "description": "Browser session ID (optional, reuses persistent session)"}}, "required": ["action"]}}},
]
COMPOSIO_TOOLS = [
    {"type": "function", "function": {"name": "post_tweet", "description": "Post tweet @kitbtc", "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "send_telegram", "description": "Send Telegram message", "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "create_github_issue", "description": "Create GitHub issue", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "body": {"type": "string"}}, "required": ["title"]}}},
]
XQUIK_TOOLS = [
    {"type": "function", "function": {"name": "get_twitter_trends", "description": "Get real-time Twitter trending topics, filtered for crypto.", "parameters": {"type": "object", "properties": {"woeid": {"type": "integer", "description": "Region WOEID. 1=Worldwide, 23424977=US. Default 1."}}, "required": []}}},
    {"type": "function", "function": {"name": "get_account_posts", "description": "Get recent tweets from a specific Twitter/X account.", "parameters": {"type": "object", "properties": {"username": {"type": "string"}}, "required": ["username"]}}},
]

def all_tools(): return BASE_TOOLS + (COMPOSIO_TOOLS if COMPOSIO_KEY else []) + (XQUIK_TOOLS if XQUIK_KEY else []) + (PINCHTAB_TOOLS if PINCHTAB_URL else [])

TOOL_LABELS = {
    'web_search':'🌐 поиск', 'fetch_url':'📄 читаю', 'get_market_data':'📊 рынок',
    'post_tweet':'𝕏 пост', 'send_telegram':'✈️ Telegram', 'create_github_issue':'🐙 issue',
    'remember':'🧠 запоминаю', 'recall':'🧠 вспоминаю', 'get_twitter_trends':'📈 тренды',
    'browser_action':'🌍 браузер', 'youtube_transcript':'🎬 видео',
}
