/**
 * NOVA AI Assistant (Alexa-Next 2.0) - Complete Client Logic
 * Handles:
 * 1. 8-state Animated Alexa Eye & Web Speech STT/TTS
 * 2. Active execution for Smart Home, Tasks & Deadlines (Live SQLite sync)
 * 3. Elimination of unwanted media/YouTube spam
 * 4. Signature Autonomous Mission Mode (Formulate, Review, Edit, Approve, Execute, Verify)
 * 5. Full interactive Navigation for ALL side-panel tabs (Missions, Tasks, Smart Home, Memory, Knowledge, Activity, What-If, Skills)
 * 6. Multimodal File & Image Uploads
 * 7. Live GPS Geolocation, Leaflet Map, & Emergency SOS Siren
 */

// Application State
let currentConversationId = "default-session";
let currentCoords = { lat: 12.9716, lng: 77.5946 };
let map = null;
let userMarker = null;
let isListening = false;
let recognition = null;
let isSpeaking = false;
let visualizerTimeout = null;
let pendingFile = null;
let activeMissionId = null;
let sirenOscillator = null;
let sirenAudioContext = null;

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
const stopSpeechBtn = document.getElementById("stopSpeechBtn");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const uploadPreviewChip = document.getElementById("uploadPreviewChip");
const uploadFileName = document.getElementById("uploadFileName");
const uploadFileSize = document.getElementById("uploadFileSize");
const cancelUploadBtn = document.getElementById("cancelUploadBtn");
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
const newChatBtn = document.getElementById("newChatBtn");
const conversationsList = document.getElementById("conversationsList");
const missionContainer = document.getElementById("missionContainer");
const missionGoalText = document.getElementById("missionGoalText");
const missionStatusBadge = document.getElementById("missionStatusBadge");
const missionProgressBar = document.getElementById("missionProgressBar");
const missionProgressText = document.getElementById("missionProgressText");
const missionStepsList = document.getElementById("missionStepsList");
const approveMissionBtn = document.getElementById("approveMissionBtn");
const cancelMissionBtn = document.getElementById("cancelMissionBtn");
const proactiveContent = document.getElementById("proactiveContent");
const refreshInsightsBtn = document.getElementById("refreshInsightsBtn");
const genericModal = document.getElementById("genericModal");
const genericModalHeading = document.getElementById("genericModalHeading");
const genericModalBody = document.getElementById("genericModalBody");
const closeGenericModalBtn = document.getElementById("closeGenericModalBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");

// --- Initialization ---
function initApp() {
    if (window.lucide) lucide.createIcons();
    try { loadWeather(); } catch (e) { console.warn("loadWeather error:", e); }
    try { initMusicPlayer(); } catch (e) { console.warn("initMusicPlayer error:", e); }
    try { setupEventListeners(); } catch (e) { console.warn("setupEventListeners error:", e); }
    try { initMap(); } catch (e) { console.warn("initMap error:", e); }
    try { initGeolocation(); } catch (e) { console.warn("initGeolocation error:", e); }
    try { initSpeechRecognition(); } catch (e) { console.warn("initSpeechRecognition error:", e); }
    try { loadConversations(); } catch (e) { console.warn("loadConversations error:", e); }
    try { loadDeadlines(); } catch (e) { console.warn("loadDeadlines error:", e); }
    try { loadSmartHome(); } catch (e) { console.warn("loadSmartHome error:", e); }
    try { loadWellbeing(); } catch (e) { console.warn("loadWellbeing error:", e); }
    try { loadProactiveInsights(); } catch (e) { console.warn("loadProactiveInsights error:", e); }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

// =========================================================================
// 1. TOAST NOTIFICATION SYSTEM
// =========================================================================
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

// =========================================================================
// 1B. LIVE WEATHER & ENVIRONMENTAL CONDITIONS (OpenWeatherMap API)
// =========================================================================
async function loadWeather(city = null) {
    try {
        const url = city ? `/api/weather?city=${encodeURIComponent(city)}` : `/api/weather`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        const tempEl = document.getElementById("weatherTemp");
        const feelsEl = document.getElementById("weatherFeelsLike");
        const condEl = document.getElementById("weatherCondition");
        const cityEl = document.getElementById("weatherCity");
        const humEl = document.getElementById("weatherHumidity");
        const humLabel = document.getElementById("weatherHumidityLabel");
        const humBar = document.getElementById("weatherHumidityBar");
        const windEl = document.getElementById("weatherWind");

        if (tempEl) tempEl.textContent = `${data.temperature}°C`;
        if (feelsEl) feelsEl.textContent = `Feels ${data.feels_like}°C`;
        if (condEl) condEl.textContent = (data.description || "").charAt(0).toUpperCase() + (data.description || "").slice(1);
        if (cityEl) cityEl.textContent = `${data.city}, ${data.country || 'IN'}`;
        if (humEl) humEl.textContent = `Humidity ${data.humidity}%`;
        if (humLabel) humLabel.textContent = `${data.humidity}%`;
        if (humBar) humBar.style.width = `${Math.min(100, Math.max(0, data.humidity))}%`;
        if (windEl) windEl.textContent = `Wind: ${data.wind_speed} m/s`;
    } catch (err) {
        console.warn("Weather fetch error:", err);
    }
}

async function searchCityWeather() {
    const input = document.getElementById("weatherCityInput");
    if (!input || !input.value.trim()) return;
    const city = input.value.trim();
    await loadWeather(city);
    handleTabSwitch("weather");
    showToast(`Loaded weather for ${city}`, "success");
}

// =========================================================================
// 1C. MUSIC PLAYER & ENTERTAINMENT STREAMING SERVICE
// =========================================================================
let isMusicPlaying = false;

function initMusicPlayer() {
    const audio = document.getElementById("novaAudioPlayer");
    const playPauseBtn = document.getElementById("playPauseTrackBtn");
    const nextBtn = document.getElementById("nextTrackBtn");
    const prevBtn = document.getElementById("prevTrackBtn");
    const volumeSlider = document.getElementById("playerVolume");
    const refreshWeatherBtn = document.getElementById("refreshWeatherBtn");

    if (refreshWeatherBtn) {
        refreshWeatherBtn.addEventListener("click", () => {
            loadWeather();
            showToast("Surrounding weather & metrics refreshed", "success");
        });
    }

    if (playPauseBtn && audio) {
        playPauseBtn.addEventListener("click", () => toggleMusicPlay());
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => nextTrack());
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => prevTrack());
    }

    if (volumeSlider && audio) {
        volumeSlider.addEventListener("input", (e) => {
            audio.volume = parseFloat(e.target.value);
        });
    }

    if (audio) {
        audio.addEventListener("play", () => {
            isMusicPlaying = true;
            updatePlayPauseButton(true);
        });
        audio.addEventListener("pause", () => {
            isMusicPlaying = false;
            updatePlayPauseButton(false);
        });
        audio.addEventListener("ended", () => {
            nextTrack();
        });
    }
}

async function toggleMusicPlay() {
    const audio = document.getElementById("novaAudioPlayer");
    if (!audio) return;

    if (audio.paused) {
        try {
            await audio.play();
            isMusicPlaying = true;
            updatePlayPauseButton(true);
            await fetch("/api/music/play", { method: "POST" });
        } catch (e) {
            console.warn("Audio autoplay policy:", e);
            audio.play().catch(() => {});
        }
    } else {
        audio.pause();
        isMusicPlaying = false;
        updatePlayPauseButton(false);
        await fetch("/api/music/pause", { method: "POST" });
    }
}

async function nextTrack() {
    try {
        const res = await fetch("/api/music/next", { method: "POST" });
        const data = await res.json();
        if (data.track) {
            updateTrackUI(data.track);
            const audio = document.getElementById("novaAudioPlayer");
            if (audio) {
                audio.src = data.track.audio_url;
                audio.play().catch(() => {});
                updatePlayPauseButton(true);
            }
        }
    } catch (e) {
        console.warn("Next track error:", e);
    }
}

async function prevTrack() {
    try {
        const res = await fetch("/api/music/prev", { method: "POST" });
        const data = await res.json();
        if (data.track) {
            updateTrackUI(data.track);
            const audio = document.getElementById("novaAudioPlayer");
            if (audio) {
                audio.src = data.track.audio_url;
                audio.play().catch(() => {});
                updatePlayPauseButton(true);
            }
        }
    } catch (e) {
        console.warn("Prev track error:", e);
    }
}

