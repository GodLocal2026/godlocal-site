# GodLocal API Backend v18.0 — Full OASIS Agent
# Tools: Telegram · Twitter/X · GitHub · Instagram · Web · Crypto · Memory
# WebSocket: /ws/oasis /ws/deep
# REST: /health /ping /memory /profile /market /v2/council

import os, sys, time, json, threading, asyncio, logging, uuid, base64
import requests
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("godlocal")

app = FastAPI(title="GodLocal OASIS Agent", version="18.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Config ─────────────────────────────────────────────────────────────────────

GROQ_KEY    = os.environ.get("GROQ_API_KEY", "")
SERPER_KEY  = os.environ.get("SERPER_API_KEY", "")
TG_TOKEN    = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT     = os.environ.get("TELEGRAM_CHAT_ID", "")  # default channel

# Twitter/X (Tweepy OAuth1)
TW_API_KEY    = os.environ.get("TWITTER_API_KEY", "")
TW_API_SECRET = os.environ.get("TWITTER_API_SECRET", "")
TW_ACCESS     = os.environ.get("TWITTER_ACCESS_TOKEN", "")
TW_ACCESS_SEC = os.environ.get("TWITTER_ACCESS_SECRET", "")
TW_BEARER     = os.environ.get("TWITTER_BEARER_TOKEN", "")

# GitHub
GH_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# Instagram (Graph API)
IG_TOKEN   = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
IG_USER_ID = os.environ.get("INSTAGRAM_USER_ID", "")

# Models
MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
]
VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]

SYSTEM_PROMPT = """Ты — OASIS, стратегический AI-советник и оперативный агент GodLocal / slonik52.

═══════════════════════════════════════════════
ХАРАКТЕР И СТИЛЬ
═══════════════════════════════════════════════
- Думаешь вслух перед ответом: анализируешь, взвешиваешь варианты, потом даёшь чёткий вывод
- Умный, прямой, без воды. Пишешь как партнёр, а не как сервис
- Отвечаешь на русском если пользователь пишет по-русски
- Смелые аналогии, конкретные цифры, называешь вещи своими именами
- После главного ответа — 2-3 **наводящих вопроса** внизу в виде кнопок-подсказок

═══════════════════════════════════════════════
КОНТЕКСТ ПРОЕКТА (знаешь наизусть)
═══════════════════════════════════════════════
**slonik52** 🐘 — Solana memecoin terminal (godlocal.ai/static/pwa/smertch.html)
- Real-time WebSocket scan (pumpportal.fun) — новые токены за 0.3–1.5 сек
- 4-agent AI hedge fund: Rug Detective + Momentum + Value + Sentiment → STRONG BUY/AVOID
- Native Phantom swap via Jupiter v6 — signAndSendTransaction прямо в браузере
- Top 100 market (CoinGecko), News 3-tab (CMC · CoinGecko · pump.fun KoTH)
- PWA — работает в Safari на iPhone без установки
- Репо: GodLocal2026/godlocal-site (private)

**Монетизация** (план):
1. Swap fee 0.3–0.5% — пассивный доход с каждого свапа через Jupiter (приоритет #1)
2. Pro подписка $9–15/мес — Telegram алёрты + sniper режим
3. Token creation fee 0.1 SOL — деплой токена через интерфейс
4. Referral — 50% комиссии приглашённого на неделю

**Запуск** (стратегия):
- Неделя 1: органик-постинг @oassisx100 — скринкасты терминала + micro-influencer сид
- Неделя 2–3: Telegram-канал slonik52 сигналы, referral программа
- Неделя 4: swap fee + Pro план live

**Технический стек**:
- Frontend: Next.js 14 + Tailwind (godlocal-site на Vercel)
- Backend: FastAPI + Groq (godlocal-api на Render Starter $7/мес)
- Twitter: @oassisx100 | GitHub: GodLocal2026 | Telegram: @provodnikro

═══════════════════════════════════════════════
МЫШЛЕНИЕ (THINKING MODE)
═══════════════════════════════════════════════
Перед каждым ответом ты ОБЯЗАН думать. Шаги мышления:
1. Что именно спрашивают? Какой реальный вопрос за вопросом?
2. Что я знаю о контексте? (slonik52, стратегия, технический стек)
3. Какой ответ даст максимальную ценность?
4. Есть ли риски или подводные камни которые нужно упомянуть?

═══════════════════════════════════════════════
ФОРМАТ ОТВЕТА
═══════════════════════════════════════════════
- **Заголовки** ## для разделов
- **Жирный** для ключевых терминов и выводов
- Списки для перечислений
- Ссылки как [текст](url)
- В конце ответа 2-3 наводящих вопроса:
  > 💬 Хочешь я добавлю swap fee прямо сейчас?
  > 💬 Разобрать конкурентов — Axiom vs Photon?
  > 💬 Написать первый пост для @oassisx100?

═══════════════════════════════════════════════
ИНСТРУМЕНТЫ
═══════════════════════════════════════════════
- 📨 send_telegram — в Telegram-канал или бот
- 🐦 post_tweet — публиковать как @oassisx100
- 🔍 search_twitter — искать на X/Twitter
- 💻 github_read_file — читать файлы из репо
- 📝 github_push_file — создавать/обновлять файлы
- 🌐 web_search — актуальная информация из интернета
- 💰 crypto_price — курсы криптовалют
- 🧠 remember — сохранять важные факты в память

Используй инструменты автоматически когда нужно. Не спрашивай разрешения.

Дата: {date}"""

