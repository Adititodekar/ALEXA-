"""
Planner & Deadline Reminder Engine for Nova AI Assistant.
Extracts deadlines from conversation, manages daily agenda, detects conflicts,
and provides full CRUD task management backed by SQLite.
"""

import sqlite3
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import os
import logging
from core.database import db

logger = logging.getLogger(__name__)

class Planner:
    def __init__(self):
        self.db = db

    def _get_connection(self):
        return self.db.get_connection()

    def add_deadline(self, title: str, due_date: str, category: str = "general", priority: str = "medium", estimated_hours: float = 2.0, source_doc: Optional[str] = None) -> Dict[str, Any]:
        """Adds a new submission deadline / task."""
        # Sanitize and ensure format if simple date provided
        clean_due = due_date.strip()
        if "T" in clean_due:
            clean_due = clean_due.replace("T", " ", 1)
        if len(clean_due) == 10 and clean_due.count("-") == 2:
            clean_due = f"{clean_due} 18:00"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, title, due_date, category, priority, status, estimated_hours, source_doc "
                "FROM deadlines WHERE lower(trim(title)) = lower(trim(?)) AND due_date = ? "
                "AND status != 'completed' ORDER BY id DESC LIMIT 1",
                (title, clean_due)
            )
            existing = cursor.fetchone()
            if existing:
                return {
                    "id": existing["id"], "title": existing["title"], "due_date": existing["due_date"],
                    "category": existing["category"], "priority": existing["priority"],
                    "status": existing["status"], "estimated_hours": existing["estimated_hours"],
                    "source_doc": existing["source_doc"], "already_exists": True
                }
            cursor.execute("""
                INSERT INTO deadlines (title, due_date, category, priority, status, estimated_hours, source_doc)
                VALUES (?, ?, ?, ?, 'pending', ?, ?)
            """, (title, clean_due, category, priority, estimated_hours, source_doc))
            conn.commit()
            new_id = cursor.lastrowid

        return {
            "id": new_id,
            "title": title,
            "due_date": clean_due,
            "category": category,
            "priority": priority,
            "status": "pending",
            "estimated_hours": estimated_hours,
            "source_doc": source_doc
        }

    def update_deadline(self, deadline_id: int, title: Optional[str] = None, due_date: Optional[str] = None, category: Optional[str] = None, priority: Optional[str] = None, status: Optional[str] = None, estimated_hours: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Updates fields of an existing task."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, due_date, category, priority, status, estimated_hours FROM deadlines WHERE id = ?", (deadline_id,))
            row = cursor.fetchone()
            if not row:
                return None

            new_title = title if title is not None else row["title"]
            new_due = due_date if due_date is not None else row["due_date"]
            new_cat = category if category is not None else row["category"]
            new_prio = priority if priority is not None else row["priority"]
            new_status = status if status is not None else row["status"]
            new_hours = estimated_hours if estimated_hours is not None else row["estimated_hours"]

            cursor.execute("""
                UPDATE deadlines
                SET title = ?, due_date = ?, category = ?, priority = ?, status = ?, estimated_hours = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_title, new_due, new_cat, new_prio, new_status, new_hours, deadline_id))
            conn.commit()

        return {
            "id": deadline_id,
            "title": new_title,
            "due_date": new_due,
            "category": new_cat,
            "priority": new_prio,
            "status": new_status,
            "estimated_hours": new_hours
        }

    def get_deadlines(self) -> List[Dict[str, Any]]:
        """Returns all pending and completed deadlines with status and countdowns."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, due_date, category, priority, status, estimated_hours, source_doc FROM deadlines ORDER BY due_date ASC")
            rows = cursor.fetchall()

        deadlines = []
        now = datetime.now()
        for r in rows:
            d_id = r["id"]
            title = r["title"]
            due_str = r["due_date"]
            cat = r["category"]
            prio = r["priority"]
            status = r["status"]
            est_hours = r["estimated_hours"] if "estimated_hours" in r.keys() and r["estimated_hours"] else 2.0
            src_doc = r["source_doc"] if "source_doc" in r.keys() else None

            time_left_str = "Scheduled"
            urgency = "normal"
            try:
                # Attempt to parse date
                if len(due_str) > 10:
                    due_dt = datetime.strptime(due_str[:16], "%Y-%m-%d %H:%M")
                else:
                    due_dt = datetime.strptime(due_str, "%Y-%m-%d")
                
                diff = due_dt - now
                if status == "completed":
                    time_left_str = "Completed"
                    urgency = "completed"
                elif diff.total_seconds() < 0:
                    time_left_str = "⚠️ OVERDUE"
                    urgency = "overdue"
                elif diff.days == 0:
                    hours = max(1, int(diff.seconds // 3600))
                    time_left_str = f"Due today in {hours}h"
                    urgency = "urgent" if prio == "urgent" else "high"
                elif diff.days == 1:
                    time_left_str = "Due tomorrow"
                    urgency = "high" if prio in ("high", "urgent") else "medium"
                else:
                    time_left_str = f"Due in {diff.days} days"
                    urgency = "medium" if prio in ("high", "urgent") else "normal"
            except Exception:
                time_left_str = due_str

            deadlines.append({
                "id": d_id,
                "title": title,
                "due_date": due_str,
                "category": cat,
                "priority": prio,
                "status": status,
                "estimated_hours": est_hours,
                "source_doc": src_doc,
                "countdown": time_left_str,
                "urgency": urgency
            })
        return deadlines

    def complete_deadline(self, deadline_id: int) -> bool:
        """Marks a deadline as completed."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE deadlines SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (deadline_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_deadline(self, deadline_id: int) -> bool:
        """Permanently removes a deadline."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM deadlines WHERE id = ?", (deadline_id,))
            conn.commit()
            return cursor.rowcount > 0

    def detect_conflicts(self) -> List[Dict[str, Any]]:
        """
        Analyzes upcoming tasks to detect:
        1. Clustered deadlines within a 24-hour window.
        2. Overloaded days exceeding 6 hours of estimated study/work.
        """
        deadlines = [d for d in self.get_deadlines() if d["status"] != "completed"]
        conflicts = []

        # Group by day
        day_map: Dict[str, List[Dict[str, Any]]] = {}
        for d in deadlines:
            day_key = d["due_date"][:10]
            if day_key not in day_map:
                day_map[day_key] = []
            day_map[day_key].append(d)

        for day, items in day_map.items():
            total_hours = sum(item.get("estimated_hours", 2.0) for item in items)
            if len(items) > 1 and total_hours >= 5.0:
                conflicts.append({
                    "type": "overlap_conflict",
                    "date": day,
                    "items": [i["title"] for i in items],
                    "total_hours": total_hours,
                    "severity": "high" if total_hours > 7 else "medium",
                    "message": f"{len(items)} major tasks scheduled on {day} totaling ~{total_hours:.1f} hours of work."
                })
            elif total_hours > 6.0:
                conflicts.append({
                    "type": "overloaded_day",
                    "date": day,
                    "items": [i["title"] for i in items],
                    "total_hours": total_hours,
                    "severity": "high",
                    "message": f"Overloaded day on {day}: {total_hours:.1f} hours estimated, which risks fatigue."
                })

        return conflicts

    def record_conversation_note(self, note: str):
        """Records a habit/task mentioned in conversation."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO conversation_notes (note) VALUES (?)", (note,))
            conn.commit()

    def generate_daily_plan(self) -> Dict[str, Any]:
        """
        Synthesizes conversation history, deadlines, and detected conflicts into a complete daily schedule.
        """
        deadlines = self.get_deadlines()
        urgent_items = [d for d in deadlines if d["urgency"] in ("high", "urgent", "overdue") and d["status"] != "completed"]
        conflicts = self.detect_conflicts()

        first_task = urgent_items[0]["title"] if urgent_items else "Primary Projects & Research"
        second_task = urgent_items[1]["title"] if len(urgent_items) > 1 else "Assignment Review & Synthesis"

        schedule_blocks = [
            {"time": "08:00 AM - 09:00 AM", "activity": "Morning Focus, Healthy Breakfast & Goal Review", "type": "routine"},
            {"time": "09:30 AM - 12:30 PM", "activity": f"Deep Work Block 1: {first_task}", "type": "focus"},
            {"time": "12:30 PM - 01:30 PM", "activity": "Healthy Lunch & Screen Break (Digital Wellbeing)", "type": "health"},
            {"time": "02:00 PM - 04:30 PM", "activity": f"Deep Work Block 2: {second_task}", "type": "work"},
            {"time": "05:00 PM - 06:00 PM", "activity": "Outdoor Walk / Fitness & Reset", "type": "wellness"},
            {"time": "07:30 PM - 09:00 PM", "activity": "Evening Review, Conflict Resolution & Next-Day Preparation", "type": "planning"}
        ]

        return {
            "date": datetime.now().strftime("%A, %B %d, %Y"),
            "schedule": schedule_blocks,
            "urgent_deadlines_count": len(urgent_items),
            "urgent_deadlines": urgent_items,
            "conflicts_detected": conflicts,
            "motivational_quote": "Focus on progress, not perfection. Step-by-step makes mastery!"
        }
