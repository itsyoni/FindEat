import type { RestaurantBadgeKey, RestaurantMapFilter, RestaurantMapSort } from "./restaurant";

export type MapViewMode = "MAP" | "LIST";

export type MapPreferences = {
  filter: RestaurantMapFilter;
  sort: RestaurantMapSort;
  radiusKm: number | null;
  matchDietary: boolean;
  matchCuisines: boolean;
  hideFlaggedAllergens: boolean;
  activityHeatmapEnabled: boolean;
  badgeKeys: RestaurantBadgeKey[];
};

export type RestaurantActivityHeatPoint = {
  restaurantId: string;
  latitude: number;
  longitude: number;
  weight: number;
  state: RestaurantActivityState;
};

export type RestaurantActivityState = "none" | "active" | "hot";

export type RestaurantHotspotActivityItem = {
  id: string;
  type: "REVIEW" | "CONTENT" | "SNAP";
  postId?: string;
  snapId?: string;
  createdAt: string;
  caption: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  author: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
};

export type RestaurantHotspotActivity = {
  restaurantId: string;
  restaurantName: string;
  state: RestaurantActivityState;
  items: RestaurantHotspotActivityItem[];
};
