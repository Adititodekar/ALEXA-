"""
Personal Skill Builder & Reusable Workflow Engine for NOVA AI Assistant.
Enables users to create, view, toggle, and trigger reusable automated routines
represented as structured sequences of validated tools.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from core.database import db
from core.mission_engine import mission_engine

logger = logging.getLogger(__name__)


class SkillBuilder:
    def __init__(self):
        self.db = db
        self._seed_default_skills()

    def _seed_default_skills(self):
        """Seeds standard starter skills if empty."""
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM saved_workflows")
                if cursor.fetchone()[0] == 0:
                    default_skills = [
                        (
                            "Weekly Assignment & Deadline Audit",
                            "Review unfinished tasks and audit deadline conflicts",
                            "Inspects all pending deadlines, highlights urgent items, and suggests a balanced study schedule.",
                            json.dumps([
                                {"tool": "list_tasks", "args": {}},
                                {"tool": "get_proactive_insights", "args": {}}
                            ]),
                            1
                        ),
                        (
                            "Nighttime Power Down",
                            "Power down appliances and check energy savings",
                            "Turns off non-essential devices (TV, kitchen cooler) and displays total power reduction.",
                            json.dumps([
                                {"tool": "set_device_state", "args": {"device": "television", "on": False}},
                                {"tool": "set_device_state", "args": {"device": "kitchen_ac", "on": False}},
                                {"tool": "get_energy_summary", "args": {}}
                            ]),
                            1
                        )
                    ]
                    cursor.executemany("""
                        INSERT INTO saved_workflows (title, trigger_phrase, description, steps_json, enabled)
                        VALUES (?, ?, ?, ?, ?)
                    """, default_skills)
                    conn.commit()
        except Exception as exc:
            logger.warning("Error seeding default skills: %s", exc)

    def list_skills(self) -> List[Dict[str, Any]]:
        """Returns all configured user skills."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, trigger_phrase, description, steps_json, enabled, created_at FROM saved_workflows ORDER BY id ASC")
            rows = cursor.fetchall()

        skills = []
        for r in rows:
            skills.append({
                "id": r["id"],
                "title": r["title"],
                "trigger_phrase": r["trigger_phrase"],
                "description": r["description"],
                "steps": json.loads(r["steps_json"]) if r["steps_json"] else [],
                "enabled": bool(r["enabled"]),
                "created_at": r["created_at"]
            })
        return skills

    def create_skill(self, title: str, trigger_phrase: str, description: str, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Creates a new user skill."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO saved_workflows (title, trigger_phrase, description, steps_json, enabled)
                VALUES (?, ?, ?, ?, 1)
            """, (title.strip(), trigger_phrase.strip(), description.strip(), json.dumps(steps)))
            conn.commit()
            new_id = cursor.lastrowid

        return {
            "id": new_id,
            "title": title,
            "trigger_phrase": trigger_phrase,
            "description": description,
            "steps": steps,
            "enabled": True
        }

    def toggle_skill(self, skill_id: int, enabled: bool) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE saved_workflows SET enabled = ? WHERE id = ?", (1 if enabled else 0, skill_id))
            conn.commit()
            return cursor.rowcount > 0

    def delete_skill(self, skill_id: int) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM saved_workflows WHERE id = ?", (skill_id,))
            conn.commit()
            return cursor.rowcount > 0

    def run_skill(self, skill_id: int) -> Dict[str, Any]:
        """Executes a skill by creating and triggering an autonomous mission."""
        skills = [s for s in self.list_skills() if s["id"] == skill_id]
        if not skills:
            return {"ok": False, "error": f"Skill ID {skill_id} not found"}

        sk = skills[0]
        if not sk["enabled"]:
            return {"ok": False, "error": f"Skill '{sk['title']}' is currently disabled."}

        # Create mission from skill steps
        m = mission_engine.create_mission_plan(goal=f"Execute Skill: {sk['title']}")
        # Execute immediately with verification
        res = mission_engine.execute_mission(m["mission_id"], approved=True)
        return {
            "ok": True,
            "skill_id": skill_id,
            "skill_title": sk["title"],
            "mission_result": res
        }


skill_builder = SkillBuilder()
