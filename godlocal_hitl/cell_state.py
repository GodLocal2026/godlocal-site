"""
GodLocal HITL — Cell State (L2/L3/L5/L6 Compression)
======================================================
Supabase SQL:
  create table cell_states (
      id uuid primary key default gen_random_uuid(),
      cell_id text not null unique,
      l2_history text, l3_live jsonb, l5_intent jsonb,
      l6_actions jsonb, raw_turns jsonb,
      updated_at timestamptz default now()
  );
"""
import os, json, logging
from datetime import datetime, timezone
from supabase import create_client, Client

logger = logging.getLogger("godlocal.hitl.cell_state")
MAX_RAW_TURNS = 20

def _client(): return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

class CellState:
    def __init__(self, cell_id: str, llm_summarize_fn=None):
        self.cell_id = cell_id
        self.db = _client()
        self._summarize = llm_summarize_fn
        self._state = {}

    def load(self):
        res = self.db.table("cell_states").select("*").eq("cell_id", self.cell_id).limit(1).execute()
        self._state = res.data[0] if res.data else {
            "cell_id": self.cell_id, "l2_history": "", "l3_live": {},
            "l5_intent": {"goals":[], "preferences":{}},
            "l6_actions": {"completed":[], "next":[]}, "raw_turns": []}
        return self._state

    def save(self):
        self._state["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.db.table("cell_states").upsert(self._state).execute()

    def add_turn(self, role, content):
        turns = self._state.get("raw_turns") or []
        turns.append({"role": role, "content": content[:2000], "at": datetime.now(timezone.utc).isoformat()})
        self._state["raw_turns"] = turns[-MAX_RAW_TURNS:]

    async def compress(self):
        if not self._summarize: return
        turns = self._state.get("raw_turns") or []
        if len(turns) < 5: return
        turns_text = "\n".join(f"[{t['role'].upper()}]: {t['content']}" for t in turns)
        prompt = f"""Compress into JSON layers. Output ONLY valid JSON:
{{
  "l2_history": "factual events + decisions (append to: {self._state.get('l2_history','')[:500]})",
  "l3_live": {{"project": {{"status":"...", "done":"...", "blocker":"...", "next":"..."}}}},
  "l5_intent": {{"goals":["..."], "preferences":{{}}}},
  "l6_actions": {{"completed":["..."], "next":[{{"label":"(AI)","action":"..."}}]}}
}}

TURNS:
{turns_text[:3000]}"""
        raw = await self._summarize(prompt)
        try:
            parsed = json.loads(raw[raw.find("{"):raw.rfind("}")+1])
            self._state.update({k: parsed[k] for k in ["l2_history","l3_live","l5_intent","l6_actions"] if k in parsed})
            self._state["raw_turns"] = []
        except Exception as e:
            logger.error("Compression parse error: %s", e)

    def mark_completed(self, action_label):
        l6 = self._state.get("l6_actions") or {"completed":[], "next":[]}
        l6["completed"].append(action_label)
        l6["next"] = [n for n in l6.get("next",[]) if n.get("action") != action_label]
        self._state["l6_actions"] = l6

    def add_next_action(self, label, action):
        l6 = self._state.get("l6_actions") or {"completed":[], "next":[]}
        l6.setdefault("next",[]).append({"label": label, "action": action})
        self._state["l6_actions"] = l6

    def render(self):
        s = self._state
        return f"""## CELL STATE
L2: {s.get('l2_history','None')}
L3: {json.dumps(s.get('l3_live',{}), ensure_ascii=False)}
L5: {json.dumps(s.get('l5_intent',{}), ensure_ascii=False)}
L6: {json.dumps(s.get('l6_actions',{}), ensure_ascii=False)}"""
