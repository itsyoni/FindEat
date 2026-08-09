import { Chat, Message, SendMessagePayload } from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createChatsApi(api: AxiosInstance) {
  return {
    async list() {
      const { data } = await api.get<Chat[]>("/chats");
      return data;
    },

    async archived() {
      const { data } = await api.get<Chat[]>("/chats/archived");
      return data;
    },

    async archivedCount() {
      const { data } = await api.get<{ count: number }>("/chats/archived/count");
      return data.count;
    },

    async setPinned(id: string, pinned: boolean) {
      const { data } = await api.patch<{
        conversationId: string;
        pinned: boolean;
      }>(`/chats/${id}/pin`, { pinned });
      return data;
    },

    async setArchived(id: string, archived: boolean) {
      const { data } = await api.patch<{
        conversationId: string;
        archived: boolean;
      }>(`/chats/${id}/archive`, { archived });
      return data;
    },

    async deleteForMe(id: string) {
      const { data } = await api.delete<{
        conversationId: string;
        deletedForMe: true;
      }>(`/chats/${id}`);
      return data;
    },

    async findRestaurantConversation(restaurantId: string) {
      const { data } = await api.get<Chat[]>("/chats");
      return (
        data.find(
          (chat) =>
            chat.type === "RESTAURANT" &&
            chat.restaurantId === restaurantId,
        ) ?? null
      );
    },

    async sendDirectMessage(userId: string, content: string) {
      const { data } = await api.post(`/chats/direct/${userId}/messages`, {
        content,
      });

      return data;
    },

    async sendSnapReply(userId: string, snapId: string, content: string) {
      const { data } = await api.post<Message>(
        `/chats/direct/${userId}/snap-replies`,
        { snapId, content },
      );
      return data;
    },

    async sendRestaurantMessage(restaurantId: string, content: string) {
      const { data } = await api.post(
        `/chats/restaurants/${restaurantId}/messages`,
        { content },
      );

      return data;
    },

    async createGroup(payload: { title: string; participantIds: string[] }) {
      const { data } = await api.post("/chats/groups", payload);
      return data;
    },

    async addMembers(conversationId: string, participantIds: string[]) {
      const { data } = await api.post(`/chats/${conversationId}/members`, {
        participantIds,
      });

      return data;
    },

    async updateGroup(
      conversationId: string,
      payload: { imageUrl?: string | null },
    ) {
      const { data } = await api.patch<Chat>(
        `/chats/${conversationId}/group`,
        payload,
      );
      return data;
    },

    async get(id: string) {
      const { data } = await api.get<Chat>(`/chats/${id}`);
      return data;
    },

    async messages(id: string) {
      const { data } = await api.get<Message[]>(`/chats/${id}/messages`);
      return data;
    },

    async starredMessages(id: string) {
      const { data } = await api.get<Message[]>(`/chats/${id}/starred-messages`);
      return data;
    },

    async searchMessages(id: string, query: string) {
      const { data } = await api.get<Message[]>(`/chats/${id}/messages/search`, {
        params: { q: query },
      });
      return data;
    },

    async setMessageStarred(id: string, messageId: string, starred: boolean) {
      const { data } = await api.patch<{ messageId: string; starred: boolean }>(
        `/chats/${id}/messages/${messageId}/star`,
        { starred },
      );
      return data;
    },

    async sendMessage(id: string, payload: SendMessagePayload) {
      const { data } = await api.post<Message>(
        `/chats/${id}/messages`,
        payload,
      );
      return data;
    },

    async editMessage(id: string, messageId: string, content: string) {
      const { data } = await api.patch<Message>(
        `/chats/${id}/messages/${messageId}`,
        { content },
      );
      return data;
    },

    async deleteMessage(id: string, messageId: string, scope: "me" | "everyone") {
      const { data } = await api.delete<{
        messageId: string;
        scope: "me" | "everyone";
        deletedAt?: string;
      }>(`/chats/${id}/messages/${messageId}`, { params: { scope } });
      return data;
    },

    async startDirectConversation(userId: string) {
      const { data } = await api.post<{ id: string }>(`/chats/start/${userId}`);

      return data;
    },
  };
}
