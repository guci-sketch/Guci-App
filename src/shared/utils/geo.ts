/**
 * Haversine Formula Engine
 * Komputasi Great-Circle Distance matematis sesuai proposal skripsi PT Guci Emas Pratama.
 * Radius bumi R = 6.371.000 meter.
 */

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface GeofenceResult {
  distanceMeters: number
  isInside: boolean
  toleranceMeters: number
  differenceMeters: number
}

const EARTH_RADIUS_METERS = 6371000
const DEG_TO_RAD = Math.PI / 180

/**
 * Menghitung jarak antara dua koordinat geografis menggunakan Haversine Formula.
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const phi1 = coord1.latitude * DEG_TO_RAD
  const phi2 = coord2.latitude * DEG_TO_RAD
  const deltaPhi = (coord2.latitude - coord1.latitude) * DEG_TO_RAD
  const deltaLambda = (coord2.longitude - coord1.longitude) * DEG_TO_RAD

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100
}

/**
 * Memvalidasi apakah posisi teknisi berada di dalam batas toleransi radius proyek.
 * Default toleransi PT Guci Emas Pratama = 100 meter.
 */
export function validateGeofence(
  technicianCoord: Coordinates,
  targetCoord: Coordinates,
  toleranceMeters = 100
): GeofenceResult {
  const distance = calculateHaversineDistance(technicianCoord, targetCoord)
  const isInside = distance <= toleranceMeters
  return {
    distanceMeters: distance,
    isInside,
    toleranceMeters,
    differenceMeters: isInside ? 0 : Math.round((distance - toleranceMeters) * 100) / 100
  }
}
