'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Pusher from 'pusher-js';
import L from 'leaflet';

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

// --- PRIVACY MATH (Haversine Formula) ---
const PESU_LAT = 12.9352;
const PESU_LNG = 77.5364;

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function getDistanceFromPESU(lat: number, lng: number) {
  const R = 6371; 
  const dLat = deg2rad(PESU_LAT - lat);
  const dLng = deg2rad(PESU_LNG - lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat)) * Math.cos(deg2rad(PESU_LAT)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}
// ----------------------------------------

interface TrackingMapProps {
  userName: string;
  poolId: string | null;
}

export default function TrackingMap({ userName, poolId }: TrackingMapProps) {
  const [liveUsers, setLiveUsers] = useState<Record<string, { lat: number; lng: number }>>({});
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // NEW: State to track exactly why the GPS might be failing
  const [geoError, setGeoError] = useState<string | null>(null); 

  // 1. Pusher Listener
  useEffect(() => {
    if (!poolId) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(poolId);

    channel.bind('location-update', (data: { userId: string; lat: number; lng: number }) => {
      if (data.userId !== userName) {
        setLiveUsers((prev) => ({
          ...prev,
          [data.userId]: { lat: data.lat, lng: data.lng },
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
      pusher.unsubscribe(poolId);
    };
  }, [poolId, userName]);

  // 2. Geolocation Broadcaster (With 2km Geofence)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Browser does not support GPS");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGeoError(null); // Clear errors on success
        const { latitude, longitude } = position.coords;
        
        setMyLocation({ lat: latitude, lng: longitude });

        const distanceToCampus = getDistanceFromPESU(latitude, longitude);

        if (poolId && distanceToCampus <= 2.0) {
          fetch('/api/tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              poolId,
              userId: userName,
              lat: latitude,
              lng: longitude,
            }),
          }).catch(err => console.error("Broadcast failed:", err));
        }
      },
      (error) => {
        console.error("Error watching location:", error.message);
        // Translate browser error codes into readable UI messages
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
  }, [poolId, userName]);

  const distanceToCampus = myLocation ? getDistanceFromPESU(myLocation.lat, myLocation.lng) : null;

  return (
    // We moved the height to this wrapper div so we can layer the UI badges on top of the map
    <div className="relative h-[500px] w-full rounded-xl overflow-hidden z-0">
      
      {/* --- FLOATING STATUS BADGES --- */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2 pointer-events-none">
        
        {/* 1. Privacy Active Badge */}
        {distanceToCampus !== null && distanceToCampus > 2.0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-zinc-900/90 px-3 py-1.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
            <span>🛡️</span>
            <span>Privacy Active (&gt;2km)</span>
          </div>
        )}

        {/* 2. GPS Error Badge */}
        {geoError && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-[10px] font-bold text-red-800 shadow-md border border-red-200">
            <span>⚠️</span>
            <span>{geoError}</span>
          </div>
        )}

        {/* 3. GPS Loading Badge */}
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
            <Popup>You</Popup>
          </Marker>
        )}

        {Object.entries(liveUsers).map(([id, coords]) => (
          <Marker 
            key={id} 
            position={[coords.lat, coords.lng]} 
            icon={getPinForUser(id)} 
          >
            <Popup>{id}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}