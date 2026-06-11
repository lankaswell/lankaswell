async function loadSpot() {
  const id = new URLSearchParams(window.location.search).get("id");

  const res = await fetch("/data/spots.json");
  const spots = await res.json();

  const spot = spots[id];

  if (!spot) {
    document.body.innerHTML = "<h1>Spot not found</h1>";
    return;
  }

  // title
  document.querySelector(".stream-title span").innerText = spot.name;

  // stream
  const video = document.getElementById("video");
  video.src = spot.stream;

  // description
  const desc = document.getElementById("spot-description");
  if (desc) desc.innerText = spot.description;

  // discount
  const code = document.getElementById("discount-code");
  if (code) code.innerText = spot.code ?? "No discount available";

  // host
  document.getElementById("host-name").innerText = spot.host.name;

  // socials (safe guards)
  document.getElementById("ig").href = spot.host.instagram || "#";
  document.getElementById("fb").href = spot.host.facebook || "#";
  document.getElementById("phone").href = spot.host.phone || "#";
  document.getElementById("web").href = spot.host.website || "#";
}

document.addEventListener("DOMContentLoaded", loadSpot);
