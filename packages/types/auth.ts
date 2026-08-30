import type { Profile } from "./profile";

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  email: string;
  username: string;
  password: string;
};

export type SocialAuthProvider = "GOOGLE" | "APPLE";

export type SocialAuthInput = {
  provider: SocialAuthProvider;
  identityToken: string;
  displayName?: string;
  username?: string;
  authorizationCode?: string;
};

export type LinkAuthProviderInput = Pick<
  SocialAuthInput,
  "provider" | "identityToken" | "authorizationCode"
>;

export type LinkAuthProviderResult = {
  ok: true;
  provider: SocialAuthProvider;
};

export type AccountCredential = {
  password?: string;
  provider?: SocialAuthProvider;
  identityToken?: string;
  authorizationCode?: string;
};

export type SocialAuthUsernameRequired = {
  usernameRequired: true;
};

export type SignupResult = {
  email: string;
  emailVerificationRequired: true;
};

export type AuthSession = {
  user: Profile;
  accessToken: string;
  refreshToken: string;
};

export type SocialAuthResult = AuthSession | SocialAuthUsernameRequired;

export type AuthTokens = Pick<AuthSession, "accessToken" | "refreshToken">;

export type AccountAvailabilityQuery = {
  username?: string;
  email?: string;
};

export type AccountAvailability = {
  usernameAvailable: boolean | null;
  emailAvailable: boolean | null;
};

export type LoginFormData = LoginInput;

export type SignupFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};
