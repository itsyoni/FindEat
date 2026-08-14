export type BusinessAccount = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
};

export type RestaurantProAnalytics = {
  access: {
    hasProAccess: boolean;
    source: "ADMIN" | "SUBSCRIPTION" | "PREVIEW";
  };
  range: { days: number | null; start: string | null; end: string };
  overview: {
    followers: { total: number; new: number };
    intent: {
      wantToTry: number;
      visited: number;
      favorites: number;
      visitsInPeriod: number;
      favoritesInPeriod: number;
    };
    reviews: {
      count: number;
      overallRating: number | null;
      previousOverallRating: number | null;
      ratingChange: number | null;
    };
    content: {
      communityPosts: number;
      officialPosts: number;
      likes: number;
      comments: number;
    };
  };
  experience: {
    overall: number | null;
    atmosphere: number | null;
    service: number | null;
    value: number | null;
    wouldReturnPercent: number | null;
  };
  menuHealth: {
    total: number;
    available: number;
    featured: number;
    missingImage: number;
    missingDescription: number;
    missingPrice: number;
  };
  topDishes: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
    averageRating: number | null;
    reviews: number;
    favorites: number;
  }>;
  recommendationImpact: Partial<
    Record<"VISITED" | "CONTENT_POST" | "REVIEW_POST", number>
  >;
  reviewTimeline: Array<{ date: string; rating: number | null }>;
};

export type BusinessDashboardSection =
  | "overview"
  | "dashboard"
  | "menu"
  | "reviews"
  | "messages"
  | "notifications"
  | "profile"
  | "support"
  | "settings"
  | "admin";

export type AdminDashboardSection =
  | "claims"
  | "addresses"
  | "moderation"
  | "ownership"
  | "support"
  | "updates"
  | "sounds"
  | "admins"
  | "settings";
