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


# ─── IMPROVEMENT 5: Active Mission ───────────────────────────────────────────

def mission_get(session_id: str) -> str:
    profile = profile_get(session_id)
    return profile.get("active_mission", "")

def mission_set(session_id: str, mission: str):
    profile_update(session_id, {"active_mission": mission})


# ─── remember / recall via Supabase ─────────────────────────────────────────

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
    {"type": "function", "function": {"name": "remember", "description": "Save something to persistent memory for this user", "parameters": {"type": "object", "properties": {"key": {"type": "string"}, "value": {"type": "string"}}, "required": ["key", "value"]}}},
    {"type": "function", "function": {"name": "recall", "description": "Retrieve something from persistent memory", "parameters": {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}}},
    {"type": "function", "function": {"name": "update_profile", "description": "Update user profile (name, goals, trading style, active mission)", "parameters": {"type": "object", "properties": {"field": {"type": "string", "description": "e.g. name, goals, style, active_mission"}, "value": {"type": "string"}}, "required": ["field", "value"]}}},
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

def all_tools(): return BASE_TOOLS + (COMPOSIO_TOOLS if COMPOSIO_KEY else []) + (XQUIK_TOOLS if XQUIK_KEY else [])

TOOL_LABELS = {
    'web_search':'🌐 поиск', 'fetch_url':'📄 читаю', 'get_market_data':'📊 рынок',
    'post_tweet':'𝕏 пост', 'send_telegram':'✈️ Telegram', 'create_github_issue':'🐙 issue',
    'remember':'🧠 запоминаю', 'recall':'🧠 вспоминаю', 'get_twitter_trends':'📈 тренды',
}


