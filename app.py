# GodLocal API Backend v16.0 — Vision + Rich Prompts + Memory Fix
# WebSocket: /ws/oasis /ws/deep
# REST: /health /memory /profile /v2/council /market
import os, sys, time, json, threading, asyncio, logging, uuid, base64
import requests
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("godlocal")

app = FastAPI(title="GodLocal API", version="16.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─── Config ─────────────────────────────────────────────────────────────────

GROQ_KEY   = os.environ.get("GROQ_API_KEY", "")
SERPER_KEY = os.environ.get("SERPER_API_KEY", "")
TG_TOKEN   = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT    = os.environ.get("TELEGRAM_CHAT_ID", "")

# Text-only models (fallback chain)
MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
]

# Vision models (for image analysis)
VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]

SYSTEM_PROMPT = """Ты — GodLocal AI ⚡, умный и живой ИИ-ассистент на платформе OASIS.

ЛИЧНОСТЬ:
- Отвечай тепло, умно, с огоньком — не сухо
- Используй язык пользователя (русский/украинский/английский)
- Пиши структурировано: заголовки, списки, выделение **жирным**

ССЫЛКИ — ВСЕГДА в формате Markdown:
- Кликабельная ссылка: [Название сайта](https://example.com)
- Никогда не пиши "голые" URL — всегда оборачивай в [текст](url)
- Пример: [YouTube канал Дудя](https://www.youtube.com/@yurydud)
- Пример: [Bitcoin на CoinGecko](https://www.coingecko.com/en/coins/bitcoin)
- Если пользователь просит ссылку — дай её в формате [текст](url)

ВОЗМОЖНОСТИ:
- Веб-поиск через web_search (для новостей, цен, текущих данных)
- Сохранение в память через remember
- Анализ изображений (если прислали фото)

ВАЖНО:
- Если задан поиск — используй web_search, потом отвечай с конкретными данными
- Если прислали изображение — опиши что на нём, проанализируй
- Дата: {date}"""

# ─── In-memory storage ───────────────────────────────────────────────────────

_lock = threading.Lock()
_memories: dict = {}
_profiles: dict = {}

# ─── Memory ──────────────────────────────────────────────────────────────────

def mem_add(sid: str, text: str):
    with _lock:
        if sid not in _memories:
            _memories[sid] = []
        _memories[sid].append({
            "id": str(uuid.uuid4())[:8],
            "content": text,
            "ts": int(time.time() * 1000),
            "type": "fact"
        })
        _memories[sid] = _memories[sid][-50:]

def mem_get(sid: str) -> list:
    with _lock:
        return list(_memories.get(sid, []))

def mem_delete(sid: str, mid: str):
    with _lock:
        if sid in _memories:
            _memories[sid] = [m for m in _memories[sid] if m["id"] != mid]

# ─── Vision (image analysis) ─────────────────────────────────────────────────

def analyze_image(image_base64: str, prompt: str) -> str:
    """Analyze image using Groq vision model."""
    if not GROQ_KEY:
        return "GROQ_API_KEY not set"
    # Strip data URI prefix if present
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type": "application/json"
    }
    for model in VISION_MODELS:
        body = {
            "model": model,
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                    },
                    {
                        "type": "text",
                        "text": prompt or "Опиши что на этом изображении подробно."
                    }
                ]
            }],
            "max_tokens": 1024,
        }
        try:
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=body, headers=headers, timeout=30
            )
            if r.status_code == 429:
                logger.warning(f"Rate limit on vision model {model}")
                time.sleep(1)
                continue
            if r.status_code in (400, 404):
                logger.warning(f"Vision model {model} error {r.status_code}")
                continue
            r.raise_for_status()
            return r.json()["choices"][0]["message"].get("content", "") or ""
        except Exception as e:
            logger.warning(f"Vision error on {model}: {e}")
            continue
    return "Не смог проанализировать изображение (vision модели недоступны)."

# ─── Groq LLM ────────────────────────────────────────────────────────────────

