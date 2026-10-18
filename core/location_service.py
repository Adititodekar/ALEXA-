"""
Location, Geocoding & Navigation Service for Nova AI Assistant.
Provides GPS tracking, 'Where am I?' reverse geocoding, and turn-by-turn navigation guidance.
"""

import requests
import math
from typing import Dict, Any, Optional, List

class LocationService:
    def __init__(self):
        # Default fallback location (e.g. Bangalore Tech Hub / New York if not provided)
        self.last_known_coords = {"lat": 12.9716, "lng": 77.5946}
        self.last_known_address = "Bangalore, Karnataka, India"

    def update_coords(self, lat: float, lng: float, accuracy: Optional[float] = None) -> Dict[str, Any]:
        """Updates last known coordinates from client GPS."""
        self.last_known_coords = {"lat": lat, "lng": lng, "accuracy": accuracy}
        resolved = self.reverse_geocode(lat, lng)
        self.last_known_address = resolved.get("display_name", f"{lat:.4f}, {lng:.4f}")
        return {
            "coords": self.last_known_coords,
            "address": self.last_known_address,
            "details": resolved
        }

    def reverse_geocode(self, lat: float, lng: float) -> Dict[str, Any]:
        """Resolves coordinates into human-readable street, area, city using OpenStreetMap Nominatim."""
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1"
            headers = {"User-Agent": "NovaAIAssistant/1.0"}
            resp = requests.get(url, headers=headers, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                address = data.get("address", {})
                road = address.get("road") or address.get("suburb") or address.get("neighbourhood") or "Local Area"
                city = address.get("city") or address.get("town") or address.get("county") or "City"
                country = address.get("country") or ""
                return {
                    "display_name": data.get("display_name", f"{road}, {city}"),
                    "road": road,
                    "city": city,
                    "country": country,
                    "raw": address
                }
        except Exception:
            pass
        return {
            "display_name": f"Coordinates ({lat:.4f}, {lng:.4f})",
            "road": "Current Location",
            "city": "Unknown Area",
            "country": ""
        }

    def geocode_destination(self, query: str) -> Optional[Dict[str, Any]]:
        """Finds coordinates for a destination name."""
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(query)}&format=json&limit=1"
            headers = {"User-Agent": "NovaAIAssistant/1.0"}
            resp = requests.get(url, headers=headers, timeout=4)
            if resp.status_code == 200 and resp.json():
                res = resp.json()[0]
                return {
                    "name": res.get("display_name"),
                    "lat": float(res.get("lat")),
                    "lng": float(res.get("lon"))
                }
        except Exception:
            pass
        return None

    def get_route_and_directions(self, dest_query: str, start_lat: Optional[float] = None, start_lng: Optional[float] = None) -> Dict[str, Any]:
        """
        Calculates directions from user's current location to the target destination.
        Uses Open Source Routing Machine (OSRM) API for real navigation.
        """
        curr_lat = start_lat if start_lat is not None else self.last_known_coords["lat"]
        curr_lng = start_lng if start_lng is not None else self.last_known_coords["lng"]

        dest = self.geocode_destination(dest_query)
        if not dest:
            return {
                "success": False,
                "message": f"I couldn't locate '{dest_query}'. Please check the destination name."
            }

        dest_lat = dest["lat"]
        dest_lng = dest["lng"]

        # Request route from public OSRM server
        try:
            osrm_url = f"http://router.project-osrm.org/route/v1/driving/{curr_lng},{curr_lat};{dest_lng},{dest_lat}?overview=full&steps=true&geometries=geojson"
            resp = requests.get(osrm_url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("routes"):
                    route = data["routes"][0]
                    distance_km = round(route["distance"] / 1000, 2)
                    duration_min = round(route["duration"] / 60)
                    
                    steps = []
                    for leg in route.get("legs", []):
                        for step in leg.get("steps", []):
                            instruction = step.get("maneuver", {}).get("instruction", "")
                            if not instruction:
                                m_type = step.get("maneuver", {}).get("type", "turn")
                                m_mod = step.get("maneuver", {}).get("modifier", "")
                                name = step.get("name", "the road")
                                instruction = f"Head {m_mod} on {name}".strip()
                            steps.append(instruction)

                    return {
                        "success": True,
                        "destination": dest["name"],
                        "distance_km": distance_km,
                        "duration_min": duration_min,
                        "start": {"lat": curr_lat, "lng": curr_lng},
                        "target": {"lat": dest_lat, "lng": dest_lng},
                        "steps": steps[:8],
                        "summary": f"{distance_km} km away, about {duration_min} minutes drive/ride.",
                        "geojson": route.get("geometry")
                    }
        except Exception:
            pass

        # Fallback straight-line calculation if routing service is offline
        dist = self._haversine(curr_lat, curr_lng, dest_lat, dest_lng)
        approx_min = round(dist * 2.5)
        return {
            "success": True,
            "destination": dest["name"],
            "distance_km": round(dist, 2),
            "duration_min": approx_min,
            "start": {"lat": curr_lat, "lng": curr_lng},
            "target": {"lat": dest_lat, "lng": dest_lng},
            "steps": [
                f"Head towards {dest_query}",
                f"Straight-line distance is approximately {round(dist, 2)} km",
                "Follow main arterial road towards destination"
            ],
            "summary": f"Approximately {round(dist, 2)} km away (~{approx_min} mins).",
            "geojson": None
        }

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates distance in km between two lat/lon points."""
        R = 6371.0 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
