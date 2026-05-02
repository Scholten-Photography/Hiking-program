window.addEventListener("DOMContentLoaded", () => {

const map = L.map('map').setView([49.05, -122.3], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 🔑 API KEYS
const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJjMjcwN2UzOWZmOTQ4NzJiNDYwZDZhMTA2NzNhYWExIiwiaCI6Im11cm11cjY0In0=";
const GEOCODE_KEY = "29ee7681cefe4192b941edc5c71b710f";

let snapMode = true;
let routePoints = [];
let currentRoute = [];
let currentLine = null;
let searchMarker = null;

// Load hikes
let hikes = JSON.parse(localStorage.getItem("hikes")) || [];
let selectedHikeIndex = null;

// Render hikes
hikes.forEach((hike, index) => renderHike(hike, index));

/* =========================
   MODE TOGGLE
========================= */
const modeBtn = document.getElementById("mode-toggle");

modeBtn.onclick = () => {
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
   ROUTING
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
                body: JSON.stringify({ coordinates: points })
            }
        );

        const data = await res.json();

        if (!data.features?.length) {
            alert("No route found");
            return;
        }

        const coords = data.features[0].geometry.coordinates;
        const latlngs = coords.map(c => [c[1], c[0]]);

        currentRoute = latlngs;
        drawLine(latlngs);

        const dist = (data.features[0].properties.summary.distance / 1000).toFixed(2);

        document.getElementById("live-distance").textContent =
            "Distance: " + dist + " km";

    } catch (err) {
        console.error(err);
        alert("Routing failed");
    }
}

/* =========================
   MANUAL
========================= */
function redrawManual() {
    drawLine(currentRoute);
    document.getElementById("live-distance").textContent =
        "Distance: " + calculateDistance(currentRoute) + " km";
}

/* =========================
   DRAW
========================= */
function drawLine(route) {
    if (currentLine) map.removeLayer(currentLine);

    currentLine = L.polyline(route, { color: "blue" }).addTo(map);
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

        total += 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    return total.toFixed(2);
}

/* =========================
   SAVE
========================= */
document.getElementById("save-btn").onclick = () => {
    if (currentRoute.length < 2) return alert("Draw route first");

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
   SEARCH (WORKING)
========================= */
async function searchLocation(query) {
    try {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${GEOCODE_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.results?.length) {
            alert("Not found");
            return;
        }

        const { lat, lng } = data.results[0].geometry;

        map.setView([lat, lng], 13);

        if (searchMarker) map.removeLayer(searchMarker);

        searchMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup(data.results[0].formatted)
            .openPopup();

    } catch (err) {
        console.error(err);
        alert("Search failed");
    }
}

// attach safely AFTER load
const searchBox = document.getElementById("search-box");

if (searchBox) {
    searchBox.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const q = e.target.value.trim();
            if (q) searchLocation(q);
        }
    });
}

/* =========================
   RENDER HIKES
========================= */
function renderHike(hike, index) {
    if (!hike.route) return;

    const line = L.polyline(hike.route, { color: "green" }).addTo(map);

    const li = document.createElement("li");
    li.innerHTML = `<b>${hike.name}</b><br>${hike.distance} km`;

    li.onclick = () => {
        selectedHikeIndex = index;
        map.fitBounds(line.getBounds());
    };

    document.getElementById("hike-list").appendChild(li);
}

});
