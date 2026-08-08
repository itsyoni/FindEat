import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import { StarIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";

export default function ReviewFeedEmptyState() {
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();

  return (
    <View className="flex-1 items-center justify-center bg-canvas px-9 pb-16 dark:bg-black">
      <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-ink dark:border-white">
        <StarIcon
          size={43}
          color={isDark ? "#FAF9F6" : "#171717"}
          weight="regular"
        />
      </View>

      <Text className="mt-6 text-center text-2xl font-bold text-black dark:text-white">
        {t("emptyReviewsTitle")}
      </Text>
      <Text className="mt-2 max-w-80 text-center text-base leading-6 text-gray-500">
        {t("emptyReviewsBody")}
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/create/review")}
        className="mt-6 rounded-xl bg-ink px-7 py-3.5 dark:bg-white"
      >
        <Text className="font-bold text-white dark:text-black">
          {t("writeFirstReview")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
