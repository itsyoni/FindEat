import { AppAlert as Alert } from "@/lib/appAlert";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Text from "@/components/common/AppText";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppState,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { applyAppLanguage } from "@/lib/appLanguage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/common";

type AuthMode = "login" | "forgot-password";
type AuthPage = "welcome" | "signup" | "verify-email";

export default function AuthIndexScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { user, isLoading: authLoading } = useAuth();
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation("auth");
  const [page, setPage] = useState<AuthPage>("welcome");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const isRtl = i18n.language.startsWith("he");

  useEffect(() => {
    const dismissKeyboard = () => {
      NativeTextInput.State.currentlyFocusedInput?.()?.blur();
      Keyboard.dismiss();
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      dismissKeyboard();
      if (nextState === "active" && sheetOpen) {
        requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(0));
      }
    });

    return () => subscription.remove();
  }, [sheetOpen]);

  useEffect(() => {
    Keyboard.dismiss();
    if (sheetOpen) {
      requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(0));
    }
  }, [authMode, sheetOpen]);

  function openSheet(mode: AuthMode = "login") {
    setAuthMode(mode);
    setSheetOpen(true);
    bottomSheetRef.current?.snapToIndex(0);
  }

  function closeSheet() {
    Keyboard.dismiss();
    bottomSheetRef.current?.close();
  }

  function handleContinue() {
    Keyboard.dismiss();
    setPage("signup");
  }

  function handleBack() {
    if (sheetOpen) {
      closeSheet();
      return;
    }

    setPage(page === "verify-email" ? "signup" : "welcome");
  }

  function openSignupPage() {
    Keyboard.dismiss();
    setSheetOpen(false);
    bottomSheetRef.current?.close();
    setPage("signup");
  }

  function openVerificationPage(email: string) {
    Keyboard.dismiss();
    setPendingEmail(email);
    setSheetOpen(false);
    bottomSheetRef.current?.close();
    setPage("verify-email");
  }

  function openLoginSheetFromSignup() {
    Keyboard.dismiss();
    setAuthMode("login");
    setPage("welcome");
    setSheetOpen(true);
  }

  function toggleLanguage() {
    const nextLanguage = i18n.language.startsWith("he") ? "en" : "he";
    Alert.alert(
      t("common:languageRestartTitle"),
      t("common:languageRestartDescription"),
      [
        { text: t("common:cancel"), style: "cancel" },
        {
          text: t("common:restartAndChange"),
          onPress: () => void applyAppLanguage(nextLanguage),
        },
      ],
    );
  }

  if (authLoading || user) {
    return <LoadingScreen variant="feed" />;
  }

  if (page !== "welcome") {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: isDark ? "#11110F" : "#FBFAF8",
        }}
      >
        <View
          style={{
            minHeight: 60,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
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
            accessibilityRole="button"
            accessibilityLabel={t("common:back")}
          >
            <DirectionalIcon
              direction="back"
              size={24}
              color={isDark ? "#FAF9F6" : "#171715"}
            />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="progressbar">
            <View
              style={{
                width: 34,
                height: 5,
                borderRadius: 999,
                backgroundColor: "#D6A92D",
              }}
            />
            <View
              style={{
                width: 34,
                height: 5,
                borderRadius: 999,
                backgroundColor:
                  page === "verify-email"
                    ? "#D6A92D"
                    : isDark
                      ? "rgba(250,249,246,0.16)"
                      : "rgba(23,23,21,0.12)",
              }}
            />
          </View>

          <TouchableOpacity
            onPress={toggleLanguage}
            style={{
              minWidth: 44,
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              backgroundColor: isDark
                ? "rgba(250,249,246,0.08)"
                : "rgba(23,23,21,0.06)",
              paddingHorizontal: 10,
            }}
            accessibilityRole="button"
            accessibilityLabel={i18n.language.startsWith("he") ? "Switch to English" : "החלפה לעברית"}
          >
            <Text style={{ fontSize: 17 }}>
              {i18n.language.startsWith("he") ? "🇺🇸" : "🇮🇱"}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingTop: 18,
              paddingBottom: 32,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <View style={{ width: "100%", alignSelf: "center", maxWidth: 520 }}>
              {page === "signup" ? (
                <SignupForm
                  useBottomSheetInput={false}
                  onLogin={openLoginSheetFromSignup}
                  onVerificationRequired={openVerificationPage}
                />
              ) : (
                <EmailVerificationForm
                  email={pendingEmail}
                  useBottomSheetInput={false}
                  onBack={() => setPage("signup")}
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0A" }}>
      <ImageBackground
        source={require("@/assets/images/auth-bg.png")}
        style={{ flex: 1 }}
        imageStyle={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(11, 11, 10, 0.35)",
          }}
        />

        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: "space-between",
            paddingHorizontal: 32,
            paddingVertical: 32,
          }}
        >
          <View
            style={{
              zIndex: 100,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {sheetOpen ? (
              <TouchableOpacity onPress={handleBack}>
                <DirectionalIcon direction="back" size={28} color="#FAF9F6" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}

            <TouchableOpacity
              onPress={toggleLanguage}
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 999,
                backgroundColor: "rgba(11, 11, 10, 0.42)",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ marginRight: 6, fontSize: 18 }}>
                {i18n.language.startsWith("he") ? "🇺🇸" : "🇮🇱"}
              </Text>
              <Text weight="bold" style={{ fontSize: 14, color: "#FAF9F6" }}>
                {i18n.language.startsWith("he") ? "EN" : "HE"}
              </Text>
            </TouchableOpacity>
          </View>

          {!sheetOpen && (
            <>
              <View
                key={i18n.language}
                style={{ zIndex: 30, alignItems: "flex-start" }}
              >
                <Text
                  weight="black"
                  numberOfLines={4}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  style={{
                    alignSelf: "stretch",
                    color: "#FAF9F6",
                    fontSize: 46,
                    lineHeight: 50,
                    textAlign: "auto",
                    writingDirection: isRtl ? "rtl" : "ltr",
                  }}
                >
                  {t("onboardingStep1Title")}
                </Text>

                <Text
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: 290,
                    marginTop: 20,
                    color: "rgba(250, 249, 246, 0.86)",
                    fontSize: 18,
                    lineHeight: 27,
                    textAlign: "auto",
                    writingDirection: isRtl ? "rtl" : "ltr",
                  }}
                >
                  {t("onboardingStep1Subtitle")}
                </Text>
              </View>

              <View style={{ zIndex: 30 }}>
                <TouchableOpacity
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#FAF9F6",
                    paddingVertical: 16,
                  }}
                  onPress={handleContinue}
                >
                  <Text
                    weight="bold"
                    style={{
                      color: "#171715",
                      fontSize: 16,
                      textAlign: "center",
                    }}
                  >
                    {t("getStarted")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openSheet("login")}
                  style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
                  accessibilityRole="button"
                  accessibilityLabel={t("login")}
                >
                  <Text weight="bold" style={{ color: "#FAF9F6", fontSize: 15 }}>
                    {t("login")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>

        {sheetOpen ? <BottomSheet
          ref={bottomSheetRef}
          index={0}
          enableDynamicSizing
          enablePanDownToClose
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          enableBlurKeyboardOnGesture
          android_keyboardInputMode="adjustPan"
          onClose={() => {
            setSheetOpen(false);
            setAuthMode("login");
          }}
          backgroundStyle={{
            backgroundColor: isDark ? "#111827" : "#FAF9F6",
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
          }}
          handleIndicatorStyle={{
            backgroundColor: isDark ? "#6B7280" : "#D1D5DB",
            width: 48,
          }}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 48,
            }}
          >
            {authMode === "login" && (
              <LoginForm
                onSignup={openSignupPage}
                onRestaurantSignup={openSignupPage}
                onForgotPassword={() => setAuthMode("forgot-password")}
                onVerificationRequired={openVerificationPage}
              />
            )}

            {authMode === "forgot-password" && (
              <ForgotPasswordForm onBack={() => setAuthMode("login")} />
            )}
          </BottomSheetScrollView>
        </BottomSheet> : null}
      </ImageBackground>
    </View>
  );
}