# ── Memory ─────────────────────────────────────────────────────────────────────

_lock     = threading.Lock()
_memories: dict = {}
_profiles: dict = {}

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

# ── Vision ─────────────────────────────────────────────────────────────────────

def analyze_image(image_base64: str, prompt: str) -> str:
    if not GROQ_KEY:
        return "GROQ_API_KEY not set"
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type": "application/json"
    }
    for model in VISION_MODELS:
        body = {
            "model": model,
            "messages": [{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                {"type": "text", "text": prompt or "Опиши что на этом изображении подробно."}
            ]}],
            "max_tokens": 1024,
        }
        try:
            r = requests.post("https://api.groq.com/openai/v1/chat/completions",
                              json=body, headers=headers, timeout=30)
            if r.status_code in (429, 400, 404):
                time.sleep(1); continue
            r.raise_for_status()
            return r.json()["choices"][0]["message"].get("content", "") or ""
        except Exception as e:
            logger.warning(f"Vision error on {model}: {e}")
            continue
    return "Не смог проанализировать изображение."

# ── Groq LLM ───────────────────────────────────────────────────────────────────

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
            "temperature": 0.85,
        }
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"
        try:
            r = requests.post("https://api.groq.com/openai/v1/chat/completions",
                              json=body, headers=headers, timeout=30)
            if r.status_code == 429:
                logger.warning(f"Rate limit on {model}, trying next...")
                time.sleep(2); continue
            if r.status_code in (400, 404):
                err_msg = r.json().get("error", {}).get("message", "")
                logger.warning(f"Model {model} error {r.status_code}: {err_msg[:80]}")
                continue
            r.raise_for_status()
            return r.json(), None
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout on {model}"); continue
        except Exception as e:
            logger.warning(f"Error on {model}: {e}"); continue
    return None, "All models failed"

# ── Tool Definitions ───────────────────────────────────────────────────────────

