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
  const spot = window.spot;
  if (!spot) return;

  document.title = `${spot.title} Surf Cam Live | Sri Lanka Surf Camera | LankaSwell`;

  setText(".stream-title span", spot.name);

  renderButtons(spot);
  renderHostVenue(spot);
  renderServices(spot);
  renderSurfModal(spot);
  renderVenueModal(spot);
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value || "";
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderButtons(spot) {
  const buttons = document.querySelector(".buttons");
  if (!buttons) return;

  const mapUrl = spot.mapUrl || "#";

  buttons.innerHTML = `

    <a class="btn btn-secondary surf-guide-btn" href="#" onclick="openSurfModal(); return false;">
      Surf Spot Guide
    </a>
	
	<a class="btn btn-primary" href="${escapeHTML(mapUrl)}" target="_blank">
      Let's go!
    </a>
  `;
}

function renderHostVenue(spot) {
  const hostSection = document.querySelector(".host-venue");
  if (!hostSection) return;

  const host = spot.host;

  if (!host) {
    hostSection.style.display = "none";
    return;
  }

  hostSection.style.display = "";

  hostSection.innerHTML = `
    <!--<img
      src="${escapeHTML(host.image || "")}"
      alt="${escapeHTML(host.name || "Camera host")}"
      class="host-image"
    >-->

    <div class="host-content">
      <div class="host-badge">Camera Hosted By ❤️</div>

      <h3>${escapeHTML(host.name)}</h3>

      <p class="small">
        ${escapeHTML(host.description || "Local venue supporting the LankaSwell camera network.")}
      </p>

      <a href="#" class="host-discover-btn" onclick="openVenueModal(); return false;">
        Discover the Host & Get Your Surfer Discount
      </a>

      <div class="host-social">
        ${host.instagram ? socialLink(host.instagram, "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg", "Instagram") : ""}
        ${host.facebook ? socialLink(host.facebook, "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg", "Facebook") : ""}
        ${host.phone ? socialLink("tel:" + host.phone, "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/telephone-fill.svg", "Phone") : ""}
        ${host.website ? socialLink(host.website, "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/globe.svg", "Website") : ""}
      </div>
    </div>
  `;
}

function socialLink(url, icon, label) {
  const target = url.startsWith("tel:") ? "" : 'target="_blank"';

  return `
    <a href="${escapeHTML(url)}" ${target} class="social-icon" aria-label="${escapeHTML(label)}">
      <img src="${escapeHTML(icon)}" alt="">
    </a>
  `;
}

function renderServices(spot) {
  const servicesSection = document.querySelector(".services");
  if (!servicesSection) return;

  const featured = spot.featuredPartners || [];
  const services = spot.services || [];

  if (!featured.length && !services.length) {
    servicesSection.style.display = "none";
    return;
  }

  servicesSection.style.display = "";

  servicesSection.innerHTML = `
    ${featured.length ? `
      <h3>Featured Partners</h3>

      <div class="featured-grid">
        ${featured.map(renderFeaturedCard).join("")}
      </div>
    ` : ""}

    ${services.length ? `
      <h3 style="margin-top:24px;">More Services Near This Spot</h3>

      <div class="service-grid">
        ${services.map(renderServiceCard).join("")}
      </div>
    ` : ""}
  `;
}

function renderFeaturedCard(item) {
  return `
    <div class="featured-card">
      <div class="featured-badge">FEATURED</div>
	  
	  
	${item.image ? `
        <img
          src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.title)}"
          class="host-image"
          style="width:64px;height:64px;object-fit:cover;border-radius:12px;margin-bottom:10px;"
        >
      ` : ""}

      <h4>${escapeHTML(item.title)}</h4>

      <p>${escapeHTML(item.description)}</p>

      <div class="host-social" style="transform: scale(0.9); transform-origin: left center;">
	  Contacts:
        ${item.instagram ? socialLink(
          item.instagram,
          "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg",
          "Instagram"
        ) : ""}

        ${item.facebook ? socialLink(
          item.facebook,
          "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg",
          "Facebook"
        ) : ""}

        ${item.website ? socialLink(
          item.website,
          "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/globe.svg",
          "Website"
        ) : ""}

        ${item.whatsapp ? socialLink(
          item.whatsapp.startsWith("http")
            ? item.whatsapp
            : "https://wa.me/" + item.whatsapp.replace(/\D/g, ""),
          "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/telephone-fill.svg",
          "WhatsApp"
        ) : ""}

        ${item.mapUrl ? socialLink(
          item.mapUrl,
          "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/geo-alt-fill.svg",
          "Map"
        ) : ""}
      </div>
    </div>
  `;
}

/*
function renderFeaturedCard(item) {
  return `
    <div class="featured-card">
      <div class="featured-badge">FEATURED</div>

      <div class="service-icon">${escapeHTML(item.icon || "")}</div>

      <h4>${escapeHTML(item.title)}</h4>

      <p>${escapeHTML(item.description)}</p>

      ${item.url ? `
        <a href="${escapeHTML(item.url)}" class="service-btn" target="_blank">
          ${escapeHTML(item.buttonText || "Contact")}
        </a>
      ` : ""}
    </div>
  `;
}
*/

function renderServiceCard(item) {
  return `
    <div class="service-card">
      <div class="service-icon">${escapeHTML(item.icon || "")}</div>

      <h4>${escapeHTML(item.title)}</h4>

      <p>${escapeHTML(item.description)}</p>

      ${item.url ? `
        <a href="${escapeHTML(item.url)}" class="service-btn" target="_blank">
          ${escapeHTML(item.buttonText || "Contact")}
        </a>
      ` : ""}
    </div>
  `;
}

