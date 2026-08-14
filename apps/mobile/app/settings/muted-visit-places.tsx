import Avatar from "@/components/common/Avatar";
import { EmptyState, Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { refreshVisitGeofences } from "@/lib/visitDetection/manager";
import { setLocallyMutedVisitRestaurant } from "@/lib/visitDetection/storage";
import type { MutedVisitRestaurant } from "@findeat/types";
import { useFocusEffect } from "expo-router";
import { MapPinIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function MutedVisitPlacesScreen() {
  const { t } = useTranslation("visitDetection");
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const [items, setItems] = useState<MutedVisitRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void api.restaurants
        .mutedVisitRestaurants()
        .then((result) => {
          if (active) setItems(result);
        })
        .catch((error) => console.warn("Could not load muted places", error))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function unmute(restaurantId: string) {
    if (!user?.id) return;
    setWorkingId(restaurantId);
    setItems((current) =>
      current.filter((item) => item.restaurant.id !== restaurantId),
    );
    try {
      await Promise.all([
        api.restaurants.unmuteVisitRestaurant(restaurantId),
        setLocallyMutedVisitRestaurant(user.id, restaurantId, false),
      ]);
      await refreshVisitGeofences(user.id, true);
    } catch (error) {
      console.warn("Could not unmute visit place", error);
      setItems(await api.restaurants.mutedVisitRestaurants());
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SettingsHeader title={t("mutedPlaces")} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 44 }}>
        <Text className="px-5 pb-4 pt-4 leading-5 text-gray-500">
          {t("mutedPlacesDescription")}
        </Text>
        {loading ? (
          <SkeletonPulse style={{ paddingHorizontal: 20, gap: 12 }}>
            {[0, 1, 2].map((item) => (
              <View key={item} className="flex-row items-center py-3">
                <Skeleton width={48} height={48} circle />
                <View className="ml-3 flex-1 gap-2">
                  <Skeleton width="55%" height={14} radius={7} />
                  <Skeleton width="75%" height={11} radius={6} />
                </View>
              </View>
            ))}
          </SkeletonPulse>
        ) : items.length === 0 ? (
          <EmptyState
            icon={MapPinIcon}
            title={t("noMutedPlaces")}
            description={t("noMutedPlacesHint")}
          />
        ) : (
          <View className="mx-5 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900">
            {items.map((item, index) => (
              <View
                key={item.restaurant.id}
                className={`flex-row items-center px-4 py-3.5 ${
                  index ? "border-t border-black/5 dark:border-white/10" : ""
                }`}
              >
                <Avatar
                  uri={item.restaurant.logoUrl}
                  username={item.restaurant.name}
                  fallbackType="restaurant"
                  size={46}
                />
                <View className="ml-3 min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className="font-bold text-[#171717] dark:text-[#F5F2EC]"
                  >
                    {item.restaurant.name}
                  </Text>
                  <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
                    {[item.restaurant.address, item.restaurant.city]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
                <TouchableOpacity
                  disabled={workingId === item.restaurant.id}
                  onPress={() => void unmute(item.restaurant.id)}
                  className="ml-3 rounded-xl bg-[#FBFAF8] px-3 py-2.5 dark:bg-[#171719]"
                >
                  <Text className="text-sm font-bold text-brand">
                    {t("unmute")}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
