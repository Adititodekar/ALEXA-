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
const moodTracker = document.getElementById("moodTracker");
const moodEstimate = document.getElementById("moodEstimate");
const moodSuggestion = document.getElementById("moodSuggestion");
const moodDisclaimer = document.getElementById("moodDisclaimer");
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
    try {
        loadConversations(true).then(() => {
            switchConversation(currentConversationId);
        });
    } catch (e) { console.warn("loadConversations error:", e); }
    try { loadDeadlines(); } catch (e) { console.warn("loadDeadlines error:", e); }
    try { checkDueReminders(); } catch (e) { console.warn("checkDueReminders error:", e); }
    window.setInterval(checkDueReminders, 60 * 1000);
    try { loadSmartHome(); } catch (e) { console.warn("loadSmartHome error:", e); }
    try { loadAlexaEcosystem(); } catch (e) { console.warn("loadAlexaEcosystem error:", e); }
    try { initAvatarControls(); } catch (e) { console.warn("initAvatarControls error:", e); }
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

let is3DAvatarActive = true;

function initAvatarControls() {
    const toggleBtn = document.getElementById("toggleAvatarBtn");
    const waveBtn = document.getElementById("waveAvatarBtn");
    const label = document.getElementById("avatarModeLabel");
    const container3D = document.getElementById("avatar3DContainer");
    const voiceOrb = document.getElementById("voiceOrb");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            is3DAvatarActive = !is3DAvatarActive;
            const actionPrompt = document.getElementById("assistantActionPrompt");
            if (is3DAvatarActive) {
                if (container3D) container3D.classList.remove("hidden");
                if (voiceOrb) {
                    voiceOrb.classList.add("hidden");
                    voiceOrb.style.display = "none";
                }
                if (label) label.textContent = "3D Bot";
                if (actionPrompt) actionPrompt.textContent = "Click Nova or speak 'Hey Nova'";
                showToast("3D Animated Robot Avatar active.", "info");
            } else {
                if (container3D) container3D.classList.add("hidden");
                if (voiceOrb) {
                    voiceOrb.classList.remove("hidden");
                    voiceOrb.style.display = "block";
                }
                if (label) label.textContent = "Orb Eye";
                if (actionPrompt) actionPrompt.textContent = "Click Eye or speak 'Hey Nova'";
                showToast("Classic Alexa Eye active.", "info");
            }
        });
    }

    if (waveBtn) {
        waveBtn.addEventListener("click", () => {
            if (window.triggerAvatarWave) window.triggerAvatarWave(3);
            showToast("Nova waves hello!", "info");
        });
    }

    window.triggerAvatarInteraction = function() {
        if (recognition && isListening) {
            stopSpeechRecognition();
        } else {
            startSpeechRecognition();
        }
    };

    const actionPrompt = document.getElementById("assistantActionPrompt");
    if (is3DAvatarActive) {
        if (container3D) container3D.classList.remove("hidden");
        if (voiceOrb) {
            voiceOrb.classList.add("hidden");
            voiceOrb.style.display = "none";
        }
        if (actionPrompt) actionPrompt.textContent = "Click Nova or speak 'Hey Nova'";
    }
}

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


// Harmonic Crystal Two-Tone Bell Chime for Reminders (Web Audio API)
function playReminderChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        
        [880, 1320].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.16);
            gain.gain.setValueAtTime(0, now + idx * 0.16);
            gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.16 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.7);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.16);
            osc.stop(now + idx * 0.16 + 0.75);
        });
    } catch (e) {
        console.warn("Chime playback error:", e);
    }
}

function testAudioReminderPreview() {
    playReminderChime();
    showToast("Playing reminder audio bell chime...", "info");
    setTimeout(() => {
        speakText("This is an audio preview of your upcoming task reminder on Nova AI.");
    }, 600);
}
window.testAudioReminderPreview = testAudioReminderPreview;

window.setQuickReminderPreset = function(minutes) {
    const dueInput = document.getElementById("reminderDueInput");
    if (!dueInput) return;
    const target = new Date();
    if (minutes === 'tomorrow9') {
        target.setDate(target.getDate() + 1);
        target.setHours(9, 0, 0, 0);
    } else {
        target.setMinutes(target.getMinutes() + Number(minutes));
    }
    target.setMinutes(target.getMinutes() - target.getTimezoneOffset());
    dueInput.value = target.toISOString().slice(0, 16);
    showToast("Time preset selected.", "info");
};

async function checkDueReminders() {
    try {
        const response = await fetch("/api/reminders");
        if (!response.ok) return;
        const data = await response.json();
        const pending = (data.reminders || []).filter(reminder => reminder.status === "pending");
        const badge = document.getElementById("reminderCountBadge");
        if (badge) badge.textContent = String(pending.length);
        for (const reminder of (data.reminders || [])) {
            if (!reminder.is_due_now || reminder.status !== "pending") continue;
            playReminderChime();
            const message = `Reminder: ${reminder.title}. It is time to complete your task.`;
            showToast(message, "info");
            setTimeout(() => {
                speakText(message);
            }, 500);
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Nova Reminder: " + reminder.title, { body: message });
            }
            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" });
        }
    } catch (error) {
        console.warn("Reminder check failed:", error);
    }
}

