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
   INPUT
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
   POLYLINE DECODER
========================= */
function decodePolyline(str, precision = 5) {
    let index = 0, lat = 0, lng = 0, coordinates = [];
    const factor = Math.pow(10, precision);

    while (index < str.length) {
        let result = 1, shift = 0, b;
        do {
            b = str.charCodeAt(index++) - 63 - 1;
            result += b << shift;
            shift += 5;
        } while (b >= 0x1f);

        lat += (result & 1 ? ~(result >> 1) : (result >> 1));

        result = 1;
        shift = 0;

        do {
            b = str.charCodeAt(index++) - 63 - 1;
            result += b << shift;
            shift += 5;
        } while (b >= 0x1f);

        lng += (result & 1 ? ~(result >> 1) : (result >> 1));

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
}

/* =========================
   SNAP ROUTING (FIXED)
========================= */
async function getRoute(points) {
    try {
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

        console.log("API:", data);

        if (!data.features || !data.features.length) {
            alert("No route found. Try manual mode.");
            return;
        }

        // ✅ DIRECT coordinates (no decoding needed)
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
            "Distance: fallback";

        alert("Snap failed — using fallback.");
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
   DRAW
========================= */
function drawLine(route) {
    if (currentLine) map.removeLayer(currentLine);

    currentLine = L.polyline(route, {
        color: 'blue',
        smoothFactor: 1.5
    }).addTo(map);
}

/* =========================
   SAVE / CLEAR / UNDO
========================= */
document.getElementById("save-btn").onclick = function() {
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

document.getElementById("clear-btn").onclick = () => location.reload();

document.getElementById("undo-btn").onclick = function() {
    routePoints.pop();
};
