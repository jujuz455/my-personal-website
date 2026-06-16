'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import tripsData from '@/data/trips.json';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  url?: string;
  featured?: boolean;
  photo?: string;
  info?: string;
};

const places: Place[] = tripsData.map(t => ({
  id: `trip-${t.id}`,
  name: t.city,
  lat: t.coordinates[0],
  lng: t.coordinates[1],
  featured: true,
  photo: t.photo,
  info: t.info,
}));

const countryLabels = [
  { name: 'Canada', lat: 56.1, lng: -96.3 },
  { name: 'United States', lat: 38.9, lng: -97.0 },
  { name: 'Mexico', lat: 23.6, lng: -102.5 },
  { name: 'Cuba', lat: 21.5, lng: -79.5 },
  { name: 'Peru', lat: -9.2, lng: -75.0 },
  { name: 'Uruguay', lat: -32.5, lng: -55.8 },
  { name: 'Brazil', lat: -14.2, lng: -51.9 },
  { name: 'Iceland', lat: 64.9, lng: -19.0 },
  { name: 'United Kingdom', lat: 55.4, lng: -3.4 },
  { name: 'France', lat: 46.2, lng: 2.2 },
  { name: 'Spain', lat: 40.5, lng: -3.7 },
  { name: 'Portugal', lat: 39.4, lng: -8.2 },
  { name: 'Germany', lat: 51.2, lng: 10.5 },
  { name: 'Russia', lat: 61.5, lng: 90.0 },
  { name: 'Armenia', lat: 40.1, lng: 45.0 },
  { name: 'China', lat: 35.9, lng: 104.2 },
  { name: 'Japan', lat: 36.2, lng: 138.3 },
  { name: 'Singapore', lat: 1.4, lng: 103.8 },
  { name: 'India', lat: 20.6, lng: 79.0 },
  { name: 'Australia', lat: -25.3, lng: 133.8 },
];

const pinIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

function addPlanets(scene: THREE.Scene, meshesRef: React.MutableRefObject<THREE.Mesh[]>) {
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(300, 200, 300);
  scene.add(light);

  const saturn = new THREE.Mesh(
    new THREE.SphereGeometry(20, 48, 48),
    new THREE.MeshPhongMaterial({ color: '#D4A96A', shininess: 15 })
  );
  saturn.position.set(290, 130, 40);
  scene.add(saturn);

  [{ inner: 26, outer: 44, color: '#C8A97A', opacity: 0.55 },
   { inner: 45, outer: 52, color: '#B89060', opacity: 0.3 }].forEach(r => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r.inner, r.outer, 80),
      new THREE.MeshBasicMaterial({ color: r.color, side: THREE.DoubleSide, transparent: true, opacity: r.opacity })
    );
    ring.position.copy(saturn.position);
    ring.rotation.x = Math.PI / 2.8;
    scene.add(ring);
  });

  const mars = new THREE.Mesh(
    new THREE.SphereGeometry(11, 48, 48),
    new THREE.MeshPhongMaterial({ color: '#B5341A', shininess: 8 })
  );
  mars.position.set(-230, -110, 60);
  scene.add(mars);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(7, 32, 32),
    new THREE.MeshPhongMaterial({ color: '#9A9A9A', shininess: 5 })
  );
  moon.position.set(160, -140, 80);
  scene.add(moon);

  meshesRef.current = [saturn, mars, moon];
}

