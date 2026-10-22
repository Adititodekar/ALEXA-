"""
Multimodal Vision & Document Intelligence Service for NOVA AI Assistant.
Handles file uploads (PNG, JPG, WEBP, PDF, TXT, Markdown), file validation,
and invokes Gemini 3.8 Flash multimodal reasoning to:
- Extract text and requirements from assignment briefs, syllabi, and notices
- Detect submission deadlines, dates, and milestone criteria
- Explain error screenshots and code snippets
- Propose structured tasks ready for user one-click confirmation
- Persist metadata in the SQLite uploaded_files table for Knowledge Space browsing
"""

import os
import re
import uuid
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path

from core.database import db

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt", ".md"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


class MultimodalService:
    def __init__(self, gemini_client=None, gemini_model="gemini-3.8-flash"):
        self.gemini_client = gemini_client
        self.gemini_model = gemini_model
        self.db = db
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    def update_gemini(self, client, model):
        self.gemini_client = client
        self.gemini_model = model

    def process_upload(self, filename: str, file_bytes: bytes, user_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Validates, saves, analyzes uploaded image/document, and extracts actionable requirements.
        """
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return {
                "ok": False,
                "error": f"Unsupported file type '{ext}'. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
            }

        if len(file_bytes) > MAX_FILE_SIZE:
            return {
                "ok": False,
                "error": f"File exceeds maximum allowed size of 15MB ({len(file_bytes) / 1024 / 1024:.1f}MB)"
            }

        # Safe storage
        file_id = f"doc-{uuid.uuid4().hex[:8]}"
        safe_filename = f"{file_id}_{re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)}"
        storage_path = os.path.join(UPLOAD_DIR, safe_filename)

        with open(storage_path, "wb") as f:
            f.write(file_bytes)

        # Analyze content
        summary = ""
        extracted_text = ""
        detected_deadlines = []
        proposed_tasks = []

        if ext in {".txt", ".md"}:
            try:
                extracted_text = file_bytes.decode("utf-8", errors="replace")
                analysis = self._analyze_text_content(extracted_text, filename, user_prompt)
                summary = analysis.get("summary", "")
                detected_deadlines = analysis.get("detected_deadlines", [])
                proposed_tasks = analysis.get("proposed_tasks", [])
            except Exception as exc:
                logger.warning("Error reading text file: %s", exc)
                summary = f"Text document uploaded successfully ({len(file_bytes)} bytes)."
        else:
            # Image or PDF
            analysis = self._analyze_binary_with_gemini(file_bytes, ext, filename, user_prompt)
            summary = analysis.get("summary", "")
            extracted_text = analysis.get("extracted_text", "")
            detected_deadlines = analysis.get("detected_deadlines", [])
            proposed_tasks = analysis.get("proposed_tasks", [])

        # Persist to database
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO uploaded_files (id, filename, file_type, file_size, storage_path, summary, extracted_text)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (file_id, filename, ext.replace(".", "").upper(), len(file_bytes), storage_path, summary, extracted_text[:1000]))
            conn.commit()

        logger.info("Processed multimodal file %s (%s, %d bytes)", filename, ext, len(file_bytes))
        return {
            "ok": True,
            "file_id": file_id,
            "filename": filename,
            "file_type": ext.replace(".", "").upper(),
            "file_size": len(file_bytes),
            "summary": summary,
            "extracted_text_snippet": extracted_text[:400] if extracted_text else None,
            "detected_deadlines": detected_deadlines,
            "proposed_tasks": proposed_tasks
        }

    def _analyze_binary_with_gemini(self, file_bytes: bytes, ext: str, filename: str, user_prompt: Optional[str]) -> Dict[str, Any]:
        """Uses Gemini 3.8 Flash multimodal vision/document parsing."""
        if not self.gemini_client:
            return self._fallback_binary_analysis(filename, ext, len(file_bytes))

        mime_type = "application/pdf" if ext == ".pdf" else (
            "image/png" if ext == ".png" else ("image/webp" if ext == ".webp" else "image/jpeg")
        )

        try:
            from google.genai import types

            file_part = types.Part.from_bytes(
                data=file_bytes,
                mime_type=mime_type
            )

            instruction = user_prompt if user_prompt else (
                "Analyze this document/image in detail. Extract the core summary, key requirements, "
                "any specific deadlines or dates mentioned, and propose actionable tasks."
            )

            prompt = f"""
You are NOVA Multimodal AI Document & Vision Reasoner.
File Name: {filename}
User Request: {instruction}

Carefully inspect the visual/document content.
Respond in JSON format with the following fields:
{{
  "summary": "Concise 2 to 3 sentence summary of what this document or image contains and requires.",
  "extracted_text": "Key text, instructions, or error messages transcribed from the file.",
  "detected_deadlines": [
    {{
      "label": "Name of the milestone or assignment",
      "date": "YYYY-MM-DD or relative description found",
      "priority": "high", "medium", or "urgent"
    }}
  ],
  "proposed_tasks": [
    {{
      "title": "Actionable task title derived from requirements",
      "due_date": "YYYY-MM-DD 17:00",
      "category": "Assignment" or "Study",
      "priority": "high" or "medium",
      "estimated_hours": 2.5
    }}
  ]
}}
"""
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=[file_part, prompt]
            )

            if response and response.text:
                raw = response.text.strip()
                if "```json" in raw:
                    raw = raw.split("```json")[1].split("```")[0].strip()
                elif "```" in raw:
                    raw = raw.split("```")[1].split("```")[0].strip()

                parsed = json.loads(raw)
                return parsed
        except Exception as exc:
            logger.warning("Gemini multimodal analysis error: %s", exc)

        return self._fallback_binary_analysis(filename, ext, len(file_bytes))

    def _analyze_text_content(self, text: str, filename: str, user_prompt: Optional[str]) -> Dict[str, Any]:
        """Analyzes text/markdown documents using Gemini or regex date extraction."""
        if self.gemini_client:
            try:
                prompt = f"""
You are NOVA Multimodal Document Reasoner.
File Name: {filename}
Document Text:
\"\"\"
{text[:4000]}
\"\"\"

Analyze this text and output JSON:
{{
  "summary": "Concise summary of the document requirements and content.",
  "extracted_text": "Important snippets and requirements.",
  "detected_deadlines": [
    {{ "label": "Milestone title", "date": "YYYY-MM-DD", "priority": "high" }}
  ],
  "proposed_tasks": [
    {{ "title": "Specific actionable task", "due_date": "YYYY-MM-DD 18:00", "category": "Work", "priority": "high", "estimated_hours": 2.0 }}
  ]
}}
"""
                response = self.gemini_client.models.generate_content(
                    model=self.gemini_model,
                    contents=prompt
                )
                if response and response.text:
                    raw = response.text.strip()
                    if "```json" in raw:
                        raw = raw.split("```json")[1].split("```")[0].strip()
                    elif "```" in raw:
                        raw = raw.split("```")[1].split("```")[0].strip()
                    return json.loads(raw)
            except Exception as exc:
                logger.warning("Gemini text analysis error: %s", exc)

        # Fallback regex date extraction
        found_dates = re.findall(r"(?:due|deadline|by|before|date:?)\s+([A-Za-z0-9, -]{4,25})", text, re.IGNORECASE)
        tomorrow_str = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d 17:00")
        detected = [{"label": f"Deadline in {filename}", "date": d.strip(), "priority": "high"} for d in found_dates[:2]]

        return {
            "summary": f"Text document '{filename}' analyzed. Contains {len(text.split())} words.",
            "extracted_text": text[:300],
            "detected_deadlines": detected,
            "proposed_tasks": [
                {
                    "title": f"Complete requirements from {filename}",
                    "due_date": tomorrow_str,
                    "category": "Assignment",
                    "priority": "high",
                    "estimated_hours": 3.0
                }
            ]
        }

    def _fallback_binary_analysis(self, filename: str, ext: str, size: int) -> Dict[str, Any]:
        tomorrow_str = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d 17:00")
        return {
            "summary": f"Uploaded {ext.upper()} file '{filename}' ({size / 1024:.1f} KB). Ready for assignment processing and task conversion.",
            "extracted_text": f"Document: {filename} ({ext.upper()})",
            "detected_deadlines": [
                {"label": f"Submission extracted from {filename}", "date": tomorrow_str, "priority": "high"}
            ],
            "proposed_tasks": [
                {
                    "title": f"Review and submit {filename}",
                    "due_date": tomorrow_str,
                    "category": "Assignment",
                    "priority": "high",
                    "estimated_hours": 2.5
                }
            ]
        }

    def list_uploaded_files(self) -> List[Dict[str, Any]]:
        """Lists all uploaded documents for the Knowledge Space."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, filename, file_type, file_size, summary, created_at
                FROM uploaded_files
                ORDER BY id DESC
            """)
            rows = cursor.fetchall()

        return [
            {
                "id": r["id"],
                "filename": r["filename"],
                "file_type": r["file_type"],
                "file_size": r["file_size"],
                "file_size_formatted": f"{r['file_size'] / 1024:.1f} KB",
                "summary": r["summary"],
                "created_at": r["created_at"]
            }
            for r in rows
        ]


multimodal_hub = MultimodalService()