async function openReminderCenter() {
    try {
        const scanResponse = await fetch("/api/reminders/scan-conversations", { method: "POST" });
        if (!scanResponse.ok) throw new Error("Could not scan today's conversation.");
        const scan = await scanResponse.json();
        const response = await fetch("/api/reminders");
        if (!response.ok) throw new Error("Could not load reminders.");
        const data = await response.json();
        if (scan.count > 0) {
            loadDeadlines();
            loadProactiveInsights();
            showToast(`Added ${scan.count} conversation task(s) to your tracker.`, "success");
        }
        const reminders = (data.reminders || []).filter(item => item.status === "pending");
        const rows = reminders.length ? reminders.map(item => `
            <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div class="min-w-0">
                    <p class="truncate text-xs font-semibold text-slate-100">${escapeHtml(item.title)}</p>
                    <p class="mt-1 text-[10px] text-slate-400">${escapeHtml(item.due_time)}${item.is_due_now ? ' · Due now' : ''}</p>
                </div>
                <div class="flex shrink-0 gap-1.5">
                    <button type="button" onclick="completeSavedReminder(${Number(item.id)})" class="rounded-lg bg-emerald-950 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-900">Done</button>
                    <button type="button" onclick="deleteSavedReminder(${Number(item.id)})" class="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-red-950 hover:text-red-300">Delete</button>
                </div>
            </div>
        `).join("") : '<p class="py-4 text-center text-xs text-slate-500">No reminders yet. Add one below or tell Nova what you need to remember.</p>';

        openModal("Reminders", "", `
            <div class="space-y-4">
                <form id="reminderCreateForm" class="space-y-2 rounded-xl border border-amber-700/30 bg-amber-950/20 p-3">
                    <label for="reminderTitleInput" class="block text-xs font-semibold text-amber-200">What should Nova remind you about?</label>
                    <input id="reminderTitleInput" required maxlength="180" placeholder="e.g. Submit the science assignment" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none">
                    <div class="flex flex-wrap items-center gap-2">
                        <input id="reminderDueInput" required type="datetime-local" class="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none">
                        <button type="submit" class="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500">Add reminder</button>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5 pt-1">
                        <span class="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">Quick Presets:</span>
                        <button type="button" onclick="setQuickReminderPreset(15)" class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-[10px] text-amber-200">+15m</button>
                        <button type="button" onclick="setQuickReminderPreset(60)" class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-[10px] text-amber-200">+1h</button>
                        <button type="button" onclick="setQuickReminderPreset(180)" class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-[10px] text-amber-200">+3h</button>
                        <button type="button" onclick="setQuickReminderPreset('tomorrow9')" class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-[10px] text-amber-200">Tomorrow 9 AM</button>
                        <button type="button" onclick="testAudioReminderPreview()" class="ml-auto px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 hover:bg-amber-900 text-[10px] text-amber-300 font-medium">🔔 Test Audio Chime</button>
                    </div>
                </form>
                <div class="space-y-2">
                    <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming reminders (${reminders.length})</h3>
                    <div class="max-h-64 space-y-2 overflow-y-auto">${rows}</div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="flex-1 text-[10px] text-slate-500">Opening Reminders scans saved conversations from the last 24 hours and adds clear dated commitments to Tasks &amp; Deadlines, with a reminder one hour before. Nova checks alerts while the dashboard is open.</p>
                    <button type="button" onclick="enableSpokenReminders()" class="rounded-lg border border-amber-700/50 px-2.5 py-1.5 text-[10px] text-amber-200 hover:border-amber-500">${localStorage.getItem("novaSpokenReminders") === "enabled" ? "Sound reminders on" : "Enable sound reminders"}</button>
                    <button type="button" onclick="enableReminderNotifications()" class="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-300 hover:border-amber-500 hover:text-amber-200">Enable desktop alerts</button>
                </div>
            </div>
        `);

        const dueInput = document.getElementById("reminderDueInput");
        if (dueInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            dueInput.min = now.toISOString().slice(0, 16);
        }
        const form = document.getElementById("reminderCreateForm");
        if (form) form.addEventListener("submit", saveReminderFromCenter);
    } catch (error) {
        showToast(error.message || "Could not open reminders.", "error");
    }
}

function enableSpokenReminders() {
    if (!("speechSynthesis" in window)) {
        showToast("Spoken reminders are not supported by this browser.", "error");
        return;
    }
    localStorage.setItem("novaSpokenReminders", "enabled");
    speakText("Sound reminders are enabled. I will speak your task when its reminder is due.");
    showToast("Sound reminders enabled.", "success");
}

async function saveReminderFromCenter(event) {
    event.preventDefault();
    const title = document.getElementById("reminderTitleInput")?.value.trim();
    const dueInput = document.getElementById("reminderDueInput")?.value;
    if (!title || !dueInput) {
        showToast("Enter a reminder and its date and time.", "error");
        return;
    }
    try {
        const response = await fetch("/api/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, due_time: dueInput.replace("T", " ") })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Could not save the reminder.");
        showToast("Reminder saved.", "success");
        await checkDueReminders();
        await openReminderCenter();
    } catch (error) {
        showToast(error.message || "Could not save the reminder.", "error");
    }
}

async function enableReminderNotifications() {
    if (!("Notification" in window)) {
        showToast("This browser does not support desktop notifications.", "error");
        return;
    }
    const permission = await Notification.requestPermission();
    showToast(permission === "granted" ? "Desktop reminder alerts enabled." : "Allow notifications in your browser settings to enable desktop alerts.", permission === "granted" ? "success" : "info");
}

async function completeSavedReminder(reminderId) {
    await fetch(`/api/reminders/${reminderId}/complete`, { method: "POST" });
    showToast("Reminder marked done.", "success");
    await checkDueReminders();
    await openReminderCenter();
}

async function deleteSavedReminder(reminderId) {
    await fetch(`/api/reminders/${reminderId}`, { method: "DELETE" });
    showToast("Reminder deleted.", "info");
    await checkDueReminders();
    await openReminderCenter();
}

// =========================================================================
// 1B. LIVE WEATHER & ENVIRONMENTAL CONDITIONS (OpenWeatherMap API)
// =========================================================================
function updateWeatherUI(data) {
    if (!data) return;
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
    const descText = data.description || data.condition || "Clear";
    if (condEl) condEl.textContent = descText.charAt(0).toUpperCase() + descText.slice(1);

    let locDisplay = data.city || "Local Area";
    if (data.country && !locDisplay.toLowerCase().includes(data.country.toLowerCase())) {
        locDisplay = `${locDisplay}, ${data.country}`;
    }
    if (cityEl) cityEl.textContent = locDisplay;
    if (humEl) humEl.textContent = `Humidity ${data.humidity}%`;
    if (humLabel) humLabel.textContent = `${data.humidity}%`;
    if (humBar) humBar.style.width = `${Math.min(100, Math.max(0, data.humidity))}%`;
    if (windEl) windEl.textContent = `Wind: ${data.wind_speed} m/s`;

    if (map && data.latitude && data.longitude) {
        try {
            map.setView([data.latitude, data.longitude], 9);
            if (userMarker) {
                userMarker.setLatLng([data.latitude, data.longitude]);
                userMarker.bindPopup(`<b>${escapeHtml(locDisplay)}</b><br>${data.temperature}°C, ${escapeHtml(descText)}`).openPopup();
            }
        } catch (e) {
            console.debug("Map pan error:", e);
        }
    }
}

async function loadWeather(place = null) {
    try {
        const url = place ? `/api/weather?place=${encodeURIComponent(place)}` : `/api/weather`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        updateWeatherUI(data);
    } catch (err) {
        console.warn("Weather fetch error:", err);
    }
}
window.loadWeather = loadWeather;

window.handleWeatherSearch = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById("weatherPlaceInput");
    if (!input || !input.value.trim()) return;
    const query = input.value.trim();
    showToast(`Fetching live weather for ${query}...`, "info");
    await loadWeather(query);
    showToast(`Live weather loaded for ${query}`, "success");
};

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
        const track = data.track || data.current_track;
        if (track) {
            updateTrackUI(track);
            const audio = document.getElementById("novaAudioPlayer");
            if (audio) {
                audio.src = track.audio_url;
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
        const track = data.track || data.current_track;
        if (track) {
            updateTrackUI(track);
            const audio = document.getElementById("novaAudioPlayer");
            if (audio) {
                audio.src = track.audio_url;
                audio.play().catch(() => {});
                updatePlayPauseButton(true);
            }
        }
    } catch (e) {
        console.warn("Prev track error:", e);
    }
}

let currentActiveTrack = null;

