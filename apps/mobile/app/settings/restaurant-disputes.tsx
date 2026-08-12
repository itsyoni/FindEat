import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import type { SelectedRestaurant } from "@findeat/types";
import { useState } from "react";

type Dispute = {
  id: string;
  status: "AWAITING_AUTHOR" | "UNDER_REVIEW";
  postId: string;
  reportingRestaurant?: { name: string } | null;
  restaurant?: { name: string } | null;
};

export default function RestaurantDisputesScreen() {
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const [correcting, setCorrecting] = useState<Dispute | null>(null);
  const disputes = useQuery<Dispute[]>({
    queryKey: ["restaurant-disputes"],
    queryFn: () => api.reports.myRestaurantDisputes(),
  });

  async function confirm(dispute: Dispute) {
    await api.reports.respondToRestaurantDispute(dispute.id, {
      response: "CONFIRM_CORRECT",
    });
    await queryClient.invalidateQueries({ queryKey: ["restaurant-disputes"] });
  }

  async function changeRestaurant(restaurant: SelectedRestaurant) {
    if (!correcting) return;
    const restaurantId =
      restaurant.source === "FINDEAT"
        ? restaurant.restaurant.id
        : (
            await api.restaurants.fromGoogle({
              name: restaurant.name,
              address: restaurant.address,
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
              googlePlaceId: restaurant.googlePlaceId,
            })
          ).id;
    await api.reports.respondToRestaurantDispute(correcting.id, {
      response: "CHANGE_RESTAURANT",
      restaurantId,
    });
    setCorrecting(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["restaurant-disputes"] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
      queryClient.invalidateQueries({ queryKey: ["post"] }),
    ]);
  }

  if (correcting) {
    return (
      <FullPageRestaurantPicker
        selectedRestaurant={null}
        onBack={() => setCorrecting(null)}
        onSelect={(restaurant) => void changeRestaurant(restaurant)}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <SettingsHeader title="Restaurant checks" />
      {disputes.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={disputes.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <Text weight="bold" className="text-xl text-black dark:text-white">No restaurant checks</Text>
              <Text className="mt-2 text-center text-gray-500">Your restaurant associations are up to date.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
              <Text weight="bold" className="text-lg text-black dark:text-white">Is this the right restaurant?</Text>
              <Text className="mt-2 leading-5 text-gray-500">
                {item.reportingRestaurant?.name ?? item.restaurant?.name ?? "A restaurant"} says this post may have been linked to them by mistake.
              </Text>
              {item.status === "AWAITING_AUTHOR" ? (
                <View className="mt-5 gap-2">
                  <TouchableOpacity
                    onPress={() => setCorrecting(item)}
                    className="items-center rounded-2xl bg-[#FF5B35] py-3.5"
                  >
                    <Text weight="bold" className="text-white">Change restaurant</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void confirm(item)}
                    className="items-center rounded-2xl bg-black py-3.5 dark:bg-white"
                  >
                    <Text weight="bold" className="text-white dark:text-black">This is the correct restaurant</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text weight="bold" className="mt-4 text-amber-600">Waiting for FindEat review</Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
