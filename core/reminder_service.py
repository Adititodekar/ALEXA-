"""
Reminders & Scheduled Automation Engine for NOVA AI Assistant.
Manages persistent reminders, due checks, recurring schedules, and delivery tracking.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import logging
from core.database import db

logger = logging.getLogger(__name__)


class ReminderService:
    def __init__(self):
        self.db = db

    def add_reminder(self, title: str, due_time: str, recurring: str = "none") -> Dict[str, Any]:
        """Creates a new persistent reminder."""
        clean_due = due_time.strip().replace("T", " ")
        if len(clean_due) == 10 and clean_due.count("-") == 2:
            clean_due = f"{clean_due} 18:00"
        clean_title = title.strip()
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, title, due_time, recurring, status, delivered FROM reminders "
                "WHERE lower(trim(title)) = lower(trim(?)) AND due_time = ? AND status = 'pending' "
                "ORDER BY id DESC LIMIT 1",
                (clean_title, clean_due)
            )
            existing = cursor.fetchone()
            if existing:
                return {
                    "id": existing["id"], "title": existing["title"], "due_time": existing["due_time"],
                    "recurring": existing["recurring"], "status": existing["status"],
                    "delivered": bool(existing["delivered"]), "already_exists": True
                }
            cursor.execute("""
                INSERT INTO reminders (title, due_time, recurring, status, delivered)
                VALUES (?, ?, ?, 'pending', 0)
            """, (clean_title, clean_due, recurring))
            conn.commit()
            new_id = cursor.lastrowid

        return {
            "id": new_id,
            "title": clean_title,
            "due_time": clean_due,
            "recurring": recurring,
            "status": "pending",
            "delivered": False
        }

    def list_reminders(self) -> List[Dict[str, Any]]:
        """Returns all reminders with delivery status."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, due_time, recurring, status, delivered, created_at FROM reminders ORDER BY due_time ASC")
            rows = cursor.fetchall()

        now = datetime.now()
        reminders = []
        for r in rows:
            is_due = False
            raw_due = (r["due_time"] or "").replace("T", " ")
            try:
                if len(raw_due) >= 16:
                    dt = datetime.strptime(raw_due[:16], "%Y-%m-%d %H:%M")
                elif len(raw_due) == 10:
                    dt = datetime.strptime(raw_due, "%Y-%m-%d")
                else:
                    dt = None
                if dt and dt <= now and r["status"] == "pending":
                    is_due = True
            except Exception:
                pass

            reminders.append({
                "id": r["id"],
                "title": r["title"],
                "due_time": r["due_time"],
                "recurring": r["recurring"],
                "status": r["status"],
                "delivered": bool(r["delivered"]),
                "is_due_now": is_due,
                "created_at": r["created_at"]
            })
        return reminders

    def complete_reminder(self, reminder_id: int) -> bool:
        """Marks reminder as delivered / completed."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE reminders SET status = 'delivered', delivered = 1 WHERE id = ?", (reminder_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_reminder(self, reminder_id: int) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
            conn.commit()
            return cursor.rowcount > 0


reminder_service = ReminderService()