function updateTrackUI(track) {
    const title = document.getElementById("playerTrackTitle");
    const artist = document.getElementById("playerArtist");
    const album = document.getElementById("playerAlbum");
    const art = document.getElementById("playerCoverArt");

    if (title) title.textContent = track.title;
    if (artist) artist.textContent = track.artist;
    if (album) album.textContent = `${track.album} • ${track.genre || ''}`;
    if (art && track.cover_art) art.src = track.cover_art;
}

function updatePlayPauseButton(playing) {
    const badge = document.getElementById("playerPlayingBadge");
    const icon = document.getElementById("playPauseIcon");
    if (badge) {
        badge.textContent = playing ? "Playing 🎵" : "Ready";
        badge.className = playing
            ? "text-[9px] px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-800 font-mono font-bold animate-pulse"
            : "text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono";
    }
    if (icon) {
        icon.setAttribute("data-lucide", playing ? "pause" : "play");
        if (window.lucide) lucide.createIcons();
    }
}

function playTrackDirect(audioUrl, track) {
    const audio = document.getElementById("novaAudioPlayer");
    if (!audio) return;
    if (track) updateTrackUI(track);
    audio.src = audioUrl;
    audio.play().then(() => {
        isMusicPlaying = true;
        updatePlayPauseButton(true);
    }).catch(err => {
        console.warn("Playback interrupted:", err);
    });
}
// =========================================================================
function setVisualizerState(state) {
    if (visualizerTimeout) {
        clearTimeout(visualizerTimeout);
        visualizerTimeout = null;
    }
    if (!voiceOrb) return;

    voiceOrb.className = `state-${state} mb-3`;

    switch (state) {
        case "listening":
            assistantStatus.textContent = "Listening to your voice...";
            wave1.className = "absolute inset-0 rounded-full border-2 border-cyan-400/50 scale-100 pointer-events-none pulsing-wave-1";
            wave2.className = "absolute inset-0 rounded-full border-2 border-indigo-400/40 scale-100 pointer-events-none pulsing-wave-2";
            break;

        case "thinking":
            assistantStatus.textContent = "Thinking & Executing...";
            wave1.className = "absolute inset-0 rounded-full border-2 border-purple-400/30 opacity-0 scale-100 pointer-events-none";
            wave2.className = "absolute inset-0 rounded-full border-2 border-indigo-400/30 opacity-0 scale-100 pointer-events-none";
            break;

        case "speaking":
            assistantStatus.textContent = "Nova is speaking...";
            wave1.className = "absolute inset-0 rounded-full border-2 border-cyan-300 scale-100 pointer-events-none pulsing-wave-1";
            wave2.className = "absolute inset-0 rounded-full border-2 border-fuchsia-400 scale-100 pointer-events-none pulsing-wave-2";
            if (stopSpeechBtn) stopSpeechBtn.classList.remove("hidden");
            break;

        case "executing":
            assistantStatus.textContent = "Autonomous Mission Executing...";
            wave1.className = "absolute inset-0 rounded-full border-2 border-amber-400 scale-100 pointer-events-none pulsing-wave-1";
            wave2.className = "absolute inset-0 rounded-full border-2 border-cyan-400 scale-100 pointer-events-none pulsing-wave-2";
            break;

        case "paused":
            assistantStatus.textContent = "Paused • Awaiting Your Approval";
            wave1.className = "absolute inset-0 rounded-full border-2 border-amber-500/60 scale-100 pointer-events-none pulsing-wave-1";
            wave2.className = "absolute inset-0 rounded-full border-2 border-amber-500/30 opacity-0 scale-100 pointer-events-none";
            break;

        case "success":
            assistantStatus.textContent = "Action Executed & Verified";
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
            if (stopSpeechBtn) stopSpeechBtn.classList.add("hidden");
            break;
    }
}

// =========================================================================
// 3. SPEECH RECOGNITION (STT) & SYNTHESIS (TTS)
// =========================================================================
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
            setTimeout(() => setVisualizerState("idle"), 2000);
        };

        recognition.onend = () => {
            isListening = false;
            if (!isSpeaking) setVisualizerState("idle");
        };
    }
}

