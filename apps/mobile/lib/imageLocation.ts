export type ImageCoordinates = {
  latitude: number;
  longitude: number;
};

export type MediaLocationEstimate = ImageCoordinates & {
  sampleCount: number;
  totalLocatedCount: number;
  confidence: "HIGH" | "MEDIUM";
};

const EARTH_RADIUS_KM = 6371;

export function coordinateDistanceKm(
  first: ImageCoordinates,
  second: ImageCoordinates,
) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const latitudeA = radians(first.latitude);
  const latitudeB = radians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function estimateMediaLocation(
  coordinates: Array<ImageCoordinates | null | undefined>,
): MediaLocationEstimate | null {
  const valid = coordinates.filter(
    (item): item is ImageCoordinates =>
      !!item &&
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude) &&
      Math.abs(item.latitude) <= 90 &&
      Math.abs(item.longitude) <= 180,
  );
  if (valid.length === 0) return null;

  // The winning neighborhood is the coordinate with the most media captured
  // within 10km. This ignores travel screenshots and other distant outliers.
  const clusters = valid.map((center) =>
    valid.filter((candidate) => coordinateDistanceKm(center, candidate) <= 10),
  );
  const cluster = clusters.sort((first, second) => second.length - first.length)[0];
  if (!cluster?.length) return null;
  const latitude =
    cluster.reduce((sum, item) => sum + item.latitude, 0) / cluster.length;
  const longitude =
    cluster.reduce((sum, item) => sum + item.longitude, 0) / cluster.length;
  const share = cluster.length / valid.length;
  const confidence =
    (cluster.length >= 2 && share >= 0.6) || valid.length === 1
      ? "HIGH"
      : "MEDIUM";
  return {
    latitude,
    longitude,
    sampleCount: cluster.length,
    totalLocatedCount: valid.length,
    confidence,
  };
}

function coordinateValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function coordinatesFromExif(
  exif?: Record<string, unknown> | null,
): ImageCoordinates | null {
  if (!exif) return null;

  let latitude = coordinateValue(exif.GPSLatitude);
  let longitude = coordinateValue(exif.GPSLongitude);
  if (latitude === null || longitude === null) return null;

  const latitudeRef = String(exif.GPSLatitudeRef ?? "").toUpperCase();
  const longitudeRef = String(exif.GPSLongitudeRef ?? "").toUpperCase();
  if (latitudeRef === "S" && latitude > 0) latitude *= -1;
  if (longitudeRef === "W" && longitude > 0) longitude *= -1;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}
