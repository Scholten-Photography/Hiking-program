const map = L.map('map').setView([49.05, -122.3], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 🔑 PASTE YOUR API KEY HERE
const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJjMjcwN2UzOWZmOTQ4NzJiNDYwZDZhMTA2NzNhYWExIiwiaCI6Im11cm11cjY0In0=";

let routePoints = [];
let currentLine = null;
let hikes = JSON.parse(localStorage.getItem("hikes")) || [];
let selectedHikeIndex = null;

// Load hikes
hikes.forEach((hike, index) => renderHike(hike, index));

// Click to add route points (NO dragging anymore)
map.on('click', function(e) {
    routePoints.push([e.latlng.lng, e.latlng.lat]); // NOTE: lng, lat format

    if (routePoints.length >= 2) {
        getRoute(routePoints);
    }
});

// 🧠 Get snapped route from API
async function getRoute(points) {
    const response = await fetch(
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

    const data = await response.json();

    const coords = data.features[0].geometry.coordinates;

    // Convert to Leaflet format
    const latlngs = coords.map(c => [c[1], c[0]]);

    if (currentLine) map.removeLayer(currentLine);

    currentLine = L.polyline(latlngs, {
        color: "blue"
    }).addTo(map);

    const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);

    document.getElementById("live-distance").textContent =
        "Distance: " + distance + " km";

    // Store snapped route for saving
    currentRoute = latlngs;
}

// SAVE
let currentRoute = [];

document.getElementById("save-btn").addEventListener("click", function() {
    if (!currentRoute || currentRoute.length < 2) {
        alert("Create a route first!");
        return;
    }

    const name = prompt("Hike name:");
    if (!name) return;

    const elevation = prompt("Elevation gain (m):") || "N/A";
    const notes = prompt("Notes:");

    const distanceText = document.getElementById("live-distance").textContent;
    const distance = distanceText.replace("Distance: ", "").replace(" km", "");

    const hike = { name, distance, elevation, notes, route: currentRoute };

    hikes.push(hike);
    localStorage.setItem("hikes", JSON.stringify(hikes));

    renderHike(hike, hikes.length - 1);
    resetDrawing();
});

// CLEAR
document.getElementById("clear-btn").addEventListener("click", resetDrawing);

function resetDrawing() {
    routePoints = [];
    currentRoute = [];

    if (currentLine) map.removeLayer(currentLine);
    currentLine = null;

    document.getElementById("live-distance").textContent = "Distance: 0 km";
}

// Render hikes
function renderHike(hike, index) {
    const line = L.polyline(hike.route, {
        color: "green"
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
