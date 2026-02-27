# GodLocal HITL — Setup Guide

## Файлы
| Файл | Назначение |
|------|-----------|
| `task_queue.py` | Supabase-очередь задач |
| `telegram_hitl.py` | Telegram бот ✅/✏️/❌ |
| `cell_state.py` | L2/L3/L5/L6 память |
| `hitl_manager.py` | Оркестратор |

## 1. Supabase SQL (запусти один раз)
```sql
create table tasks (
    id uuid primary key default gen_random_uuid(),
    title text not null, executor text not null,
    status text not null default 'pending',
    action text, why_human text, draft_id uuid,
    draft_type text, draft_data jsonb, result jsonb,
    tg_message_id bigint, tg_chat_id bigint,
    cell_id text, created_at timestamptz default now()
);
create table cell_states (
    id uuid primary key default gen_random_uuid(),
    cell_id text not null unique,
    l2_history text, l3_live jsonb, l5_intent jsonb,
    l6_actions jsonb, raw_turns jsonb,
    updated_at timestamptz default now()
);
```

## 2. Telegram Bot
1. @BotFather → /newbot → получи BOT_TOKEN
2. Напиши боту → `https://api.telegram.org/bot<TOKEN>/getUpdates` → найди chat.id

## 3. ENV
```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
TELEGRAM_BOT_TOKEN=8012345:AAF...
TELEGRAM_CHAT_ID=123456789
GODLOCAL_MODEL__OPENAI_API_KEY=gsk_Opzk...
GODLOCAL_MODEL__OPENAI_BASE_URL=https://api.groq.com/openai/v1
GODLOCAL_MODEL__NAME=llama-3.1-8b-instant
```

## 4. Install
```bash
pip install supabase python-telegram-bot==21.* python-dotenv
```

## 5. Интеграция в main.py
```python
elif args.mode == "hitl":
    from godlocal_hitl.hitl_manager import HITLManager
    from godlocal.agent import GodLocalAgent
    agent = GodLocalAgent(settings)
    manager = HITLManager(agent=agent, cell_id="godlocal-main")
    asyncio.run(manager.start())
```

## 6. Запуск
```bash
python main.py hitl
```

## 7. Архитектура
```
Telegram сообщение
      ↓
HITLManager.run(input)
      ↓
GodLocal ReAct loop
      ↓
create_hitl_task() → Telegram карточка
   ✅ Отправить | ✏️ Изменить | ❌ Отменить
      ↓
on_approve/edit/cancel → resolve Future
      ↓
Cell State L2-L6 обновляется
```
