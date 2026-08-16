import { CommentsBottomSheet } from "@/components/common";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import Tabs from "@/components/common/Tabs";
import PostOptionsBottomSheet from "@/components/chats/PostOptionsBottomSheet";
import SharePostBottomSheet from "@/components/chats/share/SharePostBottomSheet";
import ContentFeed from "@/components/posts/content/ContentFeed";
import MapRestaurantListCard from "@/components/restaurants/MapRestaurantListCard";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
  updatePostInFeedCache,
  updateRestaurantStatusInFeedCache,
  useAreaFeed,
} from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import type { PlaceListDetail, Restaurant } from "@findeat/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import Mapbox from "@rnmapbox/maps";
import { router, useLocalSearchParams } from "expo-router";
import { MapPinIcon, StorefrontIcon } from "phosphor-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");

type DiscoveryMode = "FEED" | "MAP" | "LIST";

export default function DiscoverListPlacesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const camera = useRef<Mapbox.Camera>(null);
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [mode, setMode] = useState<DiscoveryMode>("FEED");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [feedHeight, setFeedHeight] = useState(0);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void AsyncStorage.getItem(`trip-discovery-mode.${id}`).then((stored) => {
      if (stored === "FEED" || stored === "MAP" || stored === "LIST") setMode(stored);
    });
    void api.placeLists.get(id).then((value) => {
      setList(value);
      setSavedIds(new Set(value.items.map((item) => item.restaurant.id)));
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void AsyncStorage.setItem(`trip-discovery-mode.${id}`, mode);
  }, [id, mode]);

  useEffect(() => {
    if (!list || list.eventLocationLatitude == null || list.eventLocationLongitude == null) return;
    const bounds = list.destinationBounds;
    void api.restaurants
      .discoverForMap({
        latitude: list.stayLocation?.latitude ?? list.eventLocationLatitude,
        longitude: list.stayLocation?.longitude ?? list.eventLocationLongitude,
        radiusKm: bounds ? undefined : 40,
        limit: 200,
        countryCode: list.destinationCountryCode ?? undefined,
        ...(bounds ?? {}),
      })
      .then(setRestaurants)
      .catch(() => setRestaurants([]));
  }, [list]);

  const area =
    list?.eventLocationLatitude != null && list.eventLocationLongitude != null
      ? {
          id: list.id,
          latitude: list.eventLocationLatitude,
          longitude: list.eventLocationLongitude,
          radiusKm: list.destinationBounds ? 200 : 40,
          countryCode: list.destinationCountryCode,
          bounds: list.destinationBounds,
        }
      : null;
  const feed = useAreaFeed("CONTENT", area);
  const posts = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );

  async function addToTrip(restaurantId: string, sourcePostId?: string) {
    if (!id) return;
    try {
      await api.placeLists.addRestaurant(id, restaurantId, sourcePostId);
      setSavedIds((current) => new Set(current).add(restaurantId));
      updateRestaurantStatusInFeedCache(queryClient, restaurantId, {
        wantToTry: true,
      });
      showToast(
        t("placeAddedToFolder", {
          name: list?.name ?? t("savedPlaces"),
        }),
        { kind: "success" },
      );
    } catch {
      Alert.alert(t("savePlaceError"));
    }
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    updatePostInFeedCache(queryClient, (post) =>
      post.id === postId
        ? {
            ...post,
            isLiked: !isLiked,
            likesCount: Math.max(0, post.likesCount + (isLiked ? -1 : 1)),
          }
        : post,
    );
    try {
      await api.posts.toggleLike(postId, isLiked);
    } catch {
      await feed.refetch();
    }
  }

  async function deletePost(postId: string) {
    try {
      await api.posts.delete(postId);
      updatePostInFeedCache(queryClient, (post) =>
        post.id === postId ? null : post,
      );
      return true;
    } catch {
      return false;
    }
  }

  function updateCount(postId: string, field: "commentsCount" | "sharesCount") {
    updatePostInFeedCache(queryClient, (post) =>
      post.id === postId
        ? { ...post, [field]: (post[field] ?? 0) + 1 }
        : post,
    );
  }

  const background = isDark ? "#0B0B0A" : "#FBFAF8";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FAF9F6" : "#171717"} />
        </TouchableOpacity>
        <View className="min-w-0 flex-1 items-center">
          <Text numberOfLines={1} className="text-lg font-bold text-black dark:text-white">{list?.name ?? t("addPlaces")}</Text>
          {list?.eventLocation ? <Text numberOfLines={1} className="text-xs text-gray-500">{list.eventLocation}</Text> : null}
        </View>
        <View className="h-11 w-11" />
      </View>

      <Tabs
        activeTab={mode}
        onChange={setMode}
        tabs={[
          { label: "Feed", value: "FEED" },
          { label: "Map", value: "MAP" },
          { label: "List", value: "LIST" },
        ]}
      />

      {mode === "FEED" ? (
        <View
          className="flex-1"
          onLayout={(event) => setFeedHeight(event.nativeEvent.layout.height)}
        >
          {feedHeight > 0 ? (
            <ContentFeed
              posts={posts}
              height={feedHeight}
              refreshing={feed.isRefetching && !feed.isFetchingNextPage}
              onRefresh={() => void feed.refetch()}
              onEndReached={() => {
                if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
              }}
              loadingMore={feed.isFetchingNextPage}
              loading={feed.isPending || !list}
              onToggleLike={(postId, liked) => void toggleLike(postId, liked)}
              onOpenComments={setSelectedPostId}
              onToggleWantToTry={(postId, restaurantId) => void addToTrip(restaurantId, postId)}
              useExternalBookmarkHandler
              externalSavedRestaurantIds={savedIds}
              onDeletePost={(postId) => void deletePost(postId)}
              onOpenSharePost={setSharePostId}
              onOpenPostOptions={setOptionsPostId}
            />
          ) : null}
        </View>
      ) : mode === "MAP" ? (
        <View className="flex-1">
          <Mapbox.MapView
            style={{ flex: 1 }}
            styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street}
            onLongPress={(feature) => {
              if (!id || list?.eventType !== "TRIP") return;
              const coordinates = feature.geometry.coordinates;
              if (!Array.isArray(coordinates) || coordinates.length < 2) return;
              const [longitude, latitude] = coordinates as [number, number];
              void api.placeLists
                .update(id, {
                  stayName: "Pinned stay",
                  stayLatitude: latitude,
                  stayLongitude: longitude,
                  staySource: "MAP",
                })
                .then(setList);
            }}
          >
            <Mapbox.Camera
              ref={camera}
              defaultSettings={{
                centerCoordinate: [list?.eventLocationLongitude ?? 0, list?.eventLocationLatitude ?? 0],
                zoomLevel: 11,
              }}
            />
            {restaurants.filter((restaurant) => restaurant.latitude != null && restaurant.longitude != null).map((restaurant) => (
              <Mapbox.PointAnnotation
                key={restaurant.id}
                id={`trip-${restaurant.id}`}
                coordinate={[restaurant.longitude!, restaurant.latitude!]}
                onSelected={() => router.push({ pathname: "/restaurants/[id]", params: { id: restaurant.id } })}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand">
                  <MapPinIcon size={18} color="#FAF9F6" weight="fill" />
                </View>
              </Mapbox.PointAnnotation>
            ))}
            {list?.stayLocation ? (
              <Mapbox.PointAnnotation
                id="trip-stay"
                coordinate={[list.stayLocation.longitude, list.stayLocation.latitude]}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-violet-600">
                  <Text className="text-lg">⌂</Text>
                </View>
              </Mapbox.PointAnnotation>
            ) : null}
          </Mapbox.MapView>
          {list?.eventType === "TRIP" && !list.stayLocation ? (
            <View pointerEvents="none" className="absolute left-5 right-5 top-4 items-center">
              <View className="rounded-full bg-black/70 px-4 py-2">
                <Text className="text-xs font-bold text-white">Long press to pin where you’re staying</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(restaurant) => restaurant.id}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 14,
            paddingBottom: 36,
          }}
          renderItem={({ item }) => (
            <MapRestaurantListCard
              restaurant={item}
              onOpen={() => router.push({ pathname: "/restaurants/[id]", params: { id: item.id } })}
              onShowOnMap={() => setMode("MAP")}
              onAdd={() => void addToTrip(item.id)}
              added={savedIds.has(item.id)}
            />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 py-16">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
                <StorefrontIcon size={30} color="#D97706" weight="duotone" />
              </View>
              <Text className="mt-4 text-center text-lg font-bold text-black dark:text-white">
                {t("noResultsFound")}
              </Text>
              <Text className="mt-2 text-center leading-5 text-gray-500 dark:text-gray-400">
                {t("noPlacesToAddHint")}
              </Text>
            </View>
          }
        />
      )}

      <PostOptionsBottomSheet postId={optionsPostId} onClose={() => setOptionsPostId(null)} onDelete={deletePost} />
      <SharePostBottomSheet postId={sharePostId} onClose={() => setSharePostId(null)} onShared={(postId) => updateCount(postId, "sharesCount")} />
      <CommentsBottomSheet postId={selectedPostId} onClose={() => setSelectedPostId(null)} onCommentAdded={(postId) => updateCount(postId, "commentsCount")} />
    </SafeAreaView>
  );
}
