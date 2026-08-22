import Text from "@/components/common/AppText";
import { TextInput } from "@/components/common";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AppAlert as Alert } from "@/lib/appAlert";
import { api } from "@/lib/api";
import { requestAppleAuth } from "@/lib/appleAuth";
import { getErrorMessage } from "@findeat/utils";
import type { SocialAuthInput } from "@findeat/types";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { FontAwesome6 } from "@expo/vector-icons";
import { CheckCircleIcon, UserIcon, XCircleIcon, XIcon } from "phosphor-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

export default function SocialAuthButtons({
  showDivider = true,
  appearance = "default",
}: {
  showDivider?: boolean;
  appearance?: "default" | "glass";
}) {
  const { t } = useTranslation(["auth", "common"]);
  const { isDark } = useAppTheme();
  const { socialAuth } = useAuth();
  const [workingProvider, setWorkingProvider] = useState<"GOOGLE" | "APPLE" | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleModule, setGoogleModule] = useState<GoogleSignInModule | null>(null);
  const [pendingAppleAuth, setPendingAppleAuth] = useState<SocialAuthInput | null>(null);
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const isGlass = appearance === "glass";
  const buttonBorder = isGlass
    ? "rgba(248,245,239,0.24)"
    : isDark
      ? "#47443E"
      : "#D7D0C5";
  const buttonBackground = isGlass
    ? "rgba(248,245,239,0.10)"
    : isDark
      ? "#252421"
      : "#FFFCF7";
  const buttonText = isGlass ? "#F8F5EF" : isDark ? "#F5F2EC" : "#24221F";

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

  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  useEffect(() => {
    if (!pendingAppleAuth || !usernameValid) return;

    let active = true;
    const timeout = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const availability = await api.auth.checkAvailability({ username });
        if (active) setUsernameAvailable(availability.usernameAvailable);
      } catch {
        if (active) setUsernameAvailable(null);
      } finally {
        if (active) setCheckingUsername(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [pendingAppleAuth, username, usernameValid]);

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
      const payload = await requestAppleAuth();
      const result = await socialAuth(payload);
      if ("usernameRequired" in result) {
        setUsername("");
        setUsernameAvailable(null);
        setPendingAppleAuth(payload);
      }
    } catch (error) {
      if ((error as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        showError(error);
      }
    } finally {
      setWorkingProvider(null);
    }
  }

  function closeUsernameSetup() {
    if (workingProvider) return;
    setPendingAppleAuth(null);
    setUsername("");
    setUsernameAvailable(null);
  }

  async function finishAppleSignup() {
    if (
      !pendingAppleAuth ||
      !usernameValid ||
      usernameAvailable !== true ||
      checkingUsername ||
      workingProvider
    ) return;

    try {
      setWorkingProvider("APPLE");
      await socialAuth({ ...pendingAppleAuth, username });
    } catch (error) {
      showError(error);
    } finally {
      setWorkingProvider(null);
    }
  }

  return (
    <>
    <View style={{ gap: 10 }}>
      {showDivider ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ height: 1, flex: 1, backgroundColor: isGlass ? "rgba(248,245,239,0.24)" : isDark ? "#3A3935" : "#DDD7CD" }} />
          <Text style={{ color: isGlass ? "rgba(248,245,239,0.72)" : isDark ? "#A8A8A3" : "#6B6B67", fontSize: 13 }}>
            {t("auth:orContinueWith")}
          </Text>
          <View style={{ height: 1, flex: 1, backgroundColor: isGlass ? "rgba(248,245,239,0.24)" : isDark ? "#3A3935" : "#DDD7CD" }} />
        </View>
      ) : null}

      {googleModule ? (
        <View style={{ minHeight: 54, justifyContent: "center" }}>
        {workingProvider === "GOOGLE" ? (
          <ActivityIndicator color="#D6A92D" />
        ) : (
          <TouchableOpacity
            onPress={() => void continueWithGoogle()}
            disabled={workingProvider !== null}
            activeOpacity={0.76}
            style={{
              width: "100%",
              minHeight: 54,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 11,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: buttonBorder,
              backgroundColor: buttonBackground,
              paddingHorizontal: 18,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("auth:continueWithGoogle")}
          >
            <FontAwesome6
              name="google"
              size={19}
              color={buttonText}
            />
            <Text
              weight="bold"
              style={{ color: buttonText, fontSize: 15 }}
            >
              {t("auth:continueWithGoogle")}
            </Text>
          </TouchableOpacity>
        )}
        </View>
      ) : null}

      {appleAvailable ? (
        <View style={{ minHeight: 54, justifyContent: "center" }}>
          {workingProvider === "APPLE" ? (
            <ActivityIndicator color="#D6A92D" />
          ) : (
            <TouchableOpacity
              onPress={() => void continueWithApple()}
              disabled={workingProvider !== null}
              activeOpacity={0.76}
              style={{
                width: "100%",
                minHeight: 54,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 11,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: buttonBorder,
                backgroundColor: buttonBackground,
                paddingHorizontal: 18,
              }}
              accessibilityRole="button"
              accessibilityLabel={t("auth:continueWithApple")}
            >
              <FontAwesome6
                name="apple"
                size={21}
                color={buttonText}
              />
              <Text
                weight="bold"
                style={{ color: buttonText, fontSize: 15 }}
              >
                {t("auth:continueWithApple")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>

    <Modal
      visible={pendingAppleAuth !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeUsernameSetup}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: isDark ? "#11110F" : "#FBFAF8" }}
      >
        <View
          style={{
            minHeight: 60,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity
            onPress={closeUsernameSetup}
            disabled={workingProvider !== null}
            accessibilityRole="button"
            accessibilityLabel={t("common:close")}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              backgroundColor: isDark
                ? "rgba(250,249,246,0.08)"
                : "rgba(23,23,21,0.06)",
            }}
          >
            <XIcon size={23} color={isDark ? "#FAF9F6" : "#171715"} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 32,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ width: "100%", maxWidth: 520, alignSelf: "center" }}>
              <Text
                weight="black"
                style={{
                  color: isDark ? "#FAF9F6" : "#171715",
                  fontSize: 32,
                  lineHeight: 38,
                }}
              >
                {t("auth:signupUsernameTitle")}
              </Text>
              <Text
                style={{
                  marginTop: 9,
                  color: isDark ? "#A8A8A3" : "#6B6B67",
                  fontSize: 16,
                  lineHeight: 23,
                }}
              >
                {t("auth:signupUsernameSubtitle")}
              </Text>

              <View style={{ marginTop: 32 }}>
                <TextInput
                  value={username}
                  onChangeText={(value) => {
                    setCheckingUsername(false);
                    setUsernameAvailable(null);
                    setUsername(value.replace(/[^a-zA-Z0-9_]/g, ""));
                  }}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  placeholder={t("auth:usernamePlaceholder")}
                  leftIcon={
                    <UserIcon
                      size={21}
                      color={isDark ? "#A8A8A3" : "#6B6B67"}
                    />
                  }
                  rightIcon={
                    username.length === 0 ? undefined :
                    !usernameValid || usernameAvailable === false ? (
                      <XCircleIcon size={22} color="#DC5A5A" weight="fill" />
                    ) : usernameAvailable === true ? (
                      <CheckCircleIcon size={22} color="#2E9B62" weight="fill" />
                    ) : (
                      <ActivityIndicator size="small" color="#D6A92D" />
                    )
                  }
                  style={{ fontSize: 18 }}
                  className="border-[#DDD7CD] bg-[#F1EEE8] dark:border-[#383833] dark:bg-[#1D1D1A]"
                />
              </View>

              <View style={{ minHeight: 38, justifyContent: "center" }}>
                {usernameAvailable === false ? (
                  <Text style={{ color: "#DC5A5A", fontSize: 14 }}>
                    {t("auth:usernameTaken")}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => void finishAppleSignup()}
                disabled={
                  !usernameValid ||
                  usernameAvailable !== true ||
                  checkingUsername ||
                  workingProvider !== null
                }
                activeOpacity={0.8}
                style={{
                  minHeight: 56,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 19,
                  backgroundColor: "#D6A92D",
                  opacity:
                    usernameValid &&
                    usernameAvailable === true &&
                    !checkingUsername &&
                    workingProvider === null
                      ? 1
                      : 0.42,
                }}
              >
                {workingProvider === "APPLE" ? (
                  <ActivityIndicator color="#24221F" />
                ) : (
                  <Text weight="bold" style={{ color: "#24221F", fontSize: 16 }}>
                    {t("auth:continue")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
    </>
  );
}
