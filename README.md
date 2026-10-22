# 🌟 NOVA AI — ALEXA-NEXT 2.0: Autonomous Multimodal Web Assistant

An advanced, multimodal, voice-interactive personal AI assistant inspired by the conversational experience of **Amazon Alexa+**, enhanced with **Autonomous Mission Mode**, genuine **MCP tool execution**, an authentic **8-state Animated Alexa Eye**, real-time **multimodal vision & document analysis**, **user-controlled persistent memory**, **proactive conflict auditing**, **what-if schedule simulation**, and **emergency SOS guardian protection**.

---

## 🏆 Key Architectural Pillars

* **Autonomous Mission Mode (Signature Feature):**
  * Formulates multi-step executable plans from high-level natural language goals.
  * Interactive Plan Review in UI: users can inspect, edit step titles, reorder, or delete steps.
  * Approval gates before state-changing or consequential operations.
  * Bounded retry recovery and postcondition verification for every step.
  * Complete persistence in SQLite (`missions` & `mission_steps`), surviving browser refreshes and restarts.

* **Model Context Protocol (MCP) Compliance (Route A):**
  * Implements MCP specification (v1.30+ / spec 2025-11-25) over **Streamable HTTP transport**.
  * Mounted live at `http://127.0.0.1:8000/mcp/` or runnable standalone via `python -m server.app`.
  * Verified tools: `list_devices`, `set_device_state`, `get_energy_summary`, `get_saving_tips`.

* **Simulated Alexa+ Multimodal Experience (Route B):**
  * 3-panel dashboard (Navigation Sidebar, Main Conversation & Mission View, Command Center).
  * Authentic **8-State Animated Alexa Eye** (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `EXECUTING`, `SUCCESS`, `ERROR`, `PAUSED`).
  * Google **Gemini 3.8 Flash** with multi-turn memory, multimodal vision (PNG/JPG/PDF/TXT), and seamless offline fallback.

* **Observable Tool Registry & Trust Center:**
  * Typed tool registry with validation, permission levels (`read_only` vs `state_changing`), sanitized activity logs, and postcondition verification.
  * Trust Center auditing: 100% of API keys stay strictly server-side.

* **User-Controlled Persistent Memory & Digital Twin:**
  * Persistent SQLite storage for confirmed facts, routines, preferences, and project context.
  * Full user control: Search, Pin, Edit, Delete, Clear All, and Enable/Disable toggle.

---

## 🛠️ Repository Modules & Entry Points

```
ALEXA-/
├── app.py                      # Main FastAPI server (REST APIs, static UI & FastMCP mount)
├── run.py                      # One-click launcher (starts server + opens browser)
├── requirements.txt            # Unified project dependencies
├── .env.example                # Safe environment variable template
├── .env                        # Local secrets (ignored by Git)
├── core/
│   ├── brain.py                # Central AI orchestrator & intent router
│   ├── database.py             # SQLite persistence manager & non-destructive migrations
│   ├── mission_engine.py       # Autonomous Mission planner, step editor & executor
│   ├── tool_registry.py        # Typed tool registry, validation & audit logging
│   ├── memory_manager.py       # Persistent user-controlled memory (Facts & Twin)
│   ├── multimodal_service.py   # Document parsing, image vision, & task proposer
│   ├── proactive_engine.py     # Workload conflict detector & explainable recommendations
│   ├── what_if_simulator.py    # Non-destructive scenario tester & trade-off analyzer
│   ├── skill_builder.py        # Reusable natural language routines
│   ├── reminder_service.py     # Scheduled automation & reminder tracker
│   ├── conversation_manager.py # Multi-turn persistent chat threads
│   ├── smart_home.py           # Persistent IoT device hub & wattage calculations
│   ├── planner.py              # Task & deadline engine with conflict detection
│   ├── location_service.py     # Geolocation, reverse geocoding & OSRM routing
│   ├── media_service.py        # Live Wikipedia data & verified media links
│   ├── wellbeing_tracker.py    # Screen time & focus mode engine
│   └── emergency_guardian.py   # Emergency SOS dispatcher & siren audio
├── server/
│   ├── app.py                  # Standalone FastMCP server over Streamable HTTP
│   └── web_api.py              # Standalone API endpoints
├── static/
│   ├── index.html              # 3-Panel glassmorphism companion dashboard
│   ├── style.css               # 8-state Animated Alexa Eye & cyber-clean dark theme
│   └── app.js                  # Speech recognition, audio synth siren, map, & missions
├── tests/
│   └── test_nova.py            # Automated 10-point test suite (unit + integration)
└── data/
    ├── nova_planner.db         # Persistent SQLite database
    └── uploads/                # Safe directory for uploaded assignment files
```

---

## 🏃 Quick Start Guide

