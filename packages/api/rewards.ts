import type { AxiosInstance } from "axios";
import type {
  AvailableRewardsResponse,
  RestaurantOfferClaim,
  RewardSavingsSummary,
} from "@findeat/types";

export function createRewardsApi(client: AxiosInstance) {
  return {
    listAvailable: async () =>
      (await client.get<AvailableRewardsResponse>("/rewards", { params: { status: "available" } })).data,
    listUsed: async () =>
      (await client.get<RestaurantOfferClaim[]>("/rewards", { params: { status: "used" } })).data,
    listExpired: async () =>
      (await client.get<RestaurantOfferClaim[]>("/rewards", { params: { status: "expired" } })).data,
    listClaimed: async () =>
      (await client.get<RestaurantOfferClaim[]>("/rewards", { params: { status: "claimed" } })).data,
    summary: async () =>
      (await client.get<RewardSavingsSummary>("/rewards/summary")).data,
    claim: async (offerId: string) =>
      (await client.post<RestaurantOfferClaim>(`/restaurant-offers/${offerId}/claim`)).data,
    redemptionToken: async (claimId: string) =>
      (await client.post<{ token: string; expiresAt: string; claimId: string }>(
        `/restaurant-offer-claims/${claimId}/redemption-token`,
      )).data,
    trackView: async (offerId: string) =>
      (await client.post(`/restaurant-offers/${offerId}/view`)).data,
  };
}
