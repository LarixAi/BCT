/** Distance & time estimates for driver trip offers. */
function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null)) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180)
    * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kmToMi(km) {
  return km * 0.621371;
}

/** Stats a driver needs before accepting: pickup ETA, trip distance/duration. */
export function getTripOfferStats(booking, driver) {
  const hasStoredRoute =
    booking.estimated_distance_meters != null && booking.estimated_duration_seconds != null;

  const tripKm = hasStoredRoute
    ? booking.estimated_distance_meters / 1000
    : booking.pickup_lat != null && booking.dropoff_lat != null
      ? haversineKm(booking.pickup_lat, booking.pickup_lng, booking.dropoff_lat, booking.dropoff_lng)
      : null;

  let toPickupMins = null;
  let toPickupMi = null;
  if (driver?.current_lat != null && driver?.current_lng != null && booking.pickup_lat != null) {
    const pickupKm = haversineKm(
      driver.current_lat, driver.current_lng,
      booking.pickup_lat, booking.pickup_lng
    );
    if (pickupKm != null) {
      toPickupMi = kmToMi(pickupKm);
      toPickupMins = Math.max(1, Math.round((pickupKm / 25) * 60));
    }
  } else if (tripKm != null) {
    toPickupMins = Math.max(1, Math.round((tripKm * 0.3 / 20) * 60 + 2));
  }

  const tripMi = tripKm != null ? kmToMi(tripKm) : null;
  const tripMins = hasStoredRoute
    ? Math.max(1, Math.round(booking.estimated_duration_seconds / 60))
    : tripKm != null
      ? Math.max(1, Math.round((tripKm / 30) * 60))
      : null;

  return {
    toPickupMins,
    toPickupMi: toPickupMi != null ? toPickupMi.toFixed(1) : null,
    tripMins,
    tripMi: tripMi != null ? tripMi.toFixed(1) : null,
  };
}

export function vehicleTypeLabel(type) {
  if (!type || type === "any") return "Standard";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function paymentLabel(method) {
  if (method === "cash") return "Cash";
  if (method === "account") return "Account";
  return "Card";
}
