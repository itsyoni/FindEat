import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { ThemedSafeAreaView } from "@/components/common";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { ReactNode } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

export default function ReviewDetailEditorShell({
  title,
  onDone,
  children,
}: {
  title: string;
  onDone: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const foreground = isDark ? "#FAF9F6" : "#171717";

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <View className="h-16 flex-row items-center px-5">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          onPress={onDone}
          className="h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
        >
          <DirectionalIcon
            direction="back"
            size={22}
            color={foreground}
            weight="bold"
          />
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          className="mx-4 flex-1 text-center text-lg font-bold text-[#171717] dark:text-[#FAF9F6]"
        >
          {title}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <KeyboardAwareFormScrollView
        bottomOffset={24}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 22,
          paddingTop: 18,
          paddingBottom: 24,
        }}
      >
        {children}
      </KeyboardAwareFormScrollView>

      <View className="px-5 pb-2 pt-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("done")}
          onPress={onDone}
          className="h-14 items-center justify-center rounded-2xl bg-[#171717] dark:bg-[#FAF9F6]"
        >
          <Text className="text-base font-bold text-[#FAF9F6] dark:text-[#171717]">
            {t("done")}
          </Text>
        </TouchableOpacity>
      </View>
    </ThemedSafeAreaView>
  );
}
