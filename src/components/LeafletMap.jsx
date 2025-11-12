import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

export default function LeafletMap() {
  useEffect(() => {
    const map = L.map("map").setView([-5.7945, -35.211], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    let circle;
    const radiusInput = document.getElementById("radius");
    const updateBtn = document.getElementById("update");
    const placesList = document.getElementById("places-list");

    let userMarker;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        map.setView([lat, lng], 15);
        userMarker = L.marker([lat, lng]).addTo(map).bindPopup("Você está aqui");
        drawCircle();
        loadSavedPlaces();
      },
      () => {
        drawCircle();
        loadSavedPlaces();
      }
    );

    let localPlaces = JSON.parse(localStorage.getItem("tourism_places") || "[]");

    function savePlaces() {
      localStorage.setItem("tourism_places", JSON.stringify(localPlaces));
    }

    function loadSavedPlaces() {
      localPlaces.forEach((place) => addMarker(place));
      renderPlacesList();
    }

    function addMarker(place) {
      const marker = L.marker([place.lat, place.lng]).addTo(map);
      marker.bindPopup(`<b>${place.name}</b><br>${place.type}`);
      place.marker = marker;
    }

    function renderPlacesList() {
      placesList.innerHTML = "";
      localPlaces.forEach((place) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <b>${place.name}</b><br>
          <span class="meta">${place.type} — ${Math.round(
            place.distance || 0
          )} m</span>
        `;
        li.addEventListener("click", () => {
          map.setView([place.lat, place.lng], 17);
          place.marker.openPopup();
        });
        placesList.appendChild(li);
      });
    }

    function drawCircle() {
      if (circle) map.removeLayer(circle);
      const radius = Number(radiusInput.value);
      const center = userMarker ? userMarker.getLatLng() : map.getCenter();
      circle = L.circle(center, { radius, color: "blue", fillOpacity: 0.1 }).addTo(map);
    }

    map.on("contextmenu", (e) => {
      const name = prompt("Nome do ponto turístico:");
      if (!name) return;
      const type = prompt("Tipo do local (ex: praça, museu, monumento):") || "ponto turístico";
      const newPlace = { name, type, lat: e.latlng.lat, lng: e.latlng.lng };
      localPlaces.push(newPlace);
      savePlaces();
      addMarker(newPlace);
      renderPlacesList();
    });

    updateBtn.addEventListener("click", drawCircle);
  }, []);

  return (
    <div className="map-page">
      <div id="map" style={{ height: "80vh", width: "100%" }}></div>
      <div className="controls">
        <input id="radius" type="number" defaultValue={500} /> metros
        <button id="update">Atualizar raio</button>
      </div>
      <ul id="places-list"></ul>
    </div>
  );
}