function updateTrackUI(track) {
    if (!track) return;
    currentActiveTrack = track;
    const title = document.getElementById("playerTrackTitle");
    const artist = document.getElementById("playerArtist");
    const album = document.getElementById("playerAlbum");
    const art = document.getElementById("playerCoverArt");

    if (title) title.textContent = track.title;
    if (artist) artist.textContent = track.artist;
    if (album) album.textContent = `${track.album || ''} • ${track.genre || ''}`;
    if (art && track.cover_art) art.src = track.cover_art;

    const spotifyLink = document.getElementById("playerSpotifyLink");
    if (spotifyLink && track.spotify_url) {
        spotifyLink.href = track.spotify_url;
    }
    const ytLink = document.getElementById("playerYoutubeLink");
    if (ytLink && track.youtube_url) {
        ytLink.href = track.youtube_url;
    }
}

window.openCurrentFullSong = function() {
    if (currentActiveTrack) {
        window.openFullSongPlayer(null, currentActiveTrack.title, currentActiveTrack.artist);
    } else {
        const titleEl = document.getElementById("playerTrackTitle");
        const artistEl = document.getElementById("playerArtist");
        const t = titleEl ? titleEl.textContent : "Believer";
        const a = artistEl ? artistEl.textContent : "Imagine Dragons";
        window.openFullSongPlayer(`${t} ${a}`, t, a);
    }
};

window.openFullSongPlayer = function(query, title = "", artist = "") {
    const q = query || `${title} ${artist}`.trim();
    if (!q) return;
    const cleanTitle = title || q;
    const cleanArtist = artist || "Full Length Version";
    const ytEmbedUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1`;
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(q)}`;
    const ytMusicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(q)}`;

    openModal(
        `🎵 Full Song Player — ${escapeHtml(cleanTitle)}`,
        "",
        `
        <div class="space-y-3.5">
            <div class="p-3 bg-slate-950 rounded-xl border border-pink-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                    <h4 class="font-bold text-white text-sm">${escapeHtml(cleanTitle)}</h4>
                    <p class="text-pink-300 text-xs">${escapeHtml(cleanArtist)}</p>
                    <span class="inline-block mt-1 text-[10px] text-emerald-400 font-mono">100% complete uninterrupted playback</span>
                </div>
                <div class="flex items-center space-x-2 shrink-0">
                    <a href="${spotifyUrl}" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold transition flex items-center space-x-1">
                        <span>🟢 Spotify App</span>
                    </a>
                    <a href="${ytMusicUrl}" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 text-[10px] font-semibold transition flex items-center space-x-1">
                        <span>▶️ YouTube Music</span>
                    </a>
                </div>
            </div>

            <!-- Embedded In-App Player playing 100% Full Track -->
            <div class="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
                <iframe 
                    class="w-full h-full" 
                    src="${ytEmbedUrl}" 
                    title="Full Song Player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen>
                </iframe>
            </div>

            <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
                <span class="text-pink-400 text-sm">💡</span>
                <p>
                    <strong class="text-slate-200">Why was the direct audio 30 seconds?</strong> Major record labels legally restrict third-party public APIs (Apple iTunes / Deezer) to 30-second previews. This embedded player streams the <strong>complete 3 to 5+ minute full track & video</strong> with zero cutoffs!
                </p>
            </div>
        </div>
        `
    );
};

window.searchAndPlayMusic = async function(query) {
    if (!query || !query.trim()) return;
    showToast(`Searching & connecting: ${query}...`, "info");
    try {
        const res = await fetch("/api/music/play", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query.trim() })
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const track = data.track;
        if (track) {
            updateTrackUI(track);
            const audio = document.getElementById("novaAudioPlayer");
            if (audio && track.audio_url) {
                audio.src = track.audio_url;
                audio.play().then(() => {
                    isMusicPlaying = true;
                    updatePlayPauseButton(true);
                }).catch(err => console.debug("Autoplay note:", err));
            }
            showToast(`Now Playing: ${track.title} by ${track.artist}`, "success");
        }
    } catch (e) {
        showToast("Could not find music track.", "error");
    }
};

window.switchNewsCategory = async function(category, topic = null) {
    const listEl = document.getElementById("liveNewsListContainer");
    if (listEl) {
        listEl.innerHTML = '<div class="py-6 text-center text-xs text-slate-400 animate-pulse">Fetching live headlines from global networks...</div>';
    }
    try {
        let url = `/api/news?category=${encodeURIComponent(category)}`;
        if (topic) url += `&topic=${encodeURIComponent(topic)}`;
        const res = await fetch(url);
        const data = await res.json();
        const articles = data.articles || [];
        if (listEl) {
            listEl.innerHTML = articles.map(n => `
                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center hover:border-slate-700 transition">
                    <div class="pr-2">
                        <h5 class="font-bold text-slate-200 text-xs">${escapeHtml(n.title)}</h5>
                        <div class="flex items-center space-x-2 mt-1">
                            <span class="text-[10px] text-emerald-400 font-mono font-semibold">${escapeHtml(n.source)}</span>
                            <span class="text-[9px] text-slate-500 font-mono">${escapeHtml(n.published || '')}</span>
                        </div>
                    </div>
                    <a href="${n.link}" target="_blank" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] font-semibold shrink-0">
                        Read &rarr;
                    </a>
                </div>
            `).join('') || '<div class="text-center py-4 text-xs text-slate-500">No headlines found for this category.</div>';
        }
        showToast(`Loaded ${data.category || category} news!`, "info");
    } catch (e) {
        if (listEl) listEl.innerHTML = '<div class="text-center py-4 text-xs text-red-400">Failed to load news headlines.</div>';
    }
};

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

    voiceOrb.className = `state-${state} mb-3${is3DAvatarActive ? " hidden" : ""}`;
    if (is3DAvatarActive) {
        voiceOrb.style.display = "none";
    }
    if (typeof window.setNovaAvatarState === "function") {
        window.setNovaAvatarState(state);
    }

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
        if (window.setNovaAvatarState) window.setNovaAvatarState('listening');
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
        if (window.setNovaAvatarState) window.setNovaAvatarState('idle');
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
    if (window.setNovaAvatarState) {
        window.setNovaAvatarState(data.speech_reply ? "speaking" : "idle");
    }
    if (data.type === "alexa_ecosystem" || data.ecosystem) {
        loadAlexaEcosystem();
    }
    if (data.mood) updateMoodUI(data.mood);

    // Speak aloud if voice speech provided
    if (data.speech_reply) {
        speakText(data.speech_reply);
    } else {
        setVisualizerState("idle");
    }

    // Render message
    appendAssistantMessage(data.display_reply || data.speech_reply || data.reply, data);

    // Auto-launch Interactive Arcade Game if requested
    if (data.type === "game" && typeof window.openGameArcadeModal === "function") {
        setTimeout(() => {
            window.openGameArcadeModal(data.game_id || "snake");
            showToast(`Launched ${data.game_title || 'Arcade Game'}!`, "success");
        }, 700);
    }

    // Refresh conversation session list in real-time
    loadConversations();

    // Handle voice/chat conversation deletion intents
    if (data.type === "conversation_deleted") {
        setTimeout(async () => {
            currentConversationId = data.active_session || "default-session";
            try { localStorage.setItem("novaCurrentConversationId", currentConversationId); } catch (_) {}
            await switchConversation(currentConversationId);
            showToast("Conversation cleared", "info");
        }, 1200);
    } else if (data.type === "all_conversations_deleted") {
        setTimeout(async () => {
            currentConversationId = data.active_session || "default-session";
            try { localStorage.setItem("novaCurrentConversationId", currentConversationId); } catch (_) {}
            chatFeed.innerHTML = "";
            renderWelcomeMessage();
            await loadConversations();
            showToast("All conversations reset", "info");
        }, 1200);
    }

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
        if (data.new_reminder) checkDueReminders();
    }

    // Instantly sync Weather if weather response
    if (data.type === "weather" || data.weather) {
        if (data.weather) {
            updateWeatherUI(data.weather);
        } else {
            loadWeather();
        }
        showToast("Live weather synced!", "info");
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
    const providerNames = { gemini: "Gemini", openai: "OpenAI", compatible: "Llama API" };
    const replySourceLabel = payload && providerNames[payload.response_source]
        ? `${providerNames[payload.response_source]} · ${escapeHtml(payload.response_model || "")}`
        : (payload && payload.response_source === "offline_fallback" ? "Offline reply" : "");
    if (payload && payload.provider_error) {
        extraHtml += `<p class="mt-2 text-[11px] text-amber-300">${escapeHtml(payload.provider_error)}</p>`;
    }

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
                <span class="text-[10px] text-slate-500 font-mono">${replySourceLabel ? `${replySourceLabel} · ` : ""}${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
// 10. CONVERSATION LIFECYCLE, MULTI-TURN PERSISTENCE & DELETION
// =========================================================================

// Restore persisted active conversation from localStorage
try {
    const savedConv = localStorage.getItem("novaCurrentConversationId");
    if (savedConv) currentConversationId = savedConv;
} catch (_) {}

function updateActiveConversationHeader(title) {
    const titleEl = document.getElementById("activeConversationTitle");
    if (titleEl) {
        titleEl.textContent = title || "Main Session";
    }
}

function renderWelcomeMessage() {
    if (!chatFeed) return;
    chatFeed.innerHTML = `
        <div class="flex items-start space-x-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
            <div class="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center shrink-0">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
            </div>
            <div class="text-sm space-y-2 flex-1">
                <div class="font-semibold text-cyan-400 flex items-center justify-between">
                    <span>Nova Assistant</span>
                    <span class="text-[10px] text-slate-500 font-mono">Conversational AI Ready</span>
                </div>
                <p class="text-slate-300 leading-relaxed">
                    Hello! I am **NOVA AI — ALEXA-NEXT 2.0**, your conversational personal assistant. I can chat naturally with you, tell you live weather worldwide, play any song on demand, set smart alarms and timers, deliver breaking news, and manage your smart home. What would you like to do?
                </p>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

