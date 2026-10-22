"""
Database management and persistent storage layer for NOVA AI Assistant.
Manages SQLite connection, schema migrations, and persistent tables for:
- Conversations and Message history
- Tasks and Submission Deadlines (full CRUD)
- Autonomous Missions and Step Execution records
- Real-time Tool Activity and Audit Logs
- User-Controlled Persistent Memory (Facts, Preferences, Routines)
- Reminders and Scheduled Notifications
- Smart Home Device States (persistent across restarts)
- Uploaded Multimodal Files and Extracted Summaries
- Saved Workflows (Personal Skill Builder)
- User Preferences and Trust Permissions
"""

import sqlite3
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "nova_planner.db")


class DatabaseManager:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_schema()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_schema(self):
        """Initializes tables and ensures non-destructive migrations."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Existing Deadlines & Tasks Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS deadlines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    due_date TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    priority TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'pending',
                    estimated_hours REAL DEFAULT 2.0,
                    source_doc TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Add missing columns to deadlines if they were from older schema
            cursor.execute("PRAGMA table_info(deadlines)")
            existing_cols = [col[1] for col in cursor.fetchall()]
            if "estimated_hours" not in existing_cols:
                cursor.execute("ALTER TABLE deadlines ADD COLUMN estimated_hours REAL DEFAULT 2.0")
            if "source_doc" not in existing_cols:
                cursor.execute("ALTER TABLE deadlines ADD COLUMN source_doc TEXT DEFAULT NULL")
            if "updated_at" not in existing_cols:
                cursor.execute("ALTER TABLE deadlines ADD COLUMN updated_at TIMESTAMP DEFAULT NULL")

            # 2. Conversations Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 3. Messages Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    payload_json TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                )
            """)

            # 4. Autonomous Missions Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS missions (
                    id TEXT PRIMARY KEY,
                    goal TEXT NOT NULL,
                    status TEXT NOT NULL, -- 'pending_review', 'running', 'completed', 'failed', 'cancelled'
                    plan_json TEXT NOT NULL,
                    summary TEXT DEFAULT NULL,
                    conversation_id TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 5. Mission Steps Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mission_steps (
                    id TEXT PRIMARY KEY,
                    mission_id TEXT NOT NULL,
                    step_index INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    tool_name TEXT NOT NULL,
                    tool_args_json TEXT NOT NULL,
                    required_permission TEXT DEFAULT 'read_only', -- 'read_only', 'state_changing'
                    status TEXT NOT NULL, -- 'pending', 'awaiting_approval', 'running', 'succeeded', 'failed', 'skipped', 'cancelled'
                    result_json TEXT DEFAULT NULL,
                    error_message TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
                )
            """)

            # 6. Tool Activity & Audit Logs Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tool_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    mission_id TEXT DEFAULT NULL,
                    tool_name TEXT NOT NULL,
                    sanitized_args_json TEXT NOT NULL,
                    status TEXT NOT NULL, -- 'pending', 'running', 'succeeded', 'failed', 'rejected'
                    duration_ms REAL DEFAULT 0,
                    result_summary TEXT DEFAULT NULL,
                    error_detail TEXT DEFAULT NULL,
                    requires_approval INTEGER DEFAULT 0,
                    verified INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 7. User-Controlled Persistent Memory Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    category TEXT DEFAULT 'general', -- 'preference', 'fact', 'routine', 'constraint', 'project'
                    is_fact INTEGER DEFAULT 1, -- 1 = confirmed fact, 0 = inferred/suggestion
                    is_pinned INTEGER DEFAULT 0,
                    source TEXT DEFAULT 'user', -- 'user', 'conversation', 'document'
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 8. Reminders Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    due_time TEXT NOT NULL,
                    recurring TEXT DEFAULT 'none', -- 'none', 'daily', 'weekly'
                    status TEXT DEFAULT 'pending', -- 'pending', 'delivered', 'dismissed'
                    delivered INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 9. Persistent Smart Home Devices Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS smart_devices (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    device_type TEXT NOT NULL,
                    is_on INTEGER DEFAULT 0,
                    watts INTEGER DEFAULT 10,
                    room TEXT DEFAULT 'General',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 10. Uploaded Multimodal Files & Knowledge Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS uploaded_files (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    storage_path TEXT NOT NULL,
                    summary TEXT DEFAULT NULL,
                    extracted_text TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 11. Saved Workflows / Skill Builder Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS saved_workflows (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    trigger_phrase TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    steps_json TEXT NOT NULL,
                    enabled INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 12. User Preferences & Capability Permissions Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                    pref_key TEXT PRIMARY KEY,
                    value_json TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Default seed for Smart Home Devices if empty
            cursor.execute("SELECT COUNT(*) FROM smart_devices")
            if cursor.fetchone()[0] == 0:
                default_devices = [
                    ("living_room_light", "Living Room Light", "light", 1, 9, "Living Room"),
                    ("bedroom_fan", "Bedroom Fan", "fan", 0, 55, "Bedroom"),
                    ("television", "Smart Television", "tv", 0, 80, "Living Room"),
                    ("kitchen_ac", "Kitchen Cooler / AC", "ac", 0, 120, "Kitchen")
                ]
                cursor.executemany("""
                    INSERT INTO smart_devices (id, name, device_type, is_on, watts, room)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, default_devices)

            # Default user preferences
            cursor.execute("SELECT COUNT(*) FROM user_preferences")
            if cursor.fetchone()[0] == 0:
                default_prefs = [
                    ("memory_enabled", json.dumps(True)),
                    ("proactive_assistance", json.dumps(True)),
                    ("require_approval_state_changing", json.dumps(True)),
                    ("reduced_motion", json.dumps(False)),
                    ("voice_rate", json.dumps(1.0)),
                    ("language", json.dumps("en-US")),
                    ("focus_mode", json.dumps(False)),
                    ("emergency_contacts", json.dumps([
                        {"name": "Emergency Services", "phone": "112", "type": "public"},
                        {"name": "Emergency Contact (Family)", "phone": "+1-555-0199", "type": "personal"}
                    ]))
                ]
                cursor.executemany("""
                    INSERT INTO user_preferences (pref_key, value_json)
                    VALUES (?, ?)
                """, default_prefs)

            # Default sample memories
            cursor.execute("SELECT COUNT(*) FROM memories")
            if cursor.fetchone()[0] == 0:
                default_mems = [
                    ("Prefers deep work focus blocks in the morning between 9 AM and 12 PM.", "routine", 1, 1, "user"),
                    ("Final semester student working on AI/ML capstone project.", "fact", 1, 1, "user"),
                    ("Prefers high-priority deadline notifications 24 hours in advance.", "preference", 1, 0, "user")
                ]
                cursor.executemany("""
                    INSERT INTO memories (content, category, is_fact, is_pinned, source)
                    VALUES (?, ?, ?, ?, ?)
                """, default_mems)

            # Default conversation if none exists
            cursor.execute("SELECT COUNT(*) FROM conversations")
            if cursor.fetchone()[0] == 0:
                conv_id = "default-session"
                cursor.execute("""
                    INSERT INTO conversations (id, title)
                    VALUES (?, ?)
                """, (conv_id, "Main Assistant Session"))
                cursor.execute("""
                    INSERT INTO messages (conversation_id, role, content)
                    VALUES (?, 'assistant', ?)
                """, (conv_id, "Hello! I am NOVA AI — ALEXA-NEXT 2.0. How can I assist your goals today? You can speak, upload documents, manage smart home IoT, or command Autonomous Missions."))

            conn.commit()
            logger.info("Database schema initialized and verified successfully at %s", self.db_path)


# Singleton database instance
db = DatabaseManager()
