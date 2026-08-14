import type { Sound } from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createSoundsApi(api: AxiosInstance) {
  return {
    async list(params?: { q?: string; category?: string; territory?: string }) {
      const { data } = await api.get<Sound[]>("/sounds", { params });
      return data;
    },
    async find(id: string, territory?: string) {
      const { data } = await api.get<Sound>(`/sounds/${id}`, {
        params: territory ? { territory } : undefined,
      });
      return data;
    },
    async track(payload: {
      event: "PICKER_OPENED" | "SEARCHED" | "PREVIEWED" | "SELECTED" | "REMOVED_BEFORE_PUBLISH";
      soundId?: string;
      surface?: "post" | "snap";
      query?: string;
    }) {
      await api.post("/sounds/events", payload);
    },
  };
}
