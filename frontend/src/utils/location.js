export function hasCoordinates(point) {
  return Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

/** Explicit user click opens Google Maps; the app never invents a road route. */
export function directionsUrl(position, entrance, mode) {
  if (!hasCoordinates(position) || !hasCoordinates(entrance)) return null;
  const params = new URLSearchParams({
    api: "1", origin: `${position.latitude},${position.longitude}`,
    destination: `${entrance.latitude},${entrance.longitude}`, dir_action: "navigate",
  });
  if (mode) params.set("travelmode", mode === "drive" ? "driving" : "walking");
  return `https://www.google.com/maps/dir/?${params}`;
}

export function destinationUrl(entrance) {
  if (!hasCoordinates(entrance)) return null;
  return `https://www.google.com/maps/search/?${new URLSearchParams({
    api: "1", query: `${entrance.latitude},${entrance.longitude}`,
  })}`;
}

/** Google Maps obtains its own origin after the user explicitly opens this link. */
export function mapsLocationUrl(entrance) {
  if (!hasCoordinates(entrance)) return null;
  return `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: "1", destination: `${entrance.latitude},${entrance.longitude}`, dir_action: "navigate",
  })}`;
}
