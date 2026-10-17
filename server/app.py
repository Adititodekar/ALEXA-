
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Alexa Aura")

# Demo-only state stored in memory.
devices = {
    "living_room_light": {"on": True, "watts": 9},
    "bedroom_fan": {"on": False, "watts": 55},
    "television": {"on": False, "watts": 80},
}


@mcp.tool()
def list_devices() -> dict:
    """List demo smart-home devices and their current simulated states."""
    return devices


@mcp.tool()
def set_device_state(device: str, on: bool) -> dict:
    """Change a simulated device state. Does not control real hardware."""
    if device not in devices:
        return {"ok": False, "error": "Unknown device"}

    devices[device]["on"] = on
    return {
        "ok": True,
        "device": device,
        "on": on,
        "note": "Simulated state only; no physical device was controlled.",
    }


@mcp.tool()
def get_energy_summary() -> dict:
    """Estimate current power from the demo devices' configured wattages."""
    watts = sum(
        item["watts"] for item in devices.values() if item["on"]
    )
    return {
        "estimated_current_watts": watts,
        "unit": "W",
        "is_simulated": True,
    }


@mcp.tool()
def get_saving_tips() -> list[str]:
    """Return basic energy-saving suggestions."""
    return [
        "Switch off lights in empty rooms.",
        "Turn off devices that are not in use.",
        "Use fans efficiently before lowering the air-conditioner setting.",
    ]


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
