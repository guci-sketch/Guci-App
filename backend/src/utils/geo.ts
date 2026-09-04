export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Great-circle distance in meters between two coordinates (Haversine formula). */
export function calculateDistanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371e3;
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;

  const s =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return Math.round(R * c);
}

export function isWithinRadius(user: LatLng, project: LatLng, radiusMeters: number) {
  const distance = calculateDistanceMeters(user, project);
  return { isWithin: distance <= radiusMeters, distance };
}

export function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
