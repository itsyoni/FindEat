import { CommentsBottomSheet } from "@/components/common";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import TextInput from "@/components/common/inputs/AppTextInput";
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
import { getFreshDeviceLocation } from "@/lib/currentLocation";
import { mergeRestaurantSearchResults } from "@/lib/restaurantSearchResults";
import type { PlaceListDetail, Restaurant, SelectedRestaurant } from "@findeat/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import Mapbox from "@rnmapbox/maps";
import { router, useLocalSearchParams } from "expo-router";
import {
  BedIcon,
  CalendarBlankIcon,
  CheckIcon,
  CrosshairIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NavigationArrowIcon,
  PencilSimpleIcon,
  PlusIcon,
  StorefrontIcon,
} from "phosphor-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");

type DiscoveryMode = "FEED" | "MAP" | "LIST";

export default function DiscoverListPlacesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation("common");
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
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSearchResults, setPlaceSearchResults] = useState<SelectedRestaurant[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [addingPlaceKey, setAddingPlaceKey] = useState<string | null>(null);
  const [addedGooglePlaceIds, setAddedGooglePlaceIds] = useState<Set<string>>(
    new Set(),
  );
  const [stayInfoOpen, setStayInfoOpen] = useState(false);

  async function returnToMyLocation() {
    try {
      const location = await getFreshDeviceLocation();
      if (!location) return;
      camera.current?.setCamera({
        centerCoordinate: [
          location.coords.longitude,
          location.coords.latitude,
        ],
        zoomLevel: 14,
        animationDuration: 600,
        animationMode: "flyTo",
      });
    } catch (error) {
      console.error("Could not return to current location", error);
    }
  }

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

  useEffect(() => {
    const query = placeQuery.trim();
    if ((mode !== "MAP" && mode !== "LIST") || query.length < 2) return;
    let active = true;
    const timeout = setTimeout(() => {
      setSearchingPlaces(true);
      void api.restaurants
        .search(query, {
          ...(list?.eventLocationLatitude != null &&
          list.eventLocationLongitude != null
            ? {
                latitude: list.eventLocationLatitude,
                longitude: list.eventLocationLongitude,
              }
            : {}),
          languageCode: i18n.resolvedLanguage ?? i18n.language,
          countryCode: list?.destinationCountryCode ?? undefined,
        })
        .then((response) => {
          if (active) {
            setPlaceSearchResults(
              mergeRestaurantSearchResults(response, query),
            );
          }
        })
        .catch(() => {
          if (active) setPlaceSearchResults([]);
        })
        .finally(() => {
          if (active) setSearchingPlaces(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [i18n.language, i18n.resolvedLanguage, list, mode, placeQuery]);

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
    if (!id) return false;
    try {
      const updatedList = await api.placeLists.addRestaurant(
        id,
        restaurantId,
        sourcePostId,
      );
      setList(updatedList);
      setSavedIds(
        new Set(updatedList.items.map((item) => item.restaurant.id)),
      );
      updateRestaurantStatusInFeedCache(queryClient, restaurantId, {
        wantToTry: true,
      });
      showToast(
        t("placeAddedToFolder", {
          name: list?.name ?? t("savedPlaces"),
        }),
        { kind: "success" },
      );
      return true;
    } catch {
      Alert.alert(t("savePlaceError"));
      return false;
    }
  }

  function searchResultKey(item: SelectedRestaurant) {
    return item.source === "FINDEAT"
      ? `findeat-${item.restaurant.id}`
      : `google-${item.googlePlaceId}`;
  }

  async function addSearchResult(item: SelectedRestaurant) {
    const key = searchResultKey(item);
    if (addingPlaceKey) return;
    setAddingPlaceKey(key);
    try {
      const restaurant =
        item.source === "FINDEAT"
          ? item.restaurant
          : await api.restaurants.fromGoogle({
              name: item.name,
              address: item.address,
              latitude: item.latitude,
              longitude: item.longitude,
              googlePlaceId: item.googlePlaceId,
              listId: id,
            });
      const added = await addToTrip(restaurant.id);
      if (!added) return;
      if (item.source === "GOOGLE") {
        setAddedGooglePlaceIds((current) =>
          new Set(current).add(item.googlePlaceId),
        );
      }
      setRestaurants((current) =>
        current.some((existing) => existing.id === restaurant.id)
          ? current
          : [...current, restaurant],
      );
    } catch {
      showToast(t("savePlaceError"), { kind: "error" });
    } finally {
      setAddingPlaceKey(null);
    }
  }

  function renderPlaceSearchResult(item: SelectedRestaurant) {
    const restaurant =
      item.source === "FINDEAT" ? item.restaurant : item;
    const key = searchResultKey(item);
    const added =
      item.source === "FINDEAT"
        ? savedIds.has(item.restaurant.id)
        : addedGooglePlaceIds.has(item.googlePlaceId);
    const latitude =
      item.source === "FINDEAT" ? item.restaurant.latitude : item.latitude;
    const longitude =
      item.source === "FINDEAT" ? item.restaurant.longitude : item.longitude;

    return (
      <View className="flex-row items-center border-b border-gray-100 px-3 py-3 dark:border-gray-800">
        <TouchableOpacity
          activeOpacity={0.75}
          disabled={mode !== "MAP" || latitude == null || longitude == null}
          onPress={() => {
            if (latitude == null || longitude == null) return;
            camera.current?.setCamera({
              centerCoordinate: [longitude, latitude],
              zoomLevel: 15,
              animationDuration: 500,
            });
          }}
          className="min-w-0 flex-1 flex-row items-center"
        >
          <Avatar
            uri={item.source === "FINDEAT" ? item.restaurant.logoUrl : null}
            username={restaurant.name}
            fallbackType="restaurant"
            size={44}
          />
          <View className="ml-3 min-w-0 flex-1">
            <Text numberOfLines={1} className="font-bold text-black dark:text-white">
              {restaurant.name}
            </Text>
            {restaurant.address || restaurant.city ? (
              <Text numberOfLines={1} className="mt-1 text-xs text-gray-500">
                {[restaurant.address, restaurant.city].filter(Boolean).join(", ")}
              </Text>
            ) : null}
            {item.source === "GOOGLE" ? (
              <Text className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                New to FindEat
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={added || addingPlaceKey === key}
          onPress={() => void addSearchResult(item)}
          className={`ml-3 h-10 w-10 items-center justify-center rounded-full ${added ? "bg-green-100 dark:bg-green-950" : "bg-amber-100 dark:bg-amber-950"}`}
        >
          {addingPlaceKey === key ? (
            <ActivityIndicator size="small" color="#D97706" />
          ) : added ? (
            <CheckIcon size={18} color="#16A34A" weight="bold" />
          ) : (
            <PlusIcon size={18} color="#D97706" weight="bold" />
          )}
        </TouchableOpacity>
      </View>
    );
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

      {mode === "MAP" || mode === "LIST" ? (
        <View className="px-4 pb-3 pt-2">
          <TextInput
            value={placeQuery}
            onChangeText={(value) => {
              setPlaceQuery(value);
              if (value.trim().length < 2) {
                setPlaceSearchResults([]);
                setSearchingPlaces(false);
              }
            }}
            placeholder="Search restaurants"
            autoCorrect={false}
            returnKeyType="search"
            className="h-12 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            style={{ height: 48, paddingVertical: 0 }}
            leftIcon={<MagnifyingGlassIcon size={19} color="#9CA3AF" />}
            rightIcon={
              searchingPlaces ? (
                <ActivityIndicator size="small" color="#D97706" />
              ) : undefined
            }
          />
        </View>
      ) : null}

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
            {placeQuery.trim().length >= 2
              ? placeSearchResults.map((item) => {
                  const restaurant =
                    item.source === "FINDEAT" ? item.restaurant : item;
                  const latitude = restaurant.latitude;
                  const longitude = restaurant.longitude;
                  if (latitude == null || longitude == null) return null;
                  return (
                    <Mapbox.PointAnnotation
                      key={`search-${searchResultKey(item)}`}
                      id={`search-${searchResultKey(item)}`}
                      coordinate={[longitude, latitude]}
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-amber-600">
                        <StorefrontIcon size={17} color="#FAF9F6" weight="fill" />
                      </View>
                    </Mapbox.PointAnnotation>
                  );
                })
              : null}
            {list?.stayLocation ? (
              <Mapbox.PointAnnotation
                id="trip-stay"
                coordinate={[list.stayLocation.longitude, list.stayLocation.latitude]}
                onSelected={() => setStayInfoOpen(true)}
              >
                <View
                  className="h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-gray-900"
                  style={{
                    shadowColor: "#171717",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.24,
                    shadowRadius: 7,
                    elevation: 7,
                  }}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-500 dark:border-amber-300">
                    <BedIcon size={22} color="#171717" weight="fill" />
                  </View>
                </View>
              </Mapbox.PointAnnotation>
            ) : null}
            <Mapbox.UserLocation visible />
          </Mapbox.MapView>
          {placeQuery.trim().length < 2 ? (
            <TouchableOpacity
              onPress={() => void returnToMyLocation()}
              className="absolute right-3 top-3 h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg dark:bg-gray-800"
            >
              <CrosshairIcon
                size={22}
                color={isDark ? "#FAF9F6" : "#171717"}
                weight="fill"
              />
            </TouchableOpacity>
          ) : null}
          {placeQuery.trim().length >= 2 ? (
            <View
              className="absolute left-3 right-3 top-3 max-h-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <FlatList
                data={placeSearchResults}
                keyExtractor={searchResultKey}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => renderPlaceSearchResult(item)}
                ListEmptyComponent={
                  searchingPlaces ? (
                    <ActivityIndicator className="my-8" color="#D97706" />
                  ) : (
                    <Text className="px-5 py-8 text-center text-gray-500">
                      {t("noResultsFound")}
                    </Text>
                  )
                }
              />
            </View>
          ) : null}
        </View>
      ) : placeQuery.trim().length >= 2 ? (
        <FlatList
          data={placeSearchResults}
          keyExtractor={searchResultKey}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
          renderItem={({ item }) => renderPlaceSearchResult(item)}
          ListEmptyComponent={
            searchingPlaces ? (
              <ActivityIndicator className="mt-10" color="#D97706" />
            ) : (
              <View className="flex-1 items-center justify-center px-8 py-16">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
                  <StorefrontIcon size={30} color="#D97706" weight="duotone" />
                </View>
                <Text className="mt-4 text-center text-lg font-bold text-black dark:text-white">
                  {t("noResultsFound")}
                </Text>
              </View>
            )
          }
        />
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

      <AppBottomSheet
        open={stayInfoOpen && Boolean(list?.stayLocation)}
        onClose={() => setStayInfoOpen(false)}
        snapPoints={[list?.eventAt || list?.eventLocation ? "52%" : "38%"]}
      >
        <BottomSheetView className="flex-1 px-5 pb-7 pt-1">
          {list?.stayLocation ? (
            <>
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-500">
                    <BedIcon size={25} color="#171717" weight="fill" />
                  </View>
                </View>
                <Text className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  Your stay
                </Text>
                <Text numberOfLines={2} className="mt-1 text-center text-xl font-bold text-black dark:text-white">
                  {list.stayLocation.name}
                </Text>
                <Text className="mt-2 px-5 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
                  This location is used for nearby restaurant suggestions and trip distances.
                </Text>
              </View>

              {list.eventAt || list.eventLocation ? (
                <View className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  {list.eventAt ? (
                    <View className="flex-row items-center px-4 py-3.5">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                        <CalendarBlankIcon size={18} color="#D97706" weight="fill" />
                      </View>
                      <View className="ml-3 min-w-0 flex-1">
                        <Text className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          Stay dates
                        </Text>
                        <Text numberOfLines={1} className="mt-0.5 font-bold text-black dark:text-white">
                          {new Intl.DateTimeFormat(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(list.eventAt))}
                          {list.eventEndAt
                            ? ` – ${new Intl.DateTimeFormat(undefined, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }).format(new Date(list.eventEndAt))}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {list.eventLocation ? (
                    <View className={`flex-row items-center px-4 py-3.5 ${list.eventAt ? "border-t border-gray-200 dark:border-gray-800" : ""}`}>
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                        <MapPinIcon size={18} color="#D97706" weight="fill" />
                      </View>
                      <View className="ml-3 min-w-0 flex-1">
                        <Text className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          Trip destination
                        </Text>
                        <Text numberOfLines={1} className="mt-0.5 font-bold text-black dark:text-white">
                          {list.eventLocation}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View className="mt-5 flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setStayInfoOpen(false);
                    camera.current?.setCamera({
                      centerCoordinate: [
                        list.stayLocation!.longitude,
                        list.stayLocation!.latitude,
                      ],
                      zoomLevel: 15,
                      animationDuration: 500,
                    });
                  }}
                  className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950"
                >
                  <NavigationArrowIcon size={18} color="#D97706" weight="fill" />
                  <Text className="ml-2 font-bold text-amber-700 dark:text-amber-300">
                    Show on map
                  </Text>
                </TouchableOpacity>
                {list.canEdit ? (
                  <TouchableOpacity
                    onPress={() => {
                      setStayInfoOpen(false);
                      router.push({
                        pathname: "/saved-lists/edit/[id]",
                        params: { id: list.id },
                      });
                    }}
                    className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
                  >
                    <PencilSimpleIcon size={18} color={isDark ? "#FAF9F6" : "#171717"} weight="bold" />
                    <Text className="ml-2 font-bold text-black dark:text-white">
                      Change stay
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : null}
        </BottomSheetView>
      </AppBottomSheet>

      <PostOptionsBottomSheet postId={optionsPostId} onClose={() => setOptionsPostId(null)} onDelete={deletePost} />
      <SharePostBottomSheet postId={sharePostId} onClose={() => setSharePostId(null)} onShared={(postId) => updateCount(postId, "sharesCount")} />
      <CommentsBottomSheet postId={selectedPostId} onClose={() => setSelectedPostId(null)} onCommentAdded={(postId) => updateCount(postId, "commentsCount")} />
    </SafeAreaView>
  );
}
