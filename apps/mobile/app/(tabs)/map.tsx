import { EmptyState, Skeleton, SkeletonPulse } from "@/components/common";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import SearchBar from "@/components/common/inputs/SearchBar";
import Tabs from "@/components/common/Tabs";
import SearchResultsView from "@/components/search/SearchResultsView";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { getFreshDeviceLocation } from "@/lib/currentLocation";
import { mergeRestaurantSearchResults } from "@/lib/restaurantSearchResults";
import {
  DEFAULT_MAP_PREFERENCES,
  getMapPreferences,
  saveMapPreferences,
} from "@/lib/mapPreferences";
import {
  Restaurant,
  RestaurantMapFilter,
  RestaurantMapSort,
  PlaceListSummary,
  SelectedRestaurant,
} from "@findeat/types";
import type { MapViewMode } from "@findeat/types";
import type { LocationObject } from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Mapbox from "@rnmapbox/maps";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  CheckIcon,
  CrosshairIcon,
  FunnelIcon,
  FolderSimpleIcon,
  HeartIcon,
  StorefrontIcon,
  XIcon,
} from "phosphor-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import RestaurantStats from "@/components/restaurants/RestaurantStats";
import MapRestaurantListCard from "@/components/restaurants/MapRestaurantListCard";
import { useAuth } from "@/contexts/AuthContext";
import { useSaveToLists } from "@/contexts/SaveToListsContext";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");

// The marker is 48px wide. Cluster only when markers would substantially
// overlap, so nearby restaurants remain individually discoverable for longer.
const MARKER_CLUSTER_RADIUS = 42;

