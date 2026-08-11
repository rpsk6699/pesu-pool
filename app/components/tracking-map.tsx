'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { createPusherClient, poolChannel } from '../../lib/pusher-browser';
import { GEOFENCE_MAX_KM, distanceKmFromPESU } from '../../lib/geofence';

// --- BULLETPROOF COLORED PINS ---
const pinCache: Record<string, L.Icon> = {};

function getPin(color: string) {
  if (!pinCache[color]) {
    pinCache[color] = new L.Icon({
      iconUrl: `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }
  return pinCache[color];
}

const USER_COLORS = ['green', 'red', 'yellow'];

function getPinForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return getPin(USER_COLORS[index]);
}
// --------------------------------

interface LiveUser {
  name: string | null;
  lat: number;
  lng: number;
}

interface TrackingMapProps {
  userName: string;
  userId: string | null;
  poolId: string | null;
}

export default function TrackingMap({ userName, userId, poolId }: TrackingMapProps) {
  const [liveUsers, setLiveUsers] = useState<Record<string, LiveUser>>({});
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // 1. Pusher Listener (private channel — auth via /api/pusher/auth)
  useEffect(() => {
    if (!poolId) return;

    const pusher = createPusherClient();
    const channelName = poolChannel(poolId);
    const channel = pusher.subscribe(channelName);

    channel.bind('location-update', (data: { userId: string; name: string | null; lat: number; lng: number }) => {
      if (data.userId !== userId) {
        setLiveUsers((prev) => ({
          ...prev,
          [data.userId]: { name: data.name, lat: data.lat, lng: data.lng },
        }));
      }
    });

    channel.bind('user-left', (data: { userId: string }) => {
      setLiveUsers((prev) => {
        const newState = { ...prev };
        delete newState[data.userId];
        return newState;
      });
    });

    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [poolId, userId]);

  // 2. Geolocation Broadcaster (client-side UX gate; server re-validates geofence)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Browser does not support GPS");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGeoError(null);
        const { latitude, longitude } = position.coords;

        setMyLocation({ lat: latitude, lng: longitude });

        const distanceToCampus = distanceKmFromPESU(latitude, longitude);

        if (poolId && distanceToCampus <= GEOFENCE_MAX_KM) {
          fetch('/api/tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              poolId,
              lat: latitude,
              lng: longitude,
            }),
          }).catch(err => console.error("Broadcast failed:", err));
        }
      },
      (error) => {
        console.error("Error watching location:", error.message);
        if (error.code === 1) setGeoError("Location permission denied");
        else if (error.code === 2) setGeoError("Location unavailable");
        else if (error.code === 3) setGeoError("GPS request timed out");
        else setGeoError(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [poolId]);

  const distanceToCampus = myLocation ? distanceKmFromPESU(myLocation.lat, myLocation.lng) : null;

  return (
    <div className="relative h-[500px] w-full rounded-xl overflow-hidden z-0">

      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2 pointer-events-none">

        {distanceToCampus !== null && distanceToCampus > GEOFENCE_MAX_KM && (
          <div className="flex items-center gap-1.5 rounded-full bg-zinc-900/90 px-3 py-1.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
            <span>🛡️</span>
            <span>Privacy Active (&gt;2km)</span>
          </div>
        )}

        {geoError && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-[10px] font-bold text-red-800 shadow-md border border-red-200">
            <span>⚠️</span>
            <span>{geoError}</span>
          </div>
        )}

        {!myLocation && !geoError && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-bold text-amber-800 shadow-md border border-amber-200">
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
            <span>Acquiring GPS...</span>
          </div>
        )}
      </div>

      <MapContainer
        center={[12.9407, 77.5332]}
        zoom={14}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={[12.9464, 77.5306]} icon={getPin('violet')}><Popup>Mysore Road Metro (PES side)</Popup></Marker>
        <Marker position={[12.9465, 77.5299]} icon={getPin('violet')}><Popup>Mysore Road Metro (Attiguppe side)</Popup></Marker>
        <Marker position={[12.9352, 77.5364]} icon={getPin('orange')}><Popup>PESU Front Gate</Popup></Marker>
        <Marker position={[12.9350, 77.5329]} icon={getPin('orange')}><Popup>PESU Back Gate</Popup></Marker>

        {myLocation && (
          <Marker position={[myLocation.lat, myLocation.lng]} icon={getPin('black')}>
            <Popup>You ({userName})</Popup>
          </Marker>
        )}

        {Object.entries(liveUsers).map(([id, coords]) => (
          <Marker
            key={id}
            position={[coords.lat, coords.lng]}
            icon={getPinForUser(id)}
          >
            <Popup>{coords.name ?? 'Rider'}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
