import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import {
  CameraIcon,
  NotePencilIcon,
  PlusIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";

type Props = {
  type: "CONTENT" | "REVIEW";
};

export default function EmptyPostsState({ type }: Props) {
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();
  const isReview = type === "REVIEW";
  const Icon = isReview ? NotePencilIcon : CameraIcon;

  function openCreatePage() {
    router.push(isReview ? "/create/review" : "/create/content");
  }

  return (
    <View className="flex-1 items-center justify-center bg-canvas px-8 pb-20 dark:bg-black">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-gray-800">
          <Icon
            size={32}
            color={isReview ? "#FF5B35" : isDark ? "#FAF9F6" : "#171717"}
            weight="fill"
          />
        </View>
      </View>

      <Text className="mt-6 text-center text-2xl font-bold text-black dark:text-white">
        {t(isReview ? "emptyReviewsTitle" : "emptyContentTitle")}
      </Text>
      <Text className="mt-2 max-w-80 text-center text-base leading-6 text-gray-500">
        {t(isReview ? "emptyReviewsBody" : "emptyContentBody")}
      </Text>

      <TouchableOpacity
        className={`mt-7 flex-row items-center rounded-2xl px-6 py-4 ${
          isReview ? "bg-brand" : "bg-ink dark:bg-white"
        }`}
        activeOpacity={0.8}
        onPress={openCreatePage}
      >
        <PlusIcon
          size={19}
          color={isReview ? "#FAF9F6" : isDark ? "#171717" : "#FAF9F6"}
          weight="bold"
        />
        <Text
          className={`ml-2 font-bold ${
            isReview ? "text-white" : "text-white dark:text-black"
          }`}
        >
          {t(isReview ? "writeFirstReview" : "createFirstPost")}
        </Text>
      </TouchableOpacity>

      <Text className="mt-4 text-center text-xs text-gray-400">
        {t(isReview ? "reviewEmptyHint" : "contentEmptyHint")}
      </Text>
    </View>
  );
}