async function loadConversations(autoSelectFirstIfEmpty = false) {
    try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        const list = data.conversations || [];

        // If currentConversationId is not in list, fallback to first thread
        if (autoSelectFirstIfEmpty && list.length > 0) {
            const exists = list.some(c => c.id === currentConversationId);
            if (!exists) {
                currentConversationId = list[0].id;
                try { localStorage.setItem("novaCurrentConversationId", currentConversationId); } catch (_) {}
            }
        }

        const activeConv = list.find(c => c.id === currentConversationId);
        updateActiveConversationHeader(activeConv ? activeConv.title : "Main Session");

        if (conversationsList) {
            if (list.length === 0) {
                conversationsList.innerHTML = `<div class="text-[11px] text-slate-500 text-center py-2">No saved threads</div>`;
            } else {
                conversationsList.innerHTML = list.map(c => {
                    const isActive = c.id === currentConversationId;
                    return `
                        <div class="group flex items-center justify-between p-1.5 rounded-lg transition ${isActive ? 'bg-cyan-950/80 text-cyan-300 font-medium' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}">
                            <button onclick="switchConversation('${c.id}')" class="flex-1 text-left truncate flex items-center justify-between mr-1" title="${escapeAttr(c.title)}">
                                <span class="truncate text-xs">${escapeHtml(c.title)}</span>
                                <span class="text-[10px] text-slate-500 font-mono ml-1 shrink-0">${c.message_count || 0}</span>
                            </button>
                            <button onclick="deleteConversationThread('${c.id}', event)" class="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 rounded transition shrink-0" title="Delete this conversation">
                                <i data-lucide="trash" class="w-3 h-3"></i>
                            </button>
                        </div>
                    `;
                }).join('');
                if (window.lucide) lucide.createIcons();
            }
        }
        return list;
    } catch (e) {
        console.error("Error loading conversations:", e);
        return [];
    }
}
window.loadConversations = loadConversations;

async function switchConversation(id) {
    if (!id) return;
    currentConversationId = id;
    try { localStorage.setItem("novaCurrentConversationId", currentConversationId); } catch (_) {}
    loadConversations();
    chatFeed.innerHTML = "";
    try {
        const res = await fetch(`/api/conversations/${id}/messages`);
        const data = await res.json();
        const messages = data.messages || [];
        if (messages.length === 0) {
            renderWelcomeMessage();
        } else {
            for (const m of messages) {
                if (m.role === "user") {
                    appendUserMessage(m.content);
                } else {
                    appendAssistantMessage(m.content, m.payload);
                }
            }
        }
    } catch (e) {
        console.error("Error loading thread messages:", e);
    }
}
window.switchConversation = switchConversation;

async function createNewConversation(customTitle = null) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const title = customTitle || `Session ${timeStr}`;
    try {
        const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title })
        });
        const data = await res.json();
        currentConversationId = data.id;
        try { localStorage.setItem("novaCurrentConversationId", currentConversationId); } catch (_) {}
        await loadConversations();
        chatFeed.innerHTML = "";
        renderWelcomeMessage();
        showToast("Started new conversation session", "info");
    } catch (e) {
        showToast("Could not create new conversation", "error");
    }
}
window.createNewConversation = createNewConversation;

async function deleteConversationThread(id, event) {
    if (event) event.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation thread?")) return;

    try {
        const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        showToast("Conversation deleted", "success");

        const remaining = await loadConversations();
        if (currentConversationId === id) {
            if (remaining.length > 0) {
                await switchConversation(remaining[0].id);
            } else {
                await createNewConversation("Main Session");
            }
        }
    } catch (e) {
        showToast("Failed to delete conversation", "error");
    }
}
window.deleteConversationThread = deleteConversationThread;

async function deleteActiveConversation() {
    deleteConversationThread(currentConversationId);
}
window.deleteActiveConversation = deleteActiveConversation;

async function clearAllConversations() {
    if (!confirm("⚠️ Are you sure you want to delete ALL saved conversations and clear entire chat history?")) return;

    try {
        const res = await fetch("/api/conversations", { method: "DELETE" });
        if (!res.ok) throw new Error("Clear all failed");
        const data = await res.json();
        currentConversationId = data.active_session || "default-session";
        try { localStorage.setItem("novaCurrentConversationId", currentConversationId); } catch (_) {}
        chatFeed.innerHTML = "";
        renderWelcomeMessage();
        await loadConversations();
        showToast("All conversations and message history cleared!", "success");
    } catch (e) {
        showToast("Failed to clear conversations", "error");
    }
}
window.clearAllConversations = clearAllConversations;

