import type {
  CreateReportInput,
  ModerationActionDecision,
  ModerationReport,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createReportsApi(api: AxiosInstance) {
  return {
    async create(payload: CreateReportInput) {
      const { data } = await api.post<
        Pick<ModerationReport, "id" | "status">
      >("/reports", payload);
      return data;
    },
    async myRestaurantDisputes() {
      const { data } = await api.get("/reports/restaurant-disputes/me");
      return data;
    },
    async respondToRestaurantDispute(
      id: string,
      payload: {
        response: "CHANGE_RESTAURANT" | "CONFIRM_CORRECT";
        restaurantId?: string;
      },
    ) {
      const { data } = await api.patch(
        `/reports/restaurant-disputes/${id}/respond`,
        payload,
      );
      return data;
    },
    async myModerationActions() {
      const { data } = await api.get<ModerationActionDecision[]>(
        "/reports/moderation-actions/me",
      );
      return data;
    },
    async moderationAction(id: string) {
      const { data } = await api.get<ModerationActionDecision>(
        `/reports/moderation-actions/${id}`,
      );
      return data;
    },
    async appeal(actionId: string, reason: string) {
      const { data } = await api.post(
        `/reports/moderation-actions/${actionId}/appeal`,
        { reason },
      );
      return data;
    },
  };
}
