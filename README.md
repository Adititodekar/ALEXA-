# 🌟 NOVA AI — ALEXA-NEXT 2.0
<<<<<<< HEAD
### Autonomous Multimodal Web Assistant, Life Guardian & IoT Companion
**Built for the [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/) — Track: Alexa+ (Agentic Experiences & Self-Hosted MCP)**

[![Amazon Developer Hackathon](https://img.shields.io/badge/Amazon_Developer_Hackathon-Build%2C_Ship%2C_Shape_2026-FF9900.svg?logo=amazon&logoColor=white)](https://amazonappdev2026.devpost.com/)
[![Track: Alexa+](https://img.shields.io/badge/Track-Alexa%2B_Agentic_%26_MCP-8A2BE2.svg)](https://amazonappdev2026.devpost.com/)
[![FastMCP Spec](https://img.shields.io/badge/FastMCP-Streamable_HTTP_2025--11--25-00C7B7.svg)](https://modelcontextprotocol.io/)
[![Multi-LLM Engine](https://img.shields.io/badge/LLM-Gemini_3.8_Flash_%7C_OpenAI_%7C_Groq_Llama-4285F4.svg)](https://aistudio.google.com/)
[![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite3](https://img.shields.io/badge/SQLite3-Persistent_Storage-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-12%2F12_Passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🏆 Amazon Developer Hackathon Alignment: Alexa+ Track

> **Event:** [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/) (Hosted by Amazon Developer on Devpost)  
> **Challenge Track:** **Alexa+** (*"Build agentic experiences, self-hosted MCP (Model Context Protocol) servers, or Agent Skills using the open standards powering Alexa+"*)  
> **Target Amazon Ecosystem:** Amazon Echo, Echo Show (Multimodal Screen Experience), Fire TV, and Fire OS / Android Tablets.

### 🎯 How NOVA Answers Amazon's Hackathon Challenge
Amazon selected the **Model Context Protocol (MCP)** as an open standard for third-party services and agent skills to plug into Alexa+. Because official preview developer toolkits are restricted to select enterprise partners, Amazon challenged hackathon developers to:
1. **Build a Self-Hosted MCP Server** exposing tools over Streamable HTTP transport.
2. **Simulate the Alexa+ Experience** using an agentic web application and companion dashboard.

**NOVA AI directly fulfills this challenge:**
* **Self-Hosted FastMCP Server:** Implements the official MCP specification (2025-11-25) over **Streamable HTTP** at `http://127.0.0.1:8000/mcp`, exposing tools (`list_devices`, `set_device_state`, `get_energy_summary`, `get_saving_tips`).
* **Simulated Alexa+ Multimodal Companion:** Designed for screen-equipped Amazon devices like the **Echo Show** and **Fire Tablets**, pairing an authentic **8-State Animated Alexa Eye** with speech recognition/neural synthesis, interactive mission plan review cards, Leaflet GPS maps, and real-time Trust Center auditing.
* **Agentic Autonomous Mission Mode:** Moves beyond shallow, single-turn voice skills into multi-step goal formulation, human-in-the-loop review, bounded execution, and verified tool postconditions.
* **Fire OS & Ambient Android Companion:** Via [`mobile_android/NovaForegroundService.kt`](file:///c:/Users/APURVA/OneDrive/Documents/Desktop/Alexa/mobile_android), NOVA provides ambient GPS tracking, screen time supervision, and emergency SOS dispatch for Fire OS and Android devices.

---

## 📌 Project Overview & Vision

**NOVA AI (Alexa-Next 2.0)** transforms smart voice assistants from passive command-responders into an **autonomous, proactive, and multimodal personal agent**.

Traditional voice assistants suffer from fundamental limitations:
1. **Shallow Single-Turn Execution:** They answer trivia or set timers, but cannot plan, decompose, or complete complex multi-step objectives.
2. **Hallucinated & Unaudited Tool Calls:** Users have zero visibility into what tools are invoked, whether actions succeeded, or how secrets are handled.
3. **Ephemeral Context & Amnesia:** They forget user routines, critical preferences, and long-term commitments between sessions.
4. **Lack of Proactive Protection:** They wait to be addressed rather than detecting schedule congestion, approaching deadlines, or physical emergencies.

**NOVA AI solves this** by pairing **Google Gemini 3.8 Flash (with Multi-LLM Fallback to OpenAI & Groq Llama 3.3)** with:
* 🚀 **Autonomous Mission Mode:** Multi-step goal formulation, human-in-the-loop review, and verified execution.
* 🔌 **Model Context Protocol (FastMCP 2025-11-25):** Live streamable HTTP transport for agent-to-agent interoperability.
* 👁️ **Authentic 8-State Animated Alexa Eye:** Dynamic cybernetic eye responding to listening, thinking, executing, error, and review states.
* 🗓️ **Conversation-Based Commitment & Deadline Extraction:** Automatically detects explicit dated commitments from natural speech and schedules proactive 1-hour alerts.
* ⚡ **Proactive Conflict Detection & What-If Simulator:** Identifies overloaded workdays and simulates deadline shifts in an isolated sandbox.
* 🧠 **User-Controlled Long-Term Memory (Digital Twin):** Search, pin, edit, delete, and toggle persistent memory injection.
* 📄 **Multimodal Document Intelligence:** Extracts deadlines and deliverables from PDF, TXT, PNG, and JPG uploads.
* 🏡 **Smart Home IoT Hub:** Real mathematical wattage calculation across household appliances.
* 🌅 **Executive Daily Briefing & Media Controller:** Live weather, Google News RSS, music player, and smart alarms.
* 🚨 **Emergency SOS Life Guardian:** Distress siren audio synthesis, live GPS geolocation, OpenStreetMap geocoding, and OSRM route directions.

---

## 🏛️ System Architecture

```mermaid
graph TB
    subgraph Client_Layer [Client & Echo Show Companion]
        UI["Echo Show Companion Dashboard (Tailwind, Lucide, Leaflet)"]
        EYE["8-State Dynamic Animated Alexa Eye"]
        VOICE["Web Speech API & Neural Audio Synthesis"]
        MOOD_UI["Empathetic Mood & Tone Banner"]
        FIRE_OS["Fire OS / Android Background Service (GPS, AppLimits, SOS)"]
    end

    subgraph Server_Gateway [FastAPI Gateway & FastMCP Mount]
        API["FastAPI REST Endpoints (/api/*)"]
        MCP["FastMCP Streamable HTTP Server (/mcp)"]
        STATIC["Native Static Asset Server (/)"]
    end

    subgraph Core_Intelligence [Nova Core AI Engine]
        BRAIN["NovaBrain Orchestrator"]
        GEMINI["Gemini 3.8 Flash (Primary)"]
        OPENAI["OpenAI GPT-4o / GPT-6 (Fallback)"]
        GROQ["Groq Llama 3.3-70B (OpenAI Compatible)"]
        OFFLINE["Deterministic Offline Intent Engine"]
    end

    subgraph Autonomous_Subsystems [Autonomous & Safety Subsystems]
        MISSION["Autonomous Mission Engine (Formulate, Review, Execute)"]
        TOOLS["Observable Tool Registry & Trust Center"]
        MEMORY["Persistent Memory & User Digital Twin"]
        PROACTIVE["Proactive Conflict & Deadline Engine"]
        SIMULATOR["What-If Scenario Simulator"]
        COMMITMENT["Conversation Commitment & Reminder Scanner"]
        SMART_HOME["IoT Device Hub & Wattage Calculations"]
        BRIEFING["Executive Daily Briefing & News RSS"]
        GUARDIAN["Emergency SOS Guardian & Audio Siren"]
        WELLBEING["Screen Time & Focus Limit Supervisor"]
    end

    subgraph Data_Storage [Storage & Persistence]
        DB[(SQLite3: nova_planner.db)]
        UPLOADS["Sanitized Multimodal Document Storage"]
    end

    UI --> API
    UI --> STATIC
    MCP --> TOOLS
    API --> BRAIN
    FIRE_OS --> API
    BRAIN --> GEMINI
    BRAIN --> OPENAI
    BRAIN --> GROQ
    BRAIN --> OFFLINE
    BRAIN --> MISSION
    BRAIN --> TOOLS
    BRAIN --> MEMORY
    BRAIN --> PROACTIVE
    BRAIN --> SIMULATOR
    BRAIN --> COMMITMENT
    BRAIN --> SMART_HOME
    BRAIN --> BRIEFING
    BRAIN --> GUARDIAN
    BRAIN --> WELLBEING
    MISSION --> DB
    MEMORY --> DB
    SMART_HOME --> DB
    PROACTIVE --> DB

### *The Next-Generation Autonomous Multimodal AI Companion & Smart Home Ecosystem*

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![FastMCP](https://img.shields.io/badge/FastMCP-Streamable%20HTTP-FF6B6B?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

<p align="center">
  <b>An authentic, all-in-one conversational web companion inspired by Amazon Alexa+, powered by an interactive 3D Pixar-grade Robot Avatar, Autonomous Mission Planning, Worldwide Live Weather, Real-Time News, Universal Music Streaming with Spotify, and Complete Smart Home IoT Management.</b>
</p>

[✨ Key Features](#-key-features) •
[🏗️ Architecture](#️-system-architecture) •
[🚀 Quick Start](#-quick-start-guide) •
[📡 API Reference](#-live-api-endpoints) •
[🗣️ Voice Cheatsheet](#️-voice--text-commands-cheatsheet) •
[📁 Project Structure](#-repository-structure)

---

</div>

## 📸 Executive Overview

**NOVA AI (Alexa-Next 2.0)** transforms the traditional smart speaker experience into a feature-packed, visual and conversational intelligence platform. Built with a high-performance **FastAPI** backend and an immersive **Three.js** 3D WebGL frontend, NOVA acts as an autonomous digital companion that can converse naturally, execute multi-step missions, stream worldwide music, deliver real-time weather and news, control Alexa ecosystem devices (Fire TV, Ring, Ecobee), and protect users through emergency SOS life safety protocols.

---

## ✨ Key Features

### 🤖 1. Interactive 3D Pixar Companion Avatar & Voice Visualizer
* **Expressive Three.js WebGL Avatar**: Symmetrically rendered 3D companion robot with dual glowing cyan eyes, curved glossy visor, and organic floating physics.
* **Autonomous Gestures**: Natural idle hovering, listening head tilts, thinking orbital pulses, speaking lip-sync glow, and interactive waving motions.
* **Dual Display Modes**: Seamlessly switch between the **3D Robot Avatar** and the classic **8-State Alexa Voice Visualizer** (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `EXECUTING`, `SUCCESS`, `ERROR`, `PAUSED`).

### 🌍 2. Global Live Weather Engine (Any City, Country, or Coordinate)
* **Worldwide High-Resolution Weather**: Instant access to real-time temperature, "feels-like" metrics, atmospheric conditions, humidity, wind velocity, and barometric pressure for **any place on Earth** (e.g., Tokyo, Paris, Canada, Dubai, London, New York).
* **Zero API-Key Requirement**: Powered by Open-Meteo High-Resolution APIs, reverse geocoding, and a robust 50+ destination global offline atlas.
* **Interactive Map Synchronization**: Automatically re-centers the embedded Leaflet radar map with coordinate pins matching requested locations.

### 📰 3. Multi-Platform Real-Time News Network
* **Global Headline Feeds**: Real-time news aggregation from **Google News RSS** and **BBC News**.
* **Pre-Filtered Channels**: One-click category tabs for **🔥 Top News**, **💻 Tech & AI**, **🌍 World**, **📈 Business**, **🚀 Science & Space**, **⚽ Sports**, and **🎬 Entertainment**.
* **Custom Keyword Search**: Spoken and typed news searches for any niche topic (e.g., *"news about artificial intelligence"*, *"latest updates on NASA"*).
* **Audio Executive Briefings**: Synthesizes top headlines, local weather, and calendar commitments into spoken morning bulletins.

### 🎵 4. Universal Music Streaming & Spotify Connectivity
* **Universal Track Search**: Search and play **any song or artist worldwide** simply by asking (*"play Shape of You by Ed Sheeran"*, *"play Believer by Imagine Dragons"*, *"play Taylor Swift"*).
* **Direct In-Browser Playback**: Free high-fidelity audio preview streaming via iTunes Search and Deezer APIs without requiring accounts or keys.
* **1-Click Streaming Bridges**:
  * 🟢 **Spotify App & Web**: Direct deep links (`spotify:search:...` and `open.spotify.com`) to open native Spotify desktop/mobile apps.
  * ▶️ **YouTube Music**: Instant bridge to full albums and official music videos.
* **Mini-Player & Modal Hub**: Persistent bottom player with album art, track scrubbers, volume controls, and trending recommendation chips.

### 💬 5. Complete Conversation Persistence & 4-Way Deletion
* **Permanent SQLite Storage**: Every user prompt, tool execution, and assistant response is reliably recorded in SQLite.
* **Browser Session Restoration**: Refreshing or revisiting the web app automatically reloads your active thread and message history via `localStorage`.
* **Smart Auto-Titling**: Automatically generates clean, human-readable session titles based on the conversation's first query.
* **4-Way Flexible Deletion**:
  1. 🗑️ **Sidebar Hover Delete**: Quick delete icon on individual threads in the "Recent Threads" list.
  2. 💬 **Chat Header Bar**: Direct "Delete" and "Rename" buttons atop the active conversation feed.
  3. ⚠️ **Bulk Wipe**: "Clear All" button to purge all stored conversations in one click.
  4. 🗣️ **Voice/Chat Command**: Say *"delete this conversation"* or *"clear all chats"* for instant voice-activated wiping.

### 📺 6. Amazon Alexa Smart Ecosystem (Fire TV, Ring, Ecobee)
* **Fire TV Remote Hub**: On-screen control simulation for navigation, Play/Pause, volume, app launching (Prime Video, Netflix, YouTube), and power.
* **Ring Video Doorbell**: Live camera stream simulation, 2-way audio toggle, chime triggers, and motion event logs.
* **Ecobee Smart Thermostat**: Real-time ambient temperature adjustment, target setpoints, and eco-mode controls.
* **Simulated IoT Power Grid**: Real-time wattage draw computation and energy-saving tips across lighting, fans, and appliances.

### 🎯 7. Signature Autonomous Mission Mode & MCP Compliance
* **High-Level Goal Decomposition**: Turns broad requests (e.g., *"Help me organize my finals week"*) into structured, sequential executable plans.
* **Interactive Plan Review**: Users can inspect, rename, reorder, or delete steps prior to approval.
* **Execution Gates & Retries**: Approval barriers for sensitive actions with automatic postcondition verification.
* **Model Context Protocol (MCP)**: Native FastMCP JSON-RPC 2.0 compliance over Streamable HTTP (`/mcp/`) for interoperability with external tools.

### 🎮 9. Interactive Gaming Arcade (Instant In-Browser Play)
* **Voice-Activated Gaming**: Simply say *"I want to play any game"*, *"let's play a game"*, *"play snake"*, *"play tic tac toe"*, or *"play trivia"*, and Nova instantly boots up the game right on your screen.
* **4 Instant Arcade Games**:
  1. 🐍 **Cyber Snake Arcade**: Smooth 60 FPS retro canvas snake with neon glow, speed ramps, and on-screen touch D-pad.
  2. ❌⭕ **Nova AI Tic-Tac-Toe**: Interactive 3x3 strategy board against an adaptive Nova AI with score history.
  3. 🧠 **Nova AI Trivia Quiz**: Multi-category knowledge challenge with answer explanations, live score streaks, and timers.
  4. 🚀 **Cosmic Asteroid Dodge**: Fast-paced space fighter arcade with laser blaster and asteroid collisions.
* **Web Audio Sound Effects**: Synthesized laser blips, eating sound effects, and victory chimes without external audio assets.

### 🚨 8. Life Safety & Emergency Guardian
* **Distress Intent Detection**: Automatically identifies distress keywords (*"help me"*, *"emergency"*, *"call ambulance"*).
* **Instant GPS Broadcast**: Dispatches exact GPS coordinates, reverse-geocoded physical address, and situation details.
* **Synthetic Alarm Siren**: Triggers urgent audio sirens in the browser and provides one-click emergency contact dispatch.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User([👤 User / Voice & Text]) --> UI[🖥️ Glassmorphism Web Dashboard]
    UI --> Avatar[🤖 Three.js 3D Robot Avatar]
    UI --> Audio[🔊 HTML5 Audio Player & SpeechSynth]
    UI --> REST[🌐 FastAPI Application Server]

    subgraph Backend Core Engine
        REST --> Brain[🧠 NovaBrain Orchestrator]
        Brain --> Mood[💓 Mood & Distress Engine]
        Brain --> Mission[🎯 Autonomous Mission Planner]
        Brain --> Weather[⛅ Weather Service]
        Brain --> Music[🎵 Music & Streaming Hub]
        Brain --> News[📰 Live News Platform Engine]
        Brain --> AlexaEco[📺 Alexa Devices - Fire TV, Ring, Ecobee]
        Brain --> SmartHome[💡 Smart Home IoT Engine]
        Brain --> Alarms[⏰ Smart Alarms & Reminder System]
        Brain --> ConvMgr[💬 Multi-Turn Conversation Manager]
        Brain --> Gemini[✨ Google Gemini 3.8 Flash / Offline LLM]
    end

    subgraph External & Live Integrations
        Weather --> OpenMeteo[🌍 Open-Meteo & Reverse Geocoding]
        Music --> iTunes[🍏 iTunes Catalog & Direct Streams]
        Music --> Deezer[🎶 Deezer Search API]
        Music --> Spotify[🟢 Spotify Deep Links]
        Music --> YouTube[▶️ YouTube Music]
        News --> GoogleNews[📰 Google News RSS Feeds]
        News --> BBC[📡 BBC News Feeds]
    end

    subgraph Storage & Protocol Layer
        REST --> MCP[⚡ FastMCP Streamable HTTP Server]
        ConvMgr --> DB[(🗄️ SQLite Database - WAL Mode)]
        Mission --> DB
        SmartHome --> DB
    end

```

---


## 🏆 Implemented Features & Technical Deep Dive

### 1. 🚀 Autonomous Mission Mode
* **Goal Decomposition:** Deconstructs complex user prompts (e.g., *"Help me organize my week, prepare for my assignments, identify deadline conflicts, and create a realistic study schedule"*) into verifiable, sequential subtasks.
* **Interactive Plan Review & Human-in-the-Loop:** Renders plans as editable cards on screen where users can rename steps, delete steps, or reorder them before execution.
* **Consequential Approval Gates:** Requires explicit user authorization before state-changing or high-impact actions.
* **Resilient Bounded Execution:** Each step features bounded retries, execution verification checkmarks, and fallback recovery.
* **Full Persistence:** Missions and steps survive browser reloads and server restarts in SQLite (`missions` and `mission_steps`).

### 2. 🔌 Model Context Protocol (FastMCP) Compliance
* Implements the **Model Context Protocol (v1.30+ / spec 2025-11-25)** over **Streamable HTTP transport**.
* Mounted directly at `http://127.0.0.1:8000/mcp` for agent-to-agent interoperability.
* Verified callable tools: `list_devices`, `set_device_state`, `get_energy_summary`, `get_saving_tips`.
* Can also be run standalone via `python -m server.app`.

### 3. 👁️ Authentic 8-State Animated Alexa Eye
A dynamic, reactive cybernetic eye visualizer rendered in CSS & Canvas responding to assistant state:
| State | Visual Appearance | Trigger & Assistant Lifecycle |
| :--- | :--- | :--- |
| `IDLE` | Soft Cyan Ambient Breathing | Standby mode waiting for voice/text wake |
| `LISTENING` | Deep Cyan Acoustic Waveform | Active microphone capturing user input |
| `THINKING` | Deep Indigo Orbiting Pulse | Multimodal reasoning & query parsing |
| `SPEAKING` | Bright Azure Audio Ripple | Speech synthesis actively outputting audio |
| `EXECUTING` | Fast Amber / Cyan Atomic Spin | Autonomous Mission or tool execution in flight |
| `SUCCESS` | Emerald Green Ring Glow | Completed action / verified tool postcondition |
| `ERROR` | Crimson Red Strobe Alert | Failed tool call or validation rejection |
| `PAUSED` | Golden Amber Orbit | Human-in-the-loop plan review awaiting user approval |

### 4. 🗓️ Conversation Commitment Scanner & Automatic Deadlines
* **Explicit Date Parsing:** Recognizes natural language timestamps without hallucinating dates ("tomorrow at 4pm", "next Monday", "in 3 days", "Oct 27 at 18:00").
* **Commitment Extraction:** Analyzes spoken promises (*"I need to submit my physics assignment tomorrow by 5 PM"*) and registers them in the planner.
* **Proactive 1-Hour Alerts:** Automatically schedules a persistent alert 1 hour before every recorded deadline.
* **Conversation History Scanner:** Scans the last 24 hours of multi-turn conversation threads to unearth forgotten commitments with a single click.

### 5. 🧠 User-Controlled Persistent Memory & Digital Twin
* Long-term memory stored in SQLite (`user_memories`), preserved across reboots.
* Captures user routines, pinned preferences, work rhythms, and project context.
* **User Sovereignty:** Full CRUD support in the UI — Search, Pin, Edit, Delete, Clear All, and an instant Master Toggle to enable/disable memory injection.

### 6. 📄 Multimodal Document & Vision Intelligence
* Upload assignment briefs, course syllabi, screenshots, or receipts (`.pdf`, `.png`, `.jpg`, `.txt`).
* Gemini Vision extracts deadlines, course codes, deliverables, and assignment weights.
* Automatically proposes formatted tasks with single-click **+ Add to Tasks** integration.

### 7. ⚡ Proactive Conflict Detection & What-If Simulator
* **Conflict Auditing:** Detects overlapping submission deadlines and overloaded study days before they happen.
* **Explainable Recommendations:** Explains *why* a conflict occurs and proposes balanced redistributions.
* **What-If Sandbox:** Clones live task data into an isolated sandbox to test shifting deadlines without altering production tasks. Once satisfied, apply changes with one click.

### 8. 🏡 Smart Home IoT & Real Wattage Math
* Real-time controls for simulated household appliances (living room light, study lamp, bedroom fan, television, AC).
* Mathematical energy modeling computing live power draw (watts) and cost efficiency tips.
* State changes persist across restarts in SQLite.

### 9. 🌅 Executive Daily Briefing, Music & Alarms
* Synthesizes an executive daily briefing combining local weather (OpenWeatherMap), pending tasks, smart home power load, and top Google News RSS headlines.
* Built-in audio player with playlist control (Play, Pause, Next, Previous).
* Alarms and countdown timers with recurring daily schedule support.

### 10. 🚨 Emergency SOS Guardian & Live Geolocation
* One-click distress trigger or voice-activated emergency panic response.
* High-decibel audio siren playback generated via Web Audio API.
* Live GPS location tracking, reverse geocoding via OpenStreetMap Nominatim, and turn-by-turn routing via OSRM.
* Dispatches simulated emergency broadcasts with live coordinates and direct `112` links.

---

## 📂 Repository Structure

```
ALEXA/
├── app.py                      # Main FastAPI application (REST APIs, static UI & FastMCP mount)
├── run.py                      # One-click launcher (starts server + opens companion dashboard)
├── requirements.txt            # Unified project dependencies
├── .env.example                # Safe multi-provider environment template
├── .env                        # Local secrets (ignored by Git)
├── .gitignore                  # Git hygiene configuration
├── LICENSE                     # Official MIT Open Source License
├── SUBMISSION.md               # Dedicated Hackathon Submission Dossier for Judges
├── core/                       # Core backend logic & services
│   ├── brain.py                # Multi-LLM reasoner, intent router & deadline extractor
│   ├── conversation_engine.py  # Multi-turn conversational handler & Gemini integration
│   ├── conversation_manager.py # Multi-session persistent chat thread history
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
├── static/                     # High-performance Echo Show style companion dashboard
│   ├── index.html              # 3-Panel glassmorphism companion dashboard
│   ├── style.css               # 8-state Animated Alexa Eye & cyber-clean dark theme
│   └── app.js                  # Speech recognition, audio synth siren, map, & missions
├── frontend/                   # Optional React + Vite UI (proxies to FastAPI on :8000)
├── mobile_android/             # Fire OS / Android companion reference implementation
│   ├── AndroidManifest_Snippet.xml # Permissions for GPS, SMS & UsageStats
│   └── NovaForegroundService.kt    # Kotlin background service for GPS & Screen Time
├── tests/
│   └── test_nova.py            # Automated 12-point test suite (unit + integration)
└── data/
    ├── nova_planner.db         # Persistent SQLite database (auto-created)
    └── uploads/                # Clean upload directory for multimodal files (.gitkeep)

## 📁 Repository Structure

```
ALEXA-/
├── app.py                      # Main FastAPI application & REST endpoint router
├── run.py                      # One-click launcher (initializes server + launches browser)
├── requirements.txt            # Unified project Python dependencies
├── .env.example                # Configuration template
├── .env                        # Local API credentials & environment variables
│
├── core/
│   ├── brain.py                # Cognitive AI intent router & natural language processor
│   ├── database.py             # SQLite connection pool, schema, & auto-migrations
│   ├── conversation_manager.py # Persistent multi-turn chat threads & deletion manager
│   ├── conversation_engine.py  # Conversational dialogue synthesis & fallback engine
│   ├── weather_service.py      # Global Open-Meteo weather engine & city geocoder
│   ├── music_service.py        # Universal music search, stream player & Spotify bridges
│   ├── news_service.py         # Multi-platform Google News & BBC headline engine
│   ├── alexa_devices.py        # Fire TV, Ring Video Doorbell & Ecobee device controllers
│   ├── mission_engine.py       # Autonomous multi-step goal planner & step executor
│   ├── tool_registry.py        # Typed MCP tool registry, permission gates & audit logger
│   ├── smart_home.py           # IoT device simulator with realistic wattage math
│   ├── emergency_guardian.py   # Distress detection, GPS dispatcher & siren generator
│   ├── alarm_timer_service.py  # Smart countdown timers and morning alarms
│   ├── reminder_service.py     # Background deadline detector & audible alert daemon
│   ├── planner.py              # Task priority tracker & schedule conflict engine
│   ├── location_service.py     # Geolocation tracking & OSRM routing client
│   ├── media_service.py        # Wikipedia knowledge & media link fetcher
│   ├── memory_manager.py       # Persistent user facts & digital twin manager
│   ├── proactive_engine.py     # Workload conflict detector & intelligent recommendations
│   ├── what_if_simulator.py    # Non-destructive sandbox schedule simulator
│   ├── wellbeing_tracker.py    # Screen time limiter & focus mode engine
│   ├── mood_engine.py          # Conversational sentiment & crisis detector
│   └── skill_builder.py        # Natural language routine builder
│
├── server/
│   ├── app.py                  # Standalone FastMCP Streamable HTTP JSON-RPC 2.0 server
│   └── web_api.py              # Standalone web routes
│
├── static/
│   ├── index.html              # 3-Panel glassmorphism companion dashboard
│   ├── style.css               # Futuristic cyber-dark theme & animations
│   ├── avatar-3d.js            # Three.js 3D Pixar Robot Avatar engine
│   ├── app.js                  # Frontend client, speech recognition & state sync
│   └── three.min.js            # Offline Three.js r128 3D library
│
├── tests/
│   └── test_nova.py            # Comprehensive 10-point unit and integration test suite
│
└── data/
    ├── nova_planner.db         # Persistent SQLite database (auto-created)
    └── uploads/                # Safe folder for uploaded assignment documents

```

---

## 🚀 Quick Start Guide

### 1. Prerequisites

* **Python:** Version `3.10` or higher (`3.11` / `3.12` recommended)
* **Web Browser:** Any modern browser (Google Chrome, Microsoft Edge, Firefox, Brave, Safari)
* **API Key:** Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). *(Optional — offline conversational fallback active if unconfigured)*

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
Copy the configuration template:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

* **Python 3.10+** (Tested on Python 3.11 & 3.12)
* Any modern web browser (**Chrome**, **Edge**, **Firefox**, **Brave**, **Safari**)
* *(Optional)* A free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/apikey) *(NOVA runs in built-in offline conversational mode if unconfigured)*

### 2. Installation

1. **Clone or navigate into the project directory:**
   ```bash
   cd d:\Transfer@GR\VS_Code\Alexa+\ALEXA-
   ```

2. **Set up a Python Virtual Environment:**
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and add your keys (optional):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.5-flash
   ```

### 3. Launching NOVA AI

Start the application with the one-click launcher:

```bash
cp .env.example .env
```

Open `.env` and configure credentials:
```env
# Choose provider: gemini, openai, or compatible (Groq)
LLM_PROVIDER=gemini
LLM_FALLBACK_PROVIDERS=gemini,openai,compatible

# Google Gemini Key
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here...
GEMINI_MODEL=gemini-3.8-flash

# Optional: OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o

# Optional: Groq / Llama
LLM_API_KEY=
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```


---

## 🏃 Running the Application

### One-Click Launch
Start the application with the automated runner:

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

NOVA includes an automated test suite verifying all 12 core subsystems:

```bash
python -m unittest tests/test_nova.py
```

### Test Coverage Breakdown:
1. `test_01_health_endpoint`: Verifies system diagnostics, FastMCP mount, and tool registry counts.
2. `test_02_chat_endpoint`: Tests multi-turn conversation and mood engine outputs.
3. `test_03_autonomous_mission_flow`: Verifies Plan formulation $\rightarrow$ Step modification $\rightarrow$ Approval $\rightarrow$ Sequential execution $\rightarrow$ DB persistence.
4. `test_04_tool_activity_and_trust_center`: Validates tool execution logs, latency tracking, and zero API-key leakage.
5. `test_05_persistent_memory_crud`: Verifies user memory storage, query, retrieval, and deletion.
6. `test_06_task_crud_and_conflicts`: Validates task management and deadline creation.
7. `test_07_multimodal_upload_validation`: Confirms file parsing and rejection of unauthorized file types.
8. `test_08_smart_home_persistence`: Verifies IoT device state toggling and wattage recalculation.
9. `test_09_proactive_insights`: Checks proactive schedule conflict analysis.
10. `test_10_what_if_simulator`: Validates isolated scenario simulation without modifying production tasks.
11. `test_11_conversation_reminders`: Verifies conversation commitment scanning and reminder retrieval.
12. `test_12_weather_briefing_music_alarms`: Tests real-time weather, executive briefing synthesis, music playback state, and smart alarms.

* Your default web browser will automatically open to **`http://127.0.0.1:8000`**.
* The FastMCP streamable server is live at **`http://127.0.0.1:8000/mcp/`**.
* Diagnostic health status is available at **`http://127.0.0.1:8000/api/health`**.

---

## 🗣️ Voice & Text Commands Cheatsheet

| Category | Example Voice / Text Request | NOVA Action |
| :--- | :--- | :--- |
| ⛅ **Weather** | *"What's the weather in Tokyo?"* | Fetches live Tokyo temperature, conditions, and centers radar map |
| ⛅ **Weather** | *"How hot is Dubai right now?"* | Returns Dubai heat index, atmospheric pressure, and humidity |
| 🎵 **Music** | *"Play Shape of You by Ed Sheeran"* | Queries iTunes catalog, plays audio preview, gives Spotify link |
| 🎵 **Music** | *"Play Believer by Imagine Dragons"* | Streams track in browser, exposes 🟢 Spotify & ▶️ YouTube buttons |
| 📰 **News** | *"What is the latest tech news?"* | Fetches Google Tech RSS headlines with source attribution |
| 📰 **News** | *"Tell me news about artificial intelligence"* | Searches global news for AI breakthroughs and displays summary |
| 📰 **Briefing** | *"Give me my morning briefing"* | Combines local weather, calendar deadlines, and top headlines |
| 💬 **Chat** | *"Delete this conversation"* | Permanently clears active thread and starts a fresh session |
| 💬 **Chat** | *"Clear all conversations"* | Wipes all stored chat history across all sessions |
| 📺 **Fire TV** | *"Turn on Fire TV"* / *"Open Netflix"* | Executes Fire TV remote control actions |
| 🔔 **Ring** | *"Show front door camera"* | Opens Ring video feed with motion detection logs |
| 🌡️ **Ecobee** | *"Set thermostat to 22 degrees"* | Configures Ecobee climate setpoint and fan mode |
| 🎯 **Missions** | *"Help me plan my week and study schedule"* | Generates interactive multi-step Autonomous Mission |
| ⏰ **Alarms** | *"Set a timer for 15 minutes"* | Runs real-time countdown timer with notification alert |
| 🚨 **SOS** | *"Emergency help me call police"* | Activates siren audio, broadcasts live GPS coordinates |


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
| `GET` | `/api/reminders` | Lists scheduled reminders & countdowns | None |
| `POST` | `/api/reminders/scan-conversations` | Scans chat history for commitments | None |
| `POST` | `/api/reminders` | Schedules a new reminder | `{"title": "Review paper", "due_time": "18:00"}` |
| `GET` | `/api/weather` | Returns real-time temperature & conditions | `?city=Mumbai` |
| `GET` | `/api/briefing` | Generates executive daily briefing | None |
| `GET` | `/api/music/state` | Returns player state & current track | None |
| `POST` | `/api/music/play` | Starts audio playback | None |
| `POST` | `/api/music/pause` | Pauses audio playback | None |
| `GET` | `/api/alarms` | Lists alarms and active countdown timers | None |
| `POST` | `/api/alarms` | Adds a new alarm | `{"time_str": "07:00", "label": "Morning"}` |
| `GET` | `/api/devices` | Lists IoT devices and wattage | None |
| `POST` | `/api/device` | Toggles device state | `{"device": "living_room_light", "on": true}` |
| `GET` | `/api/energy` | Real-time total power draw (watts) | None |
| `POST` | `/api/sos/trigger` | Triggers SOS distress broadcast | `{"situation": "Emergency distress", "latitude": 37.77}` |
| `POST` | `/mcp` | FastMCP Streamable HTTP JSON-RPC 2.0 | Standard MCP JSON-RPC payload |

---

## 📱 Amazon Fire OS & Mobile Companion Architecture

The repository includes a production-grade native Android / Fire OS background service in [`mobile_android/`](file:///c:/Users/APURVA/OneDrive/Documents/Desktop/Alexa/mobile_android):

* **`NovaForegroundService.kt`**:
  * Implements a sticky Foreground Service with continuous notification designed for Amazon Fire tablets and Android devices.
  * Uses Google Play Services / Amazon location APIs (`FusedLocationProviderClient`) to sync live GPS coordinates with `/api/location/update`.
  * Monitors application foreground time via `UsageStatsManager` to enforce digital wellbeing limits.
  * Dispatches emergency SMS via `SmsManager` and triggers automated phone calls to emergency services.
* **`AndroidManifest_Snippet.xml`**:
  * Contains the necessary permissions: `ACCESS_FINE_LOCATION`, `PACKAGE_USAGE_STATS`, `SEND_SMS`, `CALL_PHONE`, `FOREGROUND_SERVICE_LOCATION`.

---

## 🛡️ Safety, Privacy & Ethical Disclosures

* **Zero Client-Side Secret Leakage:** No API keys or tokens are ever sent to the browser or client applications.
* **Deterministic Fallback:** If internet access or API quotas are interrupted, NOVA gracefully switches to its local deterministic engine without crashing.
* **Simulated Hardware:** Smart-home device relays and power draws are mathematically modeled for demonstration safety.
* **Emergency Dispatch:** Emergency SOS calls and SMS alerts are simulated in software with real 112 dialing hooks provided.

---

## 👥 Hackathon Team & Acknowledgements

* **Hackathon:** [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/)
* **Category Track:** Alexa+ (Agentic Experiences & Self-Hosted MCP Servers)
* **Technologies:** Google Gemini 3.8 Flash, Multi-LLM Engine, FastAPI, FastMCP (Model Context Protocol), SQLite, TailwindCSS, Lucide, Leaflet, Android Kotlin
* **License:** [MIT License](LICENSE)
<details>
<summary><b>Click to expand full REST API documentation</b></summary>

### 💬 Conversation & Intelligence
* `POST /api/chat`: Primary conversational endpoint (voice/text, latitude/longitude, multi-turn memory).
* `GET /api/conversations`: Returns all saved conversation threads with message counts.
* `POST /api/conversations`: Creates a new conversation thread.
* `GET /api/conversations/{id}/messages`: Retrieves full message history for a specific thread.
* `PATCH /api/conversations/{id}`: Renames a conversation thread.
* `DELETE /api/conversations/{id}`: Deletes a specific conversation thread.
* `DELETE /api/conversations`: Bulk clears all conversation threads.

### ⛅ Weather, Music & News
* `GET /api/weather?place={place}`: Live global weather query for any city, country, or coordinates.
* `POST /api/music/play`: Searches live music catalogs and returns playable stream + Spotify bridges.
* `GET /api/music/state`: Returns currently playing track, playlist, and audio progress.
* `POST /api/music/pause` / `POST /api/music/next` / `POST /api/music/prev`: Controls music queue.
* `GET /api/news?category={cat}&topic={topic}`: Fetches real-time multi-platform news headlines.
* `GET /api/briefing`: Returns daily briefing synthesizing weather, tasks, and headlines.

### 🎯 Autonomous Missions
* `POST /api/missions/plan`: Generates structured multi-step plan from high-level user goal.
* `GET /api/missions/{id}`: Returns status and step verification checklist for a mission.
* `PUT /api/missions/{id}/steps`: Edits, reorders, or removes mission steps.
* `POST /api/missions/{id}/approve`: Starts sequential autonomous step execution.
* `POST /api/missions/{id}/cancel`: Aborts active or pending mission.

### 🏠 Smart Home & Ecosystem
* `GET /api/devices`: Returns states of smart appliances and power loads.
* `POST /api/device`: Toggles state of lighting, fans, or appliances.
* `GET /api/energy`: Returns aggregate household electrical wattage.
* `GET /api/ecosystem/all`: Returns status of Fire TV, Ring Doorbell, and Ecobee.
* `POST /api/ecosystem/fire_tv/action`: Dispatches commands to Fire TV.
* `POST /api/ecosystem/ecobee/temperature`: Updates Ecobee target temperature.

### 🚨 Safety & Diagnostics
* `POST /api/sos/trigger`: Broadcasts emergency distress signal with live coordinates.
* `GET /api/health`: Comprehensive system diagnostic endpoint.
* `POST /mcp/`: Model Context Protocol Streamable HTTP endpoint.

</details>

---

## 🧪 Automated Testing & Verification

NOVA includes an end-to-end automated test suite:

```bash
python -m unittest tests/test_nova.py
```

All 10 core capability assertions run in isolated testing environments:
```
Ran 10 tests in 11.84s
OK - All Health, Missions, Memory, Smart Home, Conflict Auditing, and Tool Registry tests passed!
```

---

## 🔒 Privacy & Safety Guarantee

* **100% Client-Side API Key Safety**: All API keys, secrets, and credentials remain strictly on the backend.
* **Local SQLite Sovereignty**: Conversations, reminders, and custom digital twin facts are stored locally on your machine in `data/nova_planner.db`.
* **Zero Dark Patterns**: Conversations can be completely and permanently wiped at any moment via the UI or voice commands.

---

<div align="center">
  <b>NOVA AI — ALEXA-NEXT 2.0</b> • Built with ❤️ for the next generation of conversational AI.
</div>

