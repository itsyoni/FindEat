import { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Text from "../common/AppText";
import TextInput from "../common/inputs/AppTextInput";
import type { SelectedAddress } from "@findeat/types";
import { useTranslation } from "react-i18next";

type MapboxFeature = {
  id: string;
  place_name: string;
  center: [number, number];
  text?: string;
  context?: {
    id: string;
    text: string;
  }[];
};

type Props = {
  onSelect: (address: SelectedAddress) => void;
};

export default function AddressAutocomplete({ onSelect }: Props) {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    if (!query.trim() || query === selectedText) return;

    const timeout = setTimeout(() => {
      const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

      if (!token) {
        console.error("Missing Mapbox access token");
        return;
      }

      const encodedQuery = encodeURIComponent(query);
      const language = encodeURIComponent(
        i18n.resolvedLanguage ?? i18n.language ?? "en",
      );
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json` +
        `?access_token=${token}` +
        `&autocomplete=true` +
        `&language=${language}` +
        `&types=address,poi,place`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => setResults(data.features ?? []))
        .catch(console.error);
    }, 350);

    return () => clearTimeout(timeout);
  }, [i18n.language, i18n.resolvedLanguage, query, selectedText]);

  function getCity(feature: MapboxFeature) {
    const context = feature.context ?? [];

    const place = context.find((item) => item.id.startsWith("place."));
    const region = context.find((item) => item.id.startsWith("region."));

    return place?.text ?? region?.text;
  }

  function handleSelect(feature: MapboxFeature) {
    const [longitude, latitude] = feature.center;

    const selected: SelectedAddress = {
      id: feature.id,
      placeName: feature.place_name,
      address: feature.place_name,
      city: getCity(feature),
      latitude,
      longitude,
    };

    setSelectedText(feature.place_name);
    setQuery(feature.place_name);
    setResults([]);

    onSelect(selected);
  }

  return (
    <View className="mt-4">
      <TextInput
        className="rounded-2xl border border-gray-200 px-4 py-4 text-base text-black"
        placeholder="Search address..."
        placeholderTextColor="#9CA3AF"
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setResults([]);
        }}
      />

      {results.length > 0 && (
        <View className="mt-2 rounded-2xl border border-gray-100 bg-white">
          {results.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="border-b border-gray-100 p-4"
              onPress={() => handleSelect(item)}
            >
              <Text className="font-semibold text-black">
                {item.place_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
