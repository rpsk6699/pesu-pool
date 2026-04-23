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
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMyLocation({ lat: latitude, lng: longitude });

        // ONLY broadcast to the server if you are in a pool
        if (poolId) {
          fetch('/api/tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              poolId,
              userId: userName,
              lat: latitude,
              lng: longitude,
            }),
          });
        }
      },
      (error) => console.error("Error watching location:", error),
      { enableHighAccuracy: true, maximumAge: 10000 }
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

      {/* Your Live Location */}
      {myLocation && (
        <Marker position={[myLocation.lat, myLocation.lng]}>
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