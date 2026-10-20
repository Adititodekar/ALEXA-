"""
Runner script for Nova AI Assistant.
Starts the FastAPI server and opens the browser interface automatically.
"""

import sys
import uvicorn
import webbrowser
import threading
import time

if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def open_browser():
    time.sleep(1.5)
    print("\n🚀 Opening Nova AI Assistant Companion Dashboard...")
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    print("=" * 65)
    print("🌟 NOVA AI ASSISTANT - Next-Generation Multimodal Alexa 2.0")
    print("=" * 65)
    print("Features Active:")
    print(" ✔️ Conversational Voice (Speech-to-Text & Text-to-Speech)")
    print(" ✔️ Real-Time Information, Verified Images & Video Recommendations")
    print(" ✔️ Conversation-Based Daily Planner & Agenda Synthesis")
    print(" ✔️ Submission Deadlines & Proactive Reminders")
    print(" ✔️ Live GPS Location Tracking, Reverse Geocoding & Route Directions")
    print(" ✔️ Phone Screen Time & App Usage Limiter (Digital Wellbeing)")
    print(" ✔️ Emergency SOS Situation Detection & Broadcast (Distress Calls)")
    print(" ✔️ Emotion & Mood Engine with Empathetic Response Adapters")
    print("=" * 65)
    print("Server running on http://127.0.0.1:8000")
    
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
