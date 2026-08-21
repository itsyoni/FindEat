export type ReservationProvider = "TABIT" | "ONTOP" | "OTHER" | "NONE";

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
  userId: string;
  restaurantId: string;
  provider: Exclude<ReservationProvider, "NONE">;
  externalReservationId?: string | null;
  status: ReservationStatus;
  reservationTime: string;
  partySize: number;
  tripId?: string | null;
  providerMetadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};