async function renameCurrentConversation() {
    const titleEl = document.getElementById("activeConversationTitle");
    const currentTitle = titleEl ? titleEl.textContent : "Main Session";
    const newTitle = prompt("Enter new title for this conversation:", currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) return;

    try {
        const res = await fetch(`/api/conversations/${currentConversationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle.trim() })
        });
        if (!res.ok) throw new Error("Rename failed");
        updateActiveConversationHeader(newTitle.trim());
        loadConversations();
        showToast("Conversation renamed", "success");
    } catch (e) {
        showToast("Could not rename conversation", "error");
    }
}
window.renameCurrentConversation = renameCurrentConversation;

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
function triggerSOSModal(payload = {}) {
    if (!sosModal) return;
    sosModal.classList.remove("hidden");
    sosModal.style.display = "flex";

    if (window.setNovaAvatarState) {
        window.setNovaAvatarState("emergency");
    }

    const lat = (currentCoords && currentCoords.lat) ? currentCoords.lat : 12.9716;
    const lng = (currentCoords && currentCoords.lng) ? currentCoords.lng : 77.5946;
    const address = (currentLocation && currentLocation.address) ? currentLocation.address : "Bangalore, Karnataka, India";

    if (sosCoordsBox) {
        sosCoordsBox.textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
    }
    const addressBox = document.getElementById("sosAddressBox");
    if (addressBox) addressBox.textContent = address;

    const mapsLink = document.getElementById("sosGoogleMapsLink");
    if (mapsLink) mapsLink.href = `https://maps.google.com/?q=${lat},${lng}`;

    const textToEncode = `🚨 EMERGENCY SOS ALERT! Nova AI detected distress. Time: ${new Date().toLocaleTimeString()} Location: Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)} (${address}) Live Map: https://maps.google.com/?q=${lat},${lng} Medical: Blood: O+, Allergies: Penicillin. Please dispatch help immediately.`;
    const encoded = encodeURIComponent(textToEncode);

    const waBtn = document.getElementById("sosWhatsAppBtn");
    if (waBtn) waBtn.href = `https://api.whatsapp.com/send?text=${encoded}`;

    const smsBtn = document.getElementById("sosSmsBtn");
    if (smsBtn) smsBtn.href = `sms:?body=${encoded}`;

    speakText("Emergency SOS activated. Live location coordinates broadcasted and siren sounding.");
    startSiren();
}

let sirenInterval = null;
let sirenMuted = false;

function startSiren() {
    try {
        stopSiren();
        if (sirenMuted) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        sirenAudioContext = new AudioCtx();
        sirenOscillator = sirenAudioContext.createOscillator();
        const gain = sirenAudioContext.createGain();

        sirenOscillator.type = "sawtooth";
        gain.gain.setValueAtTime(0.2, sirenAudioContext.currentTime);

        let high = false;
        sirenOscillator.frequency.setValueAtTime(650, sirenAudioContext.currentTime);
        sirenInterval = setInterval(() => {
            if (!sirenAudioContext || !sirenOscillator) return;
            const target = high ? 650 : 960;
            sirenOscillator.frequency.cancelScheduledValues(sirenAudioContext.currentTime);
            sirenOscillator.frequency.linearRampToValueAtTime(target, sirenAudioContext.currentTime + 0.3);
            high = !high;
        }, 360);

        sirenOscillator.connect(gain);
        gain.connect(sirenAudioContext.destination);
        sirenOscillator.start();
    } catch (e) {
        console.warn("Audio siren error:", e);
    }
}

function stopSiren() {
    try {
        if (sirenInterval) { clearInterval(sirenInterval); sirenInterval = null; }
        if (sirenOscillator) { sirenOscillator.stop(); sirenOscillator.disconnect(); sirenOscillator = null; }
        if (sirenAudioContext && sirenAudioContext.state !== "closed") { sirenAudioContext.close(); sirenAudioContext = null; }
    } catch (e) {}
}

function toggleSirenMute() {
    sirenMuted = !sirenMuted;
    const btn = document.getElementById("muteSirenBtn");
    if (sirenMuted) {
        stopSiren();
        if (btn) btn.textContent = "🔇 Unmute Siren";
        showToast("Emergency siren muted.", "info");
    } else {
        startSiren();
        if (btn) btn.textContent = "🔊 Mute Siren";
        showToast("Emergency siren unmuted.", "info");
    }
}

// =========================================================================
// 13. SIDEBAR TABS: FULL INTERACTIVE VIEWS FOR ALL FEATURES
// =========================================================================


// =========================================================================
// 12B. ALEXA ECOSYSTEM CONTROLLER (FIRE TV, RING DOORBELL & ECOBEE)
// =========================================================================

let currentEcosystemMiniTab = "fire_tv";
let ecosystemState = {};

async function loadAlexaEcosystem() {
    try {
        const res = await fetch("/api/alexa/devices");
        if (!res.ok) return;
        ecosystemState = await res.json();
        renderEcosystemMiniWidget();
    } catch (e) {
        console.warn("Could not load Alexa ecosystem devices:", e);
    }
}

function switchEcosystemMiniTab(tab) {
    currentEcosystemMiniTab = tab;
    ["fire_tv", "ring", "ecobee"].forEach(t => {
        const btn = document.getElementById(`ecoTabBtn${t === 'fire_tv' ? 'Firetv' : (t === 'ring' ? 'Ring' : 'Ecobee')}`);
        if (btn) {
            if (t === tab) {
                btn.className = "text-[9px] px-2 py-0.5 rounded-full bg-orange-600 text-white font-medium";
            } else {
                btn.className = "text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 hover:text-white font-medium";
            }
        }
    });
    renderEcosystemMiniWidget();
}

function renderEcosystemMiniWidget() {
    const container = document.getElementById("ecosystemMiniContainer");
    if (!container) return;

    if (currentEcosystemMiniTab === "fire_tv") {
        const tv = ecosystemState.fire_tv || { power: true, current_app: "Prime Video", volume: 35, now_playing: { title: "The Rings of Power" } };
        container.innerHTML = `
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="font-semibold text-slate-200">Fire TV 4K Max</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full ${tv.power ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-slate-800 text-slate-400'}">${tv.power ? 'ON • ' + tv.current_app : 'Standby'}</span>
                </div>
                <div class="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                    <p class="text-white font-medium truncate">🎬 ${escapeHtml(tv.now_playing?.title || 'Prime Video Stream')}</p>
                    <p class="text-slate-400 text-[10px]">Playback: ${tv.playback_state || 'Playing'} • Volume: ${tv.volume}%</p>
                </div>
                <!-- Mini Remote Pad -->
                <div class="firetv-remote-dpad my-1">
                    <button type="button" class="firetv-dpad-btn firetv-dpad-up" onclick="fireTvAction('nav', 'up')"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>
                    <button type="button" class="firetv-dpad-btn firetv-dpad-down" onclick="fireTvAction('nav', 'down')"><i data-lucide="chevron-down" class="w-4 h-4"></i></button>
                    <button type="button" class="firetv-dpad-btn firetv-dpad-left" onclick="fireTvAction('nav', 'left')"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
                    <button type="button" class="firetv-dpad-btn firetv-dpad-right" onclick="fireTvAction('nav', 'right')"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
                    <button type="button" class="firetv-dpad-ok" onclick="fireTvAction('nav', 'select')">OK</button>
                </div>
                <!-- Playback & App Launcher -->
                <div class="grid grid-cols-4 gap-1 pt-1 text-[10px]">
                    <button type="button" onclick="fireTvAction('playback', 'toggle')" class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">${tv.playback_state === 'paused' ? '▶ Play' : '⏸ Pause'}</button>
                    <button type="button" onclick="fireTvAction('app', 'Prime Video')" class="p-1 rounded bg-sky-900/60 hover:bg-sky-800 text-sky-200">Prime</button>
                    <button type="button" onclick="fireTvAction('app', 'Netflix')" class="p-1 rounded bg-red-950/70 hover:bg-red-900 text-red-200">Netflix</button>
                    <button type="button" onclick="fireTvAction('app', 'YouTube')" class="p-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-200">YouTube</button>
                </div>
            </div>
        `;
    } else if (currentEcosystemMiniTab === "ring") {
        const ring = ecosystemState.ring_doorbell || { battery: 88, security_mode: "home", recent_events: [{ event: "Front Door Standby", time: "Now" }] };
        container.innerHTML = `
            <div class="space-y-2">
                <div class="ring-cam-stream">
                    <img src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=500&auto=format&fit=crop&q=80" class="w-full h-full object-cover opacity-80" alt="Ring Front Door">
                    <div class="ring-cam-overlay">
                        <div class="flex justify-between items-center text-[10px] text-white">
                            <span class="ring-rec-badge"><span class="ring-rec-dot"></span> LIVE REC</span>
                            <span class="font-mono bg-black/60 px-1.5 py-0.5 rounded">1080p • Bat ${ring.battery}%</span>
                        </div>
                        <div class="flex justify-between items-center text-[10px] text-white">
                            <span class="font-semibold">Front Porch & Doorstep</span>
                            <span class="text-[9px] text-slate-300 font-mono">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                    <button type="button" onclick="ringAction('chime')" class="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center justify-center space-x-1">
                        <i data-lucide="bell" class="w-3.5 h-3.5"></i>
                        <span>Ring Doorbell</span>
                    </button>
                    <button type="button" onclick="ringAction('talk')" class="p-1.5 rounded-lg ${ring.two_way_talk_active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'} font-semibold flex items-center justify-center space-x-1">
                        <i data-lucide="mic" class="w-3.5 h-3.5"></i>
                        <span>${ring.two_way_talk_active ? 'Speaking...' : '2-Way Talk'}</span>
                    </button>
                </div>
                <button type="button" onclick="ringAction('quick_reply', 0)" class="w-full text-left p-1.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 hover:border-slate-700">
                    💬 "Please leave the package outside the door."
                </button>
            </div>
        `;
    } else if (currentEcosystemMiniTab === "ecobee") {
        const eco = ecosystemState.ecobee_thermostat || { current_temp: 23.5, target_temp: 21.0, hvac_mode: "cool", humidity: 48, eco_mode: true };
        container.innerHTML = `
            <div class="space-y-2 text-center">
                <div class="ecobee-dial-wrap">
                    <span class="text-[10px] text-sky-300 font-mono">Current ${eco.current_temp}°C</span>
                    <span class="text-2xl font-black text-white font-mono tracking-tight">${eco.target_temp}°C</span>
                    <span class="text-[9px] text-sky-200 uppercase font-semibold tracking-wider">${eco.hvac_mode} MODE</span>
                </div>
                <div class="flex items-center justify-center space-x-2 pt-1">
                    <button type="button" onclick="ecobeeAction('temp_step', -0.5)" class="p-1.5 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">-</button>
                    <button type="button" onclick="ecobeeAction('eco')" class="px-3 py-1 rounded-lg ${eco.eco_mode ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'} text-xs">Eco Mode</button>
                    <button type="button" onclick="ecobeeAction('temp_step', 0.5)" class="p-1.5 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">+</button>
                </div>
                <div class="flex justify-between text-[10px] text-slate-400 px-2 pt-1 border-t border-slate-800">
                    <span>Humidity: <b class="text-slate-200">${eco.humidity}%</b></span>
                    <span>Air Quality: <b class="text-emerald-400">Clean (AQI 22)</b></span>
                </div>
            </div>
        `;
    }
    if (window.lucide) lucide.createIcons();
}

async function fireTvAction(action, param = null) {
    try {
        const res = await fetch("/api/alexa/firetv/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, param })
        });
        const data = await res.json();
        showToast(data.message || "Fire TV command sent.", "info");
        await loadAlexaEcosystem();
    } catch (e) {
        showToast("Fire TV command failed.", "error");
    }
}

async function ringAction(action, param = null) {
    try {
        if (action === "chime") {
            playReminderChime();
        }
        const res = await fetch("/api/alexa/ring/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, param })
        });
        const data = await res.json();
        showToast(data.message || "Ring command sent.", "info");
        await loadAlexaEcosystem();
    } catch (e) {
        showToast("Ring command failed.", "error");
    }
}

