import { EmptyState, Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import PlaceListRestaurantRow from "@/components/lists/PlaceListRestaurantRow";
import PlaceListOptionsBottomSheet from "@/components/lists/PlaceListOptionsBottomSheet";
import Avatar from "@/components/common/Avatar";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import type { PlaceListDetail } from "@findeat/types";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { CalendarBlankIcon, DotsThreeIcon, FolderSimpleIcon, MapPinIcon, MapTrifoldIcon, PlusIcon, UsersThreeIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SavedListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [openedAt] = useState(() => Date.now());

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

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
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
        <Text
          numberOfLines={1}
          className="flex-1 text-center text-xl font-bold text-black dark:text-white"
        >
          {list?.systemType
            ? t(
                list.systemType === "WANT_TO_TRY"
                  ? "wantToTry"
                  : list.systemType === "VISITED"
                    ? "visited"
                    : "favorite",
              )
            : (list?.name ?? t("myLists"))}
        </Text>
        {list?.systemType ? <View className="h-11 w-11" /> : <TouchableOpacity
          disabled={!list}
          accessibilityRole="button"
          accessibilityLabel={t("listOptions")}
          hitSlop={12}
          onPress={() => setOptionsOpen(true)}
          className="h-11 w-11 items-center justify-center"
        >
          <DotsThreeIcon size={26} color={isDark ? "#FAF9F6" : "#171717"} weight="bold" />
        </TouchableOpacity>}
      </View>

      {loading ? (
        <SkeletonPulse>
          <View className="px-5 pt-5">
            {[0, 1, 2, 3].map((item) => (
              <View key={item} className="mb-3 flex-row items-center rounded-[22px] bg-white p-3 dark:bg-gray-900">
                <Skeleton width={74} height={74} radius={16} />
                <View className="ml-3 flex-1">
                  <Skeleton width="65%" height={17} radius={6} />
                  <Skeleton width="45%" height={13} radius={6} style={{ marginTop: 9 }} />
                </View>
              </View>
            ))}
          </View>
        </SkeletonPulse>
      ) : (
        <FlatList
          data={list?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 28,
          }}
          renderItem={({ item }) => (
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
          )}
          ListHeaderComponent={
            list ? (
              <View className="mb-4">
                <View className="h-48 overflow-hidden rounded-[26px] bg-amber-50 dark:bg-amber-950/40">
                  {list.coverUrl || list.items[0]?.restaurant.coverUrl || list.items[0]?.restaurant.logoUrl ? (
                    <ProgressiveImage
                      source={{
                        uri:
                          list.coverUrl ??
                          list.items[0]?.restaurant.coverUrl ??
                          list.items[0]?.restaurant.logoUrl ??
                          "",
                      }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={180}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <FolderSimpleIcon size={54} color="#D97706" weight="duotone" />
                    </View>
                  )}
                </View>
                {list.description ? (
                  <Text className="mt-4 text-sm leading-5 text-gray-600 dark:text-gray-300">
                    {list.description}
                  </Text>
                ) : null}
                {list.eventType || list.eventAt || list.eventLocation ? (
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
                    {list.eventLocation ? (
                      <View className="mt-2 flex-row items-center">
                        <MapPinIcon size={17} color="#D97706" weight="fill" />
                        <Text className="ml-2 flex-1 text-sm text-amber-800 dark:text-amber-300">
                          {list.eventLocation}
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
                {list.items.length > 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/map",
                        params: { listId: list.id },
                      })
                    }
                    className="mt-4 flex-row items-center justify-center rounded-2xl bg-black px-4 py-3.5 dark:bg-white"
                  >
                    <MapTrifoldIcon
                      size={20}
                      color={isDark ? "#111" : "#FAF9F6"}
                      weight="fill"
                    />
                    <Text className="ml-2 font-bold text-white dark:text-black">
                      {t("viewFolderOnMap")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {!list.systemType ? <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/saved-lists/members/[id]",
                      params: { id: list.id },
                    })
                  }
                  className="mt-4 flex-row items-center rounded-2xl bg-white p-3 dark:bg-gray-900"
                >
                  <View className="flex-row">
                    {list.members.slice(0, 4).map((member, index) => (
                      <View key={member.id} style={{ marginLeft: index ? -8 : 0 }}>
                        <Avatar uri={member.avatarUrl} username={member.username} size={34} />
                      </View>
                    ))}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-black dark:text-white">
                      {list.memberCount > 1
                        ? t("sharedWithPeople", { count: list.memberCount })
                        : t("privateList")}
                    </Text>
                    <Text className="mt-0.5 text-xs text-gray-500">
                      {list.canInvite ? t("tapToInviteFriends") : t("listMembers")}
                    </Text>
                  </View>
                  <UsersThreeIcon size={21} color="#D97706" weight="fill" />
                </TouchableOpacity> : null}
                {list.canEdit && !list.systemType ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (list.eventLocationLatitude == null || list.eventLocationLongitude == null) {
                        router.push({ pathname: "/saved-lists/edit/[id]", params: { id: list.id } });
                        return;
                      }
                      router.push({ pathname: "/saved-lists/discover/[id]", params: { id: list.id } });
                    }}
                    className="mt-3 flex-row items-center justify-center rounded-2xl bg-amber-500 px-4 py-3.5"
                  >
                    <PlusIcon size={20} color="#FAF9F6" weight="bold" />
                    <Text className="ml-2 font-bold text-white">
                      {list.eventLocationLatitude == null ? t("chooseLocationToAddPlaces") : t("addPlaces")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <Text className="mb-1 mt-5 text-lg font-bold text-black dark:text-white">
                  {t("placesCount", { count: list.items.length })}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={FolderSimpleIcon}
              title={t("noPlacesInList")}
              description={t("noPlacesInListHint")}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      <PlaceListOptionsBottomSheet
        list={list}
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        onDelete={confirmDelete}
        onLeave={confirmLeave}
      />
    </SafeAreaView>
  );
}
