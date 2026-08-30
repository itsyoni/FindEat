import type {
  Reservation,
  ReservationBookingLinkResponse,
  ReservationClickSource,
  ReservationProvider,
  RestaurantReservationConfig,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createReservationsApi(api: AxiosInstance) {
  return {
    async getConfig(restaurantId: string) {
      const { data } = await api.get<RestaurantReservationConfig>(
        `/restaurants/${restaurantId}/reservation-config`,
      );
      return data;
    },

    async getPublicConfig(restaurantId: string) {
      const { data } = await api.get<RestaurantReservationConfig>(
        `/restaurants/${restaurantId}/reservation-config/public`,
      );
      return data;
    },

    async updateConfig(
      restaurantId: string,
      payload: {
        provider: ReservationProvider;
        enabled: boolean;
        reservationUrl?: string | null;
        providerMetadata?: Record<string, unknown> | null;
        slotDurationMinutes?: number;
        bookingIntervalMinutes?: number;
        minPartySize?: number;
        maxPartySize?: number;
        advanceBookingDays?: number;
        minimumLeadMinutes?: number;
        autoConfirm?: boolean;
      },
    ) {
      const { data } = await api.patch<RestaurantReservationConfig>(
        `/restaurants/${restaurantId}/reservation-config`,
        payload,
      );
      return data;
    },

    async deleteConfig(restaurantId: string) {
      const { data } = await api.delete<{ deleted: true }>(
        `/restaurants/${restaurantId}/reservation-config`,
      );
      return data;
    },

    async resolveBookingLink(
      restaurantId: string,
      payload: {
        source: ReservationClickSource;
        sourcePostId?: string;
        sourceMenuItemId?: string;
        tripId?: string;
      },
    ) {
      const { data } = await api.post<ReservationBookingLinkResponse>(
        `/restaurants/${restaurantId}/reservations/booking-link`,
        payload,
      );
      return data;
    },

    async createNative(
      restaurantId: string,
      payload: {
        reservationTime: string;
        partySize: number;
        guestNotes?: string;
      },
    ) {
      const { data } = await api.post<Reservation>(
        `/restaurants/${restaurantId}/reservations/native`,
        payload,
      );
      return data;
    },
  };
}