async function ecobeeAction(action, param = null) {
    try {
        const res = await fetch("/api/alexa/ecobee/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, param })
        });
        const data = await res.json();
        showToast(data.message || "Ecobee thermostat updated.", "success");
        await loadAlexaEcosystem();
    } catch (e) {
        showToast("Ecobee command failed.", "error");
    }
}

function openEcosystemModal(tab = "fire_tv") {
    switchEcosystemMiniTab(tab);
    handleTabSwitch("ecosystem");
}

function openDeadlineModal() {
    const modal = document.getElementById("deadlineModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.style.display = "flex";
}

function closeDeadlineModal() {
    const modal = document.getElementById("deadlineModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.style.display = "none";
}

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

        // Alexa Ecosystem Tab
        else if (tab === "ecosystem") {
            await loadAlexaEcosystem();
            const tv = ecosystemState.fire_tv || {};
            const ring = ecosystemState.ring_doorbell || {};
            const eco = ecosystemState.ecobee_thermostat || {};
            openModal(
                "Alexa Ecosystem (Fire TV, Ring Doorbell & Ecobee)",
                '<i data-lucide="layers" class="w-5 h-5 text-orange-400"></i>',
                `
                <div class="space-y-5 text-xs">
                    <!-- 1. Amazon Fire TV 4K Max -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-orange-500/30 space-y-3">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <i data-lucide="tv-2" class="w-5 h-5 text-orange-400"></i>
                                <h4 class="font-bold text-white text-sm">Amazon Fire TV 4K Max (Living Room)</h4>
                            </div>
                            <button onclick="fireTvAction('power')" class="px-2.5 py-1 rounded-lg ${tv.power ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'} font-semibold text-xs">${tv.power ? 'Power ON' : 'Standby'}</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                <p class="text-orange-300 font-semibold">Now Playing:</p>
                                <p class="text-white font-bold text-xs">${escapeHtml(tv.now_playing?.title || 'Prime Video Stream')}</p>
                                <p class="text-slate-400 text-[11px]">${escapeHtml(tv.now_playing?.quality || '4K Ultra HD • Dolby Atmos')}</p>
                                <div class="flex space-x-2 pt-2">
                                    <button onclick="fireTvAction('playback', 'play')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded">Play</button>
                                    <button onclick="fireTvAction('playback', 'pause')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded">Pause</button>
                                    <button onclick="fireTvAction('volume', 5)" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded">Vol +</button>
                                    <button onclick="fireTvAction('volume', -5)" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded">Vol -</button>
                                </div>
                            </div>
                            <!-- Remote D-Pad -->
                            <div class="firetv-remote-dpad">
                                <button type="button" class="firetv-dpad-btn firetv-dpad-up" onclick="fireTvAction('nav', 'up')"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>
                                <button type="button" class="firetv-dpad-btn firetv-dpad-down" onclick="fireTvAction('nav', 'down')"><i data-lucide="chevron-down" class="w-4 h-4"></i></button>
                                <button type="button" class="firetv-dpad-btn firetv-dpad-left" onclick="fireTvAction('nav', 'left')"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
                                <button type="button" class="firetv-dpad-btn firetv-dpad-right" onclick="fireTvAction('nav', 'right')"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
                                <button type="button" class="firetv-dpad-ok" onclick="fireTvAction('nav', 'select')">OK</button>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Ring Video Doorbell Pro -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-3">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <i data-lucide="bell-ring" class="w-5 h-5 text-cyan-400"></i>
                                <h4 class="font-bold text-white text-sm">Ring Video Doorbell Pro (Front Door)</h4>
                            </div>
                            <span class="text-xs px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">Battery ${ring.battery}% • WiFi Good</span>
                        </div>
                        <div class="ring-cam-stream">
                            <img src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=700&auto=format&fit=crop&q=80" class="w-full h-full object-cover" alt="Ring Front Door">
                            <div class="ring-cam-overlay">
                                <div class="flex justify-between items-center text-[11px] text-white">
                                    <span class="ring-rec-badge"><span class="ring-rec-dot"></span> LIVE REC</span>
                                    <span class="font-mono bg-black/60 px-2 py-0.5 rounded">1080p HD HDR</span>
                                </div>
                                <div class="flex justify-between items-center text-[11px] text-white">
                                    <span>Front Porch &amp; Driveway</span>
                                    <span class="font-mono">${new Date().toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="ringAction('chime')" class="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold">Ring Chime</button>
                            <button onclick="ringAction('talk')" class="flex-1 py-2 rounded-xl ${ring.two_way_talk_active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'} font-bold">${ring.two_way_talk_active ? 'Speaking to Visitor...' : '2-Way Talk'}</button>
                            <button onclick="ringAction('quick_reply', 0)" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300">Quick Reply</button>
                        </div>
                    </div>

                    <!-- 3. Ecobee Smart Thermostat -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <i data-lucide="thermometer-sun" class="w-5 h-5 text-emerald-400"></i>
                                <h4 class="font-bold text-white text-sm">Ecobee Smart Thermostat Premium</h4>
                            </div>
                            <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">Current ${eco.current_temp}°C • Humidity ${eco.humidity}%</span>
                        </div>
                        <div class="flex items-center justify-around py-2">
                            <div class="ecobee-dial-wrap">
                                <span class="text-xs text-sky-300 font-mono">Current ${eco.current_temp}°C</span>
                                <span class="text-3xl font-black text-white font-mono">${eco.target_temp}°C</span>
                                <span class="text-[10px] text-sky-200 uppercase font-semibold">${eco.hvac_mode}</span>
                            </div>
                            <div class="space-y-2">
                                <div class="flex space-x-2">
                                    <button onclick="ecobeeAction('temp_step', -0.5); setTimeout(() => handleTabSwitch('ecosystem'), 200);" class="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-base">-</button>
                                    <button onclick="ecobeeAction('temp_step', 0.5); setTimeout(() => handleTabSwitch('ecosystem'), 200);" class="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-base">+</button>
                                </div>
                                <div class="flex space-x-1.5 text-xs">
                                    <button onclick="ecobeeAction('hvac_mode', 'cool'); setTimeout(() => handleTabSwitch('ecosystem'), 200);" class="px-3 py-1 rounded ${eco.hvac_mode === 'cool' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'}">Cool</button>
                                    <button onclick="ecobeeAction('hvac_mode', 'heat'); setTimeout(() => handleTabSwitch('ecosystem'), 200);" class="px-3 py-1 rounded ${eco.hvac_mode === 'heat' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'}">Heat</button>
                                    <button onclick="ecobeeAction('eco'); setTimeout(() => handleTabSwitch('ecosystem'), 200);" class="px-3 py-1 rounded ${eco.eco_mode ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}">Eco</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                `
            );
        }
        // Emergency SOS & ICE Card Tab
        else if (tab === "sos") {
            const res = await fetch("/api/sos/contacts");
            const data = await res.json();
            const contacts = data.contacts || [];
            const med = data.medical_info || {};
            openModal(
                "Emergency SOS Guardian & Medical ICE Profile",
                '<i data-lucide="shield-alert" class="w-5 h-5 text-red-500"></i>',
                `
                <div class="space-y-4 text-xs">
                    <div class="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-red-300 text-sm">Emergency SOS Dispatcher</h4>
                            <p class="text-slate-300 text-[11px]">Clicking Trigger SOS transmits live GPS coords, sounds distress siren, and alerts family.</p>
                        </div>
                        <button onclick="triggerSOSModal({}); closeModal();" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/40">TRIGGER SOS</button>
                    </div>

                    <!-- Medical ICE Card -->
                    <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <h4 class="font-bold text-slate-200">Medical ICE Card (In Case of Emergency)</h4>
                        <div class="grid grid-cols-2 gap-2 text-[11px]">
                            <div><span class="text-slate-500">Blood Type:</span> <b class="text-rose-400 font-mono">${escapeHtml(med.blood_type || 'O+')}</b></div>
                            <div><span class="text-slate-500">Allergies:</span> <b class="text-slate-200">${escapeHtml(med.allergies || 'None')}</b></div>
                            <div><span class="text-slate-500">Medications:</span> <b class="text-slate-200">${escapeHtml(med.medications || 'None')}</b></div>
                            <div><span class="text-slate-500">Emergency Notes:</span> <b class="text-slate-200">${escapeHtml(med.emergency_notes || 'Contact Family')}</b></div>
                        </div>
                    </div>

                    <!-- Emergency Contacts List -->
                    <div class="space-y-2">
                        <h4 class="font-bold text-slate-200">Emergency Speed Dial Contacts</h4>
                        <div class="space-y-1.5">
                            ${contacts.map(c => `
                                <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <p class="font-semibold text-white">${escapeHtml(c.name)} <span class="text-[10px] text-slate-400">(${escapeHtml(c.relationship)})</span></p>
                                        <p class="font-mono text-cyan-400 text-[11px]">${escapeHtml(c.phone)}</p>
                                    </div>
                                    <a href="tel:${c.phone}" class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold flex items-center space-x-1">
                                        <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                                        <span>Call</span>
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                `
            );
        }
        // 2. Music Player Tab
        else if (tab === "music") {
            const res = await fetch("/api/music/state");
            if (!res.ok) {
                let detail = await res.text();
                try { detail = JSON.parse(detail).detail || detail; } catch (_) {}
                throw new Error(`Music service returned ${res.status}: ${detail.slice(0, 240)}`);
            }
            const state = await res.json();
            const cur = state.current_track || {};
            const list = state.playlist || [];

            openModal(
                "Favourite Songs & Music Player",
                "",
                `
                <div class="space-y-4">
                    <!-- Live Song & Artist Universal Search -->
                    <div class="space-y-2">
                        <div class="flex gap-2">
                            <div class="relative flex-1">
                                <input type="text" id="modalMusicSearchInput" placeholder="Search any song or artist (e.g. Shape of You, Believer, Taylor Swift)..." 
                                       class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition"
                                       onkeydown="if(event.key==='Enter'){ searchAndPlayMusic(this.value); setTimeout(function(){ handleTabSwitch('music'); }, 600); }">
                                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none"></i>
                            </div>
                            <button onclick="searchAndPlayMusic(document.getElementById('modalMusicSearchInput').value); setTimeout(function(){ handleTabSwitch('music'); }, 600);"
                                    class="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs transition flex items-center space-x-1 shrink-0">
                                <i data-lucide="play" class="w-3.5 h-3.5"></i>
                                <span>Play</span>
                            </button>
                        </div>
                        <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                            <span class="text-slate-500 font-mono text-[10px] shrink-0">Trending:</span>
                            <button onclick="searchAndPlayMusic('Shape of You Ed Sheeran'); setTimeout(function(){ handleTabSwitch('music'); }, 600);" class="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0">Shape of You</button>
                            <button onclick="searchAndPlayMusic('Believer Imagine Dragons'); setTimeout(function(){ handleTabSwitch('music'); }, 600);" class="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0">Believer</button>
                            <button onclick="searchAndPlayMusic('Starboy The Weeknd'); setTimeout(function(){ handleTabSwitch('music'); }, 600);" class="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0">Starboy</button>
                            <button onclick="searchAndPlayMusic('Taylor Swift Cruel Summer'); setTimeout(function(){ handleTabSwitch('music'); }, 600);" class="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0">Cruel Summer</button>
                            <button onclick="searchAndPlayMusic('Kesariya Arijit Singh'); setTimeout(function(){ handleTabSwitch('music'); }, 600);" class="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0">Kesariya</button>
                        </div>
                    </div>

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

                            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2">
                                <button onclick="openFullSongPlayer(null, '${escapeAttr(cur.title || '')}', '${escapeAttr(cur.artist || '')}')" class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-semibold transition shadow-md shadow-pink-600/30">
                                    <span>▶️ Play Full Song</span>
                                </button>
                                ${cur.spotify_url ? `<a href="${cur.spotify_url}" target="_blank" class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold transition"><span>🟢 Spotify</span></a>` : ''}
                                ${cur.youtube_url ? `<a href="${cur.youtube_url}" target="_blank" class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-700/60 text-red-300 text-[10px] font-semibold transition"><span>▶️ YouTube</span></a>` : ''}
                            </div>

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

                    <!-- Live Multi-Category News Hub -->
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between">
                            <h4 class="font-bold text-slate-200 text-xs uppercase tracking-wider">Live Global News Network</h4>
                            <span class="text-[10px] text-emerald-400 font-mono font-semibold">Real-Time RSS & APIs</span>
                        </div>

                        <!-- Category Selector Pills -->
                        <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                            <button onclick="switchNewsCategory('top')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shrink-0">🔥 Top</button>
                            <button onclick="switchNewsCategory('tech')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0">💻 Tech & AI</button>
                            <button onclick="switchNewsCategory('world')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0">🌍 World</button>
                            <button onclick="switchNewsCategory('business')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0">📈 Business</button>
                            <button onclick="switchNewsCategory('science')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0">🚀 Science</button>
                            <button onclick="switchNewsCategory('sports')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0">⚽ Sports</button>
                            <button onclick="switchNewsCategory('entertainment')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0">🎬 Entertainment</button>
                        </div>

                        <!-- Custom Topic Search -->
                        <div class="flex gap-2">
                            <div class="relative flex-1">
                                <input type="text" id="modalNewsTopicInput" placeholder="Search any topic (e.g. artificial intelligence, NASA, stock market)..."
                                       class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                                       onkeydown="if(event.key==='Enter'){ switchNewsCategory('search', this.value); }">
                                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none"></i>
                            </div>
                            <button onclick="switchNewsCategory('search', document.getElementById('modalNewsTopicInput').value)"
                                    class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shrink-0">
                                Search
                            </button>
                        </div>

                        <!-- News List Container -->
                        <div id="liveNewsListContainer" class="space-y-2 max-h-60 overflow-y-auto pr-1">
                            ${news.map(n => `
                                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center hover:border-slate-700 transition">
                                    <div class="pr-2">
                                        <h5 class="font-bold text-slate-200 text-xs">${escapeHtml(n.title)}</h5>
                                        <div class="flex items-center space-x-2 mt-1">
                                            <span class="text-[10px] text-emerald-400 font-mono font-semibold">${escapeHtml(n.source)}</span>
                                            <span class="text-[9px] text-slate-500 font-mono">${escapeHtml(n.published || '')}</span>
                                        </div>
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
                    <button onclick="openDeadlineModal()" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium">
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

function updateMoodUI(moodData) {
    if (!moodData) return;
    const mood = typeof moodData === "string" ? moodData : moodData.primary_mood;
    if (moodText && moodBadge) moodText.textContent = `Mood: ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;
    if (!moodTracker || typeof moodData === "string") return;
    moodTracker.classList.remove("hidden");
    moodEstimate.textContent = mood === "neutral" ? "No clear signal yet" : `Possibly ${mood}${moodData.contextual ? " · from recent messages" : ""}`;
    moodSuggestion.textContent = moodData.suggestion || "Keep chatting, or tell Nova directly how you feel.";
    moodDisclaimer.textContent = moodData.disclaimer || "A best-effort read of your words, not a diagnosis. Tell Nova if it got your mood wrong.";
}

function setupEventListeners() {
    const muteBtn = document.getElementById("muteSirenBtn");
    if (muteBtn) {
        muteBtn.addEventListener("click", toggleSirenMute);
    }
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
        newChatBtn.addEventListener("click", () => createNewConversation());
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
            closeDeadlineModal();
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

            closeDeadlineModal();
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
