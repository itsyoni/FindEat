import * as Location from "expo-location";

const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const LAST_KNOWN_REQUIRED_ACCURACY_METERS = 10_000;
const CURRENT_LOCATION_TIMEOUT_MS = 8_000;

let cachedLocation: Location.LocationObject | null = null;

async function getCurrentLocationWithTimeout() {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), CURRENT_LOCATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function isFresh(location: Location.LocationObject) {
  return Date.now() - location.timestamp <= LAST_KNOWN_MAX_AGE_MS;
}

export async function getFreshDeviceLocation() {
  if (cachedLocation && isFresh(cachedLocation)) {
    return cachedLocation;
  }

  const currentPermission = await Location.getForegroundPermissionsAsync();
  const permission =
    currentPermission.status === "granted"
      ? currentPermission
      : await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") return null;

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
    requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_METERS,
  });

  cachedLocation = lastKnown ?? (await getCurrentLocationWithTimeout());

  return cachedLocation;
}
