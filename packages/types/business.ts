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
  | "reservations"
  | "pro"
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
  | "directory"
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
  moderation: {
    reports7d: number;
    previousReports7d: number;
    resolved7d: number;
    dismissed7d: number;
    removals7d: number;
    reversedRemovals7d: number;
    appealsApproved7d: number;
    appealsRejected7d: number;
    unresolvedOlderThan48h: number;
    repeatOffenders: number;
    averageResolutionHours30d: number | null;
    suspensionPolicy: "MANUAL_REVIEW";
    automaticSuspensionThreshold: number | null;
  };
  retention: {
    activeRate7d: number;
    deactivated30d: number;
    deleted30d: number;
  };
};

export type AdminDirectorySearchUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
  deletedAt?: string | null;
  deactivatedAt?: string | null;
  isSuspended: boolean;
  isAdmin: boolean;
  _count: {
    reportsReceived: number;
    reportsSubmitted: number;
    moderationActionsReceived: number;
  };
};

export type AdminDirectorySearchRestaurant = {
  id: string;
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  countryCode?: string | null;
  status: "PENDING" | "VERIFIED" | "CLAIMED";
  createdAt: string;
  _count: {
    reports: number;
    disputesReported: number;
    members: number;
    followers: number;
  };
};

export type AdminDirectorySearchResult = {
  users: AdminDirectorySearchUser[];
  restaurants: AdminDirectorySearchRestaurant[];
};

export type AdminDirectoryReport = {
  id: string;
  targetType: string;
  reason: string;
  details?: string | null;
  status: string;
  resolution?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  postId?: string | null;
  commentId?: string | null;
  snapId?: string | null;
  restaurant?: { id: string; name: string } | null;
  reporter?: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
  reportedUser?: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
};

export type AdminDirectoryModerationAction = {
  id: string;
  action: string;
  reason: string;
  metadata?: unknown;
  postId?: string | null;
  reportId?: string | null;
  createdAt: string;
  reversedAt?: string | null;
  actor: { id: string; displayName: string; username: string };
  appeals: Array<{
    id: string;
    status: string;
    reason: string;
    resolutionNote?: string | null;
    createdAt: string;
    reviewedAt?: string | null;
  }>;
};

export type AdminDirectoryProfileRequest = {
  id: string;
  subject: string;
  message: string;
  status: string;
  adminReply?: string | null;
  createdAt: string;
  updatedAt: string;
  handledBy?: {
    id: string;
    displayName: string;
    username: string;
  } | null;
};

export type AdminDirectoryUserDetail = {
  kind: "USER";
  profile: AdminDirectorySearchUser & {
    emailVerifiedAt?: string | null;
    coverUrl?: string | null;
    bio?: string | null;
    phoneNumber?: string | null;
    birthday?: string | null;
    pronouns?: string | null;
    language: string;
    isPrivate: boolean;
    suspendedAt?: string | null;
    isOnline: boolean;
    lastSeenAt?: string | null;
    updatedAt: string;
    onboardingCompletedAt?: string | null;
    authIdentities: Array<{
      provider: string;
      providerEmail?: string | null;
      createdAt: string;
    }>;
    restaurantMemberships: Array<{
      role: string;
      isPublic: boolean;
      restaurant: {
        id: string;
        name: string;
        logoUrl?: string | null;
        status: string;
      };
      teamRole?: { id: string; name: string } | null;
    }>;
  };
  analytics: Record<string, number>;
  strikes: {
    policy: "MANUAL_REVIEW";
    automaticSuspensionThreshold: null;
    active: number;
    lifetime: number;
    reversed: number;
  };
  reportsSent: AdminDirectoryReport[];
  reportsReceived: AdminDirectoryReport[];
  moderationActions: AdminDirectoryModerationAction[];
  appeals: Array<Record<string, unknown>>;
  enforcements: Array<Record<string, unknown>>;
  profileRequests: AdminDirectoryProfileRequest[];
};

export type AdminDirectoryRestaurantDetail = {
  kind: "RESTAURANT";
  profile: AdminDirectorySearchRestaurant & {
    bio?: string | null;
    coverUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    mapboxId?: string | null;
    googlePlaceId?: string | null;
    phone?: string | null;
    website?: string | null;
    instagram?: string | null;
    source: string;
    updatedAt: string;
    menuPublishedAt?: string | null;
    members: Array<{
      id: string;
      role: string;
      isPublic: boolean;
      teamRole?: { id: string; name: string } | null;
      user: {
        id: string;
        displayName: string;
        username: string;
        email: string;
        avatarUrl?: string | null;
      };
    }>;
  };
  analytics: Record<string, number>;
  reportsSent: AdminDirectoryReport[];
  reportsReceived: AdminDirectoryReport[];
  profileRequests: AdminDirectoryProfileRequest[];
};

export type AdminDirectoryDetail =
  | AdminDirectoryUserDetail
  | AdminDirectoryRestaurantDetail;

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
