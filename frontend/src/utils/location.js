export function hasCoordinates(point) {
  return (
    Number.isFinite(point?.latitude) &&
    Number.isFinite(point?.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

// เปิดเส้นทางรถยนต์ โดยระบุจุดเริ่มต้น
export function directionsUrl(position, entrance) {
  if (!hasCoordinates(position) || !hasCoordinates(entrance)) {
    return null;
  }

  const params = new URLSearchParams({
    api: "1",
    origin: `${position.latitude},${position.longitude}`,
    destination: `${entrance.latitude},${entrance.longitude}`,
    dir_action: "navigate",
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params}`;
}

// เปิดดูตำแหน่งอาคาร
export function destinationUrl(entrance) {
  if (!hasCoordinates(entrance)) return null;

  const params = new URLSearchParams({
    api: "1",
    query: `${entrance.latitude},${entrance.longitude}`,
  });

  return `https://www.google.com/maps/search/?${params}`;
}

// ให้ Google Maps หาตำแหน่งเริ่มต้นและนำทางด้วยรถยนต์
export function mapsLocationUrl(entrance) {
  if (!hasCoordinates(entrance)) return null;

  const params = new URLSearchParams({
    api: "1",
    destination: `${entrance.latitude},${entrance.longitude}`,
    dir_action: "navigate",
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params}`;
}