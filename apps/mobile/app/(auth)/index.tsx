import { AppAlert as Alert } from "@/lib/appAlert";
import LoginForm from "@/components/auth/LoginForm";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import SignupOnboardingFlow from "@/components/auth/SignupOnboardingFlow";
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
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  applyAppLanguage,
  isRtlLanguage,
  type AppLanguage,
} from "@/lib/appLanguage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/common";
import { CheckIcon, TranslateIcon, XIcon } from "phosphor-react-native";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

type AuthMode = "actions" | "login" | "forgot-password";
type AuthPage = "welcome" | "signup" | "verify-email";

export default function AuthIndexScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { user, isLoading: authLoading } = useAuth();
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation("auth");
  const [page, setPage] = useState<AuthPage>("welcome");
  const [authMode, setAuthMode] = useState<AuthMode>("actions");
  const [pendingEmail, setPendingEmail] = useState("");
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const isRtl = i18n.language.startsWith("he");

  useEffect(() => {
    const dismissKeyboard = () => {
      NativeTextInput.State.currentlyFocusedInput?.()?.blur();
      Keyboard.dismiss();
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      dismissKeyboard();
      if (nextState === "active" && page === "welcome") {
        requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(0));
      }
    });

    return () => subscription.remove();
  }, [page]);

  useEffect(() => {
    Keyboard.dismiss();
    if (page === "welcome") {
      requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(0));
    }
  }, [authMode, page]);

  function openSheet(mode: Exclude<AuthMode, "actions"> = "login") {
    setAuthMode(mode);
    bottomSheetRef.current?.snapToIndex(0);
  }

  function showWelcomeActions() {
    Keyboard.dismiss();
    setAuthMode("actions");
    requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(0));
  }

  function handleContinue() {
    Keyboard.dismiss();
    setPage("signup");
  }

  function handleBack() {
    setPage(page === "verify-email" ? "signup" : "welcome");
  }

  function openSignupPage() {
    Keyboard.dismiss();
    setAuthMode("actions");
    setPage("signup");
  }

  function openVerificationPage(email: string) {
    Keyboard.dismiss();
    setPendingEmail(email);
    setAuthMode("actions");
    setPage("verify-email");
  }

  function openLoginSheetFromSignup() {
    Keyboard.dismiss();
    setAuthMode("login");
    setPage("welcome");
  }

  function requestLanguageChange(nextLanguage: AppLanguage) {
    if (i18n.language.startsWith(nextLanguage)) return;
    const currentLanguage = currentAppLanguage(i18n.language);
    if (isRtlLanguage(currentLanguage) === isRtlLanguage(nextLanguage)) {
      void applyAppLanguage(nextLanguage);
      return;
    }
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

  function openLanguageSelector() {
    Keyboard.dismiss();
    setLanguageSelectorOpen(true);
  }

  if (authLoading || user) {
    return <LoadingScreen variant="feed" />;
  }

  if (page === "signup") {
    return (
      <SignupOnboardingFlow
        onExit={() => setPage("welcome")}
        onLogin={openLoginSheetFromSignup}
      />
    );
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
            onPress={openLanguageSelector}
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
            accessibilityLabel={t("common:chooseLanguage")}
          >
            <Text style={{ fontSize: 17 }}>
              {currentAppLanguage(i18n.language) === "he"
                ? "🇮🇱"
                : currentAppLanguage(i18n.language) === "ru"
                  ? "🇷🇺"
                  : "🇺🇸"}
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
              <EmailVerificationForm
                email={pendingEmail}
                useBottomSheetInput={false}
                onBack={() => setPage("welcome")}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <LanguageSelectorModal
          visible={languageSelectorOpen}
          currentLanguage={currentAppLanguage(i18n.language)}
          onClose={() => setLanguageSelectorOpen(false)}
          onSelect={requestLanguageChange}
        />
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
            {authMode !== "actions" ? (
              <TouchableOpacity onPress={showWelcomeActions}>
                <DirectionalIcon direction="back" size={28} color="#FAF9F6" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}

            <TouchableOpacity
              onPress={openLanguageSelector}
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
                {currentAppLanguage(i18n.language) === "he"
                  ? "🇮🇱"
                  : currentAppLanguage(i18n.language) === "ru"
                    ? "🇷🇺"
                    : "🇺🇸"}
              </Text>
              <Text weight="bold" style={{ fontSize: 14, color: "#FAF9F6" }}>
                {currentAppLanguage(i18n.language).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {authMode === "actions" ? (
              <View
                key={i18n.language}
                style={{
                  zIndex: 30,
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "flex-start",
                  paddingBottom: 150,
                }}
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
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </SafeAreaView>

        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          enableDynamicSizing
          enablePanDownToClose={false}
          enableHandlePanningGesture={false}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          enableBlurKeyboardOnGesture
          android_keyboardInputMode="adjustPan"
          backgroundStyle={{
            backgroundColor: isDark ? "#181817" : "#FAF9F6",
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
              paddingTop: 8,
              paddingBottom: 48,
            }}
          >
            {authMode === "actions" && (
              <View>
                <SocialAuthButtons showDivider={false} />
                <TouchableOpacity
                  style={{
                    minHeight: 56,
                    marginTop: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    backgroundColor: isDark ? "#FAF9F6" : "#171715",
                    paddingHorizontal: 20,
                  }}
                  onPress={handleContinue}
                  accessibilityRole="button"
                  accessibilityLabel={t("getStarted")}
                >
                  <Text
                    weight="bold"
                    style={{ color: isDark ? "#171715" : "#FAF9F6", fontSize: 16 }}
                  >
                    {t("getStarted")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openSheet("login")}
                  style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
                  accessibilityRole="button"
                  accessibilityLabel={t("login")}
                >
                  <Text
                    weight="bold"
                    style={{ color: isDark ? "#FAF9F6" : "#171715", fontSize: 15 }}
                  >
                    {t("login")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
        </BottomSheet>
        <LanguageSelectorModal
          visible={languageSelectorOpen}
          currentLanguage={currentAppLanguage(i18n.language)}
          onClose={() => setLanguageSelectorOpen(false)}
          onSelect={requestLanguageChange}
        />
      </ImageBackground>
    </View>
  );
}

function LanguageSelectorModal({
  visible,
  currentLanguage,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentLanguage: AppLanguage;
  onClose: () => void;
  onSelect: (language: AppLanguage) => void;
}) {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const colors = {
    surface: isDark ? "#1B1A18" : "#FAF8F3",
    card: isDark ? "#272622" : "#F0ECE4",
    border: isDark ? "rgba(250,249,246,0.11)" : "rgba(36,34,31,0.09)",
    text: isDark ? "#F5F2EC" : "#24221F",
    muted: isDark ? "#AAA69F" : "#706C66",
  };
  const languages = [
    { id: "en" as const, flag: "🇺🇸", title: t("english"), nativeName: "EN" },
    { id: "he" as const, flag: "🇮🇱", title: t("hebrew"), nativeName: "HE" },
    { id: "ru" as const, flag: "🇷🇺", title: t("russian"), nativeName: "RU" },
  ];

  function select(language: AppLanguage) {
    onClose();
    if (language === currentLanguage) return;
    setTimeout(() => onSelect(language), 220);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(20,18,15,0.58)",
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            backgroundColor: colors.surface,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 34 : 24,
          }}
        >
          <View
            style={{
              width: 42,
              height: 5,
              alignSelf: "center",
              borderRadius: 999,
              backgroundColor: colors.border,
            }}
          />
          <View
            style={{
              marginTop: 15,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 15,
                backgroundColor: isDark ? "#332C1B" : "#F5E8C8",
              }}
            >
              <TranslateIcon size={23} color="#C38C00" weight="duotone" />
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <XIcon size={23} color={colors.text} weight="bold" />
            </TouchableOpacity>
          </View>
          <Text weight="black" style={{ marginTop: 16, color: colors.text, fontSize: 27 }}>
            {t("chooseLanguage")}
          </Text>
          <Text style={{ marginTop: 6, color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            {t("chooseLanguageDescription")}
          </Text>

          <View style={{ marginTop: 22, gap: 10 }}>
            {languages.map((language) => {
              const selected = language.id === currentLanguage;
              return (
                <TouchableOpacity
                  key={language.id}
                  onPress={() => select(language.id)}
                  activeOpacity={0.76}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={{
                    minHeight: 72,
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: selected ? "#D6A92D" : colors.border,
                    backgroundColor: selected
                      ? isDark
                        ? "rgba(214,169,45,0.13)"
                        : "rgba(247,215,134,0.28)"
                      : colors.card,
                    paddingHorizontal: 15,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 14,
                      backgroundColor: isDark ? "#35332E" : "#FAF8F3",
                    }}
                  >
                    <Text style={{ fontSize: 25 }}>{language.flag}</Text>
                  </View>
                  <View style={{ minWidth: 0, flex: 1, marginHorizontal: 13 }}>
                    <Text weight="bold" style={{ color: colors.text, fontSize: 17 }}>
                      {language.title}
                    </Text>
                    <Text style={{ marginTop: 2, color: colors.muted, fontSize: 13 }}>
                      {language.nativeName}
                    </Text>
                  </View>
                  {selected ? (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 14,
                        backgroundColor: "#D6A92D",
                      }}
                    >
                      <CheckIcon size={17} color="#24221F" weight="bold" />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function currentAppLanguage(language: string): AppLanguage {
  if (language.toLowerCase().startsWith("he")) return "he";
  if (language.toLowerCase().startsWith("ru")) return "ru";
  return "en";
}
