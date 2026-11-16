"""
Alexa Ecosystem Devices Manager for Nova AI Assistant.
Simulates and manages genuine interactive states and controls for:
1. Amazon Fire TV (remote D-Pad navigation, app launching, playback, volume)
2. Ring Video Doorbell (live camera stream, 2-way talk, chime, security modes)
3. Ecobee ("bee") Smart Thermostat (temperature dial, HVAC cool/heat/eco, humidity, energy)
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from core.database import db

logger = logging.getLogger(__name__)


class AlexaDevicesManager:
    def __init__(self):
        self.init_db()
        self._load_state()

    def init_db(self):
        """Ensure database table exists for ecosystem device configurations."""
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS alexa_ecosystem_devices (
                        device_key TEXT PRIMARY KEY,
                        device_type TEXT NOT NULL,
                        name TEXT NOT NULL,
                        state_json TEXT NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
        except Exception as exc:
            logger.warning("Error initializing alexa_ecosystem_devices table: %s", exc)

    def _load_state(self):
        """Loads state from database or initializes defaults."""
        defaults = {
            "fire_tv": {
                "id": "fire_tv",
                "name": "Fire TV 4K Max (Living Room)",
                "type": "fire_tv",
                "power": True,
                "current_app": "Prime Video",
                "playback_state": "playing",
                "now_playing": {
                    "title": "The Lord of the Rings: The Rings of Power",
                    "app": "Prime Video",
                    "duration": "1:08:24",
                    "position": "34:12",
                    "quality": "4K Ultra HD • Dolby Atmos"
                },
                "volume": 35,
                "muted": False
            },
            "ring_doorbell": {
                "id": "ring_doorbell",
                "name": "Ring Video Doorbell Pro (Front Door)",
                "type": "ring_doorbell",
                "online": True,
                "battery": 88,
                "wifi_rssi": "-48 dBm (Strong)",
                "security_mode": "home",  # 'disarmed', 'home', 'away'
                "motion_detected": False,
                "doorbell_ringing": False,
                "two_way_talk_active": False,
                "last_motion_time": datetime.now().strftime("%I:%M %p"),
                "quick_replies": [
                    "Please leave the package outside the door.",
                    "Hi there! We will be right there.",
                    "Sorry, we cannot come to the door right now.",
                    "Thanks for stopping by! Please leave a note."
                ],
                "recent_events": [
                    {"time": "10 mins ago", "event": "Motion Detected", "type": "motion"},
                    {"time": "1 hour ago", "event": "Doorbell Pressed", "type": "ring"},
                    {"time": "Yesterday", "event": "Package Delivered", "type": "package"}
                ]
            },
            "ecobee_thermostat": {
                "id": "ecobee_thermostat",
                "name": "Ecobee Smart Thermostat Premium",
                "type": "ecobee",
                "power": True,
                "current_temp": 23.5,
                "target_temp": 21.0,
                "unit": "°C",
                "hvac_mode": "cool",  # 'cool', 'heat', 'eco', 'auto', 'off'
                "fan_mode": "auto",   # 'auto', 'on'
                "humidity": 48,
                "air_quality": "Clean (AQI 22)",
                "eco_mode": True,
                "schedule_mode": "Home"
            }
        }

        self.devices = {}
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT device_key, state_json FROM alexa_ecosystem_devices")
                rows = cursor.fetchall()
                loaded_keys = set()
                for r in rows:
                    key = r["device_key"]
                    loaded_keys.add(key)
                    try:
                        self.devices[key] = json.loads(r["state_json"])
                    except Exception:
                        self.devices[key] = defaults.get(key, {})

                # Insert missing defaults into database
                for k, v in defaults.items():
                    if k not in loaded_keys:
                        self.devices[k] = v
                        cursor.execute("""
                            INSERT OR REPLACE INTO alexa_ecosystem_devices (device_key, device_type, name, state_json)
                            VALUES (?, ?, ?, ?)
                        """, (k, v["type"], v["name"], json.dumps(v)))
                conn.commit()
        except Exception as exc:
            logger.warning("Could not read alexa_ecosystem_devices from DB: %s", exc)
            self.devices = defaults

    def _persist_device(self, key: str):
        """Saves current state of a device to SQLite."""
        if key not in self.devices:
            return
        dev = self.devices[key]
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO alexa_ecosystem_devices (device_key, device_type, name, state_json, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (key, dev["type"], dev["name"], json.dumps(dev)))
                conn.commit()
        except Exception as exc:
            logger.warning("Error saving ecosystem device %s: %s", key, exc)

    def get_all_ecosystem_devices(self) -> Dict[str, Any]:
        """Returns all ecosystem devices in one dashboard payload."""
        return self.devices

    # =========================================================================
    # 1. AMAZON FIRE TV CONTROLLER
    # =========================================================================
    def fire_tv_action(self, action: str, param: Optional[Any] = None) -> Dict[str, Any]:
        """
        Executes Fire TV controls:
        action: 'power', 'nav', 'playback', 'app', 'volume', 'mute'
        """
        tv = self.devices.get("fire_tv", {})
        msg = "Fire TV command executed."

        if action == "power":
            if param == "on":
                tv["power"] = True
            elif param == "off":
                tv["power"] = False
            else:
                tv["power"] = not tv.get("power", True)
            msg = f"Fire TV powered {'ON' if tv['power'] else 'OFF'}."

        elif action == "app":
            app_name = str(param or "Prime Video")
            tv["current_app"] = app_name
            tv["power"] = True
            tv["playback_state"] = "playing"
            tv["now_playing"]["app"] = app_name
            if "prime" in app_name.lower():
                tv["now_playing"]["title"] = "The Lord of the Rings: The Rings of Power"
            elif "netflix" in app_name.lower():
                tv["now_playing"]["title"] = "Stranger Things"
            elif "youtube" in app_name.lower():
                tv["now_playing"]["title"] = "Top 4K Nature Ambient Stream"
            elif "disney" in app_name.lower():
                tv["now_playing"]["title"] = "The Mandalorian"
            else:
                tv["now_playing"]["title"] = f"Featured content on {app_name}"
            msg = f"Launched {app_name} on Fire TV."

        elif action == "playback":
            cmd = str(param or "toggle").lower()
            if cmd in ("pause", "stop"):
                tv["playback_state"] = "paused"
                msg = f"Paused playback on Fire TV ({tv['now_playing']['title']})."
            elif cmd in ("play", "resume"):
                tv["playback_state"] = "playing"
                msg = f"Resumed playing {tv['now_playing']['title']} on Fire TV."
            else:
                tv["playback_state"] = "paused" if tv.get("playback_state") == "playing" else "playing"
                msg = f"Playback {tv['playback_state']} on Fire TV."

        elif action == "volume":
            try:
                change = int(param) if param is not None else 5
                new_vol = max(0, min(100, tv.get("volume", 30) + change))
                tv["volume"] = new_vol
                tv["muted"] = False
                msg = f"Fire TV volume set to {new_vol}%."
            except Exception:
                pass

        elif action == "mute":
            tv["muted"] = not tv.get("muted", False)
            msg = f"Fire TV {'muted' if tv['muted'] else 'unmuted'}."

        elif action == "nav":
            direction = str(param or "select").upper()
            msg = f"Fire TV Remote: Pressed {direction}."

        self._persist_device("fire_tv")
        return {
            "ok": True,
            "message": msg,
            "fire_tv": tv
        }

    # =========================================================================
    # 2. RING VIDEO DOORBELL & SECURITY
    # =========================================================================
    def ring_action(self, action: str, param: Optional[Any] = None) -> Dict[str, Any]:
        """
        Executes Ring controls:
        action: 'chime', 'talk', 'quick_reply', 'security_mode', 'trigger_motion'
        """
        ring = self.devices.get("ring_doorbell", {})
        msg = "Ring Video Doorbell updated."

        if action == "chime":
            ring["doorbell_ringing"] = True
            ring["last_motion_time"] = datetime.now().strftime("%I:%M %p")
            ring["recent_events"].insert(0, {
                "time": "Just now",
                "event": "Front Doorbell Chime Pressed",
                "type": "ring"
            })
            if len(ring["recent_events"]) > 8:
                ring["recent_events"].pop()
            msg = "Ding-Dong! Front doorbell chime rang. Live camera preview active."

        elif action == "talk":
            ring["two_way_talk_active"] = not ring.get("two_way_talk_active", False)
            msg = f"Ring 2-Way Intercom {'connected. You are now speaking to visitor.' if ring['two_way_talk_active'] else 'disconnected.'}"

        elif action == "quick_reply":
            reply_idx = int(param or 0)
            replies = ring.get("quick_replies", [])
            reply_text = replies[reply_idx] if 0 <= reply_idx < len(replies) else replies[0]
            msg = f"Ring speaker broadcast: \"{reply_text}\""

        elif action == "security_mode":
            mode = str(param or "home").lower()
            if mode in ("disarmed", "home", "away"):
                ring["security_mode"] = mode
                msg = f"Ring Security Mode updated to: {mode.upper()}."

        elif action == "trigger_motion":
            ring["motion_detected"] = True
            ring["last_motion_time"] = datetime.now().strftime("%I:%M %p")
            msg = "Motion detected at front door!"

        self._persist_device("ring_doorbell")
        return {
            "ok": True,
            "message": msg,
            "ring_doorbell": ring
        }

    # =========================================================================
    # 3. ECOBEE SMART THERMOSTAT ("bee")
    # =========================================================================
    def ecobee_action(self, action: str, param: Optional[Any] = None) -> Dict[str, Any]:
        """
        Executes Ecobee controls:
        action: 'set_temp', 'hvac_mode', 'eco', 'fan', 'power'
        """
        eco = self.devices.get("ecobee_thermostat", {})
        msg = "Ecobee thermostat updated."

        if action == "set_temp":
            try:
                target = round(float(param), 1)
                eco["target_temp"] = max(16.0, min(30.0, target))
                msg = f"Ecobee target temperature set to {eco['target_temp']}°C."
            except Exception:
                pass

        elif action == "temp_step":
            try:
                step = float(param or 1.0)
                new_t = round(eco.get("target_temp", 21.0) + step, 1)
                eco["target_temp"] = max(16.0, min(30.0, new_t))
                msg = f"Adjusted Ecobee target temperature to {eco['target_temp']}°C."
            except Exception:
                pass

        elif action == "hvac_mode":
            mode = str(param or "cool").lower()
            if mode in ("cool", "heat", "eco", "auto", "off"):
                eco["hvac_mode"] = mode
                eco["eco_mode"] = (mode == "eco")
                msg = f"Ecobee HVAC mode switched to {mode.upper()}."

        elif action == "eco":
            eco["eco_mode"] = not eco.get("eco_mode", True)
            if eco["eco_mode"]:
                eco["hvac_mode"] = "eco"
                eco["target_temp"] = 23.0
                msg = "Ecobee Eco Mode enabled (optimizing energy savings)."
            else:
                eco["hvac_mode"] = "cool"
                msg = "Ecobee Eco Mode disabled."

        elif action == "fan":
            eco["fan_mode"] = "on" if eco.get("fan_mode") == "auto" else "auto"
            msg = f"Ecobee fan set to {eco['fan_mode'].upper()}."

        elif action == "power":
            eco["power"] = not eco.get("power", True)
            msg = f"Ecobee thermostat powered {'ON' if eco['power'] else 'OFF'}."

        self._persist_device("ecobee_thermostat")
        return {
            "ok": True,
            "message": msg,
            "ecobee": eco
        }


# Singleton instance
alexa_devices = AlexaDevicesManager()
