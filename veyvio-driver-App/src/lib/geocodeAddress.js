/**
 * UK address search via OpenStreetMap Nominatim (driver app).
 */

const USER_AGENT = "RidovaDriverApp/1.0";

function shortLabel(hit) {
  const addr = hit.address;
  if (addr) {
    const parts = [addr.house_number, addr.road, addr.suburb ?? addr.neighbourhood, addr.postcode].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  return hit.display_name?.split(",")[0] ?? hit.display_name ?? "";
}

function normalizeHit(hit) {
  return {
    id: String(hit.place_id ?? `${hit.lat}-${hit.lon}`),
    address: hit.display_name,
    label: shortLabel(hit),
    postcode: hit.address?.postcode ?? null,
    lat: Number(hit.lat),
    lng: Number(hit.lon),
  };
}

async function fetchNominatim(params, signal) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal,
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function geocodeAddress(query) {
  const q = query?.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    countrycodes: "gb",
    addressdetails: "1",
  });

  const rows = await fetchNominatim(params);
  const hit = rows[0];
  return hit ? normalizeHit(hit) : null;
}

export async function searchAddressSuggestions(query, { limit = 5, signal } = {}) {
  const q = query?.trim();
  if (!q || q.length < 3) return [];

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: String(limit),
    countrycodes: "gb",
    addressdetails: "1",
  });

  const rows = await fetchNominatim(params, signal);
  return rows.map(normalizeHit);
}
