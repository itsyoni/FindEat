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
  reservations: {
    clicks: number;
    bySource: Partial<Record<import("./reservation").ReservationClickSource, number>>;
    byProvider: Partial<Record<import("./reservation").ReservationProvider, number>>;
    topContent: Array<{ postId: string | null; clicks: number }>;
    topDishes: Array<{
      menuItemId: string | null;
      name: string;
      clicks: number;
    }>;
  };
  reviewTimeline: Array<{ date: string; rating: number | null }>;
};

export type BusinessDashboardSection =
  | "overview"
  | "dashboard"
  | "menu"
  | "reviews"
  | "badges"
  | "offers"
  | "posts"
  | "team"
  | "messages"
  | "notifications"
  | "profile"
  | "support"
  | "settings"
  | "admin";

export type AdminDashboardSection =
  | "overview"
  | "claims"
  | "addresses"
  | "moderation"
  | "ownership"
  | "support"
  | "bugs"
  | "knownIssues"
  | "features"
  | "updates"
  | "sounds"
  | "admins"
  | "settings";

export type AdminDashboardOverview = {
  generatedAt: string;
  queryDurationMs: number;
  health: {
    database: "OPERATIONAL";
    activePushTokens: number;
    notifications24h: number;
    pushesSent24h: number;
    pushDeliveryRate24h: number | null;
  };
  users: {
    total: number;
    verified: number;
    active7d: number;
    onlineNow: number;
    suspended: number;
    new24h: number;
    new7d: number;
    previous7d: number;
    new30d: number;
  };
  content: {
    posts: number;
    contentPosts: number;
    reviews: number;
    posts24h: number;
    posts7d: number;
    previousPosts7d: number;
    activeSnaps: number;
    snaps7d: number;
    comments7d: number;
    likes7d: number;
    messages7d: number;
  };
  restaurants: {
    total: number;
    claimed: number;
    withoutOwner: number;
    new7d: number;
  };
  queues: {
    pendingClaims: number;
    pendingAddressChanges: number;
    openSupport: number;
    openBugs: number;
    openFeatures: number;
    pendingReports: number;
    pendingAppeals: number;
  };
};

export type AdminActivityItem = {
  id: string;
  type:
    | "SUPPORT"
    | "BUG"
    | "FEATURE"
    | "CLAIM"
    | "ADDRESS"
    | "REPORT"
    | "APPEAL";
  title: string;
  body: string;
  createdAt: string;
  section: AdminDashboardSection;
};
