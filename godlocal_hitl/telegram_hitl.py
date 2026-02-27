"""
GodLocal HITL — Telegram Bot Layer
====================================
Sends task cards to user with inline buttons ✅ / ✏️ / ❌

Requirements: pip install python-telegram-bot==21.*
ENV: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
"""

import os, asyncio, logging
from typing import Callable, Awaitable
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from task_queue import TaskQueue

logger = logging.getLogger("godlocal.hitl.telegram")
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID   = int(os.environ["TELEGRAM_CHAT_ID"])


def _build_keyboard(task_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Отправить",  callback_data=f"approve:{task_id}"),
        InlineKeyboardButton("✏️ Изменить",   callback_data=f"edit:{task_id}"),
        InlineKeyboardButton("❌ Отменить",   callback_data=f"cancel:{task_id}"),
    ]])


def _format_card(task: dict) -> str:
    draft = task.get("draft_data") or {}
    lines = [f"📋 *{task['title']}*"]
    dtype = task.get("draft_type", "")
    if dtype == "email_draft":
        lines += [f"\n*To:* {', '.join(draft.get('to',[]))}", f"*Subject:* {draft.get('subject','—')}", f"\n{draft.get('body','')[:800]}"]
    elif dtype == "social_draft":
        lines += [f"\n*Platform:* {draft.get('platform','?').upper()}", f"\n{draft.get('message','')[:600]}"]
    elif dtype == "calendar_draft":
        lines += [f"\n*Event:* {draft.get('title','—')}", f"*When:* {draft.get('start_time','—')} → {draft.get('end_time','—')}", f"*Attendees:* {', '.join(draft.get('attendees',[]))}"]
    else:
        if task.get("why_human"): lines.append(f"\n_{task['why_human']}_")
    return "\n".join(lines)


class HITLNotifier:
    def __init__(self, task_queue: TaskQueue, on_approve=None, on_edit=None, on_cancel=None):
        self.tq = task_queue
        self.bot = Bot(token=BOT_TOKEN)
        self._on_approve = on_approve
        self._on_edit    = on_edit
        self._on_cancel  = on_cancel
        self._awaiting_edit: dict[int, str] = {}

    async def send_card(self, task_id: str) -> int:
        task = self.tq.get(task_id)
        if not task: raise ValueError(f"Task {task_id} not found")
        msg = await self.bot.send_message(chat_id=CHAT_ID, text=_format_card(task),
                                          parse_mode="Markdown", reply_markup=_build_keyboard(task_id))
        self.tq.bind_telegram(task_id, CHAT_ID, msg.message_id)
        self.tq.set_status(task_id, "awaiting_user_action")
        return msg.message_id

    async def notify(self, text: str):
        await self.bot.send_message(chat_id=CHAT_ID, text=text, parse_mode="Markdown")

    async def _handle_callback(self, update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        action, task_id = query.data.split(":", 1)
        task = self.tq.get(task_id)
        if not task:
            await query.edit_message_text("⚠️ Задача не найдена."); return
        if action == "approve":
            await query.edit_message_text(f"✅ *{task['title']}* — принято", parse_mode="Markdown")
            self.tq.set_status(task_id, "completed", {"user_action": "approved"})
            if self._on_approve: await self._on_approve(task)
        elif action == "edit":
            await query.edit_message_text(f"✏️ *{task['title']}*\n\nНапиши новый вариант:", parse_mode="Markdown")
            self._awaiting_edit[query.message.chat_id] = task_id
        elif action == "cancel":
            await query.edit_message_text(f"❌ *{task['title']}* — отменено", parse_mode="Markdown")
            self.tq.skip(task_id, reason="User cancelled")
            if self._on_cancel: await self._on_cancel(task)

    async def _handle_message(self, update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        chat_id = update.effective_chat.id
        task_id = self._awaiting_edit.pop(chat_id, None)
        if not task_id: return
        new_content = update.message.text
        task = self.tq.get(task_id)
        if not task:
            await update.message.reply_text("⚠️ Задача не найдена."); return
        draft = task.get("draft_data") or {}
        dtype = task.get("draft_type", "")
        if dtype == "email_draft": draft["body"] = new_content
        elif dtype == "social_draft": draft["message"] = new_content
        else: draft["content"] = new_content
        self.tq.bind_draft(task_id, task.get("draft_id") or "", draft)
        self.tq.set_status(task_id, "in_progress", {"user_action": "edited"})
        if self._on_edit: await self._on_edit(task, new_content)
        await self.send_card(task_id)

    async def start_polling(self):
        app = Application.builder().token(BOT_TOKEN).build()
        app.add_handler(CallbackQueryHandler(self._handle_callback))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self._handle_message))
        await app.run_polling()
