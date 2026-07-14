export interface ExternalNavPoint {
  lat: number;
  lng: number;
  label?: string;
}

export function buildGoogleMapsDirectionsUrl(input: {
  destination: ExternalNavPoint;
  origin?: ExternalNavPoint | null;
  waypoints?: ExternalNavPoint[];
}): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${input.destination.lat},${input.destination.lng}`,
    travelmode: "driving",
  });

  if (input.origin) {
    params.set("origin", `${input.origin.lat},${input.origin.lng}`);
  }

  if (input.waypoints?.length) {
    params.set(
      "waypoints",
      input.waypoints.map((point) => `${point.lat},${point.lng}`).join("|"),
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildWazeNavigateUrl(destination: ExternalNavPoint): string {
  const params = new URLSearchParams({
    ll: `${destination.lat},${destination.lng}`,
    navigate: "yes",
  });

  if (destination.label) {
    params.set("q", destination.label);
  }

  return `https://waze.com/ul?${params.toString()}`;
}
