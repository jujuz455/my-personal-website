'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import tripsData from '@/data/trips.json';
import placesData from '@/data/google-places.json';

const pinIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const featuredIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function MapComponent() {
  return (
    <MapContainer center={[30, 20]} zoom={2} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Saved places from Google Maps — clustered */}
      <MarkerClusterGroup chunkedLoading>
        {placesData.map((place) => (
          <Marker
            key={place.id}
            position={place.coordinates as [number, number]}
            icon={pinIcon}
          >
            <Popup>
              <div className="w-44">
                <p className="font-semibold text-sm mb-1">{place.name}</p>
                <a
                  href={place.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  Open in Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>

      {/* Featured trips with photos — always visible, red marker */}
      {tripsData.map((trip) => (
        <Marker
          key={trip.id}
          position={trip.coordinates as [number, number]}
          icon={featuredIcon}
        >
          <Popup>
            <div className="w-48">
              <h3 className="font-bold text-sm mb-1">{trip.city}</h3>
              <img src={trip.photo} alt={trip.city} className="w-full h-auto object-cover mb-1 rounded" />
              <p className="text-xs text-gray-600">{trip.info}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
