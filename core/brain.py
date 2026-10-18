"""
Core Brain & Multimodal AI Reasoner for Nova AI Assistant.
Orchestrates conversation, tool calling, real-time media, location services, wellbeing, and SOS response.
"""

import os
import re
from datetime import datetime
from typing import Dict, Any, Optional

from .mood_engine import MoodEngine
from .emergency_guardian import EmergencyGuardian
from .location_service import LocationService
from .media_service import MediaService
from .wellbeing_tracker import WellbeingTracker
from .planner import Planner

class NovaBrain:
    def __init__(self):
        self.mood_engine = MoodEngine()
        self.guardian = EmergencyGuardian()
        self.location_service = LocationService()
        self.media_service = MediaService()
        self.wellbeing = WellbeingTracker()
        self.planner = Planner()
        
        # Check for Gemini API key
        self.gemini_key = os.environ.get("GEMINI_API_KEY", "")
        self.has_gemini = bool(self.gemini_key)

    def process_message(self, user_text: str, user_lat: Optional[float] = None, user_lng: Optional[float] = None) -> Dict[str, Any]:
        """
        Main cognitive loop:
        1. Analyzes user mood and distress levels.
        2. Updates location if provided.
        3. Identifies intent (Emergency, Navigation, Planning, Wellbeing, Knowledge).
        4. Synthesizes conversational spoken text (for Alexa-like voice) and visual cards.
        """
        clean_text = user_text.strip()
        lowered = clean_text.lower()
        
        # 1. Update location coordinates if received from client
        current_location = None
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
        if mood_data["is_emergency"] or any(k in lowered for k in ["help me", "call police", "call ambulance", "accident", "emergency", "danger"]):
            sos_res = self.guardian.trigger_sos(
                situation_description=clean_text,
                lat=current_location["coords"]["lat"],
                lng=current_location["coords"]["lng"],
                address=current_location["address"]
            )
            return {
                "speech_reply": sos_res["speech_reply"],
                "display_reply": "🚨 EMERGENCY TRIGGERED: Coordinates and SOS signal sent to emergency contacts and emergency services.",
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
            speech = f"You are currently at {resolved['display_name']}. I have pinpointed your exact position on your map."
            return {
                "speech_reply": speech,
                "display_reply": f"📍 **Current Location**: {resolved['display_name']}\nGPS Coordinates: `{current_location['coords']['lat']:.4f}, {current_location['coords']['lng']:.4f}`",
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
            # Extract destination
            match = re.search(r"(?:directions to|navigate to|route to|how to reach|go to)\s+(.+)", clean_text, re.IGNORECASE)
            dest = match.group(1).strip() if match else "nearest hospital"
            nav = self.location_service.get_route_and_directions(
                dest,
                start_lat=current_location["coords"]["lat"],
                start_lng=current_location["coords"]["lng"]
            )
            if nav.get("success"):
                speech = f"Heading to {dest}. It is {nav['distance_km']} kilometers away, approximately {nav['duration_min']} minutes. Showing route on your map."
            else:
                speech = f"I am searching for directions to {dest}."
            return {
                "speech_reply": speech,
                "display_reply": f"🧭 **Route to {dest}**\n- Distance: **{nav.get('distance_km', 'N/A')} km**\n- Estimated travel time: **{nav.get('duration_min', 'N/A')} mins**",
                "mood": mood_data,
                "type": "navigation",
                "location": current_location,
                "navigation": nav,
                "media": None,
                "planner": None,
                "wellbeing": None
            }

        # 5. Daily Schedule & Conversation-based Day Planner
        if any(w in lowered for w in ["prepare my day", "daily plan", "my schedule", "what is my day", "plan my day", "daily agenda"]):
            plan = self.planner.generate_daily_plan()
            speech = f"Here is your personalized daily plan for {plan['date']}. You have {plan['urgent_deadlines_count']} critical deadlines to focus on today. I have organized your focus blocks accordingly."
            return {
                "speech_reply": speech,
                "display_reply": f"📅 **Daily Agenda for {plan['date']}**\nPrepared based on your recent commitments and active deadlines.",
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
            # Check if adding a deadline
            if any(k in lowered for k in ["add", "remind me", "due on", "due tomorrow", "due at"]):
                title_match = re.search(r"(?:remind me to submit|add deadline for|submit)\s+([^,]+)", clean_text, re.IGNORECASE)
                item_title = title_match.group(1).strip() if title_match else "Submission task"
                # Add sample deadline for tomorrow
                tomorrow_str = (datetime.now()).strftime("%Y-%m-%d 18:00")
                new_d = self.planner.add_deadline(item_title, tomorrow_str, priority="high")
                speech = f"Recorded! I added '{item_title}' to your submission tracker and will remind you before the deadline."
            else:
                speech = "Here are your active submission deadlines. Make sure to complete high-priority items on time."

            deadlines_list = self.planner.get_deadlines()
            return {
                "speech_reply": speech,
                "display_reply": "📋 **Submission Tracker & Deadlines**",
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
            if "focus mode" in lowered or "lock" in lowered:
                status_msg = self.wellbeing.toggle_focus_mode(True)
                speech = "Focus mode is now active. I am limiting recreational apps so you can stay productive."
            else:
                wb = self.wellbeing.get_summary()
                speech = f"Your total screen time today is {wb['total_screen_time_formatted']}. You have used {wb['percent_used']} percent of your daily limit."

            wb_summary = self.wellbeing.get_summary()
            return {
                "speech_reply": speech,
                "display_reply": f"📱 **Digital Wellbeing Report**\nScreen time: **{wb_summary['total_screen_time_formatted']}** / Daily Goal: **{wb_summary['daily_limit_mins']}m**",
                "mood": mood_data,
                "type": "wellbeing",
                "wellbeing": wb_summary,
                "location": current_location,
                "media": None,
                "navigation": None,
                "planner": None
            }

        # 8. General Knowledge, Real-Time Information, Images & Videos
        # Query MediaService for factual data, real images, and video explanations
        media = self.media_service.fetch_knowledge_and_media(clean_text)
        
        # Check if user is asking for images specifically
        needs_media = any(w in lowered for w in ["show me", "image", "picture", "video", "photo", "what is", "who is", "explain", "tell me about", "look like"])
        
        # Conversational speech formulation
        if media.get("summary"):
            short_summary = media["summary"].split(". ")[0] + "."
            speech = f"{short_summary} I have also loaded relevant real images and videos on your screen."
        else:
            mood_tone = mood_data["primary_mood"]
            if mood_tone == "stressed":
                speech = "I hear you, and it sounds like things are heavy right now. Take a deep breath. How can I help you tackle your tasks or organize your day?"
            elif mood_tone == "sad":
                speech = "I'm right here with you. Remember to take things one small step at a time. I can adjust your schedule or play something relaxing."
            elif mood_tone == "joyful":
                speech = "That's wonderful to hear! Love the positive energy. What would you like to do next?"
            else:
                speech = f"I've got you covered regarding {clean_text}. Here is what you need to know, along with visual details."

        return {
            "speech_reply": speech,
            "display_reply": media.get("summary") or f"Information and assistance ready for: '{clean_text}'.",
            "mood": mood_data,
            "type": "knowledge",
            "media": media if (media.get("primary_image") or needs_media) else None,
            "location": current_location,
            "navigation": None,
            "planner": None,
            "wellbeing": None
        }
