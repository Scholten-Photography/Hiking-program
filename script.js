const map = L.map('map').setView([49.05, -122.3], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 🔑 PUT YOUR API KEY HERE
const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJjMjcwN2UzOWZmOTQ4NzJiNDYwZDZhMTA2NzNhYWExIiwiaCI6Im11cm11cjY0In0=";

let snapMode = true;
let routePoints = [];
let currentRoute = [];
let currentLine = null;
let hikes = JSON.parse(localStorage.getItem("hikes")) || [];
let selectedHikeIndex = null;

// Load hikes
hikes.forEach((hike, index) => renderHike(hike, index));

/* =========================
   MODE TOGGLE
========================= */
const modeBtn = document.getElementById("mode-toggle");

modeBtn.addEventListener("click", () => {
    snapMode = !snapMode;
    modeBtn.textContent = snapMode ? "Mode: Snap" : "Mode: Manual";
});

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
   INPUT CONTROL
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
   SNAP ROUTING (FIXED)
========================= */
async function getRoute(points) {
    try {
        const response = await fetch(
            "https://api.openrouteservice.org/v2/directions/foot-hiking",
            {
                method: "POST",
                headers: {
                    "Authorization": API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    coordinates: points,
                    instructions: false
                })
            }
        );

        const data = await response.json();

        console.log("API RESPONSE:", data); // 🔍 DEBUG

        if (!data.routes || !data.routes.length) {
            alert("No route found here. Try spreading points farther apart or use manual mode.");
            return;
        }

        const coords = data.routes[0].geometry.coordinates;
        const latlngs = coords.map(c => [c[1], c[0]]);

        currentRoute = latlngs;

        drawLine(latlngs);

        const distance = (data.routes[0].summary.distance / 1000).toFixed(2);

        document.getElementById("live-distance").textContent =
            "Distance: " + distance + " km";

    } catch (err) {
        console.error("ROUTING ERROR:", err);
        alert("Routing failed. Check console (F12) for details.");
    }
}

/* =========================
   MANUAL DRAW
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
        color: 'blue',
        smoothFactor: 1.5
    }).addTo(map);
}

/* =========================
   SAVE
========================= */
document.getElementById("save-btn").addEventListener("click", function() {
    if (currentRoute.length < 2) {
        alert("Create a route first!");
        return;
    }

    const name = prompt("Hike name:");
    if (!name) return;

    const elevation = prompt("Elevation gain (m):") || "N/A";
    const notes = prompt("Notes:");

    const distance = document.getElementById("live-distance")
        .textContent.replace("Distance: ", "").replace(" km", "");

    const hike = { name, distance, elevation, notes, route: currentRoute };

    hikes.push(hike);
    localStorage.setItem("hikes", JSON.stringify(hikes));

    renderHike(hike, hikes.length - 1);
    resetDrawing();
});

/* =========================
   UNDO
========================= */
document.getElementById("undo-btn").addEventListener("click", function() {
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
});

/* =========================
   CLEAR
========================= */
document.getElementById("clear-btn").addEventListener("click", resetDrawing);

function resetDrawing() {
    routePoints = [];
    currentRoute = [];

    if (currentLine) map.removeLayer(currentLine);
    currentLine = null;

    document.getElementById("live-distance").textContent = "Distance: 0 km";
}

/* =========================
   RENDER SAVED
========================= */
function renderHike(hike, index) {
    const line = L.polyline(hike.route, { color: "green" }).addTo(map);

    const li = document.createElement("li");
    li.innerHTML = `<b>${hike.name}</b><br>${hike.distance} km`;

    li.addEventListener("click", () => {
        selectedHikeIndex = index;
        map.fitBounds(line.getBounds());
        showDetails(hike);
    });

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
document.getElementById("delete-btn").addEventListener("click", function() {
    if (selectedHikeIndex === null) return;

    if (!confirm("Delete this hike?")) return;

    hikes.splice(selectedHikeIndex, 1);
    localStorage.setItem("hikes", JSON.stringify(hikes));
    location.reload();
});

/* =========================
   EDIT
========================= */
document.getElementById("edit-btn").addEventListener("click", function() {
    if (selectedHikeIndex === null) return;

    const hike = hikes[selectedHikeIndex];

    hike.name = prompt("New name:", hike.name) || hike.name;
    hike.elevation = prompt("New elevation:", hike.elevation) || hike.elevation;
    hike.notes = prompt("New notes:", hike.notes) || hike.notes;

    localStorage.setItem("hikes", JSON.stringify(hikes));
    location.reload();
});