TOOL_DEFS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information, news, prices, facts",
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
            "description": "Save important information to user memory for future sessions",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "What to remember"}
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_telegram",
            "description": "Send a message to a Telegram channel or user. Use for posting to @provodnikro or other chats.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chat_id": {"type": "string", "description": "Channel username (e.g. @provodnikro) or numeric chat ID"},
                    "text": {"type": "string", "description": "Message text (supports Markdown)"},
                    "parse_mode": {"type": "string", "description": "Markdown or HTML (default: Markdown)"}
                },
                "required": ["chat_id", "text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "post_tweet",
            "description": "Post a tweet as @oassisx100 on X/Twitter",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Tweet text (max 280 characters)"}
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_twitter",
            "description": "Search recent tweets on X/Twitter for news, trends, or specific topics",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Twitter search query (supports operators like from:user, #hashtag)"},
                    "max_results": {"type": "integer", "description": "Number of results (max 10)", "default": 5}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "github_read_file",
            "description": "Read a file from a GitHub repository",
            "parameters": {
                "type": "object",
                "properties": {
                    "repo": {"type": "string", "description": "Repository in format owner/repo (e.g. GodLocal2026/godlocal-site)"},
                    "path": {"type": "string", "description": "File path in the repository (e.g. src/app/page.tsx)"}
                },
                "required": ["repo", "path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "github_push_file",
            "description": "Create or update a file in a GitHub repository",
            "parameters": {
                "type": "object",
                "properties": {
                    "repo": {"type": "string", "description": "Repository in format owner/repo"},
                    "path": {"type": "string", "description": "File path"},
                    "content": {"type": "string", "description": "Full file content"},
                    "message": {"type": "string", "description": "Git commit message"}
                },
                "required": ["repo", "path", "content", "message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "github_list_files",
            "description": "List files in a GitHub repository directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "repo": {"type": "string", "description": "Repository in format owner/repo"},
                    "path": {"type": "string", "description": "Directory path (empty string for root)"}
                },
                "required": ["repo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "crypto_price",
            "description": "Get current cryptocurrency prices in USD from CoinGecko",
            "parameters": {
                "type": "object",
                "properties": {
                    "coins": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of coin IDs (e.g. ['bitcoin', 'ethereum', 'solana'])"
                    }
                },
                "required": ["coins"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "post_instagram",
            "description": "Post an image or carousel to Instagram Business account",
            "parameters": {
                "type": "object",
                "properties": {
                    "image_url": {"type": "string", "description": "Public URL of the image to post"},
                    "caption": {"type": "string", "description": "Post caption with hashtags"}
                },
                "required": ["image_url", "caption"]
            }
        }
    },
]

TOOL_LABELS = {
    "web_search":      "🌐 поиск",
    "remember":        "🧠 запоминаю",
    "send_telegram":   "📨 Telegram",
    "post_tweet":      "🐦 Twitter",
    "search_twitter":  "🔍 ищу в Twitter",
    "github_read_file":"💻 читаю GitHub",
    "github_push_file":"📝 пишу в GitHub",
    "github_list_files":"📁 GitHub ls",
    "crypto_price":    "💰 курс крипты",
    "post_instagram":  "📸 Instagram",
}

# ── Tool Executors ─────────────────────────────────────────────────────────────

def _tool_web_search(args: dict) -> str:
    q = args.get("query", "")
    if SERPER_KEY:
        try:
            r = requests.post("https://google.serper.dev/search",
                              json={"q": q, "num": 5},
                              headers={"X-API-KEY": SERPER_KEY}, timeout=10)
            data = r.json()
            results = []
            for item in data.get("organic", [])[:5]:
                title   = item.get('title', '')
                snippet = item.get('snippet', '')[:200]
                link    = item.get('link', '')
                if link:
                    results.append(f"[{title}]({link}): {snippet}")
                else:
                    results.append(f"{title}: {snippet}")
            return "\n".join(results) if results else "No results found"
        except Exception as e:
            return f"Serper error: {e}"
    # Fallback: DuckDuckGo
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(q, max_results=5))
        out = []
        for r in results:
            title   = r.get("title", "")
            body    = r.get("body", "")[:200]
            href    = r.get("href", "")
            if href:
                out.append(f"[{title}]({href}): {body}")
            else:
                out.append(f"{title}: {body}")
        return "\n".join(out) if out else "No results"
    except Exception as e:
        return f"Search error: {e}"

def _tool_send_telegram(args: dict) -> str:
    if not TG_TOKEN:
        return "❌ TELEGRAM_BOT_TOKEN not set in Render env vars"
    chat_id    = args.get("chat_id", TG_CHAT or "@provodnikro")
    text       = args.get("text", "")
    parse_mode = args.get("parse_mode", "Markdown")
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            timeout=10
        )
        data = r.json()
        if data.get("ok"):
            return f"✅ Sent to {chat_id}, message_id={data['result']['message_id']}"
        return f"❌ Telegram error: {data.get('description', '?')}"
    except Exception as e:
        return f"❌ Telegram exception: {e}"

def _tool_post_tweet(args: dict) -> str:
    text = args.get("text", "")
    if not all([TW_API_KEY, TW_API_SECRET, TW_ACCESS, TW_ACCESS_SEC]):
        return "❌ Twitter API keys not set. Add TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET to Render env vars."
    try:
        import tweepy
        client = tweepy.Client(
            consumer_key=TW_API_KEY,
            consumer_secret=TW_API_SECRET,
            access_token=TW_ACCESS,
            access_token_secret=TW_ACCESS_SEC
        )
        response = client.create_tweet(text=text[:280])
        tweet_id = response.data["id"]
        return f"✅ Tweet posted: https://twitter.com/oassisx100/status/{tweet_id}"
    except Exception as e:
        return f"❌ Twitter error: {e}"

def _tool_search_twitter(args: dict) -> str:
    q           = args.get("query", "")
    max_results = min(int(args.get("max_results", 5)), 10)
    if not TW_BEARER:
        # Fallback: web search Twitter
        return _tool_web_search({"query": f"site:twitter.com {q}"})
    try:
        import tweepy
        client = tweepy.Client(bearer_token=TW_BEARER)
        resp = client.search_recent_tweets(
            query=q + " -is:retweet lang:en",
            max_results=max_results,
            tweet_fields=["created_at", "author_id", "public_metrics"]
        )
        if not resp.data:
            return "No tweets found"
        out = []
        for t in resp.data:
            m = t.public_metrics
            likes = m.get("like_count", 0) if m else 0
            out.append(f"• {t.text[:200]}  ❤️{likes}")
        return "\n".join(out)
    except Exception as e:
        return f"Twitter search error: {e}"

def _tool_github_read_file(args: dict) -> str:
    repo = args.get("repo", "GodLocal2026/godlocal-site")
    path = args.get("path", "")
    if not GH_TOKEN:
        return "❌ GITHUB_TOKEN not set in Render env vars"
    try:
        from github import Github
        g    = Github(GH_TOKEN)
        file = g.get_repo(repo).get_contents(path)
        content = base64.b64decode(file.content).decode("utf-8", errors="replace")
        # Truncate to avoid huge tokens
        if len(content) > 4000:
            content = content[:4000] + "\n... [truncated]"
        return f"**{repo}/{path}** (SHA: {file.sha[:8]}):\n```\n{content}\n```"
    except Exception as e:
        return f"❌ GitHub read error: {e}"

def _tool_github_push_file(args: dict) -> str:
    repo    = args.get("repo", "GodLocal2026/godlocal-site")
    path    = args.get("path", "")
    content = args.get("content", "")
    message = args.get("message", "Update from OASIS Agent")
    if not GH_TOKEN:
        return "❌ GITHUB_TOKEN not set in Render env vars"
    try:
        from github import Github
        g    = Github(GH_TOKEN)
        ghrepo = g.get_repo(repo)
        try:
            existing = ghrepo.get_contents(path)
            result   = ghrepo.update_file(path, message, content, existing.sha)
            sha = result["commit"].sha[:10]
            return f"✅ Updated {repo}/{path} (commit: {sha})"
        except Exception:
            result = ghrepo.create_file(path, message, content)
            sha = result["commit"].sha[:10]
            return f"✅ Created {repo}/{path} (commit: {sha})"
    except Exception as e:
        return f"❌ GitHub push error: {e}"

def _tool_github_list_files(args: dict) -> str:
    repo = args.get("repo", "GodLocal2026/godlocal-site")
    path = args.get("path", "")
    if not GH_TOKEN:
        return "❌ GITHUB_TOKEN not set in Render env vars"
    try:
        from github import Github
        g       = Github(GH_TOKEN)
        files   = g.get_repo(repo).get_contents(path)
        entries = [f"{'📁' if f.type == 'dir' else '📄'} {f.name}" for f in files]
        return "\n".join(entries) if entries else "Empty directory"
    except Exception as e:
        return f"❌ GitHub list error: {e}"

def _tool_crypto_price(args: dict) -> str:
    coins = args.get("coins", ["bitcoin", "ethereum", "solana"])
    ids   = ",".join(coins)
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": ids, "vs_currencies": "usd", "include_24hr_change": "true"},
            timeout=8
        )
        data = r.json()
        lines = []
        for coin, info in data.items():
            price  = info.get("usd", "?")
            change = info.get("usd_24h_change", 0) or 0
            arrow  = "📈" if change > 0 else "📉"
            lines.append(f"**{coin.upper()}**: ${price:,.2f} {arrow} {change:+.2f}%")
        return "\n".join(lines) if lines else "No price data"
    except Exception as e:
        return f"❌ CoinGecko error: {e}"

def _tool_post_instagram(args: dict) -> str:
    image_url = args.get("image_url", "")
    caption   = args.get("caption", "")
    if not IG_TOKEN or not IG_USER_ID:
        return "❌ Instagram not configured. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID to Render env vars."
    try:
        # Step 1: Create media container
        r1 = requests.post(
            f"https://graph.instagram.com/{IG_USER_ID}/media",
            params={
                "image_url": image_url,
                "caption": caption,
                "access_token": IG_TOKEN
            },
            timeout=15
        )
        data1 = r1.json()
        if "id" not in data1:
            return f"❌ Instagram media create error: {data1}"
        container_id = data1["id"]
        # Step 2: Publish
        r2 = requests.post(
            f"https://graph.instagram.com/{IG_USER_ID}/media_publish",
            params={"creation_id": container_id, "access_token": IG_TOKEN},
            timeout=15
        )
        data2 = r2.json()
        if "id" in data2:
            return f"✅ Instagram post published (id: {data2['id']})"
        return f"❌ Instagram publish error: {data2}"
    except Exception as e:
        return f"❌ Instagram error: {e}"

def run_tool(name: str, args: dict, sid: str) -> str:
    if name == "web_search":       return _tool_web_search(args)
    if name == "remember":         mem_add(sid, args.get("text", "")); return f"Remembered: {args.get('text','')}"
    if name == "send_telegram":    return _tool_send_telegram(args)
    if name == "post_tweet":       return _tool_post_tweet(args)
    if name == "search_twitter":   return _tool_search_twitter(args)
    if name == "github_read_file": return _tool_github_read_file(args)
    if name == "github_push_file": return _tool_github_push_file(args)
    if name == "github_list_files":return _tool_github_list_files(args)
    if name == "crypto_price":     return _tool_crypto_price(args)
    if name == "post_instagram":   return _tool_post_instagram(args)
    return f"Unknown tool: {name}"

# ── Core Agent Loop ────────────────────────────────────────────────────────────

async def run_agent(ws: WebSocket, prompt: str, session_id: str,
                    history: list, image_base64: str = None):
    mems = mem_get(session_id)
    mem_block = ""
    if mems:
        mem_block = "\n\nПамять пользователя:\n" + "\n".join(
            f"- {m['content']}" for m in mems[-10:]
        )
    today       = datetime.utcnow().strftime("%Y-%m-%d")
    sys_content = SYSTEM_PROMPT.format(date=today) + mem_block

    hist = [m for m in history[-12:]
            if m.get("role") in ("user", "assistant")
            and isinstance(m.get("content"), str)]

    # Image analysis
    if image_base64:
        await ws.send_json({"t": "tool_start", "v": "🖼 анализирую фото"})
        vision_result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: analyze_image(image_base64, prompt)
        )
        await ws.send_json({"t": "tool_done", "v": "🖼 анализирую фото"})
        user_content = f"{prompt}\n\n[Анализ изображения]: {vision_result}"
    else:
        user_content = prompt

    messages = (
        [{"role": "system", "content": sys_content}]
        + hist
        + [{"role": "user", "content": user_content}]
    )

    # ── Thinking phase (before agent loop) ───────────────────────────────────
    await ws.send_json({"t": "thinking_start"})

    # Build thinking steps based on prompt context
    thinking_steps = [
        f"Анализирую запрос: «{prompt[:80]}{'...' if len(prompt)>80 else ''}»",
        "Проверяю контекст проекта: slonik52, стратегия, технический стек...",
    ]
    # Add context-specific steps
    low = prompt.lower()
    if any(w in low for w in ["swap", "fee", "jupiter", "phantom"]):
        thinking_steps.append("Связано со свапом — смотрю Jupiter v6 интеграцию и fee механику...")
    if any(w in low for w in ["твит", "twitter", "пост", "запуск", "launch"]):
        thinking_steps.append("Маркетинговый запрос — думаю про @oassisx100 аудиторию и контент-стратегию...")
    if any(w in low for w in ["ошибк", "баг", "error", "fix", "сломал"]):
        thinking_steps.append("Технический вопрос — думаю про стек: FastAPI / Next.js / Render / Vercel...")
    if any(w in low for w in ["монетиз", "деньги", "доход", "revenue", "заработ"]):
        thinking_steps.append("Монетизация — приоритет: swap fee → Pro подписка → token creation fee...")
    thinking_steps.append("Формирую оптимальный ответ с конкретными рекомендациями...")

    for step in thinking_steps:
        await ws.send_json({"t": "thinking", "v": step})
        await asyncio.sleep(0.12)

    await ws.send_json({"t": "thinking_done"})

    # ── Agent loop (max 5 tool rounds) ────────────────────────────────────────
    for _round in range(5):
        resp, err = await asyncio.get_event_loop().run_in_executor(
            None, lambda: groq_chat(messages, tools=TOOL_DEFS, max_tokens=1536)
        )
        if err or not resp:
            logger.error(f"groq_chat error: {err}")
            await ws.send_json({"t": "token", "v": "Извини, AI временно недоступен. Попробуй снова."})
            await ws.send_json({"t": "done"})
            return

        choice   = resp["choices"][0]
        msg_out  = choice["message"]
        finish   = choice.get("finish_reason", "stop")
        full_text = ""

        if finish == "tool_calls" and msg_out.get("tool_calls"):
            # Execute all tool calls in this round
            messages.append({
                "role": "assistant",
                "content": msg_out.get("content") or "",
                "tool_calls": msg_out["tool_calls"]
            })
            for tc in msg_out["tool_calls"]:
                fn = tc["function"]["name"]
                try:
                    args = json.loads(tc["function"].get("arguments", "{}"))
                except Exception:
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
            # Continue loop for model to synthesize
            continue

        else:
            # Final answer
            full_text = msg_out.get("content", "") or ""
            break

    if not full_text.strip():
        full_text = "Не смог сформировать ответ. Попробуй переформулировать."

    # Stream response — faster chunks
    chunk_size = 12
    for i in range(0, len(full_text), chunk_size):
        await ws.send_json({"t": "token", "v": full_text[i:i+chunk_size]})
        await asyncio.sleep(0.003)

    await ws.send_json({"t": "done"})

    # Auto-save to memory
    if len(full_text) > 30:
        asyncio.get_event_loop().run_in_executor(
            None,
            lambda: mem_add(session_id,
                f"[{today}] Q: {prompt[:60]} → A: {full_text[:100]}")
        )

