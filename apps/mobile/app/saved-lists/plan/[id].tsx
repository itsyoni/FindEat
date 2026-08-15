import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { PlaceListDetail } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  CalendarBlankIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  StorefrontIcon,
} from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ListItem = PlaceListDetail["items"][number];
const UNPLANNED = "unplanned";
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => index * 30);
const DURATION_OPTIONS = [30, 60, 90, 120, 180];

function formatTime(minutes: number) {
  const date = new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dateKey(value?: string | null) {
  return value ? value.slice(0, 10) : UNPLANNED;
}

function tripDays(start?: string | null, end?: string | null) {
  if (!start || !end) return [];
  const cursor = new Date(`${start.slice(0, 10)}T12:00:00.000Z`);
  const last = new Date(`${end.slice(0, 10)}T12:00:00.000Z`);
  const result: string[] = [];
  while (cursor <= last && result.length < 90) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export default function TripPlannerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppTheme();
  const { t } = useTranslation("common");
  const { showToast } = useToast();
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(UNPLANNED);
  const [movingItem, setMovingItem] = useState<ListItem | null>(null);
  const [draftDay, setDraftDay] = useState(UNPLANNED);
  const [draftStartMinutes, setDraftStartMinutes] = useState<number | null>(null);
  const [draftDurationMinutes, setDraftDurationMinutes] = useState(90);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const value = await api.placeLists.get(id);
      setList(value);
      const firstDay = tripDays(value.eventAt, value.eventEndAt)[0];
      setSelectedDay((current) => current === UNPLANNED ? firstDay ?? UNPLANNED : current);
    } catch {
      showToast(t("tripPlanLoadError"), { kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [id, showToast, t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const days = useMemo(() => tripDays(list?.eventAt, list?.eventEndAt), [list?.eventAt, list?.eventEndAt]);
  const visibleItems = useMemo(
    () => (list?.items ?? [])
      .filter((item) => dateKey(item.plannedDate) === selectedDay)
      .sort((left, right) => left.planOrder - right.planOrder || left.addedAt.localeCompare(right.addedAt)),
    [list?.items, selectedDay],
  );
  const untimedItems = useMemo(
    () => visibleItems.filter((item) => item.plannedStartMinutes == null),
    [visibleItems],
  );
  const timedItems = useMemo(
    () => visibleItems
      .filter((item) => item.plannedStartMinutes != null)
      .sort((left, right) =>
        (left.plannedStartMinutes ?? 0) - (right.plannedStartMinutes ?? 0),
      ),
    [visibleItems],
  );
  const listItems = selectedDay === UNPLANNED ? visibleItems : untimedItems;

  async function persist(nextItems: ListItem[]) {
    if (!list || saving) return;
    const previous = list.items;
    setList({ ...list, items: nextItems });
    setSaving(true);
    try {
      const updated = await api.placeLists.updateItinerary(
        list.id,
        nextItems.map((item) => ({
          itemId: item.id,
          plannedDate: item.plannedDate ? dateKey(item.plannedDate) : null,
          order: item.planOrder,
          startMinutes: item.plannedStartMinutes ?? null,
          durationMinutes: item.plannedDurationMinutes ?? 90,
        })),
      );
      setList(updated);
    } catch {
      setList({ ...list, items: previous });
      showToast(t("tripPlanUpdateError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  function openSchedule(item: ListItem) {
    setMovingItem(item);
    setDraftDay(dateKey(item.plannedDate));
    setDraftStartMinutes(item.plannedStartMinutes ?? null);
    setDraftDurationMinutes(item.plannedDurationMinutes ?? 90);
  }

  function applySchedule() {
    const item = movingItem;
    if (!list) return;
    if (!item) return;
    const nextOrder = list.items.filter((entry) => dateKey(entry.plannedDate) === draftDay).length;
    const next = list.items.map((entry) =>
      entry.id === item.id
        ? {
            ...entry,
            plannedDate: draftDay === UNPLANNED ? null : `${draftDay}T12:00:00.000Z`,
            planOrder: nextOrder,
            plannedStartMinutes:
              draftDay === UNPLANNED ? null : draftStartMinutes,
            plannedDurationMinutes: draftDurationMinutes,
          }
        : entry,
    );
    setMovingItem(null);
    void persist(next);
  }

  function reorder(item: ListItem, direction: -1 | 1) {
    if (!list) return;
    const group = selectedDay === UNPLANNED ? visibleItems : untimedItems;
    const index = group.findIndex((entry) => entry.id === item.id);
    const target = index + direction;
    if (target < 0 || target >= group.length) return;
    const first = group[index];
    const second = group[target];
    const next = list.items.map((entry) => {
      if (entry.id === first.id) return { ...entry, planOrder: second.planOrder };
      if (entry.id === second.id) return { ...entry, planOrder: first.planOrder };
      return entry;
    });
    void persist(next);
  }

  const ink = isDark ? "#F5F2EC" : "#1B1A18";
  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF8] dark:bg-[#0B0B0A]" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={ink} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-black dark:text-white">{t("tripPlan")}</Text>
          <Text numberOfLines={1} className="text-xs text-gray-500">{list?.name}</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center">
          {saving ? <ActivityIndicator size="small" color="#D97706" /> : null}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#D97706" /></View>
      ) : !list?.eventAt || !list.eventEndAt ? (
        <View className="flex-1 items-center justify-center px-8">
          <CalendarBlankIcon size={54} color="#D97706" weight="duotone" />
          <Text className="mt-4 text-center text-xl font-bold text-black dark:text-white">{t("addTripDatesFirst")}</Text>
          <Text className="mt-2 text-center text-gray-500">{t("addTripDatesFirstHint")}</Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/saved-lists/edit/[id]", params: { id: String(list?.id ?? id ?? "") } })}
            className="mt-5 rounded-2xl bg-amber-500 px-6 py-3.5"
          >
            <Text className="font-bold text-white">{t("chooseDates")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}>
            {[...days, UNPLANNED].map((day, index) => {
              const selected = day === selectedDay;
              const count = list.items.filter((item) => dateKey(item.plannedDate) === day).length;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  className="min-w-[78px] rounded-2xl px-4 py-2.5"
                  style={{ backgroundColor: selected ? "#D97706" : isDark ? "#1F1F1D" : "#EEEAE3" }}
                >
                  <Text className="text-center text-xs font-bold" style={{ color: selected ? "#FAF9F6" : ink }}>
                    {day === UNPLANNED ? t("savedPlaces").toUpperCase() : `${t("day", { defaultValue: "Day" }).toUpperCase()} ${index + 1}`}
                  </Text>
                  <Text className="mt-0.5 text-center text-xs" style={{ color: selected ? "#FFF1D6" : "#77736D" }}>
                    {day === UNPLANNED
                      ? `${count} ${t("unplanned").toLowerCase()}`
                      : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${day}T12:00:00`))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
            <Text className="mb-3 text-lg font-bold text-black dark:text-white">
              {selectedDay === UNPLANNED ? t("savedPlaces") : t("withoutTime")}
            </Text>
            {listItems.length ? listItems.map((item, index) => {
              const image = item.restaurant.coverUrl ?? item.restaurant.logoUrl;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push({ pathname: "/restaurants/[id]", params: { id: item.restaurant.id } })}
                  className="mb-3 flex-row items-center rounded-[22px] bg-white p-3 dark:bg-[#1A1A18]"
                >
                  <View className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                    {image ? <ProgressiveImage source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : (
                      <View className="flex-1 items-center justify-center"><StorefrontIcon size={26} color="#D97706" weight="duotone" /></View>
                    )}
                  </View>
                  <View className="ml-3 min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-bold text-black dark:text-white">{item.restaurant.name}</Text>
                    {item.addedBy ? (
                      <View className="mt-1 flex-row items-center">
                        <Avatar uri={item.addedBy.avatarUrl} username={item.addedBy.username} size={18} showSnapIndicator={false} />
                        <Text numberOfLines={1} className="ml-1.5 text-xs text-gray-500">{t("savedBy", { name: item.addedBy.displayName })}</Text>
                      </View>
                    ) : null}
                  </View>
                  {selectedDay !== UNPLANNED && list.canEdit ? (
                    <View className="mr-1 gap-1">
                      <TouchableOpacity disabled={index === 0 || saving} onPress={() => reorder(item, -1)} className="h-8 w-8 items-center justify-center">
                        <CaretUpIcon size={18} color={index === 0 ? "#B8B4AE" : ink} weight="bold" />
                      </TouchableOpacity>
                      <TouchableOpacity disabled={index === listItems.length - 1 || saving} onPress={() => reorder(item, 1)} className="h-8 w-8 items-center justify-center">
                        <CaretDownIcon size={18} color={index === listItems.length - 1 ? "#B8B4AE" : ink} weight="bold" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {list.canEdit ? (
                    <TouchableOpacity onPress={() => openSchedule(item)} className="h-11 w-11 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
                      <CalendarBlankIcon size={20} color="#D97706" weight="fill" />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            }) : selectedDay === UNPLANNED ? (
              <View className="items-center rounded-[24px] border border-dashed border-gray-300 px-6 py-12 dark:border-gray-700">
                <CalendarBlankIcon size={40} color="#D97706" weight="duotone" />
                <Text className="mt-3 text-center font-bold text-black dark:text-white">
                  {selectedDay === UNPLANNED ? t("everythingPlanned") : t("nothingPlannedForDay")}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">{t("assignRestaurantDayHint")}</Text>
              </View>
            ) : null}
            {selectedDay !== UNPLANNED ? (
              <View className="mt-6">
                <Text className="mb-3 text-lg font-bold text-black dark:text-white">
                  {t("daySchedule")}
                </Text>
                <View className="overflow-hidden rounded-[24px] bg-white dark:bg-[#171716]">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const hourItems = timedItems.filter(
                      (item) => Math.floor((item.plannedStartMinutes ?? 0) / 60) === hour,
                    );
                    return (
                      <View
                        key={hour}
                        className="min-h-[62px] flex-row border-b border-gray-100 dark:border-gray-800"
                      >
                        <Text className="w-[66px] px-3 pt-3 text-xs font-bold text-gray-500">
                          {formatTime(hour * 60)}
                        </Text>
                        <View className="flex-1 border-l border-gray-100 px-2 py-1.5 dark:border-gray-800">
                          {hourItems.map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              disabled={!list.canEdit}
                              onPress={() => openSchedule(item)}
                              className="mb-1 rounded-xl bg-amber-100 px-3 py-2 dark:bg-amber-950/50"
                            >
                              <Text numberOfLines={1} className="font-bold text-amber-950 dark:text-amber-100">
                                {item.restaurant.name}
                              </Text>
                              <Text className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                                {formatTime(item.plannedStartMinutes ?? 0)} · {item.plannedDurationMinutes ?? 90} min
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </>
      )}

      <AppBottomSheet open={Boolean(movingItem)} onClose={() => setMovingItem(null)} snapPoints={["90%"]}>
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}>
          <Text className="mb-1 text-center text-lg font-bold text-black dark:text-white">{t("editSchedule")}</Text>
          <Text numberOfLines={1} className="mb-4 text-center text-sm text-gray-500">{movingItem?.restaurant.name}</Text>
          <Text className="mb-2 text-sm font-bold text-black dark:text-white">{t("chooseDay")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
            {[...days, UNPLANNED].map((day, index) => {
              const current = draftDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => {
                    setDraftDay(day);
                    if (day === UNPLANNED) setDraftStartMinutes(null);
                  }}
                  className="min-w-[92px] rounded-2xl px-3 py-3"
                  style={{ backgroundColor: current ? "#D97706" : isDark ? "#252523" : "#F0ECE6" }}
                >
                  <Text numberOfLines={1} className="text-center text-xs font-bold" style={{ color: current ? "#FAF9F6" : ink }}>
                    {day === UNPLANNED ? t("unplanned") : `${t("day", { defaultValue: "Day" })} ${index + 1}`}
                  </Text>
                  {current ? <CheckIcon style={{ alignSelf: "center", marginTop: 4 }} size={16} color="#FAF9F6" weight="bold" /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {draftDay !== UNPLANNED ? (
            <>
              <Text className="mb-2 mt-5 text-sm font-bold text-black dark:text-white">{t("startTime")}</Text>
              <View className="flex-row flex-wrap gap-2">
                {TIME_OPTIONS.map((minutes) => {
                  const selected = draftStartMinutes === minutes;
                  return (
                    <TouchableOpacity
                      key={minutes}
                      onPress={() => setDraftStartMinutes(minutes)}
                      className="w-[23%] rounded-xl px-2 py-2.5"
                      style={{ backgroundColor: selected ? "#D97706" : isDark ? "#252523" : "#F0ECE6" }}
                    >
                      <Text className="text-center text-xs font-bold" style={{ color: selected ? "#FAF9F6" : ink }}>
                        {formatTime(minutes)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="mb-2 mt-5 text-sm font-bold text-black dark:text-white">{t("duration")}</Text>
              <View className="flex-row flex-wrap gap-2">
                {DURATION_OPTIONS.map((minutes) => {
                  const selected = draftDurationMinutes === minutes;
                  return (
                    <TouchableOpacity
                      key={minutes}
                      onPress={() => setDraftDurationMinutes(minutes)}
                      className="rounded-xl px-4 py-3"
                      style={{ backgroundColor: selected ? "#D97706" : isDark ? "#252523" : "#F0ECE6" }}
                    >
                      <Text className="font-bold" style={{ color: selected ? "#FAF9F6" : ink }}>
                        {minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          <TouchableOpacity
            disabled={draftDay !== UNPLANNED && draftStartMinutes == null}
            onPress={applySchedule}
            className="mt-6 h-14 items-center justify-center rounded-2xl bg-amber-500"
            style={{ opacity: draftDay !== UNPLANNED && draftStartMinutes == null ? 0.45 : 1 }}
          >
            <Text className="font-bold text-white">{t("saveSchedule")}</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </AppBottomSheet>
    </SafeAreaView>
  );
}
