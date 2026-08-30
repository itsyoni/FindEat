import { EmptyState, Skeleton, SkeletonPulse } from "@/components/common";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import SearchBar from "@/components/common/inputs/SearchBar";
import Tabs from "@/components/common/Tabs";
import SearchResultsView from "@/components/search/SearchResultsView";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { getFreshDeviceLocation } from "@/lib/currentLocation";
import { mergeRestaurantSearchResults } from "@/lib/restaurantSearchResults";
import { recordVisitDetectionMapUse } from "@/lib/visitDetection/engagement";
import {
  DEFAULT_MAP_PREFERENCES,
  getMapPreferences,
  saveMapPreferences,
} from "@/lib/mapPreferences";
import {
  Restaurant,
  RestaurantMapFilter,
  RestaurantMapSort,
  PlaceListDetail,
  PlaceListSummary,
  SelectedRestaurant,
  CityFilterLocation,
  RestaurantActivityHeatPoint,
  RestaurantHotspotActivity,
  RestaurantHotspotActivityItem,
  RestaurantBadgeKey,
} from "@findeat/types";
import type { MapViewMode } from "@findeat/types";
import type { LocationObject } from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Switch, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Mapbox from "@rnmapbox/maps";
import BottomSheet, {
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  CheckIcon,
  BedIcon,
  CrosshairIcon,
  FunnelIcon,
  FolderSimpleIcon,
  HeartIcon,
  FireIcon,
  CheersIcon,
  CaretDownIcon,
  CaretUpIcon,
  MapPinIcon,
  PlayIcon,
  PlusIcon,
  StorefrontIcon,
  XIcon,
} from "phosphor-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import RestaurantStats from "@/components/restaurants/RestaurantStats";
import MapRestaurantListCard from "@/components/restaurants/MapRestaurantListCard";
import HappyHourBadge, {
  getActiveHappyHour,
} from "@/components/restaurants/HappyHourBadge";
import SystemPlaceListCover from "@/components/lists/SystemPlaceListCover";
import { useAuth } from "@/contexts/AuthContext";
import { useSaveToLists } from "@/contexts/SaveToListsContext";
import { useActiveCountry } from "@/contexts/ActiveCountryContext";
import {
  addMapRecentSearch,
  clearMapRecentSearches,
  getMapRecentSearches,
  type MapRecentSearch,
} from "@/lib/mapRecentSearches";
import { userDisplayName } from "@/lib/userIdentity";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");

// The marker is 48px wide. Cluster only when markers would substantially
// overlap, so nearby restaurants remain individually discoverable for longer.
const MARKER_CLUSTER_RADIUS = 42;
const COLLAPSED_FOLDER_LIMIT = 5;

type MapSearchResult = MapRecentSearch;

function markerClusterRadius(zoom: number) {
  if (zoom >= 20) return 4;
  if (zoom >= 19) return 8;
  if (zoom >= 18) return 14;
  if (zoom >= 17) return 26;
  return MARKER_CLUSTER_RADIUS;
}

function formatActivityDate(value: string, language: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(
    language.startsWith("he") ? "he-IL" : "en-US",
    {
      month: "short",
      day: "numeric",
    },
  ).format(date);
}

function pointInRing(
  longitude: number,
  latitude: number,
  ring: [number, number][],
) {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects =
      y > latitude !== previousY > latitude &&
      longitude <
        ((previousX - x) * (latitude - y)) / (previousY - y || Number.EPSILON) +
          x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(
  longitude: number,
  latitude: number,
  polygon: [number, number][][],
) {
  if (!polygon[0] || !pointInRing(longitude, latitude, polygon[0]))
    return false;
  return !polygon
    .slice(1)
    .some((hole) => pointInRing(longitude, latitude, hole));
}

function cityContainsCoordinate(
  city: CityFilterLocation,
  longitude: number,
  latitude: number,
) {
  if (city.boundary?.type === "Polygon") {
    return pointInPolygon(longitude, latitude, city.boundary.coordinates);
  }
  if (city.boundary?.type === "MultiPolygon") {
    return city.boundary.coordinates.some((polygon) =>
      pointInPolygon(longitude, latitude, polygon),
    );
  }
  const { southwest, northeast } = city.viewport;
  const longitudeInside =
    southwest[0] <= northeast[0]
      ? longitude >= southwest[0] && longitude <= northeast[0]
      : longitude >= southwest[0] || longitude <= northeast[0];
  return (
    longitudeInside && latitude >= southwest[1] && latitude <= northeast[1]
  );
}

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
      (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      worldSize,
  };
}

