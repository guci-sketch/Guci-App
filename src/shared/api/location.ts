import { api } from './client';

export interface PostLocationInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface UserLocation {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  trackedAt: string;
}

export async function postLocation(input: PostLocationInput) {
  return api.post<{ success: boolean }>('/locations', input);
}

export async function fetchLatestLocations() {
  const res = await api.get<{ locations: UserLocation[] }>('/locations/latest');
  return res.locations;
}
