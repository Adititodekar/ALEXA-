
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

api = FastAPI(title="Alexa Aura API")

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

devices = {
    "living_room_light": {"on": True, "watts": 9},
    "bedroom_fan": {"on": False, "watts": 55},
    "television": {"on": False, "watts": 80},
}


class ChatMessage(BaseModel):
    message: str


class DeviceCommand(BaseModel):
    device: str
    on: bool


@api.get("/api/health")
def health():
    return {"ok": True, "service": "Alexa Aura API"}


@api.get("/api/devices")
def list_devices():
    return devices


@api.post("/api/device")
def set_device(command: DeviceCommand):
    if command.device not in devices:
        return {"ok": False, "error": "Unknown device"}

    devices[command.device]["on"] = command.on
    return {
        "ok": True,
        "device": command.device,
        "on": command.on,
        "simulated": True,
    }


@api.get("/api/energy")
def energy_summary():
    watts = sum(
        item["watts"] for item in devices.values() if item["on"]
    )
    return {"estimated_current_watts": watts, "simulated": True}


@api.post("/api/chat")
def chat(body: ChatMessage):
    message = body.message.lower()

    if "energy" in message or "electricity" in message:
        watts = sum(
            item["watts"] for item in devices.values() if item["on"]
        )
        reply = (
            f"Estimated simulated power usage is {watts} watts. "
            "This is not a real meter reading."
        )
    elif "light" in message and "off" in message:
        devices["living_room_light"]["on"] = False
        reply = "The simulated living-room light is now off."
    elif "light" in message and "on" in message:
        devices["living_room_light"]["on"] = True
        reply = "The simulated living-room light is now on."
    else:
        reply = (
            "Hi! I'm Aura. Try asking for an energy summary, "
            "or ask me to turn the living-room light on or off."
        )

    return {"reply": reply, "simulated": True}