### 1. Prerequisites
* Python 3.10+ (tested on Python 3.12)
* Modern web browser (Chrome, Edge, Firefox, Safari)
* Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) *(optional — offline conversational fallback active if unconfigured)*

### 2. Environment Setup
1. Clone or open the repository.
2. Copy the configuration template:
   ```bash
   cp .env.example .env
   ```
3. Add your Gemini key to `.env`:
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
* The FastMCP Streamable HTTP server is available at **`http://127.0.0.1:8000/mcp/`**.
* The Health check endpoint is at **`http://127.0.0.1:8000/api/health`**.

---

## 🧪 Testing and Verification

Run the automated test suite verifying all 10 core capabilities (health, missions, tool registry, memory CRUD, task conflicts, uploads, IoT persistence, proactive insights, what-if simulator):

```bash
python -m unittest tests/test_nova.py
```

Expected result:
```
Ran 10 tests in ~12s
OK
```

---

## 📡 Live API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Diagnostic status (Gemini active, MCP active, missions ready) |
| `POST` | `/api/chat` | Conversational voice/text processor and intent router |
| `POST` | `/api/missions/plan` | Creates structured multi-step autonomous mission plan |
| `GET` | `/api/missions/{id}` | Retrieves full mission details, steps, and progress |
| `PUT` | `/api/missions/{id}/steps` | Edits or reorders mission steps prior to execution |
| `POST` | `/api/missions/{id}/approve` | Triggers sequential execution of approved mission steps |
| `POST` | `/api/missions/{id}/cancel` | Halts active or pending autonomous mission |
| `GET` | `/api/activity/logs` | Real-time observable timeline of tool calls and verifications |
| `GET` | `/api/trust-center` | Trust Center policies, registered tools, and permissions |
| `GET` | `/api/memory` | Retrieves persistent user memories and preferences |
| `POST` | `/api/memory` | Saves confirmed fact or routine to persistent memory |
| `DELETE` | `/api/memory/{id}` | Deletes a stored memory |
| `POST` | `/api/multimodal/upload` | Uploads and analyzes PDF/image/doc with Gemini vision |
| `GET` | `/api/proactive/insights` | Generates explainable workload and conflict recommendations |
| `POST` | `/api/what-if/simulate` | Evaluates schedule adjustments on cloned task data |
| `POST` | `/api/what-if/apply` | Applies approved schedule scenario to live tasks |
| `GET` | `/api/devices` | Lists smart-home IoT appliances and power states |
| `POST` | `/api/device` | Toggles device state (`{"device": "living_room_light", "on": true}`) |
| `GET` | `/api/energy` | Returns current household power draw in watts |
| `POST` | `/api/sos/trigger` | Triggers emergency distress broadcast with live GPS |
| `POST` | `/mcp/` | FastMCP Streamable HTTP JSON-RPC 2.0 endpoint |

---

## 🎬 Required End-to-End Demonstration Script

Follow this sequence to demonstrate NOVA's full autonomous agent workflow:

1. **Mission Goal Formulation:**
   * Open the dashboard at `http://127.0.0.1:8000`.
   * Click the suggestion pill: *"Help me plan my week and prepare for my upcoming assignments."*
   * Observe NOVA analyzing deadlines and memories, switching the Alexa Eye to **Paused (Awaiting Approval)**, and displaying the **Autonomous Mission Review Card**.

2. **Plan Review & User Approval:**
   * Inspect the editable steps. You can modify any step title or remove steps.
   * Click **Approve & Execute**.
   * Observe the Alexa Eye transition into **Executing (amber/cyan atomic spin)**.
   * Watch the step badges advance in real time: `Pending` -> `Running` -> `Succeeded`.
   * Observe the completion summary report and verified tasks added to the SQLite database.

3. **Multimodal Document Upload:**
   * Click the paperclip icon in the chat bar and attach an assignment brief, syllabus, or screenshot.
   * Click Send.
   * Observe NOVA extract the core summary, detect specific deadlines, and propose tasks with a **+ Add to Tasks** button.

4. **Observable Trust Center & Activity Inspector:**
   * Click **Activity & Trust Center** in the left sidebar.
   * Inspect the chronological audit log showing tool names, execution durations in milliseconds, sanitized arguments, and postcondition verification checkmarks.

5. **Persistence Verification:**
   * Refresh the browser or restart the server.
   * Confirm that all created tasks, memories, conversation threads, and smart-home states persist without data loss.

---

## 🔍 Hardware & Simulation Disclosure

* **Smart-Home Appliances:** Device relays (lights, fans, TVs, AC) and power loads are simulated with realistic wattage math in `core/smart_home.py` and persisted in SQLite.
* **Emergency Dispatch:** Emergency SOS distress calls simulate SMS and phone transmission; personal contact entries and direct `112` dialing links are provided.
* **Digital Wellbeing:** App limits and focus mode reflect browser-accessible metrics and user-configured goals.
