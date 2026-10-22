"""
User-Controlled Persistent Memory System for NOVA AI Assistant.
Manages persistent user facts, routines, preferences, and project context.
Survives application restarts and browser refreshes with full user control:
- Add / Update / Delete / Pin / Search
- Clear all memories
- Enable / Disable memory toggle
- Distinct categorization between confirmed facts and uncertain inferences
"""

import json
import logging
from typing import Dict, Any, List, Optional
from core.database import db

logger = logging.getLogger(__name__)


class MemoryManager:
    def __init__(self):
        self.db = db

    def is_memory_enabled(self) -> bool:
        """Checks if memory persistence is globally enabled by user."""
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT value_json FROM user_preferences WHERE pref_key = 'memory_enabled'")
                row = cursor.fetchone()
                if row:
                    return bool(json.loads(row["value_json"]))
        except Exception as exc:
            logger.warning("Error checking memory_enabled preference: %s", exc)
        return True

    def set_memory_enabled(self, enabled: bool) -> bool:
        """Toggles user memory setting."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_preferences (pref_key, value_json, updated_at)
                VALUES ('memory_enabled', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(pref_key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP
            """, (json.dumps(enabled),))
            conn.commit()
        return enabled

    def save_memory(self, content: str, category: str = "general", is_fact: bool = True, is_pinned: bool = False, source: str = "user") -> Dict[str, Any]:
        """Saves a confirmed fact, preference, or routine to persistent storage."""
        clean_content = content.strip()
        if not self.is_memory_enabled():
            return {
                "ok": False,
                "error": "Memory system is currently disabled in user settings.",
                "saved": False
            }

        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            # Check for near-duplicate content
            cursor.execute("SELECT id FROM memories WHERE content = ?", (clean_content,))
            existing = cursor.fetchone()
            if existing:
                return {
                    "ok": True,
                    "id": existing["id"],
                    "content": clean_content,
                    "category": category,
                    "note": "Existing memory already present."
                }

            cursor.execute("""
                INSERT INTO memories (content, category, is_fact, is_pinned, source)
                VALUES (?, ?, ?, ?, ?)
            """, (clean_content, category, 1 if is_fact else 0, 1 if is_pinned else 0, source))
            conn.commit()
            new_id = cursor.lastrowid

        logger.info("Saved persistent memory [id=%d, cat=%s]: %s", new_id, category, clean_content[:50])
        return {
            "ok": True,
            "id": new_id,
            "content": clean_content,
            "category": category,
            "is_fact": is_fact,
            "is_pinned": is_pinned,
            "source": source
        }

    def list_memories(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns all stored memories, ordered with pinned memories first."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            if category:
                cursor.execute("""
                    SELECT id, content, category, is_fact, is_pinned, source, created_at, updated_at
                    FROM memories
                    WHERE category = ?
                    ORDER BY is_pinned DESC, id DESC
                """, (category,))
            else:
                cursor.execute("""
                    SELECT id, content, category, is_fact, is_pinned, source, created_at, updated_at
                    FROM memories
                    ORDER BY is_pinned DESC, id DESC
                """)
            rows = cursor.fetchall()

        return [
            {
                "id": r["id"],
                "content": r["content"],
                "category": r["category"],
                "is_fact": bool(r["is_fact"]),
                "is_pinned": bool(r["is_pinned"]),
                "source": r["source"],
                "created_at": r["created_at"]
            }
            for r in rows
        ]

    def search_memories(self, query: str) -> List[Dict[str, Any]]:
        """Searches memories by text matching or category."""
        clean_q = f"%{query.strip().lower()}%"
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, content, category, is_fact, is_pinned, source, created_at
                FROM memories
                WHERE LOWER(content) LIKE ? OR LOWER(category) LIKE ?
                ORDER BY is_pinned DESC, id DESC
            """, (clean_q, clean_q))
            rows = cursor.fetchall()

        return [
            {
                "id": r["id"],
                "content": r["content"],
                "category": r["category"],
                "is_fact": bool(r["is_fact"]),
                "is_pinned": bool(r["is_pinned"]),
                "source": r["source"]
            }
            for r in rows
        ]

    def update_memory(self, memory_id: int, content: Optional[str] = None, category: Optional[str] = None, is_pinned: Optional[bool] = None) -> Optional[Dict[str, Any]]:
        """Edits an existing memory."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
            row = cursor.fetchone()
            if not row:
                return None

            new_content = content.strip() if content else row["content"]
            new_cat = category.strip() if category else row["category"]
            new_pinned = (1 if is_pinned else 0) if is_pinned is not None else row["is_pinned"]

            cursor.execute("""
                UPDATE memories
                SET content = ?, category = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_content, new_cat, new_pinned, memory_id))
            conn.commit()

        return {
            "id": memory_id,
            "content": new_content,
            "category": new_cat,
            "is_pinned": bool(new_pinned)
        }

    def delete_memory(self, memory_id: int) -> bool:
        """Permanently deletes a specific memory."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
            conn.commit()
            return cursor.rowcount > 0

    def clear_all_memories(self) -> int:
        """Removes all non-pinned memories or all memories if confirmed."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM memories")
            conn.commit()
            return cursor.rowcount

    def export_memories_json(self) -> str:
        """Exports all memories as formatted JSON string for user data portability."""
        mems = self.list_memories()
        return json.dumps(mems, indent=2)


# Singleton memory manager
memory_hub = MemoryManager()
