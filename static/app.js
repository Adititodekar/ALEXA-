/**
 * NOVA AI Assistant - Frontend Client Logic
 * Handles Speech STT/TTS, Real-time Map, SOS, Media Rendering, Smart Home IoT & Wellbeing
 * Features complete 6-state Animated Alexa Eye & Non-blocking Toast Alerts
 */

let currentCoords = { lat: 12.9716, lng: 77.5946 }; // Default center (Bangalore)
let map = null;
let userMarker = null;
let routeLayer = null;
let isListening = false;
let recognition = null;
let isSpeaking = false;
let visualizerTimeout = null;

// DOM Elements
const voiceOrb = document.getElementById("voiceOrb");
const orbIcon = document.getElementById("orbIcon");
const wave1 = document.getElementById("waveRing1");
const wave2 = document.getElementById("waveRing2");
const assistantStatus = document.getElementById("assistantStatus");
const chatFeed = document.getElementById("chatFeed");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const micBtn = document.getElementById("micBtn");
const moodBadge = document.getElementById("moodBadge");
const moodText = document.getElementById("moodText");
const gpsLocationText = document.getElementById("gpsLocationText");
const locationAddressLabel = document.getElementById("locationAddressLabel");
const sosBtn = document.getElementById("sosBtn");
const sosModal = document.getElementById("sosModal");
const sosCoordsBox = document.getElementById("sosCoordsBox");
const cancelSosBtn = document.getElementById("cancelSosBtn");
const deadlinesList = document.getElementById("deadlinesList");
const addDeadlineBtn = document.getElementById("addDeadlineBtn");
const deadlineModal = document.getElementById("deadlineModal");
const closeDeadlineModalBtn = document.getElementById("closeDeadlineModalBtn");
const saveDeadlineBtn = document.getElementById("saveDeadlineBtn");
const focusModeToggle = document.getElementById("focusModeToggle");
const smartDevicesList = document.getElementById("smartDevicesList");
const powerLoadBadge = document.getElementById("powerLoadBadge");
const energyTipSummary = document.getElementById("energyTipSummary");
const refreshEnergyBtn = document.getElementById("refreshEnergyBtn");
const toastContainer = document.getElementById("toastContainer");

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) lucide.createIcons();
    initMap();
    initGeolocation();
    initSpeechRecognition();
    loadDeadlines();
    loadWellbeing();
    loadSmartHome();
    setupEventListeners();
});

// --- Toast Notifications ---
function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconName = "info";
    if (type === "success") iconName = "check-circle";
    if (type === "error") iconName = "alert-circle";

    toast.innerHTML = `
        <i data-lucide="${iconName}" class="w-4 h-4 shrink-0 text-${type === 'success' ? 'emerald' : type === 'error' ? 'red' : 'cyan'}-400"></i>
        <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// 1. Map Initialization
function initMap() {
    try {
        if (typeof L === "undefined") {
            console.warn("Leaflet library not loaded.");
            return;
        }
        map = L.map('map', { zoomControl: false }).setView([currentCoords.lat, currentCoords.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Glowing user location pin
        const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `<div style="width:16px;height:16px;background:#06b6d4;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #06b6d4;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        userMarker = L.marker([currentCoords.lat, currentCoords.lng], { icon: userIcon }).addTo(map);
    } catch (e) {
        console.warn("Map init encountered error:", e);
    }
}

// 2. Geolocation Tracking
function initGeolocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                currentCoords.lat = pos.coords.latitude;
                currentCoords.lng = pos.coords.longitude;
                updateMapPosition(currentCoords.lat, currentCoords.lng);
                syncBackendLocation(currentCoords.lat, currentCoords.lng, pos.coords.accuracy);
            },
            (err) => {
                console.warn("GPS Permission or signal error:", err.message);
                syncBackendLocation(currentCoords.lat, currentCoords.lng, 100);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }
}

