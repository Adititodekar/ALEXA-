"""
Digital Wellbeing & Phone Usage Limiter for Nova AI Assistant.
Monitors daily screen time, tracks app consumption, enforces limits, and issues voice reminders.
"""

from typing import Dict, Any, List
from datetime import datetime

class WellbeingTracker:
    def __init__(self):
        # Default usage state (in minutes for today)
        self.daily_screen_time_limit_mins = 180  # 3 hours total
        self.app_limits = {
            "Instagram": 45,
            "YouTube": 60,
            "TikTok": 30,
            "Games": 45,
            "Twitter/X": 30
        }
        
        # Current active usage simulation / device stats
        self.today_usage = {
            "Instagram": 42,
            "YouTube": 55,
            "TikTok": 15,
            "Games": 20,
            "Chrome/Browser": 35,
            "Work/Notes": 50
        }
        self.focus_mode_active = False

    def get_summary(self) -> Dict[str, Any]:
        """Returns total screen time, app breakdown, and limit warnings."""
        total_mins = sum(self.today_usage.values())
        warnings = []
        locked_apps = []

        for app, used in self.today_usage.items():
            limit = self.app_limits.get(app)
            if limit:
                if used >= limit:
                    warnings.append(f"⚠️ {app} limit exceeded ({used}/{limit} mins)")
                    locked_apps.append(app)
                elif used >= (limit - 10):
                    warnings.append(f"⏳ {app} approaching limit ({used}/{limit} mins - {limit - used}m left)")

        percent_used = min(100, round((total_mins / self.daily_screen_time_limit_mins) * 100))

        return {
            "total_screen_time_mins": total_mins,
            "total_screen_time_formatted": f"{total_mins // 60}h {total_mins % 60}m",
            "daily_limit_mins": self.daily_screen_time_limit_mins,
            "percent_used": percent_used,
            "app_breakdown": self.today_usage,
            "app_limits": self.app_limits,
            "warnings": warnings,
            "locked_apps": locked_apps,
            "focus_mode": self.focus_mode_active
        }

    def set_app_limit(self, app_name: str, limit_mins: int) -> Dict[str, Any]:
        """Sets or updates limit for a specific app."""
        self.app_limits[app_name] = limit_mins
        return {"app": app_name, "new_limit": limit_mins, "status": "updated"}

    def add_simulated_usage(self, app_name: str, minutes: int):
        """Simulates or records new app usage."""
        if app_name in self.today_usage:
            self.today_usage[app_name] += minutes
        else:
            self.today_usage[app_name] = minutes

    def toggle_focus_mode(self, enable: bool) -> str:
        """Toggles strict focus mode to block recreational apps."""
        self.focus_mode_active = enable
        if enable:
            return "Focus Mode is now ACTIVE. Distracting apps and notifications are silenced."
        else:
            return "Focus Mode turned OFF. Regular app permissions restored."
