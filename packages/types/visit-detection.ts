export type VisitDetectionMode = "FULL" | "FOREGROUND" | "UNAVAILABLE";

export type VisitDetectionCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  logoUrl?: string | null;
  radius: number;
  distanceMeters: number;
};

export type MutedVisitRestaurant = {
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    city?: string | null;
  };
};

export type VisitCandidateStatus =
  | "DWELLING"
  | "PENDING"
  | "REMIND_LATER"
  | "DISMISSED"
  | "COMPLETED";

export type RestaurantVisitCandidate = {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  enteredAt: number;
  exitedAt?: number;
  durationMs?: number;
  status: VisitCandidateStatus;
  reminderCount: number;
  notificationId?: string;
  updatedAt: number;
};

export type VisitDetectionPreferences = {
  enabled: boolean;
  promptSeen: boolean;
  promptDismissedAt?: number;
  promptSuppressed?: boolean;
  mode: VisitDetectionMode;
};