def groq_chat(messages: list, tools: list = None, max_tokens: int = 1024) -> tuple:
    if not GROQ_KEY:
        return None, "GROQ_API_KEY not set"
    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type": "application/json"
    }
    for model in MODELS:
        body = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"
        try:
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=body, headers=headers, timeout=30
            )
            if r.status_code == 429:
                logger.warning(f"Rate limit on {model}, trying next...")
                time.sleep(2)
                continue
            if r.status_code in (400, 404):
                err_msg = r.json().get("error", {}).get("message", "")
                logger.warning(f"Model {model} error {r.status_code}: {err_msg[:80]}")
                continue
            r.raise_for_status()
            return r.json(), None
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout on {model}")
            continue
        except Exception as e:
            logger.warning(f"Error on {model}: {e}")
            continue
    return None, "All models failed"

# ─── Tools ───────────────────────────────────────────────────────────────────

TOOL_DEFS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information, news, prices",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "remember",
            "description": "Save important information to user memory",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "What to remember"}
                },
                "required": ["text"]
            }
        }
    }
]

TOOL_LABELS = {
    "web_search": "🌐 поиск",
    "remember": "🧠 запоминаю",
}

def run_tool(name: str, args: dict, sid: str) -> str:
    if name == "web_search":
        q = args.get("query", "")
        if not SERPER_KEY:
            return f"Search unavailable. Query: {q}"
        try:
            r = requests.post(
                "https://google.serper.dev/search",
                json={"q": q, "num": 5},
                headers={"X-API-KEY": SERPER_KEY},
                timeout=10
            )
            data = r.json()
            results = []
            for item in data.get("organic", [])[:5]:
                title = item.get('title', '')
                snippet = item.get('snippet', '')[:200]
                link = item.get('link', '')
                if link:
                    results.append(f"[{title}]({link}): {snippet}")
                else:
                    results.append(f"{title}: {snippet}")
            return "\n".join(results) if results else "No results found"
        except Exception as e:
            return f"Search error: {e}"
    elif name == "remember":
        text = args.get("text", "")
        mem_add(sid, text)
        return f"Remembered: {text}"
    return f"Unknown tool: {name}"

# ─── Core chat ───────────────────────────────────────────────────────────────

SEARCH_KEYWORDS = [
    'поиск', 'найди', 'найти', 'search', 'курс', 'цена', 'price',
    'btc', 'bitcoin', 'eth', 'крипто', 'что сейчас', 'актуально',
    'последний', 'новости', 'сегодня новост', 'расскажи о',
]

