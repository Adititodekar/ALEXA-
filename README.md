# 🌟 ALEXA- / NOVA AI: Next-Generation Multimodal Assistant & Life Guardian

An advanced, multimodal, voice-interactive assistant designed for the **Alexa+ / Next-Gen Voice Hackathon**. It combines **conversational LLM reasoning, genuine MCP tool execution, an authentic 6-state Animated Alexa Eye, real-time live media cards, smart-home IoT & energy optimization, conversation-driven daily planning, deadline tracking, live GPS location & turn-by-turn navigation, digital wellbeing screen time limits, mood/emotion adaptation, and life-saving Emergency SOS detection**.

---

## 🏆 Hackathon Route Compliance

This project is engineered to satisfy both hackathon submission routes:

* **Route A — Model Context Protocol (MCP) Implementation:**
  * Implements MCP specification (v1.30+ / spec 2025-11-25) over **Streamable HTTP transport**.
  * Mounted live at `http://127.0.0.1:8000/mcp/` or runnable standalone via `python -m server.app`.
  * Exposes verified, executable MCP tools: `list_devices`, `set_device_state`, `get_energy_summary`, and `get_saving_tips`.
  * Validates JSON-RPC 2.0 inputs, manages session lifespans, and updates persistent device states.

* **Route B — Simulated Alexa+ Multimodal Experience:**
  * Provides an interactive, voice-driven companion dashboard with two-way speech (STT/TTS).
  * Incorporates an authentic **6-state Animated Alexa Eye** (Idle, Listening, Thinking, Speaking, Success, Error).
  * Integrates Google **Gemini 3.8 Flash** with multi-turn memory, emotion adaptation, and seamless offline fallback.

---

## 🚀 Key Features

| Capability | How It Works |
| :--- | :--- |
| **👁️ Animated Alexa Eye Core** | Authentic 6-state interactive visualizer: breathing in **Idle**, expanding ripples in **Listening**, orbital particle spin in **Thinking**, audio waveform bars in **Speaking**, emerald confirmation pop in **Success**, and amber alert shake in **Error**. Respects `prefers-reduced-motion`. |
| **🗣️ Two-Way Natural Voice Conversation** | Hands-free voice interaction using Web Speech API (STT/TTS) with natural voice synthesis and real-time audio visualization. |
| **🧠 Gemini 3.8 Flash Intelligence** | Integrated with Google AI Studio's active `gemini-3.8-flash` model, passing multi-turn dialogue history, user emotional state, and location metadata. |
| **💡 Smart Home IoT & Energy Monitor** | Controls connected household appliances (Living Room Light, Bedroom Fan, Smart TV, Kitchen Cooler), calculates real-time power draw in watts, and recommends power-saving tips. |
| **📅 Conversation-Driven Daily Planner** | Automatically synthesizes daily agendas with prioritized deep-work blocks, meal breaks, and focus windows. |
| **⏰ Submission Deadlines & Countdown Alerts** | SQLite-backed task and assignment tracking with live countdowns, urgency badges, and full CRUD (Add, Complete, Delete). |
| **📍 Live GPS Tracking & Directions ("Where Am I?")** | Real-time geolocation, reverse-geocodes exact street address via OpenStreetMap Nominatim, and calculates turn-by-turn routes on a dark-themed Leaflet map. |
| **📱 Phone Limits & Digital Wellbeing** | Monitors daily screen time and individual app limits (Instagram, YouTube). Includes voice warnings and a strict Focus Mode toggle. |
| **🚨 Emergency SOS Guardian & Siren** | Listens for distress keywords ("Help me", "I had an accident") or manual panic button. Emits audio siren and broadcasts live GPS coordinates and emergency contacts. |
| **🎭 Emotion & Mood Engine** | Detects emotional states (Joyful, Stressed, Anxious, Sad, Calm, Emergency) and adapts the tone of speech accordingly. |

---

## 🛠️ Project Architecture

```
ALEXA-/
├── app.py                     # Main FastAPI server (REST APIs, static UI & FastMCP mount)
├── run.py                     # One-click launcher (starts server + opens browser)
├── requirements.txt           # Unified project dependencies (FastAPI, uvicorn, mcp, google-genai, etc.)
├── .env.example               # Safe environment variable template
├── .env                       # Local secrets (ignored by Git)
├── core/
│   ├── brain.py               # Central AI orchestrator & intent router
│   ├── smart_home.py          # Shared IoT device state & energy calculation engine
│   ├── mood_engine.py         # Sentiment & distress detection engine
│   ├── emergency_guardian.py  # Emergency situation detector & SOS dispatcher
│   ├── location_service.py    # Geolocation, reverse geocoding & OSRM routing
│   ├── media_service.py       # Live Wikipedia data, verified images & YouTube links
│   ├── wellbeing_tracker.py   # Screen time & app usage limiter
│   ├── planner.py             # SQLite-backed daily schedule & deadline engine (Full CRUD)
│   └── conversation_engine.py # Dynamic offline dialogue engine & multi-turn memory
├── server/
│   ├── app.py                 # FastMCP server exposing IoT & energy tools over Streamable HTTP
│   └── web_api.py             # Standalone API endpoints
├── static/
│   ├── index.html             # Multimodal dashboard with Animated Alexa Eye & IoT widgets
│   ├── style.css              # Cyber-clean glassmorphism dark theme & CSS keyframe animations
│   └── app.js                 # Web Speech API, Leaflet map, toast alerts & IoT polling
├── mobile_android/
│   ├── NovaForegroundService.kt # Android Kotlin foreground service reference
│   └── AndroidManifest_Snippet.xml # Android permissions reference
└── data/
    └── nova_planner.db        # SQLite database for persistent deadlines and notes
```

