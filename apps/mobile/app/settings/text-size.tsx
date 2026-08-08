import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import {
  type AppTextSize,
  useAccessibilityPreferences,
} from "@/contexts/AccessibilityContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { CheckIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const options: AppTextSize[] = [
  "system",
  "large",
  "larger",
  "largest",
  "maximum",
];

export default function TextSizeSettingsScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { textSize, setTextSize } = useAccessibilityPreferences();
  const { rowStyle, textStyle } = useSettingsDirection();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SettingsHeader title={t("textSize")} />
      <View className="px-5 pb-5 pt-4">
        <Text className="text-sm leading-5 text-gray-500" style={textStyle}>
          {t("textSizeDescription")}
        </Text>
      </View>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          accessibilityRole="radio"
          accessibilityState={{ checked: textSize === option }}
          onPress={() => void setTextSize(option)}
          className="flex-row items-center px-5 py-4"
          style={rowStyle}
        >
          <View className="min-w-0 flex-1">
            <Text
              className="text-base font-bold text-black dark:text-white"
              style={textStyle}
            >
              {t(`textSizeOptions.${option}`)}
            </Text>
            <Text
              scaleWithAccessibility={false}
              className="mt-1 text-gray-500"
              style={[
                textStyle,
                {
                  fontSize:
                    option === "system"
                      ? 14
                      : option === "large"
                        ? 16
                        : option === "larger"
                          ? 18
                          : option === "largest"
                            ? 21
                            : 28,
                },
              ]}
            >
              {t("textSizePreview")}
            </Text>
          </View>
          {textSize === option ? (
            <CheckIcon size={22} color="#2563EB" weight="bold" />
          ) : null}
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}
