import type {
  PlaceListDetail,
  PlaceListInvitation,
  PlaceListSentInvitation,
  PlaceListMemberRole,
  PlaceListSummary,
  PlaceListWriteInput,
  RestaurantPlaceLists,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createPlaceListsApi(api: AxiosInstance) {
  return {
    async mine(query?: string) {
      const { data } = await api.get<PlaceListSummary[]>("/place-lists", {
        params: query?.trim() ? { q: query.trim() } : undefined,
      });
      return data;
    },

    async get(id: string) {
      const { data } = await api.get<PlaceListDetail>(`/place-lists/${id}`);
      return data;
    },

    async forRestaurant(restaurantId: string) {
      const { data } = await api.get<RestaurantPlaceLists>(
        `/place-lists/for-restaurant/${restaurantId}`,
      );
      return data;
    },

    async invitations() {
      const { data } = await api.get<PlaceListInvitation[]>(
        "/place-lists/invitations/mine",
      );
      return data;
    },

    async sentInvitations(id: string) {
      const { data } = await api.get<PlaceListSentInvitation[]>(
        `/place-lists/${id}/invitations`,
      );
      return data;
    },

    async create(payload: PlaceListWriteInput & {
      name: string;
      restaurantId?: string;
    }) {
      const { data } = await api.post<PlaceListSummary>("/place-lists", payload);
      return data;
    },

    async update(
      id: string,
      payload: PlaceListWriteInput,
    ) {
      const { data } = await api.patch<PlaceListDetail>(
        `/place-lists/${id}`,
        payload,
      );
      return data;
    },

    async remove(id: string) {
      const { data } = await api.delete<{ ok: true }>(`/place-lists/${id}`);
      return data;
    },

    async invite(id: string, userId: string, role: PlaceListMemberRole) {
      const { data } = await api.post(
        `/place-lists/${id}/invitations`,
        { userId, role },
      );
      return data;
    },

    async respondToInvitation(invitationId: string, accept: boolean) {
      const { data } = await api.patch<{ ok: true; listId: string }>(
        `/place-lists/invitations/${invitationId}/respond`,
        { accept },
      );
      return data;
    },

    async updateInvitation(
      id: string,
      invitationId: string,
      role: PlaceListMemberRole,
    ) {
      const { data } = await api.patch<PlaceListSentInvitation[]>(
        `/place-lists/${id}/invitations/${invitationId}`,
        { role },
      );
      return data;
    },

    async revokeInvitation(id: string, invitationId: string) {
      const { data } = await api.delete<PlaceListSentInvitation[]>(
        `/place-lists/${id}/invitations/${invitationId}`,
      );
      return data;
    },

    async updateMember(
      id: string,
      memberId: string,
      role: PlaceListMemberRole,
    ) {
      const { data } = await api.patch<PlaceListDetail>(
        `/place-lists/${id}/members/${memberId}`,
        { role },
      );
      return data;
    },

    async removeMember(id: string, memberId: string) {
      const { data } = await api.delete<PlaceListDetail>(
        `/place-lists/${id}/members/${memberId}`,
      );
      return data;
    },

    async leave(id: string) {
      const { data } = await api.post<{ ok: true }>(
        `/place-lists/${id}/leave`,
      );
      return data;
    },

    async setRestaurantLists(restaurantId: string, listIds: string[]) {
      const { data } = await api.put<RestaurantPlaceLists>(
        `/place-lists/for-restaurant/${restaurantId}`,
        { listIds },
      );
      return data;
    },
  };
}
