console.log("spot.js loaded");

/* =========================================================
   GLOBAL STATE
========================================================= */

window.spot = null;

const video = document.getElementById("video");
const overlay = document.getElementById("statusOverlay");
const title = document.getElementById("statusTitle");
const text = document.getElementById("statusText");

let hls = null;
let retryCount = 0;

/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", loadSpot);

async function loadSpot() {
  try {
    const id =
      new URLSearchParams(window.location.search).get("id") ||
      "marshmallow";

    const res = await fetch("/data/spots.json");
    const data = await res.json();

    window.spot = data[id];

    if (!window.spot) {
      document.body.innerHTML = "<h1>Spot not found</h1>";
      return;
    }

    initPage();

  } catch (err) {
    console.error("Load error:", err);
  }
}

function initPage() {
  startStream();
  updateWatchers();
  setupUI();
}

/* =========================================================
   MENU
========================================================= */

function toggleMenu(){
  document.getElementById('navLinks').classList.toggle('active');
}
window.toggleMenu = toggleMenu;

/* =========================================================
   NIGHT MODE LOGIC
========================================================= */

function isNightTime() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    hour: "numeric",
    hour12: false
  }).formatToParts(new Date());

  const hour = parseInt(parts.find(p => p.type === "hour").value);
  return hour >= 18 || hour < 6;
}

/* =========================================================
   OVERLAY STATES
========================================================= */

function showLoading() {
  overlay.classList.remove("hidden");
  title.innerText = "🌊 Taking you to the waves";
  text.innerText = "Connecting to the camera...";
}

function showUnavailable() {
  overlay.classList.remove("hidden");
  title.innerText = "🌊 No live view right now";
  text.innerText =
    "The camera may be offline or experiencing issues.";
}

function showNightMode() {
  overlay.classList.remove("hidden");
  title.innerText = "🌙 Camera sleeping";
  text.innerText =
    "This camera rests overnight and will wake up in the morning.";
}

function hideOverlay() {
  overlay.classList.add("hidden");
  retryCount = 0;
}

/* =========================================================
   STREAM
========================================================= */

function startStream() {
  const STREAM_URL = window.spot.stream;

  showLoading();

  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (window.Hls && Hls.isSupported()) {

    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      maxBufferLength: 10,
      backBufferLength: 5
    });

    hls.loadSource(STREAM_URL);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (!data.fatal) return;
      scheduleRetry();
    });

  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {

    video.src = STREAM_URL;

  } else {
    scheduleRetry();
  }
}

/* =========================================================
   RETRY SYSTEM
========================================================= */

function scheduleRetry() {
  retryCount++;

  if (retryCount >= 3) {
    if (isNightTime()) showNightMode();
    else showUnavailable();
    return;
  }

  setTimeout(startStream, 4000);
}

/* =========================================================
   VIDEO EVENTS
========================================================= */

video.addEventListener("playing", hideOverlay);
video.addEventListener("canplay", hideOverlay);
video.addEventListener("loadedmetadata", hideOverlay);

video.addEventListener("error", scheduleRetry);

/* =========================================================
   WATCHERS (NOW DYNAMIC)
========================================================= */

async function updateWatchers(){
  try {
    const res = await fetch("/api/v3/paths/list");
    const data = await res.json();

    const stream = data.items.find(i =>
      i.name.includes(window.spot.path)
    );

    const count = stream?.readers?.length ?? 0;

    document.getElementById("watchers").innerText =
      count + " watching now";

  } catch(e){
    console.log(e);
  }
}

setInterval(updateWatchers, 5000);

/* =========================================================
   UI SETUP (spot-driven)
========================================================= */

function setupUI() {
  const titleEl = document.querySelector(".stream-title span");
  if (titleEl) titleEl.innerText = window.spot.name;
}

/* =========================================================
   MODALS
========================================================= */

function openSurfModal(){
  document.getElementById("surfModal").classList.add("active");
}

function closeSurfModal(){
  document.getElementById("surfModal").classList.remove("active");
}

function openVenueModal(){
  const modal = document.getElementById("venueModal");

  if (window.spot?.host) {
    modal.querySelector("h2").innerText =
      "🍽️ " + window.spot.host.name;

    modal.querySelector("p").innerText =
      window.spot.host.description;
  }

  modal.classList.add("active");
}

function closeVenueModal(){
  document.getElementById("venueModal").classList.remove("active");
}

/* click outside close */
document.getElementById("surfModal")?.addEventListener("click", e => {
  if (e.target === e.currentTarget) closeSurfModal();
});

document.getElementById("venueModal")?.addEventListener("click", e => {
  if (e.target === e.currentTarget) closeVenueModal();
});

/* =========================================================
   EXPORT GLOBAL FUNCTIONS (HTML buttons)
========================================================= */

window.openSurfModal = openSurfModal;
window.closeSurfModal = closeSurfModal;
window.openVenueModal = openVenueModal;
window.closeVenueModal = closeVenueModal;