function renderSurfModal(spot) {
  const modalContent = document.querySelector("#surfModal .modal-content");
  if (!modalContent) return;

  const stats = spot.stats || [];
  const guide = spot.guide || {};

  modalContent.innerHTML = `
    <span class="modal-close" onclick="closeSurfModal()">&times;</span>

    <h2>${escapeHTML(spot.name)}</h2>

    <p>${escapeHTML(spot.description || "")}</p>

    ${stats.length ? `
      <div class="modal-grid">
        ${stats.map(item => `
          <div class="modal-item">${escapeHTML(item)}</div>
        `).join("")}
      </div>
    ` : ""}

    ${guide.image ? `
      <img
        src="${escapeHTML(guide.image)}"
        alt="${escapeHTML(spot.name)} Surf Guide"
        style="
          width:100%;
          border-radius:14px;
          margin:20px 0;
          display:block;
        "
      >
    ` : ""}

    ${guide.areas?.length ? `
      <div class="surf-guide">
        ${guide.areas.map(area => `
          <div class="modal-section">
            <h3>
              ${escapeHTML(area.number)}.
              ${escapeHTML(area.title)}
            </h3>

            <p>
              ${escapeHTML(area.description)}
            </p>
          </div>
        `).join("")}
      </div>
    ` : ""}

    ${guide.safety?.length ? `
      <div class="modal-section">
        <h3>⚠️ Safety Information</h3>

        <ul style="padding-left:20px;">
          ${guide.safety.map(item => `
            <li style="margin-bottom:10px;">
              ${escapeHTML(item)}
            </li>
          `).join("")}
        </ul>
      </div>
    ` : ""}
	
	<div class="surf-copyright">
  © ${new Date().getFullYear()} LankaSwell. All surf guides, descriptions and visuals are original content and may not be copied or redistributed without permission.
</div>
  `;
}

function modalSection(title, text) {
  return `
    <div class="modal-section">
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(text)}</p>
    </div>
  `;
  
}

function renderVenueModal(spot) {
  const modalContent = document.querySelector("#venueModal .modal-content");
  if (!modalContent) return;

  const host = spot.host;
  const discount = spot.discount;

  if (!host) {
    modalContent.innerHTML = `
      <span class="modal-close" onclick="closeVenueModal()">&times;</span>
      <h2>No host information yet</h2>
    `;
    return;
  }

  modalContent.innerHTML = `
    <span class="modal-close" onclick="closeVenueModal()">&times;</span>

    <h2>${escapeHTML(host.name)}</h2>

    <p>${escapeHTML(host.description || "Local venue supporting this LankaSwell camera.")}</p>

    ${host.images?.length ? `
	  <div class="venue-slider">

		<button class="venue-prev" type="button">&#10094;</button>

		<div class="venue-viewport">
		  <div class="venue-track">
			${host.images.map(img => `
			  <img
				src="${escapeHTML(img)}"
				alt="${escapeHTML(host.name)}"
				loading="lazy"
			  >
			`).join("")}
		  </div>
		</div>

		<button class="venue-next" type="button">&#10095;</button>

		<div class="venue-dots">
		  ${host.images.map((_, i) => `
			<span class="venue-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
		  `).join("")}
		</div>

	  </div>
	` : host.image ? `
	  <img
		src="${escapeHTML(host.image)}"
		alt="${escapeHTML(host.name)}"
		style="width:100%;border-radius:14px;margin:12px 0;"
	  >
	` : ""}

    ${discount?.enabled ? `
      <h3>Exclusive LankaSwell Offer</h3>

      ${discount.perks?.length ? `
        <div class="modal-grid">
          ${discount.perks.map(perk => `
            <div class="modal-item">${escapeHTML(perk)}</div>
          `).join("")}
        </div>
      ` : ""}

      ${discount.code ? `
        <h3>Discount Code</h3>

        <div style="
          background:#f4f8f8;
          padding:16px;
          border-radius:12px;
          text-align:center;
          font-size:1.3rem;
          font-weight:800;
          letter-spacing:2px;
        ">
          ${escapeHTML(discount.code)}
        </div>
      ` : ""}
    ` : ""}
  `;
  
  if (host.images?.length > 1) {

	  let current = 0;

	  const track = modalContent.querySelector(".venue-track");
	  const prev = modalContent.querySelector(".venue-prev");
	  const next = modalContent.querySelector(".venue-next");
	  const dots = modalContent.querySelectorAll(".venue-dot");

	  function update(){
		track.style.transform = `translateX(-${current * 100}%)`;

		dots.forEach((d,i)=>{
		  d.classList.toggle("active", i === current);
		});
	  }

	  prev?.addEventListener("click", () => {
		current = (current - 1 + host.images.length) % host.images.length;
		update();
	  });

	  next?.addEventListener("click", () => {
		current = (current + 1) % host.images.length;
		update();
	  });

	  dots.forEach(dot => {
		dot.addEventListener("click", () => {
		  current = Number(dot.dataset.index);
		  update();
		});
	  });
	}
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

const surfModal = document.getElementById("surfModal");

if (surfModal) {

  // Right click
  surfModal.addEventListener("contextmenu", e => {
    e.preventDefault();
  });

  // Copy / cut / paste
  surfModal.addEventListener("copy", e => e.preventDefault());
  surfModal.addEventListener("cut", e => e.preventDefault());
  surfModal.addEventListener("paste", e => e.preventDefault());

  // Keyboard shortcuts (Ctrl/Cmd + C/X/A)
  document.addEventListener("keydown", e => {
    const isOpen = surfModal.classList.contains("active");

    if (!isOpen) return;

    if ((e.ctrlKey || e.metaKey)) {
      const key = e.key.toLowerCase();
      if (["c", "x", "a"].includes(key)) {
        e.preventDefault();
      }
    }
  });
}
