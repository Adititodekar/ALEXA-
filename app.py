"""
FastAPI Server for NOVA AI Assistant (Alexa-Next 2.0).
Provides REST endpoints and FastMCP Streamable HTTP mount for:
- Autonomous Mission Mode (Formulate, Review, Approve, Execute, Verify)
- Real Tool Activity Inspector and Trust Center
- User-Controlled Persistent Memory
- Multimodal Vision & Document Intelligence
- Proactive Schedule & Deadline Conflict Analysis
- What-If Scenario Simulator
- Smart Home IoT & Energy Power Calculations
- Reminders, Digital Wellbeing, and SOS Emergency Guardian
"""

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import os
import json
import logging

from core.brain import NovaBrain
from core.database import db
from core.mission_engine import mission_engine
from core.tool_registry import tool_registry
from core.memory_manager import memory_hub
from core.multimodal_service import multimodal_hub
from core.proactive_engine import proactive_engine
from core.what_if_simulator import what_if_simulator
from core.skill_builder import skill_builder
from core.reminder_service import reminder_service
from core.conversation_manager import conversation_mgr
from server.app import mcp

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize FastMCP streamable-http session manager and transport security
    mcp.settings.streamable_http_path = "/"
    if hasattr(mcp.settings, "transport_security"):
        mcp.settings.transport_security.allowed_hosts = [
            "localhost", "127.0.0.1", "localhost:8000", "127.0.0.1:8000", "0.0.0.0", "*"
        ]
    try:
        async with mcp.session_manager.run():
            logger.info("FastMCP Streamable HTTP session manager running.")
            yield
    except Exception as exc:
        logger.warning("FastMCP session manager error: %s", exc)
        yield


app = FastAPI(
    title="NOVA AI Assistant API (Alexa-Next 2.0)",
    version="2.0.0",
    description="Autonomous Multimodal AI Voice & Task Assistant",
    lifespan=lifespan
)

# Enable CORS for browser dashboard & external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Brain
brain = NovaBrain()


# --- Pydantic Request Models ---

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = "default-session"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MissionPlanRequest(BaseModel):
    goal: str
    conversation_id: Optional[str] = "default-session"

class MissionStepsUpdateRequest(BaseModel):
    steps: List[Dict[str, Any]]

class SOSRequest(BaseModel):
    situation: str = "User initiated manual panic button or distress call"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class DeadlineRequest(BaseModel):
    title: str
    due_date: str
    category: str = "general"
    priority: str = "medium"
    estimated_hours: Optional[float] = 2.0

class MemoryRequest(BaseModel):
    content: str
    category: str = "general"
    is_pinned: bool = False

