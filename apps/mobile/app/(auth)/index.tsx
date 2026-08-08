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
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
  runOnJS,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { applyAppLanguage } from "@/lib/appLanguage";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/common";

type AuthMode = "login" | "signup" | "restaurant-signup" | "verify-email" | "forgot-password";

export default function AuthIndexScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { user, isLoading: authLoading } = useAuth();
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation("auth");
  const [step, setStep] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
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

  const steps = [
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

  const current = steps[step];
  const visualTransitionDirection = isRtl
    ? -transitionDirection
    : transitionDirection;

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
    if (step < steps.length - 1) {
      setTransitionDirection(1);
      setStep((prev) => prev + 1);
      return;
    }

    openSheet("login");
  }

  function handleBack() {
    if (sheetOpen) {
      closeSheet();
      return;
    }

    if (step > 0) {
      setTransitionDirection(-1);
      setStep((prev) => prev - 1);
    }
  }

  function handleSwipe(translationX: number) {
    const isForwardSwipe = isRtl ? translationX > 60 : translationX < -60;
    const isBackSwipe = isRtl ? translationX < -60 : translationX > 60;

    if (isForwardSwipe && step < steps.length - 1) {
      setTransitionDirection(1);
      setStep((currentStep) => currentStep + 1);
    } else if (isBackSwipe && step > 0) {
      setTransitionDirection(-1);
      setStep((currentStep) => currentStep - 1);
    }
  }

  const swipeGesture = Gesture.Pan()
    .enabled(!sheetOpen)
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd((event) => {
      runOnJS(handleSwipe)(event.translationX);
    });

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

  function IndicatorDot({ active }: { active: boolean }) {
    return (
      <Animated.View
        layout={LinearTransition.springify().damping(28).stiffness(260)}
        className={`h-2 rounded-full ${
          active ? "w-8 bg-white" : "w-2 bg-white/40"
        }`}
      />
    );
  }

  if (authLoading || user) {
    return <LoadingScreen variant="feed" />;
  }

  return (
    <View className="flex-1 bg-black">
      <ImageBackground
        source={require("@/assets/images/auth-bg.png")}
        style={{ flex: 1 }}
        imageStyle={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-black/35" />

        <GestureDetector gesture={swipeGesture}>
          <SafeAreaView
            style={{
              flex: 1,
              justifyContent: "space-between",
              paddingHorizontal: 32,
              paddingVertical: 32,
            }}
          >
          <View
            style={{ zIndex: 100 }}
            className="flex-row items-center justify-between"
          >
            {step > 0 || sheetOpen ? (
              <TouchableOpacity onPress={handleBack}>
                <DirectionalIcon direction="back" size={28} color="#FAF9F6" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}

            <TouchableOpacity
              onPress={toggleLanguage}
              className="flex-row items-center rounded-full bg-black/35 px-3 py-2"
            >
              <Text className="mr-1.5 text-lg">
                {i18n.language.startsWith("he") ? "🇺🇸" : "🇮🇱"}
              </Text>
              <Text weight="bold" className="text-sm text-white">
                {i18n.language.startsWith("he") ? "EN" : "HE"}
              </Text>
            </TouchableOpacity>
          </View>

          {!sheetOpen && (
            <>
              <View
                pointerEvents="box-none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 88,
                  bottom: 128,
                  zIndex: 20,
                  flexDirection: "row",
                }}
              >
                <TouchableOpacity
                  accessible={false}
                  activeOpacity={1}
                  style={{ flex: 1 }}
                  disabled={step === 0}
                  onPress={() => {
                    setTransitionDirection(-1);
                    setStep((currentStep) => Math.max(0, currentStep - 1));
                  }}
                />
                <TouchableOpacity
                  accessible={false}
                  activeOpacity={1}
                  style={{ flex: 1 }}
                  disabled={step === steps.length - 1}
                  onPress={() => {
                    setTransitionDirection(1);
                    setStep((currentStep) =>
                      Math.min(steps.length - 1, currentStep + 1),
                    );
                  }}
                />
              </View>

              <Animated.View
                key={current.title}
                entering={(visualTransitionDirection === 1 ? FadeInRight : FadeInLeft).duration(350)}
                exiting={(visualTransitionDirection === 1 ? FadeOutLeft : FadeOutRight).duration(200)}
                style={{ alignItems: "flex-start" }}
              >
                <Text
                  weight="black"
                  className="text-6xl leading-15.5 text-white"
                  style={{
                    alignSelf: "stretch",
                    textAlign: "auto",
                    writingDirection: isRtl ? "rtl" : "ltr",
                  }}
                >
                  {current.title}
                </Text>

                <Text
                  className="mt-5 max-w-72.5 text-lg leading-7 text-white/85"
                  style={{
                    alignSelf: "flex-start",
                    textAlign: "auto",
                    writingDirection: isRtl ? "rtl" : "ltr",
                  }}
                >
                  {current.subtitle}
                </Text>
              </Animated.View>

              <View>
                <View className="mb-6 flex-row justify-center gap-2">
                  {steps.map((_, index) => (
                    <IndicatorDot key={index} active={index === step} />
                  ))}
                </View>

                <TouchableOpacity
                  className="rounded-full bg-white py-4"
                  onPress={handleContinue}
                >
                  <Text
                    weight="bold"
                    className="text-center text-base text-black"
                  >
                    {step === steps.length - 1
                      ? t("getStarted")
                      : t("continue")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          </SafeAreaView>
        </GestureDetector>

        {sheetOpen ? <BottomSheet
          ref={bottomSheetRef}
          index={-1}
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
                onSignup={() => setAuthMode("signup")}
                onRestaurantSignup={() => setAuthMode("restaurant-signup")}
                onForgotPassword={() => setAuthMode("forgot-password")}
                onVerificationRequired={(email) => {
                  setPendingEmail(email);
                  setAuthMode("verify-email");
                }}
              />
            )}

            {authMode === "signup" && (
              <SignupForm
                onLogin={() => setAuthMode("login")}
                onVerificationRequired={(email) => {
                  setPendingEmail(email);
                  setAuthMode("verify-email");
                }}
              />
            )}

            {authMode === "verify-email" && (
              <EmailVerificationForm
                email={pendingEmail}
                onBack={() => setAuthMode("login")}
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
