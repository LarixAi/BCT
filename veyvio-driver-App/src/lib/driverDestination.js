const STORAGE_KEY = "fleet_driver_destination";

export const QUICK_DESTINATIONS = [
  { title: "Central London", subtitle: "Westminster, City & West End" },
  { title: "Heathrow Airport", subtitle: "Terminals 1–5, TW6" },
  { title: "Gatwick Airport", subtitle: "North & South terminals, RH6" },
  { title: "Canary Wharf", subtitle: "E14, Isle of Dogs" },
  { title: "London Bridge", subtitle: "SE1, Southwark" },
  { title: "Victoria Station", subtitle: "SW1, Belgravia" },
  { title: "King's Cross", subtitle: "N1C, Camden" },
  { title: "Waterloo Station", subtitle: "SE1, Lambeth" },
];

export function formatPlaceAddress(address, postcode) {
  if (!address?.trim()) return null;
  const cleaned = address.trim();
  const parts = cleaned.split(",").map((s) => s.trim()).filter(Boolean);
  const title = postcode?.trim() || parts[0] || cleaned;
  const subtitle =
    postcode && parts.length > 0
      ? [parts[0], parts[parts.length - 1]].filter((v, i, a) => a.indexOf(v) === i).join(", ")
      : parts.length > 1
        ? parts.slice(1).join(", ")
        : "London";
  return { title, subtitle };
}

export function loadDriverDestination() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { enabled: false, target: null, targetSubtitle: null, home: null, recent: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      target: parsed.target || null,
      targetSubtitle: parsed.targetSubtitle || null,
      home: parsed.home || null,
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    };
  } catch {
    return { enabled: false, target: null, targetSubtitle: null, home: null, recent: [] };
  }
}

export function saveDriverDestination(patch) {
  const next = { ...loadDriverDestination(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function selectDestination(title, subtitle = "London") {
  const current = loadDriverDestination();
  const recent = [
    { id: String(Date.now()), title, subtitle },
    ...current.recent.filter((r) => r.title !== title),
  ].slice(0, 10);
  return saveDriverDestination({
    enabled: true,
    target: title,
    targetSubtitle: subtitle,
    recent,
  });
}

export function clearDestination() {
  return saveDriverDestination({ enabled: false, target: null, targetSubtitle: null });
}

/** Live UK place search via OpenStreetMap Nominatim (no API key). */
export async function searchPlacesOnline(query) {
  const q = query?.trim();
  if (!q || q.length < 3) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "gb");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data || []).map((item, i) => {
    const parts = String(item.display_name || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const postcode = item.address?.postcode;
    return {
      id: `osm-${item.place_id || i}`,
      title: postcode || parts[0] || q,
      subtitle: parts.slice(0, 4).join(", ") || "United Kingdom",
      source: "online",
    };
  });
}

export function mergeRecentPlaces(tripPlaces, savedRecent) {
  const seen = new Set();
  const merged = [];
  for (const place of [...tripPlaces, ...savedRecent]) {
    if (!place?.title || seen.has(place.title)) continue;
    seen.add(place.title);
    merged.push({
      id: place.id || `trip-${place.title}`,
      title: place.title,
      subtitle: place.subtitle || "London",
    });
  }
  return merged.slice(0, 10);
}
