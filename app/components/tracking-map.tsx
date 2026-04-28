'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Pusher from 'pusher-js';
import L from 'leaflet';

// --- BULLETPROOF COLORED PINS ---
// Caches the icons so the map doesn't flicker or crash when people move
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

// Restricted dynamic colors just for other passengers
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
const PESU_LAT = 12.9352; // PESU Front Gate
const PESU_LNG = 77.5364;

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function getDistanceFromPESU(lat: number, lng: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(PESU_LAT - lat);
  const dLng = deg2rad(PESU_LNG - lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat)) * Math.cos(deg2rad(PESU_LAT)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
// ----------------------------------------

interface TrackingMapProps {
  userName: string;
  poolId: string | null;
}

export default function TrackingMap({ userName, poolId }: TrackingMapProps) {
  const [liveUsers, setLiveUsers] = useState<Record<string, { lat: number; lng: number }>>({});
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

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

    // Instantly remove pins when people leave the pool
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
      console.error("Geolocation not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Always update local state so the user sees their own black pin
        setMyLocation({ lat: latitude, lng: longitude });

        // PRIVACY GEOFENCE: Check distance to PESU
        const distanceToCampus = getDistanceFromPESU(latitude, longitude);

        // ONLY broadcast to the server if in a pool AND within 2km of PESU
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
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 10000, 
        timeout: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [poolId, userName]);

  return (
    <MapContainer
      center={[12.9407, 77.5332]}
      zoom={14}
      style={{ height: '500px', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Static Route Markers */}
      <Marker position={[12.9464, 77.5306]} icon={getPin('violet')}><Popup>Mysore Road Metro (PES side)</Popup></Marker>
      <Marker position={[12.9465, 77.5299]} icon={getPin('violet')}><Popup>Mysore Road Metro (Attiguppe side)</Popup></Marker>
      <Marker position={[12.9352, 77.5364]} icon={getPin('orange')}><Popup>PESU Front Gate</Popup></Marker>
      <Marker position={[12.9350, 77.5329]} icon={getPin('orange')}><Popup>PESU Back Gate</Popup></Marker>

      {/* Your Live Location (Black Pin) */}
      {myLocation && (
        <Marker position={[myLocation.lat, myLocation.lng]} icon={getPin('black')}>
          <Popup>You</Popup>
        </Marker>
      )}

      {/* Other Pool Members (Dynamic: Green, Red, or Yellow) */}
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
  );
}