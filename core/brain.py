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
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List

from dotenv import load_dotenv

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

        # Gemini API Configuration
        self.gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash").strip()
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

        # Analyze mood & sentiment
        mood_data = self.mood_engine.analyze(clean_text)

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

            # Split title from due date if "due" or "by" or "on" is present
            due_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d 17:00")
            if "tomorrow" in lowered:
                due_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d 17:00")
            elif "tonight" in lowered or "today" in lowered:
                due_str = datetime.now().strftime("%Y-%m-%d 21:00")
            elif "friday" in lowered:
                # Next Friday approximation
                due_str = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d 17:00")
            elif "monday" in lowered:
                due_str = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d 17:00")

            # Clean title
            task_title = title_text if title_text else "Upcoming Assignment"
            # Remove trailing due hints from title
            task_title = re.sub(r"(?i)\s*(?:due|by|on)\s+(?:tomorrow|tonight|today|friday|monday|next week).*", "", task_title).strip()
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

            speech = f"I've added '{task_title}' to your tasks, scheduled for {due_str}."
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

        if self.gemini_client:
            try:
                history = self.conversation_mgr.get_messages(conversation_id, limit=8)
                history_lines = [f"{m['role'].capitalize()}: {m['content']}" for m in history[:-1]]
                history_context = "\n".join(history_lines) if history_lines else "None"

                stored_memories = [m['content'] for m in self.memory.list_memories()[:3]]
                mem_context = "; ".join(stored_memories) if stored_memories else "None"

                active_tasks = [t['title'] for t in self.planner.get_deadlines() if t['status'] != 'completed'][:3]
                task_context = ", ".join(active_tasks) if active_tasks else "None"

                prompt = (
                    "You are NOVA, an intelligent, empathetic conversational voice AI assistant inspired by Alexa+ (Alexa-Next 2.0).\n"
                    f"User State: Mood={mood_data.get('primary_mood', 'calm')}, Location={current_location.get('address', 'Unknown')}\n"
                    f"Known User Memories: {mem_context}\n"
                    f"Upcoming Tasks: {task_context}\n\n"
                    f"Conversation History:\n{history_context}\n\n"
                    f"User says: {clean_text}\n\n"
                    "INSTRUCTIONS:\n"
                    "1. CONVERSATIONAL FIRST: If the user is greeting you ('hi', 'hello', 'hey', etc.), asking how you are, making small talk, or asking a conversational question, respond warmly, pleasantly, and directly as their personal AI companion in 2-3 sentences. DO NOT treat casual greetings or chatter as a web search query! NEVER return search queries or URL dumps for simple hellos or conversational queries.\n"
                    "2. ACTION EXECUTION: If the user specifically asks you to control a smart home appliance, create a task/deadline, or record a memory, output a JSON block in this exact format:\n"
                    "   ```json\n"
                    "   {\n"
                    "     \"action\": \"set_device_state\" | \"create_task\" | \"save_memory\",\n"
                    "     \"args\": { ... },\n"
                    "     \"speech\": \"Spoken answer confirming the action\"\n"
                    "   }\n"
                    "   ```\n"
                    "3. NATURAL SPEECH: When answering questions or conversing, speak like a capable, empathetic companion. Keep responses clear, concise, and conversational."
                )

                response = self.gemini_client.models.generate_content(
                    model=self.gemini_model,
                    contents=prompt
                )
                if response and response.text:
                    raw_text = response.text.strip()
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
                                extra_payload["deadlines"] = self.planner.get_deadlines()
                                extra_payload["new_task"] = exec_res.get("result")
                        except Exception as j_err:
                            logger.warning("Error parsing Gemini action JSON: %s", j_err)
                            speech = raw_text
                            display_reply = raw_text
                    else:
                        speech = raw_text
                        display_reply = raw_text
            except Exception as exc:
                logger.info("Gemini provider unavailable (%s). Falling back to local conversation engine.", exc)
                speech = None

        # Fallback to local conversation engine
        if not speech:
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

        reply_payload = {
            "speech_reply": speech,
            "display_reply": display_reply,
            "reply": speech,
            "mood": mood_data,
            "type": executed_action_type if executed_action_type != "conversation" else ("knowledge" if media else "conversation"),
            "media": media,
            "location": current_location,
            "mission_plan": None,
            **extra_payload
        }

        self.conversation_mgr.append_message(conversation_id, "assistant", display_reply, reply_payload)
        return reply_payload
