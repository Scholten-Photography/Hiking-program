const map = L.map('map').setView([49.05, -122.3], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJjMjcwN2UzOWZmOTQ4NzJiNDYwZDZhMTA2NzNhYWExIiwiaCI6Im11cm11cjY0In0=";

let snapMode = true;
let routePoints = [];
let currentRoute = [];
let currentLine = null;

let hikes = JSON.parse(localStorage.getItem("hikes")) || [];
let selectedHikeIndex = null;

/* =========================
   RENDER HIKES
========================= */
hikes.forEach((hike, index) => {
    const line = L.polyline(hike.route, { color: "green" }).addTo(map);

    const li = document.createElement("li");
    li.innerHTML = `<b>${hike.name}</b><br>${hike.distance} km`;

    li.onclick = (e) => {
        e.stopPropagation(); // 🔥 prevents panel closing

        selectedHikeIndex = index;
        map.fitBounds(line.getBounds());
        showDetails(hike);
    };

    document.getElementById("hike-list").appendChild(li);
});

/* =========================
   PANEL
========================= */
function showDetails(hike) {
    document.getElementById("detail-name").textContent = hike.name;
    document.getElementById("detail-distance").textContent = hike.distance + " km";
    document.getElementById("detail-elevation").textContent = hike.elevation + " m";
    document.getElementById("detail-notes").textContent = hike.notes || "";

    document.getElementById("detail-panel").classList.remove("hidden");
}

document.getElementById("close-panel").onclick = () => {
    document.getElementById("detail-panel").classList.add("hidden");
};

/* =========================
   MODE TOGGLE
========================= */
document.getElementById("mode-toggle").onclick = function () {
    snapMode = !snapMode;
    this.textContent = snapMode ? "Mode: Snap" : "Mode: Manual";
};

/* =========================
   MAP CLICK (FIXED)
========================= */
map.on('click', function(e) {

    // Click map without shift → close panel
    if (!e.originalEvent.shiftKey) {
        document.getElementById("detail-panel").classList.add("hidden");
        return;
    }

    // SHIFT = draw
    if (snapMode) {
        routePoints.push([e.latlng.lng, e.latlng.lat]);

        if (routePoints.length >= 2) {
            getRoute(routePoints);
        }
    } else {
        currentRoute.push([e.latlng.lat, e.latlng.lng]);
        drawLine(currentRoute);
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
        currentRoute = coords.map(c => [c[1], c[0]]);

        drawLine(currentRoute);

        const dist = (data.features[0].properties.summary.distance / 1000).toFixed(2);
        document.getElementById("live-distance").textContent = "Distance: " + dist + " km";

    } catch (err) {
        console.error(err);
        alert("Routing failed");
    }
}

/* =========================
   DRAW LINE
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
document.getElementById("save-btn").onclick = function () {
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
   UNDO
========================= */
document.getElementById("undo-btn").onclick = function () {
    if (snapMode) {
        routePoints.pop();

        if (routePoints.length >= 2) {
            getRoute(routePoints);
        } else {
            clearDrawing();
        }
    } else {
        currentRoute.pop();
        drawLine(currentRoute);
    }
};

/* =========================
   CLEAR (FIXED)
========================= */
document.getElementById("clear-btn").onclick = clearDrawing;

function clearDrawing() {
    routePoints = [];
    currentRoute = [];

    if (currentLine) {
        map.removeLayer(currentLine);
        currentLine = null;
    }

    document.getElementById("live-distance").textContent = "Distance: 0 km";
}

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
