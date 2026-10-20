"""
FastAPI Server for Nova AI Assistant.
Exposes voice conversation endpoints, location tracking, planner, wellbeing, and SOS handlers.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
import os
import logging

from core.brain import NovaBrain
from server.app import mcp

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
            logging.getLogger(__name__).info("FastMCP Streamable HTTP session manager running.")
            yield
    except Exception as exc:
        logging.getLogger(__name__).warning("FastMCP session manager error: %s", exc)
        yield

app = FastAPI(title="Nova AI Assistant API", version="2.0.0", lifespan=lifespan)

# Enable CORS for all clients (Web, Mobile Android, iOS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Brain
brain = NovaBrain()

class ChatRequest(BaseModel):
    message: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

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

class AppLimitRequest(BaseModel):
    app_name: str
    limit_minutes: int

class DeviceToggleRequest(BaseModel):
    device: str
    on: bool

# --- API Endpoints ---

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """Conversational endpoint: processes voice/text input and coordinates all capabilities."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    try:
        return brain.process_message(
            user_text=req.message,
            user_lat=req.latitude,
            user_lng=req.longitude
        )
    except Exception as exc:
        logging.getLogger(__name__).exception("Chat processing encountered an issue: %s", exc)
        fallback_speech = "I'm right here with you! What would you like to explore or do next?"
        return {
            "speech_reply": fallback_speech,
            "display_reply": fallback_speech,
            "reply": fallback_speech,
            "mood": {"primary_mood": "calm", "is_emergency": False},
            "type": "conversation",
            "media": None,
            "location": None,
            "navigation": None,
            "planner": None,
            "wellbeing": None
        }

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
    res = brain.planner.add_deadline(req.title, req.due_date, req.category, req.priority)
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

@app.get("/api/health")
async def health_endpoint():
    """System health check and diagnostic status."""
    return {
        "status": "online",
        "service": "Nova AI Assistant API",
        "version": "2.0.0",
        "gemini_active": brain.gemini_client is not None,
        "gemini_model": brain.gemini_model if brain.gemini_client else "offline_conversational_fallback",
        "mcp_enabled": True
    }

# --- Smart Home & Energy Endpoints ---

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

# Mount FastMCP Streamable HTTP app for MCP specification compliance (Route A)
try:
    from server.app import mcp
    mcp.settings.streamable_http_path = "/"
    if hasattr(mcp.settings, "transport_security"):
        mcp.settings.transport_security.allowed_hosts = [
            "localhost", "127.0.0.1", "localhost:8000", "127.0.0.1:8000", "0.0.0.0", "*"
        ]
    app.mount("/mcp", mcp.streamable_http_app())
    logging.getLogger(__name__).info("Mounted FastMCP Streamable HTTP app at /mcp")
except Exception as exc:
    logging.getLogger(__name__).warning("Could not mount FastMCP endpoint: %s", exc)

# Serve static frontend UI
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
