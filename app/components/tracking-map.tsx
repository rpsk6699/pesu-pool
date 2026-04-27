'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Pusher from 'pusher-js';
import L from 'leaflet';

// Fix for missing default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for YOU
const myBlackIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// Custom Icons for PASSENGERS
const guestIcons = [
  new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] })
];

interface TrackingMapProps {
  userName: string;
  poolId: string | null;
}

export default function TrackingMap({ userName, poolId }: TrackingMapProps) {
  const [liveUsers, setLiveUsers] = useState<Record<string, { lat: number; lng: number }>>({});
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

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

    return () => pusher.unsubscribe(poolId);
  }, [poolId, userName]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMyLocation({ lat: latitude, lng: longitude });

        if (poolId) {
          fetch('/api/tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poolId, userId: userName, lat: latitude, lng: longitude }),
          }).catch(err => console.error("Broadcast failed:", err));
        }
      },
      (error) => console.error("Error watching location:", error.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [poolId, userName]);

  return (
    <MapContainer center={[12.9407, 77.5332]} zoom={14} style={{ height: '500px', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Static Route Markers */}
      <Marker position={[12.9464, 77.5306]}><Popup>Mysore Road Metro (PES side)</Popup></Marker>
      <Marker position={[12.9465, 77.5299]}><Popup>Mysore Road Metro (Attiguppe side)</Popup></Marker>
      <Marker position={[12.9352, 77.5364]}><Popup>PESU Front Gate</Popup></Marker>
      <Marker position={[12.9350, 77.5329]}><Popup>PESU Back Gate</Popup></Marker>

      {/* Your Live Location - BLACK */}
      {myLocation && (
        <Marker position={[myLocation.lat, myLocation.lng]} icon={myBlackIcon}>
          <Popup>You</Popup>
        </Marker>
      )}

      {/* Other Pool Members - COLORED */}
      {Object.entries(liveUsers).map(([id, coords], index) => {
        // This picks Red, then Orange, then Purple, and loops back around
        const colorIcon = guestIcons[index % guestIcons.length];
        
        return (
          <Marker key={id} position={[coords.lat, coords.lng]} icon={colorIcon}>
            <Popup>{id}</Popup>
          </Marker>
        )
      })}
    </MapContainer>
  );
}