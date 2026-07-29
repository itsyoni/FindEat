import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { SkeletonList } from "@/components/common";
import TextInput from "@/components/common/inputs/AppTextInput";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { getFreshDeviceLocation } from "@/lib/currentLocation";
import { mergeRestaurantSearchResults } from "@/lib/restaurantSearchResults";
import type { SelectedRestaurant } from "@findeat/types";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  StorefrontIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RestaurantBadge from "./RestaurantBadge";

type Props = {
  selectedRestaurant: SelectedRestaurant | null;
  onSelect: (restaurant: SelectedRestaurant) => void;
  onBack: () => void;
  headerRight?: ReactNode;
};

export default function FullPageRestaurantPicker({
  selectedRestaurant,
  onSelect,
  onBack,
  headerRight,
}: Props) {
  const { t, i18n } = useTranslation(["create", "restaurants"]);
  const { isDark } = useAppTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedRestaurant[]>([]);
  const [nearbyResults, setNearbyResults] = useState<SelectedRestaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function loadNearby() {
      try {
        const location = await getFreshDeviceLocation();
        if (!location) {
          if (active) setLocationUnavailable(true);
          return;
        }

        const coordinates = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          limit: 10,
        };
        if (active) {
          setSearchLocation({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          });
        }

        const [findeatRequest, googleRequest] = await Promise.allSettled([
          api.restaurants.discoverForMap({
            ...coordinates,
            filter: "ALL",
            sort: "DISTANCE",
          }),
          api.restaurants.nearbyGoogle({
            ...coordinates,
            languageCode: i18n.resolvedLanguage ?? i18n.language,
          }),
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
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    const cleanQuery = query.trim();
    const requestId = ++requestIdRef.current;

    if (!cleanQuery) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setSearching(true);
      void api.restaurants
        .search(cleanQuery, {
          ...(searchLocation ?? {}),
          languageCode: i18n.resolvedLanguage ?? i18n.language,
        })
        .then((response) => {
          if (requestId !== requestIdRef.current) return;
          setResults(mergeRestaurantSearchResults(response, cleanQuery));
        })
        .catch((error) => {
          console.error("restaurant search failed", error);
          if (requestId === requestIdRef.current) setResults([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setSearching(false);
        });
    }, 300);

    return () => clearTimeout(timeout);
  }, [
    i18n.language,
    i18n.resolvedLanguage,
    query,
    searchLocation,
  ]);

  function keyFor(item: SelectedRestaurant) {
    return item.source === "FINDEAT"
      ? `findeat-${item.restaurant.id}`
      : `google-${item.googlePlaceId}`;
  }

  function isSelected(item: SelectedRestaurant) {
    if (!selectedRestaurant || selectedRestaurant.source !== item.source) {
      return false;
    }

    return item.source === "FINDEAT" && selectedRestaurant.source === "FINDEAT"
      ? item.restaurant.id === selectedRestaurant.restaurant.id
      : item.source === "GOOGLE" && selectedRestaurant.source === "GOOGLE"
        ? item.googlePlaceId === selectedRestaurant.googlePlaceId
        : false;
  }

  const showingSearch = query.trim().length > 0;
  const items = showingSearch ? results : nearbyResults;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}
    >
      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <DirectionalIcon
            direction="back"
            size={25}
            color={isDark ? "#FFF" : "#171717"}
            weight="bold"
          />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-xl font-bold text-black dark:text-white">
            {t("create:chooseRestaurant")}
          </Text>
          <Text className="mt-0.5 text-sm text-gray-500">
            {t("create:chooseRestaurantBody")}
          </Text>
        </View>
        {headerRight}
      </View>

      <View className="px-5 py-3">
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (!text.trim()) {
              requestIdRef.current += 1;
              setResults([]);
              setSearching(false);
            }
          }}
          placeholder={t("restaurants:searchRestaurant")}
          autoCorrect={false}
          leftIcon={<MagnifyingGlassIcon size={20} color="#9CA3AF" />}
          rightIcon={searching ? <ActivityIndicator size="small" /> : undefined}
          className="bg-gray-50 dark:bg-gray-900"
          style={{ paddingVertical: 12 }}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={keyFor}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20 }}
        ListHeaderComponent={
          <View className="mb-3 mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              {!showingSearch && (
                <MapPinIcon size={18} color="#D6A92D" weight="fill" />
              )}
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
        }
        ListEmptyComponent={
          searching || (!showingSearch && loadingNearby) ? (
            <SkeletonList />
          ) : (
            <View className="flex-1 items-center justify-center px-8 pb-24">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                <StorefrontIcon size={35} color="#9CA3AF" weight="fill" />
              </View>
              <Text className="mt-4 text-center text-gray-500">
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
          const selected = isSelected(item);

          return (
            <TouchableOpacity
              onPress={() => onSelect(item)}
              className={`mb-2 flex-row items-center rounded-2xl border p-3 ${
                selected
                  ? "border-[#D6A92D] bg-amber-50 dark:bg-amber-950/30"
                  : "border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <Avatar
                uri={logoUrl}
                username={restaurant.name}
                size={50}
                fallbackType="restaurant"
              />
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="font-bold text-black dark:text-white">
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
                  <Text numberOfLines={2} className="mt-1 text-sm text-gray-500">
                    {[restaurant.address, restaurant.city]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
              </View>
              {selected && (
                <CheckCircleIcon size={25} color="#D6A92D" weight="fill" />
              )}
              {!selected && typeof distance === "number" && (
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

    </SafeAreaView>
  );
}
