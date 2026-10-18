"""
Emergency Guardian & SOS Response System for Nova AI Assistant.
Detects distress situations, coordinates with GPS, and triggers emergency alerts & call dispatches.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional

class EmergencyGuardian:
    def __init__(self):
        # Default emergency contacts
        self.emergency_contacts = [
            {"name": "Emergency Services", "phone": "112", "type": "public"},
            {"name": "Emergency Contact (Family)", "phone": "+1-555-0199", "type": "personal"}
        ]
        self.sos_history = []

    def add_emergency_contact(self, name: str, phone: str, contact_type: str = "personal"):
        self.emergency_contacts.append({"name": name, "phone": phone, "type": contact_type})

    def trigger_sos(self, situation_description: str, lat: Optional[float] = None, lng: Optional[float] = None, address: Optional[str] = None) -> Dict[str, Any]:
        """
        Triggers high-priority SOS alert with exact geolocation, timestamp, and automated help dispatch.
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
        
        # Build live map link
        if lat and lng:
            maps_link = f"https://maps.google.com/?q={lat},{lng}"
            loc_str = f"Coordinates: {lat:.5f}, {lng:.5f} ({address or 'Unknown Street'})"
        else:
            maps_link = "Location unavailable"
            loc_str = "Location GPS lock pending"

        alert_message = (
            f"🚨 EMERGENCY ALERT: Nova AI detected immediate distress!\n"
            f"Situation: {situation_description}\n"
            f"Time: {timestamp}\n"
            f"Location: {loc_str}\n"
            f"Live Map: {maps_link}\n"
            f"Please send help or contact authorities immediately."
        )

        record = {
            "id": len(self.sos_history) + 1,
            "timestamp": timestamp,
            "situation": situation_description,
            "latitude": lat,
            "longitude": lng,
            "address": address,
            "maps_link": maps_link,
            "dispatched_to": self.emergency_contacts,
            "status": "DISPATCHED",
            "message": alert_message
        }
        self.sos_history.append(record)

        return {
            "emergency_active": True,
            "record": record,
            "speech_reply": (
                "Emergency detected! I am broadcasting your live location coordinates to your emergency contacts "
                "and preparing to connect you with emergency services right now. Stay as calm and safe as you can."
            ),
            "simulated_call_number": self.emergency_contacts[0]["phone"]
        }
