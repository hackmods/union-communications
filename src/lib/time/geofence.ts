import type { TimeEntryGps, WorkSite } from "@/types/time";

const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance in metres between two WGS84 points. */
export function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function checkGeofence(
  gps: TimeEntryGps,
  sites: WorkSite[],
): "ok" | "warn" | "block" {
  const active = sites.filter((s) => s.active && s.geofenceMode !== "off");
  if (active.length === 0) return "ok";

  let nearestDist = Infinity;

  for (const site of active) {
    const dist = haversineDistanceM(gps.lat, gps.lng, site.lat, site.lng);
    if (dist < nearestDist) {
      nearestDist = dist;
    }
  }

  const nearest = active.find(
    (s) =>
      haversineDistanceM(gps.lat, gps.lng, s.lat, s.lng) === nearestDist,
  );
  if (!nearest) return "ok";

  const inside = nearestDist <= nearest.geofenceRadiusM;
  if (inside) return "ok";
  if (nearest.geofenceMode === "block") return "block";
  if (nearest.geofenceMode === "warn") return "warn";
  return "ok";
}
