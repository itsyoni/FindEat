import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";
import { useVisitDetection } from "@/contexts/VisitDetectionContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import { MapPinIcon, ShieldCheckIcon, SlidersHorizontalIcon } from "phosphor-react-native";
import { ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function VisitDetectionSettingsScreen() {
  const { t } = useTranslation("visitDetection");
  const { isDark } = useAppTheme();
  const { preferences, loading, showDisclosure, disable } = useVisitDetection();
  const color = isDark ? "#F5F2EC" : "#171717";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SettingsHeader title={t("settingsTitle")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 44 }}>
        <View className="mx-5 mt-5 rounded-3xl bg-[#FFF0E6] p-5 dark:bg-[#3A211C]">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-[#FBFAF8] dark:bg-[#171719]">
            <MapPinIcon size={27} color="#FF5B35" weight="fill" />
          </View>
          <Text className="mt-4 text-xl font-bold text-[#171717] dark:text-[#F5F2EC]">
            {t("settingsIntroTitle")}
          </Text>
          <Text className="mt-2 leading-6 text-gray-600 dark:text-gray-300">
            {t("settingsIntroBody")}
          </Text>
        </View>

        <SettingsSection title={t("settingsTitle")}>
          <View className="flex-row items-center px-5 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
              <SlidersHorizontalIcon size={22} color={color} weight="duotone" />
            </View>
            <View className="ml-4 min-w-0 flex-1 pr-4">
              <Text className="font-bold text-[#171717] dark:text-[#F5F2EC]">
                {t("toggleTitle")}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500">
                {t("toggleHint")}
              </Text>
            </View>
            <Switch
              disabled={loading}
              value={preferences.enabled}
              onValueChange={(enabled) =>
                enabled ? showDisclosure() : void disable()
              }
              trackColor={{ false: "#9CA3AF", true: "#FF8F37" }}
              thumbColor="#F5F2EC"
            />
          </View>
          {preferences.enabled ? (
            <View className="mx-5 mb-4 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
              <Text className="text-sm font-bold text-[#171717] dark:text-[#F5F2EC]">
                {t(`mode.${preferences.mode}`)}
              </Text>
              <Text className="mt-1 text-xs leading-5 text-gray-500">
                {t(`mode.${preferences.mode}Hint`)}
              </Text>
            </View>
          ) : null}
        </SettingsSection>

        <SettingsSection title={t("privacySection")}>
          <SettingsRow
            icon={<MapPinIcon size={23} color="#FF5B35" weight="duotone" />}
            title={t("mutedPlaces")}
            subtitle={t("mutedPlacesHint")}
            onPress={() => router.push("/settings/muted-visit-places")}
          />
        </SettingsSection>

        <View className="mx-5 mt-5 flex-row rounded-2xl bg-gray-100 p-4 dark:bg-gray-900">
          <ShieldCheckIcon size={22} color="#6B7280" weight="duotone" />
          <Text className="ml-3 min-w-0 flex-1 text-sm leading-5 text-gray-500">
            {t("privacyExplanation")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
