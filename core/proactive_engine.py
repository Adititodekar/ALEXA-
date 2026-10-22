"""
Proactive Life Engine for NOVA AI Assistant.
Generates explainable, data-grounded recommendations:
1. Detects overlapping or clustered deadlines.
2. Identifies overloaded study/work days (> 6 hours).
3. Alerts on imminent deadlines (< 24h remaining).
4. Provides structured insights explaining:
   - What was noticed (Observation)
   - Supporting data (Grounding)
   - Why it matters (Impact)
   - Recommended action (Actionable solution)
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
import logging

from core.planner import Planner
from core.database import db

logger = logging.getLogger(__name__)
planner_hub = Planner()


class ProactiveEngine:
    def __init__(self):
        self.planner = planner_hub
        self.db = db

    def generate_insights(self) -> List[Dict[str, Any]]:
        """
        Gathers real tasks and produces explainable recommendations.
        """
        deadlines = self.planner.get_deadlines()
        pending = [d for d in deadlines if d["status"] != "completed"]
        conflicts = self.planner.detect_conflicts()
        insights = []

        now = datetime.now()

        # 1. Check for immediate / urgent deadlines (< 24 hours)
        imminent = [d for d in pending if d["urgency"] in ("high", "urgent", "overdue")]
        if imminent:
            titles = [f"'{d['title']}' ({d['countdown']})" for d in imminent[:3]]
            insights.append({
                "id": "insight-urgent-deadlines",
                "category": "urgent_deadline",
                "severity": "high",
                "title": "Immediate Submissions Approaching",
                "what_noticed": f"You have {len(imminent)} high-priority task(s) approaching deadlines within 24 hours.",
                "supporting_data": f"Tasks: {', '.join(titles)}.",
                "why_it_matters": "Last-minute submissions correlate with elevated stress and potential missed requirement criteria.",
                "recommended_action": "Dedicate a protected 2-hour deep-work block this morning to finalize drafts.",
                "suggested_tool": "create_task",
                "action_button": "Schedule Focus Block"
            })

        # 2. Check for workload clustering / overlapping conflicts
        if conflicts:
            for c in conflicts:
                insights.append({
                    "id": f"insight-conflict-{c['date']}",
                    "category": "workload_conflict",
                    "severity": c["severity"],
                    "title": f"Workload Bottleneck on {c['date']}",
                    "what_noticed": c["message"],
                    "supporting_data": f"Items clustered: {', '.join(c['items'])}.",
                    "why_it_matters": f"Scheduling {c['total_hours']:.1f} hours of demanding work in one day risks cognitive fatigue.",
                    "recommended_action": f"Shift the secondary task to an earlier date to smooth out the workload curve.",
                    "suggested_tool": "simulate_what_if_schedule",
                    "action_button": "Simulate Rebalance"
                })

        # 3. Smart Home & Energy Conservation Recommendation
        try:
            from core.smart_home import smart_home_hub
            energy = smart_home_hub.get_energy_summary()
            if energy.get("estimated_current_watts", 0) > 100:
                insights.append({
                    "id": "insight-energy-conservation",
                    "category": "energy",
                    "severity": "medium",
                    "title": "Elevated Household Energy Draw",
                    "what_noticed": f"Current household power load is {energy['estimated_current_watts']}W across {energy['active_devices_count']} devices.",
                    "supporting_data": f"Active devices: {', '.join(energy['active_devices'])}.",
                    "why_it_matters": "Running multiple high-draw appliances concurrently increases monthly utility costs.",
                    "recommended_action": "Switch off unused cooling or standby screens in empty rooms.",
                    "suggested_tool": "set_device_state",
                    "action_button": "Turn Off Idle Devices"
                })
        except Exception:
            pass

        # 4. Digital Wellbeing / Focus Mode suggestion
        try:
            from core.wellbeing_tracker import WellbeingTracker
            wb = WellbeingTracker().get_summary()
            if wb.get("warnings"):
                insights.append({
                    "id": "insight-wellbeing-focus",
                    "category": "wellbeing",
                    "severity": "medium",
                    "title": "Digital Wellbeing Goal Alert",
                    "what_noticed": wb["warnings"][0],
                    "supporting_data": f"Total screen time today: {wb['total_screen_time_formatted']}.",
                    "why_it_matters": "Excessive app usage during study intervals disrupts working memory and attention spans.",
                    "recommended_action": "Enable Focus Mode to silence non-essential mobile alerts until evening review.",
                    "suggested_tool": "toggle_focus",
                    "action_button": "Enable Focus Mode"
                })
        except Exception:
            pass

        return insights


proactive_engine = ProactiveEngine()
