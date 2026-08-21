export type RestaurantOfferStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "ENDED"
  | "CANCELLED";

export type RestaurantOfferType =
  | "PERCENTAGE_DISCOUNT"
  | "FIXED_DISCOUNT"
  | "FREE_ITEM"
  | "CUSTOM_BENEFIT"
  | "CASHBACK"
  | "LOYALTY_REWARD"
  | "BIRTHDAY_PERK"
  | "FINDEAT_PRO_BENEFIT";

export type RestaurantOfferAudienceType =
  | "FOLLOWERS"
  | "WANT_TO_TRY"
  | "VISITED"
  | "FAVORITED"
  | "CLUB_MEMBERS"
  | "PAID_CLUB_MEMBERS"
  | "FINDEAT_PRO";

export type RewardRestaurant = {
  id: string;
  name: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  city?: string | null;
};

export type RestaurantOffer = {
  id: string;
  restaurantId: string;
  title: string;
  description?: string | null;
  type: RestaurantOfferType;
  status: RestaurantOfferStatus;
  discountValue?: string | number | null;
  minimumSpend?: string | number | null;
  maximumDiscount?: string | number | null;
  estimatedSavings?: string | number | null;
  currency: string;
  validFrom: string;
  validUntil: string;
  maxClaims?: number | null;
  claimCount: number;
  redemptionCount: number;
  terms?: string | null;
  audiences: Array<{ id: string; type: RestaurantOfferAudienceType }>;
  restaurant: RewardRestaurant;
  eligibleUsers?: number;
};

export type RestaurantOfferClaim = {
  id: string;
  offerId: string;
  status: "CLAIMED" | "REDEEMED" | "EXPIRED" | "CANCELLED";
  claimedAt: string;
  expiresAt: string;
  redeemedAt?: string | null;
  actualSavingsAmount?: string | number | null;
  currency: string;
  offerSnapshot: Record<string, unknown>;
  offer: RestaurantOffer;
};

export type AvailableReward = {
  offer: RestaurantOffer;
  eligibility: {
    eligible: boolean;
    matchedAudiences: RestaurantOfferAudienceType[];
    reasons: string[];
  };
};

export type AvailableRewardsResponse = {
  claimed: RestaurantOfferClaim[];
  available: AvailableReward[];
};

export type RewardSavingsSummary = {
  lifetimeSavings: string | number;
  currentYearSavings: string | number;
  redeemedCount: number;
};

export type RestaurantOfferAnalytics = {
  eligibleUsers: number;
  views: number;
  claims: number;
  redemptions: number;
  claimRate: number;
  redemptionRate: number;
  actualSavingsAmount: string | number;
};
