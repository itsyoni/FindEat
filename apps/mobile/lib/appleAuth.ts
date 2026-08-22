import * as AppleAuthentication from "expo-apple-authentication";
import type { SocialAuthInput } from "@findeat/types";

export async function requestAppleAuth(): Promise<SocialAuthInput> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error("Apple did not return an identity token");
  }
  const displayName = [
    credential.fullName?.givenName,
    credential.fullName?.familyName,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    provider: "APPLE",
    identityToken: credential.identityToken,
    ...(credential.authorizationCode
      ? { authorizationCode: credential.authorizationCode }
      : {}),
    ...(displayName ? { displayName } : {}),
  };
}
