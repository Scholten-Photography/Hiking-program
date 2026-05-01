// Initialize map centered near Abbotsford/Vancouver
const map = L.map('map').setView([49.05, -122.3], 10);

// Add map tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Click to add hike
map.on('click', function(e) {
    const name = prompt("Hike name:");
    const distance = prompt("Distance (km):");
    const notes = prompt("Notes:");

    if (!name) return;

    const marker = L.marker(e.latlng).addTo(map);

    marker.bindPopup(`
        <b>${name}</b><br>
        Distance: ${distance} km<br>
        ${notes}
    `);
});
