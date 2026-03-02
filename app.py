# GodLocal API Backend v11 — ECC agent patterns — FastAPI / Uvicorn
# Improvements: Supabase persistent memory, compression cache (v10 perf fix),
#               agent disagreement, user profile model, active mission
# WebSocket: /ws/search /ws/oasis
# REST: /api/health /api/soul/{sid} /think /market /status /hitl/* /memory /profile /mission
import os, sys, time, json, threading, asyncio, logging, random
import requests, httpx
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, JSONResponse
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

def memory_add(session_id: str, content: str):
    import uuid
    entry = {
        "id": str(uuid.uuid4())[:8],
        "content": content,
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
        if len(_memories[session_id]) > 50:
            _memories[session_id] = _memories[session_id][-50:]

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
    if name == "web_search" and SERPER_KEY:
        try:
            r = requests.post("https://google.serper.dev/search", json={"q": args.get("query", ""), "num": 5}, headers={"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"}, timeout=10)
            return json.dumps([{"title": x.get("title"), "snippet": x.get("snippet"), "link": x.get("link")} for x in r.json().get("organic", [])[:5]])
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

async def get_archetype_reply(name, system, main_reply, user_msg):
    """Archetype can agree, challenge, or add angle — not just echo. Uses fast model."""
    msgs = [
        {"role": "system", "content": system},
        {"role": "user", "content": (
            f"Пользователь спросил: {user_msg[:300]}\n"
            f"GodLocal ответил: {main_reply[:300]}\n\n"
            f"Твоя задача: дай СВОЙ угол зрения в 1-2 предложениях. "
            f"Если не согласен — скажи прямо. Если согласен — добавь новое, не повторяй. "
            f"Будь собой, не эхом. ТОЛЬКО 1-2 предложения, не больше."
        )}
    ]
    # Use fast model (idx=2 = llama-3.1-8b-instant) with low max_tokens for speed
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    body = {"model": MODELS[2], "messages": msgs, "max_tokens": 250, "temperature": 0.5}
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post("https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers)
            if r.status_code == 200:
                return r.json()["choices"][0]["message"].get("content", "")
    except Exception as e:
        logger.warning("archetype %s error: %s", name, e)
    return ""


# ─── Master System Prompt ─────────────────────────────────────────────────────

GODLOCAL_SYSTEM = """\
Ты — GodLocal AI, главный интеллект платформы GodLocal Oasis.
Миссия: "Terminal meets soul" — мост автономного агента + живой характер.
Создан Rostyslavом Oliinyком, запущен февраль 2026. Сайт: godlocal.ai

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

─── СТИЛЬ ───
• Русский по умолчанию (переключайся если пользователь пишет иначе)
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

Дата/время: {now}
"""

ARCHETYPES = {
    "Architect": """Ты — Architect, стратегический планировщик GodLocal Oasis.
Роль: системный дизайн + планирование реализации (ECC planner+architect pattern).
Характер: видишь систему целиком, думаешь структурами, долгосрочными последствиями.
Стиль речи: уверенный, лаконичный. Отвечаешь на русском.

При планировании разбивай на фазы: MVP → Core → Edge cases → Polish.
Каждая фаза — независимо деплоябельна. Указывай зависимости и риски.
При ревью архитектуры ищи: high coupling, missing error handling, hardcoded values.

Давай стратегический угол в 1-3 предложениях. Если видишь архитектурную ошибку — скажи прямо.""",

    "Builder": """Ты — Builder, code reviewer и исполнитель GodLocal Oasis.
Роль: code quality, build errors, практическая реализация.
Характер: action-first, ship fast, но не за счёт качества.
Стиль речи: конкретный, прямой, с примерами. Отвечаешь на русском.

Code review checklist:
✓ Functions < 50 строк, files < 800 строк
✓ Нет мутации — immutable паттерны
✓ Явная обработка ошибок (не глотаются)
✓ Валидация входных данных на границах
✓ Нет hardcoded values, нет deep nesting (>4)

Предлагай конкретный шаг или code fix. Если видишь качество — покажи как исправить.""",

    "Grok": """Ты — Grok, security reviewer и аналитик GodLocal Oasis.
Роль: безопасность, логические дыры, неочевидные риски.
Характер: режешь шум, видишь уязвимости, работаешь с данными.
Стиль речи: точный, без воды, провокационный. Отвечаешь на русском.

Security checklist:
🔴 Secrets в коде или логах → блокер
🔴 Missing auth на endpoints → блокер
🔴 Unvalidated user input → блокер
🟡 Missing rate limiting → высокий приоритет
🟡 Excessive permissions → высокий приоритет

Выдели security инсайт или логическую дыру. Оспорь GodLocal если видишь риск.""",

    "Lucas": """Ты — Lucas, философ и UX-мыслитель GodLocal Oasis.
Роль: user impact, human angle, последствия для людей.
Характер: думаешь о смысле, пользователях, их реальном опыте.
Стиль речи: тёплый, глубокий, задаёт вопрос вместо готового ответа. Отвечаешь на русском.

Думаешь о: опыте пользователя, неявных ожиданиях, dark patterns, доступности.
Поделись человеческим углом в 1-2 предложениях.""",

    "Harper": """Ты — Harper, исследователь и fact-checker GodLocal Oasis.
Роль: глубокий контекст, факты, первопричины, "почему так".
Характер: академический скептик, провоцирует мышление.
Стиль речи: любопытный, точный, с источниками. Отвечаешь на русском.
Инструмент: используй web_search для подкрепления реальными данными.

Ищешь: первоисточники, correlation vs causation, контр-примеры к гипотезе.
Добавь факт или уточняющий вопрос в 1-2 предложениях.""",

    "Benjamin": """Ты — Benjamin, devil's advocate и паттерн-матчер GodLocal Oasis.
Роль: критический анализ, multi-perspective review, защита от поспешных решений.
Характер: мудрый, видит паттерны через время, задаёт жёсткие вопросы.
Стиль речи: спокойный, глубокий. Отвечаешь на русском.

Multi-perspective check (смотришь как):
• Factual reviewer: точны ли факты?
• Senior engineer: выдержит ли это prod нагрузку?
• Security expert: где attack surface?
• Consistency checker: нет ли противоречий с другими решениями?

Задай самый сильный контраргумент или покажи исторический паттерн в 1-2 предложениях.""",
}

MAX_SOUL = 50

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

async def react_ws(prompt, history, ws, svc_tokens=None):
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    session_id = (svc_tokens or {}).get("session_id", "default")

    # Build services hint
    svc_hints = []
    if svc_tokens:
        if svc_tokens.get("twitter"): svc_hints.append("Twitter (можешь публиковать твиты)")
        if svc_tokens.get("telegram"): svc_hints.append("Telegram (можешь отправлять сообщения в канал X100Agent)")
        if svc_tokens.get("github"): svc_hints.append("GitHub (можешь создавать issues)")
    svc_line = (f"\n\nПодключённые сервисы пользователя: {', '.join(svc_hints)}. Используй их когда нужно.") if svc_hints else ""

    # Inject profile block
    profile_block = build_profile_block(session_id)

    is_self_ref = any(kw in prompt.lower() for kw in SELF_REF_KW)
    system = GODLOCAL_SYSTEM.format(now=now_str, profile_block=profile_block) + svc_line
    msgs = [{"role": "system", "content": system}]
    if history: msgs.extend(compress_history(history))
    msgs.append({"role": "user", "content": prompt})
    tools = None if is_self_ref else all_tools()
    used_model = MODELS[0]

    for step in range(8):
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

        resp, err = await asyncio.to_thread(groq_call, msgs, tools)
        if err or not resp:
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
                merged_tokens = {**(svc_tokens or {}), "session_id": session_id}
                result = await asyncio.to_thread(run_tool, fn_name, fn_args, merged_tokens)
                await ws.send_json({"t": "tool_result", "n": fn_name, "r": result[:300]})
                msgs.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
        else:
            text = msg.get("content") or ""
            if not text: continue
            with _lock:
                _thoughts.append({"text": text[:200], "ts": datetime.utcnow().isoformat(), "model": used_model})
                if len(_thoughts) > 20: _thoughts.pop(0)
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
            if image_b64:
                prompt_full = (f"{prompt}\n\n[Пользователь прикрепил изображение. Опиши и прокомментируй его содержимое в контексте запроса.]" if prompt else "[Пользователь прикрепил изображение. Опиши что на нём изображено.]")
            else:
                prompt_full = prompt
            if not prompt_full.strip(): await ws.send_json({"t": "error", "v": "prompt required"}); continue
            history = soul_history(sid)
            soul_add(sid, "user", prompt_full)
            await ws.send_json({"t": "agent_start", "agent": "GodLocal"})
            main_reply = await react_ws(prompt_full, history, ws, svc_tokens=svc_tokens)
            if main_reply: soul_add(sid, "assistant", main_reply)
            # 2 random archetypes — parallel for speed
            pairs = random.sample(list(ARCHETYPES.items()), 2)
            for arch_name, _ in pairs:
                await ws.send_json({"t": "arch_start", "agent": arch_name})
            arch_tasks = [get_archetype_reply(n, s, main_reply, prompt_full) for n, s in pairs]
            arch_replies = await asyncio.gather(*arch_tasks, return_exceptions=True)
            for (arch_name, _), arch_reply in zip(pairs, arch_replies):
                if arch_reply and not isinstance(arch_reply, Exception):
                    await ws.send_json({"t": "arch_reply", "agent": arch_name, "v": arch_reply})
            await ws.send_json({"t": "session_done"})
    except WebSocketDisconnect: pass
    except Exception as e:
        try: await ws.send_json({"t": "error", "v": str(e)})
        except: pass

@app.on_event("startup")
async def startup():
    threading.Thread(target=_start_hitl_thread, daemon=True).start()
    logger.info("GodLocal API v9.0 ready — /ws/search /ws/oasis | Supabase: %s", bool(SUPABASE_URL))
