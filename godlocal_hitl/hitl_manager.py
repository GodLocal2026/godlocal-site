"""
GodLocal HITL Manager — Central Orchestrator
=============================================
Connects GodLocal agent with TaskQueue + HITLNotifier + CellState.

Usage:
    manager = HITLManager(agent=my_agent, cell_id="godlocal-main")
    await manager.start()  # starts Telegram bot polling
"""
import asyncio, logging, os
from task_queue import TaskQueue
from telegram_hitl import HITLNotifier
from cell_state import CellState

logger = logging.getLogger("godlocal.hitl.manager")


class HITLManager:
    def __init__(self, agent, cell_id="default"):
        self.agent    = agent
        self.cell_id  = cell_id
        self.tq       = TaskQueue(cell_id=cell_id)
        self.cs       = CellState(cell_id=cell_id, llm_summarize_fn=self._llm_summarize)
        self.notifier = HITLNotifier(self.tq,
            on_approve=self._on_approve,
            on_edit=self._on_edit,
            on_cancel=self._on_cancel)
        self._pending: dict[str, asyncio.Future] = {}

    async def start(self):
        self.cs.load()
        await self.notifier.start_polling()

    async def run(self, user_input: str) -> str:
        self.cs.load()
        self.cs.add_turn("user", user_input)
        chunks = []
        async for chunk in self.agent.chat_stream(user_input):
            chunks.append(chunk)
        response = "".join(chunks)
        self.cs.add_turn("assistant", response)
        self.cs.save()
        if len(self.cs._state.get("raw_turns") or []) >= 20:
            await self.cs.compress(); self.cs.save()
        return response

    async def create_hitl_task(self, title, draft_type, draft_data, why_human="", action="") -> str:
        task = self.tq.create(title=title, executor="human", action=action,
                              why_human=why_human, draft_data=draft_data, draft_type=draft_type)
        task_id = task["id"]
        await self.notifier.send_card(task_id)
        future = asyncio.get_event_loop().create_future()
        self._pending[task_id] = future
        return task_id

    async def wait_for_approval(self, task_id: str, timeout=3600.0) -> dict:
        future = self._pending.get(task_id)
        if not future: raise ValueError(f"No pending callback for {task_id}")
        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            self.tq.skip(task_id, reason="Timeout")
            return {"user_action": "timeout"}

    async def _on_approve(self, task):
        await self.notifier.notify(f"✅ *{task['title']}* выполняется…")
        self._resolve(task["id"], {"user_action": "approved"})

    async def _on_edit(self, task, new_content):
        self._resolve(task["id"], {"user_action": "edited", "new_content": new_content})

    async def _on_cancel(self, task):
        self._resolve(task["id"], {"user_action": "cancelled"})

    def _resolve(self, task_id, result):
        f = self._pending.pop(task_id, None)
        if f and not f.done(): f.set_result(result)

    async def _llm_summarize(self, prompt: str) -> str:
        chunks = []
        async for chunk in self.agent.chat_stream(prompt): chunks.append(chunk)
        return "".join(chunks)

    async def sleep(self) -> str:
        result = await self.agent.sleep()
        self.cs.load(); await self.cs.compress(); self.cs.save()
        await self.notifier.notify("😴 *GodLocal спит* — память сжата.")
        return result


async def post_social_hitl(manager, platform, message, title=None) -> dict:
    task_id = await manager.create_hitl_task(
        title=title or f"Опубликовать в {platform.upper()}",
        draft_type="social_draft",
        draft_data={"platform": platform, "message": message},
        why_human="Проверьте перед публикацией")
    return await manager.wait_for_approval(task_id)


async def send_email_hitl(manager, to, subject, body, title="Отправить email") -> dict:
    task_id = await manager.create_hitl_task(
        title=title, draft_type="email_draft",
        draft_data={"to": to, "subject": subject, "body": body},
        why_human="Требует одобрения перед отправкой")
    return await manager.wait_for_approval(task_id)
