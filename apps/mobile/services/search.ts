import { api } from "@/lib/api";
import { mergeRestaurantSearchResults } from "@/lib/restaurantSearchResults";
import { sortSearchResults } from "@findeat/utils";
import type { SearchResultItem } from "@findeat/types";

export async function searchFriends(
  query: string,
): Promise<SearchResultItem[]> {
  const users = await api.users.searchFriends(query);

  return users.map((user) => ({
    id: user.id,
    type: "USER",
    title: user.displayName?.trim() || user.username,
    subtitle: `@${user.username}`,
    imageUrl: user.avatarUrl ?? null,
    relationship: "FRIENDS",
  }));
}

export async function getSuggestedFriends(): Promise<SearchResultItem[]> {
  const users = await api.users.suggestedFriends();
  return users.map((user) => ({
    id: user.id,
    type: "USER",
    title: user.displayName?.trim() || user.username,
    subtitle: `@${user.username}`,
    imageUrl: user.avatarUrl ?? null,
    relationship: "FRIENDS",
  }));
}

export async function searchGlobal(
  query: string,
  options: {
    latitude?: number;
    longitude?: number;
    languageCode?: string;
  } = {},
): Promise<SearchResultItem[]> {
  const [users, restaurantResponse] = await Promise.all([
    api.users.search(query),
    api.restaurants.search(query, options),
  ]);

  const mappedUsers: SearchResultItem[] = users.map((user) => ({
    id: user.id,
    type: "USER",
    title: user.displayName?.trim() || user.username,
    subtitle: `@${user.username}`,
    imageUrl: user.avatarUrl ?? null,
    relationship: user.relationship,
  }));

  const mappedRestaurants: SearchResultItem[] = mergeRestaurantSearchResults(
    restaurantResponse,
    query,
  ).map((item) => {
    const restaurant = item.source === "FINDEAT" ? item.restaurant : item;
    return {
      id:
        item.source === "FINDEAT"
          ? item.restaurant.id
          : item.googlePlaceId,
      type: "RESTAURANT",
      title: restaurant.name,
      subtitle: restaurant.address ?? restaurant.city ?? undefined,
      imageUrl:
        item.source === "FINDEAT" ? item.restaurant.logoUrl ?? null : null,
      restaurantSuggestion: item.source === "GOOGLE" ? item : undefined,
    };
  });

  return [...sortSearchResults(mappedUsers), ...mappedRestaurants];
}

export async function searchChatTargets(
  query: string,
): Promise<SearchResultItem[]> {
  const [users, restaurants] = await Promise.all([
    api.users.search(query),
    api.restaurants.searchFindEat(query),
  ]);

  const mappedUsers: SearchResultItem[] = users.map((user) => ({
    id: user.id,
    type: "USER",
    title: user.displayName?.trim() || user.username,
    subtitle: `@${user.username}`,
    imageUrl: user.avatarUrl ?? null,
    relationship: user.relationship,
  }));

  const claimedRestaurants: SearchResultItem[] = restaurants
    .filter((restaurant) => restaurant.status === "CLAIMED")
    .map((restaurant) => ({
      id: restaurant.id,
      type: "RESTAURANT",
      title: restaurant.name,
      subtitle: restaurant.address ?? restaurant.city ?? undefined,
      imageUrl: restaurant.logoUrl ?? null,
    }));

  return [...sortSearchResults(mappedUsers), ...claimedRestaurants];
}
