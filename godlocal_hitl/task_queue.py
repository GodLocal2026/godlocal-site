"""
GodLocal HITL — Task Queue (Supabase-backed)
============================================
Manages persistent task queue for HITL and AI tasks.

Supabase SQL schema (run once):
---------------------------------
create table tasks (
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    executor    text not null check (executor in ('ai','human')),
    status      text not null default 'pending'
                check (status in ('pending','in_progress','awaiting_user_action',
                                  'completed','failed','skipped','paused')),
    action      text,
    why_human   text,
    draft_id    uuid,
    draft_type  text,
    draft_data  jsonb,
    result      jsonb,
    tg_message_id bigint,
    tg_chat_id    bigint,
    trigger_type  text,
    trigger_at    timestamptz,
    cell_id     uuid,
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);
create index tasks_status_idx on tasks(status);
create index tasks_cell_idx   on tasks(cell_id);
---------------------------------
"""

import os
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client


def _client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


class TaskQueue:
    def __init__(self, cell_id: str | None = None):
        self.db = _client()
        self.cell_id = cell_id

    def create(self, title, executor="ai", action=None, why_human=None,
               draft_data=None, draft_type=None, trigger_type=None, trigger_at=None):
        row = {"id": str(uuid.uuid4()), "title": title, "executor": executor,
               "status": "pending", "action": action, "why_human": why_human,
               "draft_data": draft_data, "draft_type": draft_type,
               "trigger_type": trigger_type,
               "trigger_at": trigger_at.isoformat() if trigger_at else None,
               "cell_id": self.cell_id}
        return self.db.table("tasks").insert(row).execute().data[0]

    def batch_create(self, tasks):
        rows = [{"id": str(uuid.uuid4()), "title": t["title"],
                 "executor": t.get("executor","ai"), "status": "pending",
                 "action": t.get("action"), "why_human": t.get("why_human"),
                 "draft_data": t.get("draft_data"), "draft_type": t.get("draft_type"),
                 "cell_id": self.cell_id} for t in tasks]
        return self.db.table("tasks").insert(rows).execute().data

    def get(self, task_id):
        res = self.db.table("tasks").select("*").eq("id", task_id).limit(1).execute()
        return res.data[0] if res.data else None

    def list_pending(self, executor=None):
        q = self.db.table("tasks").select("*").in_("status", ["pending","in_progress"])
        if self.cell_id: q = q.eq("cell_id", self.cell_id)
        if executor: q = q.eq("executor", executor)
        return q.order("created_at").execute().data

    def list_awaiting_human(self):
        q = self.db.table("tasks").select("*").eq("status","awaiting_user_action").eq("executor","human")
        if self.cell_id: q = q.eq("cell_id", self.cell_id)
        return q.order("created_at").execute().data

    def update(self, task_id, **fields):
        res = self.db.table("tasks").update(fields).eq("id", task_id).execute()
        return res.data[0] if res.data else {}

    def set_status(self, task_id, status, result=None):
        fields = {"status": status}
        if result: fields["result"] = result
        return self.update(task_id, **fields)

    def bind_telegram(self, task_id, chat_id, message_id):
        return self.update(task_id, tg_chat_id=chat_id, tg_message_id=message_id)

    def bind_draft(self, task_id, draft_id, draft_data):
        return self.update(task_id, draft_id=draft_id, draft_data=draft_data)

    def skip(self, task_id, reason=""):
        return self.update(task_id, status="skipped", result={"reason": reason})

    def complete(self, task_id, result=None):
        return self.set_status(task_id, "completed", result)

    def fail(self, task_id, error):
        return self.update(task_id, status="failed", result={"error": error})
