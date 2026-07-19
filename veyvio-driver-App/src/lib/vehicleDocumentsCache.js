/** In-memory cache so vehicle/doc pages don't refetch on every navigation. */
const cache = new Map();

export function getVehicleDocumentsCache(vehicleId) {
  if (!vehicleId) return null;
  return cache.get(vehicleId) || null;
}

export function setVehicleDocumentsCache(vehicleId, data) {
  if (!vehicleId) return;
  cache.set(vehicleId, { ...data, fetchedAt: Date.now() });
}

export function invalidateVehicleDocumentsCache(vehicleId) {
  if (vehicleId) cache.delete(vehicleId);
}