function projectCoordinate(longitude: number, latitude: number, zoom: number) {
  const worldSize = 256 * 2 ** zoom;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const sinLatitude = Math.min(
    Math.max(Math.sin(latitudeRadians), -0.9999),
    0.9999,
  );

  return {
    x: ((longitude + 180) / 360) * worldSize,
    y:
      (0.5 -
        Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      worldSize,
  };
}

function clusterRestaurants(restaurants: Restaurant[], zoom: number) {
  const points = restaurants.map((restaurant) => ({
    restaurant,
    ...projectCoordinate(
      restaurant.longitude as number,
      restaurant.latitude as number,
      zoom,
    ),
  }));
  const remaining = new Set(points.map((_, index) => index));
  const groups: {
    id: string;
    restaurants: Restaurant[];
    coordinate: [number, number];
  }[] = [];

  while (remaining.size > 0) {
    const firstIndex = remaining.values().next().value as number;
    remaining.delete(firstIndex);
    const memberIndexes = [firstIndex];
    const queue = [firstIndex];

    // Build connected groups. As the map zooms out, projected distances only
    // become smaller, so an existing cluster can merge with another cluster
    // but can never split or silently lose one of its restaurants.
    while (queue.length > 0) {
      const currentIndex = queue.shift() as number;
      const current = points[currentIndex];

      for (const candidateIndex of [...remaining]) {
        const candidate = points[candidateIndex];
        const distance = Math.hypot(
          current.x - candidate.x,
          current.y - candidate.y,
        );
        if (distance <= MARKER_CLUSTER_RADIUS) {
          remaining.delete(candidateIndex);
          memberIndexes.push(candidateIndex);
          queue.push(candidateIndex);
        }
      }
    }

    const members = memberIndexes.map((index) => points[index].restaurant);
    groups.push({
      id: members
        .map((restaurant) => restaurant.id)
        .sort()
        .join("-"),
      restaurants: members,
      coordinate: [
        members.reduce(
          (sum, restaurant) => sum + (restaurant.longitude as number),
          0,
        ) / members.length,
        members.reduce(
          (sum, restaurant) => sum + (restaurant.latitude as number),
          0,
        ) / members.length,
      ],
    });
  }

  return groups;
}

export default function MapScreen() {
  const { restaurantId, listId } = useLocalSearchParams<{
    restaurantId?: string;
    listId?: string;
  }>();
  const { t, i18n } = useTranslation(["common", "map", "restaurants"]);
  const { isDark } = useAppTheme();
  const { user } = useAuth();
  const { statusOverrides } = useSaveToLists();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<MapViewMode>("MAP");
  const [isSearching, setIsSearching] = useState(false);
  const [currentMapZoom, setCurrentMapZoom] = useState(13);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [placeLists, setPlaceLists] = useState<PlaceListSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<RestaurantMapFilter>(
    DEFAULT_MAP_PREFERENCES.filter,
  );
  const [mapSort, setMapSort] = useState<RestaurantMapSort>(
    DEFAULT_MAP_PREFERENCES.sort,
  );
  const [radiusKm, setRadiusKm] = useState<number | null>(
    DEFAULT_MAP_PREFERENCES.radiusKm,
  );
  const [matchDietary, setMatchDietary] = useState(
    DEFAULT_MAP_PREFERENCES.matchDietary,
  );
  const [matchCuisines, setMatchCuisines] = useState(
    DEFAULT_MAP_PREFERENCES.matchCuisines,
  );
  const [hideFlaggedAllergens, setHideFlaggedAllergens] = useState(
    DEFAULT_MAP_PREFERENCES.hideFlaggedAllergens,
  );
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const temporaryRestaurantIdRef = useRef<string | null>(null);
  const handledRestaurantIdRef = useRef<string | null>(null);
  const [selectedRestaurantState, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const selectedRestaurant = useMemo(() => {
    if (!selectedRestaurantState) return null;
    const status = statusOverrides[selectedRestaurantState.id];
    return status
      ? { ...selectedRestaurantState, userRestaurant: status }
      : selectedRestaurantState;
  }, [selectedRestaurantState, statusOverrides]);

  const cameraRef = useRef<Mapbox.Camera>(null);

  const [userLocation, setUserLocation] = useState<LocationObject | null>(null);
  const userLocationRef = useRef<LocationObject | null>(null);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      return () => {
        active = false;
      };
    }

    void getMapPreferences(user.id).then((preferences) => {
      if (!active) return;
      setMapFilter(preferences.filter);
      setMapSort(preferences.sort);
      setRadiusKm(preferences.radiusKm);
      setMatchDietary(preferences.matchDietary);
      setMatchCuisines(preferences.matchCuisines);
      setHideFlaggedAllergens(preferences.hideFlaggedAllergens);
      setFiltersHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!filtersHydrated || !listId) return;

    const timer = setTimeout(() => {
      setSelectedListId(listId);
      setMapFilter(DEFAULT_MAP_PREFERENCES.filter);
      setRadiusKm(DEFAULT_MAP_PREFERENCES.radiusKm);
      setMatchDietary(DEFAULT_MAP_PREFERENCES.matchDietary);
      setMatchCuisines(DEFAULT_MAP_PREFERENCES.matchCuisines);
      setHideFlaggedAllergens(
        DEFAULT_MAP_PREFERENCES.hideFlaggedAllergens,
      );
      setViewMode("MAP");
      router.setParams({ listId: undefined });
    }, 0);

    return () => clearTimeout(timer);
  }, [filtersHydrated, listId]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return undefined;

      let active = true;
      void api.placeLists
        .mine()
        .then((lists) => {
          if (active) setPlaceLists(lists);
        })
        .catch((error) => console.error("Could not load map folders", error));

      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  useEffect(() => {
    if (!filtersHydrated || !user?.id) return;

    void saveMapPreferences(user.id, {
      filter: mapFilter,
      sort: mapSort,
      radiusKm,
      matchDietary,
      matchCuisines,
      hideFlaggedAllergens,
    }).catch((error) => console.error("Could not save map filters:", error));
  }, [
    filtersHydrated,
    hideFlaggedAllergens,
    mapFilter,
    mapSort,
    matchCuisines,
    matchDietary,
    radiusKm,
    user?.id,
  ]);

  const mapRestaurants = useMemo(
    () =>
      restaurants.map((restaurant) => {
        const status = statusOverrides[restaurant.id];
        return status ? { ...restaurant, userRestaurant: status } : restaurant;
      }),
    [restaurants, statusOverrides],
  );

  const restaurantsWithLocation = useMemo(
    () =>
      mapRestaurants.filter(
        (restaurant) =>
          typeof restaurant.latitude === "number" &&
          typeof restaurant.longitude === "number",
      ),
    [mapRestaurants],
  );

  const restaurantMarkerGroups = useMemo(
    () => clusterRestaurants(restaurantsWithLocation, currentMapZoom),
    [currentMapZoom, restaurantsWithLocation],
  );

  const loadRestaurants = useCallback(async (coordinates?: { latitude: number; longitude: number }) => {
    try {
      const latitude = coordinates?.latitude ?? userLocationRef.current?.coords.latitude;
      const longitude = coordinates?.longitude ?? userLocationRef.current?.coords.longitude;
      if (
        (latitude === undefined || longitude === undefined) &&
        !selectedListId
      ) {
        if (
          restaurantId &&
          handledRestaurantIdRef.current !== restaurantId
        ) {
          const requestedRestaurant = await api.restaurants.get(restaurantId);
          setRestaurants([requestedRestaurant]);
          handledRestaurantIdRef.current = requestedRestaurant.id;
          temporaryRestaurantIdRef.current = requestedRestaurant.id;
          setSelectedRestaurant(requestedRestaurant);
          router.setParams({ restaurantId: undefined });
          if (
            typeof requestedRestaurant.latitude === "number" &&
            typeof requestedRestaurant.longitude === "number"
          ) {
            setTimeout(() => {
              cameraRef.current?.setCamera({
                centerCoordinate: [
                  requestedRestaurant.longitude as number,
                  requestedRestaurant.latitude as number,
                ],
                zoomLevel: 15,
                animationDuration: 600,
              });
            }, 150);
          }
        } else {
          setRestaurants([]);
        }
        return;
      }
      const nextRestaurants = await api.restaurants.discoverForMap({
        ...(latitude !== undefined && longitude !== undefined
          ? { latitude, longitude }
          : {}),
        radiusKm: radiusKm ?? undefined,
        limit: 200,
        listId: selectedListId ?? undefined,
        filter: mapFilter,
        sort: mapSort,
        matchDietary,
        matchCuisines,
        hideFlaggedAllergens,
      });

      const requestedId =
        restaurantId && handledRestaurantIdRef.current !== restaurantId
          ? restaurantId
          : undefined;
      let requestedRestaurant = requestedId
        ? nextRestaurants.find((restaurant) => restaurant.id === requestedId)
        : undefined;

      if (requestedId && !requestedRestaurant) {
        requestedRestaurant = await api.restaurants.get(requestedId);
        nextRestaurants.push(requestedRestaurant);
        temporaryRestaurantIdRef.current = requestedRestaurant.id;
      } else if (requestedRestaurant) {
        temporaryRestaurantIdRef.current = null;
      }

      setRestaurants(nextRestaurants);

      if (requestedRestaurant) {
        handledRestaurantIdRef.current = requestedRestaurant.id;
        setSelectedRestaurant(requestedRestaurant);
        setIsSearching(false);
        setViewMode("MAP");
        router.setParams({ restaurantId: undefined });

        if (
          typeof requestedRestaurant.latitude === "number" &&
          typeof requestedRestaurant.longitude === "number"
        ) {
          setTimeout(() => {
            cameraRef.current?.setCamera({
              centerCoordinate: [
                requestedRestaurant!.longitude as number,
                requestedRestaurant!.latitude as number,
              ],
              zoomLevel: 15,
              padding: {
                paddingBottom: 220,
                paddingTop: 80,
                paddingLeft: 40,
                paddingRight: 40,
              },
              animationDuration: 600,
            });
          }, 150);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [
    hideFlaggedAllergens,
    mapFilter,
    mapSort,
    matchCuisines,
    matchDietary,
    radiusKm,
    restaurantId,
    selectedListId,
  ]);

  useEffect(() => {
    if (!selectedListId || restaurantsWithLocation.length === 0) return;

    const timer = setTimeout(() => {
      if (restaurantsWithLocation.length === 1) {
        const restaurant = restaurantsWithLocation[0];
        cameraRef.current?.setCamera({
          centerCoordinate: [
            restaurant.longitude as number,
            restaurant.latitude as number,
          ],
          zoomLevel: 14,
          animationDuration: 600,
        });
        return;
      }

      const longitudes = restaurantsWithLocation.map(
        (restaurant) => restaurant.longitude as number,
      );
      const latitudes = restaurantsWithLocation.map(
        (restaurant) => restaurant.latitude as number,
      );
      cameraRef.current?.fitBounds(
        [Math.max(...longitudes), Math.max(...latitudes)],
        [Math.min(...longitudes), Math.min(...latitudes)],
        [90, 50, 180, 50],
        650,
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [restaurantsWithLocation, selectedListId]);

  const dismissRestaurantPreview = useCallback(() => {
    setSelectedRestaurant(null);
    handledRestaurantIdRef.current = null;

    const temporaryId = temporaryRestaurantIdRef.current;
    if (temporaryId) {
      setRestaurants((current) =>
        current.filter((restaurant) => restaurant.id !== temporaryId),
      );
      temporaryRestaurantIdRef.current = null;
    }
  }, []);

  const loadUserLocation = useCallback(async () => {
    try {
      const location = await getFreshDeviceLocation();

      if (!location) return null;

      userLocationRef.current = location;
      setUserLocation(location);
      return location;
    } catch (error) {
      console.error("Could not get current location:", error);
      return null;
    }
  }, []);

  const returnToUserLocation = useCallback(async () => {
    const location = await loadUserLocation();
    if (!location) return;

    bottomSheetRef.current?.close();
    dismissRestaurantPreview();
    cameraRef.current?.setCamera({
      centerCoordinate: [
        location.coords.longitude,
        location.coords.latitude,
      ],
      zoomLevel: 14,
      animationDuration: 650,
      animationMode: "flyTo",
    });
  }, [dismissRestaurantPreview, loadUserLocation]);

  useFocusEffect(
    useCallback(() => {
      if (!filtersHydrated || listId) return undefined;

      let active = true;
      void (async () => {
        const location =
          userLocationRef.current ?? (await loadUserLocation());
        if (!active) return;

        await loadRestaurants(
          location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }
            : undefined,
        );
      })();

      return () => {
        active = false;
      };
    }, [
      filtersHydrated,
      listId,
      loadRestaurants,
      loadUserLocation,
    ]),
  );

  useFocusEffect(
    useCallback(
      () => () => {
        dismissRestaurantPreview();
      },
      [dismissRestaurantPreview],
    ),
  );

  function selectRestaurant(restaurant: Restaurant) {
    const temporaryId = temporaryRestaurantIdRef.current;
    if (temporaryId && temporaryId !== restaurant.id) {
      setRestaurants((current) =>
        current.filter((item) => item.id !== temporaryId),
      );
      temporaryRestaurantIdRef.current = null;
    }

    setSelectedRestaurant(restaurant);
    void hydrateSelectedRestaurant(restaurant);
    setIsSearching(false);
    setViewMode("MAP");

    if (
      typeof restaurant.latitude !== "number" ||
      typeof restaurant.longitude !== "number"
    ) {
      return;
    }

    setTimeout(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: [
          restaurant.longitude as number,
          restaurant.latitude as number,
        ],
        zoomLevel: 15,
        animationDuration: 600,
      });
    }, 100);
  }

  async function hydrateSelectedRestaurant(restaurant: Restaurant) {
    try {
      const details = await api.restaurants.get(restaurant.id);
      const hydrated = {
        ...details,
        userRestaurant: restaurant.userRestaurant ?? details.userRestaurant,
      };
      setSelectedRestaurant((current) =>
        current?.id === restaurant.id ? hydrated : current,
      );
      setRestaurants((current) =>
        current.map((item) => (item.id === restaurant.id ? hydrated : item)),
      );
    } catch (error) {
      console.error("Could not load restaurant preview", error);
    }
  }

  const searchRestaurantsForMap = useCallback(
    async (query: string) => {
      const location = userLocationRef.current;
      const response = await api.restaurants.search(query, {
        ...(location
          ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }
          : {}),
        languageCode: i18n.resolvedLanguage ?? i18n.language,
      });
      return mergeRestaurantSearchResults(response, query);
    },
    [i18n.language, i18n.resolvedLanguage],
  );

  async function selectMapSearchResult(item: SelectedRestaurant) {
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
            });

      setRestaurants((current) =>
        current.some((candidate) => candidate.id === restaurant.id)
          ? current
          : [...current, restaurant],
      );
      temporaryRestaurantIdRef.current = restaurant.id;
      selectRestaurant(restaurant);
    } catch (error) {
      console.error("Could not open restaurant search result", error);
      Alert.alert(t("common:error"), t("common:somethingWentWrong"));
    }
  }

  function renderRestaurantSearchResult(item: SelectedRestaurant) {
    const restaurant = item.source === "FINDEAT" ? item.restaurant : item;
    return (
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
        <Avatar
          uri={item.source === "FINDEAT" ? item.restaurant.logoUrl : null}
          username={restaurant.name}
          size={52}
          fallbackType="restaurant"
        />
        <View className="ml-3 min-w-0 flex-1">
          <View className="flex-row items-center">
            <Text
              numberOfLines={1}
              className="shrink text-base font-bold text-black dark:text-white"
            >
              {restaurant.name}
            </Text>
            {item.source === "FINDEAT" ? (
              <RestaurantBadge status={item.restaurant.status} />
            ) : null}
          </View>
          {restaurant.address || restaurant.city ? (
            <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
              {[restaurant.address, restaurant.city].filter(Boolean).join(", ")}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const selectedReviews =
    selectedRestaurant?.posts?.filter((post) => post.type === "REVIEW") ?? [];
  const selectedRatings = selectedReviews
    .map((post) => post.rating)
    .filter((rating): rating is number => rating != null);
  const selectedAverageRating =
    selectedRestaurant?.averageRating ?? (selectedRatings.length > 0
      ? selectedRatings.reduce((total, rating) => total + rating, 0) /
        selectedRatings.length
        : null);
  const activeFilterCount = [
    mapFilter !== "ALL",
    selectedListId !== null,
    radiusKm !== null,
    matchDietary,
    matchCuisines,
    hideFlaggedAllergens,
  ].filter(Boolean).length;
  const selectedList = placeLists.find((list) => list.id === selectedListId);

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      {isSearching ? (
        <Animated.View
          key="search"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          className="flex-1"
        >
          <SearchResultsView
            searchRequest={searchRestaurantsForMap}
            placeholder={t("map:searchRestaurants")}
            emptyText={t("map:noRestaurantsFound")}
            keyExtractor={(item) =>
              item.source === "FINDEAT"
                ? `findeat-${item.restaurant.id}`
                : `google-${item.googlePlaceId}`
            }
            onCancel={() => setIsSearching(false)}
            onSelect={(item) => void selectMapSearchResult(item)}
            renderItem={renderRestaurantSearchResult}
          />
        </Animated.View>
      ) : (
        <Animated.View
          key="normal"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          className="flex-1"
        >
          <SearchBar
            editable={false}
            placeholder={t("common:search")}
            onPress={() => { if (!loading) setIsSearching(true); }}
            rightAccessory={
              <TouchableOpacity
                onPress={() => setFiltersOpen(true)}
                className="relative h-full aspect-square items-center justify-center rounded-2xl bg-ink"
              >
                <FunnelIcon
                  size={21}
                  color="#FAF9F6"
                  weight="fill"
                />
                {activeFilterCount > 0 ? (
                  <View className="absolute -right-1 -top-1 h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-brand px-1 dark:border-black">
                    <Text className="text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            }
          />

          <Tabs
            activeTab={viewMode}
            onChange={setViewMode}
            tabs={[
              { label: t("map:map"), value: "MAP" },
              { label: t("map:list"), value: "LIST" },
            ]}
          />

          {loading ? (
            <SkeletonPulse style={{ flex: 1 }}>
              <View className="flex-1 bg-[#E8E4DD] dark:bg-[#171719]">
                <Skeleton width={48} height={48} circle style={{ position: "absolute", left: "18%", top: "20%" }} />
                <Skeleton width={48} height={48} circle style={{ position: "absolute", right: "18%", top: "33%" }} />
                <Skeleton width={48} height={48} circle style={{ position: "absolute", left: "42%", top: "51%" }} />
                <Skeleton width={48} height={48} circle style={{ position: "absolute", left: "15%", bottom: "18%" }} />
                <Skeleton width={48} height={48} circle style={{ position: "absolute", right: "12%", bottom: "12%" }} />
              </View>
            </SkeletonPulse>
          ) : viewMode === "MAP" ? (
            <View style={{ flex: 1 }}>
              <Mapbox.MapView
                style={{ flex: 1 }}
                styleURL={
                  isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street
                }
                onCameraChanged={(state) => {
                  // Re-cluster while the gesture is happening so markers never
                  // lag behind the visible zoom. Quantizing to 0.2 zoom steps
                  // avoids a React update for every native camera frame.
                  const nextZoom = Math.round(state.properties.zoom * 5) / 5;
                  setCurrentMapZoom((current) =>
                    current === nextZoom ? current : nextZoom,
                  );
                }}
                onPress={() => {
                  bottomSheetRef.current?.close();
                  dismissRestaurantPreview();
                }}
              >
                <Mapbox.Camera
                  ref={cameraRef}
                  zoomLevel={userLocation ? 13 : 1.5}
                  animationDuration={0}
                  centerCoordinate={[
                    userLocation?.coords.longitude ?? 0,
                    userLocation?.coords.latitude ?? 20,
                  ]}
                />
                <Mapbox.UserLocation visible />

                {restaurantMarkerGroups.map((group) => {
                  if (group.restaurants.length > 1) {
                    return (
                      <Mapbox.MarkerView
                        key={`cluster-${group.id}`}
                        coordinate={group.coordinate}
                        anchor={{ x: 0.5, y: 0.5 }}
                        allowOverlap
                        allowOverlapWithPuck
                      >
                        <TouchableOpacity
                          activeOpacity={0.82}
                          onPress={() => {
                            bottomSheetRef.current?.close();
                            setSelectedRestaurant(null);
                            cameraRef.current?.setCamera({
                              centerCoordinate: group.coordinate,
                              zoomLevel: Math.min(currentMapZoom + 2, 17),
                              animationDuration: 450,
                            });
                          }}
                          className="h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-[#212121]"
                          style={{
                            shadowColor: "#0B0B0A",
                            shadowOpacity: 0.24,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 5,
                          }}
                        >
                          <Text className="text-sm font-bold text-white">
                            {group.restaurants.length}
                          </Text>
                        </TouchableOpacity>
                      </Mapbox.MarkerView>
                    );
                  }

                  const restaurant = group.restaurants[0];
                  const isSelected = selectedRestaurant?.id === restaurant.id;
                  const isFavorite = !!restaurant.userRestaurant?.favorite;
                  const isVisited = !!restaurant.userRestaurant?.visited;
                  const isWantToTry = !!restaurant.userRestaurant?.wantToTry;
                  const markerColor = isSelected
                    ? "#111827"
                    : isFavorite
                      ? "#EF4444"
                      : isVisited
                        ? "#22C55E"
                        : isWantToTry
                          ? "#EAB308"
                          : "#6B7280";

                  return (
                    <Mapbox.MarkerView
                      key={restaurant.id}
                      coordinate={[
                        restaurant.longitude as number,
                        restaurant.latitude as number,
                      ]}
                      anchor={{ x: 0.5, y: 0.5 }}
                      allowOverlap
                      allowOverlapWithPuck
                      isSelected={isSelected}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => selectRestaurant(restaurant)}
                        style={{
                          width: isSelected ? 52 : 48,
                          height: isSelected ? 52 : 48,
                          borderRadius: isSelected ? 26 : 24,
                          borderWidth: isSelected ? 4 : 3,
                          borderColor: markerColor,
                          backgroundColor: isDark ? "#111827" : "#FAF9F6",
                          padding: 3,
                          shadowColor: "#0B0B0A",
                          shadowOpacity: 0.22,
                          shadowRadius: 4,
                          shadowOffset: { width: 0, height: 2 },
                          elevation: 5,
                        }}
                      >
                        <Avatar
                          uri={restaurant.logoUrl}
                          username={restaurant.name}
                          fallbackType="restaurant"
                          size={isSelected ? 38 : 36}
                        />
                        {(isFavorite || isVisited) && (
                          <View
                            pointerEvents="none"
                            style={{
                              position: "absolute",
                              inset: isSelected ? 7 : 6,
                              borderRadius: isSelected ? 19 : 18,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isFavorite
                                ? "rgba(239, 68, 68, 0.42)"
                                : "rgba(34, 197, 94, 0.42)",
                            }}
                          >
                            {isFavorite ? (
                              <HeartIcon size={19} color="#FAF9F6" weight="fill" />
                            ) : (
                              <CheckIcon size={20} color="#FAF9F6" weight="bold" />
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    </Mapbox.MarkerView>
                  );
                })}
              </Mapbox.MapView>

              {selectedRestaurant && (
                <BottomSheet
                  ref={bottomSheetRef}
                  index={0}
                  snapPoints={["50%", "70%"]}
                  enablePanDownToClose
                  onClose={dismissRestaurantPreview}
                  backgroundStyle={{
                    backgroundColor: isDark ? "#111827" : "#FAF9F6",
                    borderRadius: 28,
                    overflow: "hidden",
                  }}
                  handleIndicatorStyle={{
                    backgroundColor: isDark ? "#6B7280" : "#D1D5DB",
                    width: 44,
                  }}
                >
                  <BottomSheetView className="px-5 pb-6">
                    <TouchableOpacity
                      onPress={() => bottomSheetRef.current?.close()}
                      className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-2 dark:bg-gray-800"
                    >
                      <XIcon size={18} color="#6B7280" weight="bold" />
                    </TouchableOpacity>

                    <View className="flex-row items-center pt-2">
                      <Avatar
                        uri={selectedRestaurant.logoUrl}
                        username={selectedRestaurant.name}
                        size={56}
                        fallbackType="restaurant"
                      />

                      <View className="ml-4 flex-1 pr-8">
                        <View className="flex-row items-center">
                          <Text className="text-lg font-bold text-black dark:text-white">{selectedRestaurant.name}</Text>
                          <RestaurantBadge status={selectedRestaurant.status} />
                        </View>

                        <View className="mt-2 flex-row flex-wrap gap-2">
                          {selectedRestaurant.userRestaurant?.favorite && (
                            <View className="rounded-full bg-red-100 px-3 py-1">
                              <Text className="text-xs font-bold text-red-500">
                                {t("restaurants:favorite")}
                              </Text>
                            </View>
                          )}

                          {selectedRestaurant.userRestaurant?.visited && (
                            <View className="rounded-full bg-green-100 px-3 py-1">
                              <Text className="text-xs font-bold text-green-600">
                                {t("restaurants:visited")}
                              </Text>
                            </View>
                          )}

                          {selectedRestaurant.userRestaurant?.wantToTry && (
                            <View className="rounded-full bg-yellow-100 px-3 py-1">
                              <Text className="text-xs font-bold text-yellow-700">
                                {t("restaurants:wantToTry")}
                              </Text>
                            </View>
                          )}
                        </View>

                        {(selectedRestaurant.address || selectedRestaurant.city) && (
                          <Text className="mt-2 text-gray-500">
                            {[selectedRestaurant.address, selectedRestaurant.city]
                              .filter(Boolean)
                              .join(", ")}
                          </Text>
                        )}
                      </View>
                    </View>

                    {!!selectedRestaurant.bio && (
                      <Text numberOfLines={3} className="mt-4 leading-5 text-gray-600 dark:text-gray-300">
                        {selectedRestaurant.bio}
                      </Text>
                    )}

                    <RestaurantStats
                      averageRating={selectedAverageRating}
                      reviewsCount={
                        selectedRestaurant.reviewsCount ?? selectedReviews.length
                      }
                      followersCount={selectedRestaurant.followersCount ?? 0}
                    />

                    <TouchableOpacity
                      className="mt-4 rounded-2xl bg-black py-3 dark:bg-white"
                      onPress={() => {
                        const selectedId = selectedRestaurant.id;
                        dismissRestaurantPreview();
                        router.push({
                          pathname: "/restaurants/[id]",
                          params: { id: selectedId },
                        });
                      }}
                    >
                      <Text className="text-center font-bold text-white dark:text-black">
                        {t("map:viewRestaurant")}
                      </Text>
                    </TouchableOpacity>
                  </BottomSheetView>
                </BottomSheet>
              )}

              <TouchableOpacity
                onPress={() => void returnToUserLocation()}
                className={`absolute right-3 h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-800 ${
                  selectedRestaurant ? "bottom-82.5" : "bottom-2"
                }`}
              >
                <CrosshairIcon
                  size={22}
                  color={isDark ? "#FAF9F6" : "#111"}
                  weight="fill"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              className="bg-canvas dark:bg-black"
              data={restaurants}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
              ListHeaderComponent={
                <View className="flex-row items-end justify-between px-4 pb-4 pt-5">
                  <View className="flex-1 pr-3">
                    <Text className="text-2xl font-bold text-black dark:text-white">
                      {selectedList
                        ? t("map:placesInFolder", {
                            name: selectedList.name,
                          })
                        : t("map:placesNearYou")}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      {t(`map:sort${mapSort}`)}
                    </Text>
                  </View>
                  <View className="rounded-full bg-[#EEE9DF] px-3 py-2 dark:bg-gray-900">
                    <Text className="text-xs font-bold text-black dark:text-white">
                      {t("map:placesFound", { count: restaurants.length })}
                    </Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <EmptyState
                  icon={StorefrontIcon}
                  title={t("map:noRestaurantsFound")}
                  description={t("map:noPlacesDescription")}
                />
              }
              renderItem={({ item }) => (
                <MapRestaurantListCard
                  restaurant={item}
                  onOpen={() =>
                    router.push({
                      pathname: "/restaurants/[id]",
                      params: { id: item.id },
                    })
                  }
                  onShowOnMap={() => selectRestaurant(item)}
                />
              )}
            />
          )}
        </Animated.View>
      )}

      <AppBottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        snapPoints={["88%"]}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-black dark:text-white">
              {t("map:filters")}
            </Text>
            {activeFilterCount > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setMapFilter(DEFAULT_MAP_PREFERENCES.filter);
                  setMapSort(DEFAULT_MAP_PREFERENCES.sort);
                  setRadiusKm(DEFAULT_MAP_PREFERENCES.radiusKm);
                  setMatchDietary(DEFAULT_MAP_PREFERENCES.matchDietary);
                  setMatchCuisines(DEFAULT_MAP_PREFERENCES.matchCuisines);
                  setHideFlaggedAllergens(
                    DEFAULT_MAP_PREFERENCES.hideFlaggedAllergens,
                  );
                  setSelectedListId(null);
                }}
                className="rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800"
              >
                <Text className="text-sm font-bold text-brand">
                  {t("map:resetFilters")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text className="mb-2 mt-5 font-bold text-black dark:text-white">
            {t("map:show")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(["ALL", "SAVED", "WANT_TO_TRY", "VISITED", "FAVORITE", "CLAIMED"] as RestaurantMapFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setMapFilter(filter)}
                className={`flex-row items-center rounded-full px-4 py-2.5 ${
                  mapFilter === filter
                    ? "bg-black dark:bg-white"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                {mapFilter === filter && (
                  <CheckIcon size={14} color={isDark ? "#0B0B0A" : "#FAF9F6"} weight="bold" />
                )}
                <Text className={`font-bold ${mapFilter === filter ? "ml-1.5 text-white dark:text-black" : "text-black dark:text-white"}`}>
                  {t(`map:filter${filter}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="mb-2 mt-6 font-bold text-black dark:text-white">
            {t("map:folder")}
          </Text>
          <View className="gap-2">
            <TouchableOpacity
              onPress={() => setSelectedListId(null)}
              className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3.5 dark:bg-gray-800"
            >
              <View className="flex-1 flex-row items-center">
                <FolderSimpleIcon
                  size={20}
                  color={selectedListId === null ? "#D6A92D" : "#9CA3AF"}
                  weight={selectedListId === null ? "fill" : "regular"}
                />
                <Text className="ml-3 font-semibold text-black dark:text-white">
                  {t("map:allFolders")}
                </Text>
              </View>
              {selectedListId === null ? (
                <CheckIcon size={18} color={isDark ? "#FAF9F6" : "#111"} weight="bold" />
              ) : null}
            </TouchableOpacity>
            {placeLists.map((list) => {
              const selected = selectedListId === list.id;
              return (
                <TouchableOpacity
                  key={list.id}
                  onPress={() => setSelectedListId(list.id)}
                  className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3.5 dark:bg-gray-800"
                >
                  <View className="min-w-0 flex-1 flex-row items-center">
                    <FolderSimpleIcon
                      size={20}
                      color={selected ? "#D6A92D" : "#9CA3AF"}
                      weight={selected ? "fill" : "regular"}
                    />
                    <Text
                      numberOfLines={1}
                      className="ml-3 min-w-0 flex-1 font-semibold text-black dark:text-white"
                    >
                      {list.name}
                    </Text>
                    <Text className="ml-2 text-xs text-gray-500">
                      {t("map:folderPlaces", { count: list.itemCount })}
                    </Text>
                  </View>
                  {selected ? (
                    <CheckIcon
                      size={18}
                      color={isDark ? "#FAF9F6" : "#111"}
                      weight="bold"
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="mb-2 mt-6 font-bold text-black dark:text-white">
            {t("map:personalized")}
          </Text>
          <Text className="mb-3 text-sm leading-5 text-gray-500 dark:text-gray-400">
            {t("map:personalizedHint")}
          </Text>
          <View className="gap-2">
            {[
              {
                key: "dietary",
                value: matchDietary,
                onPress: () => setMatchDietary((current) => !current),
                label: t("map:matchDietary"),
              },
              {
                key: "cuisines",
                value: matchCuisines,
                onPress: () => setMatchCuisines((current) => !current),
                label: t("map:matchCuisines"),
              },
              {
                key: "allergens",
                value: hideFlaggedAllergens,
                onPress: () =>
                  setHideFlaggedAllergens((current) => !current),
                label: t("map:hideFlaggedAllergens"),
              },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={option.onPress}
                className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3.5 dark:bg-gray-800"
              >
                <Text className="flex-1 pr-3 font-semibold text-black dark:text-white">
                  {option.label}
                </Text>
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full ${
                    option.value
                      ? "bg-emerald-600"
                      : "border-2 border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {option.value && (
                    <CheckIcon size={14} color="#FAF9F6" weight="bold" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="mb-2 mt-6 font-bold text-black dark:text-white">
            {t("map:distance")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {([null, 10, 50, 100, 200] as (number | null)[]).map((distance) => (
              <TouchableOpacity
                key={distance ?? "any"}
                onPress={() => setRadiusKm(distance)}
                className={`min-w-[30%] flex-1 items-center rounded-xl px-3 py-3 ${radiusKm === distance ? "bg-black dark:bg-white" : "bg-gray-100 dark:bg-gray-800"}`}
              >
                <Text className={`font-bold ${radiusKm === distance ? "text-white dark:text-black" : "text-black dark:text-white"}`}>
                  {distance === null ? t("map:anyDistance") : `${distance} km`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="mb-2 mt-6 font-bold text-black dark:text-white">
            {t("map:sortBy")}
          </Text>
          <View className="gap-2">
            {(["BEST", "DISTANCE", "RATING", "MOST_REVIEWED"] as RestaurantMapSort[]).map((sort) => (
              <TouchableOpacity
                key={sort}
                onPress={() => setMapSort(sort)}
                className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
              >
                <Text className="font-semibold text-black dark:text-white">
                  {t(`map:sort${sort}`)}
                </Text>
                {mapSort === sort && <CheckIcon size={18} color={isDark ? "#FAF9F6" : "#111"} weight="bold" />}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setFiltersOpen(false)}
            className="mt-7 rounded-2xl bg-black py-4 dark:bg-white"
          >
            <Text className="text-center font-bold text-white dark:text-black">
              {t("map:showPlaces")}
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </AppBottomSheet>
    </SafeAreaView>
  );
}
