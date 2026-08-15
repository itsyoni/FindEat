import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useActiveCountry } from "@/contexts/ActiveCountryContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { countryFlag, getCountryOptions, type CountryOption } from "@/lib/countries";
import { useToast } from "@/contexts/ToastContext";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { CheckCircleIcon, GlobeHemisphereWestIcon } from "phosphor-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CountryPickerScreen() {
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation(["settings", "common"]);
  const { showToast } = useToast();
  const { activeCountry, setActiveCountry } = useActiveCountry();
  const [query, setQuery] = useState("");
  const [selectingCode, setSelectingCode] = useState<string | null>(null);
  const countries = useMemo(
    () => getCountryOptions(i18n.language),
    [i18n.language],
  );
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(i18n.language);
    if (!normalized) return countries;
    return countries.filter(
      (country) =>
        country.name.toLocaleLowerCase(i18n.language).includes(normalized) ||
        country.code.toLowerCase().includes(normalized),
    );
  }, [countries, i18n.language, query]);

  async function selectCountry(country: CountryOption) {
    if (selectingCode) return;
    setSelectingCode(country.code);
    try {
      const resolved = await api.restaurants.searchCountries(
        country.name,
        i18n.language,
      );
      const match =
        resolved.find((item) => item.countryCode === country.code) ?? resolved[0];
      if (!match?.countryCode) throw new Error("Country could not be resolved");
      await setActiveCountry({
        code: match.countryCode,
        name: match.country ?? country.name,
        latitude: match.latitude,
        longitude: match.longitude,
        viewport: match.viewport,
      });
      router.back();
    } catch {
      showToast(t("settings:countrySelectionError"), { kind: "error" });
    } finally {
      setSelectingCode(null);
    }
  }

  const background = isDark ? "#0B0B0A" : "#FBFAF8";
  const foreground = isDark ? "#F6F3ED" : "#171614";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <DirectionalIcon direction="back" variant="arrow" size={24} color={foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", color: foreground, fontSize: 18, fontWeight: "700" }}>
          {t("settings:discoveryCountry")}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ marginHorizontal: 16, borderRadius: 16, backgroundColor: isDark ? "#211F1C" : "#EFECE6", paddingHorizontal: 14 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("settings:searchCountries")}
          placeholderTextColor={isDark ? "#8E8981" : "#807A72"}
          style={{ height: 48, color: foreground, fontSize: 16 }}
        />
      </View>
      {activeCountry ? (
        <Text style={{ marginHorizontal: 18, marginTop: 12, color: isDark ? "#B8B2A9" : "#6D675F" }}>
          {t("settings:currentCountry", { country: activeCountry.name })}
        </Text>
      ) : null}
      <Text style={{ marginHorizontal: 18, marginTop: 18, marginBottom: 6, color: isDark ? "#B8B2A9" : "#6D675F", fontSize: 13, fontWeight: "700" }}>
        {query.trim() ? t("settings:countryResults") : t("settings:allCountries")}
      </Text>
      <FlatList
        data={results}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void selectCountry(item)}
            style={{ minHeight: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center" }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "#211F1C" : "#EFECE6" }}>
              <Text style={{ fontSize: 22 }}>{countryFlag(item.code)}</Text>
            </View>
            <Text
              numberOfLines={2}
              style={{
                flex: 1,
                marginHorizontal: 12,
                color: foreground,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {item.name}
            </Text>
            {selectingCode === item.code ? (
              <ActivityIndicator color="#D97706" />
            ) : activeCountry?.code === item.code ? (
              <CheckCircleIcon size={23} color="#D97706" weight="fill" />
            ) : (
              <GlobeHemisphereWestIcon size={21} color={isDark ? "#777169" : "#A09A91"} />
            )}
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, marginHorizontal: 72, backgroundColor: isDark ? "#24211E" : "#E9E4DD" }} />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 56 }}>
            <GlobeHemisphereWestIcon size={44} color="#D97706" weight="duotone" />
            <Text style={{ marginTop: 12, color: foreground, fontWeight: "700" }}>{t("settings:noCountriesFound")}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
