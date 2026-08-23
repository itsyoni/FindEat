import type { AxiosInstance } from "axios";
import type {
  CreateSupportTicketInput,
  SupportTicket,
} from "@findeat/types";

export function createSupportApi(client: AxiosInstance) {
  return {
    async listMine(restaurantId?: string) {
      const response = await client.get<SupportTicket[]>("/support/tickets/me", {
        params: restaurantId ? { restaurantId } : undefined,
      });
      return response.data;
    },

    async create(input: CreateSupportTicketInput) {
      const response = await client.post<SupportTicket>("/support/tickets", input);
      return response.data;
    },

    async updateAttachments(
      ticketId: string,
      attachments: NonNullable<CreateSupportTicketInput["attachments"]>,
    ) {
      const response = await client.patch<SupportTicket>(
        `/support/tickets/${ticketId}/attachments`,
        { attachments },
      );
      return response.data;
    },
  };
}
