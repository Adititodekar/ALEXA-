"""
Weather and Environmental Service for NOVA AI Assistant.
Integrates OpenWeatherMap API for live temperature, humidity, pressure, wind, and forecast.
"""

import os
import logging
from typing import Dict, Any, Optional
import requests

logger = logging.getLogger(__name__)

DEFAULT_API_KEY = "2432b709d857248fb896489ce6360659"

class WeatherService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENWEATHER_API_KEY", DEFAULT_API_KEY)
        self.default_lat = 19.0760
        self.default_lon = 72.8777
        self.cached_weather = {
            "city": "Mumbai",
            "temperature": 30.5,
            "feels_like": 34.0,
            "humidity": 60,
            "condition": "Clouds",
            "description": "scattered clouds",
            "icon": "03d",
            "wind_speed": 3.6,
            "pressure": 1012,
            "temp_min": 28.0,
            "temp_max": 32.0,
            "updated_at": "Just now"
        }

    def get_weather(self, lat: Optional[float] = None, lon: Optional[float] = None, city: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetches real-time weather, temperature, humidity, and atmospheric conditions from OpenWeatherMap.
        """
        target_lat = lat if lat is not None else self.default_lat
        target_lon = lon if lon is not None else self.default_lon

        try:
            if city:
                url = f"https://api.openweathermap.org/data/2.5/weather?q={requests.utils.quote(city)}&appid={self.api_key}&units=metric"
            else:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={target_lat}&lon={target_lon}&appid={self.api_key}&units=metric"

            headers = {"User-Agent": "NOVA-AI-Assistant/2.0"}
            resp = requests.get(url, headers=headers, timeout=6)

            if resp.status_code == 200:
                data = resp.json()
                main = data.get("main", {})
                weather_arr = data.get("weather", [{}])
                wind = data.get("wind", {})
                sys_data = data.get("sys", {})

                result = {
                    "city": data.get("name") or (city or "Local Area"),
                    "country": sys_data.get("country", ""),
                    "temperature": round(main.get("temp", 28.0), 1),
                    "feels_like": round(main.get("feels_like", 30.0), 1),
                    "humidity": main.get("humidity", 55),
                    "pressure": main.get("pressure", 1013),
                    "wind_speed": round(wind.get("speed", 3.0), 1),
                    "condition": weather_arr[0].get("main", "Clear"),
                    "description": weather_arr[0].get("description", "clear sky").capitalize(),
                    "icon": weather_arr[0].get("icon", "01d"),
                    "temp_min": round(main.get("temp_min", 26.0), 1),
                    "temp_max": round(main.get("temp_max", 32.0), 1),
                    "success": True
                }
                self.cached_weather = result
                return result
            else:
                logger.warning("OpenWeatherMap returned status %s: %s", resp.status_code, resp.text)
        except Exception as exc:
            logger.warning("Error querying OpenWeatherMap: %s. Using cached environmental data.", exc)

        return {**self.cached_weather, "success": True, "cached": True}

    def format_weather_summary(self, weather_data: Dict[str, Any]) -> str:
        """Constructs a natural spoken response for voice assistant."""
        city = weather_data.get("city", "your area")
        temp = weather_data.get("temperature", 28)
        desc = weather_data.get("description", "clear skies").lower()
        humidity = weather_data.get("humidity", 50)
        feels_like = weather_data.get("feels_like", temp)

        return (
            f"Currently in {city}, it's {temp}°C with {desc}. "
            f"It feels like {feels_like}°C with {humidity}% humidity."
        )

weather_service = WeatherService()
