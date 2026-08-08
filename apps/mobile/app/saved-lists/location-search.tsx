import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import SearchBar from "@/components/common/inputs/SearchBar";
import { useAppTheme } from "@/contexts/ThemeContext";
import { setPendingListLocation } from "@/lib/listLocationSelection";
import type { SelectedAddress } from "@findeat/types";
import { router, useLocalSearchParams } from "expo-router";
import { MapPinIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MapboxFeature = {
  id: string;
  place_name: string;
  center: [number, number];
  text?: string;
};

export default function ListLocationSearchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation("common");
  const { isDark } = useAppTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    let active = true;
    const timeout = setTimeout(async () => {
      const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!token) return;

      try {
        setLoading(true);
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json` +
          `?access_token=${token}&autocomplete=true&limit=8` +
          `&language=${encodeURIComponent(i18n.language)}` +
          "&types=place,locality,neighborhood,address,poi";
        const response = await fetch(url);
        const data = (await response.json()) as { features?: MapboxFeature[] };
        if (active) setResults(data.features ?? []);
      } catch (error) {
        console.error("Location search failed", error);
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [i18n.language, query]);

  function selectLocation(feature: MapboxFeature) {
    if (!id) return;
    const [longitude, latitude] = feature.center;
    const location: SelectedAddress = {
      id: feature.id,
      placeName: feature.place_name,
      address: feature.place_name,
      city: feature.text,
      latitude,
      longitude,
    };
    setPendingListLocation(id, location);
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FAF9F6" : "#171717"} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("chooseListLocation")}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <SearchBar
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          if (value.trim().length < 2) {
            setResults([]);
            setLoading(false);
          }
        }}
        autoFocus
        placeholder={t("searchLocation")}
      />

      {loading ? (
        <ActivityIndicator className="mt-8" color="#D97706" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={
            query.trim().length >= 2 ? (
              <Text className="mt-8 text-center text-gray-500">{t("noLocationsFound")}</Text>
            ) : (
              <Text className="mt-8 px-8 text-center leading-5 text-gray-500">
                {t("locationSearchHint")}
              </Text>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => selectLocation(item)}
              className="mb-2 flex-row items-center rounded-2xl bg-white p-4 dark:bg-gray-900"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                <MapPinIcon size={20} color="#D97706" weight="fill" />
              </View>
              <Text numberOfLines={2} className="ml-3 flex-1 font-semibold text-black dark:text-white">
                {item.place_name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
