import { AppAlert as Alert } from "@/lib/appAlert";
import LoginForm from "@/components/auth/LoginForm";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import SignupOnboardingFlow from "@/components/auth/SignupOnboardingFlow";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppState,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from "react-native-reanimated";

type AuthMode = "slides" | "actions" | "login" | "forgot-password";
type AuthPage = "welcome" | "signup" | "verify-email";

export default function AuthIndexScreen() {
  const slidesRef = useRef<ScrollView>(null);
  const programmaticSlideTargetRef = useRef<number | null>(null);
  const { width } = useWindowDimensions();
  const { user, isLoading: authLoading } = useAuth();
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation("auth");
  const [page, setPage] = useState<AuthPage>("welcome");
  const [authMode, setAuthMode] = useState<AuthMode>("slides");
  const [slideIndex, setSlideIndex] = useState(0);
  const [pendingEmail, setPendingEmail] = useState("");
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const isRtl = i18n.language.startsWith("he");
  const slides = [
    {
      title: t("onboardingStep1Title"),
      subtitle: t("onboardingStep1Subtitle"),
    },
    {
      title: t("onboardingStep2Title"),
      subtitle: t("onboardingStep2Subtitle"),
    },
    {
      title: t("onboardingStep3Title"),
      subtitle: t("onboardingStep3Subtitle"),
    },
  ];

  useEffect(() => {
    const dismissKeyboard = () => {
      NativeTextInput.State.currentlyFocusedInput?.()?.blur();
      Keyboard.dismiss();
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") dismissKeyboard();
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Keyboard.dismiss();
  }, [authMode, page]);

  function openAuth(mode: "login" | "forgot-password" = "login") {
    setAuthMode(mode);
  }

  function scrollToSlide(nextIndex: number, animated = true) {
    const boundedIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    programmaticSlideTargetRef.current = animated ? boundedIndex : null;
    setSlideIndex(boundedIndex);
    slidesRef.current?.scrollTo({ x: boundedIndex * width, animated });
  }

  function advanceSlides() {
    if (slideIndex < slides.length - 1) {
      scrollToSlide(slideIndex + 1);
      return;
    }
    setAuthMode("actions");
  }

  function handleSlidesScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const programmaticTarget = programmaticSlideTargetRef.current;
    if (programmaticTarget !== null) {
      const targetOffset = programmaticTarget * width;
      if (Math.abs(event.nativeEvent.contentOffset.x - targetOffset) < 1) {
        programmaticSlideTargetRef.current = null;
      }
      return;
    }

    const nextIndex = Math.max(
      0,
      Math.min(
        slides.length - 1,
        Math.round(event.nativeEvent.contentOffset.x / width),
      ),
    );
    if (nextIndex !== slideIndex) setSlideIndex(nextIndex);
  }

  function handleSlidesMomentumEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    programmaticSlideTargetRef.current = null;
    const nextIndex = Math.max(
      0,
      Math.min(
        slides.length - 1,
        Math.round(event.nativeEvent.contentOffset.x / width),
      ),
    );
    setSlideIndex(nextIndex);
  }

  function handleWelcomeBack() {
    Keyboard.dismiss();
    if (authMode === "forgot-password") {
      setAuthMode("login");
      return;
    }
    if (authMode === "login") {
      setAuthMode("actions");
      return;
    }
    if (authMode === "actions") {
      const lastSlide = slides.length - 1;
      scrollToSlide(lastSlide, false);
      setAuthMode("slides");
      return;
    }
    if (slideIndex > 0) scrollToSlide(slideIndex - 1);
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

  function openLoginOverlayFromSignup() {
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
        onLogin={openLoginOverlayFromSignup}
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
            backgroundColor: "rgba(11, 11, 10, 0.34)",
          }}
        />

        <SafeAreaView
          pointerEvents={authMode === "slides" ? "auto" : "none"}
          style={{ flex: 1, opacity: authMode === "slides" ? 1 : 0 }}
        >
            <View
              style={{
                zIndex: 20,
                minHeight: 58,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 24,
                paddingTop: 8,
              }}
            >
              {slideIndex > 0 ? (
                <TouchableOpacity
                  onPress={handleWelcomeBack}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 22,
                    backgroundColor: "rgba(11, 11, 10, 0.38)",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("common:back")}
                >
                  <DirectionalIcon direction="back" size={25} color="#F8F5EF" />
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <View
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 6,
                      backgroundColor: "#E4B83B",
                    }}
                  />
                  <Text weight="black" style={{ color: "#F8F5EF", fontSize: 22 }}>
                    FindEat
                  </Text>
                </View>
              )}

              <LanguageButton
                language={currentAppLanguage(i18n.language)}
                onPress={openLanguageSelector}
              />
            </View>

            <ScrollView
              ref={slidesRef}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleSlidesScroll}
              onMomentumScrollEnd={handleSlidesMomentumEnd}
              scrollEventThrottle={16}
              style={{ flex: 1, direction: "ltr" }}
              keyboardShouldPersistTaps="handled"
            >
              {slides.map((slide, index) => (
                <View
                  key={index}
                  style={{
                    width,
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "flex-start",
                    paddingHorizontal: 28,
                  }}
                >
                  <Text
                    weight="black"
                    numberOfLines={4}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={{
                      color: "#F8F5EF",
                      fontSize: 48,
                      lineHeight: 51,
                      textAlign: "left",
                      writingDirection: isRtl ? "rtl" : "ltr",
                      textShadowColor: "rgba(0,0,0,0.52)",
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 12,
                    }}
                  >
                    {slide.title}
                  </Text>
                  <Text
                    style={{
                      maxWidth: 320,
                      alignSelf: "flex-start",
                      marginTop: 14,
                      color: "rgba(248,245,239,0.88)",
                      fontSize: 17,
                      lineHeight: 25,
                      textAlign: "left",
                      writingDirection: isRtl ? "rtl" : "ltr",
                      textShadowColor: "rgba(0,0,0,0.46)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 8,
                    }}
                  >
                    {slide.subtitle}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingBottom: 18, paddingTop: 8 }}>
              <View
                style={{
                  marginBottom: 20,
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {slides.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => scrollToSlide(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${index + 1} / ${slides.length}`}
                    style={{
                      width: index === slideIndex ? 30 : 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor:
                        index === slideIndex ? "#E4B83B" : "rgba(248,245,239,0.42)",
                    }}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={advanceSlides}
                activeOpacity={0.8}
                style={{
                  minHeight: 56,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 19,
                  backgroundColor: "#F8F5EF",
                  paddingHorizontal: 20,
                }}
                accessibilityRole="button"
              >
                <Text weight="bold" style={{ color: "#24221F", fontSize: 16 }}>
                  {slideIndex === slides.length - 1 ? t("getStarted") : t("continue")}
                </Text>
              </TouchableOpacity>
            </View>
        </SafeAreaView>

        {authMode !== "slides" ? (
          <Animated.View
            entering={FadeIn.duration(240)}
            exiting={FadeOut.duration(190)}
            style={{ position: "absolute", inset: 0 }}
          >
            <BlurView
              pointerEvents="none"
              intensity={Platform.OS === "ios" ? 74 : 55}
              tint="systemMaterialDark"
              blurMethod="dimezisBlurViewSdk31Plus"
              style={{ position: "absolute", inset: 0 }}
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(12,11,10,0.28)",
              }}
            />
            <Animated.View
              entering={FadeInDown.duration(320)}
              exiting={FadeOutDown.duration(180)}
              style={{ flex: 1 }}
            >
            <SafeAreaView style={{ flex: 1 }}>
              <View
                style={{
                  minHeight: 58,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingTop: 8,
                }}
              >
                <TouchableOpacity
                  onPress={handleWelcomeBack}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: "rgba(248,245,239,0.16)",
                    backgroundColor: "rgba(20,19,17,0.32)",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("common:back")}
                >
                  <DirectionalIcon
                    direction="back"
                    size={24}
                    color="#F8F5EF"
                  />
                </TouchableOpacity>

                <LanguageButton
                  language={currentAppLanguage(i18n.language)}
                  onPress={openLanguageSelector}
                />
              </View>

              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "flex-start",
                    paddingHorizontal: 20,
                    paddingTop: 48,
                    paddingBottom: 24,
                  }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                  automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                >
                  <View
                    style={{
                      width: "100%",
                      maxWidth: 460,
                      alignSelf: "center",
                      paddingHorizontal: 4,
                    }}
                  >
                    {authMode === "actions" ? (
                      <View>
                        <Text
                          weight="black"
                          style={{
                            maxWidth: 340,
                            color: "#F8F5EF",
                            fontSize: 39,
                            lineHeight: 43,
                            textAlign: isRtl ? "right" : "left",
                            textShadowColor: "rgba(0,0,0,0.30)",
                            textShadowOffset: { width: 0, height: 2 },
                            textShadowRadius: 8,
                          }}
                        >
                          {t("authChoiceTitle")}
                        </Text>
                        <Text
                          style={{
                            marginTop: 9,
                            color: "rgba(248,245,239,0.72)",
                            fontSize: 15,
                            lineHeight: 21,
                            textAlign: isRtl ? "right" : "left",
                          }}
                        >
                          {t("chooseHowToContinue")}
                        </Text>

                        <TouchableOpacity
                          onPress={openSignupPage}
                          activeOpacity={0.8}
                          style={{
                            minHeight: 56,
                            marginTop: 32,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 999,
                            borderWidth: 1.5,
                            borderColor: "rgba(248,245,239,0.24)",
                            backgroundColor: "rgba(248,245,239,0.10)",
                            paddingHorizontal: 18,
                          }}
                          accessibilityRole="button"
                        >
                          <Text weight="bold" style={{ color: "#F8F5EF", fontSize: 16 }}>
                            {t("createAccount")}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => openAuth("login")}
                          activeOpacity={0.76}
                          style={{
                            minHeight: 54,
                            marginTop: 10,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 999,
                            borderWidth: 1.5,
                            borderColor: "rgba(248,245,239,0.24)",
                            backgroundColor: "rgba(248,245,239,0.10)",
                            paddingHorizontal: 18,
                          }}
                          accessibilityRole="button"
                        >
                          <Text
                            weight="bold"
                            style={{ color: "#F8F5EF", fontSize: 16 }}
                          >
                            {t("login")}
                          </Text>
                        </TouchableOpacity>

                        <View
                          style={{
                            marginVertical: 17,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <View
                            style={{
                              height: 1,
                              flex: 1,
                              backgroundColor: "rgba(248,245,239,0.24)",
                            }}
                          />
                          <Text
                            style={{ color: "rgba(248,245,239,0.68)", fontSize: 13 }}
                          >
                            {t("orContinueWith")}
                          </Text>
                          <View
                            style={{
                              height: 1,
                              flex: 1,
                              backgroundColor: "rgba(248,245,239,0.24)",
                            }}
                          />
                        </View>
                        <SocialAuthButtons showDivider={false} appearance="glass" />
                        <Text
                          style={{
                            marginTop: 26,
                            color: "rgba(248,245,239,0.58)",
                            fontSize: 12,
                            lineHeight: 18,
                            textAlign: isRtl ? "right" : "left",
                          }}
                        >
                          {t("authTermsNotice")}
                        </Text>
                      </View>
                    ) : null}

                    {authMode === "login" ? (
                      <View>
                        <Text
                          weight="black"
                          style={{
                            marginBottom: 4,
                            color: "#F8F5EF",
                            fontSize: 37,
                            textAlign: isRtl ? "right" : "left",
                          }}
                        >
                          {t("welcomeBack")}
                        </Text>
                        <Text
                          style={{
                            marginBottom: 18,
                            color: "rgba(248,245,239,0.72)",
                            fontSize: 15,
                            textAlign: isRtl ? "right" : "left",
                          }}
                        >
                          {t("loginSubtitle")}
                        </Text>
                        <LoginForm
                          onSignup={openSignupPage}
                          onRestaurantSignup={openSignupPage}
                          onForgotPassword={() => setAuthMode("forgot-password")}
                          onVerificationRequired={openVerificationPage}
                          useBottomSheetInput={false}
                          showSocialAuth={false}
                          appearance="glass"
                        />
                      </View>
                    ) : null}

                    {authMode === "forgot-password" ? (
                      <ForgotPasswordForm
                        useBottomSheetInput={false}
                        onBack={() => setAuthMode("login")}
                      />
                    ) : null}
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
            </Animated.View>
          </Animated.View>
        ) : null}

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

function LanguageButton({
  language,
  onPress,
  dark = true,
}: {
  language: AppLanguage;
  onPress: () => void;
  dark?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        minHeight: 42,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: dark ? "rgba(248,245,239,0.18)" : "rgba(36,34,31,0.11)",
        backgroundColor: dark ? "rgba(11,11,10,0.42)" : "rgba(255,252,247,0.58)",
        paddingHorizontal: 12,
      }}
      accessibilityRole="button"
    >
      <Text style={{ marginRight: 7, fontSize: 17 }}>
        {language === "he" ? "🇮🇱" : language === "ru" ? "🇷🇺" : "🇺🇸"}
      </Text>
      <Text weight="bold" style={{ color: dark ? "#F8F5EF" : "#24221F", fontSize: 13 }}>
        {language.toUpperCase()}
      </Text>
    </TouchableOpacity>
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
