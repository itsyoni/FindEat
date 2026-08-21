import type {
  AdminKnownIssue,
  KnownIssue,
  KnownIssueInput,
  KnownIssueStatus,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createKnownIssuesApi(api: AxiosInstance) {
  return {
    async list(filters: {
      status?: KnownIssueStatus;
      platform?: string;
      affectedArea?: string;
    } = {}) {
      const { data } = await api.get<KnownIssue[]>("/known-issues", {
        params: filters,
      });
      return data;
    },

    async find(id: string) {
      const { data } = await api.get<KnownIssue>(`/known-issues/${id}`);
      return data;
    },

    async affectedMine() {
      const { data } = await api.get<{ issueIds: string[] }>(
        "/known-issues/affected/me",
      );
      return data;
    },

    async setAffected(id: string, affected: boolean) {
      const { data } = await api.post<{
        affected: boolean;
        affectedCount: number;
      }>(`/known-issues/${id}/affected`, { affected });
      return data;
    },

    async listAdmin() {
      const { data } = await api.get<AdminKnownIssue[]>("/admin/known-issues");
      return data;
    },

    async createAdmin(input: KnownIssueInput) {
      const { data } = await api.post<AdminKnownIssue>(
        "/admin/known-issues",
        input,
      );
      return data;
    },

    async updateAdmin(id: string, input: Partial<KnownIssueInput>) {
      const { data } = await api.patch<AdminKnownIssue>(
        `/admin/known-issues/${id}`,
        input,
      );
      return data;
    },

    async deleteAdmin(id: string) {
      const { data } = await api.delete<{ deleted: true }>(
        `/admin/known-issues/${id}`,
      );
      return data;
    },
  };
}