// ── Info card ─────────────────────────────────────────────────────────────────
function InfoCard({ place, onClose }: { place: Place; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 2000, background: '#F4E8D0', border: '1px solid #C8A97A',
      minWidth: '340px', maxWidth: '480px', width: '36vw',
      boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
      fontFamily: 'var(--font-geist-sans), sans-serif', overflow: 'hidden',
    }}>
      <div style={{ position: 'relative' }}>
        <img
          src={place.photo ?? `https://staticmap.openstreetmap.de/staticmap.php?center=${place.lat},${place.lng}&zoom=14&size=320x180&markers=${place.lat},${place.lng},red`}
          alt={place.name}
          style={{ width: '100%', height: '260px', objectFit: 'contain', display: 'block', background: '#1a1209' }}
          onError={(e) => {
            const img = e.currentTarget;
            img.onerror = null;
            img.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${place.lat},${place.lng}&zoom=14&size=320x180&markers=${place.lat},${place.lng},red`;
          }}
        />
        <button onClick={onClose} style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
          width: '28px', height: '28px', cursor: 'pointer', color: '#fff',
          fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>
      <div style={{ padding: '0.9rem 1.1rem 1rem' }}>
        <p style={{ fontWeight: 700, fontSize: '15px', color: '#2C1A0E', marginBottom: '0.3rem' }}>
          {place.name}
        </p>
        {place.info && (
          <p style={{ fontSize: '12px', color: '#7A5235', marginBottom: '0.6rem', lineHeight: 1.5 }}>
            {place.info}
          </p>
        )}
        {place.url && (
          <a href={place.url} target="_blank" rel="noreferrer"
            style={{ fontSize: '12px', color: '#5C3417', textDecoration: 'underline' }}>
            Open in Google Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ── Leaflet detail map ────────────────────────────────────────────────────────
function DetailMap({ center, zoom, onBack, onSelectPlace }: {
  center: [number, number];
  zoom: number;
  onBack: () => void;
  onSelectPlace: (p: Place) => void;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
      <button onClick={onBack} style={{
        position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000,
        background: 'rgba(244,232,208,0.92)', backdropFilter: 'blur(6px)',
        border: '1px solid #C8A97A', padding: '0.4rem 1rem',
        fontSize: '13px', fontFamily: 'var(--font-geist-sans), sans-serif',
        cursor: 'pointer', color: '#2C1A0E',
      }}>← Globe</button>

      <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          maxZoom={19}
        />
        <MarkerClusterGroup chunkedLoading>
          {places.map(place => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={pinIcon}
              eventHandlers={{ click: () => onSelectPlace(place) }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GlobeMap() {
  const globeEl = useRef<any>(null);
  const planetMeshes = useRef<THREE.Mesh[]>([]);
  const mouseXY = useRef({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Place | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [mode, setMode] = useState<'globe' | 'detail'>('globe');
  const [detailCenter, setDetailCenter] = useState<[number, number]>([35, 135]);
  const [detailZoom, setDetailZoom] = useState(8);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Raycaster — only for planet tooltips now
  useEffect(() => {
    if (!globeReady || mode !== 'globe' || !globeEl.current) return;
    const globe = globeEl.current;
    const canvas = globe.renderer().domElement as HTMLCanvasElement;
    const camera = globe.camera();
    const raycaster = new THREE.Raycaster();

    const onMove = (e: MouseEvent) => {
      mouseXY.current = { x: e.clientX, y: e.clientY };
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.intersectObjects(planetMeshes.current).length > 0) {
        setTooltip({ text: "I'll probably go there one day", x: e.clientX, y: e.clientY });
      } else {
        setTooltip(null);
      }
    };

    canvas.addEventListener('mousemove', onMove);
    return () => canvas.removeEventListener('mousemove', onMove);
  }, [globeReady, mode]);

  const handleGlobeReady = useCallback(() => {
    const globe = globeEl.current;
    if (!globe) return;

    const ctrl = globe.controls();
    ctrl.autoRotate = false;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.1;
    ctrl.minDistance = 120;
    ctrl.maxDistance = 600;
    globe.pointOfView({ altitude: 2.2 }, 0);

    addPlanets(globe.scene(), planetMeshes);
    setGlobeReady(true);

    ctrl.addEventListener('change', () => {
      const pov = globe.pointOfView();
      if (pov?.altitude !== undefined && pov.altitude < 0.35) {
        const mapZoom = Math.min(14, Math.max(6, Math.round(11 - pov.altitude * 10)));
        setDetailCenter([pov.lat ?? 35, pov.lng ?? 135]);
        setDetailZoom(mapZoom);
        setMode('detail');
      }
    });
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', background: '#070b18', position: 'relative', overflow: 'hidden' }}>

      <div style={{
        position: 'absolute', inset: 0,
        opacity: mode === 'globe' ? 1 : 0,
        pointerEvents: mode === 'globe' ? 'auto' : 'none',
        transition: 'opacity 0.4s ease',
      }}>
        <Globe
          ref={globeEl}
          width={dims.w}
          height={dims.h}
          globeImageUrl="/earth-blue-marble.jpg"
          bumpImageUrl="/earth-topology.png"
          backgroundImageUrl="/night-sky.png"
          atmosphereColor="lightskyblue"
          atmosphereAltitude={0.2}
          backgroundColor="rgba(0,0,0,0)"

          // ── 3D points — properly stuck to the globe surface ──
          pointsData={places}
          pointLat={(d: any) => d.lat}
          pointLng={(d: any) => d.lng}
          pointAltitude={0.005}
          pointRadius={(d: any) => d.featured ? 0.20 : 0.22}
          pointColor={(d: any) => d.featured ? '#D4A843' : 'rgba(200,169,122,0.9)'}
          pointLabel={(d: any) => `<div style="font-family:sans-serif;font-size:12px;background:rgba(237,217,181,0.95);color:#2C1A0E;padding:3px 9px;border:1px solid #C8A97A;white-space:nowrap">${(d as Place).name}</div>`}
          onPointClick={(d: any) => {
            setSelected(d as Place);
            globeEl.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.2 }, 900);
          }}
          onPointHover={(d: any) => {
            // suppress planet tooltip when hovering a point
            if (d) setTooltip(null);
          }}

          // ── Pulsing rings for featured trips ──
          ringsData={places}
          ringLat={(d: any) => d.lat}
          ringLng={(d: any) => d.lng}
          ringColor={() => '#D4A843'}
          ringMaxRadius={1.5}
          ringPropagationSpeed={1.0}
          ringRepeatPeriod={2000}

          // ── Country labels ──
          labelsData={countryLabels}
          labelLat={(d: any) => d.lat}
          labelLng={(d: any) => d.lng}
          labelText={(d: any) => d.name}
          labelSize={0.6}
          labelDotRadius={0}
          labelColor={() => 'rgba(255,255,255,0.75)'}
          labelResolution={3}
          labelAltitude={0.01}

          onGlobeReady={handleGlobeReady}
          onGlobeClick={() => setSelected(null)}
        />
      </div>

      {mode === 'detail' && (
        <DetailMap
          center={detailCenter}
          zoom={detailZoom}
          onBack={() => { setMode('globe'); setSelected(null); }}
          onSelectPlace={setSelected}
        />
      )}

      {selected && <InfoCard place={selected} onClose={() => setSelected(null)} />}

      {tooltip && mode === 'globe' && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 14,
          top: tooltip.y - 36,
          background: 'rgba(244,232,208,0.93)',
          backdropFilter: 'blur(4px)',
          border: '1px solid #C8A97A',
          padding: '0.3rem 0.75rem',
          fontSize: '12px',
          color: '#2C1A0E',
          pointerEvents: 'none',
          zIndex: 500,
          fontFamily: 'var(--font-geist-sans), sans-serif',
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
