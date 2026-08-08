import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { router, Stack } from "expo-router";
import {
  ChartLineUpIcon,
  EyeIcon,
  LockKeyIcon,
  TrendUpIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const previewMetrics = [
  { key: "profileViews", Icon: EyeIcon },
  { key: "postReach", Icon: ChartLineUpIcon },
  { key: "engagement", Icon: TrendUpIcon },
  { key: "audienceGrowth", Icon: UsersThreeIcon },
] as const;

export default function ProfileStatisticsScreen() {
  const { t } = useTranslation("profile");
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#FDE68A" : "#B45309";

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common:back")}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center"
        >
          <DirectionalIcon
            direction="back"
            variant="arrow"
            size={24}
            color={isDark ? "#FAF9F6" : "#171717"}
          />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("profileStatistics")}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        <View className="overflow-hidden rounded-[28px] bg-[#171717] p-6 dark:border dark:border-gray-800">
          <View className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-amber-400/20" />
          <View className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-orange-500/10" />
          <View className="self-start rounded-full bg-amber-400 px-3 py-1">
            <Text className="text-[11px] font-black tracking-wider text-black">
              {t("futureProFeature")}
            </Text>
          </View>
          <View className="mt-8 h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <ChartLineUpIcon size={30} color="#FACC15" weight="duotone" />
          </View>
          <Text className="mt-5 text-2xl font-bold text-white">
            {t("understandYourProfile")}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-gray-400">
            {t("profileStatisticsDescription")}
          </Text>
        </View>

        <Text className="mb-3 mt-7 text-lg font-bold text-black dark:text-white">
          {t("plannedInsights")}
        </Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {previewMetrics.map(({ key, Icon }) => (
            <View
              key={key}
              className="w-[48%] rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <View className="flex-row items-center justify-between">
                <Icon size={20} color={iconColor} weight="duotone" />
                <LockKeyIcon size={14} color="#9CA3AF" weight="fill" />
              </View>
              <Text className="mt-5 text-2xl font-bold text-gray-400 dark:text-gray-600">
                —
              </Text>
              <Text className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                {t(key)}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-5 flex-row rounded-2xl bg-gray-100 p-4 dark:bg-gray-900">
          <LockKeyIcon size={20} color="#9CA3AF" weight="fill" />
          <Text className="ml-3 flex-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
            {t("statisticsNotCollected")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