# ── WebSocket /ws/oasis ────────────────────────────────────────────────────────

@app.websocket("/ws/oasis")
async def ws_oasis(websocket: WebSocket, sid: str = "default"):
    await websocket.accept()
    session_id = sid
    history    = []
    logger.info(f"WS /ws/oasis connected: {session_id}")
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                await websocket.send_json({"t": "error", "v": "Invalid JSON"})
                continue
            if raw.strip() in ('ping', '"ping"') or data.get("type") == "ping":
                await websocket.send_json({"t": "pong"})
                continue
            prompt = data.get("prompt") or data.get("message") or data.get("content", "")
            if not prompt.strip():
                continue
            lang          = data.get("lang", "ru")
            image_base64  = data.get("image_base64")
            history.append({"role": "user", "content": prompt})
            await run_agent(websocket, prompt, session_id, history[:-1], image_base64)
    except WebSocketDisconnect:
        logger.info(f"WS disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WS error: {e}", exc_info=True)
        try:
            await websocket.send_json({"t": "error", "v": str(e)})
        except Exception:
            pass

# ── WebSocket /ws/deep ────────────────────────────────────────────────────────

@app.websocket("/ws/deep")
async def ws_deep(websocket: WebSocket, sid: str = "default"):
    await websocket.accept()
    session_id = sid
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
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
                {"role": "system", "content": f"Ты — GodLocal Deep Research AI. Дата: {today}. Давай развёрнутый структурированный ответ. Ссылки как [текст](url)."},
                {"role": "user", "content": f"Вопрос: {prompt}\n\nРезультаты поиска:\n{search_result}\n\nДай подробный ответ."}
            ]
            resp, err = await asyncio.get_event_loop().run_in_executor(
                None, lambda: groq_chat(messages, tools=None, max_tokens=2048)
            )
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

