import type {
  RestaurantSearchResponse,
  SelectedRestaurant,
} from "@findeat/types";

function normalize(value?: string | null) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\p{P}\p{S}\s]/gu, "")
    .toLocaleLowerCase();
}

function matchTier(item: SelectedRestaurant, normalizedQuery: string) {
  const restaurant =
    item.source === "FINDEAT" ? item.restaurant : item;
  const name = normalize(restaurant.name);
  const location = normalize(
    [restaurant.address, restaurant.city].filter(Boolean).join(" "),
  );

  if (name === normalizedQuery) return 0;
  if (name.startsWith(normalizedQuery)) return 1;
  if (name.includes(normalizedQuery)) return 2;
  if (location.includes(normalizedQuery)) return 3;
  return 4;
}

export function mergeRestaurantSearchResults(
  response: RestaurantSearchResponse,
  query: string,
) {
  const items: SelectedRestaurant[] = [
    ...(response.findeat ?? []).map((restaurant) => ({
      source: "FINDEAT" as const,
      restaurant,
    })),
    ...(response.google ?? []),
  ];
  const normalizedQuery = normalize(query);

  return items
    .map((item, index) => ({ item, index }))
    .sort((first, second) => {
      const tierDifference =
        matchTier(first.item, normalizedQuery) -
        matchTier(second.item, normalizedQuery);
      if (tierDifference !== 0) return tierDifference;

      const firstDistance =
        first.item.source === "FINDEAT"
          ? first.item.restaurant.distanceKm
          : first.item.distanceKm;
      const secondDistance =
        second.item.source === "FINDEAT"
          ? second.item.restaurant.distanceKm
          : second.item.distanceKm;
      if (firstDistance != null && secondDistance == null) return -1;
      if (firstDistance == null && secondDistance != null) return 1;
      if (
        firstDistance != null &&
        secondDistance != null &&
        firstDistance !== secondDistance
      ) {
        return firstDistance - secondDistance;
      }

      return first.index - second.index;
    })
    .map(({ item }) => item);
}
