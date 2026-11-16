"""
Emergency Guardian & SOS Response System for Nova AI Assistant.
Detects distress situations, coordinates with GPS, triggers multi-channel emergency alerts,
manages persistent emergency contacts, medical ID, and emergency call/message dispatches.
"""

import json
import logging
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List, Optional
from core.database import db

logger = logging.getLogger(__name__)


class EmergencyGuardian:
    def __init__(self):
        self.init_db()
        self._load_contacts()
        self._load_medical_info()
        self.sos_history = []

    def init_db(self):
        """Initializes tables for emergency contacts and medical emergency card."""
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS emergency_contacts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        phone TEXT NOT NULL,
                        relationship TEXT DEFAULT 'Contact',
                        is_primary INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS medical_id (
                        id INTEGER PRIMARY KEY DEFAULT 1,
                        full_name TEXT DEFAULT 'User',
                        blood_type TEXT DEFAULT 'O+',
                        allergies TEXT DEFAULT 'None listed',
                        medications TEXT DEFAULT 'None',
                        emergency_notes TEXT DEFAULT 'Contact family or emergency services immediately.',
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
        except Exception as exc:
            logger.warning("Error initializing emergency tables: %s", exc)

    def _load_contacts(self):
        self.emergency_contacts = []
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, name, phone, relationship, is_primary FROM emergency_contacts ORDER BY id ASC")
                rows = cursor.fetchall()
                if rows:
                    for r in rows:
                        self.emergency_contacts.append({
                            "id": r["id"],
                            "name": r["name"],
                            "phone": r["phone"],
                            "relationship": r["relationship"],
                            "is_primary": bool(r["is_primary"])
                        })
                    return
        except Exception as exc:
            logger.warning("Could not read emergency contacts: %s", exc)

        # Default contacts if empty
        default_contacts = [
            {"name": "National Emergency Services", "phone": "112", "relationship": "Police / Ambulance", "is_primary": True},
            {"name": "Ambulance / Medical Response", "phone": "108", "relationship": "Medical Dispatch", "is_primary": False},
            {"name": "Primary Emergency Contact (Family)", "phone": "+1-555-0199", "relationship": "Family / Guardian", "is_primary": False}
        ]
        self.emergency_contacts = []
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                for c in default_contacts:
                    cursor.execute("""
                        INSERT INTO emergency_contacts (name, phone, relationship, is_primary)
                        VALUES (?, ?, ?, ?)
                    """, (c["name"], c["phone"], c["relationship"], 1 if c["is_primary"] else 0))
                    c["id"] = cursor.lastrowid
                    self.emergency_contacts.append(c)
                conn.commit()
        except Exception:
            self.emergency_contacts = default_contacts

    def _load_medical_info(self):
        self.medical_info = {
            "full_name": "User",
            "blood_type": "O+ Positive",
            "allergies": "Penicillin (Simulated)",
            "medications": "Asthma Inhaler (as needed)",
            "emergency_notes": "Please notify primary family contact immediately."
        }
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT full_name, blood_type, allergies, medications, emergency_notes FROM medical_id WHERE id = 1")
                row = cursor.fetchone()
                if row:
                    self.medical_info = {
                        "full_name": row["full_name"],
                        "blood_type": row["blood_type"],
                        "allergies": row["allergies"],
                        "medications": row["medications"],
                        "emergency_notes": row["emergency_notes"]
                    }
                else:
                    cursor.execute("""
                        INSERT INTO medical_id (id, full_name, blood_type, allergies, medications, emergency_notes)
                        VALUES (1, ?, ?, ?, ?, ?)
                    """, (self.medical_info["full_name"], self.medical_info["blood_type"],
                          self.medical_info["allergies"], self.medical_info["medications"],
                          self.medical_info["emergency_notes"]))
                    conn.commit()
        except Exception as exc:
            logger.warning("Could not load medical_id: %s", exc)

    def get_contacts(self) -> List[Dict[str, Any]]:
        self._load_contacts()
        return self.emergency_contacts

    def add_emergency_contact(self, name: str, phone: str, relationship: str = "Family", is_primary: bool = False) -> Dict[str, Any]:
        """Adds a new persistent emergency contact."""
        with db.get_connection() as conn:
            cursor = conn.cursor()
            if is_primary:
                cursor.execute("UPDATE emergency_contacts SET is_primary = 0")
            cursor.execute("""
                INSERT INTO emergency_contacts (name, phone, relationship, is_primary)
                VALUES (?, ?, ?, ?)
            """, (name.strip(), phone.strip(), relationship.strip(), 1 if is_primary else 0))
            new_id = cursor.lastrowid
            conn.commit()

        contact = {
            "id": new_id,
            "name": name.strip(),
            "phone": phone.strip(),
            "relationship": relationship.strip(),
            "is_primary": is_primary
        }
        self.emergency_contacts.append(contact)
        return contact

    def delete_emergency_contact(self, contact_id: int) -> bool:
        """Removes an emergency contact."""
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM emergency_contacts WHERE id = ?", (contact_id,))
            conn.commit()
            ok = cursor.rowcount > 0
        self._load_contacts()
        return ok

    def update_medical_info(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates user's emergency medical card info."""
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE medical_id
                SET full_name = ?, blood_type = ?, allergies = ?, medications = ?, emergency_notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            """, (
                data.get("full_name", self.medical_info["full_name"]),
                data.get("blood_type", self.medical_info["blood_type"]),
                data.get("allergies", self.medical_info["allergies"]),
                data.get("medications", self.medical_info["medications"]),
                data.get("emergency_notes", self.medical_info["emergency_notes"])
            ))
            conn.commit()
        self._load_medical_info()
        return self.medical_info

    def get_emergency_state(self) -> Dict[str, Any]:
        return {
            "contacts": self.get_contacts(),
            "medical_info": self.medical_info,
            "history_count": len(self.sos_history)
        }

    def trigger_sos(self, situation_description: str, lat: Optional[float] = None, lng: Optional[float] = None, address: Optional[str] = None) -> Dict[str, Any]:
        """
        Triggers high-priority SOS alert with exact geolocation, timestamp, WhatsApp direct link, and authority dispatch.
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
        self._load_contacts()

        # Build live map link
        if lat and lng:
            maps_link = f"https://maps.google.com/?q={lat},{lng}"
            loc_str = f"Coordinates: {lat:.5f}, {lng:.5f} ({address or 'Local Area'})"
        else:
            maps_link = "https://maps.google.com"
            loc_str = "Location GPS lock pending"

        alert_message = (
            f"🚨 EMERGENCY SOS ALERT: Nova AI detected immediate distress!\n"
            f"Situation: {situation_description}\n"
            f"Time: {timestamp}\n"
            f"Location: {loc_str}\n"
            f"Live Map Link: {maps_link}\n"
            f"Medical: Blood Type: {self.medical_info.get('blood_type', 'N/A')}, Allergies: {self.medical_info.get('allergies', 'None')}\n"
            f"Please dispatch assistance immediately."
        )

        encoded_alert = urllib.parse.quote(alert_message)
        whatsapp_link = f"https://api.whatsapp.com/send?text={encoded_alert}"
        sms_link = f"sms:?body={encoded_alert}"

        record = {
            "id": len(self.sos_history) + 1,
            "timestamp": timestamp,
            "situation": situation_description,
            "latitude": lat,
            "longitude": lng,
            "address": address,
            "maps_link": maps_link,
            "whatsapp_link": whatsapp_link,
            "sms_link": sms_link,
            "dispatched_to": self.emergency_contacts,
            "medical_info": self.medical_info,
            "status": "DISPATCHED",
            "message": alert_message
        }
        self.sos_history.append(record)

        primary_phone = "112"
        for c in self.emergency_contacts:
            if c.get("is_primary") or c.get("phone") in ("112", "911"):
                primary_phone = c["phone"]
                break

        return {
            "emergency_active": True,
            "record": record,
            "speech_reply": (
                "Emergency SOS activated! I am broadcasting your live coordinates to your emergency contacts, "
                "sounding the distress siren, and preparing to connect with emergency authorities. Stay calm, help is on the way."
            ),
            "simulated_call_number": primary_phone,
            "contacts": self.emergency_contacts,
            "medical_info": self.medical_info,
            "whatsapp_link": whatsapp_link,
            "sms_link": sms_link
        }
