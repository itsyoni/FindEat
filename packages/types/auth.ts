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