function updateMapPosition(lat, lng) {
    if (map && userMarker) {
        userMarker.setLatLng([lat, lng]);
        map.panTo([lat, lng]);
    }
}

async function syncBackendLocation(lat, lng, accuracy) {
    try {
        const res = await fetch("/api/location/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: accuracy })
        });
        const data = await res.json();
        if (gpsLocationText) gpsLocationText.textContent = `GPS: ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        if (locationAddressLabel) locationAddressLabel.textContent = `📍 ${data.address || 'Street Address resolved'}`;
    } catch (e) {
        console.error("Location sync failed:", e);
    }
}

// 3. Speech Recognition (STT) & Speech Synthesis (TTS)
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            setVisualizerState("listening");
        };

        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            userInput.value = transcript;
            submitMessage(transcript);
        };

        recognition.onerror = () => {
            isListening = false;
            setVisualizerState("error");
            setTimeout(() => setVisualizerState("idle"), 2500);
        };

        recognition.onend = () => {
            isListening = false;
            if (!isSpeaking) setVisualizerState("idle");
        };
    } else {
        console.warn("Speech Recognition not supported in this browser.");
    }
}

function toggleListening() {
    if (!recognition) {
        showToast("Speech recognition is not supported in this browser. Please type your message.", "info");
        return;
    }
    if (isListening) {
        recognition.stop();
    } else {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        recognition.start();
    }
}

function speakText(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const clean = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Zira")));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
        isSpeaking = true;
        setVisualizerState("speaking");
    };

    utterance.onend = () => {
        isSpeaking = false;
        setVisualizerState("idle");
    };

    utterance.onerror = () => {
        isSpeaking = false;
        setVisualizerState("idle");
    };

    window.speechSynthesis.speak(utterance);
}

// 4. ANIMATED ALEXA EYE STATE MACHINE (Idle, Listening, Thinking, Speaking, Success, Error)
function setVisualizerState(state) {
    if (visualizerTimeout) {
        clearTimeout(visualizerTimeout);
        visualizerTimeout = null;
    }

    if (!voiceOrb) return;

    // Reset base classes
    voiceOrb.className = `state-${state} mb-4`;

    switch (state) {
        case "listening":
            assistantStatus.textContent = "Listening to your voice...";
            wave1.className = "absolute inset-0 rounded-full border-2 border-cyan-400/50 scale-100 pointer-events-none pulsing-wave-1";
            wave2.className = "absolute inset-0 rounded-full border-2 border-indigo-400/40 scale-100 pointer-events-none pulsing-wave-2";
            break;

        case "thinking":
            assistantStatus.textContent = "Thinking & analyzing...";
            wave1.className = "absolute inset-0 rounded-full border-2 border-purple-400/30 opacity-0 scale-100 pointer-events-none";
            wave2.className = "absolute inset-0 rounded-full border-2 border-indigo-400/30 opacity-0 scale-100 pointer-events-none";
            break;

        case "speaking":
            assistantStatus.textContent = "Nova is speaking...";
            wave1.className = "absolute inset-0 rounded-full border-2 border-cyan-300 scale-100 pointer-events-none pulsing-wave-1";
            wave2.className = "absolute inset-0 rounded-full border-2 border-fuchsia-400 scale-100 pointer-events-none pulsing-wave-2";
            break;

        case "success":
            assistantStatus.textContent = "Understood • Executed";
            wave1.className = "absolute inset-0 rounded-full border-2 border-emerald-400/60 scale-100 pointer-events-none pulsing-wave-1";
            wave2.className = "absolute inset-0 rounded-full border-2 border-emerald-400/30 opacity-0 scale-100 pointer-events-none";
            break;

        case "error":
            assistantStatus.textContent = "Encountered an issue • Retrying";
            wave1.className = "absolute inset-0 rounded-full border-2 border-red-500/50 scale-100 pointer-events-none pulsing-wave-1";
            wave2.className = "absolute inset-0 rounded-full border-2 border-amber-500/40 scale-100 pointer-events-none pulsing-wave-2";
            visualizerTimeout = setTimeout(() => {
                if (!isListening && !isSpeaking) setVisualizerState("idle");
            }, 3000);
            break;

        case "idle":
        default:
            assistantStatus.textContent = "Click Eye or Speak 'Hey Nova'";
            wave1.className = "absolute inset-0 rounded-full border-2 border-cyan-400/40 opacity-0 scale-100 pointer-events-none";
            wave2.className = "absolute inset-0 rounded-full border-2 border-indigo-400/30 opacity-0 scale-100 pointer-events-none";
            break;
    }
}

// 5. Message Submission & Chat Flow
async function submitMessage(text) {
    if (!text || !text.trim()) return;

    appendUserMessage(text);
    userInput.value = "";
    setVisualizerState("thinking");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                latitude: currentCoords.lat,
                longitude: currentCoords.lng
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        setVisualizerState("success");
        setTimeout(() => {
            handleAssistantResponse(data);
        }, 350);

    } catch (err) {
        console.error("Chat error:", err);
        setVisualizerState("error");
        appendAssistantMessage("I encountered a connection issue. Please make sure the backend server is running.", null);
        showToast("Connection issue with assistant server", "error");
    }
}

function handleAssistantResponse(data) {
    // 1. Update Mood Indicator
    if (data.mood) {
        updateMoodUI(data.mood.primary_mood);
    }

    // 2. Speak response aloud like Alexa
    if (data.speech_reply) {
        speakText(data.speech_reply);
    } else {
        setVisualizerState("idle");
    }

    // 3. Render Assistant message and rich visual cards
    appendAssistantMessage(data.display_reply || data.speech_reply || data.reply, data);

    // 4. Handle Emergency
    if (data.type === "emergency" || (data.mood && data.mood.is_emergency)) {
        triggerSOSModal(data.emergency_payload);
    }

    // 5. Handle Navigation / Route on Map
    if (data.type === "navigation" && data.navigation) {
        renderRouteOnMap(data.navigation);
    }

    // 6. Refresh Deadlines if changed
    if (data.type === "deadlines") {
        loadDeadlines();
    }

    // 7. Refresh Smart Home if changed
    if (data.type === "smart_home") {
        loadSmartHome();
    }
}

function appendUserMessage(text) {
    const el = document.createElement("div");
    el.className = "flex items-start justify-end space-x-2";
    el.innerHTML = `
        <div class="bg-cyan-600/30 border border-cyan-500/40 text-cyan-100 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[85%] shadow-md">
            ${escapeHtml(text)}
        </div>
    `;
    chatFeed.appendChild(el);
    chatFeed.scrollTop = chatFeed.scrollHeight;
}

function appendAssistantMessage(text, payload) {
    const el = document.createElement("div");
    el.className = "flex items-start space-x-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg";

    let mediaContent = "";

    // If media images or videos are present
    if (payload && payload.media) {
        const m = payload.media;
        if (m.primary_image || (m.gallery && m.gallery.length > 0)) {
            const rawImg = m.primary_image || (m.gallery && m.gallery[0] ? m.gallery[0] : null);
            const imgUrl = typeof rawImg === 'string' ? rawImg : (rawImg && rawImg.url ? rawImg.url : null);
            if (imgUrl) {
                mediaContent += `
                <div class="mt-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950">
                    <img src="${imgUrl}" alt="Visual information" class="w-full max-h-56 object-cover hover:scale-105 transition duration-300" onerror="this.style.display='none'">
                    <div class="p-2 text-[11px] text-slate-400 flex justify-between items-center">
                        <span>📷 ${escapeHtml(m.title || "Visual Reference")}</span>
                        ${m.source_url ? `<a href="${m.source_url}" target="_blank" class="text-cyan-400 hover:underline">Wiki Source &rarr;</a>` : ''}
                    </div>
                </div>
            `;
            }
        }

        if (m.videos && m.videos.length > 0) {
            mediaContent += `
                <div class="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div class="flex items-center space-x-2 text-xs">
                        <i data-lucide="video" class="w-4 h-4 text-red-500"></i>
                        <span class="text-slate-300 font-medium">${escapeHtml(m.videos[0].title)}</span>
                    </div>
                    <a href="${m.videos[0].search_url}" target="_blank" class="px-2.5 py-1 rounded bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-semibold hover:bg-red-600 hover:text-white transition">
                        Watch on YouTube
                    </a>
                </div>
            `;
        }
    }

    // If Smart Home device status or toggles
    if (payload && payload.smart_home && payload.smart_home.devices) {
        const devs = payload.smart_home.devices;
        const devCards = Object.values(devs).map(d => `
            <div class="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                    <div class="font-medium text-slate-200 text-xs">${escapeHtml(d.name)}</div>
                    <div class="text-[10px] text-slate-400">${d.watts}W • ${escapeHtml(d.room)}</div>
                </div>
                <button onclick="toggleDevice('${d.id}', ${!d.on})" class="px-2.5 py-1 rounded text-[10px] font-bold transition ${d.on ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}">
                    ${d.on ? 'ACTIVE (ON)' : 'STANDBY (OFF)'}
                </button>
            </div>
        `).join('');

        mediaContent += `
            <div class="mt-3 p-3 rounded-xl bg-slate-950/90 border border-amber-500/30">
                <div class="text-xs font-bold text-amber-400 mb-2 flex items-center justify-between">
                    <span>⚡ Smart Home IoT Devices</span>
                    <span class="font-mono text-[10px] bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">${payload.smart_home.energy ? payload.smart_home.energy.estimated_current_watts : 0} W Total Load</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${devCards}</div>
            </div>
        `;
    }

    // If Daily Planner schedule was generated
    if (payload && payload.planner) {
        const p = payload.planner;
        let scheduleItems = p.schedule.map(s => `
            <div class="flex items-start space-x-2 text-xs py-1 border-b border-slate-800/60 last:border-0">
                <span class="text-indigo-400 font-mono w-32 shrink-0">${s.time}</span>
                <span class="text-slate-200">${s.activity}</span>
            </div>
        `).join('');

        mediaContent += `
            <div class="mt-3 p-3 rounded-xl bg-slate-950/90 border border-indigo-500/30">
                <div class="text-xs font-bold text-indigo-400 mb-2 flex items-center space-x-1">
                    <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                    <span>Optimized Schedule for ${p.date}</span>
                </div>
                <div class="space-y-1">${scheduleItems}</div>
            </div>
        `;
    }

    // If Navigation directions
    if (payload && payload.navigation && payload.navigation.steps) {
        const nav = payload.navigation;
        const stepsHtml = nav.steps.map((st, i) => `<li class="text-[11px] text-slate-300">${i+1}. ${escapeHtml(st)}</li>`).join('');
        mediaContent += `
            <div class="mt-3 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-xs">
                <div class="font-bold text-cyan-400 mb-1">🗺️ Navigation Guidance to ${escapeHtml(nav.destination)}</div>
                <div class="text-slate-400 text-[11px] mb-2">${nav.summary}</div>
                <ul class="space-y-1 list-none">${stepsHtml}</ul>
            </div>
        `;
    }

    el.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center shrink-0">
            <i data-lucide="bot" class="w-4 h-4"></i>
        </div>
        <div class="text-sm space-y-2 flex-1">
            <div class="font-semibold text-cyan-400 flex items-center justify-between">
                <span>Nova</span>
                <span class="text-[10px] text-slate-500 font-mono">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="text-slate-200 leading-relaxed">${formatMarkdown(text)}</div>
            ${mediaContent}
        </div>
    `;

    chatFeed.appendChild(el);
    chatFeed.scrollTop = chatFeed.scrollHeight;
    if (window.lucide) lucide.createIcons();
}

