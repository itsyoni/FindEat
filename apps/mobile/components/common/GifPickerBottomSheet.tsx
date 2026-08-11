import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export type GifSelection = {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
};

type GiphyImage = { url?: string; width?: string; height?: string };
type GiphyItem = {
  id: string;
  images?: { fixed_width?: GiphyImage; downsized?: GiphyImage; original?: GiphyImage };
};

type GifCategory = "RECENT" | "TRENDING" | "REACTIONS" | "FOOD" | "FUNNY" | "LOVE";

const RECENT_GIFS_KEY = "findeat:giphy:recent";
const MAX_RECENT_GIFS = 20;
const categorySearchTerms: Partial<Record<GifCategory, string>> = {
  REACTIONS: "reaction",
  FOOD: "food",
  FUNNY: "funny",
  LOVE: "love",
};

export default function GifPickerBottomSheet({
  open,
  onClose,
  onSelect,
  selecting = false,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (gif: GifSelection) => void;
  selecting?: boolean;
}) {
  const { t, i18n } = useTranslation("chat");
  const { isDark } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GifSelection[]>([]);
  const [recentItems, setRecentItems] = useState<GifSelection[]>([]);
  const [activeCategory, setActiveCategory] =
    useState<GifCategory>("TRENDING");
  const [loading, setLoading] = useState(false);
  const apiKey = process.env.EXPO_PUBLIC_GIPHY_API_KEY;

  const categories: { id: GifCategory; label: string }[] = [
    { id: "RECENT", label: t("gifRecent") },
    { id: "TRENDING", label: t("gifTrending") },
    { id: "REACTIONS", label: t("gifReactions") },
    { id: "FOOD", label: t("gifFood") },
    { id: "FUNNY", label: t("gifFunny") },
    { id: "LOVE", label: t("gifLove") },
  ];

  useEffect(() => {
    if (!open) return;
    let active = true;
    void AsyncStorage.getItem(RECENT_GIFS_KEY)
      .then((value) => {
        if (!active || !value) return;
        const parsed = JSON.parse(value) as GifSelection[];
        if (Array.isArray(parsed)) setRecentItems(parsed.slice(0, MAX_RECENT_GIFS));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !apiKey) return;
    const search = query.trim();
    if (!search && activeCategory === "RECENT") {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const categorySearch = categorySearchTerms[activeCategory] ?? "";
      const searchTerm = search || categorySearch;
      const endpoint = searchTerm ? "search" : "trending";
      const params = new URLSearchParams({
        api_key: apiKey,
        limit: "30",
        rating: "pg-13",
        bundle: "messaging_non_clips",
        ...(searchTerm ? { q: searchTerm, lang: i18n.language.startsWith("he") ? "he" : "en" } : {}),
      });
      void fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params.toString()}`)
        .then((response) => {
          if (!response.ok) throw new Error("GIPHY request failed");
          return response.json() as Promise<{ data?: GiphyItem[] }>;
        })
        .then((payload) => {
          if (cancelled) return;
          setItems(
            (payload.data ?? []).flatMap((item) => {
              const preview = item.images?.fixed_width ?? item.images?.downsized;
              const original = item.images?.downsized ?? item.images?.original;
              if (!preview?.url || !original?.url) return [];
              return [{
                id: item.id,
                url: original.url,
                previewUrl: preview.url,
                width: Number(original.width) || 480,
                height: Number(original.height) || 360,
              }];
            }),
          );
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, search ? 280 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeCategory, apiKey, i18n.language, open, query]);

  function selectGif(item: GifSelection) {
    setRecentItems((current) => {
      const next = [item, ...current.filter((gif) => gif.id !== item.id)].slice(
        0,
        MAX_RECENT_GIFS,
      );
      void AsyncStorage.setItem(RECENT_GIFS_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
    onSelect(item);
  }

  const displayedItems =
    activeCategory === "RECENT" && !query.trim() ? recentItems : items;
  const masonryGap = 6;
  const columnWidth = Math.max(1, (windowWidth - 32 - masonryGap) / 2);
  const gifColumns = useMemo(() => {
    const columns: [GifSelection[], GifSelection[]] = [[], []];
    const columnHeights = [0, 0];

    displayedItems.forEach((item) => {
      const ratio =
        Number.isFinite(item.width) &&
        Number.isFinite(item.height) &&
        item.width > 0 &&
        item.height > 0
          ? item.width / item.height
          : 1;
      const columnIndex = columnHeights[0] <= columnHeights[1] ? 0 : 1;
      columns[columnIndex].push(item);
      columnHeights[columnIndex] += columnWidth / ratio + masonryGap;
    });

    return columns;
  }, [columnWidth, displayedItems]);

  return (
    <AppBottomSheet
      open={open}
      snapPoints={["78%"]}
      stackBehavior="push"
      onClose={onClose}
    >
      <View className="flex-1 px-4 pb-5">
        <Text className="text-xl font-bold text-black dark:text-white">{t("chooseGif")}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchGifs")}
          placeholderTextColor="#9CA3AF"
          className="mt-3 rounded-2xl bg-gray-100 px-4 py-3 text-black dark:bg-gray-800 dark:text-white"
          style={{ fontFamily: "CabinetRegular" }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, height: 50 }}
          contentContainerStyle={{
            gap: 8,
            height: 50,
            alignItems: "center",
          }}
        >
          {categories.map((category) => {
            const selected = !query.trim() && activeCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => {
                  setQuery("");
                  setActiveCategory(category.id);
                  if (category.id === "RECENT") setLoading(false);
                }}
                className={`items-center justify-center rounded-full border px-4 ${
                  selected
                    ? "border-brand bg-brand"
                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                }`}
                style={{ height: 36 }}
              >
                <Text
                  className={`text-sm font-bold ${
                    selected ? "text-white" : "text-gray-700 dark:text-gray-200"
                  }`}
                  style={{ lineHeight: 18, textAlign: "center" }}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {!apiKey ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-gray-500">{t("giphyNotConfigured")}</Text>
          </View>
        ) : loading && displayedItems.length === 0 ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color="#FF5B35" /></View>
        ) : (
          <BottomSheetScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }}
          >
            {displayedItems.length > 0 ? (
              <View style={{ flexDirection: "row", gap: masonryGap }}>
                {gifColumns.map((column, columnIndex) => (
                  <View
                    key={columnIndex}
                    style={{ width: columnWidth, gap: masonryGap }}
                  >
                    {column.map((item) => {
                      const aspectRatio =
                        Number.isFinite(item.width) &&
                        Number.isFinite(item.height) &&
                        item.width > 0 &&
                        item.height > 0
                          ? item.width / item.height
                          : 1;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.82}
                          disabled={selecting}
                          onPress={() => selectGif(item)}
                          style={{
                            width: "100%",
                            aspectRatio,
                            overflow: "hidden",
                            borderRadius: 12,
                            backgroundColor: isDark ? "#1F2937" : "#E5E7EB",
                          }}
                        >
                          <Image
                            source={{ uri: item.previewUrl }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                          />
                          {selecting ? (
                            <View className="absolute inset-0 items-center justify-center bg-black/35">
                              <ActivityIndicator color="#FAF9F6" />
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            ) : !loading && activeCategory === "RECENT" && !query.trim() ? (
                <View className="items-center px-8 py-16">
                  <Text className="text-center text-gray-500">
                    {t("gifNoRecent")}
                  </Text>
                </View>
              ) : null}
          </BottomSheetScrollView>
        )}
        <Text className="pt-2 text-center text-xs font-bold text-gray-400">
          Powered by GIPHY
        </Text>
      </View>
    </AppBottomSheet>
  );
}
