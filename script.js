const map = L.map('map').setView([49.05, -122.3], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 🔑 YOUR API KEY
const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJjMjcwN2UzOWZmOTQ4NzJiNDYwZDZhMTA2NzNhYWExIiwiaCI6Im11cm11cjY0In0=";

let snapMode = true;
let routePoints = [];
let currentRoute = [];
let currentLine = null;
let searchMarker = null;

// Load saved hikes safely
let hikes = [];
try {
    hikes = JSON.parse(localStorage.getItem("hikes")) || [];
} catch {
    hikes = [];
}

let selectedHikeIndex = null;

// Render saved hikes
hikes.forEach((hike, index) => renderHike(hike, index));

/* =========================
   MODE TOGGLE
========================= */
const modeBtn = document.getElementById("mode-toggle");

modeBtn.onclick = function () {
    snapMode = !snapMode;
    modeBtn.textContent = snapMode ? "Mode: Snap" : "Mode: Manual";
};

/* =========================
   MAP INPUT
========================= */
map.on('click', function(e) {
    if (!e.originalEvent.shiftKey) return;

    if (snapMode) {
        routePoints.push([e.latlng.lng, e.latlng.lat]);

        if (routePoints.length >= 2) {
            getRoute(routePoints);
        }
    } else {
        currentRoute.push([e.latlng.lat, e.latlng.lng]);
        redrawManual();
    }
});

/* =========================
   SNAP ROUTING
========================= */
async function getRoute(points) {
    try {
        const res = await fetch(
            "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson",
            {
                method: "POST",
                headers: {
                    "Authorization": API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    coordinates: points
                })
            }
        );

        const data = await res.json();

        if (!data.features || !data.features.length) {
            alert("No route found. Try manual mode.");
            return;
        }

        const coords = data.features[0].geometry.coordinates;
        const latlngs = coords.map(c => [c[1], c[0]]);

        currentRoute = latlngs;
        drawLine(latlngs);

        const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);

        document.getElementById("live-distance").textContent =
            "Distance: " + distance + " km";

    } catch (err) {
        console.error(err);

        const fallback = routePoints.map(p => [p[1], p[0]]);
        currentRoute = fallback;
        drawLine(fallback);

        document.getElementById("live-distance").textContent =
            "Distance: " + calculateDistance(fallback) + " km";

        alert("Snap failed — using fallback.");
    }
}

/* =========================
   MANUAL MODE
========================= */
function redrawManual() {
    drawLine(currentRoute);

    document.getElementById("live-distance").textContent =
        "Distance: " + calculateDistance(currentRoute) + " km";
}

/* =========================
   DRAW LINE
========================= */
function drawLine(route) {
    if (currentLine) map.removeLayer(currentLine);

    currentLine = L.polyline(route, {
        color: "blue",
        smoothFactor: 1.5
    }).addTo(map);
}

/* =========================
   DISTANCE
========================= */
function calculateDistance(route) {
    let total = 0;

    for (let i = 1; i < route.length; i++) {
        const [lat1, lon1] = route[i - 1];
        const [lat2, lon2] = route[i];

        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        total += R * c;
    }

    return total.toFixed(2);
}

/* =========================
   SAVE
========================= */
document.getElementById("save-btn").onclick = function () {
    if (currentRoute.length < 2) return alert("Draw a route first");

    const name = prompt("Hike name:");
    if (!name) return;

    const elevation = prompt("Elevation (m):") || "N/A";
    const notes = prompt("Notes:");

    const distance = document.getElementById("live-distance")
        .textContent.replace("Distance: ", "").replace(" km", "");

    hikes.push({ name, distance, elevation, notes, route: currentRoute });

    localStorage.setItem("hikes", JSON.stringify(hikes));
    location.reload();
};

/* =========================
   UNDO
========================= */
document.getElementById("undo-btn").onclick = function () {
    if (snapMode) {
        routePoints.pop();

        if (routePoints.length >= 2) {
            getRoute(routePoints);
        } else {
            resetDrawing();
        }
    } else {
        currentRoute.pop();
        redrawManual();
    }
};

/* =========================
   CLEAR
========================= */
document.getElementById("clear-btn").onclick = resetDrawing;

function resetDrawing() {
    routePoints = [];
    currentRoute = [];

    if (currentLine) map.removeLayer(currentLine);
    currentLine = null;

    document.getElementById("live-distance").textContent = "Distance: 0 km";
}

/* =========================
   RENDER SAVED HIKES
========================= */
function renderHike(hike, index) {
    if (!hike.route) return;

    const line = L.polyline(hike.route, { color: "green" }).addTo(map);

    const li = document.createElement("li");
    li.innerHTML = `<b>${hike.name}</b><br>${hike.distance} km`;

    li.onclick = () => {
        selectedHikeIndex = index;
        map.fitBounds(line.getBounds());
        showDetails(hike);
    };

    document.getElementById("hike-list").appendChild(li);
}

/* =========================
   DETAIL PANEL
========================= */
function showDetails(hike) {
    document.getElementById("detail-name").textContent = hike.name;
    document.getElementById("detail-distance").textContent = hike.distance + " km";
    document.getElementById("detail-elevation").textContent = hike.elevation + " m";
    document.getElementById("detail-notes").textContent = hike.notes || "";

    document.getElementById("detail-panel").classList.remove("hidden");
}

document.getElementById("close-panel").onclick = () =>
    document.getElementById("detail-panel").classList.add("hidden");

/* =========================
   DELETE
========================= */
document.getElementById("delete-btn").onclick = function () {
    if (selectedHikeIndex === null) return;

    if (!confirm("Delete this hike?")) return;

    hikes.splice(selectedHikeIndex, 1);
    localStorage.setItem("hikes", JSON.stringify(hikes));
    location.reload();
};

/* =========================
   EDIT
========================= */
document.getElementById("edit-btn").onclick = function () {
    if (selectedHikeIndex === null) return;

    const hike = hikes[selectedHikeIndex];

    hike.name = prompt("New name:", hike.name) || hike.name;
    hike.elevation = prompt("New elevation:", hike.elevation) || hike.elevation;
    hike.notes = prompt("New notes:", hike.notes) || hike.notes;

    localStorage.setItem("hikes", JSON.stringify(hikes));
    location.reload();
};

const GEOCODE_KEY = "29ee7681cefe4192b941edc5c71b710f";

let searchMarker = null;

async function searchLocation(query) {
    try {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${GEOCODE_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        console.log("Search:", data);

        if (!data.results || !data.results.length) {
            alert("Location not found");
            return;
        }

        const place = data.results[0];

        const lat = place.geometry.lat;
        const lng = place.geometry.lng;

        map.setView([lat, lng], 13);

        if (searchMarker) map.removeLayer(searchMarker);

        searchMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup(place.formatted)
            .openPopup();

    } catch (err) {
        console.error(err);
        alert("Search failed.");
    }
}

// ENTER key only (SAFE VERSION)
window.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-box");

    if (!searchInput) {
        console.error("Search box not found in HTML");
        return;
    }

    searchInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            const query = e.target.value.trim();
            if (query) searchLocation(query);
        }
    });
});
