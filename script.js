const map = L.map('map').setView([49.05, -122.3], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let currentRoute = [];
let currentLine = null;
let hikes = JSON.parse(localStorage.getItem("hikes")) || [];

// Load saved hikes
hikes.forEach(renderHike);

// Draw route (NO markers anymore)
map.on('click', function(e) {
    currentRoute.push([e.latlng.lat, e.latlng.lng]);

    if (currentLine) {
        map.removeLayer(currentLine);
    }

    currentLine = L.polyline(currentRoute, { color: 'blue' }).addTo(map);
});

// SAVE BUTTON
document.getElementById("save-btn").addEventListener("click", function() {
    if (currentRoute.length < 2) {
        alert("Draw a route first!");
        return;
    }

    const name = prompt("Hike name:");
    if (!name) return;

    const distance = prompt("Distance (km):");
    const notes = prompt("Notes:");

    const hike = {
        name,
        distance,
        notes,
        route: currentRoute
    };

    hikes.push(hike);
    localStorage.setItem("hikes", JSON.stringify(hikes));

    renderHike(hike);

    // reset
    currentRoute = [];
    if (currentLine) {
        map.removeLayer(currentLine);
        currentLine = null;
    }
});

// CLEAR BUTTON
document.getElementById("clear-btn").addEventListener("click", function() {
    currentRoute = [];
    if (currentLine) {
        map.removeLayer(currentLine);
        currentLine = null;
    }
});

// Render saved hikes
function renderHike(hike) {
    const line = L.polyline(hike.route, { color: 'green' }).addTo(map);

    const li = document.createElement("li");
    li.innerHTML = `
        <b>${hike.name}</b><br>
        ${hike.distance || "?"} km
    `;

    li.addEventListener("click", () => {
        map.fitBounds(line.getBounds());
    });

    document.getElementById("hike-list").appendChild(li);
}
