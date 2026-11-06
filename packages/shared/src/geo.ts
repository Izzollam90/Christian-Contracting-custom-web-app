// Haversine distance in meters between two lat/lng points.
export const haversineMeters = (
  lat1: number, lng1: number, lat2: number, lng2: number
): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

export interface GeolocationResult {
  distanceMeters: number | null;
  locationCheck: 'Within geofence' | 'Outside geofence' | 'Not checked';
}

// Distance from the browser position to the job site; 'Not checked' when geolocation fails.
export const checkGeofence = async (
  siteLat: number | null,
  siteLng: number | null,
  fenceMeters: number
): Promise<GeolocationResult> => {
  if (siteLat == null || siteLng == null) return { distanceMeters: null, locationCheck: 'Not checked' };
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 })
    );
    const distanceMeters = haversineMeters(pos.coords.latitude, pos.coords.longitude, siteLat, siteLng);
    return {
      distanceMeters,
      locationCheck: distanceMeters <= fenceMeters ? 'Within geofence' : 'Outside geofence',
    };
  } catch {
    return { distanceMeters: null, locationCheck: 'Not checked' };
  }
};
