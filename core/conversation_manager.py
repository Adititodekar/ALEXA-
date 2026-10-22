"""
Multi-Turn Conversation & Session Manager for NOVA AI Assistant.
Persists chat sessions, conversation threads, and message history to SQLite.
Allows switching conversations, creating new chats, renaming, and deleting threads.
"""

import json
import uuid
import logging
from typing import Dict, Any, List, Optional
from core.database import db

logger = logging.getLogger(__name__)


class ConversationManager:
    def __init__(self):
        self.db = db

    def list_conversations(self) -> List[Dict[str, Any]]:
        """Returns all saved conversations ordered by latest activity."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                GROUP BY c.id
                ORDER BY c.updated_at DESC
            """)
            rows = cursor.fetchall()

        return [
            {
                "id": r["id"],
                "title": r["title"],
                "message_count": r["message_count"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            }
            for r in rows
        ]

    def create_conversation(self, title: str = "New Conversation") -> Dict[str, Any]:
        """Creates a new conversation thread."""
        conv_id = f"conv-{uuid.uuid4().hex[:8]}"
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO conversations (id, title)
                VALUES (?, ?)
            """, (conv_id, title.strip()))
            conn.commit()

        logger.info("Created conversation thread %s: '%s'", conv_id, title)
        return {"id": conv_id, "title": title}

    def get_messages(self, conversation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns messages in a conversation thread."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, conversation_id, role, content, payload_json, created_at
                FROM messages
                WHERE conversation_id = ?
                ORDER BY id ASC
                LIMIT ?
            """, (conversation_id, limit))
            rows = cursor.fetchall()

        messages = []
        for r in rows:
            payload = None
            if r["payload_json"]:
                try:
                    payload = json.loads(r["payload_json"])
                except Exception:
                    pass
            messages.append({
                "id": r["id"],
                "role": r["role"],
                "content": r["content"],
                "payload": payload,
                "created_at": r["created_at"]
            })
        return messages

    def get_recent_messages(self, conversation_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Returns the latest messages in chronological order."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, conversation_id, role, content, payload_json, created_at
                FROM messages
                WHERE conversation_id = ?
                ORDER BY id DESC
                LIMIT ?
            """, (conversation_id, limit))
            rows = list(reversed(cursor.fetchall()))

        messages = []
        for r in rows:
            payload = None
            if r["payload_json"]:
                try:
                    payload = json.loads(r["payload_json"])
                except Exception:
                    pass
            messages.append({
                "id": r["id"],
                "role": r["role"],
                "content": r["content"],
                "payload": payload,
                "created_at": r["created_at"]
            })
        return messages

    def get_recent_user_messages(self, since_timestamp: str, limit: int = 500) -> List[Dict[str, Any]]:
        """Returns recent user turns across all conversations in chronological order."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, conversation_id, content, created_at FROM messages "
                "WHERE role = 'user' AND created_at >= ? ORDER BY id ASC LIMIT ?",
                (since_timestamp, limit)
            )
            rows = cursor.fetchall()
        return [
            {"id": row["id"], "conversation_id": row["conversation_id"], "content": row["content"], "created_at": row["created_at"]}
            for row in rows
        ]

    def append_message(self, conversation_id: str, role: str, content: str, payload: Optional[Dict[str, Any]] = None) -> int:
        """Appends a user or assistant message to the thread."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            # Ensure conversation exists
            cursor.execute("SELECT id FROM conversations WHERE id = ?", (conversation_id,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO conversations (id, title) VALUES (?, ?)", (conversation_id, content[:30] or "Conversation"))

            cursor.execute("""
                INSERT INTO messages (conversation_id, role, content, payload_json)
                VALUES (?, ?, ?, ?)
            """, (conversation_id, role, content, json.dumps(payload) if payload else None))
            new_id = cursor.lastrowid

            cursor.execute("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (conversation_id,))
            conn.commit()

        return new_id

    def rename_conversation(self, conversation_id: str, new_title: str) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_title.strip(), conversation_id))
            conn.commit()
            return cursor.rowcount > 0

    def delete_conversation(self, conversation_id: str) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
            cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
            conn.commit()
            return cursor.rowcount > 0


conversation_mgr = ConversationManager()