function clusterRestaurants(restaurants: Restaurant[], zoom: number) {
  const clusterRadius = markerClusterRadius(zoom);
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
        if (distance <= clusterRadius) {
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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeCountry, refreshDetectedCountry } = useActiveCountry();
  const { statusOverrides } = useSaveToLists();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<MapViewMode>("MAP");
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [recentMapSearches, setRecentMapSearches] = useState<MapRecentSearch[]>(
    [],
  );
  const [isCitySearching, setIsCitySearching] = useState(false);
  const [selectedCities, setSelectedCities] = useState<CityFilterLocation[]>(
    [],
  );
  const [selectedCluster, setSelectedCluster] = useState<Restaurant[] | null>(
    null,
  );
  const selectedCitiesRef = useRef<CityFilterLocation[]>([]);
  const areaToFocusRef = useRef<CityFilterLocation | null>(null);
  const cityLoadRequestRef = useRef(0);
  const [currentMapZoom, setCurrentMapZoom] = useState(13);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [placeLists, setPlaceLists] = useState<PlaceListSummary[]>([]);
  const [foldersExpanded, setFoldersExpanded] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedListDetails, setSelectedListDetails] = useState<
    PlaceListDetail[]
  >([]);
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
  const [selectedBadgeKeys, setSelectedBadgeKeys] = useState<
    RestaurantBadgeKey[]
  >(DEFAULT_MAP_PREFERENCES.badgeKeys);
  const [activityHeatmapEnabled, setActivityHeatmapEnabled] = useState(
    DEFAULT_MAP_PREFERENCES.activityHeatmapEnabled,
  );
  const [activityHeatPoints, setActivityHeatPoints] = useState<
    RestaurantActivityHeatPoint[]
  >([]);
  const [hotspotRestaurant, setHotspotRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [hotspotActivity, setHotspotActivity] =
    useState<RestaurantHotspotActivity | null>(null);
  const [hotspotLoading, setHotspotLoading] = useState(false);
  const hotspotRequestRef = useRef<string | null>(null);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const temporaryRestaurantIdRef = useRef<string | null>(null);
  const handledRestaurantIdRef = useRef<string | null>(null);
  const restaurantFocusActiveRef = useRef(false);
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
  const hasCenteredOnUserRef = useRef(false);
  const userMovedMapRef = useRef(false);

  const [userLocation, setUserLocation] = useState<LocationObject | null>(null);
  const userLocationRef = useRef<LocationObject | null>(null);

  useEffect(() => {
    if (restaurantId) restaurantFocusActiveRef.current = true;
  }, [restaurantId]);

  useEffect(() => {
    if (user?.id) void recordVisitDetectionMapUse(user.id);
  }, [user?.id]);

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
      setActivityHeatmapEnabled(preferences.activityHeatmapEnabled);
      setSelectedBadgeKeys(preferences.badgeKeys);
      setFiltersHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(() => {
      void getMapRecentSearches(user.id).then((items) =>
        setRecentMapSearches(
          items.filter(
            (item) => item.source !== "AREA" || item.areaType !== "COUNTRY",
          ),
        ),
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [user?.id]);

  useEffect(() => {
    if (!filtersHydrated || !listId) return;

    const timer = setTimeout(() => {
      setRestaurants([]);
      setSelectedListIds([listId]);
      setSelectedCities([]);
      setMapFilter(DEFAULT_MAP_PREFERENCES.filter);
      setRadiusKm(DEFAULT_MAP_PREFERENCES.radiusKm);
      setMatchDietary(DEFAULT_MAP_PREFERENCES.matchDietary);
      setMatchCuisines(DEFAULT_MAP_PREFERENCES.matchCuisines);
      setHideFlaggedAllergens(DEFAULT_MAP_PREFERENCES.hideFlaggedAllergens);
      setViewMode("MAP");
      router.setParams({ listId: undefined });
    }, 0);

    return () => clearTimeout(timer);
  }, [filtersHydrated, listId]);

  useEffect(() => {
    if (selectedListIds.length === 0) return;

    let active = true;
    void Promise.all(selectedListIds.map((id) => api.placeLists.get(id)))
      .then((lists) => {
        if (active) setSelectedListDetails(lists);
      })
      .catch((error) =>
        console.error("Could not load selected map folders", error),
      );

    return () => {
      active = false;
    };
  }, [selectedListIds]);

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
      activityHeatmapEnabled,
      badgeKeys: selectedBadgeKeys,
    }).catch((error) => console.error("Could not save map filters:", error));
  }, [
    filtersHydrated,
    hideFlaggedAllergens,
    activityHeatmapEnabled,
    selectedBadgeKeys,
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

  const visibleRestaurants = useMemo(
    () =>
      selectedCities.length === 0
        ? mapRestaurants
        : mapRestaurants.filter(
            (restaurant) =>
              typeof restaurant.latitude === "number" &&
              typeof restaurant.longitude === "number" &&
              selectedCities.some((city) =>
                cityContainsCoordinate(
                  city,
                  restaurant.longitude as number,
                  restaurant.latitude as number,
                ),
              ),
          ),
    [mapRestaurants, selectedCities],
  );
  const listRestaurants = useMemo(() => {
    const query = listSearchQuery.trim().toLocaleLowerCase();
    if (!query) return visibleRestaurants;
    return visibleRestaurants.filter((restaurant) =>
      [restaurant.name, restaurant.address, restaurant.city]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [listSearchQuery, visibleRestaurants]);
  const heatmapRestaurantIds = useMemo(
    () => visibleRestaurants.map((restaurant) => restaurant.id).sort(),
    [visibleRestaurants],
  );
  const heatmapRestaurantIdsKey = heatmapRestaurantIds.join(",");

  useEffect(() => {
    if (!heatmapRestaurantIdsKey) return;
    let active = true;
    void api.restaurants
      .activityHeatmap(heatmapRestaurantIds)
      .then((points) => {
        if (active) setActivityHeatPoints(points);
      })
      .catch((error) =>
        console.error("Could not load activity heatmap", error),
      );
    return () => {
      active = false;
    };
  }, [heatmapRestaurantIds, heatmapRestaurantIdsKey]);

  const visibleActivityHeatPoints = useMemo(() => {
    if (!heatmapRestaurantIdsKey) return [];
    const restaurantIds = new Set(heatmapRestaurantIds);
    return activityHeatPoints.filter((point) =>
      restaurantIds.has(point.restaurantId),
    );
  }, [activityHeatPoints, heatmapRestaurantIds, heatmapRestaurantIdsKey]);

  const activityHeatmapShape = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: (activityHeatmapEnabled ? visibleActivityHeatPoints : []).map(
        (point) => ({
          type: "Feature" as const,
          id: point.restaurantId,
          properties: { weight: point.weight },
          geometry: {
            type: "Point" as const,
            coordinates: [point.longitude, point.latitude],
          },
        }),
      ),
    }),
    [activityHeatmapEnabled, visibleActivityHeatPoints],
  );
  const activityPointByRestaurantId = useMemo(
    () =>
      new Map(
        visibleActivityHeatPoints.map(
          (point) => [point.restaurantId, point] as const,
        ),
      ),
    [visibleActivityHeatPoints],
  );
  const selectedCityRequestKey = selectedCities
    .map((city) => `${city.googlePlaceId}:${city.latitude}:${city.longitude}`)
    .join("|");

  useEffect(() => {
    selectedCitiesRef.current = selectedCities;
  }, [selectedCities]);

  const restaurantsWithLocation = useMemo(() => {
    const locatedRestaurants = visibleRestaurants.filter(
      (restaurant) =>
        typeof restaurant.latitude === "number" &&
        typeof restaurant.longitude === "number",
    );

    // A restaurant opened directly from its profile must remain visible even
    // when it sits outside the active discovery country/city filters. It is
    // removed again by dismissRestaurantPreview when the sheet is closed.
    if (
      selectedRestaurant &&
      typeof selectedRestaurant.latitude === "number" &&
      typeof selectedRestaurant.longitude === "number" &&
      !locatedRestaurants.some(
        (restaurant) => restaurant.id === selectedRestaurant.id,
      )
    ) {
      return [...locatedRestaurants, selectedRestaurant];
    }

    return locatedRestaurants;
  }, [selectedRestaurant, visibleRestaurants]);

  const selectedFolderStays = useMemo(
    () =>
      selectedListDetails.flatMap((list) => {
        if (!selectedListIds.includes(list.id) || !list.stayLocation) return [];
        return [
          {
            listId: list.id,
            listName: list.name,
            name: list.stayLocation.name ?? list.name,
            latitude: list.stayLocation.latitude,
            longitude: list.stayLocation.longitude,
          },
        ];
      }),
    [selectedListDetails, selectedListIds],
  );

  const selectedFolderCoordinates = useMemo(
    () => [
      ...restaurantsWithLocation.map(
        (restaurant) =>
          [restaurant.longitude as number, restaurant.latitude as number] as [
            number,
            number,
          ],
      ),
      ...selectedFolderStays.map(
        (stay) => [stay.longitude, stay.latitude] as [number, number],
      ),
    ],
    [restaurantsWithLocation, selectedFolderStays],
  );

  const restaurantMarkerGroups = useMemo(
    () => clusterRestaurants(restaurantsWithLocation, currentMapZoom),
    [currentMapZoom, restaurantsWithLocation],
  );

  const loadRestaurants = useCallback(
    async (coordinates?: { latitude: number; longitude: number }) => {
      try {
        if (restaurantId) restaurantFocusActiveRef.current = true;
        const latitude =
          coordinates?.latitude ?? userLocationRef.current?.coords.latitude;
        const longitude =
          coordinates?.longitude ?? userLocationRef.current?.coords.longitude;
        const discoveryLatitude =
          latitude ?? activeCountry?.latitude ?? undefined;
        const discoveryLongitude =
          longitude ?? activeCountry?.longitude ?? undefined;
        if (
          (discoveryLatitude === undefined ||
            discoveryLongitude === undefined) &&
          selectedListIds.length === 0
        ) {
          if (restaurantId && handledRestaurantIdRef.current !== restaurantId) {
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
          ...(discoveryLatitude !== undefined &&
          discoveryLongitude !== undefined
            ? { latitude: discoveryLatitude, longitude: discoveryLongitude }
            : {}),
          countryCode: activeCountry?.code,
          ...(radiusKm === null && activeCountry?.viewport
            ? {
                south: activeCountry.viewport.southwest[1],
                west: activeCountry.viewport.southwest[0],
                north: activeCountry.viewport.northeast[1],
                east: activeCountry.viewport.northeast[0],
              }
            : {}),
          radiusKm: radiusKm ?? undefined,
          // With "Any distance", the active country is the search area. A small
          // discovery cap made valid restaurants elsewhere in the country vanish.
          limit: radiusKm === null ? 2_000 : 200,
          listIds: selectedListIds.length > 0 ? selectedListIds : undefined,
          filter: mapFilter,
          sort: mapSort,
          matchDietary,
          matchCuisines,
          hideFlaggedAllergens,
          badgeKeys: selectedBadgeKeys.length ? selectedBadgeKeys : undefined,
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
    },
    [
      activeCountry,
      hideFlaggedAllergens,
      mapFilter,
      mapSort,
      matchCuisines,
      matchDietary,
      radiusKm,
      restaurantId,
      selectedListIds,
      selectedBadgeKeys,
    ],
  );

  // Opening the map from a restaurant profile is a dedicated focus flow.
  // The regular focus loader deliberately pauses while restaurantId exists,
  // so this path must load the requested restaurant (and the surrounding map
  // results) before the route parameter is consumed.
  useEffect(() => {
    if (
      !filtersHydrated ||
      !restaurantId ||
      handledRestaurantIdRef.current === restaurantId
    ) {
      return;
    }

    restaurantFocusActiveRef.current = true;
    setLoading(true);
    void loadRestaurants();
  }, [filtersHydrated, loadRestaurants, restaurantId]);

  useEffect(() => {
    if (
      selectedListIds.length === 0 ||
      selectedFolderCoordinates.length === 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (restaurantFocusActiveRef.current) return;
      if (selectedFolderCoordinates.length === 1) {
        cameraRef.current?.setCamera({
          centerCoordinate: selectedFolderCoordinates[0],
          zoomLevel: 14,
          animationDuration: 600,
        });
        return;
      }

      const longitudes = selectedFolderCoordinates.map(
        ([longitude]) => longitude,
      );
      const latitudes = selectedFolderCoordinates.map(
        ([, latitude]) => latitude,
      );
      cameraRef.current?.fitBounds(
        [Math.max(...longitudes), Math.max(...latitudes)],
        [Math.min(...longitudes), Math.min(...latitudes)],
        [90, 50, 180, 50],
        650,
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedFolderCoordinates, selectedListIds]);

  const dismissRestaurantPreview = useCallback(() => {
    restaurantFocusActiveRef.current = false;
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
      void refreshDetectedCountry().catch(() => undefined);
      return location;
    } catch (error) {
      console.error("Could not get current location:", error);
      return null;
    }
  }, [refreshDetectedCountry]);

  const returnToUserLocation = useCallback(async () => {
    const location = await loadUserLocation();
    if (!location) return;

    bottomSheetRef.current?.close();
    dismissRestaurantPreview();
    cameraRef.current?.setCamera({
      centerCoordinate: [location.coords.longitude, location.coords.latitude],
      zoomLevel: 14,
      animationDuration: 650,
      animationMode: "flyTo",
    });
  }, [dismissRestaurantPreview, loadUserLocation]);

  useFocusEffect(
    useCallback(() => {
      if (
        !filtersHydrated ||
        listId ||
        restaurantId ||
        restaurantFocusActiveRef.current ||
        selectedCities.length > 0 ||
        selectedListIds.length > 0
      ) {
        return undefined;
      }

      let active = true;
      userMovedMapRef.current = false;
      void loadUserLocation().then((location) => {
        if (
          !active ||
          !location ||
          restaurantFocusActiveRef.current ||
          hasCenteredOnUserRef.current ||
          userMovedMapRef.current
        ) {
          return;
        }
        hasCenteredOnUserRef.current = true;
        cameraRef.current?.setCamera({
          centerCoordinate: [
            location.coords.longitude,
            location.coords.latitude,
          ],
          zoomLevel: 14,
          animationDuration: 350,
          animationMode: "easeTo",
        });
      });

      return () => {
        active = false;
        hasCenteredOnUserRef.current = false;
      };
    }, [
      filtersHydrated,
      listId,
      loadUserLocation,
      restaurantId,
      selectedCities.length,
      selectedListIds.length,
    ]),
  );

  useFocusEffect(
    useCallback(() => {
      if (
        !filtersHydrated ||
        listId ||
        restaurantId ||
        restaurantFocusActiveRef.current ||
        selectedCities.length > 0
      ) {
        return undefined;
      }

      let active = true;
      void (async () => {
        if (restaurantFocusActiveRef.current) return;
        const location =
          userLocationRef.current ?? (await loadUserLocation());
        if (!active) return;
        if (location) {
          await loadRestaurants({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          return;
        }
        await loadRestaurants(
          activeCountry?.latitude != null && activeCountry.longitude != null
            ? {
                latitude: activeCountry.latitude,
                longitude: activeCountry.longitude,
              }
            : undefined,
        );
      })();

      return () => {
        active = false;
      };
    }, [
      filtersHydrated,
      activeCountry,
      listId,
      loadRestaurants,
      loadUserLocation,
      restaurantId,
      selectedCities.length,
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

  function selectRestaurant(
    restaurant: Restaurant,
    cameraOptions?: {
      zoomLevel?: number;
      padding?: {
        paddingBottom: number;
        paddingTop: number;
        paddingLeft: number;
        paddingRight: number;
      };
    },
  ) {
    restaurantFocusActiveRef.current = true;
    setSelectedCluster(null);
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
        zoomLevel: cameraOptions?.zoomLevel ?? 15,
        ...(cameraOptions?.padding ? { padding: cameraOptions.padding } : {}),
        animationDuration: 600,
      });
    }, 100);
  }

  function selectRestaurantFromCluster(restaurant: Restaurant) {
    setSelectedCluster(null);
    requestAnimationFrame(() => {
      selectRestaurant(restaurant, {
        zoomLevel: Math.max(currentMapZoom, 17),
        padding: {
          paddingBottom: 220,
          paddingTop: 80,
          paddingLeft: 40,
          paddingRight: 40,
        },
      });
    });
  }

  async function openRestaurantHotspot(restaurant: Restaurant) {
    setSelectedCluster(null);
    bottomSheetRef.current?.close();
    dismissRestaurantPreview();
    setHotspotRestaurant(restaurant);
    hotspotRequestRef.current = restaurant.id;
    setHotspotActivity(null);
    setHotspotLoading(true);
    try {
      const activity = await api.restaurants.hotspotActivity(restaurant.id);
      if (hotspotRequestRef.current === restaurant.id) {
        setHotspotActivity(activity);
      }
    } catch (error) {
      console.error("Could not load restaurant hotspot activity", error);
      if (hotspotRequestRef.current === restaurant.id) {
        setHotspotActivity({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          state: "none",
          items: [],
        });
      }
    } finally {
      if (hotspotRequestRef.current === restaurant.id) {
        setHotspotLoading(false);
      }
    }
  }

  function openHotspotActivityItem(item: RestaurantHotspotActivityItem) {
    if (!item.postId) return;
    setHotspotRestaurant(null);
    router.push({ pathname: "/(posts)/[id]", params: { id: item.postId } });
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
        ...(activeCountry?.latitude != null && activeCountry.longitude != null
          ? {
              latitude: activeCountry.latitude,
              longitude: activeCountry.longitude,
            }
          : location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }
            : {}),
        languageCode: i18n.resolvedLanguage ?? i18n.language,
        countryCode: activeCountry?.code,
      });
      return mergeRestaurantSearchResults(response, query);
    },
    [activeCountry, i18n.language, i18n.resolvedLanguage],
  );

  const searchMapAreasForMap = useCallback(
    async (query: string) => {
      const areas = await api.restaurants.searchMapAreas(
        query,
        i18n.resolvedLanguage ?? i18n.language,
      );
      return areas.filter((area) => area.areaType !== "COUNTRY");
    },
    [i18n.language, i18n.resolvedLanguage],
  );

  const fitSelectedCities = useCallback((cities: CityFilterLocation[]) => {
    if (cities.length === 0) return;
    const west = Math.min(...cities.map((city) => city.viewport.southwest[0]));
    const south = Math.min(...cities.map((city) => city.viewport.southwest[1]));
    const east = Math.max(...cities.map((city) => city.viewport.northeast[0]));
    const north = Math.max(...cities.map((city) => city.viewport.northeast[1]));
    setTimeout(() => {
      cameraRef.current?.fitBounds(
        [east, north],
        [west, south],
        [70, 35, 110, 35],
        650,
      );
    }, 120);
  }, []);

  const loadRestaurantsForCities = useCallback(
    async (cities: CityFilterLocation[]) => {
      const requestId = ++cityLoadRequestRef.current;
      if (cities.length === 0) {
        await loadRestaurants();
        return;
      }
      setLoading(true);
      try {
        const batches = await Promise.all(
          cities.map((city) =>
            api.restaurants.discoverForMap({
              latitude: city.latitude,
              longitude: city.longitude,
              south: city.viewport.southwest[1],
              west: city.viewport.southwest[0],
              north: city.viewport.northeast[1],
              east: city.viewport.northeast[0],
              countryCode: city.countryCode ?? activeCountry?.code,
              limit: 200,
              listIds: selectedListIds.length > 0 ? selectedListIds : undefined,
              filter: mapFilter,
              sort: mapSort,
              matchDietary,
              matchCuisines,
              hideFlaggedAllergens,
              badgeKeys: selectedBadgeKeys.length
                ? selectedBadgeKeys
                : undefined,
            }),
          ),
        );
        if (requestId === cityLoadRequestRef.current) {
          setRestaurants([
            ...new Map(
              batches.flat().map((restaurant) => [restaurant.id, restaurant]),
            ).values(),
          ]);
        }
      } catch (error) {
        console.error("Could not load restaurants for selected cities", error);
      } finally {
        if (requestId === cityLoadRequestRef.current) setLoading(false);
      }
    },
    [
      hideFlaggedAllergens,
      loadRestaurants,
      mapFilter,
      mapSort,
      matchCuisines,
      matchDietary,
      selectedListIds,
      selectedBadgeKeys,
      activeCountry?.code,
    ],
  );

  useEffect(() => {
    if (
      !activeCountry?.viewport ||
      restaurantId ||
      restaurantFocusActiveRef.current ||
      selectedCities.length > 0
    )
      return;
    const viewport = activeCountry.viewport;
    const location = userLocationRef.current;
    if (!location) return;
    const userIsInsideActiveCountry =
      location.coords.latitude >= viewport.southwest[1] &&
      location.coords.latitude <= viewport.northeast[1] &&
      location.coords.longitude >= viewport.southwest[0] &&
      location.coords.longitude <= viewport.northeast[0];
    if (userIsInsideActiveCountry) return;
    const timer = setTimeout(() => {
      if (restaurantFocusActiveRef.current) return;
      cameraRef.current?.fitBounds(
        viewport.northeast,
        viewport.southwest,
        [70, 35, 110, 35],
        650,
      );
      void loadRestaurants({
        latitude:
          activeCountry.latitude ??
          (viewport.southwest[1] + viewport.northeast[1]) / 2,
        longitude:
          activeCountry.longitude ??
          (viewport.southwest[0] + viewport.northeast[0]) / 2,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeCountry, loadRestaurants, restaurantId, selectedCities.length]);

  const selectCity = useCallback(
    async (city: CityFilterLocation) => {
      if (city.areaType === "COUNTRY") return;
      const alreadySelected = selectedCities.some(
        (selected) => selected.googlePlaceId === city.googlePlaceId,
      );
      const next = alreadySelected ? selectedCities : [...selectedCities, city];
      areaToFocusRef.current = city;
      if (user?.id) {
        void addMapRecentSearch(user.id, city).then(setRecentMapSearches);
      }
      setSelectedCities(next);
      setIsCitySearching(false);
      setIsSearching(false);
      setViewMode("MAP");
      if (selectedCities.length === 0) setRadiusKm(null);
      dismissRestaurantPreview();
      if (alreadySelected) return;

      try {
        const resolvedCity = await api.restaurants.resolveMapArea(city);
        setSelectedCities((current) =>
          current.map((selected) =>
            selected.googlePlaceId === resolvedCity.googlePlaceId
              ? resolvedCity
              : selected,
          ),
        );
      } catch (error) {
        // A missing boundary must not prevent city filtering. Google Places'
        // viewport remains a stable fallback for filtering and camera fitting.
        console.error("Could not resolve city boundary", error);
      }
    },
    [dismissRestaurantPreview, selectedCities, user],
  );

  const removeCity = useCallback(
    (placeId: string) => {
      const next = selectedCities.filter(
        (city) => city.googlePlaceId !== placeId,
      );
      setSelectedCities(next);
      if (next.length > 0) fitSelectedCities(next);
      else void loadRestaurantsForCities([]);
    },
    [fitSelectedCities, loadRestaurantsForCities, selectedCities],
  );

  useEffect(() => {
    if (!selectedCityRequestKey) return;
    const timer = setTimeout(() => {
      void loadRestaurantsForCities(selectedCitiesRef.current);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRestaurantsForCities, selectedCityRequestKey]);

  useEffect(() => {
    if (loading || isSearching || isCitySearching || viewMode !== "MAP") return;
    const area = areaToFocusRef.current;
    if (!area) return;
    const timer = setTimeout(() => {
      if (areaToFocusRef.current?.googlePlaceId !== area.googlePlaceId) return;
      areaToFocusRef.current = null;
      fitSelectedCities([area]);
    }, 180);
    return () => clearTimeout(timer);
  }, [fitSelectedCities, isCitySearching, isSearching, loading, viewMode]);

  function renderAreaSearchResult(city: CityFilterLocation) {
    const countryLabel =
      city.country?.trim() ||
      city.formattedAddress
        ?.split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .at(-1) ||
      null;
    return (
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
        <View className="h-13 w-13 items-center justify-center rounded-full bg-brand-soft dark:bg-gray-800">
          <MapPinIcon size={24} color="#FF5B35" weight="fill" />
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-base font-bold text-black dark:text-white"
          >
            {city.name}
          </Text>
          {countryLabel ? (
            <Text
              numberOfLines={1}
              className="mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              {countryLabel}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const searchMapForMap = useCallback(
    async (query: string): Promise<MapSearchResult[]> => {
      const [areas, restaurants] = await Promise.all([
        searchMapAreasForMap(query),
        searchRestaurantsForMap(query),
      ]);
      return [...areas, ...restaurants];
    },
    [searchMapAreasForMap, searchRestaurantsForMap],
  );

  function isMapAreaResult(
    result: MapSearchResult,
  ): result is CityFilterLocation {
    return result.source === "AREA";
  }

  function mapSearchResultKey(result: MapSearchResult) {
    if (isMapAreaResult(result)) return `area-${result.googlePlaceId}`;
    return result.source === "FINDEAT"
      ? `findeat-${result.restaurant.id}`
      : `google-${result.googlePlaceId}`;
  }

  function selectMapResult(result: MapSearchResult) {
    if (isMapAreaResult(result)) {
      void selectCity(result);
      return;
    }
    void selectMapSearchResult(result);
  }

  function renderMapSearchResult(result: MapSearchResult) {
    return isMapAreaResult(result)
      ? renderAreaSearchResult(result)
      : renderRestaurantSearchResult(result);
  }

  async function selectMapSearchResult(item: SelectedRestaurant) {
    try {
      if (user?.id) {
        void addMapRecentSearch(user.id, item).then(setRecentMapSearches);
      }
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
    selectedRestaurant?.averageRating ??
    (selectedRatings.length > 0
      ? selectedRatings.reduce((total, rating) => total + rating, 0) /
        selectedRatings.length
      : null);
  const activeFilterCount = [
    mapFilter !== "ALL",
    selectedListIds.length > 0,
    radiusKm !== null,
    matchDietary,
    matchCuisines,
    hideFlaggedAllergens,
    selectedCities.length > 0,
    selectedBadgeKeys.length > 0,
  ].filter(Boolean).length;
  const selectedLists = placeLists.filter((list) =>
    selectedListIds.includes(list.id),
  );
  const visiblePlaceLists = foldersExpanded
    ? placeLists
    : placeLists.slice(0, COLLAPSED_FOLDER_LIMIT);
  const selectedListTitle =
    selectedLists.length === 1
      ? selectedLists[0].systemType
        ? t(
            selectedLists[0].systemType === "WANT_TO_TRY"
              ? "common:wantToTry"
              : selectedLists[0].systemType === "VISITED"
                ? "common:visited"
                : "common:favorite",
          )
        : selectedLists[0].name
      : null;
  const renderFiltersFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          className="border-t border-black/5 px-5 pt-3 dark:border-white/10"
          style={{
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: isDark ? "#111827" : "#FAF9F6",
          }}
        >
          <TouchableOpacity
            onPress={() => setFiltersOpen(false)}
            className="rounded-2xl bg-black py-4 dark:bg-white"
          >
            <Text className="text-center font-bold text-white dark:text-black">
              {t("map:showPlaces")}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, isDark, t],
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      {isCitySearching ? (
        <Animated.View
          key="city-search"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          className="flex-1"
        >
          <SearchResultsView
            searchRequest={searchMapAreasForMap}
            placeholder={t("map:searchAreas")}
            emptyText={t("map:noAreasFound")}
            keyExtractor={(city) => city.googlePlaceId}
            onCancel={() => setIsCitySearching(false)}
            onSelect={(city) => void selectCity(city)}
            renderItem={renderAreaSearchResult}
          />
        </Animated.View>
      ) : isSearching ? (
        <Animated.View
          key="search"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          className="flex-1"
        >
          <SearchResultsView
            searchRequest={searchMapForMap}
            idleData={recentMapSearches}
            placeholder={t("map:searchMap")}
            emptyText={t("map:noMapResults")}
            keyExtractor={mapSearchResultKey}
            onCancel={() => setIsSearching(false)}
            onSelect={selectMapResult}
            renderItem={renderMapSearchResult}
            idleHeaderContent={
              recentMapSearches.length > 0 ? (
                <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
                  <Text className="text-base font-bold text-black dark:text-white">
                    {t("map:recentSearches")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (!user?.id) return;
                      setRecentMapSearches([]);
                      void clearMapRecentSearches(user.id);
                    }}
                  >
                    <Text className="text-sm font-bold text-brand">
                      {t("map:clearRecentSearches")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
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
            editable={viewMode === "LIST"}
            value={viewMode === "LIST" ? listSearchQuery : ""}
            onChangeText={setListSearchQuery}
            placeholder={t("common:search")}
            onPress={() => {
              if (!loading && viewMode === "MAP") setIsSearching(true);
            }}
            rightAccessory={
              <TouchableOpacity
                onPress={() => {
                  setFoldersExpanded(false);
                  setFiltersOpen(true);
                }}
                className="relative h-full aspect-square items-center justify-center rounded-2xl bg-ink"
              >
                <FunnelIcon size={21} color="#FAF9F6" weight="fill" />
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

          <View className="px-5 pb-3">
            {selectedCities.length > 0 ? (
              <FlatList
                horizontal
                data={selectedCities}
                keyExtractor={(city) => city.googlePlaceId}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item: city }) => (
                  <TouchableOpacity
                    onPress={() => removeCity(city.googlePlaceId)}
                    className="flex-row items-center rounded-full bg-brand-soft px-3 py-2 dark:bg-[#3A211C]"
                  >
                    <Text
                      className="max-w-40 text-sm font-bold text-brand"
                      numberOfLines={1}
                    >
                      {city.name}
                    </Text>
                    <XIcon
                      size={14}
                      color="#FF5B35"
                      weight="bold"
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                )}
              />
            ) : null}
          </View>

          <Tabs
            activeTab={viewMode}
            onChange={setViewMode}
            tabs={[
              { label: t("map:map"), value: "MAP" },
              { label: t("map:list"), value: "LIST" },
            ]}
          />

          {viewMode === "MAP" ? (
            <View style={{ flex: 1 }}>
              <Mapbox.MapView
                style={{ flex: 1 }}
                onTouchStart={() => {
                  userMovedMapRef.current = true;
                }}
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
                  setSelectedCluster(null);
                }}
              >
                <Mapbox.Camera
                  ref={cameraRef}
                  zoomLevel={userLocation ? 14 : activeCountry ? 5 : 1.5}
                  animationDuration={0}
                  centerCoordinate={[
                    userLocation?.coords.longitude ??
                      activeCountry?.longitude ??
                      0,
                    userLocation?.coords.latitude ??
                      activeCountry?.latitude ??
                      20,
                  ]}
                />
                {selectedCities.map((city) =>
                  city.boundary ? (
                    <Mapbox.ShapeSource
                      key={`city-fill-source-${city.googlePlaceId}`}
                      id={`city-fill-source-${city.googlePlaceId}`}
                      shape={{
                        type: "Feature",
                        properties: { placeId: city.googlePlaceId },
                        geometry: city.boundary,
                      }}
                    >
                      <Mapbox.FillLayer
                        id={`city-fill-${city.googlePlaceId}`}
                        style={{
                          fillColor: isDark ? "#FF8F72" : "#FF6848",
                          fillOpacity: isDark ? 0.065 : 0.045,
                        }}
                      />
                    </Mapbox.ShapeSource>
                  ) : null,
                )}

                {activityHeatmapEnabled &&
                visibleActivityHeatPoints.length > 0 ? (
                  <Mapbox.ShapeSource
                    id="restaurant-activity-heatmap-source"
                    shape={activityHeatmapShape}
                  >
                    <Mapbox.HeatmapLayer
                      id="restaurant-activity-heatmap"
                      style={{
                        heatmapWeight: [
                          "interpolate",
                          ["linear"],
                          ["get", "weight"],
                          0,
                          0,
                          1,
                          0.45,
                          4,
                          1,
                          10,
                          1.35,
                        ],
                        heatmapIntensity: [
                          "interpolate",
                          ["linear"],
                          ["zoom"],
                          3,
                          0.82,
                          10,
                          0.94,
                          14,
                          1.08,
                          18,
                          0.88,
                        ],
                        heatmapRadius: [
                          "interpolate",
                          ["linear"],
                          ["zoom"],
                          3,
                          28,
                          9,
                          36,
                          13,
                          30,
                          16,
                          23,
                          18,
                          18,
                        ],
                        heatmapColor: [
                          "interpolate",
                          ["linear"],
                          ["heatmap-density"],
                          0,
                          "rgba(255, 199, 68, 0)",
                          0.18,
                          "rgba(255, 199, 68, 0.32)",
                          0.42,
                          "rgba(255, 143, 55, 0.48)",
                          0.68,
                          "rgba(255, 91, 53, 0.62)",
                          1,
                          "rgba(193, 42, 42, 0.76)",
                        ],
                        heatmapOpacity: [
                          "interpolate",
                          ["linear"],
                          ["zoom"],
                          2,
                          0.68,
                          12,
                          0.66,
                          16,
                          0.55,
                          20,
                          0.3,
                        ],
                      }}
                    />
                  </Mapbox.ShapeSource>
                ) : null}

                {selectedCities.map((city) =>
                  city.boundary ? (
                    <Mapbox.ShapeSource
                      key={`city-line-source-${city.googlePlaceId}`}
                      id={`city-line-source-${city.googlePlaceId}`}
                      shape={{
                        type: "Feature",
                        properties: { placeId: city.googlePlaceId },
                        geometry: city.boundary,
                      }}
                    >
                      <Mapbox.LineLayer
                        id={`city-line-${city.googlePlaceId}`}
                        style={{
                          lineColor: isDark ? "#FF8A6D" : "#E94E2F",
                          lineWidth: 2.4,
                          lineOpacity: 0.9,
                        }}
                      />
                    </Mapbox.ShapeSource>
                  ) : null,
                )}

                {selectedFolderStays.map((stay) => (
                  <Mapbox.MarkerView
                    key={`folder-stay-${stay.listId}`}
                    coordinate={[stay.longitude, stay.latitude]}
                    anchor={{ x: 0.5, y: 0.5 }}
                    allowOverlap
                    allowOverlapWithPuck
                  >
                    <View
                      accessibilityLabel={stay.name}
                      className="h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-[#F7B928] dark:border-[#171719]"
                      style={{
                        shadowColor: "#0B0B0A",
                        shadowOpacity: 0.25,
                        shadowRadius: 5,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 6,
                      }}
                    >
                      <BedIcon size={25} color="#171719" weight="fill" />
                    </View>
                  </Mapbox.MarkerView>
                ))}

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
                            dismissRestaurantPreview();
                            setSelectedCluster(group.restaurants);
                            if (currentMapZoom < 17) {
                              cameraRef.current?.setCamera({
                                centerCoordinate: group.coordinate,
                                zoomLevel: Math.min(currentMapZoom + 2, 17),
                                animationDuration: 450,
                              });
                            }
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
                  const activityState = activityPointByRestaurantId.get(
                    restaurant.id,
                  )?.state;
                  const showHotspot =
                    activityHeatmapEnabled &&
                    activityState === "hot" &&
                    currentMapZoom >= 14.5;
                  const activeHappyHour = getActiveHappyHour(restaurant);
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
                      coordinate={group.coordinate}
                      anchor={{ x: 0.5, y: 0.5 }}
                      allowOverlap
                      allowOverlapWithPuck
                      isSelected={isSelected}
                    >
                      <View
                        style={{
                          width: isSelected ? 52 : 48,
                          height: isSelected ? 52 : 48,
                        }}
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() =>
                            selectRestaurant(restaurant, {
                              zoomLevel: Math.max(currentMapZoom, 15),
                            })
                          }
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
                                <HeartIcon
                                  size={19}
                                  color="#FAF9F6"
                                  weight="fill"
                                />
                              ) : (
                                <CheckIcon
                                  size={20}
                                  color="#FAF9F6"
                                  weight="bold"
                                />
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                        {showHotspot ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={t("map:hotRightNow")}
                            activeOpacity={0.78}
                            onPress={(event) => {
                              event.stopPropagation();
                              void openRestaurantHotspot(restaurant);
                            }}
                            className="absolute -right-2 -top-3 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#FF6B35] dark:border-[#111827]"
                            style={{
                              shadowColor: "#B3261E",
                              shadowOpacity: 0.3,
                              shadowRadius: 4,
                              shadowOffset: { width: 0, height: 2 },
                              elevation: 7,
                            }}
                          >
                            <FireIcon size={18} color="#FFF8EF" weight="fill" />
                          </TouchableOpacity>
                        ) : null}
                        {restaurant.isHappyHourNow ? (
                          <View
                            pointerEvents="none"
                            accessibilityLabel={
                              activeHappyHour?.endsAt
                                ? t("map:happyHourUntil", {
                                    time: activeHappyHour.endsAt,
                                  })
                                : t("map:happyHour")
                            }
                            className="absolute -left-2 -top-3 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#E6A700] dark:border-[#111827]"
                            style={{
                              shadowColor: "#7A5100",
                              shadowOpacity: 0.28,
                              shadowRadius: 4,
                              shadowOffset: { width: 0, height: 2 },
                              elevation: 7,
                            }}
                          >
                            <CheersIcon
                              size={18}
                              color="#FFF8EF"
                              weight="fill"
                            />
                          </View>
                        ) : null}
                      </View>
                    </Mapbox.MarkerView>
                  );
                })}
                <Mapbox.UserLocation visible />
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
                          <Text className="text-lg font-bold text-black dark:text-white">
                            {selectedRestaurant.name}
                          </Text>
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

                        {(selectedRestaurant.address ||
                          selectedRestaurant.city) && (
                          <Text className="mt-2 text-gray-500">
                            {[
                              selectedRestaurant.address,
                              selectedRestaurant.city,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </Text>
                        )}
                        {activityHeatmapEnabled &&
                        activityPointByRestaurantId.get(selectedRestaurant.id)
                          ?.state === "hot" ? (
                          <TouchableOpacity
                            onPress={() =>
                              void openRestaurantHotspot(selectedRestaurant)
                            }
                            className="mt-2 self-start flex-row items-center rounded-full bg-[#FFF0E6] px-2.5 py-1.5 dark:bg-[#3A211C]"
                          >
                            <FireIcon size={14} color="#FF5B35" weight="fill" />
                            <Text className="ml-1.5 text-xs font-bold text-brand">
                              {t("map:hotRightNow")}
                            </Text>
                          </TouchableOpacity>
                        ) : activityHeatmapEnabled &&
                          activityPointByRestaurantId.get(selectedRestaurant.id)
                            ?.state === "active" ? (
                          <View className="mt-2 self-start rounded-full bg-gray-100 px-2.5 py-1.5 dark:bg-gray-800">
                            <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
                              {t("map:activeThisWeek")}
                            </Text>
                          </View>
                        ) : null}
                        {selectedRestaurant.isHappyHourNow ? (
                          <View className="mt-2 self-start">
                            <HappyHourBadge restaurant={selectedRestaurant} />
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {!!selectedRestaurant.bio && (
                      <Text
                        numberOfLines={3}
                        className="mt-4 leading-5 text-gray-600 dark:text-gray-300"
                      >
                        {selectedRestaurant.bio}
                      </Text>
                    )}

                    <RestaurantStats
                      averageRating={selectedAverageRating}
                      reviewsCount={
                        selectedRestaurant.reviewsCount ??
                        selectedReviews.length
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
                className="absolute right-3 top-3 h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg dark:bg-gray-800"
              >
                <CrosshairIcon
                  size={22}
                  color={isDark ? "#FAF9F6" : "#111"}
                  weight="fill"
                />
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <SkeletonPulse style={{ flex: 1 }}>
              <View className="flex-1 bg-[#E8E4DD] dark:bg-[#171719]">
                <Skeleton
                  width={48}
                  height={48}
                  circle
                  style={{ position: "absolute", left: "18%", top: "20%" }}
                />
                <Skeleton
                  width={48}
                  height={48}
                  circle
                  style={{ position: "absolute", right: "18%", top: "33%" }}
                />
                <Skeleton
                  width={48}
                  height={48}
                  circle
                  style={{ position: "absolute", left: "42%", top: "51%" }}
                />
                <Skeleton
                  width={48}
                  height={48}
                  circle
                  style={{ position: "absolute", left: "15%", bottom: "18%" }}
                />
                <Skeleton
                  width={48}
                  height={48}
                  circle
                  style={{ position: "absolute", right: "12%", bottom: "12%" }}
                />
              </View>
            </SkeletonPulse>
          ) : (
            <FlatList
              className="bg-canvas dark:bg-black"
              data={listRestaurants}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
              ListHeaderComponent={
                <View className="flex-row items-end justify-between px-4 pb-4 pt-5">
                  <View className="flex-1 pr-3">
                    <Text className="text-2xl font-bold text-black dark:text-white">
                      {selectedLists.length > 0
                        ? selectedLists.length === 1
                          ? t("map:placesInFolder", {
                              name: selectedListTitle,
                            })
                          : t("map:placesInFolders", {
                              count: selectedLists.length,
                            })
                        : selectedCities.length > 0
                          ? t("map:placesInCities")
                          : t("map:placesNearYou")}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      {t(`map:sort${mapSort}`)}
                    </Text>
                  </View>
                  <View className="rounded-full bg-[#EEE9DF] px-3 py-2 dark:bg-gray-900">
                    <Text className="text-xs font-bold text-black dark:text-white">
                      {t("map:placesFound", { count: listRestaurants.length })}
                    </Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <EmptyState
                  icon={StorefrontIcon}
                  title={t("map:noRestaurantsFound")}
                  description={t(
                    listSearchQuery.trim()
                      ? "map:noMapResults"
                      : selectedCities.length > 0
                        ? "map:noPlacesInCitiesDescription"
                        : "map:noPlacesDescription",
                  )}
                />
              }
              renderItem={({ item }) => (
                <MapRestaurantListCard
                  restaurant={item}
                  hotRightNow={
                    activityPointByRestaurantId.get(item.id)?.state === "hot"
                  }
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
        open={selectedCluster !== null}
        onClose={() => setSelectedCluster(null)}
        snapPoints={[
          selectedCluster && selectedCluster.length > 4 ? "72%" : "48%",
        ]}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        >
          <View className="mb-3 flex-row items-end justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-xl font-bold text-black dark:text-white">
                {t("map:restaurantsInCluster")}
              </Text>
              <Text className="mt-1 text-sm text-gray-500">
                {t("map:clusterPlaces", {
                  count: selectedCluster?.length ?? 0,
                })}
              </Text>
            </View>
          </View>

          <View className="overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-[#111113]">
            {(selectedCluster ?? []).map((restaurant, index) => (
              <TouchableOpacity
                key={restaurant.id}
                activeOpacity={0.78}
                onPress={() => selectRestaurantFromCluster(restaurant)}
                className={`flex-row items-center px-4 py-3.5 ${
                  index > 0
                    ? "border-t border-black/5 dark:border-white/10"
                    : ""
                }`}
              >
                <Avatar
                  uri={restaurant.logoUrl}
                  username={restaurant.name}
                  fallbackType="restaurant"
                  size={48}
                />
                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row items-center">
                    <Text
                      numberOfLines={1}
                      className="shrink text-base font-bold text-black dark:text-white"
                    >
                      {restaurant.name}
                    </Text>
                    <RestaurantBadge status={restaurant.status} />
                  </View>
                  {restaurant.address || restaurant.city ? (
                    <Text
                      numberOfLines={1}
                      className="mt-1 text-sm text-gray-500"
                    >
                      {[restaurant.address, restaurant.city]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  ) : null}
                </View>
                <MapPinIcon size={20} color="#FF5B35" weight="fill" />
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetScrollView>
      </AppBottomSheet>

      <AppBottomSheet
        open={hotspotRestaurant !== null}
        onClose={() => {
          hotspotRequestRef.current = null;
          setHotspotRestaurant(null);
          setHotspotActivity(null);
          setHotspotLoading(false);
        }}
        snapPoints={["68%"]}
        maxHeightPercent={0.92}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        >
          <View className="mb-4 flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#FFF0E6] dark:bg-[#3A211C]">
              <FireIcon size={24} color="#FF5B35" weight="fill" />
            </View>
            <View className="ml-3 min-w-0 flex-1">
              <Text className="text-xl font-bold text-black dark:text-white">
                {t("map:whatsHappeningHere")}
              </Text>
              <Text numberOfLines={1} className="mt-0.5 text-sm text-gray-500">
                {hotspotRestaurant?.name}
              </Text>
            </View>
          </View>

          {hotspotLoading ? (
            <View className="gap-3">
              {[0, 1, 2].map((item) => (
                <View
                  key={item}
                  className="flex-row rounded-2xl bg-gray-100 p-3 dark:bg-gray-800"
                >
                  <Skeleton width={82} height={100} radius={14} />
                  <View className="ml-3 flex-1 gap-3 pt-1">
                    <Skeleton width="65%" height={14} radius={7} />
                    <Skeleton width="90%" height={12} radius={6} />
                    <Skeleton width="72%" height={12} radius={6} />
                  </View>
                </View>
              ))}
            </View>
          ) : hotspotActivity?.items.length ? (
            <View className="gap-3">
              {hotspotActivity.items.map((item) => {
                const canOpen = !!item.postId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={canOpen ? 0.78 : 1}
                    disabled={!canOpen}
                    onPress={() => openHotspotActivityItem(item)}
                    className="flex-row overflow-hidden rounded-2xl border border-black/5 bg-[#FBFAF8] p-3 dark:border-white/10 dark:bg-[#171719]"
                  >
                    {item.imageUrl ? (
                      <ProgressiveImage
                        source={{ uri: item.imageUrl }}
                        style={{ width: 80, height: 100 }}
                        className="rounded-xl bg-gray-200 dark:bg-gray-800"
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{ width: 80, height: 100 }}
                        className="items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-800"
                      >
                        {item.videoUrl ? (
                          <PlayIcon size={26} color="#FF5B35" weight="fill" />
                        ) : (
                          <StorefrontIcon
                            size={25}
                            color="#9CA3AF"
                            weight="fill"
                          />
                        )}
                      </View>
                    )}
                    <View className="ml-3 min-w-0 flex-1 py-0.5">
                      <View className="flex-row items-center">
                        <Avatar
                          uri={item.author.avatarUrl}
                          username={item.author.username}
                          userId={item.author.id}
                          showSnapIndicator={false}
                          size={28}
                        />
                        <Text
                          numberOfLines={1}
                          className="ml-2 min-w-0 flex-1 font-bold text-black dark:text-white"
                        >
                          {userDisplayName(item.author)}
                        </Text>
                      </View>
                      <Text className="mt-2 text-xs font-bold uppercase tracking-wide text-brand">
                        {t(`map:activity${item.type}`)} ·{" "}
                        {formatActivityDate(item.createdAt, i18n.language)}
                      </Text>
                      <Text
                        numberOfLines={2}
                        className="mt-1.5 text-sm leading-5 text-gray-600 dark:text-gray-300"
                      >
                        {item.caption?.trim() ||
                          t(`map:activity${item.type}Fallback`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="items-center rounded-2xl bg-gray-100 px-5 py-7 dark:bg-gray-800">
              <Text className="font-bold text-black dark:text-white">
                {t("map:noRecentActivity")}
              </Text>
              <Text className="mt-1 text-center text-sm text-gray-500">
                {t("map:noRecentActivityHint")}
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </AppBottomSheet>

      <AppBottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        snapPoints={["88%"]}
        footerComponent={renderFiltersFooter}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100 + insets.bottom,
          }}
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
                  setActivityHeatmapEnabled(
                    DEFAULT_MAP_PREFERENCES.activityHeatmapEnabled,
                  );
                  setSelectedListIds([]);
                  setSelectedBadgeKeys([]);
                  setSelectedCities([]);
                  void loadRestaurantsForCities([]);
                }}
                className="rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800"
              >
                <Text className="text-sm font-bold text-brand">
                  {t("map:resetFilters")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mt-5 rounded-2xl bg-gray-100 p-3 dark:bg-gray-800">
            <View className="flex-row items-center justify-between">
              <View className="min-w-0 flex-1 pr-3">
                <Text className="font-bold text-black dark:text-white">
                  {t("map:locations")}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("map:locationsHint")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setFiltersOpen(false);
                  setIsCitySearching(true);
                }}
                className="flex-row items-center rounded-full bg-black px-3 py-2.5 dark:bg-white"
              >
                <PlusIcon
                  size={16}
                  color={isDark ? "#0B0B0A" : "#FAF9F6"}
                  weight="bold"
                />
                <Text className="ml-1.5 text-sm font-bold text-white dark:text-black">
                  {t("map:addLocation")}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedCities.length > 0 ? (
              <View className="mt-3">
                <FlatList
                  horizontal
                  data={selectedCities}
                  keyExtractor={(area) => area.googlePlaceId}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item: area }) => (
                    <TouchableOpacity
                      onPress={() => removeCity(area.googlePlaceId)}
                      className="flex-row items-center rounded-full bg-brand-soft px-3 py-2 dark:bg-[#3A211C]"
                    >
                      <Text
                        className="max-w-40 text-sm font-bold text-brand"
                        numberOfLines={1}
                      >
                        {area.name}
                      </Text>
                      <XIcon
                        size={14}
                        color="#FF5B35"
                        weight="bold"
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                  )}
                />
                {selectedCities.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCities([]);
                      void loadRestaurantsForCities([]);
                    }}
                    className="mt-1 self-start px-2 py-2"
                  >
                    <Text className="text-sm font-bold text-brand">
                      {t("map:clearLocations")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>

          <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-gray-100 px-4 py-3.5 dark:bg-gray-800">
            <View className="min-w-0 flex-1 pr-4">
              <Text className="font-bold text-black dark:text-white">
                {t("map:activityHeatmap")}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                {t("map:activityHeatmapHint")}
              </Text>
            </View>
            <Switch
              value={activityHeatmapEnabled}
              onValueChange={setActivityHeatmapEnabled}
              trackColor={{ false: "#9CA3AF", true: "#FF8F37" }}
              thumbColor="#FAF9F6"
            />
          </View>

          <Text className="mb-2 mt-5 font-bold text-black dark:text-white">
            {t("map:show")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                "ALL",
                "SAVED",
                "WANT_TO_TRY",
                "VISITED",
                "FAVORITE",
                "CLAIMED",
              ] as RestaurantMapFilter[]
            ).map((filter) => (
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
                  <CheckIcon
                    size={14}
                    color={isDark ? "#0B0B0A" : "#FAF9F6"}
                    weight="bold"
                  />
                )}
                <Text
                  className={`font-bold ${mapFilter === filter ? "ml-1.5 text-white dark:text-black" : "text-black dark:text-white"}`}
                >
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
              onPress={() => setSelectedListIds([])}
              className={`flex-row items-center rounded-2xl border px-4 py-3.5 ${
                selectedListIds.length === 0
                  ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/35"
                  : "border-transparent bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <View className="flex-1 flex-row items-center">
                <FolderSimpleIcon
                  size={20}
                  color={selectedListIds.length === 0 ? "#D6A92D" : "#9CA3AF"}
                  weight={selectedListIds.length === 0 ? "fill" : "regular"}
                />
                <Text className="ml-3 font-semibold text-black dark:text-white">
                  {t("map:allFolders")}
                </Text>
              </View>
            </TouchableOpacity>
            {visiblePlaceLists.map((list) => {
              const selected = selectedListIds.includes(list.id);
              const previewUri =
                list.coverUrl ??
                (list.systemType ? undefined : list.previewImages[0]);
              const folderTitle = list.systemType
                ? t(
                    list.systemType === "WANT_TO_TRY"
                      ? "common:wantToTry"
                      : list.systemType === "VISITED"
                        ? "common:visited"
                        : "common:favorite",
                  )
                : list.name;
              return (
                <TouchableOpacity
                  key={list.id}
                  onPress={() =>
                    setSelectedListIds((current) =>
                      selected
                        ? current.filter((id) => id !== list.id)
                        : [...current, list.id],
                    )
                  }
                  activeOpacity={0.78}
                  className={`flex-row items-center justify-between rounded-2xl border p-3 ${
                    selected
                      ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/35"
                      : "border-transparent bg-gray-100 dark:bg-gray-800"
                  }`}
                  style={
                    selected
                      ? {
                          shadowColor: "#B7791F",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isDark ? 0.2 : 0.12,
                          shadowRadius: 9,
                          elevation: 2,
                        }
                      : undefined
                  }
                >
                  <View className="min-w-0 flex-1 flex-row items-center">
                    <View className="h-11 w-11 overflow-hidden rounded-xl">
                      {previewUri ? (
                        <ProgressiveImage
                          source={{ uri: previewUri }}
                          thumbnailUrl={list.coverThumbnailUrl}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : list.systemType ? (
                        <SystemPlaceListCover type={list.systemType} compact />
                      ) : (
                        <View className="flex-1 items-center justify-center bg-amber-100 dark:bg-amber-950/70">
                          <FolderSimpleIcon
                            size={22}
                            color="#D6A92D"
                            weight="fill"
                          />
                        </View>
                      )}
                    </View>
                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className={`font-bold ${
                          selected
                            ? "text-amber-950 dark:text-amber-100"
                            : "text-black dark:text-white"
                        }`}
                      >
                        {folderTitle}
                      </Text>
                      <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {t("map:folderPlaces", { count: list.itemCount })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            {placeLists.length > COLLAPSED_FOLDER_LIMIT ? (
              <TouchableOpacity
                onPress={() => setFoldersExpanded((current) => !current)}
                className="flex-row items-center justify-center rounded-xl py-2.5"
              >
                <Text className="mr-1.5 font-semibold text-gray-600 dark:text-gray-300">
                  {foldersExpanded
                    ? t("map:showFewerFolders")
                    : t("map:showMoreFolders", {
                        count: placeLists.length - COLLAPSED_FOLDER_LIMIT,
                      })}
                </Text>
                {foldersExpanded ? (
                  <CaretUpIcon size={16} color={isDark ? "#D1D5DB" : "#4B5563"} />
                ) : (
                  <CaretDownIcon size={16} color={isDark ? "#D1D5DB" : "#4B5563"} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          <Text className="mb-2 mt-6 font-bold text-black dark:text-white">
            {t("map:communityBadges")}
          </Text>
          <Text className="mb-3 text-sm leading-5 text-gray-500 dark:text-gray-400">
            {t("map:communityBadgesHint")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                "LOVERS_PLACE",
                "FRIENDS_FAVORITE",
                "FAMILY_PICK",
                "CELEBRATION_SPOT",
                "WORK_FRIENDLY",
                "ACCESSIBLE_CHOICE",
                "EASY_PARKING",
                "WIFI_READY",
                "OUTDOOR_FAVORITE",
                "QUIET_SPOT",
                "PET_FRIENDLY",
                "LATE_NIGHT_GO_TO",
              ] as RestaurantBadgeKey[]
            ).map((badgeKey) => {
              const selected = selectedBadgeKeys.includes(badgeKey);
              return (
                <TouchableOpacity
                  key={badgeKey}
                  onPress={() =>
                    setSelectedBadgeKeys((current) =>
                      selected
                        ? current.filter((key) => key !== badgeKey)
                        : [...current, badgeKey],
                    )
                  }
                  className={`flex-row items-center rounded-full border px-3.5 py-2.5 ${
                    selected
                      ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/35"
                      : "border-transparent bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  {selected ? (
                    <CheckIcon size={14} color="#D6A92D" weight="bold" />
                  ) : null}
                  <Text
                    className={`${selected ? "ml-1.5" : ""} font-semibold text-[#171716] dark:text-[#F7F6F2]`}
                  >
                    {t(`restaurants:badges.${badgeKey}.title`)}
                  </Text>
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
                onPress: () => setHideFlaggedAllergens((current) => !current),
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

          {selectedCities.length === 0 ? (
            <>
              <Text className="mb-2 mt-6 font-bold text-black dark:text-white">
                {t("map:distance")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {([null, 10, 50, 100, 200] as (number | null)[]).map(
                  (distance) => (
                    <TouchableOpacity
                      key={distance ?? "any"}
                      onPress={() => setRadiusKm(distance)}
                      className={`min-w-[30%] flex-1 items-center rounded-xl px-3 py-3 ${radiusKm === distance ? "bg-black dark:bg-white" : "bg-gray-100 dark:bg-gray-800"}`}
                    >
                      <Text
                        className={`font-bold ${radiusKm === distance ? "text-white dark:text-black" : "text-black dark:text-white"}`}
                      >
                        {distance === null
                          ? t("map:anyDistance")
                          : `${distance} km`}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </>
          ) : null}

          <Text className="mb-2 mt-6 font-bold text-black dark:text-white">
            {t("map:sortBy")}
          </Text>
          <View className="gap-2">
            {(
              [
                "BEST",
                "DISTANCE",
                "RATING",
                "MOST_REVIEWED",
              ] as RestaurantMapSort[]
            ).map((sort) => (
              <TouchableOpacity
                key={sort}
                onPress={() => setMapSort(sort)}
                className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
              >
                <Text className="font-semibold text-black dark:text-white">
                  {t(`map:sort${sort}`)}
                </Text>
                {mapSort === sort && (
                  <CheckIcon
                    size={18}
                    color={isDark ? "#FAF9F6" : "#111"}
                    weight="bold"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetScrollView>
      </AppBottomSheet>
    </SafeAreaView>
  );
}
