import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { FloppyDiskIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, TouchableOpacity } from "react-native";

type Props = {
  onPress: () => void;
  saving?: boolean;
  disabled?: boolean;
  darkSurface?: boolean;
};

export default function SaveDraftButton({
  onPress,
  saving = false,
  disabled = false,
  darkSurface = false,
}: Props) {
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();
  const inactive = disabled || saving;
  const foreground = darkSurface || isDark ? "#FAF9F6" : "#171717";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("saveDraft")}
      disabled={inactive}
      onPress={onPress}
      className={`flex-row items-center rounded-full px-3 py-2 ${
        darkSurface
          ? "bg-white/15"
          : "bg-gray-100 dark:bg-gray-800"
      } ${inactive ? "opacity-45" : ""}`}
    >
      {saving ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        <FloppyDiskIcon size={16} color={foreground} weight="bold" />
      )}
      <Text
        className={`ml-1.5 text-xs font-bold ${
          darkSurface ? "text-white" : "text-black dark:text-white"
        }`}
      >
        {saving ? t("savingDraft") : t("saveDraft")}
      </Text>
    </TouchableOpacity>
  );
}
