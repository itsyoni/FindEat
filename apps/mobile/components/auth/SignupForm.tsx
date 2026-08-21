import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { signupSchema } from "@/lib/validation/auth";
import type { SignupFormData } from "@findeat/types";
import { getErrorMessage } from "@findeat/utils";
import { EnvelopeSimpleIcon, LockIcon, UserIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, TouchableOpacity, View } from "react-native";
import { ZodError } from "zod";
import { TextInput } from "../common";
import { useAppTheme } from "@/contexts/ThemeContext";
import AuthFormHeader from "./AuthFormHeader";

type Props = {
  onLogin: () => void;
  onVerificationRequired: (email: string) => void;
  useBottomSheetInput?: boolean;
};

export default function SignupForm({
  onLogin,
  onVerificationRequired,
  useBottomSheetInput = true,
}: Props) {
  const { t } = useTranslation(["auth", "common"]);
  const { signup } = useAuth();
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#E5E7EB" : "#212121";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [availability, setAvailability] = useState<{
    usernameAvailable: boolean | null;
    emailAvailable: boolean | null;
  }>({
    usernameAvailable: null,
    emailAvailable: null,
  });
  const [loading, setLoading] = useState(false);
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;
  const passwordInputStyle = {
    fontFamily: Platform.OS === "ios" ? "System" : "CabinetRegular",
    fontSize: 16,
    lineHeight: 20,
  } as const;

  async function handleSignup() {
    try {
      const data: SignupFormData = signupSchema.parse({
        username,
        email,
        password,
        confirmPassword,
      });

      if (availability.usernameAvailable === false) {
        Alert.alert(t("auth:invalidDetails"), t("auth:usernameTaken"));
        return;
      }

      if (availability.emailAvailable === false) {
        Alert.alert(t("auth:invalidDetails"), t("auth:emailRegistered"));
        return;
      }

      setLoading(true);

      const result = await signup(data.email, data.username, data.password);
      onVerificationRequired(result.email);
    } catch (error) {
      if (error instanceof ZodError) {
        Alert.alert(t("auth:invalidDetails"), error.issues[0]?.message);
        return;
      }

      Alert.alert(
        t("common:error"),
        getErrorMessage(error, t("auth:couldNotCreateAccount")),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!username.trim() && !email.trim()) {
        setAvailability({
          usernameAvailable: null,
          emailAvailable: null,
        });
        return;
      }

      try {
        const availability = await api.auth.checkAvailability({
          username: username.trim() || undefined,
          email: email.trim() || undefined,
        });

        setAvailability(availability);
      } catch {
        setAvailability({
          usernameAvailable: null,
          emailAvailable: null,
        });
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [username, email]);

  return (
    <View>
      <AuthFormHeader
        title={t("auth:createAccount")}
        subtitle={t("auth:signupSubtitle")}
      />

      <View className="gap-4">
        <TextInput
          useBottomSheetInput={useBottomSheetInput}
          placeholder={t("auth:usernamePlaceholder")}
          value={username}
          onChangeText={(text) => {
            setUsername(text.replace(/[^a-zA-Z0-9_]/g, ""));
          }}
          autoCapitalize="none"
          className="border border-[#D8D3CA] bg-[#F1EEE8] dark:border-gray-600 dark:bg-gray-800"
          leftIcon={<UserIcon size={20} color={iconColor} />}
        />

        {availability.usernameAvailable === false && (
          <Text className="-mt-3 text-sm text-red-500">
            {t("auth:usernameTaken")}
          </Text>
        )}

        <TextInput
          useBottomSheetInput={useBottomSheetInput}
          placeholder={t("auth:emailPlaceholder")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          className="border border-[#D8D3CA] bg-[#F1EEE8] dark:border-gray-600 dark:bg-gray-800"
          leftIcon={<EnvelopeSimpleIcon size={20} color={iconColor} />}
        />

        {availability.emailAvailable === false && (
          <Text className="-mt-3 text-sm text-red-500">
            {t("auth:emailRegistered")}
          </Text>
        )}

        <TextInput
          useBottomSheetInput={useBottomSheetInput}
          placeholder={t("auth:passwordPlaceholder")}
          value={password}
          onChangeText={setPassword}
          isPassword
          style={passwordInputStyle}
          className="border border-[#D8D3CA] bg-[#F1EEE8] dark:border-gray-600 dark:bg-gray-800"
          leftIcon={<LockIcon size={20} color={iconColor} />}
        />

        <TextInput
          useBottomSheetInput={useBottomSheetInput}
          placeholder={t("auth:confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          isPassword
          style={passwordInputStyle}
          className="border border-[#D8D3CA] bg-[#F1EEE8] dark:border-gray-600 dark:bg-gray-800"
          leftIcon={<LockIcon size={20} color={iconColor} />}
        />

        {!passwordsMatch && (
          <Text className="-mt-3 text-sm text-red-500">
            {t("auth:passwordsDoNotMatch")}
          </Text>
        )}

        <TouchableOpacity
          className="rounded-2xl bg-[#212121] py-4 dark:bg-white"
          onPress={handleSignup}
          disabled={loading || !passwordsMatch}
        >
          <Text weight="bold" className="text-center text-white dark:text-black">
            {loading ? t("auth:creatingAccount") : t("auth:createAccount")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onLogin}>
          <Text className="text-center text-gray-500">
            {t("auth:alreadyHaveAccount")}
            <Text weight="bold" className="text-[#212121] dark:text-white">
              {t("auth:login")}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
