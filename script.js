const map = L.map('map').setView([49.05, -122.3], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let currentRoute = [];
let currentLine = null;
let isDrawing = false;
let lastPoint = null;
let hikes = JSON.parse(localStorage.getItem("hikes")) || [];
let selectedHikeIndex = null;

// Load hikes
hikes.forEach((hike, index) => renderHike(hike, index));

// Distance calculation
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

// 🎯 ONLY draw when SHIFT is held
document.addEventListener("keydown", (e) => {
    if (e.key === "Shift") isDrawing = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "Shift") {
        isDrawing = false;
        lastPoint = null;
    }
});

// Smooth drawing with point filtering
map.on('mousemove', function(e) {
    if (!isDrawing) return;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Only add point if it's far enough from last (reduces noise)
    if (lastPoint) {
        const dist = map.distance(lastPoint, e.latlng);
        if (dist < 10) return; // ignore tiny movements
    }

    currentRoute.push([lat, lng]);
    lastPoint = e.latlng;

    redrawCurrent();
});

// Redraw current line
function redrawCurrent() {
    if (currentLine) map.removeLayer(currentLine);

    if (currentRoute.length > 1) {
        currentLine = L.polyline(currentRoute, {
            color: 'blue',
            smoothFactor: 1.5
        }).addTo(map);
    }

    document.getElementById("live-distance").textContent =
        "Distance: " + calculateDistance(currentRoute) + " km";
}

// SAVE
document.getElementById("save-btn").addEventListener("click", function() {
    if (currentRoute.length < 2) {
        alert("Draw a route first (hold SHIFT while dragging)!");
        return;
    }

    const name = prompt("Hike name:");
    if (!name) return;

    const elevation = prompt("Elevation gain (m):") || "N/A";
    const notes = prompt("Notes:");

    const distance = calculateDistance(currentRoute);

    const hike = { name, distance, elevation, notes, route: currentRoute };

    hikes.push(hike);
    localStorage.setItem("hikes", JSON.stringify(hikes));

    renderHike(hike, hikes.length - 1);
    resetDrawing();
});

// UNDO
document.getElementById("undo-btn").addEventListener("click", function() {
    currentRoute.pop();
    redrawCurrent();
});

// CLEAR
document.getElementById("clear-btn").addEventListener("click", resetDrawing);

function resetDrawing() {
    currentRoute = [];
    lastPoint = null;

    if (currentLine) map.removeLayer(currentLine);
    currentLine = null;

    document.getElementById("live-distance").textContent = "Distance: 0 km";
}

// Render hikes
function renderHike(hike, index) {
    const line = L.polyline(hike.route, {
        color: 'green',
        smoothFactor: 1.5
    }).addTo(map);

    const li = document.createElement("li");
    li.innerHTML = `<b>${hike.name}</b><br>${hike.distance} km`;

    li.addEventListener("click", () => {
        selectedHikeIndex = index;
        map.fitBounds(line.getBounds());
        showDetails(hike);
    });

    document.getElementById("hike-list").appendChild(li);
}

// DETAIL PANEL
function showDetails(hike) {
    document.getElementById("detail-name").textContent = hike.name;
    document.getElementById("detail-distance").textContent = hike.distance + " km";
    document.getElementById("detail-elevation").textContent = hike.elevation + " m";
    document.getElementById("detail-notes").textContent = hike.notes || "";

    document.getElementById("detail-panel").classList.remove("hidden");
}

document.getElementById("close-panel").onclick = () =>
    document.getElementById("detail-panel").classList.add("hidden");

// DELETE
document.getElementById("delete-btn").addEventListener("click", function() {
    if (selectedHikeIndex === null) return;

    if (!confirm("Delete this hike?")) return;

    hikes.splice(selectedHikeIndex, 1);
    localStorage.setItem("hikes", JSON.stringify(hikes));
    location.reload();
});

// EDIT
document.getElementById("edit-btn").addEventListener("click", function() {
    if (selectedHikeIndex === null) return;

    const hike = hikes[selectedHikeIndex];

    const name = prompt("New name:", hike.name) || hike.name;
    const elevation = prompt("New elevation:", hike.elevation) || hike.elevation;
    const notes = prompt("New notes:", hike.notes) || hike.notes;

    hike.name = name;
    hike.elevation = elevation;
    hike.notes = notes;

    localStorage.setItem("hikes", JSON.stringify(hikes));
    location.reload();
});