---

## 🏃 Quick Start Guide

### 1. Prerequisites
* Python 3.10+ (tested on Python 3.12)
* Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) *(optional — offline conversation engine works without keys)*

### 2. Environment Setup
1. Clone or open the repository.
2. Copy the template and add your API key:
   ```bash
   cp .env.example .env
   ```
3. Configure `.env`:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   GEMINI_MODEL=gemini-3.8-flash
   ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
Start the unified application:
```bash
python run.py
```
* Your browser will automatically open to **`http://127.0.0.1:8000`**.
* The FastMCP Streamable HTTP server will be available at **`http://127.0.0.1:8000/mcp/`**.

---

## 📡 Live API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check, service status, and Gemini diagnostics |
| `POST` | `/api/chat` | Conversational voice/text processor and intent router |
| `GET` | `/api/devices` | Lists all smart-home IoT devices and operational states |
| `POST` | `/api/device` | Toggles device power state (`{"device": "bedroom_fan", "on": true}`) |
| `GET` | `/api/energy` | Returns current total household power draw (watts) and active count |
| `GET` | `/api/planner/deadlines` | Retrieves tracked submission deadlines |
| `POST` | `/api/planner/deadlines` | Adds a new submission deadline |
| `POST` | `/api/planner/deadlines/{id}/complete` | Marks a deadline completed |
| `DELETE` | `/api/planner/deadlines/{id}` | Permanently deletes a deadline |
| `GET` | `/api/wellbeing/status` | Returns screen time and app usage stats |
| `POST` | `/api/wellbeing/focus` | Toggles strict Focus Mode |
| `POST` | `/api/sos/trigger` | Triggers emergency distress broadcast with live GPS |
| `POST` | `/mcp/` | MCP Streamable HTTP JSON-RPC 2.0 tool execution endpoint |

---

## 🎬 3-Minute Demo Walkthrough Script

Use this step-by-step sequence for recording your hackathon demo:

1. **Introduction & Idle Eye (0:00 - 0:30)**:
   * Point out the dashboard and the **Animated Alexa Eye** in its gentle ambient breathing state.
   * Explain Nova's role as a next-generation multimodal assistant and guardian.

2. **Smart Home & Energy Tool Execution (0:30 - 1:10)**:
   * Click the suggestion pill: *"Turn on the living room light and show energy usage"*.
   * Watch the Alexa Eye transition into **Thinking** (orbiting violet ring) -> **Success** (emerald flash) -> **Speaking** (sound wave bars).
   * Observe the chat response confirming the action and the **Smart Home IoT card** on the right updating its wattage load.

3. **General Knowledge & Verified Media (1:10 - 1:45)**:
   * Ask: *"Show me real images and videos of the James Webb Space Telescope"*.
   * Demonstrates Gemini 3.8 Flash answering concisely while the Media Service fetches real high-resolution images and YouTube explainers.

4. **Deadline Tracking & Day Planner (1:45 - 2:20)**:
   * Ask: *"Prepare my day based on my deadlines"*.
   * Show the structured day schedule generated with deep work blocks.
   * Add a deadline using the `+ Add Deadline` modal, observe the live countdown, and check off an assignment.

5. **Location Awareness & Emergency SOS (2:20 - 3:00)**:
   * Ask: *"Where am I?"* to display the live GPS coordinates, reverse-geocoded street address, and Leaflet route line.
   * Click the **SOS EMERGENCY** button.
   * Show the red alert modal, audio siren, and live distress coordinates broadcast.

---

## 🔍 Simulation & Hardware Disclosure

In compliance with hackathon transparency guidelines:
* **Smart-Home Devices:** Device states (lights, fans, TVs, AC) and power draws are simulated in memory via `core/smart_home.py` and FastMCP. No real physical relays are altered.
* **Emergency Dispatch:** The emergency call and distress broadcast simulate SMS and phone transmission; personal contact entries and `112` dialing links are provided.
* **Android Deployment:** The `mobile_android/` directory provides production-ready Kotlin source code (`NovaForegroundService.kt`) outlining the native Android APIs (`UsageStatsManager`, `FusedLocationProviderClient`, `SmsManager`).
