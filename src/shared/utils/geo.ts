/**
 * Geolocation & Haversine Distance Utilities
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Calculates distance in meters between two geographic coordinates
 * using the Haversine formula.
 */
export function calculateDistanceMeters(
  point1: LatLng,
  point2: LatLng
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance);
}

/**
 * Checks if user location is within the defined project radius
 */
export function isLocationWithinRadius(
  userLocation: LatLng,
  projectLocation: LatLng,
  radiusMeters: number
): { isWithin: boolean; distance: number } {
  const distance = calculateDistanceMeters(userLocation, projectLocation);
  return {
    isWithin: distance <= radiusMeters,
    distance,
  };
}

/**
 * Formats distance in meters or kilometers for human display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Formats coordinates for clean display
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Preset client premises in Jakarta / Tangerang area — quick-fill locations
 * for common pest control job sites, so a technician doesn't have to type
 * a full address for a returning client.
 */
export const PRESET_PROJECT_LOCATIONS = [
  {
    name: 'RS Hermina BSD',
    address: 'Jl. Pahlawan Seribu Kav. 1, BSD City, Serpong, Tangerang Selatan',
    latitude: -6.298144,
    longitude: 106.671342,
    radius: 100,
  },
  {
    name: 'Menara Perkantoran TB Simatupang',
    address: 'Jl. TB Simatupang No. 18, Cilandak, Jakarta Selatan',
    latitude: -6.294520,
    longitude: 106.801230,
    radius: 100,
  },
  {
    name: 'Gedung Perkantoran Thamrin',
    address: 'Jl. M.H. Thamrin No. 8, Menteng, Jakarta Pusat',
    latitude: -6.186540,
    longitude: 106.823480,
    radius: 150,
  },
  {
    name: 'Kompleks Ruko Gandul',
    address: 'Jl. Raya Gandul No. 45, Cinere, Kota Depok',
    latitude: -6.331200,
    longitude: 106.789100,
    radius: 120,
  },
];
