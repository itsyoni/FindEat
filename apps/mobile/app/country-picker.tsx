import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useActiveCountry } from "@/contexts/ActiveCountryContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { CityFilterLocation } from "@findeat/types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CountryPickerScreen() {
  const { isDark } = useAppTheme();
  const { i18n } = useTranslation();
  const { activeCountry, setActiveCountry } = useActiveCountry();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityFilterLocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      void api.restaurants
        .searchCountries(normalized, i18n.language)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [i18n.language, query]);

  const background = isDark ? "#0B0B0A" : "#FBFAF8";
  const foreground = isDark ? "#F6F3ED" : "#171614";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <DirectionalIcon direction="back" variant="arrow" size={24} color={foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", color: foreground, fontSize: 18, fontWeight: "700" }}>
          Discovery country
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ marginHorizontal: 16, borderRadius: 16, backgroundColor: isDark ? "#211F1C" : "#EFECE6", paddingHorizontal: 14 }}>
        <TextInput
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            if (value.trim().length < 2) setResults([]);
          }}
          autoFocus
          placeholder="Search countries"
          placeholderTextColor={isDark ? "#8E8981" : "#807A72"}
          style={{ height: 48, color: foreground, fontSize: 16 }}
        />
      </View>
      {activeCountry ? (
        <Text style={{ marginHorizontal: 18, marginTop: 12, color: isDark ? "#B8B2A9" : "#6D675F" }}>
          Current: {activeCountry.name}
        </Text>
      ) : null}
      {loading ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
      <FlatList
        data={results}
        keyExtractor={(item) => item.googlePlaceId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              if (!item.countryCode) return;
              void setActiveCountry({
                code: item.countryCode,
                name: item.country ?? item.name,
                latitude: item.latitude,
                longitude: item.longitude,
                viewport: item.viewport,
              }).then(() => router.back());
            }}
            style={{ minHeight: 62, paddingHorizontal: 18, justifyContent: "center" }}
          >
            <Text style={{ color: foreground, fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
            {item.formattedAddress ? (
              <Text numberOfLines={1} style={{ color: isDark ? "#99938A" : "#777169", marginTop: 2 }}>
                {item.formattedAddress}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
