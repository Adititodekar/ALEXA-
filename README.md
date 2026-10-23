# 🌟 NOVA AI — ALEXA-NEXT 2.0
### Autonomous Multimodal Web Assistant, Life Guardian & IoT Companion

[![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MCP Spec](https://img.shields.io/badge/FastMCP-Streamable_HTTP-8A2BE2.svg)](https://modelcontextprotocol.io/)
[![Gemini 3.8 Flash](https://img.shields.io/badge/Google_Gemini-3.8_Flash-4285F4.svg?logo=google&logoColor=white)](https://aistudio.google.com/)
[![Database](https://img.shields.io/badge/SQLite3-Persistent_Storage-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-10%2F10_Passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Executive Summary & Hackathon Vision

**NOVA AI (Alexa-Next 2.0)** transforms legacy voice assistants from passive, reactive command-responders into an **autonomous, proactive, and multimodal personal agent**. 

Traditional assistants suffer from fundamental limitations:
1. **Shallow Single-Turn Execution:** They answer trivia or set timers, but cannot plan, decompose, or complete complex multi-step objectives.
2. **Hallucinated & Unaudited Tool Calls:** Users have zero visibility into what tools are invoked, whether actions succeeded, or how secrets are handled.
3. **Ephemeral Context & Amnesia:** They forget user routines, critical preferences, and long-term goals between sessions.
4. **Lack of Proactive Protection:** They wait to be addressed rather than detecting schedule congestion, approaching deadlines, or physical emergencies.

**NOVA AI solves this** by pairing **Google Gemini 3.8 Flash** with an **Autonomous Mission Planning Engine**, a **FastMCP (Model Context Protocol) 2025-11-25 streamable HTTP endpoint**, an **Observable Tool Registry & Trust Center**, an authentic **8-State Animated Alexa Eye**, **Proactive Schedule Auditing**, **What-If Simulation**, **User-Controlled Long-Term Memory**, and an **Emergency SOS Life Guardian**.

---

## 🏛️ System Architecture

```mermaid
graph TB
    subgraph Client_Layer [Client & Companion Interface]
        UI["Modern Web Dashboard (Tailwind, Lucide, Leaflet)"]
        EYE["8-State Dynamic Animated Alexa Eye"]
        VOICE["Speech-to-Text & Neural Audio Synthesis"]
        ANDROID["Android Companion Service (GPS, AppLimits, SOS)"]
    end

    subgraph Server_Gateway [FastAPI Gateway & FastMCP Mount]
        API["FastAPI REST Endpoints (/api/*)"]
        MCP["FastMCP Streamable HTTP Server (/mcp)"]
        STATIC["Native Static Asset Server (/)"]
    end

    subgraph Core_Intelligence [Nova Core AI Engine]
        BRAIN["NovaBrain Orchestrator"]
        GEMINI["Gemini 3.8 Flash & Multimodal Vision"]
        FALLBACK["Offline Deterministic Intent Engine"]
    end

    subgraph Autonomous_Subsystems [Autonomous & Safety Subsystems]
        MISSION["Autonomous Mission Engine (Formulate, Review, Execute)"]
        TOOLS["Observable Tool Registry & Trust Center"]
        MEMORY["Persistent Memory & User Digital Twin"]
        PROACTIVE["Proactive Life & Conflict Engine"]
        SIMULATOR["What-If Scenario Simulator"]
        SMART_HOME["IoT Device Hub & Wattage Calculations"]
        GUARDIAN["Emergency SOS Guardian & Audio Siren"]
        WELLBEING["Screen Time & Focus Limit Supervisor"]
    end

    subgraph Data_Storage [Storage & Persistence]
        DB[(SQLite3: nova_planner.db)]
        UPLOADS["Encrypted/Sanitized Document Storage"]
    end

    UI --> API
    UI --> STATIC
    MCP --> TOOLS
    API --> BRAIN
    ANDROID --> API
    BRAIN --> GEMINI
    BRAIN --> FALLBACK
    BRAIN --> MISSION
    BRAIN --> TOOLS
    BRAIN --> MEMORY
    BRAIN --> PROACTIVE
    BRAIN --> SIMULATOR
    BRAIN --> SMART_HOME
    BRAIN --> GUARDIAN
    BRAIN --> WELLBEING
    MISSION --> DB
    MEMORY --> DB
    SMART_HOME --> DB
    PROACTIVE --> DB
```

---

## 🏆 Key Features & Innovation Highlights

### 1. 🚀 Autonomous Mission Mode (Signature Feature)
* **Goal Decomposition:** Deconstructs complex user prompts (e.g., *"Help me organize my week, prepare for my midterm assignments, identify conflicts, and create a study plan"*) into verifiable, sequential subtasks.
* **Interactive Plan Review & Human-in-the-Loop:** Renders plans as editable cards where users can rename steps, delete steps, or reorder them before execution.
* **Consequential Approval Gates:** Requires explicit user sign-off for state-changing or high-impact actions.
* **Resilient Bounded Execution:** Each step features bounded retries, execution verification checkmarks, and fallback recovery.
* **Full Persistence:** Missions and steps survive browser reloads and server restarts in SQLite (`missions` and `mission_steps`).

### 2. 🔌 Model Context Protocol (FastMCP) Compliance
* Implements the **Model Context Protocol (v1.30+ / spec 2025-11-25)** over **Streamable HTTP transport**.
* Mounted directly at `http://127.0.0.1:8000/mcp` for agent-to-agent interoperability.
* Verified callable tools: `list_devices`, `set_device_state`, `get_energy_summary`, `get_saving_tips`.
* Can also be run standalone via `python -m server.app`.

### 3. 👁️ Authentic 8-State Animated Alexa Eye
A dynamic, reactive cybernetic eye visualizer rendered in CSS & Canvas responding to assistant state:
| State | Color & Animation | Description |
| :--- | :--- | :--- |
| `IDLE` | Soft Cyan Ambient Breathing | Standby mode waiting for voice/text wake |
| `LISTENING` | Deep Cyan Acoustic Waveform | Active microphone capturing user input |
| `THINKING` | Deep Indigo Orbiting Pulse | Multimodal reasoning & query parsing |
| `SPEAKING` | Bright Azure Audio Ripple | Speech synthesis actively outputting audio |
| `EXECUTING` | Fast Amber / Cyan Atomic Spin | Autonomous Mission or tool execution in flight |
| `SUCCESS` | Emerald Green Ring Glow | Completed action / verified tool postcondition |
| `ERROR` | Crimson Red Strobe Alert | Failed tool call or validation rejection |
| `PAUSED` | Golden Amber Orbit | Human-in-the-loop plan review awaiting user approval |

### 4. 🧠 User-Controlled Persistent Memory & Digital Twin
* Long-term memory stored in SQLite (`user_memories`), not lost between sessions.
* Captures user routines, pinned preferences, work rhythms, and project context.
* **User Sovereignty:** Full CRUD support in the UI — Search, Pin, Edit, Delete, Clear All, and an instant Master Toggle to enable/disable memory injection.

### 5. 📄 Multimodal Document & Vision Intelligence
* Upload assignment briefs, course syllabi, screenshots, or receipts (`.pdf`, `.png`, `.jpg`, `.txt`).
* Gemini Vision extracts deadlines, course codes, deliverables, and assignment weights.
* Automatically proposes formatted tasks with single-click **+ Add to Tasks** integration.

### 6. ⚡ Proactive Conflict Detection & What-If Simulator
* **Conflict Auditing:** Detects overlapping submission deadlines and overloaded study days before they happen.
* **Explainable Recommendations:** Explains *why* a conflict occurs and proposes balanced redistributions.
* **What-If Sandbox:** Clones live task data into an isolated sandbox to test shifting deadlines without altering production tasks. Once satisfied, apply changes with one click.

### 7. 🏡 Smart Home IoT & Real Wattage Math
* Real-time controls for simulated household appliances (living room light, study lamp, bedroom fan, television, AC).
* Mathematical energy modeling computing live power draw (watts) and cost efficiency tips.
* State changes persist across restarts.

### 8. 🚨 Emergency SOS Guardian & Live Geolocation
* One-click distress trigger or voice-activated emergency panic response.
* High-decibel audio siren playback generated via Web Audio API.
* Live GPS location tracking, reverse geocoding via OpenStreetMap Nominatim, and turn-by-turn routing via OSRM.
* Dispatches simulated emergency broadcasts with live coordinates and direct `112` links.

---

## 📂 Repository Structure

The codebase is organized cleanly without redundant files or dangling build artifacts:

```
ALEXA/
├── app.py                      # Main FastAPI application (REST APIs, static UI & FastMCP mount)
├── run.py                      # One-click launcher (starts server + opens companion dashboard)
├── requirements.txt            # Unified project dependencies
├── .env.example                # Safe environment variable template
├── .env                        # Local secrets (ignored by Git)
├── .gitignore                  # Git hygiene configuration
├── core/                       # Core backend logic & services
│   ├── brain.py                # Central AI orchestrator & intent router
│   ├── conversation_engine.py  # Multi-turn conversational handler & Gemini integration
│   ├── conversation_manager.py # Multi-session chat thread history
│   ├── database.py             # SQLite persistence manager & schema migrations
│   ├── mission_engine.py       # Autonomous Mission planner, step editor & executor
│   ├── tool_registry.py        # Typed tool registry, validation & audit logging
│   ├── memory_manager.py       # Persistent user-controlled memory (Digital Twin)
│   ├── multimodal_service.py   # Document parsing, image vision & task proposer
│   ├── proactive_engine.py     # Workload conflict detector & explainable recommendations
│   ├── what_if_simulator.py    # Non-destructive schedule simulator & trade-off analyzer
│   ├── skill_builder.py        # Custom user routines & macros
│   ├── reminder_service.py     # Proactive reminder scheduler
│   ├── smart_home.py           # Persistent IoT device hub & wattage calculations
│   ├── planner.py              # Task & deadline engine with priority tagging
│   ├── location_service.py     # Geolocation, reverse geocoding & OSRM routing
│   ├── media_service.py        # Live Wikipedia data & verified media links
│   ├── wellbeing_tracker.py    # Screen time & focus mode engine
│   ├── emergency_guardian.py   # Emergency SOS dispatcher & siren audio
│   ├── alarm_timer_service.py  # Alarms, countdown timers & recurring schedules
│   ├── music_service.py        # Media playback & playlist controller
│   ├── news_service.py         # Daily news briefings & weather synthesis
│   └── weather_service.py      # Live meteorological data service
├── server/
│   └── app.py                  # Standalone FastMCP server over Streamable HTTP
├── static/                     # High-performance single-page web application
│   ├── index.html              # 3-Panel glassmorphism companion dashboard
│   ├── style.css               # 8-state Animated Alexa Eye & cyber-clean dark theme
│   └── app.js                  # Speech recognition, audio synth siren, map, & missions
├── frontend/                   # Optional React + Vite UI (proxies to FastAPI on :8000)
├── mobile_android/             # Android companion reference implementation
│   ├── AndroidManifest_Snippet.xml # Permissions for GPS, SMS & UsageStats
│   └── NovaForegroundService.kt    # Kotlin background service for GPS & Screen Time
├── tests/
│   └── test_nova.py            # Automated 10-point test suite (unit + integration)
└── data/
    ├── nova_planner.db         # Persistent SQLite database (auto-created)
    └── uploads/                # Clean upload directory for multimodal files (.gitkeep)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Python:** Version `3.10` or higher (`3.11` / `3.12` recommended)
* **Web Browser:** Any modern browser (Google Chrome, Microsoft Edge, Firefox, Brave, Safari)
* **Gemini API Key:** (Optional, but recommended) from [Google AI Studio](https://aistudio.google.com/apikey). *If unconfigured, NOVA automatically falls back to its deterministic offline engine.*

### 2. Installation Steps

#### Step A: Clone the Repository
```bash
git clone https://github.com/Adititodekar/ALEXA-.git
cd ALEXA-
```

#### Step B: Set Up Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### Step C: Install Dependencies
```bash
pip install -r requirements.txt
```

#### Step D: Configure Environment Variables
Copy the template file to `.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Open `.env` and set your Google AI Studio key:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here...
GEMINI_MODEL=gemini-3.8-flash
```

---

## 🏃 Running the Application

### One-Click Launch
Start the unified application with the automated runner:

```bash
python run.py
```

* The FastAPI backend and FastMCP session manager will initialize.
* Your default web browser will automatically open to **`http://127.0.0.1:8000`**.
* The FastMCP streamable endpoint will be live at **`http://127.0.0.1:8000/mcp`**.

### Alternative: Direct Uvicorn Launch
```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

---

## 🧪 Verification & Automated Testing

NOVA includes an automated test suite verifying all 10 core subsystems:

```bash
python -m unittest tests/test_nova.py
```

### Test Coverage Breakdown:
1. `test_01_health_endpoint`: Verifies system diagnostics, FastMCP mount, and tool registry registration.
2. `test_02_chat_endpoint`: Tests multi-turn conversation and mood engine outputs.
3. `test_03_autonomous_mission_flow`: Verifies Plan formulation -> Step modification -> Approval -> Sequential execution -> DB persistence.
4. `test_04_tool_activity_and_trust_center`: Validates tool execution logs, latency tracking, and zero API-key leakage.
5. `test_05_persistent_memory_crud`: Verifies user memory storage, query, retrieval, and deletion.
6. `test_06_task_crud_and_conflicts`: Validates task management and deadline creation.
7. `test_07_multimodal_upload_validation`: Confirms file parsing and rejection of unauthorized file types.
8. `test_08_smart_home_persistence`: Verifies IoT device state toggling and wattage recalculation.
9. `test_09_proactive_insights`: Checks proactive schedule conflict analysis.
10. `test_10_what_if_simulator`: Validates isolated scenario simulation without modifying production tasks.

---

## 📡 REST API & MCP Specification

| Method | Endpoint | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Comprehensive system health & tool counts | None |
| `POST` | `/api/chat` | Conversational voice/text processor | `{"message": "Turn off living room light"}` |
| `POST` | `/api/missions/plan` | Formulates structured autonomous mission | `{"goal": "Organize study schedule"}` |
| `GET` | `/api/missions/{id}` | Fetches mission status and steps | None |
| `PUT` | `/api/missions/{id}/steps` | Edits or reorders mission steps | `{"steps": [...]}` |
| `POST` | `/api/missions/{id}/approve` | Approves and executes mission steps | None |
| `POST` | `/api/missions/{id}/cancel` | Halts in-progress mission | None |
| `GET` | `/api/activity/logs` | Real-time audit log of executed tools | None |
| `GET` | `/api/trust-center` | Security policies & registered tools | None |
| `GET` | `/api/memory` | Retrieves stored long-term memories | None |
| `POST` | `/api/memory` | Adds verified fact or routine | `{"content": "Prefers morning focus", "category": "routine"}` |
| `DELETE`| `/api/memory/{id}` | Deletes stored memory | None |
| `POST` | `/api/multimodal/upload` | Uploads document/image for AI analysis | `multipart/form-data (file)` |
| `GET` | `/api/proactive/insights`| Workload conflict recommendations | None |
| `POST` | `/api/what-if/simulate` | Simulates schedule changes in sandbox | `{"scenario_title": "Shift", "modifications": [...]}` |
| `POST` | `/api/what-if/apply` | Commits simulated changes to live tasks | `{"scenario_id": "sim-..."}` |
| `GET` | `/api/devices` | Lists IoT devices and wattage | None |
| `POST` | `/api/device` | Toggles device state | `{"device": "living_room_light", "on": true}` |
| `GET` | `/api/energy` | Real-time total power draw (watts) | None |
| `POST` | `/api/sos/trigger` | Triggers SOS distress broadcast | `{"situation": "Emergency distress", "latitude": 37.77}` |
| `POST` | `/mcp` | FastMCP Streamable HTTP JSON-RPC 2.0 | Standard MCP JSON-RPC payload |

---

## 🎬 End-to-End Hackathon Demonstration Walkthrough

Follow this 5-minute script to demonstrate NOVA's full capabilities to judges:

### Scene 1: Conversational Wake & 8-State Alexa Eye
1. Open `http://127.0.0.1:8000`.
2. Notice the **Alexa Eye** in soft cyan `IDLE` state.
3. Click the microphone icon or type: `"Hello Nova, what are you capable of?"`
4. Watch the eye transition smoothly: `LISTENING` -> `THINKING` (indigo pulse) -> `SPEAKING` (azure ripple).
5. Listen to the natural voice response and review the companion card.

### Scene 2: Autonomous Mission Mode (Formulate -> Review -> Execute)
1. Click the suggested prompt pill: *"Help me plan my week and prepare for my upcoming assignments."*
2. NOVA analyzes deadlines and active memories, decomposes the goal into a 4-step mission, and transitions the Alexa Eye to **`PAUSED` (Awaiting Approval)**.
3. The **Mission Review Card** appears in the UI.
4. Modify any step title directly in the UI (demonstrating human-in-the-loop control).
5. Click **Approve & Execute**.
6. Observe the eye shift to **`EXECUTING` (atomic spin)** while step badges dynamically advance from `Pending` -> `Running` -> `Succeeded`.
7. Notice the new tasks appear in the Planner.

### Scene 3: Multimodal Document Intelligence
1. Click the paperclip icon in the chat bar.
2. Select any syllabus, assignment text file, or screenshot.
3. Click **Send**.
4. NOVA's multimodal engine parses the document with Gemini Vision, extracts key deadlines, highlights deliverables, and offers a single-click **+ Add to Tasks** action.

### Scene 4: Observable Tool Registry & Trust Center
1. Click **Activity & Trust Center** in the navigation sidebar.
2. Point out the chronological audit trail:
   * Tool names and caller IDs.
   * Execution durations in milliseconds.
   * Input arguments sanitized for privacy.
   * Postcondition verification checkmarks.
3. Highlight that **100% of API keys remain strictly server-side**.

### Scene 5: What-If Simulator & Proactive Insights
1. Click **Proactive Insights** to see detected deadline congestions.
2. Open the **What-If Simulator**.
3. Shift a heavy assignment by 2 days in the sandbox.
4. Review the trade-off analysis showing reduced workload strain before committing the change.

### Scene 6: IoT Smart Home & Emergency Guardian
1. Say or type: `"Turn off the living room light and check my energy usage."`
2. Observe the device card toggle immediately and total household wattage decrease.
3. Click the **Emergency SOS** shield button.
4. Observe the emergency siren trigger, live GPS capture, and emergency dispatch broadcast card.

---

## 📱 Mobile Android Companion Architecture

The repository includes a production-grade native Android service in [`mobile_android/`](file:///c:/Users/APURVA/OneDrive/Documents/Desktop/Alexa/mobile_android):

* **`NovaForegroundService.kt`**:
  * Implements a sticky Android Foreground Service with continuous notification.
  * Uses Google Play Services `FusedLocationProviderClient` to sync live GPS coordinates with `/api/location/update`.
  * Monitors application foreground time via `UsageStatsManager` to enforce digital wellbeing limits.
  * Dispatches emergency SMS via `SmsManager` and triggers automated phone calls to emergency services.
* **`AndroidManifest_Snippet.xml`**:
  * Contains the necessary Android permissions: `ACCESS_FINE_LOCATION`, `PACKAGE_USAGE_STATS`, `SEND_SMS`, `CALL_PHONE`, `FOREGROUND_SERVICE_LOCATION`.

---

## 🛡️ Safety, Privacy & Ethical Disclosures

* **Zero Client-Side Secret Leakage:** No API keys or tokens are ever sent to the browser or client applications.
* **Deterministic Fallback:** If internet access or API quotas are interrupted, NOVA gracefully switches to its local deterministic engine without crashing.
* **Simulated Hardware:** Smart-home device relays and power draws are mathematically modeled for demonstration safety.
* **Emergency Dispatch:** Emergency SOS calls and SMS alerts are simulated in software with real 112 dialing hooks provided.

---

## 👥 Hackathon Team & Acknowledgements

* **Developed for:** Next-Gen AI Assistant Hackathon
* **Technologies:** Google Gemini 3.8 Flash, FastAPI, FastMCP (Model Context Protocol), SQLite, TailwindCSS, Lucide, Leaflet
* **License:** [MIT License](LICENSE)