function toggleListening() {
    if (!recognition) {
        showToast("Speech recognition is not supported in this browser. Please type.", "info");
        return;
    }
    if (isListening) {
        recognition.stop();
    } else {
        stopSpeech();
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

function stopSpeech() {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    setVisualizerState("idle");
}

// =========================================================================
// 4. CHAT MESSAGE SUBMISSION & ACTIVE DISPATCH
// =========================================================================
async function submitMessage(text) {
    if ((!text || !text.trim()) && !pendingFile) return;

    const cleanMsg = (text || "").trim();
    userInput.value = "";

    // If file is attached, process multimodal upload
    if (pendingFile) {
        await submitFileUpload(pendingFile, cleanMsg);
        pendingFile = null;
        uploadPreviewChip.classList.add("hidden");
        return;
    }

    appendUserMessage(cleanMsg);
    setVisualizerState("thinking");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: cleanMsg,
                conversation_id: currentConversationId,
                latitude: currentCoords.lat,
                longitude: currentCoords.lng
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        setVisualizerState("success");
        setTimeout(() => handleAssistantResponse(data), 300);

    } catch (err) {
        console.error("Chat error:", err);
        setVisualizerState("error");
        appendAssistantMessage("I encountered a connection issue. Please verify the backend is running.", null);
        showToast("Backend connection error", "error");
    }
}

async function submitFileUpload(file, prompt) {
    appendUserMessage(`📎 Uploaded: **${file.name}**\n${prompt ? `"${prompt}"` : 'Analyzing document and extracting requirements...'}`);
    setVisualizerState("thinking");

    const formData = new FormData();
    formData.append("file", file);
    if (prompt) formData.append("prompt", prompt);

    try {
        const res = await fetch("/api/multimodal/upload", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Upload failed");

        setVisualizerState("success");
        renderMultimodalResult(data);
        showToast("File analyzed with Gemini vision", "success");
    } catch (err) {
        console.error("Upload error:", err);
        setVisualizerState("error");
        appendAssistantMessage(`File analysis failed: ${err.message}`, null);
        showToast(err.message, "error");
    }
}

function renderMultimodalResult(data) {
    const el = document.createElement("div");
    el.className = "flex items-start space-x-3 bg-slate-900/90 border border-cyan-500/40 p-4 rounded-2xl shadow-xl";

    let tasksHtml = "";
    if (data.proposed_tasks && data.proposed_tasks.length > 0) {
        tasksHtml = `
            <div class="mt-3 p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2">
                <div class="font-bold text-indigo-400 text-xs flex items-center justify-between">
                    <span>📋 Detected Requirements & Proposed Tasks (${data.proposed_tasks.length})</span>
                    <button onclick="approveSuggestedTasks(${escapeAttr(JSON.stringify(data.proposed_tasks))})" class="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition">
                        + Add All to Tasks
                    </button>
                </div>
                <div class="space-y-1">
                    ${data.proposed_tasks.map(t => `
                        <div class="flex justify-between items-center text-[11px] p-1.5 bg-slate-900 rounded border border-slate-800">
                            <div>
                                <span class="font-medium text-slate-200">${escapeHtml(t.title)}</span>
                                <span class="text-amber-400 font-mono ml-1.5">Due: ${t.due_date}</span>
                            </div>
                            <span class="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] uppercase">${t.priority}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    el.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center shrink-0">
            <i data-lucide="file-check" class="w-4 h-4"></i>
        </div>
        <div class="text-sm space-y-2 flex-1">
            <div class="font-semibold text-cyan-400 flex items-center justify-between">
                <span>Multimodal Analysis (${data.file_type})</span>
                <span class="text-[10px] text-slate-500 font-mono">${data.filename}</span>
            </div>
            <p class="text-slate-200 leading-relaxed">${escapeHtml(data.summary)}</p>
            ${tasksHtml}
        </div>
    `;

    chatFeed.appendChild(el);
    chatFeed.scrollTop = chatFeed.scrollHeight;
    if (window.lucide) lucide.createIcons();
}

async function approveSuggestedTasks(tasks) {
    let count = 0;
    for (const t of tasks) {
        try {
            await fetch("/api/planner/deadlines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: t.title,
                    due_date: t.due_date,
                    category: t.category || "Assignment",
                    priority: t.priority || "high",
                    estimated_hours: t.estimated_hours || 2.0
                })
            });
            count++;
        } catch (e) {
            console.error(e);
        }
    }
    loadDeadlines();
    loadProactiveInsights();
    showToast(`Added ${count} task(s) to submission tracker!`, "success");
}

function handleAssistantResponse(data) {
    if (data.mood) updateMoodUI(data.mood.primary_mood);

    // Speak aloud if voice speech provided
    if (data.speech_reply) {
        speakText(data.speech_reply);
    } else {
        setVisualizerState("idle");
    }

    // Render message
    appendAssistantMessage(data.display_reply || data.speech_reply || data.reply, data);

    // Handle Autonomous Mission Formulated
    if (data.type === "mission_plan" && data.mission_plan) {
        renderMissionReview(data.mission_plan);
    }

    // Handle Emergency SOS
    if (data.type === "emergency" || (data.mood && data.mood.is_emergency)) {
        triggerSOSModal(data.emergency_payload);
    }

    // Instantly refresh Smart Home sector in Right Panel & any open view!
    if (data.type === "smart_home" || data.smart_home) {
        loadSmartHome();
        showToast("Smart Home state synchronized!", "success");
    }

    // Instantly refresh Tasks & Deadlines in Right Panel!
    if (data.type === "deadlines" || data.deadlines || data.new_task) {
        loadDeadlines();
        loadProactiveInsights();
        showToast("Task tracker updated!", "success");
    }

    // Instantly sync Weather if weather response
    if (data.type === "weather" || data.weather) {
        if (data.weather) {
            const w = data.weather;
            const tempEl = document.getElementById("weatherTemp");
            const feelsEl = document.getElementById("weatherFeelsLike");
            const condEl = document.getElementById("weatherCondition");
            const cityEl = document.getElementById("weatherCity");
            const humEl = document.getElementById("weatherHumidity");
            const humLabel = document.getElementById("weatherHumidityLabel");
            const humBar = document.getElementById("weatherHumidityBar");
            const windEl = document.getElementById("weatherWind");

            if (tempEl) tempEl.textContent = `${w.temperature}°C`;
            if (feelsEl) feelsEl.textContent = `Feels ${w.feels_like}°C`;
            if (condEl) condEl.textContent = (w.description || "").charAt(0).toUpperCase() + (w.description || "").slice(1);
            if (cityEl) cityEl.textContent = `${w.city}, ${w.country || 'IN'}`;
            if (humEl) humEl.textContent = `Humidity ${w.humidity}%`;
            if (humLabel) humLabel.textContent = `${w.humidity}%`;
            if (humBar) humBar.style.width = `${Math.min(100, Math.max(0, w.humidity))}%`;
            if (windEl) windEl.textContent = `Wind: ${w.wind_speed} m/s`;
        } else {
            loadWeather();
        }
        showToast("Live surrounding weather synced!", "info");
    }

    // Instantly trigger and sync Music if music playback intent
    if (data.type === "music" || data.music) {
        const m = data.music;
        if (m && m.track) {
            updateTrackUI(m.track);
            const audio = document.getElementById("novaAudioPlayer");
            if (audio) {
                if (m.status === "paused") {
                    audio.pause();
                    updatePlayPauseButton(false);
                } else {
                    audio.src = m.track.audio_url;
                    audio.play().then(() => {
                        updatePlayPauseButton(true);
                    }).catch(err => {
                        console.warn("Autoplay notice:", err);
                    });
                }
            }
        }
    }

    // Instantly notify Alarms / Timers
    if (data.type === "alarms" || data.created_item) {
        showToast("Alarm / Timer updated!", "success");
    }

    if (data.type === "proactive_insights") {
        loadProactiveInsights();
    }
}

// =========================================================================
// 5. SIGNATURE AUTONOMOUS MISSION WORKFLOW
// =========================================================================
function renderMissionReview(mission) {
    activeMissionId = mission.mission_id;
    missionContainer.classList.remove("hidden");
    missionGoalText.textContent = `Goal: "${mission.goal}"`;
    missionStatusBadge.textContent = "Pending Review";
    missionStatusBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 font-mono font-semibold";
    missionProgressBar.style.width = "0%";
    missionProgressText.textContent = "0%";

    setVisualizerState("paused");
    renderMissionSteps(mission.steps);
}

function renderMissionSteps(steps) {
    missionStepsList.innerHTML = steps.map((s, idx) => `
        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between space-x-2" data-step-index="${idx}">
            <div class="flex items-start space-x-2 flex-1">
                <span class="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                    ${idx + 1}
                </span>
                <div class="space-y-0.5 flex-1">
                    <input type="text" value="${escapeAttr(s.title)}" class="w-full bg-transparent text-slate-200 font-medium text-xs focus:outline-none focus:border-b focus:border-cyan-400" onchange="updateStepTitle(${idx}, this.value)">
                    <div class="flex items-center space-x-2 text-[10px] text-slate-500">
                        <span class="font-mono text-cyan-400">${s.tool_name}</span>
                        <span>•</span>
                        <span class="px-1.5 py-0.2 rounded ${s.required_permission === 'state_changing' ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-400'}">${s.required_permission}</span>
                    </div>
                </div>
            </div>
            <button onclick="removeStep(${idx})" class="text-slate-500 hover:text-red-400 p-1" title="Remove step">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

async function approveAndExecuteMission() {
    if (!activeMissionId) return;

    missionStatusBadge.textContent = "Executing...";
    missionStatusBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-semibold";
    setVisualizerState("executing");
    showToast("Autonomous Mission executing...", "info");

    try {
        const res = await fetch(`/api/missions/${activeMissionId}/approve`, {
            method: "POST"
        });
        const data = await res.json();

        if (data.status === "completed") {
            setVisualizerState("success");
            missionStatusBadge.textContent = "Completed & Verified";
            missionStatusBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-semibold";
            missionProgressBar.style.width = "100%";
            missionProgressText.textContent = "100%";

            showToast("Mission completed and all artifacts verified!", "success");
            appendAssistantMessage(`🎉 **Autonomous Mission Accomplished!**\n\n${data.summary}\n\nAll tasks and records have been committed to SQLite persistent storage.`, null);
            loadDeadlines();
            loadSmartHome();
            loadProactiveInsights();
        } else {
            setVisualizerState("error");
            missionStatusBadge.textContent = "Partial Warnings";
            showToast("Mission completed with some warnings", "error");
        }
    } catch (e) {
        console.error("Mission execution error:", e);
        setVisualizerState("error");
        showToast("Error executing mission", "error");
    }
}

async function cancelActiveMission() {
    if (!activeMissionId) return;
    await fetch(`/api/missions/${activeMissionId}/cancel`, { method: "POST" });
    missionContainer.classList.add("hidden");
    activeMissionId = null;
    setVisualizerState("idle");
    showToast("Mission cancelled.", "info");
}

// =========================================================================
// 6. CHAT RENDERING HELPERS
// =========================================================================
function appendUserMessage(text) {
    const el = document.createElement("div");
    el.className = "flex items-start justify-end space-x-2";
    el.innerHTML = `
        <div class="bg-cyan-600/30 border border-cyan-500/40 text-cyan-100 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[85%] shadow-md">
            ${formatMarkdown(text)}
        </div>
    `;
    chatFeed.appendChild(el);
    chatFeed.scrollTop = chatFeed.scrollHeight;
}

function appendAssistantMessage(text, payload) {
    const el = document.createElement("div");
    el.className = "flex items-start space-x-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg";

    let extraHtml = "";

    // ONLY render media cards if media is explicitly present!
    if (payload && payload.media) {
        const m = payload.media;
        if (m.primary_image || (m.gallery && m.gallery.length > 0)) {
            const rawImg = m.primary_image || (m.gallery && m.gallery[0] ? m.gallery[0] : null);
            const imgUrl = typeof rawImg === 'string' ? rawImg : (rawImg && rawImg.url ? rawImg.url : null);
            if (imgUrl) {
                extraHtml += `
                    <div class="mt-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950">
                        <img src="${imgUrl}" alt="Visual information" class="w-full max-h-56 object-cover" onerror="this.style.display='none'">
                        <div class="p-2 text-[11px] text-slate-400 flex justify-between items-center">
                            <span>📷 ${escapeHtml(m.title || "Visual Reference")}</span>
                            ${m.source_url ? `<a href="${m.source_url}" target="_blank" class="text-cyan-400 hover:underline">Wiki Source &rarr;</a>` : ''}
                        </div>
                    </div>
                `;
            }
        }
        if (m.videos && m.videos.length > 0) {
            extraHtml += `
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
            ${extraHtml}
        </div>
    `;

    chatFeed.appendChild(el);
    chatFeed.scrollTop = chatFeed.scrollHeight;
    if (window.lucide) lucide.createIcons();
}

// =========================================================================
// 7. TASK & SUBMISSION DEADLINE FUNCTIONS
// =========================================================================
async function loadDeadlines() {
    try {
        const res = await fetch("/api/planner/deadlines");
        const data = await res.json();
        const items = data.deadlines || [];

        if (deadlinesList) {
            if (items.length === 0) {
                deadlinesList.innerHTML = `<div class="text-slate-500 text-center py-2">No deadlines tracked. Click + to add!</div>`;
                return;
            }

            deadlinesList.innerHTML = items.map(d => `
                <div class="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <div class="truncate mr-2">
                        <p class="font-medium text-slate-200 truncate ${d.status === 'completed' ? 'line-through text-slate-500' : ''}">${escapeHtml(d.title)}</p>
                        <span class="text-[10px] ${d.urgency === 'urgent' || d.urgency === 'overdue' ? 'text-red-400' : d.urgency === 'high' ? 'text-amber-400' : 'text-slate-400'} font-mono">${d.countdown}</span>
                    </div>
                    <div class="flex items-center space-x-1 shrink-0">
                        <button onclick="toggleCompleteDeadline(${d.id})" class="p-1 text-slate-400 hover:text-emerald-400" title="Mark Completed">
                            <i data-lucide="${d.status === 'completed' ? 'check-circle' : 'circle'}" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="deleteDeadline(${d.id})" class="p-1 text-slate-400 hover:text-red-400" title="Delete Task">
                            <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            if (window.lucide) lucide.createIcons();
        }
    } catch (e) {
        console.error("Error loading deadlines:", e);
    }
}

async function toggleCompleteDeadline(id) {
    await fetch(`/api/planner/deadlines/${id}/complete`, { method: "POST" });
    loadDeadlines();
    loadProactiveInsights();
    showToast("Task completed!", "success");
}

async function deleteDeadline(id) {
    await fetch(`/api/planner/deadlines/${id}`, { method: "DELETE" });
    loadDeadlines();
    loadProactiveInsights();
    showToast("Task deleted.", "info");
}

// =========================================================================
// 8. SMART HOME IOT & POWER LOAD FUNCTIONS
// =========================================================================
async function loadSmartHome() {
    try {
        const [devRes, energyRes] = await Promise.all([
            fetch("/api/devices"),
            fetch("/api/energy")
        ]);
        const devs = await devRes.json();
        const energy = await energyRes.json();

        if (powerLoadBadge) powerLoadBadge.textContent = `${energy.estimated_current_watts} W Load`;
        if (energyTipSummary) energyTipSummary.textContent = `Tip: Switch off idle devices to save ~15% power`;

        if (smartDevicesList) {
            smartDevicesList.innerHTML = Object.values(devs).map(d => `
                <div class="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                        <span class="font-medium text-slate-200">${escapeHtml(d.name)}</span>
                        <span class="text-[10px] text-slate-500 block">${d.watts}W • ${escapeHtml(d.room)}</span>
                    </div>
                    <button onclick="toggleDevice('${d.id}', ${!d.on})" class="px-2.5 py-1 rounded text-[10px] font-bold transition ${d.on ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}">
                        ${d.on ? 'ON' : 'OFF'}
                    </button>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Error loading smart home:", e);
    }
}

async function toggleDevice(deviceId, targetState) {
    try {
        const res = await fetch("/api/device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device: deviceId, on: targetState })
        });
        const data = await res.json();
        loadSmartHome();
        showToast(data.note || "Device updated", "success");
    } catch (e) {
        showToast("Failed to switch device", "error");
    }
}

// =========================================================================
// 9. PROACTIVE LIFE INSIGHTS
// =========================================================================
async function loadProactiveInsights() {
    try {
        const res = await fetch("/api/proactive/insights");
        const data = await res.json();
        const items = data.insights || [];

        if (proactiveContent) {
            if (items.length === 0) {
                proactiveContent.innerHTML = `<p class="text-slate-400">All schedules and power loads are balanced. No conflicts detected.</p>`;
                return;
            }
            const ins = items[0];
            proactiveContent.innerHTML = `
                <div class="space-y-1">
                    <p class="font-bold text-indigo-300">${escapeHtml(ins.title)}</p>
                    <p class="text-[11px] text-slate-300">${escapeHtml(ins.what_noticed)}</p>
                    <p class="text-[10px] text-slate-400 italic">${escapeHtml(ins.why_it_matters)}</p>
                    <div class="pt-1 flex justify-end">
                        <button onclick="quickAsk('Resolve conflict: ${escapeAttr(ins.recommended_action)}')" class="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-[10px] rounded border border-indigo-500/40 font-medium">
                            ${escapeHtml(ins.action_button || "Take Action")}
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.error("Error loading proactive insights:", e);
    }
}

// Digital Wellbeing & Phone Limits
async function loadWellbeing() {
    try {
        const res = await fetch("/api/wellbeing/status");
        const data = await res.json();
        const screenTimeCount = document.getElementById("screenTimeCount");
        const screenTimeBar = document.getElementById("screenTimeBar");
        const focusModeToggle = document.getElementById("focusModeToggle");
        if (screenTimeCount && data.today_screen_time_formatted) {
            screenTimeCount.textContent = `${data.today_screen_time_formatted} / 3h`;
        }
        if (screenTimeBar && data.screen_time_percent !== undefined) {
            screenTimeBar.style.width = `${Math.min(data.screen_time_percent, 100)}%`;
        }
        if (focusModeToggle && data.focus_mode !== undefined) {
            focusModeToggle.textContent = `Focus: ${data.focus_mode ? 'ON' : 'OFF'}`;
            focusModeToggle.className = `text-[11px] px-2.5 py-0.5 rounded-full border ${data.focus_mode ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'}`;
        }
    } catch (e) {
        console.warn("Wellbeing load warning:", e);
    }
}

// =========================================================================
// 10. CONVERSATION SESSIONS & THREADS
// =========================================================================
async function loadConversations() {
    try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        const list = data.conversations || [];

        if (conversationsList) {
            conversationsList.innerHTML = list.map(c => `
                <button onclick="switchConversation('${c.id}')" class="w-full text-left p-1.5 rounded-lg truncate transition flex items-center justify-between ${c.id === currentConversationId ? 'bg-cyan-950/80 text-cyan-300 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
                    <span class="truncate">${escapeHtml(c.title)}</span>
                    <span class="text-[10px] text-slate-500 ml-1 font-mono">${c.message_count || 0}</span>
                </button>
            `).join('');
        }
    } catch (e) {
        console.error("Error loading conversations:", e);
    }
}

async function switchConversation(id) {
    currentConversationId = id;
    loadConversations();
    chatFeed.innerHTML = "";
    try {
        const res = await fetch(`/api/conversations/${id}/messages`);
        const data = await res.json();
        for (const m of data.messages || []) {
            if (m.role === "user") {
                appendUserMessage(m.content);
            } else {
                appendAssistantMessage(m.content, m.payload);
            }
        }
    } catch (e) {
        console.error("Error loading thread messages:", e);
    }
}

// =========================================================================
// 11. MAP & GEOLOCATION
// =========================================================================
function initMap() {
    try {
        if (typeof L === "undefined") return;
        map = L.map('map', { zoomControl: false }).setView([currentCoords.lat, currentCoords.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `<div style="width:14px;height:14px;background:#06b6d4;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px #06b6d4;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        userMarker = L.marker([currentCoords.lat, currentCoords.lng], { icon: userIcon }).addTo(map);
    } catch (e) {
        console.warn("Map init error:", e);
    }
}

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
                syncBackendLocation(currentCoords.lat, currentCoords.lng, 100);
            },
            { enableHighAccuracy: true, timeout: 6000 }
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
        console.error(e);
    }
}

// =========================================================================
// 12. EMERGENCY SOS & AUDIO SIREN
// =========================================================================
function triggerSOSModal(payload) {
    if (!sosModal) return;
    sosModal.classList.remove("hidden");
    if (sosCoordsBox) {
        sosCoordsBox.textContent = `Lat: ${currentCoords.lat.toFixed(5)}, Lng: ${currentCoords.lng.toFixed(5)}`;
    }
    startSiren();
}

function startSiren() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        sirenAudioContext = new AudioCtx();
        sirenOscillator = sirenAudioContext.createOscillator();
        const gain = sirenAudioContext.createGain();

        sirenOscillator.type = "sawtooth";
        sirenOscillator.frequency.setValueAtTime(650, sirenAudioContext.currentTime);
        sirenOscillator.frequency.exponentialRampToValueAtTime(950, sirenAudioContext.currentTime + 0.5);

        gain.gain.setValueAtTime(0.15, sirenAudioContext.currentTime);

        sirenOscillator.connect(gain);
        gain.connect(sirenAudioContext.destination);
        sirenOscillator.start();
    } catch (e) {
        console.warn("Audio siren error:", e);
    }
}

function stopSiren() {
    try {
        if (sirenOscillator) sirenOscillator.stop();
        if (sirenAudioContext) sirenAudioContext.close();
    } catch (e) {}
}

// =========================================================================
// 13. SIDEBAR TABS: FULL INTERACTIVE VIEWS FOR ALL FEATURES
// =========================================================================
function openModal(title, iconHtml, contentHtml) {
    const modal = document.getElementById("genericModal");
    const heading = document.getElementById("genericModalHeading");
    const body = document.getElementById("genericModalBody");
    if (!modal) return;
    if (heading) heading.textContent = title;
    if (body) body.innerHTML = contentHtml;
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    if (window.lucide) lucide.createIcons();
}

function closeModal() {
    const modal = document.getElementById("genericModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.style.display = "none";
}

async function handleTabSwitch(tab) {
    try {
        if (tab === "chat") {
            closeModal();
            if (userInput) userInput.focus();
            return;
        }

        // --- NEW CAPABILITIES ---

        // 1. Weather & Surroundings Tab
        if (tab === "weather") {
            const res = await fetch("/api/weather");
            const w = await res.json();
            openModal(
                "Surrounding Weather & Environmental Conditions",
                "",
                `
                <div class="space-y-4">
                    <!-- City Search Bar -->
                    <div class="flex space-x-2">
                        <input type="text" id="weatherCityInput" placeholder="Check another city (e.g. London, Tokyo, New York, Delhi)..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400">
                        <button onclick="searchCityWeather()" class="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition">
                            <i data-lucide="search" class="w-3.5 h-3.5"></i>
                            <span>Check</span>
                        </button>
                    </div>

                    <!-- Main Surrounding Metric Card -->
                    <div class="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/40 rounded-2xl border border-sky-500/30 space-y-3">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="text-[11px] text-sky-400 font-mono uppercase tracking-wider">Current Location</span>
                                <h3 class="text-xl font-bold text-white flex items-center space-x-2">
                                    <span>${escapeHtml(w.city)}</span>
                                    <span class="text-xs px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/60 font-mono">${w.country || 'IN'}</span>
                                </h3>
                                <p class="text-xs text-slate-400 capitalize mt-0.5">${escapeHtml(w.description)}</p>
                            </div>
                            <div class="text-right">
                                <div class="text-4xl font-black text-white font-mono">${w.temperature}°C</div>
                                <div class="text-xs text-slate-400 font-mono">Feels like ${w.feels_like}°C</div>
                            </div>
                        </div>

                        <!-- Metrics Grid -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                            <div class="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-slate-400 block">Relative Humidity</span>
                                <span class="text-sm font-bold text-sky-400 font-mono">${w.humidity}%</span>
                            </div>
                            <div class="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-slate-400 block">Wind Velocity</span>
                                <span class="text-sm font-bold text-cyan-400 font-mono">${w.wind_speed} m/s</span>
                            </div>
                            <div class="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-slate-400 block">Atmospheric Pressure</span>
                                <span class="text-sm font-bold text-indigo-400 font-mono">${w.pressure} hPa</span>
                            </div>
                            <div class="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-slate-400 block">Day High / Low</span>
                                <span class="text-sm font-bold text-emerald-400 font-mono">${w.temp_max}° / ${w.temp_min}°</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs text-slate-400">
                        <span>⚡ Live Weather Powered by OpenWeatherMap API</span>
                        <button onclick="loadWeather(); handleTabSwitch('weather');" class="text-sky-400 hover:underline flex items-center space-x-1">
                            <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                            <span>Sync Now</span>
                        </button>
                    </div>
                </div>
                `
            );
        }

        // 2. Music Player Tab
        else if (tab === "music") {
            const res = await fetch("/api/music/state");
            const state = await res.json();
            const cur = state.current_track || {};
            const list = state.playlist || [];

            openModal(
                "Favourite Songs & Music Player",
                "",
                `
                <div class="space-y-4">
                    <!-- Now Playing Spotlight -->
                    <div class="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950/40 rounded-2xl border border-pink-500/30 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <img src="${cur.cover_art || ''}" class="w-24 h-24 rounded-2xl object-cover border border-slate-800 shadow-xl shadow-pink-900/20 shrink-0">
                        <div class="flex-1 text-center sm:text-left min-w-0">
                            <span class="px-2 py-0.5 rounded-full bg-pink-950 text-pink-400 border border-pink-800 text-[10px] font-mono font-semibold">
                                ${isMusicPlaying ? 'Now Playing 🎵' : 'Ready to Stream'}
                            </span>
                            <h3 class="text-base font-bold text-white truncate mt-1">${escapeHtml(cur.title || 'Favourite Track')}</h3>
                            <p class="text-xs text-pink-300/90 truncate">${escapeHtml(cur.artist || '')}</p>
                            <p class="text-[11px] text-slate-500 truncate">${escapeHtml(cur.album || '')} • ${cur.duration || ''}</p>

                            <!-- Controls -->
                            <div class="flex items-center justify-center sm:justify-start space-x-2 mt-3">
                                <button onclick="prevTrack(); setTimeout(() => handleTabSwitch('music'), 200);" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300">
                                    <i data-lucide="skip-back" class="w-4 h-4"></i>
                                </button>
                                <button onclick="toggleMusicPlay(); setTimeout(() => handleTabSwitch('music'), 200);" class="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-pink-600/30">
                                    <i data-lucide="${isMusicPlaying ? 'pause' : 'play'}" class="w-4 h-4"></i>
                                    <span>${isMusicPlaying ? 'Pause' : 'Play Track'}</span>
                                </button>
                                <button onclick="nextTrack(); setTimeout(() => handleTabSwitch('music'), 200);" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300">
                                    <i data-lucide="skip-forward" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Playlist -->
                    <div class="space-y-2">
                        <h4 class="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between">
                            <span>Curated Favourite Playlist</span>
                            <span class="text-[10px] text-slate-500 font-mono">${list.length} Tracks</span>
                        </h4>
                        <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            ${list.map((t, idx) => `
                                <div class="p-2.5 rounded-xl bg-slate-950 border ${t.title === cur.title ? 'border-pink-500/50 bg-pink-950/20' : 'border-slate-800'} flex items-center justify-between hover:border-slate-700 transition cursor-pointer" onclick="playTrackDirect('${t.audio_url}', ${escapeAttr(JSON.stringify(t))}); setTimeout(() => handleTabSwitch('music'), 200);">
                                    <div class="flex items-center space-x-3 truncate">
                                        <span class="text-xs font-mono text-slate-500 w-4">${idx + 1}</span>
                                        <img src="${t.cover_art}" class="w-8 h-8 rounded-lg object-cover">
                                        <div class="truncate">
                                            <p class="font-bold text-slate-200 text-xs truncate">${escapeHtml(t.title)}</p>
                                            <p class="text-[10px] text-slate-400 truncate">${escapeHtml(t.artist)}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-2 shrink-0">
                                        <span class="text-[10px] text-slate-500 font-mono">${t.duration}</span>
                                        <button class="p-1 text-pink-400 hover:text-white"><i data-lucide="play-circle" class="w-4 h-4"></i></button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                `
            );
        }

        // 3. Smart Alarms & Timers Tab
        else if (tab === "alarms") {
            const res = await fetch("/api/alarms");
            const data = await res.json();
            const alarms = data.alarms || [];
            const timers = data.timers || [];

            openModal(
                "Smart Alarms, Timers & Reminders",
                "",
                `
                <div class="space-y-4">
                    <!-- Action Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <!-- Set Timer Form -->
                        <div class="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-2.5">
                            <h4 class="font-bold text-amber-400 text-xs flex items-center space-x-1.5">
                                <i data-lucide="timer" class="w-4 h-4"></i>
                                <span>Countdown Timer</span>
                            </h4>
                            <div class="flex space-x-1.5">
                                <input type="number" id="quickTimerMin" value="5" min="1" max="120" class="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white text-center font-mono">
                                <input type="text" id="quickTimerLabel" placeholder="Label (e.g. Focus Sprint)" class="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white">
                            </div>
                            <div class="flex space-x-1 pt-1">
                                <button onclick="document.getElementById('quickTimerMin').value=1" class="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white">1m</button>
                                <button onclick="document.getElementById('quickTimerMin').value=5" class="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white">5m</button>
                                <button onclick="document.getElementById('quickTimerMin').value=15" class="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white">15m</button>
                                <button onclick="document.getElementById('quickTimerMin').value=25" class="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white">25m Pomodoro</button>
                            </div>
                            <button onclick="submitNewTimer()" class="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition">
                                Start Countdown Timer
                            </button>
                        </div>

                        <!-- Set Alarm Form -->
                        <div class="p-3.5 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-2.5">
                            <h4 class="font-bold text-indigo-400 text-xs flex items-center space-x-1.5">
                                <i data-lucide="alarm-clock" class="w-4 h-4"></i>
                                <span>Smart Alarm</span>
                            </h4>
                            <input type="time" id="quickAlarmTime" value="07:00" class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white text-center font-mono">
                            <input type="text" id="quickAlarmLabel" placeholder="Alarm name (e.g. Morning Wakeup)" class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white">
                            <button onclick="submitNewAlarm()" class="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition">
                                Schedule Smart Alarm
                            </button>
                        </div>
                    </div>

                    <!-- Active Timers & Alarms List -->
                    <div class="space-y-2">
                        <h4 class="font-bold text-slate-200 text-xs">Active Timers & Alarms (${timers.length + alarms.length})</h4>
                        <div class="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                            ${[...timers, ...alarms].length === 0 ? '<p class="text-slate-500 text-center py-4">No alarms or timers active.</p>' : [...timers, ...alarms].map(item => `
                                <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                                    <div class="flex items-center space-x-2.5">
                                        <i data-lucide="${item.item_type === 'timer' ? 'timer' : 'alarm-clock'}" class="w-4 h-4 ${item.item_type === 'timer' ? 'text-amber-400' : 'text-indigo-400'}"></i>
                                        <div>
                                            <p class="font-bold text-slate-200">${escapeHtml(item.label)}</p>
                                            <span class="text-[10px] text-slate-400 font-mono">${item.target_time}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-mono ${item.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}">${item.status}</span>
                                        <button onclick="deleteAlarmItem(${item.id})" class="p-1 text-slate-500 hover:text-red-400"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                `
            );
        }

        // 4. Daily Briefing & News Tab
        else if (tab === "briefing") {
            const res = await fetch("/api/briefing");
            const b = await res.json();
            const news = b.news || [];
            const weather = b.weather || {};

            openModal(
                "Executive Daily Briefing & News",
                "",
                `
                <div class="space-y-4">
                    <!-- Spoken Briefing Audio Card -->
                    <div class="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 rounded-2xl border border-emerald-500/30 space-y-2.5">
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                                <i data-lucide="sparkles" class="w-4 h-4"></i>
                                <span>NOVA Executive Briefing</span>
                            </span>
                            <button onclick="speakText(${escapeAttr(JSON.stringify(b.spoken_briefing))})" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-md shadow-emerald-600/20">
                                <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
                                <span>Listen Aloud</span>
                            </button>
                        </div>
                        <p class="text-xs text-slate-200 leading-relaxed">${escapeHtml(b.spoken_briefing)}</p>
                    </div>

                    <!-- Surrounding Weather Snapshot -->
                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                            <span class="text-slate-400">Surrounding Climate</span>
                            <div class="font-bold text-white text-sm mt-0.5">${weather.city || 'Local'}: ${weather.temperature || '--'}°C • ${weather.description || ''}</div>
                        </div>
                        <div class="text-right">
                            <span class="text-sky-400 font-mono font-bold">${weather.humidity || '--'}% Humidity</span>
                        </div>
                    </div>

                    <!-- Google News Top Headlines -->
                    <div class="space-y-2">
                        <h4 class="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between">
                            <span>Live Global Headlines</span>
                            <span class="text-[10px] text-slate-500 font-mono">Google News RSS</span>
                        </h4>
                        <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
                            ${news.map(n => `
                                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center hover:border-slate-700 transition">
                                    <div class="pr-2">
                                        <h5 class="font-bold text-slate-200 text-xs">${escapeHtml(n.title)}</h5>
                                        <span class="text-[10px] text-emerald-400 font-mono">${escapeHtml(n.source)}</span>
                                    </div>
                                    <a href="${n.link}" target="_blank" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] font-semibold shrink-0">
                                        Read &rarr;
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                `
            );
        }

        // 2. Tasks & Deadlines Tab
        else if (tab === "planner") {
        const res = await fetch("/api/planner/deadlines");
        const data = await res.json();
        const tasks = data.deadlines || [];

        openModal(
            "Tasks & Deadlines Command Center",
            "",
            `
            <div class="space-y-3">
                <div class="flex justify-between items-center">
                    <p class="text-slate-400">Tracked assignments and deadlines (SQLite backed):</p>
                    <button onclick="document.getElementById('deadlineModal').classList.remove('hidden')" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium">
                        + Add New Task
                    </button>
                </div>
                <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                    ${tasks.length === 0 ? '<p class="text-slate-500 text-center py-4">No tasks tracked. Click + Add New Task above!</p>' : tasks.map(t => `
                        <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                            <div>
                                <p class="font-medium text-slate-200 ${t.status === 'completed' ? 'line-through text-slate-500' : ''}">${escapeHtml(t.title)}</p>
                                <div class="flex items-center space-x-2 text-[10px]">
                                    <span class="${t.urgency === 'urgent' || t.urgency === 'overdue' ? 'text-red-400' : 'text-amber-400'} font-mono">${t.countdown}</span>
                                    <span>•</span>
                                    <span class="text-slate-400">${t.category}</span>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button onclick="toggleCompleteDeadline(${t.id}); handleTabSwitch('planner');" class="p-1 text-slate-400 hover:text-emerald-400" title="Toggle Complete">
                                    <i data-lucide="${t.status === 'completed' ? 'check-circle' : 'circle'}" class="w-4 h-4"></i>
                                </button>
                                <button onclick="deleteDeadline(${t.id}); handleTabSwitch('planner');" class="p-1 text-slate-400 hover:text-red-400" title="Delete">
                                    <i data-lucide="trash" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            `
        );
    }

    // 3. Smart Home IoT Tab
    else if (tab === "smarthome") {
        const [devRes, energyRes] = await Promise.all([
            fetch("/api/devices"),
            fetch("/api/energy")
        ]);
        const devs = await devRes.json();
        const energy = await energyRes.json();

        openModal(
            "Smart Home IoT & Energy Hub",
            "",
            `
            <div class="space-y-4">
                <div class="p-3 bg-slate-950 rounded-xl border border-amber-500/30 flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-amber-400 text-sm">Real-Time Household Power Load</h4>
                        <p class="text-slate-400 text-xs">Estimated consumption across active appliances.</p>
                    </div>
                    <span class="px-3 py-1 bg-amber-950 text-amber-300 font-mono text-sm font-bold rounded-lg border border-amber-800">
                        ${energy.estimated_current_watts} Watts
                    </span>
                </div>

                <div class="space-y-2">
                    <h4 class="font-bold text-slate-200">Connected Appliances</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${Object.values(devs).map(d => `
                            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                                <div>
                                    <span class="font-bold text-slate-200">${escapeHtml(d.name)}</span>
                                    <span class="text-[10px] text-slate-500 block">${d.watts}W • ${escapeHtml(d.room)}</span>
                                </div>
                                <button onclick="toggleDevice('${d.id}', ${!d.on}); handleTabSwitch('smarthome');" class="px-3 py-1 rounded text-xs font-bold transition ${d.on ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'bg-slate-800 text-slate-400 hover:text-white'}">
                                    ${d.on ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="flex space-x-2 pt-2">
                    <button onclick="toggleAllDevices(false)" class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">
                        Power Down All Devices
                    </button>
                    <button onclick="toggleAllDevices(true)" class="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold">
                        Turn On All Devices
                    </button>
                </div>
            </div>
            `
        );
    }

    // 4. Knowledge & Files Tab
    else if (tab === "knowledge") {
        const res = await fetch("/api/knowledge/files");
        const data = await res.json();
        const files = data.files || [];

        openModal(
            "Knowledge Space & Uploaded Documents",
            "",
            `
            <div class="space-y-4">
                <div class="p-4 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                    <i data-lucide="upload-cloud" class="w-8 h-8 text-cyan-400 mx-auto"></i>
                    <p class="text-xs text-slate-300">Upload assignment briefs, syllabus, or screenshots for instant AI requirement extraction.</p>
                    <button onclick="document.getElementById('fileInput').click()" class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg font-medium">
                        Select Document
                    </button>
                </div>

                <div class="space-y-2">
                    <h4 class="font-bold text-slate-200">Processed Files (${files.length})</h4>
                    <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                        ${files.length === 0 ? '<p class="text-slate-500 text-center py-4">No files uploaded yet.</p>' : files.map(f => `
                            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-slate-200 text-xs">${escapeHtml(f.filename)}</span>
                                    <span class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 text-[10px] font-mono">${f.file_type} • ${f.file_size_formatted}</span>
                                </div>
                                <p class="text-[11px] text-slate-400">${escapeHtml(f.summary || 'Summary ready')}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            `
        );
    }

    // 5. Memory & Twin Tab
    else if (tab === "memory") {
        const res = await fetch("/api/memory");
        const data = await res.json();
        const mems = data.memories || [];
        openModal(
            "User-Controlled Persistent Memory",
            "",
            `
            <div class="space-y-3">
                <div class="flex space-x-2">
                    <input type="text" id="newMemoryInput" placeholder="Add a fact or routine (e.g. Prefers deep work between 9 AM and 12 PM)" class="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400">
                    <button onclick="addNewMemory()" class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold">
                        Save Memory
                    </button>
                </div>
                <div class="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>Stored facts & preferences (${mems.length})</span>
                    <button onclick="clearAllMemories()" class="text-red-400 hover:underline">Clear All</button>
                </div>
                <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    ${mems.length === 0 ? '<p class="text-slate-500 text-center py-4">No memories stored.</p>' : mems.map(m => `
                        <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-start">
                            <div>
                                <p class="text-slate-200 font-medium">${escapeHtml(m.content)}</p>
                                <span class="text-[10px] text-cyan-400 uppercase font-mono">${m.category}</span>
                            </div>
                            <button onclick="deleteMemory(${m.id})" class="text-slate-500 hover:text-red-400 p-1"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
                        </div>
                    `).join('')}
                </div>
            </div>
            `
        );
    }

    // 6. Activity & Trust Center Tab
    else if (tab === "activity") {
        const res = await fetch("/api/activity/logs");
        const data = await res.json();
        const logs = data.logs || [];
        openModal(
            "Live Activity Inspector & Trust Center",
            "",
            `
            <div class="space-y-3">
                <div class="p-3 bg-slate-950 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                    <div>
                        <h4 class="font-bold text-emerald-400">Trust Center: Verified Execution</h4>
                        <p class="text-[11px] text-slate-400">All tools validated with postcondition verifiers. Secrets never logged.</p>
                    </div>
                    <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono">100% Policy Pass</span>
                </div>
                <div class="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    ${logs.length === 0 ? '<p class="text-slate-500 text-center py-4">No recent tool logs.</p>' : logs.map(l => `
                        <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                            <div>
                                <span class="font-mono text-cyan-400 font-bold">${l.tool_name}</span>
                                <span class="text-slate-400 ml-2">${escapeHtml(l.summary || '')}</span>
                            </div>
                            <div class="flex items-center space-x-2 shrink-0">
                                <span class="text-[10px] text-slate-500 font-mono">${l.duration_ms}ms</span>
                                <span class="px-1.5 py-0.5 rounded text-[10px] ${l.verified ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400'}">${l.status}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            `
        );
    }

    // 7. What-If Simulator Tab
    else if (tab === "whatif") {
        openModal(
            "What-If Schedule Simulator",
            "",
            `
            <div class="space-y-3">
                <p class="text-slate-300">Simulate reallocating tasks and shifting deadlines to test trade-offs without mutating live data.</p>
                <div class="p-3 bg-slate-950 rounded-xl border border-purple-500/40 space-y-2">
                    <button onclick="runWhatIfDemo()" class="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-semibold text-xs transition">
                        Run Workload Balancing Simulation
                    </button>
                </div>
                <div id="whatIfResultArea" class="text-xs space-y-2"></div>
            </div>
            `
        );
    }

    // 8. Personal Skills Tab
    else if (tab === "skills") {
        const res = await fetch("/api/skills");
        const data = await res.json();
        const skills = data.skills || [];
        openModal(
            "Personal Skill Builder & Workflows",
            "",
            `
            <div class="space-y-3">
                <p class="text-slate-400">Custom automated multi-step routines saved in natural language:</p>
                <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
                    ${skills.map(s => `
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                            <div>
                                <h4 class="font-bold text-slate-200">${escapeHtml(s.title)}</h4>
                                <p class="text-[11px] text-slate-400">${escapeHtml(s.description)}</p>
                            </div>
                            <button onclick="runSkill(${s.id})" class="px-3 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-200 rounded text-xs font-semibold border border-amber-500/40 transition">
                                Trigger Skill
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            `
        );
    }
    } catch (err) {
        console.error("Error switching tab:", err);
        showToast("Error loading panel: " + (err.message || err), "error");
    }
}

async function launchCustomMission() {
    const input = document.getElementById("customMissionGoal");
    if (!input || !input.value.trim()) return;
    const goal = input.value.trim();
    genericModal.classList.add("hidden");
    quickAsk(goal);
}

async function submitNewTimer() {
    const minInput = document.getElementById("quickTimerMin");
    const labelInput = document.getElementById("quickTimerLabel");
    const minutes = minInput ? parseFloat(minInput.value) || 5 : 5;
    const label = (labelInput && labelInput.value.trim()) ? labelInput.value.trim() : "Countdown Timer";

    try {
        const res = await fetch("/api/timers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minutes, label })
        });
        const data = await res.json();
        showToast(`Timer set for ${minutes} min!`, "success");
        handleTabSwitch("alarms");
    } catch (e) {
        showToast("Error creating timer", "error");
    }
}

async function submitNewAlarm() {
    const timeInput = document.getElementById("quickAlarmTime");
    const labelInput = document.getElementById("quickAlarmLabel");
    const timeStr = timeInput ? timeInput.value : "07:00";
    const label = (labelInput && labelInput.value.trim()) ? labelInput.value.trim() : "Morning Alarm";

    try {
        const res = await fetch("/api/alarms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ time_str: timeStr, label, recurring: "daily" })
        });
        const data = await res.json();
        showToast(`Alarm scheduled for ${timeStr}!`, "success");
        handleTabSwitch("alarms");
    } catch (e) {
        showToast("Error scheduling alarm", "error");
    }
}

async function deleteAlarmItem(id) {
    try {
        await fetch(`/api/alarms/${id}`, { method: "DELETE" });
        showToast("Item removed", "info");
        handleTabSwitch("alarms");
    } catch (e) {
        showToast("Error deleting item", "error");
    }
}

async function toggleAllDevices(turnOn) {
    const devs = ["living_room_light", "bedroom_fan", "television", "kitchen_ac"];
    for (const d of devs) {
        await fetch("/api/device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device: d, on: turnOn })
        });
    }
    loadSmartHome();
    handleTabSwitch("smarthome");
    showToast(`All devices turned ${turnOn ? 'ON' : 'OFF'}`, "success");
}

async function addNewMemory() {
    const input = document.getElementById("newMemoryInput");
    if (!input || !input.value.trim()) return;
    await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.value.trim(), category: "routine" })
    });
    handleTabSwitch("memory");
    showToast("Memory saved to SQLite!", "success");
}

async function runSkill(id) {
    showToast("Triggering skill as an Autonomous Mission...", "info");
    const res = await fetch(`/api/skills/${id}/run`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
        showToast("Skill executed successfully!", "success");
        genericModal.classList.add("hidden");
        loadSmartHome();
        loadDeadlines();
    } else {
        showToast(data.error || "Skill execution error", "error");
    }
}

async function runWhatIfDemo() {
    const target = document.getElementById("whatIfResultArea");
    if (!target) return;
    target.innerHTML = `<p class="text-cyan-400">Simulating scenario on cloned tasks...</p>`;

    const res = await fetch("/api/what-if/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            scenario_title: "Pre-Deadline Workload Smoothing",
            modifications: [
                { id: 1, new_date: "2026-10-25 17:00", new_priority: "urgent" }
            ]
        })
    });
    const data = await res.json();

    target.innerHTML = `
        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
            <h4 class="font-bold text-white">${escapeHtml(data.scenario_title)}</h4>
            <p class="text-emerald-400 font-medium">${escapeHtml(data.tradeoff_analysis)}</p>
            <div class="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Original Conflicts: ${data.original_conflict_count}</span>
                <span class="text-cyan-400 font-bold">Simulated Conflicts: ${data.simulated_conflict_count}</span>
            </div>
            <button onclick="applyWhatIfScenario(${escapeAttr(JSON.stringify(data.pending_modifications))})" class="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold">
                Apply Changes to Live Tasks
            </button>
        </div>
    `;
}

async function applyWhatIfScenario(mods) {
    await fetch("/api/what-if/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modifications: mods })
    });
    loadDeadlines();
    loadProactiveInsights();
    showToast("Applied scenario changes to live tasks!", "success");
    genericModal.classList.add("hidden");
}

async function deleteMemory(id) {
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
    handleTabSwitch("memory");
    showToast("Memory removed.", "info");
}

async function clearAllMemories() {
    await fetch("/api/memory/clear", { method: "POST" });
    handleTabSwitch("memory");
    showToast("All memories cleared.", "info");
}

function quickAsk(text) {
    userInput.value = text;
    submitMessage(text);
}

function updateMoodUI(mood) {
    if (!moodText || !moodBadge) return;
    moodText.textContent = `Mood: ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;
}

function setupEventListeners() {
    // Orb Click to Talk
    if (voiceOrb) voiceOrb.addEventListener("click", toggleListening);
    if (micBtn) micBtn.addEventListener("click", toggleListening);
    if (stopSpeechBtn) stopSpeechBtn.addEventListener("click", stopSpeech);

    // Chat Form Submit
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            submitMessage(userInput.value);
        });
    }

    // New Chat Button
    if (newChatBtn) {
        newChatBtn.addEventListener("click", async () => {
            const title = `Session ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title })
            });
            const data = await res.json();
            currentConversationId = data.id;
            loadConversations();
            chatFeed.innerHTML = "";
            showToast("Started new conversation", "info");
        });
    }

    // File Upload Attachment
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                pendingFile = e.target.files[0];
                uploadFileName.textContent = pendingFile.name;
                uploadFileSize.textContent = `${(pendingFile.size / 1024 / 1024).toFixed(1)} MB`;
                uploadPreviewChip.classList.remove("hidden");
                uploadPreviewChip.classList.add("flex");
                userInput.placeholder = `Ask a question about ${pendingFile.name}... (Press Enter to send)`;
            }
        });
    }

    if (cancelUploadBtn) {
        cancelUploadBtn.addEventListener("click", () => {
            pendingFile = null;
            uploadPreviewChip.classList.add("hidden");
            fileInput.value = "";
            userInput.placeholder = "Ask Nova, upload assignments, say 'plan my week'...";
        });
    }

    // Mission Buttons
    if (approveMissionBtn) approveMissionBtn.addEventListener("click", approveAndExecuteMission);
    if (cancelMissionBtn) cancelMissionBtn.addEventListener("click", cancelActiveMission);

    // SOS Buttons
    if (sosBtn) {
        sosBtn.addEventListener("click", async () => {
            triggerSOSModal({});
            await fetch("/api/sos/trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    situation: "Manual SOS Panic Triggered",
                    latitude: currentCoords.lat,
                    longitude: currentCoords.lng
                })
            });
        });
    }

    if (cancelSosBtn) {
        cancelSosBtn.addEventListener("click", () => {
            sosModal.classList.add("hidden");
            sosModal.style.display = "none";
            stopSiren();
            showToast("SOS alert cancelled.", "info");
        });
    }

    // Modal Close
    if (closeGenericModalBtn) {
        closeGenericModalBtn.addEventListener("click", closeModal);
    }
    if (genericModal) {
        genericModal.addEventListener("click", (e) => {
            if (e.target === genericModal) closeModal();
        });
    }

    // Deadlines Modal
    if (addDeadlineBtn) {
        addDeadlineBtn.addEventListener("click", () => {
            deadlineModal.classList.remove("hidden");
            deadlineModal.style.display = "flex";
        });
    }
    if (closeDeadlineModalBtn) {
        closeDeadlineModalBtn.addEventListener("click", () => {
            deadlineModal.classList.add("hidden");
            deadlineModal.style.display = "none";
        });
    }
    if (deadlineModal) {
        deadlineModal.addEventListener("click", (e) => {
            if (e.target === deadlineModal) {
                deadlineModal.classList.add("hidden");
                deadlineModal.style.display = "none";
            }
        });
    }
    if (saveDeadlineBtn) {
        saveDeadlineBtn.addEventListener("click", async () => {
            const title = document.getElementById("newDeadlineTitle").value;
            const date = document.getElementById("newDeadlineDate").value;
            const priority = document.getElementById("newDeadlinePriority").value;
            const hours = parseFloat(document.getElementById("newDeadlineHours").value || "2.0");

            if (!title || !date) {
                showToast("Please provide task title and due date", "error");
                return;
            }

            await fetch("/api/planner/deadlines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, due_date: date.replace("T", " "), priority, estimated_hours: hours })
            });

            deadlineModal.classList.add("hidden");
            deadlineModal.style.display = "none";
            document.getElementById("newDeadlineTitle").value = "";
            loadDeadlines();
            loadProactiveInsights();
            showToast("Task added to tracker!", "success");
        });
    }

    // Tab Navigation Switcher
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".nav-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const tab = btn.getAttribute("data-tab");
            handleTabSwitch(tab);
        });
    });

    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById("mobileSidebarToggle");
    const sidebar = document.getElementById("sidebarNav");
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener("click", () => {
            sidebar.classList.toggle("-translate-x-full");
        });
    }

    // Settings Modal
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener("click", () => {
            openModal(
                "Assistant Settings & Audio Controls",
                "",
                `
                <div class="space-y-4">
                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <h4 class="font-bold text-slate-200">Intelligence Provider</h4>
                        <p class="text-slate-400">Google Gemini 3.8 Flash active on backend.</p>
                        <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px]">Connected</span>
                    </div>
                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-slate-200">Reduced Motion</h4>
                            <p class="text-slate-400">Disables intense orbital spins and glowing pulses.</p>
                        </div>
                        <input type="checkbox" id="reducedMotionCheck" class="w-4 h-4 text-cyan-600 rounded">
                    </div>
                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-slate-200">Persistent Memory</h4>
                            <p class="text-slate-400">Allow NOVA to remember your preferences and routines.</p>
                        </div>
                        <input type="checkbox" id="memorySettingCheck" checked class="w-4 h-4 text-cyan-600 rounded">
                    </div>
                </div>
                `
            );
        });
    }
}

// Formatting Helpers
function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(str) {
    if (!str) return "";
    return String(str).replace(/"/g, '&quot;');
}

function formatMarkdown(text) {
    if (!text) return "";
    let clean = escapeHtml(text);
    clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    clean = clean.replace(/\*(.*?)\*/g, '<em>$1</em>');
    clean = clean.replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono text-xs">$1</code>');
    clean = clean.replace(/\n/g, '<br>');
    return clean;
}
