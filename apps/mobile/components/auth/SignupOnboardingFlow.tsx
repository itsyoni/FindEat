import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import { TextInput } from "@/components/common";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { signupSchema } from "@/lib/validation/auth";
import { getErrorMessage } from "@findeat/utils";
import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  LockIcon,
  UserIcon,
  XCircleIcon,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ZodError } from "zod";

type SignupStep = "username" | "email" | "password" | "verification";

const STEPS: SignupStep[] = ["username", "email", "password", "verification"];

export default function SignupOnboardingFlow({
  onExit,
  onLogin,
}: {
  onExit: () => void;
  onLogin: () => void;
}) {
  const { t } = useTranslation(["auth", "common"]);
  const { isDark } = useAppTheme();
  const { signup, verifyEmail } = useAuth();
  const [step, setStep] = useState<SignupStep>("username");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const index = STEPS.indexOf(step);
  const colors = {
    background: isDark ? "#11110F" : "#FBFAF8",
    surface: isDark ? "#1D1D1A" : "#F1EEE8",
    border: isDark ? "#383833" : "#DDD7CD",
    text: isDark ? "#FAF9F6" : "#171715",
    muted: isDark ? "#A8A8A3" : "#6B6B67",
  };
  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = password.length >= 8 && password === confirmPassword;

  useEffect(() => {
    if (step !== "username" && step !== "email") return;
    const value = step === "username" ? username.trim() : email.trim();
    const valid = step === "username" ? usernameValid : emailValid;
    if (!value || !valid) return;

    let active = true;
    const timeout = setTimeout(async () => {
      setChecking(true);
      try {
        const result = await api.auth.checkAvailability(
          step === "username" ? { username: value } : { email: value },
        );
        if (active) {
          setAvailable(
            step === "username" ? result.usernameAvailable : result.emailAvailable,
          );
        }
      } catch {
        if (active) setAvailable(null);
      } finally {
        if (active) setChecking(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [email, emailValid, step, username, usernameValid]);

  function goBack() {
    setError("");
    setAvailable(null);
    if (step === "username") onExit();
    else if (step === "email") setStep("username");
    else if (step === "password") setStep("email");
    else setStep("password");
  }

  function continueFromIdentity() {
    if (checking || available === false) return;
    setError("");
    setAvailable(null);
    setStep(step === "username" ? "email" : "password");
  }

  async function createAccount() {
    if (!passwordValid || working) return;
    try {
      const data = signupSchema.parse({ username, email, password, confirmPassword });
      setWorking(true);
      setError("");
      const result = await signup(data.email, data.username, data.password);
      setEmail(result.email);
      setStep("verification");
    } catch (nextError) {
      if (nextError instanceof ZodError) {
        setError(nextError.issues[0]?.message ?? t("auth:invalidDetails"));
      } else {
        setError(getErrorMessage(nextError, t("auth:couldNotCreateAccount")));
      }
    } finally {
      setWorking(false);
    }
  }

  async function submitVerification() {
    if (code.length !== 6 || working) return;
    try {
      setWorking(true);
      setError("");
      await verifyEmail(email, code);
    } catch (nextError) {
      setError(getErrorMessage(nextError, t("auth:invalidCode")));
    } finally {
      setWorking(false);
    }
  }

  async function resendCode() {
    try {
      await api.auth.resendVerification(email);
      Alert.alert(t("auth:codeSent"), t("auth:checkInbox"));
    } catch (nextError) {
      setError(getErrorMessage(nextError, t("auth:resendFailed")));
    }
  }

  const canContinue =
    step === "username"
      ? usernameValid && available === true && !checking
      : step === "email"
        ? emailValid && available !== false && !checking
        : step === "password"
          ? passwordValid
          : code.length === 6;

  const title =
    step === "username"
      ? t("auth:signupUsernameTitle")
      : step === "email"
        ? t("auth:signupEmailTitle")
        : step === "password"
          ? t("auth:signupPasswordTitle")
          : t("auth:verifyEmail");
  const subtitle =
    step === "username"
      ? t("auth:signupUsernameSubtitle")
      : step === "email"
        ? t("auth:signupEmailSubtitle")
        : step === "password"
          ? t("auth:signupPasswordSubtitle")
          : t("auth:verificationSent", { email });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          minHeight: 60,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={goBack}
          disabled={working}
          accessibilityRole="button"
          accessibilityLabel={t("common:back")}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            backgroundColor: isDark ? "rgba(250,249,246,0.08)" : "rgba(23,23,21,0.06)",
          }}
        >
          <DirectionalIcon direction="back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ marginHorizontal: 18, flex: 1, flexDirection: "row", gap: 6 }}>
          {STEPS.map((item, itemIndex) => (
            <View
              key={item}
              style={{
                height: 5,
                flex: 1,
                borderRadius: 999,
                backgroundColor:
                  itemIndex <= index
                    ? "#D6A92D"
                    : isDark
                      ? "rgba(250,249,246,0.16)"
                      : "rgba(23,23,21,0.12)",
              }}
            />
          ))}
        </View>
        <Text style={{ width: 44, color: colors.muted, fontSize: 12, textAlign: "center" }}>
          {index + 1}/4
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <View style={{ width: "100%", maxWidth: 520, alignSelf: "center" }}>
            <Text weight="black" style={{ color: colors.text, fontSize: 32, lineHeight: 38 }}>
              {title}
            </Text>
            <Text style={{ marginTop: 9, color: colors.muted, fontSize: 16, lineHeight: 23 }}>
              {subtitle}
            </Text>

            <View style={{ marginTop: 32 }}>
              {step === "username" ? (
                <TextInput
                  value={username}
                  onChangeText={(value) => {
                    setChecking(false);
                    setAvailable(null);
                    setUsername(value.replace(/[^a-zA-Z0-9_]/g, ""));
                  }}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  placeholder={t("auth:usernamePlaceholder")}
                  leftIcon={<UserIcon size={21} color={colors.muted} />}
                  rightIcon={
                    username.length === 0 ? undefined : !usernameValid || available === false ? (
                      <XCircleIcon size={22} color="#DC5A5A" weight="fill" />
                    ) : available === true ? (
                      <CheckCircleIcon size={22} color="#2E9B62" weight="fill" />
                    ) : (
                      <ActivityIndicator size="small" color="#D6A92D" />
                    )
                  }
                  style={{ fontSize: 18 }}
                  className="border-[#DDD7CD] bg-[#F1EEE8] dark:border-[#383833] dark:bg-[#1D1D1A]"
                />
              ) : null}
              {step === "email" ? (
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setChecking(false);
                    setAvailable(null);
                    setEmail(value);
                  }}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder={t("auth:emailPlaceholder")}
                  leftIcon={<EnvelopeSimpleIcon size={21} color={colors.muted} />}
                  style={{ fontSize: 18 }}
                  className="border-[#DDD7CD] bg-[#F1EEE8] dark:border-[#383833] dark:bg-[#1D1D1A]"
                />
              ) : null}
              {step === "password" ? (
                <View style={{ gap: 14 }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    autoFocus
                    isPassword
                    placeholder={t("auth:passwordPlaceholder")}
                    leftIcon={<LockIcon size={21} color={colors.muted} />}
                    className="border-[#DDD7CD] bg-[#F1EEE8] dark:border-[#383833] dark:bg-[#1D1D1A]"
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    isPassword
                    placeholder={t("auth:confirmPasswordPlaceholder")}
                    leftIcon={<LockIcon size={21} color={colors.muted} />}
                    className="border-[#DDD7CD] bg-[#F1EEE8] dark:border-[#383833] dark:bg-[#1D1D1A]"
                  />
                </View>
              ) : null}
              {step === "verification" ? (
                <TextInput
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  style={{ fontSize: 24, letterSpacing: 8, textAlign: "center" }}
                  className="border-[#DDD7CD] bg-[#F1EEE8] dark:border-[#383833] dark:bg-[#1D1D1A]"
                />
              ) : null}
            </View>

            {checking ? (
              <View style={{ minHeight: 30, flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <ActivityIndicator size="small" color="#D6A92D" />
              </View>
            ) : available === false ? (
              <Text style={{ minHeight: 30, marginTop: 8, color: "#DC5A5A", fontSize: 14 }}>
                {step === "username" ? t("auth:usernameTaken") : t("auth:emailRegistered")}
              </Text>
            ) : (
              <View style={{ minHeight: 30 }} />
            )}

            {step === "password" && confirmPassword.length > 0 && password !== confirmPassword ? (
              <Text style={{ marginBottom: 8, color: "#DC5A5A", fontSize: 14 }}>
                {t("auth:passwordsDoNotMatch")}
              </Text>
            ) : null}
            {error ? (
              <Text style={{ marginBottom: 8, color: "#DC5A5A", fontSize: 14, lineHeight: 20 }}>
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              disabled={!canContinue || working}
              onPress={() => {
                if (step === "username" || step === "email") continueFromIdentity();
                else if (step === "password") void createAccount();
                else void submitVerification();
              }}
              style={{
                minHeight: 56,
                marginTop: 8,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                backgroundColor:
                  !canContinue || working
                    ? isDark
                      ? "rgba(250,249,246,0.1)"
                      : "rgba(23,23,21,0.1)"
                    : isDark
                      ? "#FAF9F6"
                      : "#171715",
              }}
            >
              {working ? (
                <ActivityIndicator color="#D6A92D" />
              ) : (
                <Text
                  weight="bold"
                  style={{
                    color: !canContinue ? colors.muted : isDark ? "#171715" : "#FAF9F6",
                    fontSize: 16,
                  }}
                >
                  {step === "password"
                    ? t("auth:createAccount")
                    : step === "verification"
                      ? t("auth:verify")
                      : t("auth:continue")}
                </Text>
              )}
            </TouchableOpacity>

            {step === "username" ? (
              <TouchableOpacity
                onPress={onLogin}
                style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: colors.muted }}>
                  {t("auth:alreadyHaveAccount")}
                  <Text weight="bold" style={{ color: colors.text }}>{t("auth:login")}</Text>
                </Text>
              </TouchableOpacity>
            ) : null}
            {step === "verification" ? (
              <TouchableOpacity
                onPress={() => void resendCode()}
                disabled={working}
                style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
              >
                <Text weight="bold" style={{ color: colors.text }}>{t("auth:resendCode")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
