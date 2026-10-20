"""
Planner & Deadline Reminder Engine for Nova AI Assistant.
Extracts deadlines from conversation, manages daily agenda, and computes countdown alerts.
"""

import sqlite3
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "nova_planner.db")

class Planner:
    def __init__(self):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        self._init_db()
        self._seed_default_sample()

    def _get_connection(self):
        return sqlite3.connect(DB_PATH)

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS deadlines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    due_date TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    priority TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversation_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    note TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def _seed_default_sample(self):
        """Seeds initial deadlines if table is empty."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM deadlines")
            if cursor.fetchone()[0] == 0:
                tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d 17:00")
                in_three_days = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d 23:59")
                cursor.execute("""
                    INSERT INTO deadlines (title, due_date, category, priority)
                    VALUES 
                    (?, ?, 'Assignment', 'high'),
                    (?, ?, 'Project', 'urgent')
                """, ("AI Machine Learning Assignment Submission", tomorrow, "Final Term Capstone Report Submission", in_three_days))
                conn.commit()

    def add_deadline(self, title: str, due_date: str, category: str = "general", priority: str = "medium") -> Dict[str, Any]:
        """Adds a new submission deadline."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO deadlines (title, due_date, category, priority)
                VALUES (?, ?, ?, ?)
            """, (title, due_date, category, priority))
            conn.commit()
            new_id = cursor.lastrowid

        return {
            "id": new_id,
            "title": title,
            "due_date": due_date,
            "category": category,
            "priority": priority,
            "status": "pending"
        }

    def get_deadlines(self) -> List[Dict[str, Any]]:
        """Returns all pending and completed deadlines with status."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, due_date, category, priority, status FROM deadlines ORDER BY due_date ASC")
            rows = cursor.fetchall()

        deadlines = []
        now = datetime.now()
        for r in rows:
            d_id, title, due_str, cat, prio, status = r
            time_left_str = "Scheduled"
            urgency = "normal"
            try:
                # Attempt to parse date
                due_dt = datetime.strptime(due_str, "%Y-%m-%d %H:%M")
                diff = due_dt - now
                if diff.total_seconds() < 0:
                    time_left_str = "⚠️ OVERDUE"
                    urgency = "overdue"
                elif diff.days == 0:
                    hours = int(diff.seconds // 3600)
                    time_left_str = f"Due today in {hours}h"
                    urgency = "high"
                elif diff.days == 1:
                    time_left_str = "Due tomorrow"
                    urgency = "medium"
                else:
                    time_left_str = f"Due in {diff.days} days"
            except Exception:
                time_left_str = due_str

            deadlines.append({
                "id": d_id,
                "title": title,
                "due_date": due_str,
                "category": cat,
                "priority": prio,
                "status": status,
                "countdown": time_left_str,
                "urgency": urgency
            })
        return deadlines

    def complete_deadline(self, deadline_id: int) -> bool:
        """Marks a deadline as completed."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE deadlines SET status = 'completed' WHERE id = ?", (deadline_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_deadline(self, deadline_id: int) -> bool:
        """Permanently removes a deadline."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM deadlines WHERE id = ?", (deadline_id,))
            conn.commit()
            return cursor.rowcount > 0

    def record_conversation_note(self, note: str):
        """Records a habit/task mentioned in conversation."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO conversation_notes (note) VALUES (?)", (note,))
            conn.commit()

    def generate_daily_plan(self) -> Dict[str, Any]:
        """
        Synthesizes conversation history and deadlines into a complete daily schedule.
        """
        deadlines = self.get_deadlines()
        urgent_items = [d for d in deadlines if d["urgency"] in ("high", "overdue", "urgent") and d["status"] != "completed"]

        schedule_blocks = [
            {"time": "08:00 AM - 09:00 AM", "activity": "Morning Focus & Review Day Goals", "type": "routine"},
            {"time": "09:30 AM - 12:30 PM", "activity": f"Deep Work Block ({urgent_items[0]['title'] if urgent_items else 'Primary Projects'})", "type": "focus"},
            {"time": "12:30 PM - 01:30 PM", "activity": "Healthy Lunch & Screen Break (Digital Wellbeing)", "type": "health"},
            {"time": "02:00 PM - 04:30 PM", "activity": "Submissions, Research & Communication Tasks", "type": "work"},
            {"time": "05:00 PM - 06:00 PM", "activity": "Outdoor Walk / Fitness & Reset", "type": "wellness"},
            {"time": "07:30 PM - 09:00 PM", "activity": "Evening Review & Next-Day Preparation", "type": "planning"}
        ]

        return {
            "date": datetime.now().strftime("%A, %B %d, %Y"),
            "schedule": schedule_blocks,
            "urgent_deadlines_count": len(urgent_items),
            "urgent_deadlines": urgent_items,
            "motivational_quote": "Focus on progress, not perfection. One task at a time!"
        }
