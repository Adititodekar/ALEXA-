# 🌟 NOVA AI: Next-Generation Alexa & Autonomous Life Guardian

Nova AI is an advanced, multimodal, voice-interactive assistant that surpasses conventional voice assistants. It combines **conversational reasoning, real-time live knowledge, media cards (real images & video explainers), conversation-driven daily planning, deadline tracking, live GPS location & navigation, phone usage limits (Digital Wellbeing), mood/emotion adaptation, and life-saving Emergency SOS detection**.

---

## 🚀 Key Features

| Capability | How It Works |
| :--- | :--- |
| **🗣️ Real Voice Conversation (Alexa-Style)** | Two-way natural voice streaming using Speech-to-Text (STT) and natural Text-to-Speech (TTS) with audio wave animations. |
| **🌐 Real-Time Info, Images & Videos** | Fetches live verified knowledge, high-resolution original images, and YouTube explainers when asked about any topic, landmark, or science question. |
| **📅 Conversation-Driven Day Planner** | Analyzes your daily conversations, notes, and habits to automatically generate a prioritized daily agenda with focus blocks. |
| **⏰ Submission Deadlines & Alerts** | Keeps track of assignments, project due dates, and exam submissions with real-time countdown alerts and urgency tags. |
| **📍 GPS Tracking & Directions ("Where Am I?")** | Real-time coordinates tracking, reverse-geocodes your exact street address, and calculates turn-by-turn driving/walking routes with a live Leaflet map. |
| **📱 Phone Limits & Digital Wellbeing** | Monitors daily screen time and individual app limits (Instagram, YouTube, TikTok). Gives spoken warnings and toggles Focus Mode. |
| **🚨 Emergency SOS & Danger Detection** | Listens for distress keywords ("Help me", "I had an accident", "Call ambulance") or panic button. Dispatches live GPS coordinates to emergency services and contacts. |
| **🎭 Emotion & Mood Intelligence** | Detects emotional states (Joyful, Stressed, Anxious, Sad, Calm) and automatically tunes Nova's tone to be gentle, comforting, or energetic. |

---

## 🛠️ Project Structure

```
nova_ai_assistant/
├── app.py                     # FastAPI application serving REST APIs & Web UI
├── run.py                     # One-click launcher (starts server + opens UI)
├── core/
│   ├── brain.py               # Central AI reasoner & intent orchestrator
│   ├── mood_engine.py         # Sentiment & distress detection engine
│   ├── emergency_guardian.py  # Emergency situation detector & SOS dispatcher
│   ├── location_service.py    # Geolocation, reverse geocoding & OSRM routing
│   ├── media_service.py       # Live Wikipedia data, real images & video links
│   ├── wellbeing_tracker.py   # Screen time & app usage limiter
│   └── planner.py             # SQLite-backed daily schedule & deadline engine
├── static/
│   ├── index.html             # Sleek glassmorphism companion dashboard
│   ├── style.css              # Cyber-clean dark theme & audio wave animations
│   └── app.js                 # Web Speech API, Geolocation & Leaflet map engine
├── mobile_android/
│   ├── NovaForegroundService.kt # Kotlin service for Android GPS, Limits & Calls
│   └── AndroidManifest_Snippet.xml # Required permissions and background setup
└── data/                      # Persistent SQLite storage
```

---

## 🏃 How to Run

1. Open PowerShell or Terminal in the project directory:
   ```bash
   cd C:\Users\91727\.gemini\antigravity\scratch\nova_ai_assistant
   ```

2. Launch the assistant:
   ```bash
   python run.py
   ```

3. Your browser will automatically open to `http://127.0.0.1:8000`.
   - Click the **Voice Orb** or press the **Microphone** icon to start speaking.
   - Or type commands directly into the input bar.

---

## 📱 Mobile (Android) Deployment
The `mobile_android/` directory contains:
- `NovaForegroundService.kt`: Demonstrates how to access Android `UsageStatsManager` for enforcing app limits, `FusedLocationProviderClient` for background location, and `SmsManager` / `ACTION_CALL` for emergency dispatch.
- `AndroidManifest_Snippet.xml`: Outlines the exact permissions needed.