async def chat(ws: WebSocket, prompt: str, session_id: str,
               history: list, lang: str = "ru", image_base64: str = None):
    mems = mem_get(session_id)
    mem_block = ""
    if mems:
        mem_block = "\n\nПамять пользователя:\n" + "\n".join(
            f"- {m['content']}" for m in mems[-10:]
        )
    today = datetime.utcnow().strftime("%Y-%m-%d")
    sys_content = SYSTEM_PROMPT.format(date=today) + mem_block

    hist = [m for m in history[-12:]
            if m.get("role") in ("user", "assistant")
            and isinstance(m.get("content"), str)]

    # If image attached — analyze it first
    if image_base64:
        await ws.send_json({"t": "tool_start", "v": "🖼 анализирую фото"})
        vision_result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: analyze_image(image_base64, prompt)
        )
        await ws.send_json({"t": "tool_done", "v": "🖼 анализирую фото"})
        # Inject vision result as context
        enhanced_prompt = f"{prompt}\n\n[Анализ изображения]: {vision_result}"
        messages = (
            [{"role": "system", "content": sys_content}]
            + hist
            + [{"role": "user", "content": enhanced_prompt}]
        )
    else:
        messages = (
            [{"role": "system", "content": sys_content}]
            + hist
            + [{"role": "user", "content": prompt}]
        )

    needs_search = any(kw in prompt.lower() for kw in SEARCH_KEYWORDS)
    tools = TOOL_DEFS if needs_search else None

    # Call Groq
    resp, err = groq_chat(messages, tools=tools, max_tokens=1024)

    if err or not resp:
        logger.error(f"groq_chat error: {err}")
        await ws.send_json({"t": "token", "v": "Извини, AI временно недоступен. Попробуй ещё раз."})
        await ws.send_json({"t": "done"})
        return

    choice = resp["choices"][0]
    msg_out = choice["message"]
    finish = choice.get("finish_reason", "stop")
    full_text = ""

    if finish == "tool_calls" and msg_out.get("tool_calls"):
        # Execute tools
        messages.append({
            "role": "assistant",
            "content": msg_out.get("content") or "",
            "tool_calls": msg_out["tool_calls"]
        })
        for tc in msg_out["tool_calls"]:
            fn = tc["function"]["name"]
            try:
                args = json.loads(tc["function"].get("arguments", "{}"))
            except:
                args = {}
            label = TOOL_LABELS.get(fn, f"🔧 {fn}")
            await ws.send_json({"t": "tool_start", "v": label})
            tool_result = await asyncio.get_event_loop().run_in_executor(
                None, lambda fn=fn, args=args: run_tool(fn, args, session_id)
            )
            await ws.send_json({"t": "tool_done", "v": label})
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "name": fn,
                "content": str(tool_result)
            })
        # Final synthesis
        resp2, err2 = groq_chat(messages, tools=None, max_tokens=1024)
        if err2 or not resp2:
            full_text = "Нашёл данные, но не смог сформировать ответ."
        else:
            full_text = resp2["choices"][0]["message"].get("content", "") or ""
    else:
        # Direct answer (most common case)
        full_text = msg_out.get("content", "") or ""

    if not full_text.strip():
        full_text = "Не смог сформировать ответ. Попробуй переформулировать."

    chunk_size = 8
    for i in range(0, len(full_text), chunk_size):
        await ws.send_json({"t": "token", "v": full_text[i:i+chunk_size]})
        await asyncio.sleep(0.005)

    await ws.send_json({"t": "done"})

    if len(full_text) > 30:
        asyncio.get_event_loop().run_in_executor(
            None,
            lambda: mem_add(session_id,
                f"[{today}] Q: {prompt[:60]} → A: {full_text[:100]}")
        )

# ─── WebSocket /ws/oasis ─────────────────────────────────────────────────────

@app.websocket("/ws/oasis")
async def ws_oasis(websocket: WebSocket, sid: str = "default"):
    await websocket.accept()
    session_id = sid
    history = []
    logger.info(f"WS /ws/oasis connected: {session_id}")
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except:
                await websocket.send_json({"t": "error", "v": "Invalid JSON"})
                continue
            if raw.strip() in ('ping', '"ping"') or data.get("type") == "ping":
                await websocket.send_json({"t": "pong"})
                continue
            prompt = data.get("prompt") or data.get("message") or data.get("content", "")
            if not prompt.strip():
                continue
            lang = data.get("lang", "ru")
            image_base64 = data.get("image_base64")  # NEW: accept image
            history.append({"role": "user", "content": prompt})
            await chat(websocket, prompt, session_id, history[:-1], lang, image_base64)
    except WebSocketDisconnect:
        logger.info(f"WS disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WS error: {e}", exc_info=True)
        try:
            await websocket.send_json({"t": "error", "v": str(e)})
        except:
            pass

# ─── WebSocket /ws/deep ──────────────────────────────────────────────────────

