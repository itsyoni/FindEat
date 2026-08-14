import type {
  ManagedRestaurant,
  Restaurant,
  RestaurantSearchResponse,
  RestaurantPostSection,
  RestaurantPostsPage,
  RestaurantMapFilter,
  RestaurantMapSort,
  GoogleRestaurantSuggestion,
  UserRestaurant,
  FeedPage,
  RestaurantOpeningHours,
  RestaurantFoodCertificationDetails,
  SavedPostAttribution,
  SavedRestaurant,
  PlaceSaveStatus,
  CityFilterLocation,
  RestaurantActivityHeatPoint,
  RestaurantHotspotActivity,
  MutedVisitRestaurant,
  VisitDetectionCandidate,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createRestaurantsApi(api: AxiosInstance) {
  type SearchOptions = {
    latitude?: number;
    longitude?: number;
    languageCode?: string;
    countryCode?: string;
  };

  return {
    async mine() {
      const { data } = await api.get<ManagedRestaurant[]>("/restaurants/me");
      return data;
    },

    async create(payload: {
      name: string;
      address?: string | null;
      description?: string | null;
      avatarUrl?: string | null;
      coverUrl?: string | null;
    }) {
      const { data } = await api.post<Restaurant>("/restaurants", payload);
      return data;
    },

    async updateMine(payload: {
      name?: string;
      coverUrl?: string | null;
      phone?: string | null;
      website?: string | null;
      instagram?: string | null;
      openingHours?: RestaurantOpeningHours | null;
      foodCertifications?: string[];
      foodCertificationDetails?: RestaurantFoodCertificationDetails | null;
    }) {
      const { data } = await api.patch<Restaurant>("/restaurants/me", payload);
      return data;
    },

    async search(query: string, options: SearchOptions = {}) {
      const { data } = await api.get<RestaurantSearchResponse>(
        "/restaurants/search",
        { params: { q: query, ...options } },
      );

      return data;
    },

    async searchFindEat(query: string, options: SearchOptions = {}) {
      const { data } = await api.get<Restaurant[]>(
        "/restaurants/search/findeat",
        {
          params: { q: query, ...options },
        },
      );

      return data;
    },

    async savedMine() {
      const { data } = await api.get<SavedRestaurant[]>("/restaurants/saved/me");
      return data;
    },

    async savedPostsMine() {
      const { data } = await api.get<SavedPostAttribution[]>(
        "/restaurants/saved-posts/me",
      );
      return data;
    },

    async allWithLocation() {
      const { data } = await api.get<Restaurant[]>("/restaurants");
      return data;
    },

    async searchMapAreas(query: string, languageCode?: string) {
      const { data } = await api.get<CityFilterLocation[]>(
        "/restaurants/areas/search",
        { params: { q: query, languageCode } },
      );
      return data;
    },

    async searchCountries(query: string, languageCode?: string) {
      const { data } = await api.get<CityFilterLocation[]>(
        "/restaurants/countries/search",
        { params: { q: query, languageCode } },
      );
      return data;
    },

    async resolveMapArea(city: CityFilterLocation) {
      const { data } = await api.post<CityFilterLocation>(
        "/restaurants/areas/resolve",
        city,
      );
      return data;
    },

    async discoverForMap(options: {
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
      countryCode?: string;
      south?: number;
      west?: number;
      north?: number;
      east?: number;
      limit?: number;
      listId?: string;
      filter?: RestaurantMapFilter;
      sort?: RestaurantMapSort;
      matchDietary?: boolean;
      matchCuisines?: boolean;
      hideFlaggedAllergens?: boolean;
    }) {
      const { data } = await api.get<Restaurant[]>("/restaurants/map/discover", {
        params: options,
      });
      return data;
    },

    async activityHeatmap(restaurantIds?: string[]) {
      const { data } = await api.post<RestaurantActivityHeatPoint[]>(
        "/restaurants/map/activity-heatmap",
        restaurantIds?.length ? { restaurantIds } : {},
      );
      return data;
    },

    async hotspotActivity(restaurantId: string) {
      const { data } = await api.get<RestaurantHotspotActivity>(
        `/restaurants/map/activity/${restaurantId}`,
      );
      return data;
    },

    async visitDetectionCandidates(options: {
      latitude: number;
      longitude: number;
      limit?: number;
    }) {
      const { data } = await api.get<VisitDetectionCandidate[]>(
        "/restaurants/visit-detection/candidates",
        { params: options },
      );
      return data;
    },

    async mutedVisitRestaurants() {
      const { data } = await api.get<MutedVisitRestaurant[]>(
        "/restaurants/visit-detection/muted",
      );
      return data;
    },

    async muteVisitRestaurant(restaurantId: string) {
      const { data } = await api.post(
        `/restaurants/visit-detection/muted/${restaurantId}`,
      );
      return data;
    },

    async unmuteVisitRestaurant(restaurantId: string) {
      const { data } = await api.delete(
        `/restaurants/visit-detection/muted/${restaurantId}`,
      );
      return data;
    },

    async nearbyGoogle(options: {
      latitude: number;
      longitude: number;
      limit?: number;
      languageCode?: string;
    }) {
      const { data } = await api.get<GoogleRestaurantSuggestion[]>(
        "/restaurants/nearby/google",
        { params: options },
      );
      return data;
    },

    async follow(id: string) {
      const { data } = await api.post(`/restaurants/${id}/follow`);
      return data;
    },

    async unfollow(id: string) {
      const { data } = await api.delete(`/restaurants/${id}/follow`);
      return data;
    },

    async fromGoogle(payload: {
      name: string;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      googlePlaceId: string;
    }) {
      const { data } = await api.post<Restaurant>(
        "/restaurants/from-google",
        payload,
      );

      return data;
    },

    async pendingClaims() {
      const { data } = await api.get("/restaurants/claims/pending");
      return data;
    },

    async approveClaim(claimId: string) {
      const { data } = await api.post(`/restaurants/claims/${claimId}/approve`);
      return data;
    },

    async rejectClaim(claimId: string, reason?: string) {
      const { data } = await api.post(`/restaurants/claims/${claimId}/reject`, {
        reason,
      });

      return data;
    },

    async startClaim(id: string) {
      const { data } = await api.post(`/restaurants/${id}/start-claim`);
      return data;
    },

    async get(id: string) {
      const { data } = await api.get<Restaurant>(`/restaurants/${id}`);
      return data;
    },

    async posts(id: string, section: RestaurantPostSection, cursor?: string) {
      const { data } = await api.get<RestaurantPostsPage>(
        `/restaurants/${id}/posts`,
        { params: { section, cursor, limit: 18 } },
      );
      return data;
    },

    async postFeed(
      id: string,
      section: RestaurantPostSection,
      cursor?: string,
      anchorId?: string,
    ) {
      const { data } = await api.get<FeedPage>(
        `/restaurants/${id}/post-feed`,
        { params: { section, cursor, anchorId, limit: 10 } },
      );
      return data;
    },

    async wantToTry(id: string, savedFromPostId?: string) {
      const { data } = await api.post<UserRestaurant>(`/restaurants/${id}/want-to-try`, {
        savedFromPostId,
      });

      return data;
    },

    async setSaveStatus(
      id: string,
      status: PlaceSaveStatus,
      savedFromPostId?: string,
      clearAttribution = false,
    ) {
      const { data } = await api.patch<UserRestaurant>(
        `/restaurants/${id}/save-status`,
        { status, savedFromPostId, clearAttribution },
      );
      return data;
    },

    async removeWantToTry(id: string) {
      const { data } = await api.delete(`/restaurants/${id}/want-to-try`);
      return data;
    },

    async visited(id: string) {
      const { data } = await api.post(`/restaurants/${id}/visited`);
      return data;
    },

    async removeVisited(id: string) {
      const { data } = await api.delete(`/restaurants/${id}/visited`);
      return data;
    },

    async favorite(id: string) {
      const { data } = await api.post(`/restaurants/${id}/favorite`);
      return data;
    },

    async removeFavorite(id: string) {
      const { data } = await api.delete(`/restaurants/${id}/favorite`);
      return data;
    },

    async toggleWantToTry(
      id: string,
      isWantToTry: boolean,
      savedFromPostId?: string,
    ) {
      return isWantToTry
        ? this.removeWantToTry(id)
        : this.wantToTry(id, savedFromPostId);
    },
  };
}