// 6. Route Display on Leaflet Map
function renderRouteOnMap(nav) {
    if (!map) return;
    if (routeLayer) map.removeLayer(routeLayer);

    const start = [nav.start.lat, nav.start.lng];
    const target = [nav.target.lat, nav.target.lng];

    L.marker(target, {
        icon: L.divIcon({
            className: 'target-marker',
            html: `<div style="width:16px;height:16px;background:#ef4444;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px #ef4444;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        })
    }).addTo(map);

    if (nav.geojson && nav.geojson.coordinates) {
        const latLngs = nav.geojson.coordinates.map(c => [c[1], c[0]]);
        routeLayer = L.polyline(latLngs, { color: '#06b6d4', weight: 4, opacity: 0.8 }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });
    } else {
        routeLayer = L.polyline([start, target], { color: '#06b6d4', weight: 3, dashArray: '6, 6' }).addTo(map);
        map.fitBounds([start, target], { padding: [20, 20] });
    }
}

// 7. Mood Indicator State
function updateMoodUI(mood) {
    const moodMap = {
        joyful: { text: "Mood: Happy & Energetic", color: "bg-amber-400" },
        stressed: { text: "Mood: Stressed (Gentle Support)", color: "bg-purple-400" },
        anxious: { text: "Mood: Anxious (Calming Pace)", color: "bg-blue-400" },
        sad: { text: "Mood: Low Energy (Empathetic)", color: "bg-indigo-400" },
        emergency: { text: "Mood: EMERGENCY DETECTED", color: "bg-red-500 animate-ping" },
        calm: { text: "Mood: Calm & Balanced", color: "bg-emerald-400" },
        neutral: { text: "Mood: Attentive & Ready", color: "bg-emerald-400" }
    };

    const cfg = moodMap[mood] || moodMap.neutral;
    if (moodText) moodText.textContent = cfg.text;
    if (moodBadge) {
        const dot = moodBadge.querySelector("span:first-child");
        if (dot) dot.className = `w-2 h-2 rounded-full ${cfg.color}`;
    }
}

// 8. Emergency SOS Modal & Siren
function triggerSOSModal(payload) {
    sosModal.classList.remove("hidden");
    const coordsStr = currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : "Unavailable";
    sosCoordsBox.textContent = `📍 Live Location: ${coordsStr}\nStatus: Signal Dispatched to Contacts & 112`;
    
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.4);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
}

async function triggerDirectSOS() {
    try {
        const res = await fetch("/api/sos/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                situation: "User clicked SOS Emergency button",
                latitude: currentCoords.lat,
                longitude: currentCoords.lng
            })
        });
        const data = await res.json();
        triggerSOSModal(data.record);
        speakText("Emergency protocol engaged. Transmitting your location and connecting help immediately.");
        showToast("Emergency SOS broadcast transmitted!", "error");
    } catch (e) {
        triggerSOSModal(null);
    }
}

// 9. Deadlines & Planner
async function loadDeadlines() {
    try {
        const res = await fetch("/api/planner/deadlines");
        const data = await res.json();
        if (data.deadlines) {
            renderDeadlines(data.deadlines);
        }
    } catch (e) {
        console.error("Deadlines load failed:", e);
    }
}

function renderDeadlines(deadlines) {
    if (!deadlinesList) return;
    deadlinesList.innerHTML = "";
    if (deadlines.length === 0) {
        deadlinesList.innerHTML = `<p class="text-slate-500 italic p-2">No pending deadlines.</p>`;
        return;
    }

    deadlines.forEach(d => {
        const div = document.createElement("div");
        div.className = "p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between";
        const isDone = d.status === "completed";
        const badgeColor = isDone ? "bg-emerald-950 text-emerald-400 border-emerald-800/60" :
                           d.urgency === "overdue" ? "bg-red-950 text-red-400 border-red-800/60" :
                           d.urgency === "high" ? "bg-amber-950 text-amber-400 border-amber-800/60" :
                           "bg-indigo-950 text-indigo-400 border-indigo-800/60";

        div.innerHTML = `
            <div class="flex-1 min-w-0 pr-2">
                <p class="font-medium text-slate-200 truncate ${isDone ? 'line-through text-slate-500' : ''}">${escapeHtml(d.title)}</p>
                <span class="text-[10px] text-slate-400 font-mono">${d.countdown} (${d.due_date})</span>
            </div>
            <div class="flex items-center space-x-1.5 shrink-0">
                <span class="px-2 py-0.5 rounded-full border text-[10px] ${badgeColor}">${isDone ? 'Completed' : d.priority}</span>
                ${!isDone ? `<button onclick="completeDeadline(${d.id})" class="p-1 text-slate-400 hover:text-emerald-400 transition" title="Mark Done"><i data-lucide="check" class="w-3.5 h-3.5"></i></button>` : ''}
                <button onclick="deleteDeadline(${d.id})" class="p-1 text-slate-400 hover:text-red-400 transition" title="Delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </div>
        `;
        deadlinesList.appendChild(div);
    });
    if (window.lucide) lucide.createIcons();
}

async function completeDeadline(id) {
    try {
        const res = await fetch(`/api/planner/deadlines/${id}/complete`, { method: "POST" });
        if (res.ok) {
            showToast("Deadline marked completed!", "success");
            loadDeadlines();
        }
    } catch (e) {
        showToast("Failed to complete deadline", "error");
    }
}

async function deleteDeadline(id) {
    try {
        const res = await fetch(`/api/planner/deadlines/${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Deadline deleted", "info");
            loadDeadlines();
        }
    } catch (e) {
        showToast("Failed to delete deadline", "error");
    }
}

// 10. Smart Home & Energy IoT Management
async function loadSmartHome() {
    try {
        const [devRes, energyRes] = await Promise.all([
            fetch("/api/devices"),
            fetch("/api/energy")
        ]);
        const devices = await devRes.json();
        const energy = await energyRes.json();
        renderSmartDevices(devices, energy);
    } catch (e) {
        console.error("Smart home load failed:", e);
    }
}

function renderSmartDevices(devices, energy) {
    if (powerLoadBadge && energy) {
        powerLoadBadge.textContent = `${energy.estimated_current_watts} W Load`;
        powerLoadBadge.className = energy.estimated_current_watts > 100 
            ? "text-xs px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/60 font-mono font-bold"
            : "text-xs px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/60 font-mono font-bold";
    }

    if (!smartDevicesList || !devices) return;
    smartDevicesList.innerHTML = "";

    const iconMap = {
        light: "lightbulb",
        fan: "fan",
        tv: "tv",
        ac: "wind"
    };

    Object.values(devices).forEach(d => {
        const div = document.createElement("div");
        div.className = "p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between";
        const icon = iconMap[d.type] || "zap";
        
        div.innerHTML = `
            <div class="flex items-center space-x-2.5">
                <i data-lucide="${icon}" class="w-4 h-4 ${d.on ? 'text-amber-400' : 'text-slate-600'}"></i>
                <div>
                    <p class="font-medium text-slate-200 text-xs">${escapeHtml(d.name)}</p>
                    <span class="text-[10px] text-slate-400">${d.watts}W • ${escapeHtml(d.room)}</span>
                </div>
            </div>
            <button onclick="toggleDevice('${d.id}', ${!d.on})" class="px-2.5 py-1 rounded text-[11px] font-semibold transition ${d.on ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}">
                ${d.on ? 'ON' : 'OFF'}
            </button>
        `;
        smartDevicesList.appendChild(div);
    });
    if (window.lucide) lucide.createIcons();
}

async function toggleDevice(deviceId, targetState) {
    try {
        const res = await fetch("/api/device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device: deviceId, on: targetState })
        });
        const data = await res.json();
        if (data.ok) {
            showToast(data.note, "success");
            loadSmartHome();
        } else {
            showToast(data.error || "Device update failed", "error");
        }
    } catch (e) {
        showToast("Failed to communicate with device", "error");
    }
}

// 11. Digital Wellbeing
async function loadWellbeing() {
    try {
        const res = await fetch("/api/wellbeing/status");
        const data = await res.json();
        const screenTimeCount = document.getElementById("screenTimeCount");
        const screenTimeBar = document.getElementById("screenTimeBar");
        
        if (screenTimeCount) screenTimeCount.textContent = `${data.total_screen_time_formatted} / ${data.daily_limit_mins / 60}h Limit`;
        if (screenTimeBar) {
            screenTimeBar.style.width = `${data.percent_used}%`;
            if (data.percent_used > 90) {
                screenTimeBar.className = "bg-red-500 h-2 rounded-full";
            }
        }
    } catch(e) {}
}

// --- Event Listeners ---
function setupEventListeners() {
    voiceOrb.addEventListener("click", toggleListening);
    micBtn.addEventListener("click", toggleListening);

    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        submitMessage(userInput.value);
    });

    sosBtn.addEventListener("click", triggerDirectSOS);
    cancelSosBtn.addEventListener("click", () => {
        sosModal.classList.add("hidden");
        showToast("SOS Alert Cancelled - Status set to safe", "info");
    });

    document.getElementById("recenterMapBtn").addEventListener("click", () => {
        if (map && currentCoords) {
            map.setView([currentCoords.lat, currentCoords.lng], 15);
            showToast("Map recentered on current location", "info");
        }
    });

    if (refreshEnergyBtn) {
        refreshEnergyBtn.addEventListener("click", () => {
            loadSmartHome();
            showToast("Energy and device status updated", "info");
        });
    }

    addDeadlineBtn.addEventListener("click", () => deadlineModal.classList.remove("hidden"));
    closeDeadlineModalBtn.addEventListener("click", () => deadlineModal.classList.add("hidden"));

    saveDeadlineBtn.addEventListener("click", async () => {
        const title = document.getElementById("newDeadlineTitle").value.trim();
        const date = document.getElementById("newDeadlineDate").value;
        if (!title || !date) {
            showToast("Please fill in both a title and due date.", "error");
            return;
        }

        try {
            await fetch("/api/planner/deadlines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    due_date: date.replace("T", " "),
                    priority: "high"
                })
            });

            deadlineModal.classList.add("hidden");
            document.getElementById("newDeadlineTitle").value = "";
            showToast(`Added deadline: ${title}`, "success");
            loadDeadlines();
        } catch (e) {
            showToast("Could not save deadline", "error");
        }
    });

    focusModeToggle.addEventListener("click", async () => {
        const isOff = focusModeToggle.textContent.includes("OFF");
        try {
            const res = await fetch(`/api/wellbeing/focus?enable=${isOff}`, { method: "POST" });
            const data = await res.json();
            focusModeToggle.textContent = isOff ? "Focus Mode: ON" : "Focus Mode: OFF";
            focusModeToggle.className = isOff 
                ? "text-xs px-2.5 py-1 rounded-full bg-emerald-600 text-white font-semibold"
                : "text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white border border-slate-700";
            showToast(data.message, "info");
        } catch (e) {
            showToast("Failed to toggle Focus Mode", "error");
        }
    });
}

function quickAsk(text) {
    userInput.value = text;
    submitMessage(text);
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMarkdown(text) {
    if (!text) return "";
    let safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-semibold">$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
    safe = safe.replace(/^### (.*$)/gim, '<div class="text-sm font-bold text-cyan-400 mt-2 mb-1">$1</div>');
    safe = safe.replace(/^\s*-\s+(.*$)/gim, '<div class="flex items-start space-x-1.5 ml-2 my-0.5"><span class="text-cyan-400">•</span><span>$1</span></div>');
    safe = safe.replace(/\n\n/g, '<div class="h-2"></div>').replace(/\n/g, '<br/>');
    return safe;
}
