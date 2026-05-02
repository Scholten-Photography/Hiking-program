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

    li.onclick = () => {
        selectedHikeIndex = index;
        map.fitBounds(line.getBounds());
        showDetails(hike);
    };

    document.getElementById("hike-list").appendChild(li);
});

/* =========================
   PANEL UPDATE
========================= */
function showDetails(hike) {
    document.getElementById("detail-name").textContent = hike.name;
    document.getElementById("detail-distance").textContent = hike.distance + " km";
    document.getElementById("detail-elevation").textContent = hike.elevation + " m";
    document.getElementById("detail-notes").textContent = hike.notes || "";
}

/* =========================
   MODE
========================= */
document.getElementById("mode-toggle").onclick = function () {
    snapMode = !snapMode;
    this.textContent = snapMode ? "Mode: Snap" : "Mode: Manual";
};

/* =========================
   DRAW
========================= */
map.on('click', function(e) {
    if (!e.originalEvent.shiftKey) return;

    if (snapMode) {
        routePoints.push([e.latlng.lng, e.latlng.lat]);
        if (routePoints.length >= 2) getRoute(routePoints);
    } else {
        currentRoute.push([e.latlng.lat, e.latlng.lng]);
        drawLine(currentRoute);
    }
});

/* =========================
   ROUTING
========================= */
async function getRoute(points) {
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

    if (!data.features?.length) return alert("No route");

    const coords = data.features[0].geometry.coordinates;
    currentRoute = coords.map(c => [c[1], c[0]]);

    drawLine(currentRoute);

    const dist = (data.features[0].properties.summary.distance / 1000).toFixed(2);
    document.getElementById("live-distance").textContent = "Distance: " + dist + " km";
}

/* =========================
   DRAW LINE
========================= */
function drawLine(route) {
    if (currentLine) map.removeLayer(currentLine);
    currentLine = L.polyline(route, { color: "blue" }).addTo(map);
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
        if (routePoints.length >= 2) getRoute(routePoints);
    } else {
        currentRoute.pop();
        drawLine(currentRoute);
    }
};

/* =========================
   CLEAR
========================= */
document.getElementById("clear-btn").onclick = function () {
    routePoints = [];
    currentRoute = [];

    if (currentLine) {
        map.removeLayer(currentLine);
        currentLine = null;
    }

    document.getElementById("live-distance").textContent = "Distance: 0 km";
};

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
