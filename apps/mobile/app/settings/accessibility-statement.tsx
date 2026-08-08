import Text from "@/components/common/AppText";
import AppButton from "@/components/common/buttons/AppButton";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccessibilityStatementScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { textStyle } = useSettingsDirection();
  const sections = [
    ["accessibilityCommitmentTitle", "accessibilityCommitmentBody"],
    ["accessibilityAdjustmentsTitle", "accessibilityAdjustmentsBody"],
    ["accessibilityLimitationsTitle", "accessibilityLimitationsBody"],
    ["accessibilityContactTitle", "accessibilityContactBody"],
  ] as const;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SettingsHeader title={t("accessibilityStatement")} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text className="text-sm text-gray-500" style={textStyle}>
          {t("accessibilityLastUpdated")}
        </Text>
        {sections.map(([title, body]) => (
          <View key={title} className="mt-6">
            <Text
              className="text-xl font-bold text-black dark:text-white"
              style={textStyle}
            >
              {t(title)}
            </Text>
            <Text
              className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300"
              style={textStyle}
            >
              {t(body)}
            </Text>
          </View>
        ))}
        <AppButton
          title={t("reportAccessibilityProblem")}
          onPress={() =>
            router.push({
              pathname: "/settings/help-support",
              params: { topic: "accessibility" },
            })
          }
          className="mt-8"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
