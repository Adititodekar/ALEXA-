"""
Smart Alarms, Timers & Reminders Engine for NOVA AI Assistant.
Manages alarms, countdown timers, and contextual reminders with SQLite persistence.
"""

import re
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from .database import db

logger = logging.getLogger(__name__)

class AlarmTimerService:
    def __init__(self):
        self.init_db()

    def init_db(self):
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alarms_timers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    item_type TEXT NOT NULL, -- 'alarm', 'timer', 'reminder'
                    label TEXT NOT NULL,
                    target_time TEXT NOT NULL, -- ISO or HH:MM or countdown end
                    duration_seconds INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'active', -- 'active', 'ringing', 'completed', 'dismissed'
                    recurring TEXT DEFAULT 'none', -- 'none', 'daily', 'weekdays'
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def add_alarm(self, time_str: str, label: str = "Morning Alarm", recurring: str = "none") -> Dict[str, Any]:
        """Sets a smart alarm for a specific time like '07:00' or '7:00 AM'."""
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO alarms_timers (item_type, label, target_time, recurring, status) VALUES (?, ?, ?, ?, 'active')",
                ("alarm", label, time_str, recurring)
            )
            alarm_id = cursor.lastrowid
            conn.commit()

        return {
            "id": alarm_id,
            "item_type": "alarm",
            "label": label,
            "target_time": time_str,
            "recurring": recurring,
            "status": "active"
        }

    def add_timer(self, minutes: float, label: str = "Timer") -> Dict[str, Any]:
        """Sets a countdown timer for N minutes."""
        duration_sec = int(minutes * 60)
        end_time = (datetime.now() + timedelta(seconds=duration_sec)).strftime("%Y-%m-%d %H:%M:%S")

        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO alarms_timers (item_type, label, target_time, duration_seconds, status) VALUES (?, ?, ?, ?, 'active')",
                ("timer", label, end_time, duration_sec)
            )
            timer_id = cursor.lastrowid
            conn.commit()

        return {
            "id": timer_id,
            "item_type": "timer",
            "label": label,
            "target_time": end_time,
            "duration_seconds": duration_sec,
            "minutes": minutes,
            "status": "active"
        }

    def add_reminder(self, text: Optional[str] = None, time_str: Optional[str] = None, title: Optional[str] = None, due_time: Optional[str] = None) -> Dict[str, Any]:
        """Sets a contextual reminder."""
        label = text or title or "Reminder"
        target = time_str or due_time or "Today 18:00"
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO alarms_timers (item_type, label, target_time, status) VALUES (?, ?, ?, 'active')",
                ("reminder", label, target)
            )
            rem_id = cursor.lastrowid
            conn.commit()

        return {
            "id": rem_id,
            "item_type": "reminder",
            "label": label,
            "target_time": target,
            "status": "active"
        }

    def list_items(self) -> List[Dict[str, Any]]:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM alarms_timers WHERE status != 'dismissed' ORDER BY id DESC")
            rows = cursor.fetchall()

        now = datetime.now()
        results = []
        for r in rows:
            item = dict(r)
            if item["item_type"] == "timer":
                try:
                    end_dt = datetime.strptime(item["target_time"], "%Y-%m-%d %H:%M:%S")
                    remaining = int((end_dt - now).total_seconds())
                    item["remaining_seconds"] = max(0, remaining)
                    item["formatted_remaining"] = f"{remaining // 60}:{remaining % 60:02d}" if remaining > 0 else "00:00"
                    if remaining <= 0 and item["status"] == "active":
                        item["status"] = "ringing"
                except Exception:
                    item["remaining_seconds"] = 0
                    item["formatted_remaining"] = "00:00"
            results.append(item)
        return results

    def delete_item(self, item_id: int) -> bool:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM alarms_timers WHERE id = ?", (item_id,))
            conn.commit()
            return cursor.rowcount > 0

    def dismiss_item(self, item_id: int) -> bool:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE alarms_timers SET status = 'dismissed' WHERE id = ?", (item_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_all(self) -> Dict[str, Any]:
        items = self.list_items()
        return {
            "alarms": [i for i in items if i["item_type"] == "alarm"],
            "timers": [i for i in items if i["item_type"] == "timer"],
            "reminders": [i for i in items if i["item_type"] == "reminder"],
            "all_items": items
        }

alarm_timer_service = AlarmTimerService()
