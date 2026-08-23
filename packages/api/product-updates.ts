import type { AxiosInstance } from "axios";
import type { ProductUpdate } from "@findeat/types";

export function createProductUpdatesApi(client: AxiosInstance) {
  return {
    async list() {
      const { data } = await client.get<ProductUpdate[]>("/product-updates");
      return data;
    },
    async unseen() {
      const { data } = await client.get<ProductUpdate[]>("/product-updates/unseen");
      return data;
    },
    async markSeen(id: string) {
      const { data } = await client.post<{ ok: true; viewedAt: string }>(
        `/product-updates/${id}/seen`,
      );
      return data;
    },
  };
}