# ── REST ───────────────────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/health")
def health():
    return JSONResponse({
        "status": "ok", "version": "18.0.0",
        "groq": bool(GROQ_KEY), "serper": bool(SERPER_KEY),
        "telegram": bool(TG_TOKEN), "twitter": bool(TW_API_KEY),
        "github": bool(GH_TOKEN), "instagram": bool(IG_TOKEN),
        "vision": "llama-4-scout"
    })

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
    sid  = data.get("session_id", "default")
    with _lock:
        _profiles[sid] = data
    return JSONResponse({"ok": True})

@app.post("/v2/council")
async def council(request: Request):
    data   = await request.json()
    prompt = data.get("prompt", "")
    archetypes = [
        ("🧭 Стратег", "Ты — Стратег. Думай системно, на перспективу. Отвечай кратко (2-3 предложения). Ссылки как [текст](url)."),
        ("⚡ Воин",    "Ты — Воин. Решителен, прямолинеен. Отвечай кратко (2-3 предложения). Ссылки как [текст](url)."),
        ("🌟 Творец",  "Ты — Творец. Нестандартное мышление. Отвечай кратко (2-3 предложения). Ссылки как [текст](url)."),
    ]
    async def generate():
        for name, role_prompt in archetypes:
            yield f"data: {json.dumps({'t': 'agent', 'v': name})}\n\n"
            await asyncio.sleep(0.05)
            messages = [
                {"role": "system", "content": role_prompt},
                {"role": "user",   "content": prompt}
            ]
            resp, err = await asyncio.get_event_loop().run_in_executor(
                None, lambda m=messages: groq_chat(m, max_tokens=200)
            )
            reply = resp["choices"][0]["message"].get("content","") if (resp and not err) else "..."
            for i in range(0, len(reply), 6):
                yield f"data: {json.dumps({'t': 'token', 'v': reply[i:i+6]})}\n\n"
                await asyncio.sleep(0.008)
            yield f"data: {json.dumps({'t': 'agent_done', 'v': name})}\n\n"
            await asyncio.sleep(0.3)
        yield f"data: {json.dumps({'t': 'done'})}\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── User API Keys Store (per session_id) ─────────────────────────────────────
