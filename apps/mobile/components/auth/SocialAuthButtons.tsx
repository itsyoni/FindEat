import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AppAlert as Alert } from "@/lib/appAlert";
import { getErrorMessage } from "@findeat/utils";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

export default function SocialAuthButtons({ showDivider = true }: { showDivider?: boolean }) {
  const { t } = useTranslation(["auth", "common"]);
  const { isDark } = useAppTheme();
  const { socialAuth } = useAuth();
  const [workingProvider, setWorkingProvider] = useState<"GOOGLE" | "APPLE" | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleModule, setGoogleModule] = useState<GoogleSignInModule | null>(null);

  useEffect(() => {
    void import("@react-native-google-signin/google-signin")
      .then((module) => {
        module.GoogleSignin.configure({
          ...(googleWebClientId ? { webClientId: googleWebClientId } : {}),
          ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
          offlineAccess: false,
        });
        setGoogleModule(module);
      })
      .catch(() => setGoogleModule(null));
    if (Platform.OS === "ios") {
      void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  function showError(error: unknown) {
    Alert.alert(
      t("common:error"),
      getErrorMessage(error, t("auth:socialAuthFailed")),
    );
  }

  async function continueWithGoogle() {
    if (workingProvider) return;
    if (!googleWebClientId) {
      Alert.alert(t("common:error"), t("auth:googleNotConfigured"));
      return;
    }
    try {
      setWorkingProvider("GOOGLE");
      if (!googleModule) throw new Error(t("auth:socialAuthRequiresRebuild"));
      if (Platform.OS === "android") {
        await googleModule.GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }
      const result = await googleModule.GoogleSignin.signIn();
      if (result.type !== "success") return;
      if (!result.data.idToken) throw new Error(t("auth:socialAuthFailed"));
      await socialAuth({
        provider: "GOOGLE",
        identityToken: result.data.idToken,
        displayName: result.data.user.name ?? undefined,
      });
    } catch (error) {
      showError(error);
    } finally {
      setWorkingProvider(null);
    }
  }

  async function continueWithApple() {
    if (workingProvider) return;
    try {
      setWorkingProvider("APPLE");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error(t("auth:socialAuthFailed"));
      }
      const displayName = [
        credential.fullName?.givenName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(" ");
      await socialAuth({
        provider: "APPLE",
        identityToken: credential.identityToken,
        ...(displayName ? { displayName } : {}),
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        showError(error);
      }
    } finally {
      setWorkingProvider(null);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      {showDivider ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ height: 1, flex: 1, backgroundColor: isDark ? "#3A3935" : "#DDD7CD" }} />
          <Text style={{ color: isDark ? "#A8A8A3" : "#6B6B67", fontSize: 13 }}>
            {t("auth:orContinueWith")}
          </Text>
          <View style={{ height: 1, flex: 1, backgroundColor: isDark ? "#3A3935" : "#DDD7CD" }} />
        </View>
      ) : null}

      {googleModule ? (
        <View style={{ minHeight: 52, justifyContent: "center" }}>
        {workingProvider === "GOOGLE" ? (
          <ActivityIndicator color="#D6A92D" />
        ) : (
          <googleModule.GoogleSigninButton
            size={googleModule.GoogleSigninButton.Size.Wide}
            color={
              isDark
                ? googleModule.GoogleSigninButton.Color.Dark
                : googleModule.GoogleSigninButton.Color.Light
            }
            onPress={() => void continueWithGoogle()}
            disabled={workingProvider !== null}
            style={{ width: "100%", height: 52 }}
          />
        )}
        </View>
      ) : null}

      {appleAvailable ? (
        <View style={{ minHeight: 52, justifyContent: "center" }}>
          {workingProvider === "APPLE" ? (
            <ActivityIndicator color="#D6A92D" />
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={16}
              style={{ width: "100%", height: 52 }}
              onPress={() => void continueWithApple()}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}
