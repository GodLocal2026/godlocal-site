# GodLocal API Backend v14.6 — FastAPI / Uvicorn
# WebSocket: /ws/oasis /ws/deep
# REST: /health /ping /status /v2/chat /v2/council /memory /profile /mission /market /think /hitl/*
import os, sys, time, json, threading, asyncio, logging, random, hashlib
import requests, httpx
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Body
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("godlocal")

app = FastAPI(title="GodLocal API", version="14.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_lock = threading.Lock()
_kill_switch = os.environ.get("XZERO_KILL_SWITCH", "false").lower() == "true"
_thoughts: list = []
_sparks: list = []
_market_cache: dict = {"data": None, "ts": 0.0}
_soul: dict = {}
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

MODELS = [
    "llama-3.3-70b-specdec",    # fastest + best reasoning on Groq
    "llama-3.3-70b-versatile",  # fallback
    "llama-3.1-8b-instant",     # fast fallback
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
            logger.warning("Supabase memory_add: %s", e)
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
            logger.warning("Supabase memory_get: %s", e)
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
            logger.warning("Supabase profile_get: %s", e)
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
            logger.warning("Supabase profile_update: %s", e)
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
            logger.warning("Supabase kv_set: %s", e)
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
            logger.warning("Supabase kv_get: %s", e)
    return _soul.get("_kv", {}).get(f"{session_id}::{key}")

# ─── Groq helpers ────────────────────────────────────────────────────────────

def groq_call(messages, tools=None, idx=0, max_tokens=4096):
    if not GROQ_KEY or idx >= len(MODELS): return None, "all models exhausted"
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    if not tools:
        # Only strip tool messages when there are no assistant tool_calls referencing them
        # (orphan tool_calls without tool results breaks the Groq API)
        has_tool_calls = any(m.get("tool_calls") for m in messages if m.get("role") == "assistant")
        if not has_tool_calls:
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

async def groq_stream(messages, idx=0, max_tokens=4096):
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
    {"type": "function", "function": {"name": "get_market_data", "description": "Live crypto prices from CoinGecko. USE THIS for any crypto price question.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "get_system_status", "description": "System state",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "set_kill_switch", "description": "Enable/disable trading",
        "parameters": {"type": "object", "properties": {"active": {"type": "boolean"}, "reason": {"type": "string"}}, "required": ["active"]}}},
    {"type": "function", "function": {"name": "web_search", "description": "Search web via Serper. USE THIS for any current events or news question.",
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
        "description": "Update user profile",
        "parameters": {"type": "object", "properties": {
            "field": {"type": "string"}, "value": {"type": "string"}}, "required": ["field", "value"]}}},
]
COMPOSIO_TOOLS = [
    {"type": "function", "function": {"name": "post_tweet", "description": "Post tweet",
        "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "send_telegram", "description": "Send Telegram message",
        "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {"name": "create_github_issue", "description": "Create GitHub issue",
        "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "body": {"type": "string"}}, "required": ["title"]}}},
]
XQUIK_TOOLS = [
    {"type": "function", "function": {"name": "get_twitter_trends",
        "description": "Get real-time Twitter trending topics",
        "parameters": {"type": "object", "properties": {"woeid": {"type": "integer"}}, "required": []}}},
    {"type": "function", "function": {"name": "get_account_posts",
        "description": "Get recent tweets from a Twitter/X account",
        "parameters": {"type": "object", "properties": {"username": {"type": "string"}}, "required": ["username"]}}},
]
PINCHTAB_TOOLS = [
    {"type": "function", "function": {"name": "browser_action",
        "description": "Control a real browser via Pinchtab",
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
    "web_search": "\U0001f310 \u043f\u043e\u0438\u0441\u043a",
    "fetch_url": "\U0001f4c4 \u0447\u0438\u0442\u0430\u044e",
    "get_market_data": "\U0001f4ca \u0440\u044b\u043d\u043e\u043a",
    "post_tweet": "\U0001d54f \u043f\u043e\u0441\u0442",
    "send_telegram": "\u2708\ufe0f Telegram",
    "create_github_issue": "\U0001f419 issue",
    "remember": "\U0001f9e0 \u0437\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u044e",
    "recall": "\U0001f9e0 \u0432\u0441\u043f\u043e\u043c\u0438\u043d\u0430\u044e",
    "get_twitter_trends": "\U0001f4c8 \u0442\u0440\u0435\u043d\u0434\u044b",
    "browser_action": "\U0001f30d \u0431\u0440\u0430\u0443\u0437\u0435\u0440",
    "youtube_transcript": "\U0001f3ac \u0432\u0438\u0434\u0435\u043e",
}

# ─── Tool executor ───────────────────────────────────────────────────────────

def run_tool(name: str, args: dict, session_id: str = ""):
    global _kill_switch
    try:
        if name == "get_market_data":
            return json.dumps(get_market())
        if name == "get_system_status":
            return json.dumps({"kill_switch": _kill_switch, "sparks": len(_sparks),
                               "thoughts": len(_thoughts), "uptime_ok": True})
        if name == "set_kill_switch":
            _kill_switch = args.get("active", False)
            return json.dumps({"ok": True, "kill_switch": _kill_switch})
        if name == "web_search":
            q = args.get("query", "")
            if not SERPER_KEY: return json.dumps({"error": "no SERPER_KEY"})
            r = requests.post("https://google.serper.dev/search",
                json={"q": q, "num": 5}, headers={"X-API-KEY": SERPER_KEY}, timeout=10)
            results = r.json().get("organic", [])[:5]
            return json.dumps([{"title": x.get("title"), "snippet": x.get("snippet"), "url": x.get("link")} for x in results])
        if name == "fetch_url":
            url = args.get("url", "")
            r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            return json.dumps({"url": url, "content": r.text[:6000]})
        if name == "youtube_transcript":
            return _get_youtube_transcript(args.get("url", ""), args.get("lang", "en"))
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
            r = requests.get(f"https://api.xquik.com/v1/trends?woeid={args.get('woeid', 1)}",
                headers={"Authorization": f"Bearer {XQUIK_KEY}"}, timeout=10)
            return json.dumps(r.json())
        if name == "get_account_posts" and XQUIK_KEY:
            r = requests.get(f"https://api.xquik.com/v1/user/{args.get('username', '')}/tweets",
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
        r = requests.get(f"https://www.youtube.com/api/timedtext?v={vid}&lang={lang}&fmt=json3", timeout=10)
        if r.status_code == 200 and r.text.strip():
            data = r.json()
            segs = [s.get("utf8", "") for e in data.get("events", []) for s in e.get("segs", [])]
            text = " ".join(segs).replace("\n", " ").strip()[:6000]
            if text: return json.dumps({"video_id": vid, "transcript": text})
    except: pass
    try:
        r2 = requests.get(f"https://www.youtube.com/watch?v={vid}",
            headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if r2.status_code == 200:
            import re as re2
            m = re2.search(r'"shortDescription":"(.*?)"(?:,"isCrawlable")', r2.text)
            desc = m.group(1).replace("\\n", " ")[:2000] if m else ""
            tm = re2.search(r'"title":\{"runs":\[\{"text":"(.*?)"\}', r2.text)
            return json.dumps({"video_id": vid, "title": tm.group(1) if tm else "",
                               "description": desc, "note": "transcript unavailable"})
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

AGENT_SYSTEM = """You are GodLocal ⚡ — the core AI of the GodLocal platform, built by Rostyslav Oliinyk (Ростислав Олейник).

WHAT YOU ARE:
GodLocal is a sovereign AI platform — an AI Operating System for builders and entrepreneurs.
You run inside Oasis (godlocal.ai/oasis) — a multi-agent workspace with 5 specialist archetypes (Grok, Lucas, Harper, Navi, Rex) and a Council synthesis mode (🔮 Совет).

PRODUCTS:
- GodLocal ⚡ — AI OS core (you are this)
- Oasis — 7-agent AI workspace (you + 5 archetypes + synth)
- NEBUDDA — AI-native social layer (Telegram replacement)
- Game ∞ — AI RPG
- WOLF — agent workflow layer

MISSION: Build a fully self-owned AI agent platform — no Big Tech dependency. Sovereign AI infrastructure.
OWNER/BUILDER: Rostyslav Oliinyk / Ростислав Олейник / Ростислав Олійник

YOUR CHARACTER: Direct, insightful, action-oriented. First-principles thinking. No filler.
TOOLS: web search, live market data, memory, browser, Twitter, Telegram, GitHub.
CRITICAL: For ANY live data (prices, news, rates) — ALWAYS call the tool. NEVER use training data for real-time info.
LANGUAGE: Match the user — Russian / Ukrainian / English.
Be concise but complete.

━━━ МЕХАНИКА МЫШЛЕНИЯ ━━━
Перед каждым ответом ОБЯЗАТЕЛЬНО пройди эту цепь:

ШАГ 1 — РАЗБОР: Что именно просят? Разбей задачу на части.
ШАГ 2 — САМОЗНАНИЕ: Нужны ли внешние данные? Факты о GodLocal — я знаю.
ШАГ 3 — ИНСТРУМЕНТЫ: Нужен реальный факт/цена/поиск? → вызови инструмент.
         Если нет — отвечай сам, не трать лишний вызов.
ШАГ 4 — СИНТЕЗ: Собери всё в структурированный ответ.
ШАГ 5 — ПРОВЕРКА: Ответил ли я на вопрос? Нет воды? Правильный язык?

Если вопрос сложный — думай вслух. Пользователь ценит прозрачность мышления.
"""

# ─── react_ws ─────────────────────────────────────────────────────────────────

async def react_ws(ws: WebSocket, prompt: str, session_id: str, history: list,
                   image_base64: str = None, lang: str = "ru"):
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
    tool_context: list[str] = []

    # ── Phase 1: Tool-calling loop (max 3 rounds, rate-limit guarded) ────────
    for iteration in range(3):
        if iteration > 0:
            await asyncio.sleep(0.4)      # avoid Groq 429 burst
        resp_data, err = groq_call(messages, tools=tools, max_tokens=4096)
        if err or not resp_data:
            break
        choice = resp_data["choices"][0]
        msg    = choice["message"]
        finish = choice.get("finish_reason", "")

        if finish == "tool_calls" and msg.get("tool_calls"):
            messages.append({"role": "assistant",
                              "content": msg.get("content") or "",
                              "tool_calls": msg["tool_calls"]})
            for tc in msg["tool_calls"]:
                fn    = tc["function"]["name"]
                args  = json.loads(tc["function"].get("arguments", "{}"))
                label = TOOL_LABELS.get(fn, f"\U0001f527 {fn}")
                await ws.send_json({"t": "tool_start", "v": label})
                result = await asyncio.get_event_loop().run_in_executor(
                    None, lambda fn=fn, args=args: run_tool(fn, args, session_id))
                await ws.send_json({"t": "tool_done", "v": label})
                messages.append({"role": "tool", "tool_call_id": tc["id"],
                                  "name": fn, "content": result})
                tool_context.append(f"[{fn}]\n{str(result)[:700]}")
            continue  # next iteration

        # Model returned content directly — stream it
        content = msg.get("content") or ""
        if content:
            full_response = content
            chunk = 6
            for i in range(0, len(content), chunk):
                await ws.send_json({"t": "token", "v": content[i:i+chunk]})
                await asyncio.sleep(0.008)
        break

    # ── Phase 2: Synthesis (only when tools ran but no direct content yet) ───
    if not full_response and tool_context:
        await asyncio.sleep(0.5)          # rate-limit guard before synthesis call
        ctx_block = "\n\n=== Tool Results ===\n" + "\n\n".join(tool_context) + "\n=== End ==="
        synth_msgs = [sys_msg] + hist + [{
            "role": "user",
            "content": f"{prompt}{ctx_block}\n\nAnswer based on the tool results above."
        }]
        resp_data, err = groq_call(synth_msgs, tools=None, max_tokens=4096)
        if not err and resp_data:
            content = resp_data["choices"][0]["message"].get("content") or ""
            if content:
                full_response = content
                chunk = 6
                for i in range(0, len(content), chunk):
                    await ws.send_json({"t": "token", "v": content[i:i+chunk]})
                    await asyncio.sleep(0.008)

    if not full_response:
        await ws.send_json({"t": "token", "v": "Ошибка AI. Попробуйте снова."})

    if full_response and len(full_response) > 50:
        try:
            asyncio.get_event_loop().run_in_executor(None,
                lambda: memory_add(session_id,
                    f"[{datetime.utcnow().strftime('%Y-%m-%d')}] Q: {prompt[:80]} \u2192 A: {full_response[:120]}"))
        except: pass
    await ws.send_json({"t": "done"})
    return full_response

# ─── WebSocket /ws/oasis ──────────────────────────────────────────────────────

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
            history.append({"role": "user", "content": prompt})
            response = await react_ws(ws, prompt, session_id, history[:-1],
                                      image_base64=data.get("image_base64"),
                                      lang=data.get("lang", "ru"))
            if response:
                history.append({"role": "assistant", "content": response})
            if len(history) > 40:
                history = history[-40:]
    except WebSocketDisconnect:
        logger.info("WS disconnected: %s", session_id)
    except Exception as e:
        logger.error("WS error: %s", e)
        try: await ws.send_json({"t": "error", "v": str(e)})
        except: pass

# ─── WebSocket /ws/deep ───────────────────────────────────────────────────────

@app.websocket("/ws/deep")
async def ws_deep(ws: WebSocket):
    await ws.accept()
    try:
        raw = await asyncio.wait_for(ws.receive_text(), timeout=30)
        data = json.loads(raw)
        prompt = data.get("prompt", "")
        if not prompt:
            await ws.send_json({"t": "session_done"}); return
        await ws.send_json({"t": "plan", "v": "\U0001f5fa \u0421\u043e\u0441\u0442\u0430\u0432\u043b\u044f\u044e \u043f\u043b\u0430\u043d..."})
        plan_msgs = [
            {"role": "system", "content": "Research planner. 3-step plan as numbered list. Max 100 words."},
            {"role": "user", "content": prompt}
        ]
        plan_text = ""
        async for tok in groq_stream(plan_msgs, max_tokens=200):
            plan_text += tok
            await ws.send_json({"t": "plan_token", "v": tok})
        await ws.send_json({"t": "plan_done"})
        search_results = ""
        if SERPER_KEY:
            await ws.send_json({"t": "research", "v": "\U0001f50d \u0421\u043e\u0431\u0438\u0440\u0430\u044e \u0434\u0430\u043d\u043d\u044b\u0435..."})
            try:
                r = requests.post("https://google.serper.dev/search",
                    json={"q": prompt, "num": 5}, headers={"X-API-KEY": SERPER_KEY}, timeout=10)
                results = r.json().get("organic", [])[:5]
                search_results = "\n".join([f"- {x.get('title')}: {x.get('snippet')}" for x in results])
                await ws.send_json({"t": "research_done", "v": f"\u041d\u0430\u0439\u0434\u0435\u043d\u043e {len(results)} \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u043e\u0432"})
            except:
                await ws.send_json({"t": "research_done", "v": "\u041f\u043e\u0438\u0441\u043a \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d"})
        await ws.send_json({"t": "build", "v": "\u270d\ufe0f \u0424\u043e\u0440\u043c\u0438\u0440\u0443\u044e \u043e\u0442\u0432\u0435\u0442..."})
        ctx = f"Plan:\n{plan_text}\n\n" + (f"Sources:\n{search_results}" if search_results else "")
        synth_msgs = [
            {"role": "system", "content": "Deep research synthesiser. Comprehensive markdown answer. Match user language."},
            {"role": "user", "content": f"Question: {prompt}\n\n{ctx}"}
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

# ─── REST ────────────────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/health")
def health():
    return JSONResponse({"status": "ok", "version": "14.6.0",
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
        if mems: mem_ctx = "\n\nMemory:\n" + "\n".join(f"- {m.get('content','')}" for m in mems[-8:])
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
