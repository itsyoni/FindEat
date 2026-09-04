import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { PlaceListDetail, Restaurant } from "@findeat/types";
import Mapbox from "@rnmapbox/maps";
import { router } from "expo-router";
import { HouseIcon, XIcon } from "phosphor-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import RestaurantStats from "@/components/restaurants/RestaurantStats";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");

type Props = {
  list: PlaceListDetail | null;
  visible: boolean;
  onClose: () => void;
};

type ListRestaurant = PlaceListDetail["items"][number]["restaurant"];

function restaurantForPreview(restaurant: ListRestaurant): Restaurant {
  return {
    followersCount: 0,
    isFollowing: false,
    menus: [],
    posts: [],
    ...restaurant,
  };
}

export default function FolderPlacesMapOverlay({
  list,
  visible,
  onClose,
}: Props) {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  const places = useMemo(
    () =>
      (list?.items ?? []).flatMap((item) => {
        const { latitude, longitude } = item.restaurant;
        if (latitude == null || longitude == null) return [];
        return [{ item, coordinate: [longitude, latitude] as [number, number] }];
      }),
    [list?.items],
  );
  const stayCoordinate = useMemo<[number, number] | null>(
    () =>
      list?.stayLocation
        ? [list.stayLocation.longitude, list.stayLocation.latitude]
        : null,
    [list],
  );
  const mapCoordinates = useMemo(
    () => [
      ...places.map(({ coordinate }) => coordinate),
      ...(stayCoordinate ? [stayCoordinate] : []),
    ],
    [places, stayCoordinate],
  );

  const fitPlaces = useCallback(() => {
    if (mapCoordinates.length === 0) return;
    if (mapCoordinates.length === 1) {
      cameraRef.current?.setCamera({
        centerCoordinate: mapCoordinates[0],
        zoomLevel: 14,
        animationDuration: 0,
      });
      return;
    }

    const longitudes = mapCoordinates.map(([longitude]) => longitude);
    const latitudes = mapCoordinates.map(([, latitude]) => latitude);
    cameraRef.current?.fitBounds(
      [Math.max(...longitudes), Math.max(...latitudes)],
      [Math.min(...longitudes), Math.min(...latitudes)],
      [insets.top + 110, 50, 180 + insets.bottom, 50],
      0,
    );
  }, [insets.bottom, insets.top, mapCoordinates]);

  const dismissRestaurantPreview = useCallback(() => {
    setSelectedRestaurant(null);
  }, []);

  const selectRestaurant = useCallback(
    (restaurant: ListRestaurant) => {
      setSelectedRestaurant(restaurantForPreview(restaurant));

      if (restaurant.latitude != null && restaurant.longitude != null) {
        cameraRef.current?.setCamera({
          centerCoordinate: [restaurant.longitude, restaurant.latitude],
          zoomLevel: 15,
          padding: {
            paddingTop: insets.top + 80,
            paddingRight: 40,
            paddingBottom: 260 + insets.bottom,
            paddingLeft: 40,
          },
          animationDuration: 500,
        });
      }

      void api.restaurants
        .get(restaurant.id)
        .then((details) => {
          setSelectedRestaurant((current) =>
            current?.id === restaurant.id
              ? {
                  ...details,
                  userRestaurant:
                    restaurant.userRestaurant ?? details.userRestaurant,
                }
              : current,
          );
        })
        .catch((error: unknown) => {
          console.error("Could not load restaurant preview", error);
        });
    },
    [insets.bottom, insets.top],
  );

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

  const closeOverlay = useCallback(() => {
    bottomSheetRef.current?.close();
    dismissRestaurantPreview();
    onClose();
  }, [dismissRestaurantPreview, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeOverlay}
    >
      <View
        className="flex-1"
        style={{ backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
      >
        <Mapbox.MapView
          style={{ flex: 1 }}
          styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street}
          scaleBarPosition={{ top: insets.top + 68, left: 16 }}
          onDidFinishLoadingMap={fitPlaces}
        >
          <Mapbox.Camera ref={cameraRef} />

          {places.map(({ item, coordinate }) => {
            const restaurant = item.restaurant;
            const isSelected = selectedRestaurant?.id === restaurant.id;

            return (
              <Mapbox.MarkerView
                key={restaurant.id}
                coordinate={coordinate}
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
                    borderColor: isSelected ? "#111827" : "#6B7280",
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
                </TouchableOpacity>
              </Mapbox.MarkerView>
            );
          })}

          {list?.stayLocation && stayCoordinate ? (
            <Mapbox.MarkerView
              coordinate={stayCoordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap
              allowOverlapWithPuck
            >
              <View
                accessibilityLabel={list.stayLocation.name ?? list.name}
                className="h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-[#F7B928] dark:border-[#171719]"
                style={{
                  shadowColor: "#0B0B0A",
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 6,
                }}
              >
                <HouseIcon size={25} color="#171719" weight="fill" />
              </View>
            </Mapbox.MarkerView>
          ) : null}
        </Mapbox.MapView>

        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 0,
            right: 0,
          }}
        >
          <View className="flex-row items-center px-4">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("back")}
              hitSlop={12}
              onPress={closeOverlay}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/55"
            >
              <DirectionalIcon
                direction="back"
                variant="arrow"
                size={24}
                color="#FAF9F6"
              />
            </TouchableOpacity>
            <View className="ml-3 max-w-[70%] rounded-full bg-black/55 px-4 py-2.5">
              <Text numberOfLines={1} className="font-bold text-white">
                {list?.name}
              </Text>
            </View>
          </View>
        </View>

        {selectedRestaurant ? (
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
            <BottomSheetView
              className="px-5"
              style={{ paddingBottom: insets.bottom + 24 }}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("close")}
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
                    {selectedRestaurant.userRestaurant?.favorite ? (
                      <View className="rounded-full bg-red-100 px-3 py-1">
                        <Text className="text-xs font-bold text-red-500">
                          {t("restaurants:favorite")}
                        </Text>
                      </View>
                    ) : null}
                    {selectedRestaurant.userRestaurant?.visited ? (
                      <View className="rounded-full bg-green-100 px-3 py-1">
                        <Text className="text-xs font-bold text-green-600">
                          {t("restaurants:visited")}
                        </Text>
                      </View>
                    ) : null}
                    {selectedRestaurant.userRestaurant?.wantToTry ? (
                      <View className="rounded-full bg-yellow-100 px-3 py-1">
                        <Text className="text-xs font-bold text-yellow-700">
                          {t("restaurants:wantToTry")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {selectedRestaurant.address || selectedRestaurant.city ? (
                    <Text className="mt-2 text-gray-500">
                      {[selectedRestaurant.address, selectedRestaurant.city]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  ) : null}
                </View>
              </View>

              {selectedRestaurant.bio ? (
                <Text
                  numberOfLines={3}
                  className="mt-4 leading-5 text-gray-600 dark:text-gray-300"
                >
                  {selectedRestaurant.bio}
                </Text>
              ) : null}

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
                  const restaurantId = selectedRestaurant.id;
                  closeOverlay();
                  requestAnimationFrame(() => {
                    router.push({
                      pathname: "/restaurants/[id]",
                      params: { id: restaurantId },
                    });
                  });
                }}
              >
                <Text className="text-center font-bold text-white dark:text-black">
                  {t("map:viewRestaurant")}
                </Text>
              </TouchableOpacity>
            </BottomSheetView>
          </BottomSheet>
        ) : null}
      </View>
    </Modal>
  );
}
