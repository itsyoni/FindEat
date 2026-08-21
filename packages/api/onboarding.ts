import type { OnboardingState, UpdateOnboardingInput } from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createOnboardingApi(api: AxiosInstance) {
  return {
    async get() {
      const { data } = await api.get<OnboardingState>("/onboarding");
      return data;
    },

    async update(input: UpdateOnboardingInput) {
      const { onboardingStep, onboardingProgress, ...rest } = input;
      const { data } = await api.patch<OnboardingState>("/onboarding", {
        ...rest,
        step: input.step ?? onboardingStep,
        progress: input.progress ?? onboardingProgress,
      });
      return data;
    },

    async complete() {
      const { data } = await api.post<OnboardingState>("/onboarding/complete");
      return data;
    },

    async markCoachMarkSeen(key: string) {
      const { data } = await api.post<{ seenCoachMarks: string[] }>(
        `/onboarding/coach-marks/${encodeURIComponent(key)}/seen`,
      );
      return data;
    },
  };
}
