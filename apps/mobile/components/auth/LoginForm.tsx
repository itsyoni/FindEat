import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema } from "@/lib/validation/auth";
import type { LoginFormData } from "@findeat/types";
import { getErrorMessage } from "@findeat/utils";
import { EnvelopeSimpleIcon, LockIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, TouchableOpacity, View } from "react-native";
import { ZodError } from "zod";
import { TextInput } from "../common";
import { useAppTheme } from "@/contexts/ThemeContext";

type Props = {
  onSignup: () => void;
  onRestaurantSignup: () => void;
  onForgotPassword: () => void;
  onVerificationRequired: (email: string) => void;
};

export default function LoginForm({ onSignup, onForgotPassword, onVerificationRequired }: Props) {
  const { t } = useTranslation("auth");
  const { login, reactivate } = useAuth();
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#E5E7EB" : "#212121";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      const data: LoginFormData = loginSchema.parse({
        email,
        password,
      });

      setLoading(true);
      await login(data.email, data.password);
    } catch (error) {
      if (error instanceof ZodError) {
        Alert.alert(t("invalidDetails"), error.issues[0]?.message);
        return;
      }

      const message = getErrorMessage(error, '');

      if (message === 'EMAIL_NOT_VERIFIED') {
        onVerificationRequired(email.trim());
        return;
      }

      if (message === 'ACCOUNT_DEACTIVATED') {
        Alert.alert(
          t('accountDeactivatedTitle'),
          t('accountDeactivatedBody'),
          [
            { text: t('common:cancel'), style: 'cancel' },
            {
              text: t('reactivateAccount'),
              onPress: () => void handleReactivation(),
            },
          ],
        );
        return;
      }

      Alert.alert(
        t("common:error"),
        getErrorMessage(error, t("invalidEmailOrPassword")),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivation() {
    setLoading(true);
    try {
      await reactivate(email.trim(), password);
    } catch (error) {
      Alert.alert(
        t('common:error'),
        getErrorMessage(error, t('reactivationFailed')),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <View className="gap-4">
        <TextInput
          useBottomSheetInput
          placeholder={t("emailPlaceholder")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={Keyboard.dismiss}
          className="border border-[#D8D3CA] bg-[#F1EEE8] dark:border-gray-600 dark:bg-gray-800"
          leftIcon={<EnvelopeSimpleIcon size={20} color={iconColor} />}
        />

        <TextInput
          useBottomSheetInput
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChangeText={setPassword}
          isPassword
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={Keyboard.dismiss}
          className="border border-[#D8D3CA] bg-[#F1EEE8] dark:border-gray-600 dark:bg-gray-800"
          leftIcon={<LockIcon size={20} color={iconColor} />}
        />

        <View className="-mt-1 flex-row items-center justify-between px-1">
          <TouchableOpacity onPress={onForgotPassword}>
            <Text weight="bold" className="text-[#212121] dark:text-white">
              {t("forgotPassword")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSignup}>
            <Text weight="bold" className="text-[#212121] dark:text-white">
              {t("signUp")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="rounded-2xl bg-[#212121] py-4 dark:bg-white"
          onPress={handleLogin}
          disabled={loading}
        >
          <Text weight="bold" className="text-center text-white dark:text-black">
            {loading ? t("loggingIn") : t("login")}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}
