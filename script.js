const map = L.map('map').setView([49.05, -122.3], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let currentRoute = [];
let hikes = JSON.parse(localStorage.getItem("hikes")) || [];

// Load saved hikes
hikes.forEach(renderHike);

// Click to add route points
map.on('click', function(e) {
    currentRoute.push([e.latlng.lat, e.latlng.lng]);

    L.marker(e.latlng).addTo(map);

    if (currentRoute.length > 1) {
        L.polyline(currentRoute, {color: 'blue'}).addTo(map);
    }
});

// Save hike on key press
document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        if (currentRoute.length < 2) {
            alert("Draw a route first!");
            return;
        }

        const name = prompt("Hike name:");
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

        currentRoute = [];
    }
});

function renderHike(hike) {
    const line = L.polyline(hike.route, {color: 'green'}).addTo(map);

    const li = document.createElement("li");
    li.innerHTML = `
        <b>${hike.name}</b><br>
        ${hike.distance} km
    `;

    li.addEventListener("click", () => {
        map.fitBounds(line.getBounds());
    });

    document.getElementById("hike-list").appendChild(li);
}
