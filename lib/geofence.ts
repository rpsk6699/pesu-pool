const PESU_LAT = 12.9352
const PESU_LNG = 77.5364

export const GEOFENCE_MAX_KM = 2.0

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

export function distanceKmFromPESU(lat: number, lng: number): number {
  const R = 6371
  const dLat = deg2rad(PESU_LAT - lat)
  const dLng = deg2rad(PESU_LNG - lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat)) * Math.cos(deg2rad(PESU_LAT)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function isWithinPESUGeofence(lat: number, lng: number): boolean {
  return distanceKmFromPESU(lat, lng) <= GEOFENCE_MAX_KM
}
