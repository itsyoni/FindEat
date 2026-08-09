import { RecentSearchItem } from "@findeat/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_RECENT_SEARCHES = 10;

function getStorageKey(userId: string) {
  return `findeat_recent_searches_${userId}`;
}

export async function getRecentSearches(userId: string) {
  const data = await AsyncStorage.getItem(getStorageKey(userId));
  return data ? (JSON.parse(data) as RecentSearchItem[]) : [];
}

export async function saveRecentSearches(
  userId: string,
  items: RecentSearchItem[],
) {
  const updated = items.slice(0, MAX_RECENT_SEARCHES);
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  return updated;
}

export async function addRecentSearch(userId: string, item: RecentSearchItem) {
  const current = await getRecentSearches(userId);

  const filtered = current.filter(
    (search) => !(search.id === item.id && search.type === item.type),
  );

  const updated = [item, ...filtered].slice(0, MAX_RECENT_SEARCHES);

  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(updated));

  return updated;
}

export async function removeRecentSearch(
  userId: string,
  id: string,
  type: RecentSearchItem["type"],
) {
  const items = await getRecentSearches(userId);

  const updated = items.filter(
    (item) => !(item.id === id && item.type === type),
  );

  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(updated));

  return updated;
}

export async function clearRecentSearches(userId: string) {
  await AsyncStorage.removeItem(getStorageKey(userId));
}
