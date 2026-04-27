'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Pusher from 'pusher-js';
import L from 'leaflet';

// Fix for missing default Leaflet icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Black Icon for the active user
const myBlackIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// --- NEW PRIVACY MATH (Haversine Formula) ---
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
// --------------------------------------------

interface TrackingMapProps {
  userName: string;
  poolId: string | null;
}

export default function TrackingMap({ userName, poolId }: TrackingMapProps) {
  const [liveUsers, setLiveUsers] = useState<Record<string, { lat: number; lng: number }>>({});
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 1. Pusher Listener (Only connects if you are in an active pool)
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

    return () => {
      pusher.unsubscribe(poolId);
    };
  }, [poolId, userName]);

  // 2. Geolocation Broadcaster
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Always update local state so the user can see themselves
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
        } else if (poolId && distanceToCampus > 2.0) {
          console.log(`Privacy active: You are ${distanceToCampus.toFixed(1)}km away. Location hidden from pool.`);
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
      <Marker position={[12.9464, 77.5306]}><Popup>Mysore Road Metro (PES side)</Popup></Marker>
      <Marker position={[12.9465, 77.5299]}><Popup>Mysore Road Metro (Attiguppe side)</Popup></Marker>
      <Marker position={[12.9352, 77.5364]}><Popup>PESU Front Gate</Popup></Marker>
      <Marker position={[12.9350, 77.5329]}><Popup>PESU Back Gate</Popup></Marker>

      {/* Your Live Location - NOW BLACK */}
      {myLocation && (
        <Marker position={[myLocation.lat, myLocation.lng]} icon={myBlackIcon}>
          <Popup>You</Popup>
        </Marker>
      )}

      {/* Other Pool Members */}
      {Object.entries(liveUsers).map(([id, coords]) => (
        <Marker key={id} position={[coords.lat, coords.lng]}>
          <Popup>{id}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}