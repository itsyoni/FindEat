export type ReservationProvider = "FINDEAT" | "TABIT" | "ONTOP" | "OTHER" | "NONE";

export type ReservationIntegrationMode = "EXTERNAL_LINK" | "DIRECT_API";

export type ReservationClickSource =
  | "RESTAURANT_PAGE"
  | "CONTENT_POST"
  | "REVIEW_POST"
  | "TRIP"
  | "MAP"
  | "SEARCH"
  | "OTHER";

export type RestaurantReservationConfig = {
  id: string | null;
  restaurantId: string;
  provider: ReservationProvider;
  integrationMode: ReservationIntegrationMode;
  reservationUrl: string | null;
  enabled: boolean;
  providerMetadata?: Record<string, unknown> | null;
  externalAccountId?: string | null;
  slotDurationMinutes: number;
  bookingIntervalMinutes: number;
  minPartySize: number;
  maxPartySize: number;
  advanceBookingDays: number;
  minimumLeadMinutes: number;
  autoConfirm: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ReservationBookingLinkResponse = {
  bookingUrl: string;
  provider: Exclude<ReservationProvider, "NONE">;
};

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

/** Reserved for future direct provider integrations; clicks are tracked separately. */
export type Reservation = {
  id: string;
  userId?: string | null;
  restaurantId: string;
  provider: Exclude<ReservationProvider, "NONE">;
  externalReservationId?: string | null;
  status: ReservationStatus;
  reservationTime: string;
  partySize: number;
  durationMinutes: number;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestNotes?: string | null;
  internalNotes?: string | null;
  tableId?: string | null;
  createdByUserId?: string | null;
  table?: RestaurantReservationTable | null;
  user?: {
    id: string;
    displayName: string;
    username: string;
    email: string;
    phoneNumber?: string | null;
    avatarUrl?: string | null;
  } | null;
  tripId?: string | null;
  providerMetadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantReservationTable = {
  id: string;
  restaurantId: string;
  name: string;
  area?: string | null;
  seats: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantReservationsBoard = {
  from: string;
  to: string;
  reservations: Reservation[];
  tables: RestaurantReservationTable[];
};

export type RestaurantBusinessProStatus = {
  plan: "FREE" | "PRO";
  status:
    | "INACTIVE"
    | "REQUESTED"
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELLED";
  hasProAccess: boolean;
  accessSource: "ADMIN" | "SUBSCRIPTION" | "NONE";
  requestedAt?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
};
