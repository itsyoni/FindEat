import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CityFilterLocation, SelectedRestaurant } from "@findeat/types";

export type MapRecentSearch = SelectedRestaurant | CityFilterLocation;

const MAX_MAP_RECENT_SEARCHES = 10;

function storageKey(userId: string) {
  return `findeat_map_recent_searches_${userId}`;
}

function resultKey(result: MapRecentSearch) {
  if (result.source === "AREA") return `AREA:${result.googlePlaceId}`;
  if (result.source === "FINDEAT") return `FINDEAT:${result.restaurant.id}`;
  return `GOOGLE:${result.googlePlaceId}`;
}

export async function getMapRecentSearches(userId: string) {
  const stored = await AsyncStorage.getItem(storageKey(userId));
  if (!stored) return [];
  try {
    const searches = JSON.parse(stored) as MapRecentSearch[];
    return searches.filter(
      (item) => item.source !== "AREA" || item.areaType !== "COUNTRY",
    );
  } catch {
    return [];
  }
}

export async function addMapRecentSearch(
  userId: string,
  result: MapRecentSearch,
) {
  if (result.source === "AREA" && result.areaType === "COUNTRY") {
    return getMapRecentSearches(userId);
  }
  const current = await getMapRecentSearches(userId);
  const key = resultKey(result);
  const updated = [
    result,
    ...current.filter((item) => resultKey(item) !== key),
  ].slice(0, MAX_MAP_RECENT_SEARCHES);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(updated));
  return updated;
}

export async function clearMapRecentSearches(userId: string) {
  await AsyncStorage.removeItem(storageKey(userId));
}
