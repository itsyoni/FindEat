import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAccessibilityPreferences } from "@/contexts/AccessibilityContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import {
  ArticleIcon,
  ChatCircleDotsIcon,
  FilmStripIcon,
  TextAaIcon,
  TextBIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  icon,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
}) {
  const { rowStyle, textStyle } = useSettingsDirection();
  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
      className="flex-row items-center px-5 py-4"
      style={rowStyle}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full bg-soft dark:bg-gray-900"
        style={{ marginEnd: 16 }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-base text-ink dark:text-white" style={textStyle}>
          {title}
        </Text>
        <Text className="mt-0.5 text-sm text-gray-500" style={textStyle}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#BDBDBD", true: "#F4B942" }}
        thumbColor="#FAF9F6"
      />
    </TouchableOpacity>
  );
}

export default function AccessibilitySettingsScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const {
    textSize,
    boldText,
    reduceMotion,
    setBoldText,
    setReduceMotion,
  } = useAccessibilityPreferences();
  const color = isDark ? "#FAF9F6" : "#111";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SettingsHeader title={t("accessibility")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <SettingsSection title={t("accessibilityDisplay")}> 
          <SettingsRow
            icon={<TextAaIcon size={23} color={color} />}
            title={t("textSize")}
            subtitle={t("textSizeSubtitle")}
            value={t(`textSizeOptions.${textSize}`)}
            onPress={() => router.push("/settings/text-size")}
          />
          <ToggleRow
            icon={<TextBIcon size={23} color={color} weight="bold" />}
            title={t("boldText")}
            subtitle={t("boldTextSubtitle")}
            value={boldText}
            onChange={(value) => void setBoldText(value)}
          />
          <ToggleRow
            icon={<FilmStripIcon size={23} color={color} />}
            title={t("reduceMotion")}
            subtitle={t("reduceMotionSubtitle")}
            value={reduceMotion}
            onChange={(value) => void setReduceMotion(value)}
          />
        </SettingsSection>

        <SettingsSection title={t("accessibilityHelp")}> 
          <SettingsRow
            icon={<ArticleIcon size={23} color={color} />}
            title={t("accessibilityStatement")}
            subtitle={t("accessibilityStatementSubtitle")}
            onPress={() => router.push("/settings/accessibility-statement")}
          />
          <SettingsRow
            icon={<ChatCircleDotsIcon size={23} color={color} />}
            title={t("reportAccessibilityProblem")}
            subtitle={t("reportAccessibilityProblemSubtitle")}
            onPress={() =>
              router.push({
                pathname: "/settings/help-support",
                params: { topic: "accessibility" },
              })
            }
          />
        </SettingsSection>

        <Text className="mx-5 mt-5 text-sm leading-5 text-gray-500">
          {t("assistiveTechnologyHint")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
