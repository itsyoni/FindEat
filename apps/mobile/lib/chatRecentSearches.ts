import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_RECENT_CHAT_SEARCHES = 10;

function storageKey(userId: string) {
  return `findeat_chat_recent_searches_${userId}`;
}

export async function getRecentChatSearchKeys(userId: string) {
  const stored = await AsyncStorage.getItem(storageKey(userId));
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === "string")
      : [];
  } catch {
    return [];
  }
}

export async function saveRecentChatSearchKeys(
  userId: string,
  keys: string[],
) {
  const uniqueKeys = [...new Set(keys)].slice(0, MAX_RECENT_CHAT_SEARCHES);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(uniqueKeys));
  return uniqueKeys;
}

export async function addRecentChatSearchKey(userId: string, key: string) {
  const current = await getRecentChatSearchKeys(userId);
  return saveRecentChatSearchKeys(
    userId,
    [key, ...current.filter((candidate) => candidate !== key)],
  );
}
