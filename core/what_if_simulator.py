"""
What-If Simulator Engine for NOVA AI Assistant.
Enables non-destructive scenario testing and trade-off comparison:
- Simulates schedule shifts, date changes, and priority reallocations
- Evaluates workload distribution before vs. after
- Detects whether conflicts are resolved or newly created
- Never alters live database tasks until explicit user confirmation
"""

import copy
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from core.planner import Planner

logger = logging.getLogger(__name__)
planner_hub = Planner()


class WhatIfSimulator:
    def __init__(self):
        self.planner = planner_hub

    def simulate_scenario(self, task_modifications: List[Dict[str, Any]], scenario_title: str = "Alternative Schedule") -> Dict[str, Any]:
        """
        Runs a simulation on a cloned copy of current tasks.
        task_modifications: List of dicts, e.g. [{"id": 1, "new_date": "2026-10-23", "new_priority": "high"}]
        """
        original_tasks = self.planner.get_deadlines()
        simulated_tasks = copy.deepcopy(original_tasks)

        # Apply modifications to cloned copy only
        mod_map = {m["id"]: m for m in task_modifications if "id" in m}
        changed_count = 0

        for t in simulated_tasks:
            t_id = t["id"]
            if t_id in mod_map:
                m = mod_map[t_id]
                if "new_date" in m:
                    t["due_date"] = m["new_date"]
                if "new_priority" in m:
                    t["priority"] = m["new_priority"]
                if "new_hours" in m:
                    t["estimated_hours"] = float(m["new_hours"])
                t["is_modified"] = True
                changed_count += 1
            else:
                t["is_modified"] = False

        # Calculate metrics for Original vs Simulated
        original_conflicts = self._compute_conflicts_for_set(original_tasks)
        simulated_conflicts = self._compute_conflicts_for_set(simulated_tasks)

        # Trade-off evaluation
        conflict_diff = len(original_conflicts) - len(simulated_conflicts)
        tradeoff_summary = ""
        if conflict_diff > 0:
            tradeoff_summary = f"Positive trade-off: Resolves {conflict_diff} scheduling conflict(s) by distributing workload."
        elif conflict_diff < 0:
            tradeoff_summary = f"Caution: This shift creates {abs(conflict_diff)} additional conflict(s)."
        else:
            tradeoff_summary = "Neutral workload trade-off: Hours shifted without altering total conflict count."

        return {
            "scenario_title": scenario_title,
            "tasks_affected": changed_count,
            "original_conflict_count": len(original_conflicts),
            "simulated_conflict_count": len(simulated_conflicts),
            "conflicts_resolved": max(0, conflict_diff),
            "tradeoff_analysis": tradeoff_summary,
            "original_tasks": original_tasks,
            "simulated_tasks": simulated_tasks,
            "pending_modifications": task_modifications
        }

    def apply_scenario(self, task_modifications: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Permanently applies approved modifications to real tasks in SQLite.
        Requires explicit confirmation.
        """
        applied = []
        for m in task_modifications:
            t_id = m.get("id")
            if not t_id:
                continue
            res = self.planner.update_deadline(
                deadline_id=int(t_id),
                due_date=m.get("new_date"),
                priority=m.get("new_priority"),
                estimated_hours=m.get("new_hours")
            )
            if res:
                applied.append(res)

        logger.info("Applied What-If scenario to %d live tasks", len(applied))
        return {
            "ok": True,
            "applied_count": len(applied),
            "updated_tasks": applied,
            "message": f"Successfully updated {len(applied)} live task(s) based on approved scenario."
        }

    def _compute_conflicts_for_set(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        day_map = {}
        for t in tasks:
            if t.get("status") == "completed":
                continue
            day = str(t.get("due_date", ""))[:10]
            if day not in day_map:
                day_map[day] = []
            day_map[day].append(t)

        conflicts = []
        for day, items in day_map.items():
            hours = sum(i.get("estimated_hours", 2.0) for i in items)
            if len(items) > 1 and hours >= 5.0:
                conflicts.append({"date": day, "items": len(items), "hours": hours})
        return conflicts


what_if_simulator = WhatIfSimulator()
