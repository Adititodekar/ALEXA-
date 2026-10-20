"""
MCP Server for Alexa Aura / Nova Assistant.
Complies with MCP specification 2025-11-25 over Streamable HTTP transport.
Exposes genuine smart-home device control, energy monitoring, and power-saving tools.
"""

import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
project_root = str(Path(__file__).resolve().parents[1])
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from mcp.server.fastmcp import FastMCP
from core.smart_home import smart_home_hub

mcp = FastMCP("Alexa Aura")

@mcp.tool()
def list_devices() -> dict:
    """List all connected smart-home devices and their current operational states."""
    return smart_home_hub.list_devices()


@mcp.tool()
def set_device_state(device: str, on: bool) -> dict:
    """Change a device power state (turn on or off). Supports device names like 'living room light' or IDs."""
    return smart_home_hub.set_device_state(device, on)


@mcp.tool()
def get_energy_summary() -> dict:
    """Calculate real-time power draw (watts) across all active home devices."""
    return smart_home_hub.get_energy_summary()


@mcp.tool()
def get_saving_tips() -> list[str]:
    """Return actionable energy-saving suggestions for reducing household electricity consumption."""
    return smart_home_hub.get_saving_tips()


if __name__ == "__main__":
    # Runs standalone MCP server over Streamable HTTP transport
    mcp.run(transport="streamable-http")