class MemoryUpdateRequest(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None
    is_pinned: Optional[bool] = None

class WhatIfRequest(BaseModel):
    scenario_title: Optional[str] = "Alternative Workload Schedule"
    modifications: List[Dict[str, Any]]

class SkillCreateRequest(BaseModel):
    title: str
    trigger_phrase: str
    description: str
    steps: List[Dict[str, Any]]

class ReminderCreateRequest(BaseModel):
    title: str
    due_time: str
    recurring: Optional[str] = "none"

class DeviceToggleRequest(BaseModel):
    device: str
    on: bool

class AppLimitRequest(BaseModel):
    app_name: str
    limit_minutes: int


# =========================================================================
# 1. CORE CONVERSATION & CHAT ENDPOINTS
# =========================================================================

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """Conversational endpoint: processes voice/text input and coordinates all capabilities."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        return brain.process_message(
            user_text=req.message,
            conversation_id=req.conversation_id or "default-session",
            user_lat=req.latitude,
            user_lng=req.longitude
        )
    except Exception as exc:
        logger.exception("Chat processing encountered error: %s", exc)
        fallback_speech = "I'm right here with you! What would you like to explore or do next?"
        return {
            "speech_reply": fallback_speech,
            "display_reply": fallback_speech,
            "reply": fallback_speech,
            "mood": {"primary_mood": "calm", "is_emergency": False},
            "type": "conversation",
            "media": None,
            "mission_plan": None
        }

@app.get("/api/conversations")
async def list_conversations():
    """Lists saved conversation sessions."""
    return {"conversations": conversation_mgr.list_conversations()}

@app.post("/api/conversations")
async def create_conversation(title: str = "New Conversation"):
    """Creates a new conversation thread."""
    return conversation_mgr.create_conversation(title)

@app.get("/api/conversations/{conv_id}/messages")
async def get_conversation_messages(conv_id: str):
    """Retrieves all messages for a specific conversation session."""
    return {"messages": conversation_mgr.get_messages(conv_id)}

@app.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    """Deletes a conversation session."""
    ok = conversation_mgr.delete_conversation(conv_id)
    return {"ok": ok, "id": conv_id}


# =========================================================================
# 2. SIGNATURE AUTONOMOUS MISSION MODE ENDPOINTS
# =========================================================================

@app.post("/api/missions/plan")
async def create_mission_plan(req: MissionPlanRequest):
    """Decomposes a user natural-language goal into a structured multi-step plan."""
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty")
    return brain.mission_engine.create_mission_plan(req.goal, conversation_id=req.conversation_id)

@app.get("/api/missions")
async def list_missions():
    """Lists recent autonomous missions."""
    return {"missions": brain.mission_engine.list_recent_missions()}

@app.get("/api/missions/{mission_id}")
async def get_mission(mission_id: str):
    """Retrieves full mission details, steps, and execution status."""
    m = brain.mission_engine.get_mission(mission_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")
    return m

@app.put("/api/missions/{mission_id}/steps")
async def update_mission_steps(mission_id: str, req: MissionStepsUpdateRequest):
    """Allows user to edit, delete, or reorder plan steps prior to execution."""
    res = brain.mission_engine.update_mission_steps(mission_id, req.steps)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@app.post("/api/missions/{mission_id}/approve")
async def approve_and_execute_mission(mission_id: str):
    """Approve and trigger sequential execution of an autonomous mission."""
    res = brain.mission_engine.execute_mission(mission_id, approved=True)
    return res

@app.post("/api/missions/{mission_id}/cancel")
async def cancel_mission(mission_id: str):
    """Cancels an active or pending autonomous mission."""
    return brain.mission_engine.cancel_mission(mission_id)


# =========================================================================
# 3. LIVE ACTIVITY INSPECTOR & TRUST CENTER ENDPOINTS
# =========================================================================

@app.get("/api/activity/logs")
async def get_activity_logs(limit: int = 50):
    """Returns real-time observable timeline of tool executions and verifications."""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, mission_id, tool_name, sanitized_args_json, status,
                   duration_ms, result_summary, error_detail, requires_approval,
                   verified, created_at
            FROM tool_logs
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()

    logs = []
    for r in rows:
        logs.append({
            "id": r["id"],
            "mission_id": r["mission_id"],
            "tool_name": r["tool_name"],
            "arguments": json.loads(r["sanitized_args_json"]) if r["sanitized_args_json"] else {},
            "status": r["status"],
            "duration_ms": r["duration_ms"],
            "summary": r["result_summary"],
            "error": r["error_detail"],
            "requires_approval": bool(r["requires_approval"]),
            "verified": bool(r["verified"]),
            "timestamp": r["created_at"]
        })
    return {"logs": logs}

@app.get("/api/trust-center")
async def get_trust_center():
    """Returns trust status, registered tools, security policies, and permissions."""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT pref_key, value_json FROM user_preferences")
        prefs = {r["pref_key"]: json.loads(r["value_json"]) for r in cursor.fetchall()}

    return {
        "status": "secure",
        "api_keys_server_side": True,
        "arbitrary_execution_blocked": True,
        "state_changing_requires_approval": prefs.get("require_approval_state_changing", True),
        "memory_enabled": prefs.get("memory_enabled", True),
        "registered_tools": tool_registry.list_tools(),
        "preferences": prefs
    }


# =========================================================================
# 4. USER-CONTROLLED PERSISTENT MEMORY ENDPOINTS
# =========================================================================

@app.get("/api/memory")
async def list_memories(category: Optional[str] = None):
    """Returns user memories ordered with pinned items first."""
    return {
        "enabled": memory_hub.is_memory_enabled(),
        "memories": memory_hub.list_memories(category)
    }

@app.post("/api/memory")
async def save_memory(req: MemoryRequest):
    """Saves a confirmed fact, preference, or routine to persistent storage."""
    return memory_hub.save_memory(req.content, req.category, is_fact=True, is_pinned=req.is_pinned)

@app.put("/api/memory/{memory_id}")
async def update_memory(memory_id: int, req: MemoryUpdateRequest):
    """Updates an existing memory."""
    res = memory_hub.update_memory(memory_id, req.content, req.category, req.is_pinned)
    if not res:
        raise HTTPException(status_code=404, detail="Memory not found")
    return res

@app.delete("/api/memory/{memory_id}")
async def delete_memory(memory_id: int):
    """Deletes a specific memory."""
    ok = memory_hub.delete_memory(memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"ok": True, "id": memory_id}

@app.post("/api/memory/clear")
async def clear_all_memories():
    """Clears all stored memories."""
    count = memory_hub.clear_all_memories()
    return {"ok": True, "cleared_count": count}

@app.post("/api/memory/toggle")
async def toggle_memory(enable: bool):
    """Enables or disables persistent memory storage."""
    res = memory_hub.set_memory_enabled(enable)
    return {"memory_enabled": res}


# =========================================================================
# 5. MULTIMODAL VISION & DOCUMENT INTELLIGENCE
# =========================================================================

@app.post("/api/multimodal/upload")
async def upload_document(
    file: UploadFile = File(...),
    prompt: Optional[str] = Form(None)
):
    """Uploads and analyzes document/screenshot/image using Gemini multimodal vision."""
    file_bytes = await file.read()
    res = brain.multimodal.process_upload(file.filename, file_bytes, user_prompt=prompt)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error", "File processing failed"))
    return res

@app.get("/api/knowledge/files")
async def list_knowledge_files():
    """Lists all uploaded documents and extracted summaries."""
    return {"files": brain.multimodal.list_uploaded_files()}


# =========================================================================
# 6. PROACTIVE LIFE ENGINE & WHAT-IF SIMULATOR
# =========================================================================

@app.get("/api/proactive/insights")
async def get_proactive_insights():
    """Returns data-grounded explainable recommendations and conflict alerts."""
    return {"insights": brain.proactive.generate_insights()}

@app.post("/api/what-if/simulate")
async def simulate_what_if(req: WhatIfRequest):
    """Simulates schedule changes without modifying live data."""
    return what_if_simulator.simulate_scenario(req.modifications, req.scenario_title)

@app.post("/api/what-if/apply")
async def apply_what_if(req: WhatIfRequest):
    """Applies approved schedule modifications to live database."""
    return what_if_simulator.apply_scenario(req.modifications)


# =========================================================================
# 7. PERSONAL SKILL BUILDER
# =========================================================================

@app.get("/api/skills")
async def list_skills():
    """Lists reusable natural language skills."""
    return {"skills": skill_builder.list_skills()}

@app.post("/api/skills")
async def create_skill(req: SkillCreateRequest):
    """Creates a new skill routine."""
    return skill_builder.create_skill(req.title, req.trigger_phrase, req.description, req.steps)

@app.post("/api/skills/{skill_id}/run")
async def run_skill(skill_id: int):
    """Executes a saved skill as an autonomous mission."""
    res = skill_builder.run_skill(skill_id)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@app.delete("/api/skills/{skill_id}")
async def delete_skill(skill_id: int):
    """Deletes a saved skill."""
    ok = skill_builder.delete_skill(skill_id)
    return {"ok": ok, "id": skill_id}


# =========================================================================
# 8. REMINDERS & SCHEDULED AUTOMATION
# =========================================================================

@app.get("/api/reminders")
async def list_reminders():
    """Returns scheduled reminders with countdowns."""
    return {"reminders": reminder_service.list_reminders()}

@app.post("/api/reminders/scan-conversations")
async def scan_conversation_reminders():
    """Turn dated commitments from recent conversation into tasks and reminders."""
    captured = brain.scan_recent_conversation_deadlines()
    return {"count": len(captured), "captured": captured}

@app.post("/api/reminders")
async def add_reminder(req: ReminderCreateRequest):
    """Schedules a new reminder."""
    return reminder_service.add_reminder(req.title, req.due_time, req.recurring)

@app.post("/api/reminders/{reminder_id}/complete")
async def complete_reminder(reminder_id: int):
    """Marks a reminder as delivered."""
    ok = reminder_service.complete_reminder(reminder_id)
    return {"ok": ok, "id": reminder_id}

@app.delete("/api/reminders/{reminder_id}")
async def delete_reminder(reminder_id: int):
    """Deletes a reminder."""
    ok = reminder_service.delete_reminder(reminder_id)
    return {"ok": ok, "id": reminder_id}


# =========================================================================
# 9. EXISTING PRESERVED ENDPOINTS (Planner, Smart Home, Location, SOS)
# =========================================================================

@app.get("/api/planner/daily")
async def get_daily_plan():
    """Returns conversation-synthesized daily schedule."""
    return brain.planner.generate_daily_plan()

@app.get("/api/planner/deadlines")
async def get_deadlines():
    """Returns all tracked submission deadlines with countdown status."""
    return {"deadlines": brain.planner.get_deadlines()}

@app.post("/api/planner/deadlines")
async def add_deadline(req: DeadlineRequest):
    """Adds a new submission deadline to track."""
    res = brain.planner.add_deadline(req.title, req.due_date, req.category, req.priority, req.estimated_hours)
    return res

@app.delete("/api/planner/deadlines/{deadline_id}")
async def delete_deadline_endpoint(deadline_id: int):
    """Permanently deletes a deadline."""
    ok = brain.planner.delete_deadline(deadline_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return {"ok": True, "id": deadline_id, "deleted": True}

@app.post("/api/planner/deadlines/{deadline_id}/complete")
async def complete_deadline_endpoint(deadline_id: int):
    """Marks a deadline as completed."""
    ok = brain.planner.complete_deadline(deadline_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return {"ok": True, "id": deadline_id, "completed": True}

@app.get("/api/devices")
async def list_devices():
    """Lists all smart home devices and operational states."""
    return brain.smart_home.list_devices()

@app.post("/api/device")
async def set_device(req: DeviceToggleRequest):
    """Controls a smart home device."""
    res = brain.smart_home.set_device_state(req.device, req.on)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to set device"))
    return res

@app.get("/api/energy")
async def energy_summary():
    """Returns current estimated household power draw."""
    return brain.smart_home.get_energy_summary()

@app.post("/api/sos/trigger")
async def sos_endpoint(req: SOSRequest):
    """Direct emergency panic trigger: captures GPS coordinates and broadcasts alerts."""
    res = brain.guardian.trigger_sos(
        situation_description=req.situation,
        lat=req.latitude,
        lng=req.longitude,
        address=brain.location_service.last_known_address
    )
    return res

@app.get("/api/sos/history")
async def get_sos_history():
    return {"history": brain.guardian.sos_history}

@app.post("/api/location/update")
async def update_location(req: LocationUpdateRequest):
    """Updates the assistant's knowledge of the user's current GPS location."""
    res = brain.location_service.update_coords(req.latitude, req.longitude, req.accuracy)
    return res

@app.get("/api/location/current")
async def get_current_location():
    return {
        "coords": brain.location_service.last_known_coords,
        "address": brain.location_service.last_known_address
    }

@app.get("/api/location/directions")
async def get_directions(destination: str, lat: Optional[float] = None, lng: Optional[float] = None):
    """Generates turn-by-turn directions and distance metrics to destination."""
    res = brain.location_service.get_route_and_directions(destination, start_lat=lat, start_lng=lng)
    return res

@app.get("/api/wellbeing/status")
async def get_wellbeing():
    """Returns screen time, app consumption, and limits."""
    return brain.wellbeing.get_summary()

@app.post("/api/wellbeing/limit")
async def set_wellbeing_limit(req: AppLimitRequest):
    """Configures usage limit for a mobile app."""
    return brain.wellbeing.set_app_limit(req.app_name, req.limit_minutes)

@app.post("/api/wellbeing/focus")
async def toggle_focus(enable: bool = True):
    """Enables or disables strict focus mode."""
    msg = brain.wellbeing.toggle_focus_mode(enable)
    return {"focus_mode": enable, "message": msg}

@app.get("/api/health")
async def health_endpoint():
    """System health check and diagnostic status."""
    llm_active = bool(brain._provider_order())
    return {
        "status": "online",
        "service": "NOVA AI Assistant API (Alexa-Next 2.0)",
        "version": "2.0.0",
        "gemini_active": brain.gemini_client is not None,
        "gemini_model": brain.gemini_model if brain.gemini_client else "offline_conversational_fallback",
        "llm_provider": brain.llm_provider,
        "llm_active": llm_active,
        "llm_model": brain._model_for_provider(brain.llm_provider) if llm_active else None,
        "llm_fallback_providers": brain.llm_fallback_providers,
        "mcp_enabled": True,
        "autonomous_missions_active": True,
        "tools_registered_count": len(tool_registry.tools)
    }


# =========================================================================
# 9B. WEATHER, MUSIC, ALARMS & DAILY BRIEFING ENDPOINTS
# =========================================================================

class AlarmCreateRequest(BaseModel):
    time_str: str
    label: Optional[str] = "Morning Alarm"
    recurring: Optional[str] = "none"

class TimerCreateRequest(BaseModel):
    minutes: float
    label: Optional[str] = "Timer"

class ReminderCreateRequest(BaseModel):
    text: str
    time_str: Optional[str] = "Today"

@app.get("/api/weather")
async def get_weather(city: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    """Returns real-time temperature, humidity, and atmospheric conditions."""
    return brain.weather.get_weather(lat=lat, lon=lon, city=city)

@app.get("/api/music/state")
async def get_music_state():
    return brain.music.get_player_state()

@app.post("/api/music/play")
async def play_music():
    return brain.music.play_favourite_songs()

@app.post("/api/music/pause")
async def pause_music():
    return brain.music.pause()

@app.post("/api/music/next")
async def next_music():
    return brain.music.next_track()

@app.post("/api/music/prev")
async def prev_music():
    return brain.music.prev_track()


@app.get("/api/alarms")
async def get_all_alarms_timers():
    return brain.alarms.get_all()

@app.post("/api/alarms")
async def create_alarm(req: AlarmCreateRequest):
    return brain.alarms.add_alarm(req.time_str, req.label, req.recurring)

@app.post("/api/timers")
async def create_timer(req: TimerCreateRequest):
    return brain.alarms.add_timer(req.minutes, req.label)

@app.post("/api/reminders/new")
async def create_reminder_item(req: ReminderCreateRequest):
    return brain.alarms.add_reminder(req.text, req.time_str)

@app.delete("/api/alarms/{item_id}")
async def delete_alarm_item(item_id: int):
    ok = brain.alarms.delete_item(item_id)
    return {"ok": ok, "id": item_id}

@app.get("/api/briefing")
async def get_daily_briefing():
    w_data = brain.weather.get_weather()
    tasks = brain.planner.get_deadlines()
    energy = brain.smart_home.get_energy_summary()
    return brain.news.generate_daily_briefing(w_data, tasks, energy)


# =========================================================================
# 10. MOUNT FASTMCP STREAMABLE HTTP APP & STATIC UI
# =========================================================================

try:
    from server.app import mcp
    mcp.settings.streamable_http_path = "/"
    if hasattr(mcp.settings, "transport_security"):
        mcp.settings.transport_security.allowed_hosts = [
            "localhost", "127.0.0.1", "localhost:8000", "127.0.0.1:8000", "0.0.0.0", "*"
        ]
    app.mount("/mcp", mcp.streamable_http_app())
    logger.info("Mounted FastMCP Streamable HTTP app at /mcp")
except Exception as exc:
    logger.warning("Could not mount FastMCP endpoint: %s", exc)

# Serve static frontend UI
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
