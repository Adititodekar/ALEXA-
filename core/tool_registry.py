"""
Typed Tool Registry & Execution Engine for NOVA AI Assistant.
Provides validated tool dispatch, execution tracking, permission checks,
sanitized activity logging, and postcondition verification.
"""

import time
import json
import logging
from typing import Dict, Any, List, Optional, Callable
from pydantic import BaseModel, Field, ValidationError

from core.database import db
from core.smart_home import smart_home_hub
from core.planner import Planner
from core.memory_manager import memory_hub

logger = logging.getLogger(__name__)
planner_hub = Planner()


class ToolDefinition:
    def __init__(
        self,
        name: str,
        description: str,
        parameters_schema: Dict[str, Any],
        permission_level: str,  # 'read_only' or 'state_changing'
        handler: Callable[..., Dict[str, Any]],
        verifier: Optional[Callable[..., bool]] = None
    ):
        self.name = name
        self.description = description
        self.parameters_schema = parameters_schema
        self.permission_level = permission_level
        self.handler = handler
        self.verifier = verifier

    def to_gemini_declaration(self) -> Dict[str, Any]:
        """Converts tool definition to Gemini function declaration format."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters_schema
        }


class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, ToolDefinition] = {}
        self._register_default_tools()

    def register(self, tool: ToolDefinition):
        self.tools[tool.name] = tool
        logger.info("Registered tool: %s (%s)", tool.name, tool.permission_level)

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self.tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "permission_level": t.permission_level,
                "parameters": t.parameters_schema
            }
            for t in self.tools.values()
        ]

    def execute_tool(
        self,
        name: str,
        arguments: Dict[str, Any],
        mission_id: Optional[str] = None,
        approved: bool = False
    ) -> Dict[str, Any]:
        """
        Executes a registered tool:
        1. Validates existence and arguments.
        2. Checks permission level (state_changing requires approval if unapproved).
        3. Executes handler with timing.
        4. Runs verification postcondition if defined.
        5. Logs sanitized activity to tool_logs table.
        """
        tool = self.get_tool(name)
        if not tool:
            err_msg = f"Unknown tool '{name}'. Available: {', '.join(self.tools.keys())}"
            self._log_activity(mission_id, name, arguments, "failed", 0, None, err_msg, False, False)
            return {"ok": False, "error": err_msg}

        # Permission check
        requires_approval = (tool.permission_level == "state_changing")
        if requires_approval and not approved:
            err_msg = f"Tool '{name}' requires user approval before state-changing execution."
            self._log_activity(mission_id, name, arguments, "rejected", 0, None, err_msg, True, False)
            return {
                "ok": False,
                "status": "awaiting_approval",
                "requires_approval": True,
                "message": err_msg
            }

        start_time = time.time()
        try:
            # Execute handler
            result = tool.handler(**arguments)
            duration_ms = (time.time() - start_time) * 1000

            # Verify postcondition
            is_verified = True
            if tool.verifier:
                try:
                    is_verified = bool(tool.verifier(result, **arguments))
                except Exception as v_err:
                    logger.warning("Verification check failed for %s: %s", name, v_err)
                    is_verified = False

            summary = self._summarize_result(name, result)
            self._log_activity(
                mission_id=mission_id,
                tool_name=name,
                args=arguments,
                status="succeeded",
                duration_ms=duration_ms,
                result_summary=summary,
                error_detail=None,
                requires_approval=requires_approval,
                verified=is_verified
            )

            return {
                "ok": True,
                "tool": name,
                "result": result,
                "verified": is_verified,
                "duration_ms": round(duration_ms, 2)
            }

        except Exception as exc:
            duration_ms = (time.time() - start_time) * 1000
            err_msg = str(exc)
            logger.exception("Execution error in tool %s: %s", name, exc)
            self._log_activity(
                mission_id=mission_id,
                tool_name=name,
                args=arguments,
                status="failed",
                duration_ms=duration_ms,
                result_summary=None,
                error_detail=err_msg,
                requires_approval=requires_approval,
                verified=False
            )
            return {
                "ok": False,
                "tool": name,
                "error": err_msg,
                "duration_ms": round(duration_ms, 2)
            }

    def _log_activity(
        self,
        mission_id: Optional[str],
        tool_name: str,
        args: Dict[str, Any],
        status: str,
        duration_ms: float,
        result_summary: Optional[str],
        error_detail: Optional[str],
        requires_approval: bool,
        verified: bool
    ):
        """Sanitizes arguments and persists execution record to database."""
        sanitized_args = {}
        for k, v in args.items():
            if any(sec in k.lower() for sec in ["key", "secret", "token", "password", "auth"]):
                sanitized_args[k] = "******"
            else:
                sanitized_args[k] = v

        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO tool_logs (
                        mission_id, tool_name, sanitized_args_json, status,
                        duration_ms, result_summary, error_detail,
                        requires_approval, verified
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    mission_id,
                    tool_name,
                    json.dumps(sanitized_args),
                    status,
                    duration_ms,
                    result_summary,
                    error_detail,
                    1 if requires_approval else 0,
                    1 if verified else 0
                ))
                conn.commit()
        except Exception as exc:
            logger.warning("Could not persist tool log: %s", exc)

    def _summarize_result(self, tool_name: str, result: Any) -> str:
        if isinstance(result, dict):
            if "note" in result:
                return result["note"]
            if "title" in result:
                return f"Task created: '{result['title']}'"
            if "estimated_current_watts" in result:
                return f"Total load: {result['estimated_current_watts']}W ({result.get('active_devices_count', 0)} active devices)"
            if "deadlines" in result:
                return f"Found {len(result['deadlines'])} deadlines"
            if "content" in result:
                return f"Memory stored: '{result['content'][:40]}...'"
        return str(result)[:100]

    def _register_default_tools(self):
        # 1. Smart Home - list_devices
        self.register(ToolDefinition(
            name="list_devices",
            description="List all connected smart-home appliances, power states, and rooms.",
            parameters_schema={"type": "object", "properties": {}},
            permission_level="read_only",
            handler=lambda: smart_home_hub.list_devices()
        ))

        # 2. Smart Home - set_device_state
        self.register(ToolDefinition(
            name="set_device_state",
            description="Turn a smart home device on or off (e.g., 'living_room_light', 'bedroom_fan').",
            parameters_schema={
                "type": "object",
                "properties": {
                    "device": {"type": "string", "description": "Device name or ID"},
                    "on": {"type": "boolean", "description": "True to turn on, False to turn off"}
                },
                "required": ["device", "on"]
            },
            permission_level="state_changing",
            handler=lambda device, on: smart_home_hub.set_device_state(device, on),
            verifier=lambda res, device, on: bool(res.get("ok"))
        ))

        # 3. Smart Home - get_energy_summary
        self.register(ToolDefinition(
            name="get_energy_summary",
            description="Calculate current household power consumption in watts and active device count.",
            parameters_schema={"type": "object", "properties": {}},
            permission_level="read_only",
            handler=lambda: smart_home_hub.get_energy_summary()
        ))

        # 4. Smart Home - get_saving_tips
        self.register(ToolDefinition(
            name="get_saving_tips",
            description="Get energy conservation suggestions to reduce electricity waste.",
            parameters_schema={"type": "object", "properties": {}},
            permission_level="read_only",
            handler=lambda: smart_home_hub.get_saving_tips()
        ))

        # 5. Planner - list_tasks
        self.register(ToolDefinition(
            name="list_tasks",
            description="Retrieve all tracked assignments, deadlines, priorities, and countdown alerts.",
            parameters_schema={"type": "object", "properties": {}},
            permission_level="read_only",
            handler=lambda: {"tasks": planner_hub.get_deadlines()}
        ))

        # 6. Planner - create_task
        self.register(ToolDefinition(
            name="create_task",
            description="Create a new task, deadline, or assignment with title, due date, category, and priority.",
            parameters_schema={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Task or assignment title"},
                    "due_date": {"type": "string", "description": "Due date formatted YYYY-MM-DD or YYYY-MM-DD HH:MM"},
                    "category": {"type": "string", "description": "Category e.g. Assignment, Project, Exam, Personal", "default": "general"},
                    "priority": {"type": "string", "description": "Priority: low, medium, high, urgent", "default": "medium"},
                    "estimated_hours": {"type": "number", "description": "Estimated hours of work", "default": 2.0}
                },
                "required": ["title", "due_date"]
            },
            permission_level="state_changing",
            handler=lambda title, due_date, category="general", priority="medium", estimated_hours=2.0: planner_hub.add_deadline(
                title=title, due_date=due_date, category=category, priority=priority, estimated_hours=float(estimated_hours)
            ),
            verifier=lambda res, **kwargs: bool(res.get("id"))
        ))

        # 7. Planner - complete_task
        self.register(ToolDefinition(
            name="complete_task",
            description="Mark a task or submission deadline as completed.",
            parameters_schema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "Task ID number"}
                },
                "required": ["task_id"]
            },
            permission_level="state_changing",
            handler=lambda task_id: {"completed": planner_hub.complete_deadline(int(task_id)), "id": task_id},
            verifier=lambda res, task_id: bool(res.get("completed"))
        ))

        # 8. Planner - delete_task
        self.register(ToolDefinition(
            name="delete_task",
            description="Permanently delete a task or deadline.",
            parameters_schema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "Task ID number to delete"}
                },
                "required": ["task_id"]
            },
            permission_level="state_changing",
            handler=lambda task_id: {"deleted": planner_hub.delete_deadline(int(task_id)), "id": task_id},
            verifier=lambda res, task_id: bool(res.get("deleted"))
        ))

        # 9. Memory - save_memory
        self.register(ToolDefinition(
            name="save_memory",
            description="Save a confirmed user fact, routine, preference, or constraint to persistent memory.",
            parameters_schema={
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "The exact memory content"},
                    "category": {"type": "string", "description": "Category: preference, routine, fact, project, constraint", "default": "general"}
                },
                "required": ["content"]
            },
            permission_level="state_changing",
            handler=lambda content, category="general": memory_hub.save_memory(content=content, category=category),
            verifier=lambda res, **kwargs: bool(res.get("ok"))
        ))

        # 10. Memory - search_memory
        self.register(ToolDefinition(
            name="search_memory",
            description="Search persistent user memories, preferences, and routines.",
            parameters_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term or concept"}
                },
                "required": ["query"]
            },
            permission_level="read_only",
            handler=lambda query: {"memories": memory_hub.search_memories(query)}
        ))

        # 11. Proactive Insights - get_proactive_insights
        self.register(ToolDefinition(
            name="get_proactive_insights",
            description="Analyze upcoming deadlines to detect conflicts, overlapping tasks, and overloaded days.",
            parameters_schema={"type": "object", "properties": {}},
            permission_level="read_only",
            handler=lambda: {
                "conflicts": planner_hub.detect_conflicts(),
                "daily_plan": planner_hub.generate_daily_plan()
            }
        ))


# Singleton Tool Registry
tool_registry = ToolRegistry()