_user_keys: dict = {}   # { session_id: { "TELEGRAM_BOT_TOKEN": "...", ... } }

def get_user_env(session_id: str, key: str) -> str:
    """Get user-provided key, fall back to server env var."""
    val = _user_keys.get(session_id, {}).get(key, "")
    return val or os.environ.get(key, "")

@app.get("/settings")
def get_settings(session_id: str = "default"):
    with _lock:
        keys = _user_keys.get(session_id, {})
    # Mask values: return asterisks for set keys, empty string for unset
    masked = {}
    for k, v in keys.items():
        masked[k] = "••••••••" if v else ""
    return JSONResponse({"ok": True, "keys": masked})

@app.post("/settings")
async def save_settings(request: Request):
    data = await request.json()
    sid  = data.get("session_id", "default")
    keys = data.get("keys", {})
    with _lock:
        if sid not in _user_keys:
            _user_keys[sid] = {}
        for k, v in keys.items():
            if v == "":          # disconnect — clear key
                _user_keys[sid].pop(k, None)
            elif v != "••••••••":  # real value (not masked placeholder)
                _user_keys[sid][k] = v
    return JSONResponse({"ok": True})


@app.get("/market")
async def market():
    try:
        r = requests.get("https://api.coingecko.com/api/v3/simple/price",
                         params={"ids": "bitcoin,ethereum,solana", "vs_currencies": "usd"},
                         timeout=8)
        return JSONResponse(r.json())
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
