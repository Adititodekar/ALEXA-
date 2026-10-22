"""
Core Brain & Multimodal AI Reasoner for NOVA AI Assistant (Alexa-Next 2.0).
Orchestrates:
1. Dynamic conversation & multi-turn dialogue with Gemini 3.8 Flash or built-in offline engine.
2. Active tool execution (Smart Home, Tasks, Deadlines, Memory, Missions).
3. Eliminates media spam (only fetches images/videos when explicitly requested).
4. Persistent memory, proactive conflict detection, and smart home IoT control.
5. Location services, wellbeing tracking, and Emergency Guardian SOS.
"""

import os
import re
import json
import logging
import requests
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List

from dotenv import load_dotenv

# Load project credentials before importing services that read environment
# variables during module initialization.
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

from .mood_engine import MoodEngine
from .emergency_guardian import EmergencyGuardian
from .location_service import LocationService
from .media_service import MediaService
from .wellbeing_tracker import WellbeingTracker
from .planner import Planner
from .conversation_engine import ConversationEngine
from .smart_home import smart_home_hub
from .memory_manager import memory_hub
from .multimodal_service import multimodal_hub
from .mission_engine import mission_engine
from .proactive_engine import proactive_engine
from .tool_registry import tool_registry
from .conversation_manager import conversation_mgr
from .weather_service import weather_service
from .music_service import music_service
from .alarm_timer_service import alarm_timer_service
from .news_service import news_service
from .reminder_service import reminder_service

logger = logging.getLogger(__name__)


