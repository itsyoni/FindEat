import type {
  AccountAvailability,
  AccountAvailabilityQuery,
  AuthSession,
  LoginInput,
  SignupInput,
  SignupResult,
  SocialAuthInput,
  AuthTokens,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createAuthApi(api: AxiosInstance) {
  return {
    async signup(payload: SignupInput) {
      const { data } = await api.post<SignupResult>("/auth/signup", payload);

      return data;
    },

    async verifyEmail(email: string, code: string) {
      const { data } = await api.post<AuthSession>(
        "/auth/email/verify",
        { email, code },
      );
      return data;
    },

    async resendVerification(email: string) {
      const { data } = await api.post<{ ok: boolean }>("/auth/email/resend", { email });
      return data;
    },

    async forgotPassword(email: string) {
      const { data } = await api.post<{ ok: boolean }>("/auth/password/forgot", { email });
      return data;
    },

    async resetPassword(email: string, code: string, password: string) {
      const { data } = await api.post<{ ok: boolean }>("/auth/password/reset", {
        email,
        code,
        password,
      });
      return data;
    },

    async login(payload: LoginInput) {
      const { data } = await api.post<AuthSession>("/auth/login", payload);

      return data;
    },

    async socialAuth(payload: SocialAuthInput) {
      const { data } = await api.post<AuthSession>("/auth/social", payload);
      return data;
    },

    async refresh(refreshToken: string) {
      const { data } = await api.post<AuthTokens>("/auth/refresh", {
        refreshToken,
      });
      return data;
    },

    async logout(refreshToken: string) {
      const { data } = await api.post<{ ok: true }>("/auth/logout", {
        refreshToken,
      });
      return data;
    },

    async upgradeSession() {
      const { data } = await api.post<AuthTokens>("/auth/session/upgrade");
      return data;
    },

    async checkAvailability(payload: AccountAvailabilityQuery) {
      const { data } = await api.get<AccountAvailability>("/auth/check-availability", {
        params: payload,
      });

      return data;
    },

    async me() {
      const { data } = await api.get<AuthSession["user"]>("/auth/me");
      return data;
    },

    async deleteAccount(password: string, confirmation: string) {
      const { data } = await api.delete<{ ok: true }>("/auth/account", {
        data: { password, confirmation },
      });
      return data;
    },

    async deactivateAccount(password: string) {
      const { data } = await api.post<{ ok: true }>(
        "/auth/account/deactivate",
        { password },
      );
      return data;
    },

    async reactivateAccount(payload: LoginInput) {
      const { data } = await api.post<AuthSession>(
        "/auth/account/reactivate",
        payload,
      );
      return data;
    },
  };
}
