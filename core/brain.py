"""
Core Brain & Multimodal AI Reasoner for Nova AI Assistant.
Orchestrates dynamic conversation, multi-turn dialogue, real-time media,
location services, daily planning, wellbeing, and emergency SOS response.
Operates fully offline with built-in natural dialogue, with optional Gemini enhancement.
"""

import os
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from dotenv import load_dotenv

from .mood_engine import MoodEngine
from .emergency_guardian import EmergencyGuardian
from .location_service import LocationService
from .media_service import MediaService
from .wellbeing_tracker import WellbeingTracker
from .planner import Planner
from .conversation_engine import ConversationEngine

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")
logger = logging.getLogger(__name__)

class NovaBrain:
    def __init__(self):
        self.mood_engine = MoodEngine()
        self.guardian = EmergencyGuardian()
        self.location_service = LocationService()
        self.media_service = MediaService()
        self.wellbeing = WellbeingTracker()
        self.planner = Planner()
        self.conversation = ConversationEngine(media_service=self.media_service)
        
        # Optional Gemini API integration with safe fallback
        self.gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()
        self.gemini_client = None

        if self.gemini_key and self.gemini_key.startswith("AIza"):
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=self.gemini_key)
                logger.info("Gemini AI client initialized successfully.")
            except Exception as exc:
                logger.warning("Could not initialize Gemini client: %s. Using built-in conversational engine.", exc)
                self.gemini_client = None
        else:
            if self.gemini_key:
                logger.info("GEMINI_API_KEY is not a standard AI Studio key. Using built-in dynamic conversational engine.")

    def process_message(self, user_text: str, user_lat: Optional[float] = None, user_lng: Optional[float] = None) -> Dict[str, Any]:
        """
        Main cognitive loop:
        1. Analyzes user mood, emotion, and distress levels.
        2. Updates location coordinates if provided.
        3. Identifies intent (Emergency, Navigation, Planning, Wellbeing, Knowledge, Chit-Chat).
        4. Synthesizes dynamic, conversational spoken text and rich visual cards.
        """
        clean_text = user_text.strip()
        lowered = clean_text.lower()
        
        # 1. Update location coordinates if received from client
        if user_lat is not None and user_lng is not None:
            current_location = self.location_service.update_coords(user_lat, user_lng)
        else:
            current_location = {
                "coords": self.location_service.last_known_coords,
                "address": self.location_service.last_known_address
            }

        # 2. Analyze Mood and Distress
        mood_data = self.mood_engine.analyze(clean_text)

        # 3. Emergency / SOS Detection (Highest Priority)
        if mood_data.get("is_emergency") or any(k in lowered for k in ["help me", "call police", "call ambulance", "accident", "emergency", "danger"]):
            sos_res = self.guardian.trigger_sos(
                situation_description=clean_text,
                lat=current_location["coords"]["lat"],
                lng=current_location["coords"]["lng"],
                address=current_location["address"]
            )
            speech = sos_res["speech_reply"]
            return {
                "speech_reply": speech,
                "display_reply": "🚨 EMERGENCY TRIGGERED: Coordinates and SOS signal sent to emergency contacts and emergency services.",
                "reply": speech,
                "mood": mood_data,
                "type": "emergency",
                "emergency_payload": sos_res,
                "location": current_location,
                "media": None,
                "navigation": None,
                "planner": None,
                "wellbeing": None
            }

        # 4. Location & Navigation queries ("Where am I?", "Take me to...", "Directions to...")
        if any(w in lowered for w in ["where am i", "my location", "current location", "track my location", "lost"]):
            resolved = self.location_service.reverse_geocode(
                current_location["coords"]["lat"],
                current_location["coords"]["lng"]
            )
            speech = self.conversation.format_location_speech(resolved["display_name"])
            self.conversation.record_turn(clean_text, speech, topic="location")
            return {
                "speech_reply": speech,
                "display_reply": f"📍 **Current Location**: {resolved['display_name']}\nGPS Coordinates: `{current_location['coords']['lat']:.4f}, {current_location['coords']['lng']:.4f}`",
                "reply": speech,
                "mood": mood_data,
                "type": "location",
                "location": {
                    "coords": current_location["coords"],
                    "address": resolved["display_name"]
                },
                "media": None,
                "navigation": None,
                "planner": None,
                "wellbeing": None
            }

        if any(w in lowered for w in ["directions to", "navigate to", "how to reach", "route to", "go to"]):
            match = re.search(r"(?:directions to|navigate to|route to|how to reach|go to)\s+(.+)", clean_text, re.IGNORECASE)
            dest = match.group(1).strip() if match else "nearest hospital"
            nav = self.location_service.get_route_and_directions(
                dest,
                start_lat=current_location["coords"]["lat"],
                start_lng=current_location["coords"]["lng"]
            )
            speech = self.conversation.format_location_speech(dest, nav_info=nav, destination=dest)
            self.conversation.record_turn(clean_text, speech, topic=f"route to {dest}")
            return {
                "speech_reply": speech,
                "display_reply": f"🧭 **Route to {dest}**\n- Distance: **{nav.get('distance_km', 'N/A')} km**\n- Estimated travel time: **{nav.get('duration_min', 'N/A')} mins**",
                "reply": speech,
                "mood": mood_data,
                "type": "navigation",
                "location": current_location,
                "navigation": nav,
                "media": None,
                "planner": None,
                "wellbeing": None
            }

        # 5. Daily Schedule & Day Planner
        if any(w in lowered for w in ["prepare my day", "daily plan", "my schedule", "what is my day", "plan my day", "daily agenda"]):
            plan = self.planner.generate_daily_plan()
            speech = self.conversation.format_planner_speech(plan)
            self.conversation.record_turn(clean_text, speech, topic="daily plan")
            return {
                "speech_reply": speech,
                "display_reply": f"📅 **Daily Agenda for {plan['date']}**\n{speech}",
                "reply": speech,
                "mood": mood_data,
                "type": "planner",
                "planner": plan,
                "location": current_location,
                "media": None,
                "navigation": None,
                "wellbeing": None
            }

        # 6. Deadlines and Submission reminders
        if any(w in lowered for w in ["deadline", "submission", "remind me to submit", "assignment due", "project due", "my deadlines"]):
            added_title = None
            if any(k in lowered for k in ["add", "remind me", "due on", "due tomorrow", "due at"]):
                title_match = re.search(r"(?:remind me to submit|add deadline for|submit)\s+([^,]+)", clean_text, re.IGNORECASE)
                item_title = title_match.group(1).strip() if title_match else "Submission task"
                tomorrow_str = (datetime.now()).strftime("%Y-%m-%d 18:00")
                self.planner.add_deadline(item_title, tomorrow_str, priority="high")
                added_title = item_title

            deadlines_list = self.planner.get_deadlines()
            speech = self.conversation.format_deadlines_speech(deadlines_list, added_title=added_title)
            self.conversation.record_turn(clean_text, speech, topic="deadlines")
            return {
                "speech_reply": speech,
                "display_reply": f"📋 **Submission Tracker**\n{speech}",
                "reply": speech,
                "mood": mood_data,
                "type": "deadlines",
                "deadlines": deadlines_list,
                "location": current_location,
                "media": None,
                "navigation": None,
                "planner": None,
                "wellbeing": None
            }

        # 7. Screen Time & Digital Wellbeing Control
        if any(w in lowered for w in ["screen time", "phone limit", "phone usage", "app limit", "digital wellbeing", "lock my phone", "focus mode"]):
            is_focus_toggle = ("focus mode" in lowered or "lock" in lowered)
            if is_focus_toggle:
                self.wellbeing.toggle_focus_mode(True)
                wb_summary = self.wellbeing.get_summary()
                speech = self.conversation.format_wellbeing_speech(wb_summary, toggled_focus=True)
            else:
                wb_summary = self.wellbeing.get_summary()
                speech = self.conversation.format_wellbeing_speech(wb_summary)

            self.conversation.record_turn(clean_text, speech, topic="wellbeing")
            return {
                "speech_reply": speech,
                "display_reply": f"📱 **Digital Wellbeing Report**\nScreen time: **{wb_summary['total_screen_time_formatted']}** / Daily Goal: **{wb_summary['daily_limit_mins']}m**\n\n{speech}",
                "reply": speech,
                "mood": mood_data,
                "type": "wellbeing",
                "wellbeing": wb_summary,
                "location": current_location,
                "media": None,
                "navigation": None,
                "planner": None
            }

        # 8. Real Conversational Intelligence & Knowledge Synthesis
        # Try Gemini if configured and working; otherwise seamlessly use built-in ConversationEngine
        speech = None
        display_reply = None
        topic = None

        if self.gemini_client:
            try:
                prompt = (
                    "You are Nova, an intelligent, empathetic voice AI assistant. "
                    "Provide a helpful, conversational, natural answer in 2 to 4 sentences. "
                    f"User: {clean_text}"
                )
                res = self.gemini_client.models.generate_content(
                    model=self.gemini_model,
                    contents=prompt
                )
                if res and res.text:
                    speech = res.text.strip()
                    display_reply = speech
                    self.conversation.record_turn(clean_text, speech)
            except Exception as exc:
                logger.info("Gemini provider unavailable (%s). Using built-in conversational engine.", exc)
                speech = None

        # If Gemini is not configured or didn't respond, use our dynamic ConversationEngine
        if not speech:
            conv_res = self.conversation.generate_response(clean_text, mood_data, current_location)
            speech = conv_res["speech"]
            display_reply = conv_res.get("display", speech)
            topic = conv_res.get("topic")

        # Visual Media & Explainer Cards
        search_query = topic if topic and topic not in ["chit-chat", "greeting", "fallback", "profile", "math", "time"] else clean_text
        media = self.media_service.fetch_knowledge_and_media(search_query)
        needs_media = any(w in lowered for w in ["show me", "image", "picture", "video", "photo", "what is", "who is", "explain", "tell me about", "look like"])
        
        has_media = bool(media.get("primary_image") or (needs_media and media.get("videos")))

        return {
            "speech_reply": speech,
            "display_reply": display_reply,
            "reply": speech,
            "mood": mood_data,
            "type": "knowledge" if has_media else "conversation",
            "media": media if has_media else None,
            "location": current_location,
            "navigation": None,
            "planner": None,
            "wellbeing": None
        }
