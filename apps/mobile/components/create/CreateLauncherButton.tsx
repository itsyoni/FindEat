import { useAppTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import { PlusCircleIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import type { StyleProp, ViewStyle } from "react-native";
import { TouchableOpacity, View } from "react-native";

type Props = {
  style?: StyleProp<ViewStyle>;
};

export default function CreateLauncherButton({ style }: Props) {
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#FAF9F6" : "#171717";

  return (
    <View
      className="items-center justify-center"
      style={[style, { zIndex: 100 }]}
    >
      <TouchableOpacity
        onPress={() => router.push("/create/content")}
        hitSlop={8}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("create")}
      >
        <PlusCircleIcon size={28} color={iconColor} weight="regular" />
      </TouchableOpacity>
    </View>
  );
}