class NovaBrain:
    def __init__(self):
        self.mood_engine = MoodEngine()
        self.guardian = EmergencyGuardian()
        self.location_service = LocationService()
        self.media_service = MediaService()
        self.wellbeing = WellbeingTracker()
        self.planner = Planner()
        self.smart_home = smart_home_hub
        self.memory = memory_hub
        self.multimodal = multimodal_hub
        self.mission_engine = mission_engine
        self.proactive = proactive_engine
        self.tools = tool_registry
        self.conversation_mgr = conversation_mgr
        self.conversation = ConversationEngine(media_service=self.media_service)
        self.weather = weather_service
        self.music = music_service
        self.alarms = alarm_timer_service
        self.news = news_service

        # Select the general conversation provider. Tooling and multimodal
        # integrations can still use Gemini independently when its key exists.
        self.llm_provider = os.environ.get("LLM_PROVIDER", "gemini").strip().lower()
        self.llm_fallback_providers = [
            provider.strip().lower()
            for provider in os.environ.get("LLM_FALLBACK_PROVIDERS", "gemini,openai,compatible").split(",")
            if provider.strip()
        ]
        self.openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.openai_model = os.environ.get("OPENAI_MODEL", "gpt-6-astra").strip()
        self.compatible_llm_key = os.environ.get("LLM_API_KEY", "").strip()
        self.compatible_llm_base_url = os.environ.get(
            "LLM_BASE_URL", "https://api.groq.com/openai/v1"
        ).strip().rstrip("/")
        self.compatible_llm_model = os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile").strip()

        # Gemini API Configuration (also used for mission and multimodal tools).
        self.gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash").strip()
        self.llm_model = self._model_for_provider(self.llm_provider)
        self.gemini_client = None

        if self.gemini_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=self.gemini_key)
                logger.info("Gemini AI client initialized successfully with model: %s", self.gemini_model)
                self.mission_engine.update_gemini(self.gemini_client, self.gemini_model)
                self.multimodal.update_gemini(self.gemini_client, self.gemini_model)
            except Exception as exc:
                logger.warning("Could not initialize Gemini client: %s. Using built-in conversational engine.", exc)
                self.gemini_client = None

    def _schedule_deadline_reminder(self, task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Schedule a persistent alert exactly one hour before a task is due."""
        try:
            due = datetime.strptime(task["due_date"][:16], "%Y-%m-%d %H:%M")
        except (KeyError, TypeError, ValueError):
            return None

        now = datetime.now()
        if due <= now:
            return None
        reminder_at = due - timedelta(hours=1)
        if reminder_at <= now:
            reminder_at = now + timedelta(minutes=1)
        return reminder_service.add_reminder(
            f"Upcoming deadline: {task['title']}",
            reminder_at.strftime("%Y-%m-%d %H:%M")
        )

    @staticmethod
    def _parse_deadline_datetime(text: str, reference_time: Optional[datetime] = None) -> Optional[datetime]:
        """Parse common explicit dates and times without guessing an absent date."""
        now = reference_time or datetime.now()
        lowered = text.lower()
        target = None

        iso_match = re.search(r"\b(20\d{2}-\d{1,2}-\d{1,2})(?:[ T](\d{1,2}:\d{2}))?\b", text)
        if iso_match:
            try:
                target = datetime.strptime(iso_match.group(1), "%Y-%m-%d")
                if iso_match.group(2):
                    hour, minute = map(int, iso_match.group(2).split(":"))
                    target = target.replace(hour=hour, minute=minute)
            except ValueError:
                target = None

        if target is None:
            numeric = re.search(r"\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b", text)
            if numeric:
                try:
                    target = datetime(int(numeric.group(3)), int(numeric.group(2)), int(numeric.group(1)))
                except ValueError:
                    target = None

        if target is None:
            month_pattern = r"\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?|\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+\d{4})?"
            month_match = re.search(month_pattern, text, re.IGNORECASE)
            if month_match:
                date_text = re.sub(r",", "", month_match.group(0)).strip()
                for fmt in ("%B %d %Y", "%b %d %Y", "%d %B %Y", "%d %b %Y", "%B %d", "%b %d", "%d %B", "%d %b"):
                    try:
                        target = datetime.strptime(date_text, fmt)
                        if "%Y" not in fmt:
                            target = target.replace(year=now.year)
                            if target.date() < now.date():
                                target = target.replace(year=now.year + 1)
                        break
                    except ValueError:
                        continue

        relative = re.search(r"\bin\s+(\d+)\s+(day|week)s?\b", lowered)
        if target is None and relative:
            amount = int(relative.group(1)) * (7 if relative.group(2) == "week" else 1)
            target = now + timedelta(days=amount)

        weekday = re.search(r"\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", lowered)
        if target is None and weekday:
            weekdays = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
            days_ahead = (weekdays[weekday.group(2)] - now.weekday()) % 7
            if days_ahead == 0 or weekday.group(1):
                days_ahead += 7
            target = now + timedelta(days=days_ahead)

        if target is None:
            if "tomorrow" in lowered:
                target = now + timedelta(days=1)
            elif "today" in lowered or "tonight" in lowered:
                target = now

        if target is None and "next week" in lowered:
            target = now + timedelta(days=7)
        # A clock time with an explicit reminder request means today if it is
        # still ahead, otherwise tomorrow. Do not infer dates for ordinary chat.
        reminder_requested = re.search(
            r"\b(?:remind me|reminder|set (?:me )?a reminder)\b", lowered
        )
        time_match = re.search(r"\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", lowered)
        if target is None and reminder_requested and time_match:
            target = now
            hour = int(time_match.group(1)) % 12
            if time_match.group(3) == "pm":
                hour += 12
            target = target.replace(hour=hour, minute=int(time_match.group(2) or 0), second=0, microsecond=0)
            if target <= now:
                target += timedelta(days=1)
        if target is None:
            return None

        if time_match:
            hour = int(time_match.group(1)) % 12
            if time_match.group(3) == "pm":
                hour += 12
            target = target.replace(hour=hour, minute=int(time_match.group(2) or 0))
        elif not iso_match or not iso_match.group(2):
            target = target.replace(hour=21 if "tonight" in lowered else 17, minute=0)
        return target

    def _capture_conversation_deadline(
        self,
        conversation_id: str,
        latest_text: str,
        reference_time: Optional[datetime] = None,
        previous_user_text: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Capture a dated commitment stated explicitly in this chat thread."""
        recent = self.conversation_mgr.get_recent_messages(conversation_id, limit=20)
        user_messages = [m["content"] for m in recent if m.get("role") == "user"]
        latest_date = self._parse_deadline_datetime(latest_text, reference_time)
        if not latest_date:
            return None

        commitment_pattern = re.compile(
            r"\b(?:i need to|i have to|i must|i will|i'll|i am going to|i'm going to|remind me(?:\s+to)?|"
            r"(?:give|set)\s+(?:me\s+)?(?:a\s+)?reminder(?:\s+to)?|reminder\s+to|"
            r"deadline|due|submit|finish|complete|hand in|turn in|exam|test|assignment|project|"
            r"appointment|meeting|interview|presentation)\b",
            re.IGNORECASE
        )
        source_text = latest_text if commitment_pattern.search(latest_text) else ""
        if not source_text:
            previous_user_message = previous_user_text if previous_user_text is not None else (user_messages[-2] if len(user_messages) > 1 else "")
            if commitment_pattern.search(previous_user_message):
                source_text = previous_user_message
        if not source_text or re.search(r"\b(?:what if|maybe|might|could|should|not going to|don't need to)\b", source_text, re.IGNORECASE):
            return None
        has_commitment_request = re.search(
            r"\b(?:i need to|i have to|i must|i will|i'll|remind me|reminder|deadline|due)\b",
            source_text, re.IGNORECASE
        )
        if re.match(r"(?i)^\s*(?:what|when|where|why|how|is|are|do|does|can you tell me)\b", source_text) and "?" in source_text and not has_commitment_request:
            return None

        title_source = re.sub(
            r"(?i)^\s*(?:today|tomorrow|tonight|next\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|"
            r"monday|tuesday|wednesday|thursday|friday|saturday|sunday|in\s+\d+\s+(?:days?|weeks?))\b[\s,;:-]*",
            "", source_text
        )
        title_text = re.sub(
            r"(?i)^.*?\b(?:i need to|i have to|i must|i will|i'll|i am going to|i'm going to|remind me(?:\s+to)?|"
            r"(?:give|set)\s+(?:me\s+)?(?:a\s+)?reminder(?:\s+to)?|reminder\s+to)\b\s*",
            "", title_source
        ).strip()
        if title_text == title_source.strip():
            title_text = re.sub(r"(?i)^.*?\bdeadline\s+(?:for|to)\s*", "", title_source).strip()
        title_text = re.split(
            r"(?i)\b(?:due|by|on|at|before|after|tomorrow|today|tonight|next week|next\s+"
            r"(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+\d+\s+"
            r"(?:days?|weeks?)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
            r"jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|"
            r"aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|"
            r"\b20\d{2}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/.]\d{1,2}[/.]20\d{2}\b|"
            r"\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b",
            title_text
        )[0].strip(" ,:-")
        title_text = re.sub(r"(?i)^(?:i have an|i have a|i have|i've got|my|the|a|an)\s+", "", title_text).strip()
        title_text = re.sub(r"(?i)\s+is$", "", title_text).strip()
        if len(title_text) < 3:
            return None

        lowered = source_text.lower()
        category = next((name for keyword, name in (
            ("exam", "Exam"), ("test", "Exam"), ("assignment", "Assignment"),
            ("project", "Project"), ("meeting", "Meeting"), ("appointment", "Personal"),
            ("interview", "Interview"), ("presentation", "Presentation"), ("deadline", "Deadline")
        ) if keyword in lowered), "General")
        priority = "urgent" if any(word in lowered for word in ("urgent", "asap", "critical")) else (
            "high" if "important" in lowered else
            "high" if category in ("Exam", "Assignment", "Project", "Deadline") else "medium"
        )
        task = self.planner.add_deadline(
            title=title_text,
            due_date=latest_date.strftime("%Y-%m-%d %H:%M"),
            category=category,
            priority=priority,
            estimated_hours=2.5
        )
        if task.get("already_exists"):
            return None
        if re.search(r"\b(?:remind me|reminder|set (?:me )?a reminder)\b", source_text, re.IGNORECASE):
            reminder = reminder_service.add_reminder(
                f"Reminder: {title_text}", latest_date.strftime("%Y-%m-%d %H:%M")
            )
        else:
            reminder = self._schedule_deadline_reminder(task)
        return {"task": task, "reminder": reminder}

    def scan_recent_conversation_deadlines(self) -> List[Dict[str, Any]]:
        """Scan the last 24 hours of saved chats and capture dated commitments."""
        utc_since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
        messages = self.conversation_mgr.get_recent_user_messages(utc_since)
        previous_by_conversation: Dict[str, str] = {}
        captured = []
        for message in messages:
            conversation_id = message["conversation_id"]
            try:
                created = datetime.strptime(message["created_at"], "%Y-%m-%d %H:%M:%S")
                reference_time = created.replace(tzinfo=timezone.utc).astimezone().replace(tzinfo=None)
            except (TypeError, ValueError):
                reference_time = datetime.now()
            found = self._capture_conversation_deadline(
                conversation_id,
                message["content"],
                reference_time=reference_time,
                previous_user_text=previous_by_conversation.get(conversation_id, "")
            )
            if found:
                captured.append(found)
            previous_by_conversation[conversation_id] = message["content"]
        return captured

    def _model_for_provider(self, provider: str) -> str:
        return {
            "gemini": getattr(self, "gemini_model", os.environ.get("GEMINI_MODEL", "gemini-3.8-flash").strip()),
            "openai": self.openai_model,
            "compatible": self.compatible_llm_model,
        }.get(provider, "")

    def _provider_is_ready(self, provider: str) -> bool:
        return (
            (provider == "gemini" and self.gemini_client is not None)
            or (provider == "openai" and bool(self.openai_key))
            or (provider == "compatible" and bool(self.compatible_llm_key))
        )

    def _provider_order(self) -> List[str]:
        ordered = []
        for provider in [self.llm_provider, *self.llm_fallback_providers]:
            if provider in {"gemini", "openai", "compatible"} and provider not in ordered:
                if self._provider_is_ready(provider):
                    ordered.append(provider)
        return ordered

    def _generate_provider_text(self, provider: str, prompt: str) -> str:
        if provider == "gemini":
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=prompt
            )
            return response.text.strip() if response and response.text else ""
        if provider == "openai":
            return self._generate_openai_text(prompt, self.openai_model)
        return self._generate_compatible_text(prompt, self.compatible_llm_model)

    def _generate_openai_text(self, prompt: str, model: str) -> str:
        """Generate a conversational answer using OpenAI's Responses API."""
        response = requests.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {self.openai_key}"},
            json={"model": model, "input": prompt},
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("output_text"):
            return payload["output_text"].strip()
        text_parts = [
            part.get("text", "")
            for item in payload.get("output", [])
            for part in item.get("content", [])
            if part.get("type") == "output_text"
        ]
        return "\n".join(part for part in text_parts if part).strip()

    def _generate_compatible_text(self, prompt: str, model: str) -> str:
        """Call an OpenAI-compatible chat endpoint (for example Groq/Llama)."""
        response = requests.post(
            f"{self.compatible_llm_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.compatible_llm_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are Nova, a natural, helpful conversational assistant. Answer the user directly in their language."},
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=60,
        )
        response.raise_for_status()
        choices = response.json().get("choices", [])
        if not choices:
            return ""
        content = choices[0].get("message", {}).get("content", "")
        if isinstance(content, list):
            content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
        return content.strip() if isinstance(content, str) else ""

    def process_message(
        self,
        user_text: str,
        conversation_id: str = "default-session",
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Main cognitive loop:
        1. Analyzes mood and distress.
        2. Detects and executes direct commands (Smart Home, Tasks, Deadlines, Missions).
        3. Invokes Gemini 3.8 Flash for intelligent multimodal reasoning with tool execution.
        4. NEVER returns unwanted media/YouTube links unless explicitly requested.
        5. Persists conversation history.
        """
        clean_text = user_text.strip()
        lowered = clean_text.lower()

        # Save user message to persistent conversation store
        self.conversation_mgr.append_message(conversation_id, "user", clean_text)

        # Update location coordinates if provided
        if user_lat is not None and user_lng is not None:
            current_location = self.location_service.update_coords(user_lat, user_lng)
        else:
            current_location = {
                "coords": self.location_service.last_known_coords,
                "address": self.location_service.last_known_address
            }

        # Analyze the current turn first so an older emergency statement can
        # never trigger SOS. If this turn is neutral, use a short recent-user
        # context window to keep the mood check-in conversational.
        mood_data = self.mood_engine.analyze(clean_text)
        if mood_data.get("primary_mood") == "neutral":
            recent_user_text = [
                item.get("content", "") for item in self.conversation_mgr.get_recent_messages(conversation_id, limit=6)
                if item.get("role") == "user"
            ][-3:]
            context_mood = self.mood_engine.analyze(" ".join(recent_user_text))
            if context_mood.get("primary_mood") != "neutral" and not context_mood.get("is_emergency"):
                mood_data = context_mood
                mood_data["contextual"] = True

        # --- 1. EMERGENCY / SOS (Highest Priority) ---
        if mood_data.get("is_emergency") or any(k in lowered for k in ["help me", "call police", "call ambulance", "accident", "emergency", "danger"]):
            sos_res = self.guardian.trigger_sos(
                situation_description=clean_text,
                lat=current_location["coords"]["lat"],
                lng=current_location["coords"]["lng"],
                address=current_location["address"]
            )
            speech = sos_res["speech_reply"]
            reply_payload = {
                "speech_reply": speech,
                "display_reply": "🚨 **EMERGENCY SOS TRIGGERED**: Live GPS coordinates and distress broadcast dispatched to emergency contacts.",
                "reply": speech,
                "mood": mood_data,
                "type": "emergency",
                "emergency_payload": sos_res,
                "location": current_location,
                "media": None,
                "mission_plan": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", reply_payload["display_reply"], reply_payload)
            return reply_payload

        # --- 2. SIGNATURE AUTONOMOUS MISSION MODE DETECTION ---
        is_mission_intent = any([
            "mission" in lowered,
            "help me plan my week" in lowered,
            "organize my week" in lowered,
            "prepare for my upcoming assignments" in lowered,
            "prepare for my assignments" in lowered,
            "identify deadline conflicts" in lowered,
            "create a realistic study schedule" in lowered,
            "start mission" in lowered,
            "autonomous" in lowered,
            "audit my assignments" in lowered,
            "optimize my schedule" in lowered
        ])

        if is_mission_intent:
            logger.info("Autonomous Mission triggered by user: '%s'", clean_text)
            mission_plan = self.mission_engine.create_mission_plan(clean_text, conversation_id=conversation_id)
            speech = (
                f"I've analyzed your goals and prepared an Autonomous Mission plan with {len(mission_plan['steps'])} steps. "
                "Please review the steps below. You can edit, remove, or approve the plan to proceed."
            )
            display = (
                f"🎯 **Autonomous Mission Formulated**\n"
                f"**Goal**: {clean_text}\n\n"
                f"I've gathered your deadlines, memories, and workload context to construct a structured {len(mission_plan['steps'])}-step mission. "
                f"Review the plan below and click **Approve & Execute** when ready."
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "mission_plan",
                "mission_plan": mission_plan,
                "media": None,
                "location": current_location
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 3. SMART HOME IOT CONTROL (Active Execution - Rock Solid Pattern Matching) ---
        # Detect if any smart home appliance is referenced
        target_dev = None
        if any(w in lowered for w in ["tv", "television", "smart tv", "smart television"]):
            target_dev = "television"
        elif any(w in lowered for w in ["fan", "bedroom fan", "ceiling fan"]):
            target_dev = "bedroom_fan"
        elif any(w in lowered for w in ["cooler", "ac", "kitchen ac", "kitchen cooler", "air conditioner"]):
            target_dev = "kitchen_ac"
        elif any(w in lowered for w in ["light", "living room light", "living room lights", "lamp", "lights"]):
            target_dev = "living_room_light"
        elif any(w in lowered for w in ["all devices", "everything", "all appliances", "all lights"]):
            target_dev = "all"

        # Detect action intent (ON vs OFF)
        target_state = None
        if any(w in lowered for w in ["off", "turn off", "switch off", "power off", "disable", "stop", "shut down", "kill"]):
            target_state = False
        elif any(w in lowered for w in ["on", "turn on", "switch on", "power on", "enable", "start", "activate"]):
            target_state = True

        if target_dev and target_state is not None:
            logger.info("Executing Smart Home command: device=%s, state=%s", target_dev, target_state)
            if target_dev == "all":
                for d_id in self.smart_home.list_devices():
                    self.smart_home.set_device_state(d_id, target_state)
                action_verb = "powered ON" if target_state else "switched OFF"
                speech = f"All connected smart home devices have been {action_verb}."
                res_device = None
            else:
                res_data = self.smart_home.set_device_state(target_dev, target_state)
                speech = res_data.get("note", f"{target_dev} state updated.")
                res_device = res_data

            energy = self.smart_home.get_energy_summary()
            display = (
                f"💡 **Smart Home Control**\n"
                f"{speech}\n"
                f"Current Home Power Draw: **{energy['estimated_current_watts']} W** across {energy['active_devices_count']} active appliances."
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "smart_home",
                "smart_home": {
                    "action": "toggle",
                    "device": res_device,
                    "devices": self.smart_home.list_devices(),
                    "energy": energy
                },
                "media": None,
                "location": current_location
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 4. TASK & DEADLINE CREATION (Active Execution) ---
        is_task_create = any(w in lowered for w in [
            "create a task", "create task", "add a task", "add task", "new task",
            "add deadline", "create deadline", "new deadline", "add assignment", "new assignment",
            "remind me to submit", "schedule task", "task:"
        ])

        if is_task_create:
            # Extract task title from user query
            title_text = re.sub(
                r"(?i)^(?:can you\s+)?(?:please\s+)?(?:create a task|create task|add a task|add task|new task|add deadline for|add deadline|create deadline|add assignment|new assignment|remind me to submit|schedule task|task)\s*[:\-]?\s*",
                "",
                clean_text
            ).strip()
            title_text = title_text.lstrip(":- ").strip()

            due_dt = self._parse_deadline_datetime(clean_text) or (datetime.now() + timedelta(days=1)).replace(hour=17, minute=0, second=0, microsecond=0)
            due_str = due_dt.strftime("%Y-%m-%d %H:%M")

            # Clean title
            task_title = title_text if title_text else "Upcoming Assignment"
            # Remove trailing due hints from title
            task_title = re.sub(r"(?i)\s+(?:due|by|on|for)\s+.*$", "", task_title).strip()
            task_title = re.sub(
                r"(?i)\b(?:tomorrow|tonight|today|next week|next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|"
                r"\b20\d{2}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?\b|"
                r"\b\d{1,2}[/.]\d{1,2}[/.]20\d{2}\b|"
                r"\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+20\d{2})?\b|"
                r"\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+20\d{2})?\b|"
                r"\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b",
                "", task_title
            ).strip(" ,:-")
            if not task_title:
                task_title = "Assignment Task"

            prio = "urgent" if "urgent" in lowered else ("high" if "high" in lowered else "medium")

            new_task = self.planner.add_deadline(
                title=task_title,
                due_date=due_str,
                category="Assignment" if any(w in lowered for w in ["assignment", "project", "lab", "homework"]) else "General",
                priority=prio,
                estimated_hours=2.5
            )
            new_reminder = self._schedule_deadline_reminder(new_task)

            if new_task.get("already_exists"):
                speech = f"'{task_title}' is already in your task list for {due_str}."
            else:
                speech = f"I've added '{task_title}' to your tasks, scheduled for {due_str}."
            if new_reminder:
                speech += f" I’ve scheduled a reminder for {new_reminder['due_time']}."
            display = (
                f"📋 **Task Created & Tracked in SQLite**\n"
                f"- **Title**: {task_title}\n"
                f"- **Due Date**: {due_str}\n"
                f"- **Priority**: {prio.capitalize()}\n"
                f"- **Status**: Pending • Countdown Active"
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "deadlines",
                "deadlines": self.planner.get_deadlines(),
                "new_task": new_task,
                "new_reminder": new_reminder,
                "media": None,
                "location": current_location
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 5. COMPLETE TASK OR DELETE TASK ---
        if any(w in lowered for w in ["complete task", "finish task", "mark task complete", "done with task"]):
            # Find task ID if number mentioned
            nums = re.findall(r"\b\d+\b", clean_text)
            if nums:
                task_id = int(nums[0])
                ok = self.planner.complete_deadline(task_id)
                speech = f"Task #{task_id} has been marked completed." if ok else f"Task #{task_id} not found."
                display = f"✅ **Task Completed**: Task #{task_id} marked as completed in database."
                reply_payload = {
                    "speech_reply": speech,
                    "display_reply": display,
                    "reply": speech,
                    "mood": mood_data,
                    "type": "deadlines",
                    "deadlines": self.planner.get_deadlines(),
                    "media": None,
                    "location": current_location
                }
                self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
                return reply_payload

        # --- 6. ENERGY SUMMARY & SAVING TIPS ---
        if any(w in lowered for w in ["energy", "power load", "wattage", "saving tips", "electricity"]):
            energy = self.smart_home.get_energy_summary()
            tips = self.smart_home.get_saving_tips()
            active_str = ", ".join(energy["active_devices"]) if energy["active_devices"] else "None (All standby)"
            speech = f"Current household power load is estimated at {energy['estimated_current_watts']} watts across {energy['active_devices_count']} active appliances."
            display = (
                f"⚡ **Energy & Power Monitor**\n"
                f"- Current Estimated Load: **{energy['estimated_current_watts']} W**\n"
                f"- Active Appliances: **{active_str}**\n\n"
                f"💡 *Efficiency Tip: {tips[0]}*"
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "smart_home",
                "smart_home": {
                    "action": "energy_summary",
                    "devices": self.smart_home.list_devices(),
                    "energy": energy,
                    "tips": tips
                },
                "media": None,
                "location": current_location
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 7. LOCATION & DIRECTIONS ---
        if any(w in lowered for w in ["where am i", "my location", "current location", "track my location"]):
            resolved = self.location_service.reverse_geocode(
                current_location["coords"]["lat"],
                current_location["coords"]["lng"]
            )
            speech = f"You are currently located near {resolved['display_name']}."
            display = f"📍 **Current Location**: {resolved['display_name']}\nGPS: `{current_location['coords']['lat']:.4f}, {current_location['coords']['lng']:.4f}`"
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "location",
                "location": {
                    "coords": current_location["coords"],
                    "address": resolved["display_name"]
                },
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        if any(w in lowered for w in ["directions to", "navigate to", "route to", "how to reach"]):
            match = re.search(r"(?:directions to|navigate to|route to|how to reach)\s+(.+)", clean_text, re.IGNORECASE)
            dest = match.group(1).strip() if match else "nearest station"
            nav = self.location_service.get_route_and_directions(
                dest,
                start_lat=current_location["coords"]["lat"],
                start_lng=current_location["coords"]["lng"]
            )
            speech = f"Routing to {dest}. Estimated travel time is {nav.get('duration_min', '15')} minutes over {nav.get('distance_km', '3')} kilometers."
            display = f"🧭 **Route to {dest}**\n- Distance: **{nav.get('distance_km', 'N/A')} km**\n- Duration: **{nav.get('duration_min', 'N/A')} mins**"
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "navigation",
                "navigation": nav,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 8. PROACTIVE INSIGHTS & CONFLICT DETECTION ---
        if any(w in lowered for w in ["conflict", "proactive", "overloaded", "workload check", "review deadlines"]):
            insights = self.proactive.generate_insights()
            speech = f"I evaluated your schedule and found {len(insights)} proactive recommendations regarding deadlines and workload."
            display = f"🔍 **Proactive Schedule & Conflict Audit**\n"
            for ins in insights:
                display += f"\n- **{ins['title']}**: {ins['what_noticed']}\n  *Action*: {ins['recommended_action']}\n"
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "proactive_insights",
                "insights": insights,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 9. LIVE WEATHER & SURROUNDING TEMPERATURE/HUMIDITY ---
        is_weather_intent = any(w in lowered for w in [
            "weather", "temperature", "humidity", "surrounding temperature",
            "how hot", "what's the weather", "current weather", "surrounding weather",
            "climate", "forecast", "temp outside", "is it raining"
        ])
        if is_weather_intent:
            logger.info("Live weather & surroundings requested: '%s'", clean_text)
            w_data = self.weather.get_weather()
            speech = (
                f"The surrounding temperature is {w_data['temperature']} degrees Celsius with {w_data['humidity']}% humidity "
                f"and {w_data['description']}. It feels like {w_data['feels_like']} degrees."
            )
            display = (
                f"⛅ **Surrounding Weather & Environment**\n"
                f"- **Location**: {w_data.get('city', 'Local Area')}, {w_data.get('country', '')}\n"
                f"- **Temperature**: **{w_data['temperature']}°C** (Feels like **{w_data['feels_like']}°C**)\n"
                f"- **Humidity**: **{w_data['humidity']}%**\n"
                f"- **Condition**: {w_data['description'].title()}\n"
                f"- **Wind**: {w_data['wind_speed']} m/s | **Pressure**: {w_data['pressure']} hPa\n"
                f"- **High / Low**: {w_data['temp_max']}°C / {w_data['temp_min']}°C"
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "weather",
                "weather": w_data,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 10. MUSIC & ENTERTAINMENT (\"NOVA! PLAY MY FAVOURITE SONGS!\") ---
        is_music_intent = any(w in lowered for w in [
            "play my favourite songs", "play favourite songs", "play my favorite songs", "play favorite songs",
            "play my favourite song", "play my favorite song", "play music", "play some songs",
            "play songs", "play song", "start music", "play track", "music player"
        ])
        is_pause_music = any(w in lowered for w in ["pause music", "stop music", "pause the song", "stop song"])
        is_next_music = any(w in lowered for w in ["next song", "skip song", "next track", "skip track"])

        if is_pause_music:
            m_res = self.music.pause()
            speech = "I've paused music playback."
            display = "⏸️ **Music Paused**"
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "music",
                "music": m_res,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        if is_next_music:
            m_res = self.music.next_track()
            track = m_res["track"]
            speech = f"Skipping to next favourite track: '{track['title']}' by {track['artist']}."
            display = (
                f"⏭️ **Next Track Playing**\n"
                f"- **Title**: {track['title']}\n"
                f"- **Artist**: {track['artist']}\n"
                f"- **Album**: {track['album']}\n"
                f"- **Genre**: {track['genre']}"
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "music",
                "music": m_res,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        if is_music_intent:
            logger.info("Music playback intent triggered: '%s'", clean_text)
            m_res = self.music.play_favourite_songs()
            track = m_res["track"]
            speech = f"Playing your favourite songs now! 🎵 Here is '{track['title']}' by {track['artist']}."
            display = (
                f"🎵 **Now Playing: Favourite Songs**\n"
                f"- **Track**: {track['title']}\n"
                f"- **Artist**: {track['artist']}\n"
                f"- **Album**: {track['album']} • {track['genre']}\n"
                f"- **Stream**: High-fidelity stream active"
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "music",
                "music": m_res,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 11. SMART ALARMS, TIMERS & REMINDERS ---
        is_timer_intent = any(w in lowered for w in ["set timer", "set a timer", "timer for", "start timer", "countdown"])
        is_alarm_intent = any(w in lowered for w in ["set alarm", "set an alarm", "wake me up", "alarm for", "alarm at"])
        is_reminder_intent = any(w in lowered for w in ["remind me to", "set reminder", "add reminder", "create reminder"])
        is_list_alarms = any(w in lowered for w in ["show alarms", "list alarms", "show timers", "list timers", "my alarms", "my reminders"])

        if is_timer_intent:
            min_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:minute|min|m)\b", lowered)
            sec_match = re.search(r"(\d+)\s*(?:second|sec|s)\b", lowered)
            hr_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:hour|hr|h)\b", lowered)
            minutes = 5.0
            if hr_match:
                minutes = float(hr_match.group(1)) * 60
            elif min_match:
                minutes = float(min_match.group(1))
            elif sec_match:
                minutes = float(sec_match.group(1)) / 60

            label = "Countdown Timer"
            label_match = re.search(r"(?:for|labeled|called)\s+(.+)", clean_text, re.IGNORECASE)
            if label_match:
                clean_lbl = re.sub(r"\b\d+\s*(?:minute|min|second|sec|hour|hr)s?\b", "", label_match.group(1), flags=re.IGNORECASE).strip()
                if clean_lbl:
                    label = clean_lbl.capitalize()

            timer_res = self.alarms.add_timer(minutes=minutes, label=label)
            speech = f"Timer set for {int(minutes) if minutes == int(minutes) else minutes} minutes for {label}."
            display = (
                f"⏱️ **Smart Timer Set**\n"
                f"- **Duration**: {int(minutes)} minutes ({timer_res['duration_seconds']} seconds)\n"
                f"- **Label**: {label}\n"
                f"- **Status**: Running"
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "alarms",
                "alarms_data": self.alarms.get_all(),
                "created_item": timer_res,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        if is_alarm_intent:
            time_match = re.search(r"\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b", lowered)
            alarm_time = time_match.group(1) if time_match else "07:00 AM"
            label = "Morning Alarm"
            if "wake me up" in lowered:
                label = "Wake Up Alarm"
            alarm_res = self.alarms.add_alarm(time_str=alarm_time, label=label)
            speech = f"Alarm set for {alarm_time}."
            display = (
                f"⏰ **Smart Alarm Scheduled**\n"
                f"- **Time**: {alarm_time.upper()}\n"
                f"- **Label**: {label}\n"
                f"- **Status**: Active"
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "alarms",
                "alarms_data": self.alarms.get_all(),
                "created_item": alarm_res,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        if is_reminder_intent:
            rem_text = re.sub(r"(?i)^(?:can you\s+)?(?:please\s+)?(?:remind me to|set reminder for|add reminder to)\s*", "", clean_text).strip()
            if not rem_text:
                rem_text = "Important task reminder"
            rem_res = self.alarms.add_reminder(text=rem_text, time_str="Today 18:00")
            speech = f"I will remind you to {rem_text}."
            display = f"🔔 **Reminder Set**: {rem_text}"
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "alarms",
                "alarms_data": self.alarms.get_all(),
                "created_item": rem_res,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        if is_list_alarms:
            all_items = self.alarms.get_all()
            speech = f"You have {len(all_items['alarms'])} alarms and {len(all_items['timers'])} timers configured."
            display = (
                f"⏰ **Smart Alarms & Timers**\n"
                f"- **Alarms**: {len(all_items['alarms'])} active\n"
                f"- **Timers**: {len(all_items['timers'])} active\n"
                f"- **Reminders**: {len(all_items['reminders'])} active"
            )
            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "alarms",
                "alarms_data": all_items,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 12. WEATHER, NEWS & DAILY BRIEFING ---
        is_briefing_intent = any(w in lowered for w in [
            "daily briefing", "morning briefing", "briefing", "daily update",
            "news briefing", "brief me", "executive briefing", "what's the news",
            "latest news", "today's briefing", "news update"
        ])
        if is_briefing_intent:
            logger.info("Daily briefing generated for user: '%s'", clean_text)
            w_data = self.weather.get_weather()
            tasks = self.planner.get_deadlines()
            energy = self.smart_home.get_energy_summary()
            briefing = self.news.generate_daily_briefing(w_data, tasks, energy)
            speech = briefing.get("spoken_briefing") or briefing.get("spoken", "Here is your daily briefing.")
            display = briefing.get("display_briefing") or briefing.get("display", speech)

            reply_payload = {
                "speech_reply": speech,
                "display_reply": display,
                "reply": speech,
                "mood": mood_data,
                "type": "daily_briefing",
                "briefing": briefing,
                "location": current_location,
                "media": None
            }
            self.conversation_mgr.append_message(conversation_id, "assistant", display, reply_payload)
            return reply_payload

        # --- 13. GENERAL CONVERSATION & GEMINI REASONING ---
        speech = None
        display_reply = None
        executed_action_type = "conversation"
        extra_payload = {}
        response_source = "offline_fallback"
        provider_error = None

        providers_to_try = self._provider_order()
        if not providers_to_try:
            provider_error = "No configured LLM provider is ready. Add a valid API key for the selected provider."
        if providers_to_try:
            try:
                history = self.conversation_mgr.get_recent_messages(conversation_id, limit=40)
                history_lines = [f"{m['role'].capitalize()}: {m['content']}" for m in history[:-1]]
                history_context = "\n".join(history_lines) if history_lines else "None"

                stored_memories = [m['content'] for m in self.memory.list_memories()[:3]]
                mem_context = "; ".join(stored_memories) if stored_memories else "None"

                active_tasks = [
                    f"{t['title']} (due {t['due_date']})"
                    for t in self.planner.get_deadlines() if t['status'] != 'completed'
                ][:20]
                task_context = "; ".join(active_tasks) if active_tasks else "None"

                prompt = (
                    "You are NOVA, an intelligent, empathetic conversational voice AI assistant inspired by Alexa+ (Alexa-Next 2.0).\n"
                    f"Local date and time: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
                    f"User State: Mood={mood_data.get('primary_mood', 'calm')}, Location={current_location.get('address', 'Unknown')}\n"
                    f"Known User Memories: {mem_context}\n"
                    f"Upcoming Tasks: {task_context}\n\n"
                    f"Conversation History:\n{history_context}\n\n"
                    f"User says: {clean_text}\n\n"
                    "INSTRUCTIONS:\n"
                    "1. CONVERSATIONAL FIRST: If the user is greeting you ('hi', 'hello', 'hey', etc.), asking how you are, making small talk, or asking a conversational question, respond warmly, pleasantly, and directly as their personal AI companion in 2-3 sentences. DO NOT treat casual greetings or chatter as a web search query! NEVER return search queries or URL dumps for simple hellos or conversational queries.\n"
                    "2. CONVERSATION TASK TRACKING: Review recent chat history for a clear task, assignment, appointment, exam, or other commitment belonging to the user. If the latest user message states or clarifies an explicit due date (including one mentioned in the immediately relevant recent chat), create a task automatically with its exact title, ISO due date/time, category, and priority using the create_task action. Use 17:00 local time if only a date is given. Do not create tasks for hypotheticals, past events, or vague dates; ask one short question when a commitment is clear but its date is missing or ambiguous. Do not duplicate an existing task. Nova schedules a reminder one hour before each upcoming deadline.\n"
                    "3. ACTION EXECUTION: If the user asks you to control a smart home appliance, create a task/deadline, or record a memory, output a JSON block in this exact format:\n"
                    "   ```json\n"
                    "   {\n"
                    "     \"action\": \"set_device_state\" | \"create_task\" | \"save_memory\",\n"
                    "     \"args\": { ... },\n"
                    "     \"speech\": \"Spoken answer confirming the action\"\n"
                    "   }\n"
                    "   ```\n"
                    "4. NATURAL SPEECH: Answer open-ended questions directly and naturally; do not repeat fixed scripts or describe your routing. Match the user's language and level of formality. Be clear and concise, and ask one focused follow-up only when needed. If unsure, say so rather than inventing facts."
                )

                raw_text = ""
                provider_failures = []
                for provider in providers_to_try:
                    try:
                        raw_text = self._generate_provider_text(provider, prompt)
                        if raw_text:
                            response_source = provider
                            break
                        provider_failures.append(f"{provider}: empty response")
                    except Exception as exc:
                        status_code = getattr(getattr(exc, "response", None), "status_code", None)
                        detail = str(exc)
                        for secret in (self.gemini_key, self.openai_key, self.compatible_llm_key):
                            if secret:
                                detail = detail.replace(secret, "[redacted]")
                        detail = re.sub(r"(?i)(api[_ -]?key|authorization|bearer)\s*[:=]\s*[^\s,;]+", r"\1=[redacted]", detail)
                        detail = detail[:240] or type(exc).__name__
                        failure = f"HTTP {status_code}: {detail}" if status_code else f"{type(exc).__name__}: {detail}"
                        provider_failures.append(f"{provider}: {failure}")
                        logger.warning("LLM provider %s failed; trying the next configured provider (%s)", provider, failure)

                if raw_text:
                    # Check if Gemini output an action JSON
                    if "```json" in raw_text or ('"action":' in raw_text and '"args":' in raw_text):
                        try:
                            json_str = raw_text
                            if "```json" in raw_text:
                                json_str = raw_text.split("```json")[1].split("```")[0].strip()
                            elif "```" in raw_text:
                                json_str = raw_text.split("```")[1].split("```")[0].strip()
                            action_data = json.loads(json_str)
                            act = action_data.get("action")
                            args = action_data.get("args", {})
                            speech = action_data.get("speech", "Action executed.")
                            display_reply = speech

                            # Actually execute the tool!
                            exec_res = self.tools.execute_tool(act, args, approved=True)
                            logger.info("Gemini action %s executed: %s", act, exec_res.get("ok"))

                            if act == "set_device_state":
                                executed_action_type = "smart_home"
                                extra_payload["smart_home"] = {
                                    "action": "toggle",
                                    "device": exec_res.get("result"),
                                    "devices": self.smart_home.list_devices(),
                                    "energy": self.smart_home.get_energy_summary()
                                }
                            elif act == "create_task":
                                executed_action_type = "deadlines"
                                if exec_res.get("ok"):
                                    new_task = exec_res.get("result")
                                    explicit_reminder = re.search(
                                        r"\b(?:remind me|reminder|set (?:me )?a reminder)\b",
                                        clean_text, re.IGNORECASE
                                    )
                                    if explicit_reminder:
                                        new_reminder = reminder_service.add_reminder(
                                            f"Reminder: {new_task['title']}", new_task["due_date"][:16]
                                        )
                                    else:
                                        new_reminder = self._schedule_deadline_reminder(new_task)
                                    extra_payload["deadlines"] = self.planner.get_deadlines()
                                    extra_payload["new_task"] = new_task
                                    extra_payload["new_reminder"] = new_reminder
                                    if new_reminder:
                                        speech = f"{speech} I’ve also scheduled a reminder for {new_reminder['due_time']}."
                                        display_reply = speech
                        except Exception as j_err:
                            logger.warning("Error parsing Gemini action JSON: %s", j_err)
                            speech = raw_text
                            display_reply = raw_text
                    else:
                        speech = raw_text
                        display_reply = raw_text
                else:
                    provider_error = "All configured AI providers failed (" + "; ".join(provider_failures) + "). Check each provider's key, model access, quota, and network."
            except Exception as exc:
                logger.warning("Preparing LLM request failed: %s", exc)
                provider_error = "Could not prepare the AI request. Check the backend logs for details."
                speech = None

        # Fallback to local conversation engine
        if not speech:
            if provider_error:
                speech = "I can’t generate a chat answer right now because the configured AI provider is unavailable. Please check its quota or configure another working provider."
                display_reply = speech
            else:
                conv_res = self.conversation.generate_response(clean_text, mood_data, current_location)
                speech = conv_res["speech"]
                display_reply = conv_res.get("display", speech)

        # --- 10. CRITICAL MEDIA FIX: ONLY fetch media when user EXPLICITLY asks for images or videos! ---
        media = None
        needs_media = any(w in lowered for w in [
            "show me", "image", "picture", "photo", "photos", "video", "videos",
            "look like", "youtube", "what does it look like"
        ])
        if needs_media:
            # Query Wikipedia and YouTube search only when explicitly requested
            search_query = re.sub(r"(?i)\b(show me|pictures? of|photos? of|images? of|videos? of|what does|look like)\b", "", clean_text).strip()
            if not search_query:
                search_query = clean_text
            media = self.media_service.fetch_knowledge_and_media(search_query)

        if not extra_payload.get("new_task"):
            captured = self._capture_conversation_deadline(conversation_id, clean_text)
            if captured:
                task = captured["task"]
                reminder = captured.get("reminder")
                confirmation = f"I picked up your {task['category'].lower()} commitment and added '{task['title']}' to Tasks & Deadlines for {task['due_date']}."
                if reminder:
                    confirmation += f" I’ll remind you on {reminder['due_time']}."
                speech = confirmation if response_source == "offline_fallback" else (f"{speech} {confirmation}" if speech else confirmation)
                display_reply = f"{display_reply}\n\n📌 {confirmation}" if display_reply else confirmation
                executed_action_type = "deadlines"
                extra_payload.update({
                    "deadlines": self.planner.get_deadlines(),
                    "new_task": task,
                    "new_reminder": reminder
                })

        reply_payload = {
            "speech_reply": speech,
            "display_reply": display_reply,
            "reply": speech,
            "mood": mood_data,
            "type": executed_action_type if executed_action_type != "conversation" else ("knowledge" if media else "conversation"),
            "media": media,
            "location": current_location,
            "mission_plan": None,
            "response_source": response_source,
            "response_model": self._model_for_provider(response_source) if response_source != "offline_fallback" else None,
            "provider_error": provider_error,
            **extra_payload
        }

        self.conversation_mgr.append_message(conversation_id, "assistant", display_reply, reply_payload)
        return reply_payload