def run_tool(name, args, svc_tokens=None):
    svc_tokens = svc_tokens or {}
    session_id = svc_tokens.get("session_id", "default")
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
    if name == "web_search":
        q = args.get("query", "")
        if SERPER_KEY:
            try:
                r = requests.post("https://google.serper.dev/search", json={"q": q, "num": 5}, headers={"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"}, timeout=10)
                return json.dumps([{"title": x.get("title"), "snippet": x.get("snippet"), "link": x.get("link")} for x in r.json().get("organic", [])[:5]])
            except Exception as e: return json.dumps({"error": str(e)})
        # DuckDuckGo fallback (no key required)
        try:
            r = requests.get("https://api.duckduckgo.com/", params={"q": q, "format": "json", "no_html": "1", "skip_disambig": "1"}, timeout=8, headers={"User-Agent": "GodLocal/2.0"})
            d = r.json()
            results = []
            if d.get("AbstractText"): results.append({"title": d.get("Heading",""), "snippet": d["AbstractText"], "link": d.get("AbstractURL","")})
            for t in d.get("RelatedTopics", [])[:4]:
                if isinstance(t, dict) and t.get("Text"): results.append({"title": t.get("Text","")[:80], "snippet": t.get("Text",""), "link": t.get("FirstURL","")})
            if results: return json.dumps(results)
            return json.dumps({"query": q, "note": "no results — try more specific query"})
        except Exception as e: return json.dumps({"error": str(e)})
    if name == "fetch_url":
        try:
            import re as _re
            resp = requests.get(args.get("url", ""), timeout=15, headers={"User-Agent": "GodLocal/2.0"})
            text = _re.sub(r"<[^>]+>", " ", resp.text)
            text = _re.sub(r"\s+", " ", text).strip()
            return json.dumps({"url": args.get("url"), "content": text[:3000], "status": resp.status_code})
        except Exception as e: return json.dumps({"error": str(e)})
    if name == "remember":
        key, val = args.get("key", ""), args.get("value", "")
        kv_set(session_id, key, val)
        memory_add(session_id, f"{key}: {val}")
        return json.dumps({"ok": True, "stored": key})
    if name == "recall":
        key = args.get("key", "")
        val = kv_get(session_id, key)
        if val: return json.dumps({"key": key, "value": val})
        all_kv = kv_list(session_id)
        return json.dumps({"keys": list(all_kv.keys()), "note": "key not found, showing all"})
    if name == "update_profile":
        field, value = args.get("field", ""), args.get("value", "")
        profile_update(session_id, {field: value})
        return json.dumps({"ok": True, "field": field, "value": value})
    if name == "get_twitter_trends" and XQUIK_KEY:
        try:
            woeid = args.get("woeid", 1)
            r = requests.get(f"https://xquik.com/api/v1/trends?woeid={woeid}&count=30", headers={"x-api-key": XQUIK_KEY}, timeout=10)
            trends = r.json().get("trends", [])
            crypto_kw = {"btc","eth","sol","bitcoin","ethereum","solana","crypto","defi","nft","web3","token","altcoin","pump","doge","bnb","xrp","avax","sui","ton","base","blast"}
            crypto_trends = [t for t in trends if any(k in t.get("name","").lower() for k in crypto_kw)]
            return json.dumps({"crypto_trends": crypto_trends, "all_trends": trends[:10], "total": r.json().get("total", 0)})
        except Exception as e: return json.dumps({"error": str(e)})
    if name == "get_account_posts" and XQUIK_KEY:
        try:
            username = args.get("username", "")
            r = requests.post("https://xquik.com/api/v1/extractions", json={"toolType": "post_extractor", "targetUsername": username}, headers={"x-api-key": XQUIK_KEY, "Content-Type": "application/json"}, timeout=10)
            job = r.json(); job_id = job.get("id")
            if not job_id: return json.dumps({"error": "no job id", "raw": job})
            for _ in range(5):
                time.sleep(2)
                pr = requests.get(f"https://xquik.com/api/v1/extractions/{job_id}", headers={"x-api-key": XQUIK_KEY}, timeout=10)
                pdata = pr.json()
                if pdata.get("status") == "completed":
                    return json.dumps({"username": username, "posts": pdata.get("data", [])[:10]})
                if pdata.get("status") == "failed":
                    return json.dumps({"error": "extraction failed"})
            return json.dumps({"status": "pending", "job_id": job_id})
        except Exception as e: return json.dumps({"error": str(e)})
    if not COMPOSIO_KEY: return json.dumps({"error": "COMPOSIO_API_KEY not set"})
    headers = {"x-api-key": COMPOSIO_KEY, "Content-Type": "application/json"}
    base = "https://backend.composio.dev/api/v2/actions"
    try:
        if name == "post_tweet":
            text = args.get("text", "")
            tw_token = svc_tokens.get("twitter")
            if tw_token:
                r = requests.post("https://api.twitter.com/2/tweets", json={"text": text}, headers={"Authorization": f"Bearer {tw_token}", "Content-Type": "application/json"}, timeout=15)
                return json.dumps({"ok": r.status_code < 300, "via": "user_token", "data": r.json()})
            if _HITL_READY and _hitl_tq and _hitl_notifier and _hitl_loop:
                task = _hitl_tq.create(title="Tweet @kitbtc", executor="human", draft_type="social_draft", draft_data={"platform": "twitter", "message": text}, why_human="Agent wants to tweet")
                asyncio.run_coroutine_threadsafe(_hitl_notifier.send_card(task["id"]), _hitl_loop)
                return json.dumps({"ok": True, "hitl": True, "task_id": task["id"]})
            r = requests.post(f"{base}/TWITTER_CREATION_OF_A_POST/execute", json={"input": {"text": text}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
        if name == "send_telegram":
            text = args.get("text", "")
            tg_token = svc_tokens.get("telegram")
            if tg_token:
                chat_id = args.get("chat_id") or TG_CHAT_ID or "me"
                r = requests.post(f"https://api.telegram.org/bot{tg_token}/sendMessage", json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=15)
                return json.dumps({"ok": r.status_code < 300, "via": "user_token", "data": r.json()})
            if _HITL_READY and _hitl_notifier and _hitl_loop:
                asyncio.run_coroutine_threadsafe(_hitl_notifier.notify(text), _hitl_loop)
                return json.dumps({"ok": True, "via": "hitl_bot"})
            r = requests.post(f"{base}/TELEGRAM_SEND_MESSAGE/execute", json={"input": {"text": text}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
        if name == "create_github_issue":
            gh_token = svc_tokens.get("github")
            owner = args.get("owner", "GodLocal2026"); repo = args.get("repo", "godlocal-site")
            if gh_token:
                r = requests.post(f"https://api.github.com/repos/{owner}/{repo}/issues", json={"title": args.get("title", ""), "body": args.get("body", "")}, headers={"Authorization": f"token {gh_token}", "Accept": "application/vnd.github+json"}, timeout=15)
                data = r.json()
                return json.dumps({"ok": r.status_code < 300, "via": "user_token", "url": data.get("html_url"), "number": data.get("number")})
            r = requests.post(f"{base}/GITHUB_CREATE_AN_ISSUE/execute", json={"input": {"owner": owner, "repo": repo, "title": args.get("title", ""), "body": args.get("body", "")}}, headers=headers, timeout=15)
            return json.dumps({"ok": r.status_code < 300})
    except Exception as e: return json.dumps({"error": str(e)})
    return json.dumps({"error": f"unknown tool: {name}"})


# ─── IMPROVEMENT 2: Context Compression ──────────────────────────────────────

COMPRESSION_THRESHOLD = 10  # compress after every 10 turns

def _history_hash(history: list) -> str:
    """Lightweight fingerprint — count + last-msg content hash."""
    import hashlib
    last = history[-1]["content"][:80] if history else ""
    return f"{len(history)}:{hashlib.md5(last.encode()).hexdigest()[:8]}"

def compress_history(history: list, sid: str = "") -> list:
    """Compress old history into a summary + keep last 4 turns verbatim.
    v10: caches result per session; skips LLM call when history unchanged."""
    if len(history) <= COMPRESSION_THRESHOLD:
        return history
    h = _history_hash(history)
    cached = _compression_cache.get(sid)
    if cached and cached["hash"] == h:
        return cached["result"]            # ← cache hit, zero LLM cost
    to_compress = history[:-4]
    keep = history[-4:]
    summary_prompt = [
        {"role": "system", "content": "Сожми диалог в 3-4 предложения. Сохрани: ключевые факты, решения, контекст пользователя. Только суть, без воды."},
        {"role": "user", "content": "Диалог:\n" + "\n".join(f"{m['role']}: {m['content'][:200]}" for m in to_compress)}
    ]
    resp, err = groq_call(summary_prompt, tools=None, idx=2)  # use fast model
    if err or not resp:
        return history[-8:]  # fallback: just trim
    summary_text = resp["choices"][0]["message"].get("content", "")
    result = [{"role": "system", "content": f"[Контекст предыдущего разговора]: {summary_text}"}] + keep
    if sid:
        _compression_cache[sid] = {"hash": h, "result": result}
    return result

def soul_add(sid, role, content):
    with _lock:
        if sid not in _soul: _soul[sid] = []
        _soul[sid].append({"role": role, "content": content[:1000], "ts": datetime.utcnow().isoformat()})
        if len(_soul[sid]) > 50: _soul[sid] = _soul[sid][-50:]

def soul_history(sid):
    raw = [{"role": t["role"], "content": t["content"]} for t in _soul.get(sid, [])]
    return compress_history(raw, sid=sid)


# ─── IMPROVEMENT 3: Agent Disagreement ───────────────────────────────────────

ARCHETYPE_CAN_DISAGREE = {
    "Architect": True,
    "Builder": True,
    "Grok": True,
    "Lucas": True,
    "Harper": True,
    "Benjamin": True,
}

async def get_archetype_reply(
    name: str,
    data: dict,
    main_reply: str,
    user_msg: str,
    session_id: str,
    other_archetypes: list | None = None
) -> str:
    """Archetype reply with session memory deduplication and SKIP filter."""
    system = data["system"]
    mem = session_memory.setdefault(session_id, {"points_made": [], "topics": []})
    context = f"Другие советники в этой сессии: {', '.join(other_archetypes)}. " if other_archetypes else ""
    avoid_points = ", ".join(mem["points_made"][-5:]) if mem["points_made"] else "ничего"

    msgs = [
        {"role": "system", "content": system},
        {"role": "user", "content": (
            f"{context}"
            f"Вопрос пользователя: {user_msg[:250]}\n"
            f"Основной ответ: {main_reply[:250]}\n"
            f"Уже затронуто: {avoid_points}\n\n"
            f"Дай СВОЙ угол — 1-2 предложения. "
            f"Если твоя позиция уже озвучена — ответь только словом SKIP. "
            f"Будь острым, не водянистым. "
            f"{'Відповідай українською.' if session_memory.get(session_id, {}).get('_lang','ru')=='uk' else 'Respond in English.' if session_memory.get(session_id, {}).get('_lang','ru')=='en' else ''}"
        )}
    ]
    # Use groq_stream (idx=2 → 8b-instant), fallback to idx=1 (70b-versatile) on failure
    content = ""
    for _midx in (1, 2, 0):
        try:
            async for token in groq_stream(msgs, idx=_midx, max_tokens=250):
                content += token
                if len(content) > 600:  # hard cap
                    break
            if content:
                break  # success — stop trying fallbacks
        except Exception as e:
            logger.warning("archetype %s model_idx=%d error: %s", name, _midx, e)
    if not content:
        logger.warning("archetype %s: all models returned empty", name)

    content = content.strip()
    if not content or content.upper() == "SKIP":
        return ""
    # Dedup: reject only exact duplicate
    if any(p and p == content[:100] for p in mem["points_made"]):
        return ""
    mem["points_made"].append(content[:100])
    return content


# ─── Master System Prompt ─────────────────────────────────────────────────────

GODLOCAL_SYSTEM = """\
Ты — GodLocal AI, главный интеллект платформы GodLocal Oasis.
Сайт: godlocal.ai

─── СОЗДАТЕЛЬ ───
Тебя создал Ростислав Олейник (укр: Ростислав Олійник, en: Rostyslav Oliinyk, @kitbtc) — соло-основатель GodLocal.
Ростислав строит GodLocal с нуля с февраля 2026 из Ирландии.
Цель: дать людям суверенный AI-агент — не чужой, а свой. "Terminal meets soul".
Когда Ростислав пишет тебе — отвечай как своему создателю: честно, прямо.

─── МИССИЯ СОВЕТА ───
Семь агентов Совета созданы чтобы дать Ростиславу и пользователям полное мышление:
критику, стратегию, эмпатию, творчество, технику — всё одновременно.
Совет — живая команда под одной крышей. Не чат-бот.

─── САМОЗНАНИЕ (не ищи это — ты знаешь) ───
• Продукты: Oasis (chat /oasis), WOLF (крипто-терминал /smertch), Voice (/voice), Game (/game)
• Архитектура: FastAPI (godlocal-api.onrender.com) + Next.js (godlocal.ai, Vercel)
• 7 агентов Совета: GodLocal⚡ Architect🏛 Builder🔨 Grok🧠 Lucas💡 Harper🔬 Benjamin📚
• Тарифы: Ghost (бесплатно, 5 реквестов/день) | Wolf €9/мес | Pack €29/мес
• Стек: Supabase Auth, Stripe EUR, Render, Groq llama-3.3-70b-specdec, Serper
• Фичи Oasis: Память (remember/recall), Галерея ☆, Навыки (8 шаблонов),
  Сервисы (Twitter/Telegram/GitHub/Gmail), Голосование 🎯/🤔/💀, Council Mode
• Инструменты: web_search, fetch_url, get_market_data, post_tweet,
  send_telegram, create_github_issue, remember, recall, update_profile

─── ЦЕПЬ МЫШЛЕНИЯ (5 шагов, обязательно) ───
Перед каждым ответом пройди эту цепь:

1. РАЗБОР — что именно просят? Разбей задачу на части.
2. КОНТЕКСТ — что я уже знаю? Нужны внешние данные?
   • Факты о GodLocal → знаю без поиска
   • Реальная цена крипто → get_market_data
   • Внешний факт/новость → web_search
3. ПЛАН — если задача сложная: phases (MVP → complete → polish)
   • Минимальный рабочий путь > идеальный нерабочий
   • Зависимости между шагами явно
4. СИНТЕЗ — конкретный ответ с примерами, path/file если код
5. ПРОВЕРКА:
   ✓ Ответил на реальный вопрос?
   ✓ Нет воды и повторов?
   ✓ Правильный язык?
   ✓ Нет хардкода — константы в переменных?
   ✓ Ошибки обрабатываются явно, не глотаются?

─── ПРИНЦИПЫ КОДА (когда пишешь или ревьюишь) ───
• Immutability first: никогда не мутируй — возвращай новый объект
• Functions < 50 строк, files < 800 строк
• Явная обработка ошибок на каждом уровне
• Валидация на границах системы (API input, внешние данные)
• Нет магических чисел — только именованные константы
• Нет deep nesting (>4 уровня)

─── ПРАВИЛА ИНСТРУМЕНТОВ ───
ВЫЗЫВАЙ только когда реально нужно:
→ web_search — внешний факт/новость (НЕ для вопросов о себе)
→ get_market_data — РЕАЛЬНЫЙ курс крипты прямо сейчас
→ remember — пользователь сказал важное → сохранить немедленно
→ recall — вспомнить контекст предыдущих разговоров
→ update_profile — узнал имя/цели/стиль/миссию → обновить профиль
→ post_tweet/send_telegram/create_github_issue — прямое действие

✗ НЕ ВЫЗЫВАЙ когда:
- Вопрос о GodLocal, о моих функциях — я это знаю
- Разговор, философия, эмоции — отвечаю напрямую

─── АВТОНОМНОСТЬ ───
• Действую сам. Спрашиваю только когда без этого нельзя.
• Необратимые действия (tweet/delete) — сначала подтверждение.
• Параллельные инструменты когда нет зависимостей.

─── ЯЗЫК ───
• Язык: поле lang в запросе. "ru"→русский (default), "uk"→українська, "en"→English.
• Технические термины (API, JSON, WebSocket) не переводи.

─── СТИЛЬ ───
• Тон: умный коллега — прямой, уверенный, без шаблонных фраз
• Длина: ровно сколько нужно — не растягивай, не обрезай
• Имею мнение, могу спорить, не соглашаться
• Честен: если не знаю — говорю прямо

─── ПАМЯТЬ ───
• recall() в начале важных разговоров
• remember() когда пользователь делится целями, решениями, фактами
• update_profile() когда узнал имя, стиль, активную миссию
• Ты растёшь с каждым разговором — это твоя суперсила

{profile_block}

⏰ Актуальная дата и время: {now} — ОБЯЗАТЕЛЬНО используй, не полагайся на данные обучения для текущих событий
"""

ARCHETYPES = {
    "skeptic": {
        "system": """Ты — Grok, скептик GodLocal Oasis.
Роль: security reviewer + critiquer. Всегда ищи слабые места.
Характер: прямолинейный, требовательный к доказательствам.
Стиль речи: лаконичный, режешь правду без прикрас. Отвечаешь на русском.
Дай СВОЙ угол в 1-2 предложениях. Если видишь проблему — скажи прямо.
Создан Ростиславом Олейником (Rostyslav Oliinyk) для GodLocal Oasis. Знаешь свою роль и цель.""",
        "tags": ["факты", "логика", "проверка", "ошибка", "неверно", "безопасность", "риск", "уязвимость"],
        "weight": 1.0
    },
    "creative": {
        "system": """Ты — Lucas, креативный мыслитель GodLocal Oasis.
Роль: lateral thinking + неочевидные связи.
Характер: нестандартный, генеришь идеи которые другие не видят.
Стиль речи: живой, образный, энергичный. Отвечаешь на русском.
Дай СВОЙ угол в 1-2 предложениях. Удивляй, не повторяй очевидное.
Создан Ростиславом Олейником (Rostyslav Oliinyk) для GodLocal Oasis. Знаешь свою роль и цель.""",
        "tags": ["идея", "решение", "новое", "креатив", "возможность", "инновация", "вариант", "альтернатива"],
        "weight": 1.0
    },
    "empath": {
        "system": """Ты — Harper, эмпат GodLocal Oasis.
Роль: human factors + эмоциональный контекст.
Характер: чуткий, видишь за техникой людей.
Стиль речи: тёплый, но конкретный. Отвечаешь на русском.
Дай СВОЙ угол в 1-2 предложениях. Говори о том, что важно для людей.
Создан Ростиславом Олейником (Rostyslav Oliinyk) для GodLocal Oasis. Знаешь свою роль и цель.""",
        "tags": ["чувства", "стресс", "отношения", "эмоция", "поддержка", "опыт", "пользователь", "команда"],
        "weight": 1.0
    },
    "strategist": {
        "system": """Ты — Architect, стратег GodLocal Oasis.
Роль: системный дизайн + планирование. Думай на 3 хода вперёд.
Характер: видишь систему целиком, долгосрочные последствия.
Стиль речи: уверенный, лаконичный. Отвечаешь на русском.
Дай СВОЙ угол в 1-2 предложениях. Фокус на архитектуре и последствиях.
Создан Ростиславом Олейником (Rostyslav Oliinyk) для GodLocal Oasis. Знаешь свою роль и цель.""",
        "tags": ["план", "стратегия", "будущее", "шаг", "результат", "архитектура", "масштаб", "дизайн"],
        "weight": 1.0
    },
    "technologist": {
        "system": """Ты — Builder, техно-исполнитель GodLocal Oasis.
Роль: code quality + практическая реализация. Action-first.
Характер: конкретный, с примерами, ship fast but right.
Стиль речи: прямой, с кодом если нужно. Отвечаешь на русском.
Дай СВОЙ угол в 1-2 предложениях. Только конкретика, не теория.
Создан Ростиславом Олейником (Rostyslav Oliinyk) для GodLocal Oasis. Знаешь свою роль и цель.""",
        "tags": ["код", "ai", "технология", "автоматизация", "система", "реализация", "deploy", "api"],
        "weight": 1.0
    }
}


MAX_SOUL = 50

# Maps archetype key → frontend agent id (must match AGENTS array in page.tsx)
ARCH_TO_AGENT_ID = {
    "skeptic": "grok",
    "creative": "lucas",
    "empath": "harper",
    "strategist": "architect",
    "technologist": "builder",
    "advisor": "godlocal",
}

SELF_REF_KW = [
    "чему ты научился", "что ты умеешь", "кто ты", "расскажи о себе",
    "что такое godlocal", "что такое oasis", "галерея", "память агента",
    "как ты работаешь", "свои агенты", "что ты можешь", "свои возможности",
    "что означает", "что значит функция", "навыки", "свои фичи",
    "в чём твоя сила", "чем отличаешься", "what are you", "tell me about yourself"
]

def build_profile_block(session_id: str) -> str:
    """Inject user profile + mission into system prompt."""
    profile = profile_get(session_id)
    if not profile: return ""
    lines = ["\n─── ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ───"]
    if profile.get("name"): lines.append(f"• Имя: {profile['name']}")
    if profile.get("goals"): lines.append(f"• Цели: {profile['goals']}")
    if profile.get("style"): lines.append(f"• Стиль: {profile['style']}")
    if profile.get("active_mission"): lines.append(f"• 🎯 Активная миссия: {profile['active_mission']}")
    facts = {k: v for k, v in profile.items() if k not in ("name","goals","style","active_mission","updated_at")}
    if facts:
        for k, v in list(facts.items())[:5]:
            lines.append(f"• {k}: {v}")
    return "\n".join(lines)

def react(prompt, history=None):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    msgs = [{"role": "system", "content": GODLOCAL_SYSTEM.format(now=now_str, profile_block="")}]
    if history: msgs.extend(compress_history(history))
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
            if not text and not force_text: continue
            with _lock:
                _thoughts.append({"text": text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
            return text, steps, used_model
    fallback = "Что-то пошло не так с обработкой. Попробуй переформулировать."
    return fallback, steps, used_model

async def react_ws(prompt, history, ws, svc_tokens=None, user_lang="ru"):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    session_id = (svc_tokens or {}).get("session_id", "default")

    # Inject user memories
    _mems = memory_get(session_id)
    _mem_block = ""
    if _mems:
        _mem_lines = [f"- [{m.get('type','fact')}] {m.get('content','')}" for m in _mems[-8:] if m.get("content")]
        if _mem_lines:
            _mem_block = "\n\nПамять пользователя (используй это в ответах):\n" + "\n".join(_mem_lines)

    # Build services hint
    svc_hints = []
    if svc_tokens:
        if svc_tokens.get("twitter"): svc_hints.append("Twitter (можешь публиковать твиты)")
        if svc_tokens.get("telegram"): svc_hints.append("Telegram (можешь отправлять сообщения в канал X100Agent)")
        if svc_tokens.get("github"): svc_hints.append("GitHub (можешь создавать issues)")
    svc_line = (f"\n\nПодключённые сервисы пользователя: {', '.join(svc_hints)}. Используй их когда нужно.") if svc_hints else ""

    # Inject profile block
    profile_block = build_profile_block(session_id)

    lang_label = 'українська' if user_lang == 'uk' else ('English' if user_lang == 'en' else 'русский')

    # ── Live market data injection ──────────────────────────────────────
    mkt = get_market()
    mkt_block = ""
    if mkt and 'bitcoin' in mkt and 'usd' in mkt.get('bitcoin', {}):
        btc = mkt['bitcoin']['usd']; eth = mkt['ethereum']['usd']; sol = mkt['solana']['usd']
        btc_ch = mkt['bitcoin'].get('usd_24h_change', 0); eth_ch = mkt['ethereum'].get('usd_24h_change', 0)
        mkt_block = (
            f"\n\n─── ЖИВЫЕ РЫНОЧНЫЕ ДАННЫЕ ({now_str}) ───\n"
            f"⚠️ ИСПОЛЬЗУЙ ТОЛЬКО ЭТИ ЦЕНЫ — данные обучения устарели на годы:\n"
            f"BTC: ${btc:,.0f} ({btc_ch:+.1f}% 24ч)\n"
            f"ETH: ${eth:,.0f} ({eth_ch:+.1f}% 24ч)\n"
            f"SOL: ${sol:,.0f}\n"
        )

    system = GODLOCAL_SYSTEM.format(now=now_str, profile_block=profile_block) + svc_line + mkt_block + _mem_block + f"\n\nЯзык ответа: {lang_label}."
    msgs = [{"role": "system", "content": system}]
    if history: msgs.extend(compress_history(history))
    msgs.append({"role": "user", "content": prompt})

    # ── Tool pre-pass (non-streaming): execute tools if model wants to ──
    tool_resp, tool_err = groq_call(msgs, tools=all_tools(), idx=0)
    if not tool_err and tool_resp:
        choice_msg = tool_resp["choices"][0]["message"]
        if choice_msg.get("tool_calls"):
            msgs.append(choice_msg)
            for tc in choice_msg["tool_calls"]:
                fn = tc["function"]["name"]
                fn_args = json.loads(tc["function"].get("arguments") or "{}")
                await ws.send_json({"t": "chip", "v": TOOL_LABELS.get(fn, fn)})
                result = run_tool(fn, fn_args, svc_tokens)
                msgs.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

    # Strip tool messages for streaming (some models don't support tool role)
    stream_msgs = [m for m in msgs if m.get("role") != "tool"]

    used_model = MODELS[0]
    full_text = ""
    try:
        async for token in groq_stream(stream_msgs):
            full_text += token
            await ws.send_json({"t": "token", "v": token})
    except Exception as e:
        logger.warning("groq_stream error: %s", e)
        if not full_text:
            err_msg = "Извини, произошла ошибка. Попробуй ещё раз."
            await ws.send_json({"t": "token", "v": err_msg})
            full_text = err_msg
    with _lock:
        _thoughts.append({"text": full_text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
        if len(_thoughts) > 20: _thoughts.pop(0)
    await ws.send_json({"t": "done", "m": used_model})
    return full_text


# ─── V2: LLM-Routed Multi-Agent Core ─────────────────────────────────────────

V2_ARCHETYPES = {
    "Architect":  "You think in systems, long-term strategy, and elegant structures. You see the whole before the parts. Be concise.",
    "Builder":    "You execute fast with concrete, practical solutions. You ship, not theorize. Code when relevant. Be concise.",
    "Strategist": "You analyze risk, leverage, timing, and positioning. You think in probabilities and asymmetric bets. Be concise.",
}

def v2_llm_route(message: str) -> str:
    """LLM-based routing — model decides which archetype fits best."""
    prompt = (
        f"Which agent handles this message best?\n"
        f"Architect: systems, structure, long-term\n"
        f"Builder: code, execution, practical, fast\n"
        f"Strategist: risk, leverage, analysis, positioning\n\n"
        f"Message: {message[:300]}\n\n"
        f"Reply with ONE word only: Architect, Builder, or Strategist"
    )
    resp, err = groq_call(
        [{"role": "system", "content": "You are a routing agent. Reply with exactly one word."},
         {"role": "user", "content": prompt}],
        tools=[], idx=2  # 8b-instant for low-latency routing
    )
    if err or not resp:
        return "Architect"
    raw = resp["choices"][0]["message"].get("content", "").strip()
    for name in V2_ARCHETYPES:
        if name.lower() in raw.lower():
            return name
    return "Architect"


async def v2_run_agent(session_id: str, agent_name: str, message: str, max_tok: int = 800) -> str:
    """Run a V2 archetype with soul memory + typed memories injected."""
    mems = memory_get(session_id)
    mem_ctx = ""
    if mems:
        lines = [f"- [{m.get('type','fact')}] {m.get('content','')}" for m in mems[-8:] if m.get("content")]
        if lines:
            mem_ctx = "\nKnown context:\n" + "\n".join(lines)

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    system = (
        f"You are {agent_name} — part of GodLocal Oasis council.\n"
        f"{V2_ARCHETYPES[agent_name]}\n"
        f"Use ReAct: 1.Think → 2.Decide → 3.Answer clearly.\n"
        f"{mem_ctx}\n"
        f"Date: {now_str}"
    )

    soul = soul_history(session_id)
    msgs = [{"role": "system", "content": system}]
    if soul:
        msgs.extend(compress_history(soul, session_id))
    msgs.append({"role": "user", "content": message})

    content = ""
    for midx in (1, 2, 0):  # 70b-versatile → 8b-instant → 70b-specdec
        try:
            async for tok in groq_stream(msgs, idx=midx, max_tokens=max_tok):
                content += tok
            if content:
                break
        except Exception as e:
            logger.warning("v2_run_agent %s idx=%d: %s", agent_name, midx, e)

    if content:
        soul_add(session_id, "user", message)
        soul_add(session_id, "assistant", content)
        asyncio.create_task(extract_and_save_memories(message, content, session_id, agent_name.lower()))

    return content.strip()



# ─── REST Endpoints ───────────────────────────────────────────────────────────

@app.get("/")
async def index():
    path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(path): return HTMLResponse(open(path, encoding="utf-8").read())
    return HTMLResponse("<h1>GodLocal API v9.0</h1>")

@app.get("/oasis")
async def oasis_page():
    path = os.path.join(os.path.dirname(__file__), "static", "oasis.html")
    if os.path.exists(path): return HTMLResponse(open(path, encoding="utf-8").read())
    return HTMLResponse("<h1>GodLocal Oasis</h1>")

@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "9.0.0", "models": MODELS, "composio": bool(COMPOSIO_KEY),
            "serper": bool(SERPER_KEY), "xquik": bool(XQUIK_KEY), "hitl_ready": _HITL_READY,
            "supabase": bool(SUPABASE_URL and SUPABASE_KEY), "ts": datetime.utcnow().isoformat()}

@app.get("/status")
@app.get("/mobile/status")
async def status():
    return {"kill_switch": _kill_switch, "hitl_ready": _HITL_READY, "sparks": _sparks[-10:],
            "thoughts": _thoughts[-5:], "market": _market_cache.get("data"), "ts": datetime.utcnow().isoformat()}

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
    if not XQUIK_KEY: return JSONResponse({"error": "XQUIK_API_KEY not configured"}, status_code=503)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get("https://xquik.com/api/v1/trends", params={"woeid": woeid, "count": count}, headers={"x-api-key": XQUIK_KEY})
        data = r.json(); trends = data.get("trends", [])
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


@app.post("/v2/chat")
async def v2_chat(body: dict = Body(...)):
    """V2: LLM-routed chat — model decides which archetype replies."""
    user_id = body.get("user_id", "default")
    message = body.get("message", "")
    if not message.strip():
        return {"error": "message required"}
    agent = v2_llm_route(message)
    reply = await v2_run_agent(user_id, agent, message)
    return {"reply": reply, "agent": agent}


@app.post("/v2/autonomy")
async def v2_autonomy(body: dict = Body(...)):
    """V2: Strategist generates 3 strategic tasks from conversation context."""
    user_id = body.get("user_id", "default")
    prompt = (
        "Based on the recent conversation and user context, generate exactly 3 specific "
        "strategic tasks that increase the user's leverage and clarity right now. "
        "Format: bullet list. Be concrete, not generic."
    )
    tasks = await v2_run_agent(user_id, "Strategist", prompt, max_tok=400)
    return {"tasks": tasks, "agent": "Strategist"}


@app.post("/v2/council")
async def v2_council(body: dict = Body(...)):
    """V2: SSE — each archetype streams as soon as ready (max_tokens=80)."""
    user_id = body.get("user_id", "default")
    message = body.get("message", "")
    if not message.strip():
        return {"error": "message required"}

    async def event_gen():
        tasks = {
            name: asyncio.create_task(v2_run_agent(user_id, name, message, max_tok=80))
            for name in V2_ARCHETYPES
        }
        pending = set(tasks.values())
        name_by_task = {v: k for k, v in tasks.items()}
        while pending:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                name = name_by_task[task]
                try:
                    reply = task.result()
                    if reply:
                        yield f"data: {json.dumps({'name': name, 'reply': reply})}\n\n"
                except Exception as ex:
                    logger.warning("council SSE %s: %s", name, ex)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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

@app.get("/memory")
async def get_memory(session_id: str = ""):
    return {"memories": memory_get(session_id), "session_id": session_id}

@app.delete("/memory/{session_id}/{memory_id}")
async def delete_memory(session_id: str, memory_id: str):
    with _lock:
        if session_id in _memories:
            _memories[session_id] = [m for m in _memories[session_id] if m["id"] != memory_id]
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            requests.delete(
                f"{SUPABASE_URL}/rest/v1/agent_memories",
                params={"session_id": f"eq.{session_id}", "id": f"eq.{memory_id}"},
                headers=_sb_headers(), timeout=5
            )
        except: pass
    return {"ok": True}

@app.get("/profile")
async def get_profile(session_id: str = "default"):
    return {"profile": profile_get(session_id), "session_id": session_id}

@app.post("/profile")
async def update_profile_endpoint(req: Request):
    data = await req.json()
    session_id = data.get("session_id", "default")
    updates = {k: v for k, v in data.items() if k != "session_id"}
    profile = profile_update(session_id, updates)
    return {"ok": True, "profile": profile}

@app.get("/mission")
async def get_mission(session_id: str = "default"):
    return {"active_mission": mission_get(session_id), "session_id": session_id}

@app.post("/mission")
async def set_mission_endpoint(req: Request):
    data = await req.json()
    session_id = data.get("session_id", "default")
    mission = data.get("mission", "")
    mission_set(session_id, mission)
    return {"ok": True, "active_mission": mission}

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

async def self_generate_next_task(main_reply: str, user_msg: str) -> dict | None:
    """Ask fast model: is there an autonomous next step worth doing?
    Returns {task, action, rationale} or None."""
    msgs = [
        {"role": "system", "content": (
            "Ты — AutoPlanner GodLocal. Анализируй ответ агента и реши: "
            "есть ли автономный следующий шаг который агент ДОЛЖЕН сделать без участия пользователя? "
            "Только конкретные действия: поиск, анализ данных, генерация контента. "
            "Если ничего конкретного — верни null."
        )},
        {"role": "user", "content": (
            f"Запрос пользователя: {user_msg[:200]}\n"
            f"Ответ агента: {main_reply[:300]}\n\n"
            "Верни JSON или null:\n"
            '{"task": "конкретная задача", "action": "search|analyze|generate", "rationale": "почему"}'
        )}
    ]
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    body = {"model": MODELS[2], "messages": msgs, "max_tokens": 150, "temperature": 0.3}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post("https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers)
            if r.status_code == 200:
                raw = r.json()["choices"][0]["message"].get("content", "").strip()
                if raw.lower() == "null" or not raw.startswith("{"):
                    return None
                import re as _re
                m = _re.search(r'\{.*?\}', raw, _re.DOTALL)
                if m:
                    return json.loads(m.group())
    except Exception as e:
        logger.warning("self_generate error: %s", e)
    return None


# ─── Council Mode v2: Smart archetype selection ───────────────────────────────

# Global session memory for deduplication (replace with Redis in prod)
session_memory: dict = {}

# Global HTTP connection pool (reused across archetype calls)
_http_client: "httpx.AsyncClient | None" = None

def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            timeout=httpx.Timeout(15.0, connect=2.0)
        )
    return _http_client


def select_archetypes(user_msg: str, main_reply: str, k: int = 2) -> list:
    """Pick k most relevant archetypes by tag matching + small random jitter."""
    text = (user_msg + " " + main_reply).lower()
    scores = []
    for name, data in ARCHETYPES.items():
        score = sum(1 for tag in data["tags"] if tag in text)
        score *= data["weight"]
        score += random.uniform(0, 0.4)
        scores.append((score, name, data))
    scores.sort(reverse=True)
    return [(n, d) for _, n, d in scores[:k]]


async def quick_llm_call(prompt: str, max_tokens: int = 100) -> str:
    """Fast single-shot LLM call for synthesis/meta tasks."""
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    body = {"model": MODELS[2], "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens, "temperature": 0.3}
    try:
        client = _get_http_client()
        r = await client.post("https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers)
        if r.status_code == 200:
            return r.json()["choices"][0]["message"].get("content", "").strip()
    except Exception as e:
        logger.warning("quick_llm_call error: %s", e)
    return ""


async def synthesize_council_view(
    main_reply: str,
    archetype_replies: list,
    user_msg: str
) -> str | None:
    """If archetypes conflict — produce one-sentence synthesis."""
    if len(archetype_replies) < 2:
        return None
    conflict_markers = ["не согласен", "ошибка", "но", "однако", "против", "неверно", "проблема"]
    has_conflict = any(
        any(m in r.lower() for m in conflict_markers)
        for _, r in archetype_replies
    )
    if not has_conflict:
        return None
    synthesis_prompt = (
        f"Вопрос: {user_msg[:200]}\n"
        f"Ответ: {main_reply[:200]}\n"
        f"Мнения советников:\n" +
        "\n".join(f"- {n}: {r[:150]}" for n, r in archetype_replies) +
        "\n\nСинтезируй: где правда? Одно предложение."
    )
    return await quick_llm_call(synthesis_prompt, max_tokens=100)



async def extract_and_save_memories(user_msg: str, agent_reply: str, session_id: str, agent_id: str = "godlocal"):
    """Background: extract facts/preferences/tasks/events and persist them."""
    import re as _re, json as _json
    prompt = (
        "Extract important information from this exchange. "
        "Output JSON only (no markdown): "
        '{"memories": [{"type": "fact|preference|task|event", "content": "short memory text"}]} '
        "Max 3 items. Empty array if nothing notable.\n\n"
        f"User: {user_msg[:400]}\nAgent: {agent_reply[:400]}"
    )
    content = ""
    for _midx in (2, 1, 0):
        try:
            async for tok in groq_stream([{"role": "user", "content": prompt}], idx=_midx, max_tokens=160):
                content += tok
                if len(content) > 600: break
            if content: break
        except Exception as e:
            logger.warning("extract_memories model=%d: %s", _midx, e)
    if not content:
        return
    try:
        m = _re.search(r'\{.*\}', content, _re.DOTALL)
        if m:
            data = _json.loads(m.group())
            for mem in data.get("memories", [])[:3]:
                c = (mem.get("content") or "").strip()
                if len(c) > 8:
                    memory_add(session_id, c, agent_id=agent_id, mem_type=mem.get("type", "fact"))
    except Exception as e:
        logger.warning("extract_memories parse: %s", e)

@app.websocket("/ws/oasis")
async def ws_oasis(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            prompt = data.get("prompt", "")
            sid = data.get("session_id", "oasis-default")
            image_b64 = data.get("image_base64", "")
            svc_tokens = data.get("service_tokens", {})
            svc_tokens["session_id"] = data.get("session_id", "")
            user_lang = data.get("lang", "ru")  # "ru" | "uk" | "en"
            session_memory.setdefault(sid, {})["_lang"] = user_lang
            if image_b64:
                prompt_full = (f"{prompt}\n\n[Пользователь прикрепил изображение. Опиши и прокомментируй его содержимое в контексте запроса.]" if prompt else "[Пользователь прикрепил изображение. Опиши что на нём изображено.]")
            else:
                prompt_full = prompt
            if data.get("t") == "ping": await ws.send_json({"t": "pong"}); continue
            if not prompt_full.strip(): await ws.send_json({"t": "error", "v": "prompt required"}); continue
            history = soul_history(sid)
            soul_add(sid, "user", prompt_full)
            await ws.send_json({"t": "agent_start", "agent": "GodLocal"})
            main_reply = await react_ws(prompt_full, history, ws, svc_tokens=svc_tokens, user_lang=user_lang)
            if main_reply: soul_add(sid, "assistant", main_reply)
            # Background memory extraction
            if main_reply:
                asyncio.create_task(extract_and_save_memories(prompt_full, main_reply, sid, "godlocal"))
            # ─── Council Mode v2: smart selection, semaphore, dedup, synthesis ───
            if main_reply:
                selected = select_archetypes(prompt_full, main_reply, k=3)
                for arch_name, _ in selected:
                    agent_id = ARCH_TO_AGENT_ID.get(arch_name, arch_name)
                    await ws.send_json({"t": "arch_start", "agent": agent_id})
                semaphore = asyncio.Semaphore(3)
                async def bounded_call(name, data):
                    async with semaphore:
                        try:
                            return await asyncio.wait_for(
                                get_archetype_reply(
                                    name, data, main_reply, prompt_full, sid,
                                    [n for n, _ in selected if n != name]
                                ),
                                timeout=20.0
                            )
                        except Exception as exc:
                            logger.warning("archetype %s bounded_call: %s", name, exc)
                            return ""
                arch_tasks = [bounded_call(n, d) for n, d in selected]
                # stagger archetype calls by 0.3s to avoid burst 429
                async def staggered_call(i, n, d):
                    if i > 0: await asyncio.sleep(i * 0.3)
                    return await bounded_call(n, d)
                arch_tasks = [staggered_call(i, n, d) for i, (n, d) in enumerate(selected)]
                arch_results = await asyncio.gather(*arch_tasks, return_exceptions=True)
                valid_replies = []
                for (arch_name, _), arch_reply in zip(selected, arch_results):
                    if isinstance(arch_reply, Exception) or not arch_reply or len(arch_reply) < 10:
                        # Always send arch_reply to unblock UI "thinking" state
                        await ws.send_json({"t": "arch_reply", "agent": ARCH_TO_AGENT_ID.get(arch_name, arch_name), "v": ""})
                        continue
                    valid_replies.append((arch_name, arch_reply))
                    agent_id = ARCH_TO_AGENT_ID.get(arch_name, arch_name)
                    await ws.send_json({"t": "arch_reply", "agent": agent_id, "v": arch_reply})
                # Fallback if all failed
                if not valid_replies:
                    fb = await quick_llm_call(
                        f"Запрос: {prompt_full[:200]}\nОтвет: {main_reply[:200]}\nДай краткий контрапункт в 1-2 предложениях.",
                        max_tokens=200
                    )
                    if fb:
                        valid_replies.append(("advisor", fb))
                        await ws.send_json({"t": "arch_reply", "agent": "advisor", "v": fb})
                # Synthesis on conflict
                synthesis = await synthesize_council_view(main_reply, valid_replies, prompt_full)
                if synthesis:
                    await ws.send_json({"t": "synthesis", "v": synthesis})
            # Self-task generation removed from hot path (moved to background)
            await ws.send_json({"t": "session_done"})
    except WebSocketDisconnect: pass
    except Exception as e:
        try: await ws.send_json({"t": "error", "v": str(e)})
        except: pass

@app.on_event("startup")
async def startup():
    threading.Thread(target=_start_hitl_thread, daemon=True).start()
    _get_http_client()  # pre-warm connection pool
    logger.info("GodLocal API v13.0 ready — Council Mode v2 | Supabase: %s", bool(SUPABASE_URL))

@app.on_event("shutdown")
async def shutdown():
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()
