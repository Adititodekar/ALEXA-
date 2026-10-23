# 🏆 NOVA AI (Alexa-Next 2.0) — Hackathon Submission Dossier

> **Project Name:** NOVA AI (Alexa-Next 2.0)  
> **Tagline:** Autonomous Multimodal Web Assistant, Life Guardian & IoT Companion  
> **Repository:** [https://github.com/Adititodekar/ALEXA-](https://github.com/Adititodekar/ALEXA-)  
> **Primary Technologies:** Google Gemini 3.8 Flash, Multi-LLM Fallback (OpenAI & Groq/Llama 3.3), FastMCP (Model Context Protocol 2025-11-25 Streamable HTTP), FastAPI, SQLite3, TailwindCSS, Web Speech API, Leaflet Maps, Kotlin (Android Foreground Service)  
> **Test Status:** 12/12 Automated Integration Tests Passing  

---

## 🎯 1. Elevator Pitch

**NOVA AI** re-engineers the smart assistant experience from a passive, single-turn query answering box into an **autonomous, proactive, and multimodal personal agent**. NOVA doesn't just answer questions—it formulates multi-step executable plans with human-in-the-loop review, extracts commitments from natural speech to schedule proactive alerts, exposes an interoperable FastMCP server over Streamable HTTP, controls IoT smart-home appliances with real wattage math, and protects user wellbeing through an Emergency SOS Guardian and screen time enforcement.

---

## 💡 2. Inspiration & Problem Statement

Current commercial voice assistants (legacy Alexa, Siri, Google Assistant) are stuck in 2015:
1. **Single-Turn Passivity:** They cannot plan, break down goals, or execute multi-stage tasks.
2. **Hallucinated Tool Calls:** Commercial voice assistants lack transparent auditing; users cannot inspect what tools ran, what latency was incurred, or whether postconditions were verified.
3. **Severe Contextual Amnesia:** They do not maintain a persistent, user-controlled digital twin or remember commitments made during casual conversations.
4. **No Visual Multimodal Intelligence:** They cannot parse assignment PDFs, lecture slides, or schedule screenshots into actionable calendars.

**Our Mission:** Build the true "Alexa 2.0"—an assistant that is autonomous yet verifiable, proactive yet privacy-first, multimodal yet lightweight, and fully interoperable via standard open protocols like FastMCP.

---

## ✨ 3. What It Does: Core Capabilities

### 🚀 Autonomous Mission Mode (Signature Feature)
* **Natural Language Goal Decomposition:** Converts goals like *"Help me organize my week, prepare for my midterm assignments, identify conflicts, and create a study plan"* into a structured, sequential mission plan.
* **Human-in-the-Loop Review:** Users can edit step titles, reorder steps, or delete unnecessary steps before authorizing execution.
* **Consequential Approval Gates:** Destructive or consequential actions require explicit user confirmation.
* **Bounded Retries & Verification:** Steps are verified upon completion with visual checkmarks and error recovery.
* **Full SQLite Persistence:** Missions survive server restarts and browser refreshes.

### 🔌 Model Context Protocol (FastMCP) Compliance
* Full compliance with the official **MCP specification (v1.30+ / spec 2025-11-25)** over **Streamable HTTP transport**.
* Mounted directly at `http://127.0.0.1:8000/mcp` for agent-to-agent tool sharing.
* Real smart-home tools exposed: `list_devices`, `set_device_state`, `get_energy_summary`, `get_saving_tips`.

### 👁️ Authentic 8-State Animated Alexa Eye
A dynamic, reactive cybernetic visualizer with 8 distinct visual and acoustic states:
`IDLE` (soft cyan breathing), `LISTENING` (acoustic waveform), `THINKING` (orbiting indigo pulse), `SPEAKING` (azure ripple), `EXECUTING` (fast atomic spin), `SUCCESS` (emerald glow), `ERROR` (crimson strobe), and `PAUSED` (golden review orbit).

### 🗓️ Conversation Commitment & Deadline Scanner
* Extracts dated commitments directly from casual chat (*"I have to submit my AI assignment tomorrow by 5 PM"*).
* Automatically schedules a proactive alert exactly 1 hour before every recorded deadline.
* Features a 1-click **Conversation History Scanner** that analyzes the last 24 hours of multi-turn dialogue to recover commitments.

### 🧠 User-Controlled Long-Term Memory (Digital Twin)
* Persistent SQLite memory storing confirmed user facts, routines, preferences, and project context.
* Complete user sovereignty: Search, Pin, Edit, Delete, Clear All, and a global master toggle to enable or disable memory injection.

### 📄 Multimodal Vision & Document Parsing
* Analyzes course syllabi, assignment PDFs, images, and text notes using Gemini Vision.
* Automatically extracts deliverables, due dates, and grading weights, offering a 1-click **+ Add to Tasks** button.

### ⚡ Proactive Conflict Detection & What-If Simulator
* Scans task density to flag overloaded days and overlapping deadlines before they happen.
* Features an isolated **What-If Sandbox** allowing users to simulate shifting deadlines and review workload trade-offs before committing changes.

### 🏡 Smart Home IoT & Real Wattage Math
* Real-time controls for household appliances with mathematical power draw modeling (watts) and energy-saving tips.

### 🌅 Executive Daily Briefing, Music & Alarms
* Synthesizes weather, pending deadlines, power draw, and live Google News RSS headlines into a spoken morning briefing.
* Integrated audio player and smart alarm/timer engine.

### 🚨 Emergency SOS Guardian & Live Geolocation
* High-decibel Web Audio synthesizer siren, live GPS location capture, reverse geocoding via OpenStreetMap, turn-by-turn routing via OSRM, and automated emergency dispatch simulation.

---

## 🛠️ 4. How We Built It: Technical Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Framework** | Python 3.10+, FastAPI (Asynchronous REST API Gateway), Uvicorn |
| **Model Context Protocol** | FastMCP (Streamable HTTP Session Manager, JSON-RPC 2.0, spec 2025-11-25) |
| **AI / Multi-LLM Engine** | Google Gemini 3.8 Flash (Primary), OpenAI GPT-4o (Fallback), Groq Llama 3.3-70B (OpenAI Compatible), Deterministic Local Intent Engine |
| **Database & Persistence** | SQLite3 (`nova_planner.db`) with automatic non-destructive schema migrations |
| **Frontend Dashboard** | Vanilla HTML5/CSS3/JavaScript, Tailwind CSS, Lucide Icons, Leaflet Maps, Web Speech API, Web Audio API |
| **Mobile Companion** | Android Kotlin (`NovaForegroundService.kt`), `FusedLocationProviderClient`, `UsageStatsManager`, `SmsManager` |
| **Automated Testing** | Python `unittest` suite (12/12 integration and unit tests passing) |

---

## 🧗 5. Challenges We Ran Into & How We Overcame Them

1. **FastMCP Transport in Modern Web Environments:**
   * *Challenge:* The latest Model Context Protocol specification recommends Streamable HTTP transport, requiring proper session lifecycle management and CORS header validation.
   * *Solution:* Implemented FastAPI lifespan context manager running `mcp.session_manager.run()` with configurable transport security allowed hosts, mounting it seamlessly alongside standard REST endpoints at `/mcp`.

2. **Preventing AI Hallucinations in Task Scheduling:**
   * *Challenge:* LLMs frequently hallucinate deadlines or invent arbitrary dates when users mention time phrases.
   * *Solution:* Built a dual-layer regex and natural language date parser (`_parse_deadline_datetime`) with reference time anchoring, strict ISO/named-month extraction, and negative filters to guarantee only explicit commitments are recorded.

3. **Quota & Connectivity Resilience:**
   * *Challenge:* Free tier API quotas can be exhausted or connectivity interrupted during hackathon judging.
   * *Solution:* Engineered a graceful multi-provider fallback hierarchy (`Gemini` $\rightarrow$ `OpenAI` $\rightarrow$ `Groq/Llama` $\rightarrow$ `Offline Deterministic Engine`). If HTTP 429 occurs, NOVA handles it gracefully without a single crash.

4. **Zero Client-Side Secret Leakage:**
   * *Challenge:* Ensuring complete security for API keys and user privacy.
   * *Solution:* 100% of API keys stay strictly server-side in `.env`. Tool argument logs in the Trust Center are sanitized to mask credentials and sensitive data.

---

## 🏅 6. Accomplishments That We're Proud Of

- ✅ **Full Model Context Protocol (FastMCP) Compliance:** Truly interoperable with external agents over standard Streamable HTTP transport.
- ✅ **12/12 Automated Tests Passing:** Robust automated test suite verifying everything from health checks to mission execution, memory CRUD, and what-if simulation in under 2.5 seconds.
- ✅ **Authentic 8-State Animated Alexa Eye:** Fluid cybernetic visualizer with smooth canvas and CSS state transitions.
- ✅ **Non-Destructive What-If Simulation:** True sandbox modeling of schedule density before modifying live production databases.
- ✅ **Native Android Companion Service:** Complete production-grade Kotlin foreground service demonstrating cross-platform mobile synchronization.

---

## 📈 7. What's Next for Nova AI

1. **Hardware Smart Speaker Enclosure:** Porting the runtime to a Raspberry Pi 5 with a custom circular OLED display running the 8-state Animated Alexa Eye.
2. **Local SLM Integration:** Embedding quantised on-device models (e.g. Gemma 2B / Llama 3.2 1B via ONNX Runtime / llama.cpp) for 100% offline edge privacy.
3. **Matter & Zigbee IoT Gateway:** Bridging the FastMCP server directly to physical Matter-enabled household smart devices.

---

## ⚖️ 8. Judging Criteria Alignment Matrix

| Hackathon Criteria | NOVA AI Implementation & Evidence |
| :--- | :--- |
| **Technical Complexity & Architecture** | Multi-LLM fallback chain, FastMCP Streamable HTTP implementation, SQLite schema migrations, asynchronous FastAPI server, Android Kotlin foreground service. |
| **Innovation & Originality** | Autonomous Mission Mode with human-in-the-loop step editing, conversation commitment scanner, what-if schedule trade-off simulator, and 8-state dynamic visual eye. |
| **User Experience & Polish** | Cyber-clean 3-panel glassmorphism dashboard, dynamic voice waveforms, zero-lag Web Audio synthesis, interactive Leaflet GPS mapping, and responsive controls. |
| **Safety, Trust & Ethics** | Dedicated Trust Center, 100% server-side secret isolation, sanitized tool audit logging, user-controlled memory deletion, and emergency distress safety protocol. |
| **Completeness & Execution** | Zero build steps required (`python run.py`), 12/12 automated tests passing, comprehensive documentation, and instant runnable demo. |
