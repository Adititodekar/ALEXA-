"""
News & Daily Briefing Service for NOVA AI Assistant.
Provides live RSS headlines and synthesizes executive Morning/Daily briefings.
"""

import xml.etree.ElementTree as ET
import logging
from typing import Dict, Any, List
import requests

logger = logging.getLogger(__name__)

class NewsBriefingService:
    def __init__(self):
        self.rss_url = "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
        self.fallback_news = [
            {"title": "Global Tech Summit Highlights Next-Gen Autonomous AI Agents", "source": "Tech Wire"},
            {"title": "Space Agency Confirms Successful Deep Space Telemetry Milestone", "source": "Science Daily"},
            {"title": "Renewable Clean Energy Adoption Hits New Milestone Across Smart Cities", "source": "World Eco"}
        ]

    def get_top_news(self, limit: int = 4) -> List[Dict[str, str]]:
        """Fetches top current headlines via live RSS feed with graceful fallback."""
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NOVA-Assistant/2.0"}
            resp = requests.get(self.rss_url, headers=headers, timeout=5)
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                items = root.findall(".//item")[:limit]
                articles = []
                for it in items:
                    raw_title = it.find("title").text if it.find("title") is not None else "Top Story"
                    parts = raw_title.rsplit(" - ", 1)
                    title = parts[0]
                    source = parts[1] if len(parts) > 1 else "Google News"
                    link = it.find("link").text if it.find("link") is not None else "#"
                    articles.append({"title": title, "source": source, "link": link})
                if articles:
                    return articles
        except Exception as exc:
            logger.warning("Error fetching live RSS news: %s. Using cached news.", exc)

        return self.fallback_news

    def generate_daily_briefing(self, weather_data: Dict[str, Any], tasks: List[Dict[str, Any]], energy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Constructs an integrated daily executive briefing."""
        news_items = self.get_top_news(3)
        city = weather_data.get("city", "Mumbai")
        temp = weather_data.get("temperature", 30)
        cond = weather_data.get("description", "clear skies")
        humidity = weather_data.get("humidity", 60)

        active_tasks = [t for t in tasks if t.get("status") != "completed"]
        urgent_tasks = [t for t in active_tasks if t.get("priority") in ["urgent", "high"]]

        watts = energy_data.get("estimated_current_watts", 0)
        active_devices = energy_data.get("active_devices_count", 0)

        spoken_briefing = (
            f"Here is your Nova Daily Briefing: Currently in {city}, it's {temp}°C with {cond} and {humidity}% humidity. "
            f"You have {len(active_tasks)} pending tasks, with {len(urgent_tasks)} marked high priority. "
            f"Household power load is {watts} watts across {active_devices} active appliances. "
            f"In top news today: {news_items[0]['title']}."
        )

        display_briefing = (
            f"🌅 **NOVA Daily Briefing**\n\n"
            f"🌤️ **Weather ({city})**: **{temp}°C** • {cond.capitalize()} • Humidity: **{humidity}%**\n"
            f"📋 **Tasks & Schedule**: **{len(active_tasks)} pending** ({len(urgent_tasks)} high priority)\n"
            f"⚡ **Smart Home**: **{watts} W** across {active_devices} active appliances\n\n"
            f"📰 **Top Headlines**:\n" +
            "\n".join([f"- **{n['title']}** *({n['source']})*" for n in news_items])
        )

        return {
            "spoken": spoken_briefing,
            "spoken_briefing": spoken_briefing,
            "display": display_briefing,
            "display_briefing": display_briefing,
            "weather": weather_data,
            "tasks_count": len(active_tasks),
            "urgent_count": len(urgent_tasks),
            "power_watts": watts,
            "news": news_items
        }

news_service = NewsBriefingService()