@app.websocket("/ws/deep")
async def ws_deep(websocket: WebSocket, sid: str = "default"):
    await websocket.accept()
    session_id = sid
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except:
                continue
            prompt = data.get("prompt") or data.get("message", "")
            if not prompt.strip():
                continue
            await websocket.send_json({"t": "tool_start", "v": "🌐 исследую"})
            search_result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: run_tool("web_search", {"query": prompt}, session_id)
            )
            await websocket.send_json({"t": "tool_done", "v": "🌐 исследую"})
            today = datetime.utcnow().strftime("%Y-%m-%d")
            messages = [
                {"role": "system", "content": f"Ты — GodLocal Deep Research AI. Дата: {today}. Давай развёрнутый структурированный ответ. Ссылки оформляй как [текст](url)."},
                {"role": "user", "content": f"Вопрос: {prompt}\n\nРезультаты поиска:\n{search_result}\n\nДай подробный ответ."}
            ]
            resp, err = groq_chat(messages, tools=None, max_tokens=2048)
            if err or not resp:
                await websocket.send_json({"t": "token", "v": "Ошибка при исследовании."})
            else:
                answer = resp["choices"][0]["message"].get("content", "") or ""
                for i in range(0, len(answer), 8):
                    await websocket.send_json({"t": "token", "v": answer[i:i+8]})
                    await asyncio.sleep(0.005)
            await websocket.send_json({"t": "done"})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WS /ws/deep error: {e}")

# ─── REST ────────────────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/health")
def health():
    return JSONResponse({"status": "ok", "version": "16.0.0",
                         "groq": bool(GROQ_KEY), "serper": bool(SERPER_KEY),
                         "vision": "llama-4-scout"})

@app.get("/ping")
def ping():
    return JSONResponse({"pong": True})

@app.get("/test-groq")
def test_groq_endpoint():
    resp, err = groq_chat([{"role": "user", "content": "say hi in 3 words"}], max_tokens=20)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=500)
    content = resp["choices"][0]["message"].get("content", "")
    return JSONResponse({"ok": True, "response": content, "model": resp.get("model","?")})

@app.get("/memory")
def get_memory(session_id: str = "default"):
    return JSONResponse({"memories": mem_get(session_id)})

@app.delete("/memory/{session_id}/{mem_id}")
def delete_memory_ep(session_id: str, mem_id: str):
    mem_delete(session_id, mem_id)
    return JSONResponse({"ok": True})

@app.get("/profile")
def get_profile(session_id: str = "default"):
    with _lock:
        return JSONResponse(_profiles.get(session_id, {}))

@app.post("/profile")
async def set_profile(request: Request):
    data = await request.json()
    sid = data.get("session_id", "default")
    with _lock:
        _profiles[sid] = data
    return JSONResponse({"ok": True})

@app.post("/v2/council")
async def council(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "")

    archetypes = [
        ("🧭 Стратег", "Ты — Стратег. Думай системно, на перспективу. Отвечай кратко (2-3 предложения). Ссылки как [текст](url)."),
        ("⚔️ Воин", "Ты — Воин. Решителен, прямолинеен. Отвечай кратко (2-3 предложения). Ссылки как [текст](url)."),
        ("🌟 Творец", "Ты — Творец. Нестандартное мышление. Отвечай кратко (2-3 предложения). Ссылки как [текст](url)."),
    ]

    async def generate():
        for name, role_prompt in archetypes:
            yield f"data: {json.dumps({'t': 'agent', 'v': name})}\n\n"
            await asyncio.sleep(0.05)
            messages = [
                {"role": "system", "content": role_prompt},
                {"role": "user", "content": prompt}
            ]
            resp, err = groq_chat(messages, max_tokens=200)
            reply = resp["choices"][0]["message"].get("content","") if (resp and not err) else "..."
            for i in range(0, len(reply), 6):
                yield f"data: {json.dumps({'t': 'token', 'v': reply[i:i+6]})}\n\n"
                await asyncio.sleep(0.008)
            yield f"data: {json.dumps({'t': 'agent_done', 'v': name})}\n\n"
            await asyncio.sleep(0.3)
        yield f"data: {json.dumps({'t': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.get("/market")
async def market():
    try:
        r = requests.get("https://api.coingecko.com/api/v3/simple/price",
                        params={"ids": "bitcoin,ethereum,solana", "vs_currencies": "usd"},
                        timeout=8)
        return JSONResponse(r.json())
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
