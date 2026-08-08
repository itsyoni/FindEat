import Avatar from "@/components/common/Avatar";
import { EmptyState, Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import PlaceListCard from "@/components/lists/PlaceListCard";
import PlaceStatusBookmark, { getPlaceStatusLabelKey } from "@/components/restaurants/PlaceStatusBookmark";
import { SavedPostCard } from "@/app/settings/saved-posts";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useSaveToLists } from "@/contexts/SaveToListsContext";
import { api } from "@/lib/api";
import type { PlaceListSummary, SavedPostAttribution, SavedRestaurant } from "@findeat/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { BookmarkSimpleIcon, FolderSimpleIcon, ImagesIcon, PlusIcon } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type SavedTab = "places" | "lists" | "posts";

function SavedSkeleton() {
  return (
    <SkeletonPulse style={{ padding: 16, gap: 12 }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index} className="flex-row items-center rounded-2xl bg-white p-3 dark:bg-gray-950">
          <Skeleton width={54} height={54} radius={27} />
          <View className="ml-3 flex-1 gap-2">
            <Skeleton width="58%" height={15} radius={7} />
            <Skeleton width="38%" height={11} radius={6} />
          </View>
          <Skeleton width={42} height={42} radius={14} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

function SavedPlaceRow({ item }: { item: SavedRestaurant }) {
  const { t } = useTranslation(["common", "restaurants"]);
  const { openManageSavedPlace, statusOverrides, savedListCounts } = useSaveToLists();
  const status = statusOverrides[item.restaurant.id] ?? item;
  const label = getPlaceStatusLabelKey(status.wantToTry, status.visited, status.favorite);

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={() => router.push(`/restaurants/${item.restaurant.id}`)}
      className="mb-3 flex-row items-center rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-900 dark:bg-gray-950"
    >
      <Avatar
        uri={item.restaurant.logoUrl}
        username={item.restaurant.name}
        size={54}
        fallbackType="restaurant"
      />
      <View className="ml-3 min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-bold text-black dark:text-white">
          {item.restaurant.name}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
          {item.restaurant.city || item.restaurant.address || t("common:savedPlace")}
        </Text>
        <Text className="mt-1 text-xs font-bold text-amber-600">
          {t(`restaurants:${label}`)}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("common:manageSavedPlace")}
        onPress={() =>
          openManageSavedPlace({
            restaurantId: item.restaurant.id,
            currentStatus: status,
          })
        }
        className="h-11 w-11 items-center justify-center"
      >
        <PlaceStatusBookmark
          wantToTry={status.wantToTry}
          visited={status.visited}
          favorite={status.favorite}
          size={27}
          defaultColor="#6B7280"
          savedListCount={savedListCounts[item.restaurant.id]}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SavedHubScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab: SavedTab = tab === "lists" || tab === "posts" ? tab : "places";
  const [activeTab, setActiveTab] = useState<SavedTab>(initialTab);
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const places = useQuery({ queryKey: ["saved-restaurants"], queryFn: () => api.restaurants.savedMine() });
  const lists = useQuery({ queryKey: ["place-lists"], queryFn: () => api.placeLists.mine() });
  const posts = useQuery({ queryKey: ["saved-post-attributions"], queryFn: () => api.restaurants.savedPostsMine() });

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["saved-restaurants"] });
      void queryClient.invalidateQueries({ queryKey: ["place-lists"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-post-attributions"] });
    }, [queryClient]),
  );

  const tabs = useMemo(
    () => [
      { value: "places" as const, label: t("savedPlaces"), Icon: BookmarkSimpleIcon },
      { value: "lists" as const, label: t("lists"), Icon: FolderSimpleIcon },
      { value: "posts" as const, label: t("fromPosts"), Icon: ImagesIcon },
    ],
    [t],
  );

  const loading = activeTab === "places" ? places.isLoading : activeTab === "lists" ? lists.isLoading : posts.isLoading;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FAF9F6" : "#171717"} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">{t("saved")}</Text>
        {activeTab === "lists" ? (
          <TouchableOpacity onPress={() => router.push({ pathname: "/saved-lists", params: { create: "1" } })} className="h-11 w-11 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950">
            <PlusIcon size={21} color="#8B5CF6" weight="bold" />
          </TouchableOpacity>
        ) : <View className="h-11 w-11" />}
      </View>

      <View className="mx-4 mb-3 flex-row rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
        {tabs.map(({ value, label, Icon }) => {
          const selected = activeTab === value;
          return (
            <TouchableOpacity key={value} onPress={() => setActiveTab(value)} className={`flex-1 flex-row items-center justify-center rounded-xl py-2.5 ${selected ? "bg-white dark:bg-gray-800" : ""}`}>
              <Icon size={16} color={selected ? "#D97706" : "#6B7280"} weight={selected ? "fill" : "regular"} />
              <Text numberOfLines={1} className={`ml-1.5 text-xs font-bold ${selected ? "text-black dark:text-white" : "text-gray-500"}`}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? <SavedSkeleton /> : activeTab === "places" ? (
        <FlatList<SavedRestaurant>
          key="saved-places"
          data={places.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 30 }}
          renderItem={({ item }) => <SavedPlaceRow item={item} />}
          ListEmptyComponent={<EmptyState icon={BookmarkSimpleIcon} title={t("noSavedPlaces")} description={t("noSavedPlacesHint")} />}
        />
      ) : activeTab === "lists" ? (
        <FlatList<PlaceListSummary>
          key="saved-lists"
          data={lists.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 30 }}
          renderItem={({ item }) => <PlaceListCard list={item} onPress={() => router.push({ pathname: "/saved-lists/[id]", params: { id: item.id } })} />}
          ListEmptyComponent={<EmptyState icon={FolderSimpleIcon} title={t("noLists")} description={t("noListsHint")} />}
        />
      ) : (
        <FlatList<SavedPostAttribution>
          key="saved-posts"
          data={posts.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 14, paddingBottom: 36 }}
          renderItem={({ item }) => <SavedPostCard item={item} />}
          ListEmptyComponent={<EmptyState icon={ImagesIcon} title={t("noSavedSources")} description={t("noSavedSourcesHint")} />}
        />
      )}
    </SafeAreaView>
  );
}
