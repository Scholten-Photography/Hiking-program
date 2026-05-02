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
   RENDER
========================= */
function renderAllHikes() {
    document.getElementById("hike-list").innerHTML = "";

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
}

renderAllHikes();

/* =========================
   PANEL
========================= */
function showDetails(hike) {
    document.getElementById("detail-name").textContent = hike.name;
    document.getElementById("detail-distance").textContent = hike.distance + " km";
    document.getElementById("detail-elevation").textContent = hike.elevation + " m";
    document.getElementById("detail-notes").textContent = hike.notes || "";

    drawElevationChart(hike.elevationData || []);
}

/* =========================
   DRAW ELEVATION GRAPH
========================= */
function drawElevationChart(data) {
    const canvas = document.getElementById("elevation-chart");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!data.length) return;

    const max = Math.max(...data);
    const min = Math.min(...data);

    ctx.beginPath();

    data.forEach((val, i) => {
        const x = (i / data.length) * canvas.width;
        const y = canvas.height - ((val - min) / (max - min)) * canvas.height;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.stroke();
}

/* =========================
   GET ELEVATION (SAFE)
========================= */
async function getElevation(route) {
    try {
        const locations = route.slice(0, 50).map(p => `${p[0]},${p[1]}`).join("|");

        const res = await fetch(
            `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`
        );

        const data = await res.json();

        return data.results.map(r => r.elevation);

    } catch {
        return [];
    }
}

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

    if (!data.features?.length) return;

    const coords = data.features[0].geometry.coordinates;
    currentRoute = coords.map(c => [c[1], c[0]]);

    drawLine(currentRoute);

    const dist = (data.features[0].properties.summary.distance / 1000).toFixed(2);
    document.getElementById("live-distance").textContent =
        "Distance: " + dist + " km";
}

/* =========================
   DRAW LINE
========================= */
function drawLine(route) {
    if (currentLine) map.removeLayer(currentLine);
    currentLine = L.polyline(route, { color: "blue" }).addTo(map);
}

/* =========================
   SAVE (WITH ELEVATION)
========================= */
document.getElementById("save-btn").onclick = async function (e) {
    e.preventDefault();

    if (currentRoute.length < 2) return alert("Draw route first");

    const name = prompt("Hike name:");
    if (!name) return;

    const notes = prompt("Notes:");

    const distance = document.getElementById("live-distance")
        .textContent.replace("Distance: ", "").replace(" km", "");

    const elevationData = await getElevation(currentRoute);

    const elevation = elevationData.length
        ? Math.max(...elevationData) - Math.min(...elevationData)
        : "N/A";

    hikes.push({
        name,
        distance,
        elevation,
        notes,
        route: currentRoute,
        elevationData
    });

    localStorage.setItem("hikes", JSON.stringify(hikes));
    renderAllHikes();
};

/* =========================
   BASIC BUTTONS
========================= */
document.getElementById("undo-btn").onclick = function (e) {
    e.preventDefault();
    currentRoute.pop();
    drawLine(currentRoute);
};

document.getElementById("clear-btn").onclick = function (e) {
    e.preventDefault();

    routePoints = [];
    currentRoute = [];

    if (currentLine) {
        map.removeLayer(currentLine);
        currentLine = null;
    }

    document.getElementById("live-distance").textContent = "Distance: 0 km";
};

/* =========================
   EDIT / DELETE
========================= */
document.getElementById("delete-btn").onclick = function () {
    if (selectedHikeIndex === null) return;

    hikes.splice(selectedHikeIndex, 1);
    localStorage.setItem("hikes", JSON.stringify(hikes));
    renderAllHikes();
};

document.getElementById("edit-btn").onclick = function () {
    if (selectedHikeIndex === null) return;

    const hike = hikes[selectedHikeIndex];

    hike.name = prompt("New name:", hike.name) || hike.name;
    hike.notes = prompt("New notes:", hike.notes) || hike.notes;

    localStorage.setItem("hikes", JSON.stringify(hikes));
    renderAllHikes();
};
