import type { SocialAuthInput } from "@findeat/types";
import { Platform } from "react-native";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

let googleModulePromise: Promise<GoogleSignInModule> | null = null;

export function isGoogleAuthConfigured() {
  return Boolean(googleWebClientId);
}

export function loadGoogleAuthModule() {
  if (!googleModulePromise) {
    googleModulePromise = import("@react-native-google-signin/google-signin").then(
      (module) => {
        module.GoogleSignin.configure({
          ...(googleWebClientId ? { webClientId: googleWebClientId } : {}),
          ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
          offlineAccess: false,
        });
        return module;
      },
    );
  }
  return googleModulePromise;
}

export async function requestGoogleAuth(): Promise<SocialAuthInput | null> {
  const googleModule = await loadGoogleAuthModule();
  if (Platform.OS === "android") {
    await googleModule.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }
  const result = await googleModule.GoogleSignin.signIn();
  if (result.type !== "success") return null;
  if (!result.data.idToken) {
    throw new Error("Google did not return an identity token");
  }
  return {
    provider: "GOOGLE",
    identityToken: result.data.idToken,
    displayName: result.data.user.name ?? undefined,
  };
}
