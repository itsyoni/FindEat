import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import TextInput from "@/components/common/inputs/AppTextInput";
import { api } from "@/lib/api";
import type { SelectedRestaurant } from "@findeat/types";
import * as Location from "expo-location";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  StorefrontIcon,
  XIcon,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { SkeletonList } from "@/components/common";
import RestaurantBadge from "./RestaurantBadge";

type Props = {
  selectedRestaurant: SelectedRestaurant | null;
  onSelect: (restaurant: SelectedRestaurant | null) => void;
};

function itemKey(item: SelectedRestaurant) {
  return item.source === "FINDEAT"
    ? `findeat-${item.restaurant.id}`
    : `google-${item.googlePlaceId}`;
}

export default function RestaurantSearch({
  selectedRestaurant,
  onSelect,
}: Props) {
  const { t } = useTranslation(["restaurants", "create"]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SelectedRestaurant[]>([]);
  const [nearbyResults, setNearbyResults] = useState<SelectedRestaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [locationUnavailable, setLocationUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadNearby() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          if (active) setLocationUnavailable(true);
          return;
        }

        const location =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));

        if (!location) {
          if (active) setLocationUnavailable(true);
          return;
        }

        const coordinates = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          limit: 10,
        };
        const [findeatRequest, googleRequest] = await Promise.allSettled([
          api.restaurants.discoverForMap({
            ...coordinates,
            filter: "ALL",
            sort: "DISTANCE",
          }),
          api.restaurants.nearbyGoogle(coordinates),
        ]);
        const findeat =
          findeatRequest.status === "fulfilled" ? findeatRequest.value : [];
        const google =
          googleRequest.status === "fulfilled" ? googleRequest.value : [];

        const findeatGoogleIds = new Set(
          findeat
            .map((restaurant) => restaurant.googlePlaceId)
            .filter((id): id is string => !!id),
        );
        const findeatNames = new Set(
          findeat.map((restaurant) =>
            restaurant.name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, ""),
          ),
        );
        const combined: SelectedRestaurant[] = [
          ...findeat.map((restaurant) => ({
            source: "FINDEAT" as const,
            restaurant,
          })),
          ...google.filter(
            (restaurant) =>
              !findeatGoogleIds.has(restaurant.googlePlaceId) &&
              !findeatNames.has(
                restaurant.name
                  .toLocaleLowerCase()
                  .replace(/[^\p{L}\p{N}]/gu, ""),
              ),
          ),
        ];

        combined.sort((first, second) => {
          const firstDistance =
            first.source === "FINDEAT"
              ? first.restaurant.distanceKm
              : first.distanceKm;
          const secondDistance =
            second.source === "FINDEAT"
              ? second.restaurant.distanceKm
              : second.distanceKm;
          return (firstDistance ?? Infinity) - (secondDistance ?? Infinity);
        });

        if (active) setNearbyResults(combined.slice(0, 10));
      } catch (error) {
        console.error("nearby restaurants failed", error);
        if (active) setLocationUnavailable(true);
      } finally {
        if (active) setLoadingNearby(false);
      }
    }

    void loadNearby();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      setSearching(true);
      void api.restaurants
        .search(cleanQuery)
        .then((results) => {
          if (!active) return;
          setSearchResults([
            ...(results.findeat ?? []).map((restaurant) => ({
              source: "FINDEAT" as const,
              restaurant,
            })),
            ...(results.google ?? []),
          ]);
        })
        .catch((error) => {
          console.error("restaurant search failed", error);
          if (active) setSearchResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  if (selectedRestaurant) {
    const restaurant =
      selectedRestaurant.source === "FINDEAT"
        ? selectedRestaurant.restaurant
        : selectedRestaurant;
    const logoUrl =
      selectedRestaurant.source === "FINDEAT"
        ? selectedRestaurant.restaurant.logoUrl
        : null;

    return (
      <View className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
        <View className="flex-row items-center">
          <Avatar
            uri={logoUrl}
            username={restaurant.name}
            size={48}
            fallbackType="restaurant"
          />
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text
                numberOfLines={1}
                className="flex-shrink font-bold text-black dark:text-white"
              >
                {restaurant.name}
              </Text>
              <RestaurantBadge
                size={14}
                claimed={
                  selectedRestaurant.source === "FINDEAT" &&
                  selectedRestaurant.restaurant.status === "CLAIMED"
                }
              />
            </View>
            {!!(restaurant.address || restaurant.city) && (
              <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
                {[restaurant.address, restaurant.city]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
          </View>
          <CheckCircleIcon size={22} color="#22C55E" weight="fill" />
          <TouchableOpacity
            onPress={() => onSelect(null)}
            className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-gray-800"
          >
            <XIcon size={18} color="#6B7280" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const showingSearch = query.trim().length > 0;
  const items: SelectedRestaurant[] = showingSearch
    ? searchResults
    : nearbyResults;

  return (
    <View className="mt-6 flex-1">
      <TextInput
        className="rounded-xl border-gray-200 bg-gray-50 px-3 dark:border-gray-700 dark:bg-gray-900"
        style={{ paddingVertical: 11, fontSize: 15 }}
        placeholder={t("restaurants:searchRestaurant")}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          if (!text.trim()) {
            setSearchResults([]);
            setSearching(false);
          }
        }}
        autoCorrect={false}
        leftIcon={<MagnifyingGlassIcon size={20} color="#9CA3AF" />}
        rightIcon={searching ? <ActivityIndicator size="small" /> : undefined}
      />

      <View className="mt-5 flex-row items-center justify-between">
        <View className="flex-row items-center">
          {!showingSearch && <MapPinIcon size={18} color="#D6A92D" weight="fill" />}
          <Text className="ml-2 text-lg font-bold text-black dark:text-white">
            {showingSearch
              ? t("create:searchResults")
              : t("create:nearbyPlaces")}
          </Text>
        </View>
        {!showingSearch && nearbyResults.length > 0 && (
          <Text className="text-xs text-gray-400">
            {t("create:nearestCount", { count: nearbyResults.length })}
          </Text>
        )}
      </View>

      <FlatList
        className="mt-3"
        data={items}
        keyExtractor={itemKey}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
        ListEmptyComponent={
          searching || (!showingSearch && loadingNearby) ? (
            <SkeletonList />
          ) : (
            <View className="items-center py-12">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                <StorefrontIcon size={29} color="#9CA3AF" weight="fill" />
              </View>
              <Text className="mt-4 px-8 text-center text-gray-500">
                {showingSearch
                  ? t("create:noRestaurantsFound")
                  : locationUnavailable
                    ? t("create:nearbyUnavailable")
                    : t("create:noNearbyPlaces")}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const restaurant =
            item.source === "FINDEAT" ? item.restaurant : item;
          const logoUrl =
            item.source === "FINDEAT" ? item.restaurant.logoUrl : null;
          const distance =
            item.source === "FINDEAT"
              ? item.restaurant.distanceKm
              : item.distanceKm;

          return (
            <TouchableOpacity
              onPress={() => onSelect(item)}
              className="mb-2 flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
            >
              <Avatar
                uri={logoUrl}
                username={restaurant.name}
                size={50}
                fallbackType="restaurant"
              />
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text
                    numberOfLines={1}
                    className="flex-shrink font-bold text-black dark:text-white"
                  >
                    {restaurant.name}
                  </Text>
                  <RestaurantBadge
                    size={14}
                    claimed={
                      item.source === "FINDEAT" &&
                      item.restaurant.status === "CLAIMED"
                    }
                  />
                </View>
                {!!(restaurant.address || restaurant.city) && (
                  <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
                    {[restaurant.address, restaurant.city]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
              </View>
              {typeof distance === "number" && (
                <Text className="ml-3 text-xs font-semibold text-gray-400">
                  {distance < 1
                    ? t("create:distanceMeters", {
                        value: Math.round(distance * 1000),
                      })
                    : t("create:distanceKilometers", {
                        value: distance.toFixed(1),
                      })}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
