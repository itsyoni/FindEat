import type { AxiosInstance } from "axios";
import type { PlannedFeature } from "@findeat/types";

export function createPlannedFeaturesApi(client: AxiosInstance) {
  return {
    async list() {
      const response = await client.get<PlannedFeature[]>("/planned-features");
      return response.data;
    },
  };
}
