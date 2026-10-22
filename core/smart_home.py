"""
Smart Home & Energy Optimization Engine for Nova / Alexa Aura.
Manages simulated IoT devices, persistent database states, power calculations,
energy-saving recommendations, and tool execution.
"""

from typing import Dict, Any, List, Optional
import logging
from core.database import db

logger = logging.getLogger(__name__)

class SmartHomeManager:
    def __init__(self):
        self._sync_from_db()

    def _sync_from_db(self):
        """Loads devices from persistent SQLite database."""
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, name, device_type, is_on, watts, room FROM smart_devices")
                rows = cursor.fetchall()
                if rows:
                    self.devices = {}
                    for r in rows:
                        self.devices[r["id"]] = {
                            "id": r["id"],
                            "name": r["name"],
                            "type": r["device_type"],
                            "on": bool(r["is_on"]),
                            "watts": r["watts"],
                            "room": r["room"]
                        }
                    return
        except Exception as exc:
            logger.warning("Could not sync smart devices from db: %s", exc)

        # Fallback default devices
        self.devices: Dict[str, Dict[str, Any]] = {
            "living_room_light": {
                "id": "living_room_light",
                "name": "Living Room Light",
                "type": "light",
                "on": True,
                "watts": 9,
                "room": "Living Room"
            },
            "bedroom_fan": {
                "id": "bedroom_fan",
                "name": "Bedroom Fan",
                "type": "fan",
                "on": False,
                "watts": 55,
                "room": "Bedroom"
            },
            "television": {
                "id": "television",
                "name": "Smart Television",
                "type": "tv",
                "on": False,
                "watts": 80,
                "room": "Living Room"
            },
            "kitchen_ac": {
                "id": "kitchen_ac",
                "name": "Kitchen Cooler / AC",
                "type": "ac",
                "on": False,
                "watts": 120,
                "room": "Kitchen"
            }
        }

    def list_devices(self) -> Dict[str, Dict[str, Any]]:
        """List all smart-home devices and their active states."""
        self._sync_from_db()
        return self.devices

    def get_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        self._sync_from_db()
        return self.devices.get(device_id)

    def set_device_state(self, device_identifier: str, on: bool) -> Dict[str, Any]:
        """Change a device state. Matches by exact ID or fuzzy device name and updates persistent SQLite storage."""
        self._sync_from_db()
        key = None
        target_clean = device_identifier.lower().replace("-", "_").replace(" ", "_").strip()

        if target_clean in self.devices:
            key = target_clean
        else:
            # Fuzzy match on key or human-friendly name
            for d_id, d in self.devices.items():
                d_name_clean = d["name"].lower()
                if (target_clean in d_id or target_clean in d_name_clean or 
                    any(part in d_name_clean for part in target_clean.split("_") if len(part) > 2)):
                    key = d_id
                    break

        if not key:
            return {
                "ok": False,
                "error": f"Unknown device '{device_identifier}'. Available: {', '.join(d['name'] for d in self.devices.values())}",
                "simulated": True
            }

        self.devices[key]["on"] = on
        watts = self.devices[key]["watts"]
        action_verb = "powered ON" if on else "switched OFF"

        # Persist to database
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE smart_devices
                    SET is_on = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (1 if on else 0, key))
                conn.commit()
        except Exception as exc:
            logger.warning("Failed to persist device state to db: %s", exc)

        logger.info("Smart Home: %s %s (%dW) [Persisted in SQLite]", self.devices[key]['name'], action_verb, watts)

        return {
            "ok": True,
            "device_id": key,
            "name": self.devices[key]["name"],
            "on": on,
            "watts": watts,
            "room": self.devices[key]["room"],
            "note": f"{self.devices[key]['name']} is now {action_verb}.",
            "simulated": True
        }

    def get_energy_summary(self) -> Dict[str, Any]:
        """Calculates real-time estimated energy draw and active load from devices."""
        self._sync_from_db()
        active = [d for d in self.devices.values() if d["on"]]
        total_watts = sum(d["watts"] for d in active)
        
        return {
            "estimated_current_watts": total_watts,
            "active_devices_count": len(active),
            "active_devices": [d["name"] for d in active],
            "total_devices_count": len(self.devices),
            "unit": "W",
            "is_simulated": True
        }

    def get_saving_tips(self) -> List[str]:
        """Returns actionable energy conservation recommendations."""
        return [
            "Switch off lights in empty rooms to save up to 15% on daily lighting consumption.",
            "Use ceiling or desk fans before lowering air conditioning temperature settings.",
            "Turn off idle standby power on smart screens and gaming consoles when away.",
            "Utilize natural daylight during peak daylight hours between 10 AM and 4 PM."
        ]


# Singleton instance for consistent state across FastMCP and FastAPI
smart_home_hub = SmartHomeManager()
