import { EmptyState, Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import FolderPlacesMapOverlay from "@/components/lists/FolderPlacesMapOverlay";
import ParallaxFolderCover, {
  FOLDER_COVER_HEIGHT,
} from "@/components/lists/ParallaxFolderCover";
import PlaceListRestaurantRow from "@/components/lists/PlaceListRestaurantRow";
import PlaceListOptionsBottomSheet from "@/components/lists/PlaceListOptionsBottomSheet";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import type { PlaceListDetail } from "@findeat/types";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  CalendarBlankIcon,
  CalendarDotsIcon,
  DotsThreeIcon,
  FolderSimpleIcon,
  MapTrifoldIcon,
  PlusIcon,
} from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function SavedListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setList(await api.placeLists.get(id));
    } catch {
      showToast(t("listLoadError"), { kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const interval = setInterval(() => void load(), 15_000);
      return () => clearInterval(interval);
    }, [load]),
  );

  function confirmDelete() {
    if (!list) return;
    Alert.alert(t("deleteListTitle"), t("deleteListDescription"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => void deleteList(),
      },
    ]);
  }

  async function deleteList() {
    if (!list) return;
    try {
      await api.placeLists.remove(list.id);
      showToast(t("listDeleted"));
      router.back();
    } catch {
      showToast(t("listDeleteError"), { kind: "error" });
    }
  }

  function confirmLeave() {
    if (!list) return;
    Alert.alert(t("leaveListTitle"), t("leaveListDescription"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("leaveList"), style: "destructive", onPress: () => void leaveList() },
    ]);
  }

  async function leaveList() {
    if (!list) return;
    try {
      await api.placeLists.leave(list.id);
      showToast(t("listLeft"));
      router.back();
    } catch {
      showToast(t("listLeaveError"), { kind: "error" });
    }
  }

  function openAddPlaces() {
    if (!list) return;
    if (
      list.eventLocationLatitude == null ||
      list.eventLocationLongitude == null
    ) {
      router.push({
        pathname: "/saved-lists/edit/[id]",
        params: { id: list.id },
      });
      return;
    }
    router.push({
      pathname: "/saved-lists/discover/[id]",
      params: { id: list.id },
    });
  }

  const showFixedAddButton = Boolean(list?.canEdit && !list.systemType);
  const hasMappablePlaces = Boolean(
    list?.items.some(
      ({ restaurant }) =>
        restaurant.latitude != null && restaurant.longitude != null,
    ),
  );
  const needsFolderLocation =
    list?.eventLocationLatitude == null ||
    list?.eventLocationLongitude == null;

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      {loading ? (
        <SkeletonPulse>
          <View style={{ flex: 1 }}>
            <View className="relative">
              <Skeleton height={FOLDER_COVER_HEIGHT} radius={0} />
              <SafeAreaView
                edges={["top"]}
                style={{ position: "absolute", top: 0, left: 0, right: 0 }}
              >
                <View className="mt-2 flex-row justify-between px-4">
                  <Skeleton width={44} height={44} circle />
                  <Skeleton width={44} height={44} circle />
                </View>
              </SafeAreaView>
            </View>
            <View
              className="-mt-7 flex-1 rounded-t-[30px] px-5 pt-7"
              style={{ backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
            >
              <Skeleton width="58%" height={26} radius={8} />
              <Skeleton width="82%" height={14} radius={6} style={{ marginTop: 12 }} />
              <Skeleton width="66%" height={14} radius={6} style={{ marginTop: 7 }} />
              <View className="mt-7">
                {[0, 1, 2, 3].map((item) => (
                  <View
                    key={item}
                    className="mb-3 flex-row items-center rounded-[22px] bg-white p-3 dark:bg-gray-900"
                  >
                    <Skeleton width={74} height={74} radius={16} />
                    <View className="ml-3 flex-1">
                      <Skeleton width="65%" height={17} radius={6} />
                      <Skeleton
                        width="45%"
                        height={13}
                        radius={6}
                        style={{ marginTop: 9 }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </SkeletonPulse>
      ) : (
        <Animated.FlatList
          style={{ backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
          data={list?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: showFixedAddButton
              ? insets.bottom + 96
              : Math.max(28, insets.bottom + 16),
            backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
          }}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          renderItem={({ item }) => (
            <View
              className="px-5"
              style={{
                backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
                zIndex: 1,
              }}
            >
              <PlaceListRestaurantRow
                item={item}
                onPress={() =>
                  router.push({
                    pathname: "/restaurants/[id]",
                    params: { id: item.restaurant.id },
                  })
                }
                onPressSourcePost={
                  item.sourcePost
                    ? () =>
                        router.push({
                          pathname: "/(posts)/[id]",
                          params: { id: item.sourcePost!.id },
                        })
                    : undefined
                }
              />
            </View>
          )}
          ListHeaderComponent={
            list ? (
              <View>
                <View className="relative">
                  <ParallaxFolderCover list={list} scrollY={scrollY} />
                  <SafeAreaView
                    edges={["top"]}
                    pointerEvents="box-none"
                    style={{ position: "absolute", top: 0, left: 0, right: 0 }}
                  >
                    <View className="mt-2 flex-row items-center justify-between px-4">
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("back")}
                        hitSlop={12}
                        onPress={() => router.back()}
                        className="h-11 w-11 items-center justify-center rounded-full bg-black/35"
                      >
                        <DirectionalIcon
                          direction="back"
                          variant="arrow"
                          size={24}
                          color="#FAF9F6"
                        />
                      </TouchableOpacity>
                      <View className="flex-row items-center gap-2">
                        {list.eventType === "TRIP" ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={t("planTripByDay")}
                            hitSlop={8}
                            onPress={() =>
                              router.push({
                                pathname: "/saved-lists/plan/[id]",
                                params: { id: list.id },
                              })
                            }
                            className="h-11 w-11 items-center justify-center rounded-full bg-black/35"
                          >
                            <CalendarDotsIcon
                              size={25}
                              color="#FAF9F6"
                              weight="fill"
                            />
                          </TouchableOpacity>
                        ) : null}
                        {hasMappablePlaces ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={t("viewFolderOnMap")}
                            hitSlop={8}
                            onPress={() => setMapOpen(true)}
                            className="h-11 w-11 items-center justify-center rounded-full bg-black/35"
                          >
                            <MapTrifoldIcon
                              size={23}
                              color="#FAF9F6"
                              weight="fill"
                            />
                          </TouchableOpacity>
                        ) : null}
                        {!list.systemType ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={t("listOptions")}
                            hitSlop={8}
                            onPress={() => setOptionsOpen(true)}
                            className="h-11 w-11 items-center justify-center rounded-full bg-black/35"
                          >
                            <DotsThreeIcon
                              size={26}
                              color="#FAF9F6"
                              weight="bold"
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </SafeAreaView>
                </View>

                <View
                  className="-mt-7 rounded-t-[30px] px-5 pb-4 pt-7"
                  style={{
                    backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
                    zIndex: 1,
                  }}
                >
                  <Text
                    numberOfLines={2}
                    className="text-center text-2xl font-bold leading-8 text-black dark:text-white"
                  >
                    {list.systemType
                      ? t(
                          list.systemType === "WANT_TO_TRY"
                            ? "wantToTry"
                            : list.systemType === "VISITED"
                              ? "visited"
                              : "favorite",
                        )
                      : list.name}
                  </Text>
                  {list.description ? (
                    <Text className="mt-2 text-center text-sm leading-5 text-gray-600 dark:text-gray-300">
                      {list.description}
                    </Text>
                  ) : null}
                {list.eventType !== "TRIP" &&
                (list.eventType || list.eventAt) ? (
                  <View className="mt-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/35">
                    <Text className="font-bold text-amber-900 dark:text-amber-200">
                      {list.eventType ? t(`listEventTypes.${list.eventType}`) : t("listEvent")}
                    </Text>
                    {list.eventAt ? (
                      <View className="mt-2 flex-row items-center">
                        <CalendarBlankIcon size={17} color="#D97706" weight="fill" />
                        <Text className="ml-2 text-sm text-amber-800 dark:text-amber-300">
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(list.eventAt))}
                          {list.eventEndAt
                            ? ` – ${new Intl.DateTimeFormat(undefined, {
                                dateStyle: "medium",
                              }).format(new Date(list.eventEndAt))}`
                            : ""}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {list.eventType === "TRIP" &&
                !list.stayLocation &&
                list.eventAt &&
                new Date(list.eventAt).getTime() <= openedAt ? (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/saved-lists/edit/[id]",
                        params: { id: list.id },
                      })
                    }
                    className="mt-3 rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/35"
                  >
                    <Text className="font-bold text-violet-900 dark:text-violet-200">
                      Have you arrived?
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-violet-700 dark:text-violet-300">
                      Add where you’re staying to see nearby restaurants and distance from your stay.
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <Text className="mb-1 mt-5 text-lg font-bold text-black dark:text-white">
                  {t("placesCount", { count: list.items.length })}
                </Text>
                </View>
              </View>
            ) : (
              <SafeAreaView edges={["top"]}>
                <View className="h-14 flex-row items-center px-4">
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t("back")}
                    hitSlop={12}
                    onPress={() => router.back()}
                    className="h-11 w-11 items-center justify-center"
                  >
                    <DirectionalIcon
                      direction="back"
                      variant="arrow"
                      size={24}
                      color={isDark ? "#FAF9F6" : "#171717"}
                    />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            )
          }
          ListEmptyComponent={
            <View
              className="flex-1 px-5"
              style={{
                backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
                zIndex: 1,
              }}
            >
              <EmptyState
                icon={FolderSimpleIcon}
                title={t("noPlacesInList")}
                description={t("noPlacesInListHint")}
              />
            </View>
          }
          ListFooterComponent={
            <View
              className="h-4"
              style={{ backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      {showFixedAddButton ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: insets.bottom + 12,
            zIndex: 10,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              needsFolderLocation
                ? t("chooseLocationToAddPlaces")
                : t("addPlaces")
            }
            onPress={openAddPlaces}
            className="flex-row items-center justify-center rounded-2xl bg-amber-500 px-4 py-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: isDark ? 0.38 : 0.2,
              shadowRadius: 12,
              elevation: 7,
            }}
          >
            <PlusIcon size={20} color="#FAF9F6" weight="bold" />
            <Text className="ml-2 font-bold text-white">
              {needsFolderLocation
                ? t("chooseLocationToAddPlaces")
                : t("addPlaces")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FolderPlacesMapOverlay
        list={list}
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
      />
      <PlaceListOptionsBottomSheet
        list={list}
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        onDelete={confirmDelete}
        onLeave={confirmLeave}
        onViewMap={() => setMapOpen(true)}
      />
    </View>
  );
}
