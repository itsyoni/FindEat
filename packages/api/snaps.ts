import type {
  CreateSnapInput,
  Snap,
  SnapGroup,
  SnapViewer,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createSnapsApi(api: AxiosInstance) {
  return {
    async feed() {
      const { data } = await api.get<SnapGroup[]>("/snaps");
      return data;
    },

    async create(payload: CreateSnapInput) {
      const { data } = await api.post<Snap>("/snaps", payload);
      return data;
    },

    async markViewed(id: string) {
      const { data } = await api.post<{ viewedAt: string | null }>(
        `/snaps/${id}/view`,
      );
      return data;
    },

    async viewers(id: string) {
      const { data } = await api.get<SnapViewer[]>(`/snaps/${id}/viewers`);
      return data;
    },

    async remove(id: string) {
      const { data } = await api.delete<{ ok: true }>(`/snaps/${id}`);
      return data;
    },
  };
}
