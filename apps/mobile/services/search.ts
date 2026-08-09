import { api } from "@/lib/api";
import { mergeRestaurantSearchResults } from "@/lib/restaurantSearchResults";
import { sortSearchResults } from "@findeat/utils";
import type { SearchEntityType, SearchResultItem } from "@findeat/types";

export async function refreshRecentSearchItems(
  items: SearchResultItem[],
): Promise<SearchResultItem[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        if (item.type === "USER") {
          const profile = await api.users.get(item.id);
          return {
            ...item,
            title: profile.username,
            subtitle: undefined,
            imageUrl: profile.avatarUrl ?? null,
            relationship: profile.relationship,
          };
        }

        // Google-only suggestions have no FindEat profile to refresh yet.
        if (item.type === "RESTAURANT" && !item.restaurantSuggestion) {
          const restaurant = await api.restaurants.get(item.id);
          return {
            ...item,
            title: restaurant.name,
            subtitle:
              restaurant.address ?? restaurant.city ?? undefined,
            imageUrl: restaurant.logoUrl ?? null,
          };
        }

        if (item.type === "DISH") {
          const dish = await api.menu.getDish(item.id);
          if (!dish.restaurant) return item;
          return {
            ...item,
            title: dish.name,
            subtitle: dish.restaurant.name,
            imageUrl: dish.imageUrl ?? null,
            dish: {
              ...dish,
              restaurant: dish.restaurant,
            },
          };
        }
      } catch {
        // Recent searches should remain usable offline or if an old entity was
        // removed. The saved snapshot is a safe fallback in those cases.
      }

      return item;
    }),
  );
}

export async function searchFriends(
  query: string,
): Promise<SearchResultItem[]> {
  const users = await api.users.searchFriends(query);

  return users.map((user) => ({
    id: user.id,
    type: "USER",
    title: user.username,
    subtitle: undefined,
    imageUrl: user.avatarUrl ?? null,
    relationship: "FRIENDS",
  }));
}

export async function getSuggestedFriends(): Promise<SearchResultItem[]> {
  const users = await api.users.suggestedFriends();
  return users.map((user) => ({
    id: user.id,
    type: "USER",
    title: user.username,
    subtitle: undefined,
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
    type?: SearchEntityType;
  } = {},
): Promise<SearchResultItem[]> {
  const type = options.type ?? "USER";

  if (type === "DISH") {
    const dishes = await api.menu.searchDishes(query, options);
    return dishes.map((dish) => ({
      id: dish.id,
      type: "DISH",
      title: dish.name,
      subtitle: dish.restaurant.name,
      imageUrl: dish.imageUrl ?? null,
      dish,
    }));
  }

  if (type === "RESTAURANT") {
    const restaurantResponse = await api.restaurants.search(query, options);
    return mergeRestaurantSearchResults(restaurantResponse, query).map((item) => {
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
  }

  const users = await api.users.search(query);

  const mappedUsers: SearchResultItem[] = users.map((user) => ({
    id: user.id,
    type: "USER",
    title: user.username,
    subtitle: undefined,
    imageUrl: user.avatarUrl ?? null,
    relationship: user.relationship,
  }));

  return sortSearchResults(mappedUsers);
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
    title: user.username,
    subtitle: undefined,
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
