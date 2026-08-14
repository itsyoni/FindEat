import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { refreshVisitGeofences } from "@/lib/visitDetection/manager";
import { visitCreationRoute } from "@/lib/visitDetection/routing";
import {
  canRetryVisitReminder,
  finishVisitCandidate,
  remindCandidateLater,
} from "@/lib/visitDetection/reminders";
import {
  getVisitCandidates,
  setLocallyMutedVisitRestaurant,
} from "@/lib/visitDetection/storage";
import { isVisitCandidateActionable } from "@/lib/visitDetection/visitCandidateLogic";
import type { Restaurant, RestaurantVisitCandidate } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ClockCounterClockwiseIcon,
  MapPinIcon,
  NotePencilIcon,
  VideoCameraIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";

export default function VisitReminderScreen() {
  const { restaurantId, visitCandidateId } = useLocalSearchParams<{
    restaurantId: string;
    visitCandidateId: string;
  }>();
  const { user } = useAuth();
  const { t, i18n } = useTranslation("visitDetection");
  const [candidate, setCandidate] = useState<RestaurantVisitCandidate | null>(
    null,
  );
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!user?.id || !restaurantId || !visitCandidateId) {
      const frame = requestAnimationFrame(() => setLoading(false));
      return () => cancelAnimationFrame(frame);
    }
    let active = true;
    void Promise.all([
      getVisitCandidates(user.id),
      api.restaurants.get(restaurantId),
    ])
      .then(([candidates, restaurantResult]) => {
        if (!active) return;
        setCandidate(
          candidates.find((item) => item.id === visitCandidateId) ?? null,
        );
        setRestaurant(restaurantResult);
      })
      .catch((error) =>
        console.warn("Could not open visit reminder", error),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [restaurantId, user?.id, visitCandidateId]);

  const actionable = isVisitCandidateActionable(candidate);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  async function create(kind: "content" | "review") {
    if (!user?.id || !candidate || !restaurantId) return;
    setWorking(true);
    await finishVisitCandidate(user.id, candidate.id, "COMPLETED");
    router.replace(visitCreationRoute(kind, restaurantId));
  }

  async function remindLater() {
    if (!user?.id || !candidate) return;
    setWorking(true);
    await remindCandidateLater(user.id, candidate.id, i18n.language);
    close();
  }

  async function dismiss() {
    if (!user?.id || !candidate) return close();
    setWorking(true);
    await finishVisitCandidate(user.id, candidate.id, "DISMISSED");
    close();
  }

  async function mutePlace() {
    if (!user?.id || !candidate) return;
    setWorking(true);
    await setLocallyMutedVisitRestaurant(user.id, candidate.restaurantId, true);
    await finishVisitCandidate(user.id, candidate.id, "DISMISSED");
    try {
      await api.restaurants.muteVisitRestaurant(candidate.restaurantId);
      await refreshVisitGeofences(user.id, true);
    } catch (error) {
      console.warn("Could not sync muted visit place", error);
    }
    close();
  }

  return (
    <SafeAreaView className="flex-1 bg-[#171717]/35">
      <Stack.Screen options={{ headerShown: false }} />
      <AppBottomSheet
        open
        onClose={close}
        snapPoints={[actionable ? "78%" : "46%"]}
        maxHeightPercent={0.92}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        >
          {loading ? (
            <View className="items-center py-14">
              <Text className="text-gray-500">{t("loading")}</Text>
            </View>
          ) : !candidate || !restaurant || !actionable ? (
            <View className="items-center py-8">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <ClockCounterClockwiseIcon
                  size={28}
                  color="#9CA3AF"
                  weight="duotone"
                />
              </View>
              <Text className="mt-4 text-center text-xl font-bold text-[#171717] dark:text-[#F5F2EC]">
                {t("staleTitle")}
              </Text>
              <Text className="mt-2 text-center leading-5 text-gray-500">
                {t("staleBody")}
              </Text>
              <TouchableOpacity
                onPress={close}
                className="mt-5 rounded-2xl bg-[#171717] px-8 py-3.5 dark:bg-[#F5F2EC]"
              >
                <Text className="font-bold text-[#F5F2EC] dark:text-[#171717]">
                  {t("close")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="items-center">
                <Avatar
                  uri={restaurant.logoUrl}
                  username={restaurant.name}
                  fallbackType="restaurant"
                  size={72}
                />
                <Text className="mt-4 text-center text-2xl font-bold text-[#171717] dark:text-[#F5F2EC]">
                  {t("reminderTitle", { name: restaurant.name })}
                </Text>
                <Text className="mt-2 text-center text-base text-gray-500">
                  {t("reminderBody")}
                </Text>
              </View>

              <View className="mt-6 gap-3">
                <ActionRow
                  icon={<VideoCameraIcon size={24} color="#FF5B35" weight="fill" />}
                  title={t("createContent")}
                  subtitle={t("createContentHint")}
                  onPress={() => void create("content")}
                  disabled={working}
                />
                <ActionRow
                  icon={<NotePencilIcon size={24} color="#D6A92D" weight="fill" />}
                  title={t("writeReview")}
                  subtitle={t("writeReviewHint")}
                  onPress={() => void create("review")}
                  disabled={working}
                />
              </View>

              {canRetryVisitReminder(candidate) ? (
                <TouchableOpacity
                  disabled={working}
                  onPress={() => void remindLater()}
                  className="mt-4 items-center rounded-2xl bg-gray-100 py-3.5 dark:bg-gray-800"
                >
                  <Text className="font-bold text-[#171717] dark:text-[#F5F2EC]">
                    {t("remindLater")}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                disabled={working}
                onPress={() => void dismiss()}
                className="mt-2 items-center py-3"
              >
                <Text className="font-bold text-gray-500">{t("notNow")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={working}
                onPress={() => void mutePlace()}
                className="mt-1 flex-row items-center justify-center py-3"
              >
                <MapPinIcon size={17} color="#9CA3AF" weight="duotone" />
                <Text className="ml-2 font-bold text-gray-500">
                  {t("dontRemindPlace")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </AppBottomSheet>
    </SafeAreaView>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-center rounded-2xl border border-black/5 bg-[#FBFAF8] p-4 dark:border-white/10 dark:bg-[#171719]"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        {icon}
      </View>
      <View className="ml-3 min-w-0 flex-1">
        <Text className="font-bold text-[#171717] dark:text-[#F5F2EC]">{title}</Text>
        <Text className="mt-0.5 text-sm text-gray-500">{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}
