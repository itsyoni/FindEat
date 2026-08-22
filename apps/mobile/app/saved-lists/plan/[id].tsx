import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import {
  loadTripReminders,
  setTripEventReminder,
  setTripFolderReminder,
  type TripReminderSettings,
} from "@/lib/tripReminders";
import type { PlaceListDetail } from "@findeat/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  CalendarBlankIcon,
  BellIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  ClockIcon,
  PaletteIcon,
  PlusIcon,
  StorefrontIcon,
  TrashIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Reanimated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type ListItem = PlaceListDetail["items"][number];
const UNPLANNED = "unplanned";
const HOUR_ROW_HEIGHT = 58;
const TRIP_REMINDER_OFFSETS = [null, 0, 1, 3, 7] as const;
const EVENT_REMINDER_OFFSETS = [null, 0, 15, 30, 60, 120, 1440] as const;
type EventColor = NonNullable<ListItem["plannedColor"]>;
const EVENT_COLORS: {
  key: EventColor;
  swatch: string;
  light: string;
  lightText: string;
  dark: string;
  darkText: string;
}[] = [
  { key: "AMBER", swatch: "#D97706", light: "#FEF3C7", lightText: "#78350F", dark: "#451A03", darkText: "#FDE68A" },
  { key: "CORAL", swatch: "#EA580C", light: "#FFEDD5", lightText: "#7C2D12", dark: "#431407", darkText: "#FED7AA" },
  { key: "VIOLET", swatch: "#7C3AED", light: "#EDE9FE", lightText: "#4C1D95", dark: "#2E1065", darkText: "#DDD6FE" },
  { key: "BLUE", swatch: "#2563EB", light: "#DBEAFE", lightText: "#1E3A8A", dark: "#172554", darkText: "#BFDBFE" },
  { key: "GREEN", swatch: "#16A34A", light: "#DCFCE7", lightText: "#14532D", dark: "#052E16", darkText: "#BBF7D0" },
  { key: "PINK", swatch: "#DB2777", light: "#FCE7F3", lightText: "#831843", dark: "#500724", darkText: "#FBCFE8" },
];

function eventColors(color: EventColor | undefined, isDark: boolean) {
  if (color && /^#[0-9A-F]{6}$/i.test(color)) {
    return {
      background: `${color}2E`,
      text: isDark ? "#F5F2EC" : "#1B1A18",
      swatch: color,
    };
  }
  const palette = EVENT_COLORS.find((entry) => entry.key === color) ?? EVENT_COLORS[0];
  return {
    background: isDark ? palette.dark : palette.light,
    text: isDark ? palette.darkText : palette.lightText,
    swatch: palette.swatch,
  };
}

const CUSTOM_COLOR_STOPS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
] as const;

function interpolateColor(progress: number) {
  const bounded = Math.min(1, Math.max(0, progress));
  const scaled = bounded * (CUSTOM_COLOR_STOPS.length - 1);
  const index = Math.min(CUSTOM_COLOR_STOPS.length - 2, Math.floor(scaled));
  const ratio = scaled - index;
  const parse = (hex: string) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const from = parse(CUSTOM_COLOR_STOPS[index]);
  const to = parse(CUSTOM_COLOR_STOPS[index + 1]);
  const channel = (position: number) => Math.round(from[position] + (to[position] - from[position]) * ratio)
    .toString(16)
    .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`.toUpperCase();
}

function foregroundForColor(color: string) {
  const normalized = color.startsWith("#") ? color : "#D97706";
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 155
    ? "#1B1A18"
    : "#FAF9F6";
}

type TimelineEventCardProps = {
  item: ListItem;
  isDark: boolean;
  disabled: boolean;
  onPress: () => void;
  onDrop: (verticalDistance: number) => void;
};

function TimelineEventCard({
  item,
  isDark,
  disabled,
  onPress,
  onDrop,
}: TimelineEventCardProps) {
  const translateY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const startMinutes = item.plannedStartMinutes ?? 0;
  const durationMinutes = item.plannedDurationMinutes ?? 90;
  const eventHeight = Math.max(32, (durationMinutes / 60) * HOUR_ROW_HEIGHT - 4);
  const compact = eventHeight < 58;
  const palette = eventColors(item.plannedColor, isDark);
  const dragGesture = Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(280)
    .onStart(() => {
      dragScale.value = withTiming(1.01, { duration: 90 });
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      runOnJS(onDrop)(event.translationY);
    })
    .onFinalize(() => {
      translateY.value = 0;
      dragScale.value = withTiming(1, { duration: 80 });
    });
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: dragScale.value }],
  }));

  return (
    <GestureDetector gesture={dragGesture}>
      <Reanimated.View
        style={[
          {
            position: "absolute",
            top: (startMinutes / 60) * HOUR_ROW_HEIGHT + 2,
            left: 0,
            right: 0,
            height: eventHeight,
            zIndex: 2,
            shadowColor: isDark ? "#000000" : "#7C2D12",
            shadowOpacity: 0.16,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          },
          dragStyle,
        ]}
      >
      <TouchableOpacity
        disabled={disabled}
        onPress={onPress}
        activeOpacity={0.86}
        style={{
          backgroundColor: palette.background,
          borderLeftColor: palette.swatch,
          borderLeftWidth: 5,
        }}
        className="h-full overflow-hidden rounded-xl"
      >
        {item.restaurant.coverUrl ? (
          <>
            <ProgressiveImage
              source={{ uri: item.restaurant.coverUrl }}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
              contentFit="cover"
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(11,11,10,0.18)", "rgba(11,11,10,0.72)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            />
          </>
        ) : null}
        <View className="h-full flex-row items-center px-2 py-1.5">
          <View
            style={{ width: compact ? 26 : 34, height: compact ? 26 : 34 }}
            className="mr-2 overflow-hidden rounded-full border border-white/80 bg-white dark:border-black/60 dark:bg-[#242422]"
          >
            {item.restaurant.logoUrl ? (
              <ProgressiveImage
                source={{ uri: item.restaurant.logoUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <StorefrontIcon size={compact ? 13 : 16} color="#D97706" weight="fill" />
              </View>
            )}
          </View>
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className="font-bold"
              style={{ color: item.restaurant.coverUrl ? "#FAF9F6" : palette.text }}
            >
              {item.restaurant.name}
            </Text>
            {!compact ? (
              <Text
                className="mt-0.5 text-xs"
                style={{
                  color: item.restaurant.coverUrl ? "#FAF9F6" : palette.text,
                  opacity: 0.86,
                }}
              >
                {formatTime(startMinutes)} – {formatTime(Math.min(24 * 60, startMinutes + durationMinutes))}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
      </Reanimated.View>
    </GestureDetector>
  );
}

function formatTime(minutes: number) {
  const date = new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function timePickerValue(minutes: number) {
  return new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);
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
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation("common");
  const { showToast } = useToast();
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(UNPLANNED);
  const [dayTransitionDirection, setDayTransitionDirection] = useState<1 | -1>(1);
  const [movingItem, setMovingItem] = useState<ListItem | null>(null);
  const [draftDay, setDraftDay] = useState(UNPLANNED);
  const [draftStartMinutes, setDraftStartMinutes] = useState<number | null>(null);
  const [draftEndMinutes, setDraftEndMinutes] = useState<number | null>(null);
  const [draftColor, setDraftColor] = useState<EventColor>("AMBER");
  const [draftReminderOffset, setDraftReminderOffset] = useState<number | null>(null);
  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [colorBarWidth, setColorBarWidth] = useState(1);
  const [timePickerTarget, setTimePickerTarget] = useState<"start" | "end" | null>(null);
  const [addingAtMinutes, setAddingAtMinutes] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [tripReminderOpen, setTripReminderOpen] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<TripReminderSettings>({
    trip: null,
    events: {},
  });
  const [savingReminder, setSavingReminder] = useState(false);
  const daySwitcherRef = useRef<ScrollView>(null);
  const daySwitcherWidthRef = useRef(0);
  const dayLayoutsRef = useRef(
    new Map<string, { x: number; width: number }>(),
  );
  const dayPickerGesture = useMemo(
    () => Gesture.Native().disallowInterruption(true),
    [],
  );

  const scrollDayIntoView = useCallback((day: string, animated = true) => {
    const layout = dayLayoutsRef.current.get(day);
    const viewportWidth = daySwitcherWidthRef.current;
    if (!layout || viewportWidth <= 0) return;
    daySwitcherRef.current?.scrollTo({
      x: Math.max(0, layout.x + layout.width / 2 - viewportWidth / 2),
      animated,
    });
  }, []);

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
  useEffect(() => {
    if (!user?.id || !list?.id) return;
    void loadTripReminders(user.id, list.id).then(setReminderSettings);
  }, [list?.id, user?.id]);
  const days = useMemo(() => tripDays(list?.eventAt, list?.eventEndAt), [list?.eventAt, list?.eventEndAt]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollDayIntoView(selectedDay));
    return () => cancelAnimationFrame(frame);
  }, [scrollDayIntoView, selectedDay]);
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
  const unplannedItems = useMemo(
    () => (list?.items ?? []).filter((item) => dateKey(item.plannedDate) === UNPLANNED),
    [list?.items],
  );
  const listItems = selectedDay === UNPLANNED ? visibleItems : [];

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
          color: item.plannedColor ?? "AMBER",
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
    const start = item.plannedStartMinutes ?? null;
    setDraftStartMinutes(start);
    setDraftEndMinutes(start == null ? null : Math.min(24 * 60 - 1, start + (item.plannedDurationMinutes ?? 90)));
    setDraftColor(item.plannedColor ?? "AMBER");
    setDraftReminderOffset(reminderSettings.events[item.id]?.offsetMinutes ?? null);
    setCustomColorOpen(Boolean(item.plannedColor && item.plannedColor.startsWith("#")));
  }

  function updateDraftTime(target: "start" | "end", value?: Date) {
    if (!value) {
      setTimePickerTarget(null);
      return;
    }
    const minutes = value.getHours() * 60 + value.getMinutes();
    if (target === "start") {
      const nextStart = Math.min(24 * 60 - 31, minutes);
      setDraftStartMinutes(nextStart);
      setDraftEndMinutes((current) =>
        current == null || current <= nextStart
          ? Math.min(24 * 60 - 1, nextStart + 90)
          : current,
      );
    } else {
      const start = draftStartMinutes ?? 0;
      setDraftEndMinutes(Math.max(start + 30, minutes));
    }
    if (Platform.OS === "android") setTimePickerTarget(null);
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
            plannedDurationMinutes:
              draftDay === UNPLANNED || draftStartMinutes == null || draftEndMinutes == null
                ? entry.plannedDurationMinutes ?? 90
                : Math.max(30, draftEndMinutes - draftStartMinutes),
            plannedColor: draftColor,
          }
        : entry,
    );
    setMovingItem(null);
    void persist(next);
    void scheduleEventReminder(
      item,
      draftDay === UNPLANNED ? dateKey(item.plannedDate) : draftDay,
      draftStartMinutes ?? item.plannedStartMinutes ?? 0,
      draftDay === UNPLANNED ? null : draftReminderOffset,
      false,
    );
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

  function addPlaceAtTime(item: ListItem) {
    if (!list || addingAtMinutes == null || selectedDay === UNPLANNED) return;
    const nextOrder = list.items.filter(
      (entry) => dateKey(entry.plannedDate) === selectedDay,
    ).length;
    const next = list.items.map((entry) =>
      entry.id === item.id
        ? {
            ...entry,
            plannedDate: `${selectedDay}T12:00:00.000Z`,
            plannedStartMinutes: addingAtMinutes,
            plannedDurationMinutes: entry.plannedDurationMinutes ?? 90,
            planOrder: nextOrder,
          }
        : entry,
    );
    setAddingAtMinutes(null);
    void persist(next);
  }

  function moveEventOnTimeline(item: ListItem, verticalDistance: number) {
    if (!list || saving) return;
    const currentStart = item.plannedStartMinutes ?? 0;
    const duration = item.plannedDurationMinutes ?? 90;
    const minuteDelta = Math.round((verticalDistance / HOUR_ROW_HEIGHT) * 2) * 30;
    const latestStart = Math.max(0, 24 * 60 - duration);
    const nextStart = Math.min(latestStart, Math.max(0, currentStart + minuteDelta));
    if (nextStart === currentStart) return;
    const next = list.items.map((entry) =>
      entry.id === item.id ? { ...entry, plannedStartMinutes: nextStart } : entry,
    );
    void persist(next);
    const reminderOffset = reminderSettings.events[item.id]?.offsetMinutes;
    if (reminderOffset != null) {
      void scheduleEventReminder(item, selectedDay, nextStart, reminderOffset, false);
    }
  }

  function removeEventFromSchedule() {
    if (!list || !movingItem) return;
    const next = list.items.map((entry) =>
      entry.id === movingItem.id
        ? {
            ...entry,
            plannedDate: null,
            plannedStartMinutes: null,
          }
        : entry,
    );
    setMovingItem(null);
    void persist(next);
    void scheduleEventReminder(
      movingItem,
      dateKey(movingItem.plannedDate),
      movingItem.plannedStartMinutes ?? 0,
      null,
      false,
    );
  }

  function tripReminderLabel(offset: number | null) {
    if (offset == null) return t("reminderOff");
    if (offset === 0) return t("morningOfTrip");
    return t("daysBefore", { count: offset });
  }

  function eventReminderLabel(offset: number | null) {
    if (offset == null) return t("reminderOff");
    if (offset === 0) return t("atEventTime");
    if (offset === 1440) return t("oneDayBefore");
    if (offset >= 60) return t("hoursBefore", { count: offset / 60 });
    return t("minutesBefore", { count: offset });
  }

  async function updateTripReminder(offsetDays: number | null) {
    if (!user?.id || !list?.eventAt) return;
    setSavingReminder(true);
    try {
      const settings = await setTripFolderReminder({
        userId: user.id,
        listId: list.id,
        listName: list.name,
        startDay: list.eventAt.slice(0, 10),
        offsetDays,
        language: i18n.language,
      });
      setReminderSettings(settings);
      setTripReminderOpen(false);
      showToast(offsetDays == null ? t("reminderRemoved") : t("reminderSet"));
    } catch {
      showToast(t("reminderError"), { kind: "error" });
    } finally {
      setSavingReminder(false);
    }
  }

  async function scheduleEventReminder(
    item: ListItem,
    day: string,
    startMinutes: number,
    offsetMinutes: number | null,
    announce = true,
  ) {
    if (!user?.id || !list) return;
    setSavingReminder(true);
    try {
      const settings = await setTripEventReminder({
        userId: user.id,
        listId: list.id,
        itemId: item.id,
        restaurantName: item.restaurant.name,
        day,
        startMinutes,
        offsetMinutes,
        language: i18n.language,
      });
      setReminderSettings(settings);
      if (announce) {
        showToast(offsetMinutes == null ? t("reminderRemoved") : t("reminderSet"));
      }
    } catch {
      if (announce) showToast(t("reminderError"), { kind: "error" });
    } finally {
      setSavingReminder(false);
    }
  }

  function openAddPlaces() {
    if (!list) return;
    setAddingAtMinutes(null);
    if (list.eventLocationLatitude == null || list.eventLocationLongitude == null) {
      router.push({ pathname: "/saved-lists/edit/[id]", params: { id: list.id } });
      return;
    }
    router.push({ pathname: "/saved-lists/discover/[id]", params: { id: list.id } });
  }

  function selectTripDay(day: string) {
    if (day === selectedDay) return;
    const orderedDays = [...days, UNPLANNED];
    const currentIndex = orderedDays.indexOf(selectedDay);
    const nextIndex = orderedDays.indexOf(day);
    setDayTransitionDirection(nextIndex >= currentIndex ? 1 : -1);
    setSelectedDay(day);
  }

  function moveToAdjacentDay(direction: 1 | -1) {
    const orderedDays = [...days, UNPLANNED];
    const currentIndex = orderedDays.indexOf(selectedDay);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= orderedDays.length) return;
    selectTripDay(orderedDays[nextIndex]);
  }

  const daySwipeGesture = Gesture.Pan()
    .activeOffsetX([-28, 28])
    .failOffsetY([-20, 20])
    .onEnd((event) => {
      if (event.translationX < -48 || event.velocityX < -650) {
        runOnJS(moveToAdjacentDay)(1);
      } else if (event.translationX > 48 || event.velocityX > 650) {
        runOnJS(moveToAdjacentDay)(-1);
      }
    });

  const ink = isDark ? "#F5F2EC" : "#1B1A18";
  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-[#FBFAF8] dark:bg-[#0B0B0A]"
      edges={["top", "bottom"]}
    >
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={ink} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-black dark:text-white">{t("tripPlan")}</Text>
          <Text numberOfLines={1} className="text-xs text-gray-500">{list?.name}</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center">
          {saving ? (
            <ActivityIndicator size="small" color="#D97706" />
          ) : (
            <TouchableOpacity
              onPress={() => setTripReminderOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("tripReminder")}
              className="h-11 w-11 items-center justify-center rounded-full"
            >
              <BellIcon
                size={23}
                color={reminderSettings.trip ? "#D97706" : ink}
                weight={reminderSettings.trip ? "fill" : "regular"}
              />
              {reminderSettings.trip ? (
                <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#FBFAF8] bg-amber-500 dark:border-[#0B0B0A]" />
              ) : null}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <View style={{ flex: 1 }} className="items-center justify-center"><ActivityIndicator color="#D97706" /></View>
        ) : !list?.eventAt || !list.eventEndAt ? (
          <View style={{ flex: 1 }} className="items-center justify-center px-8">
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
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={[0]}
          >
            <View
              style={{
                height: 76,
                zIndex: 20,
                backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
              }}
            >
              <ScrollView
                ref={daySwitcherRef}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                onLayout={(event) => {
                  daySwitcherWidthRef.current = event.nativeEvent.layout.width;
                  scrollDayIntoView(selectedDay, false);
                }}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  gap: 8,
                  paddingVertical: 12,
                }}
              >
            {[...days, UNPLANNED].map((day, index) => {
              const selected = day === selectedDay;
              const count = list.items.filter((item) => dateKey(item.plannedDate) === day).length;
              return (
                <TouchableOpacity
                  key={day}
                  onLayout={(event) => {
                    dayLayoutsRef.current.set(day, {
                      x: event.nativeEvent.layout.x,
                      width: event.nativeEvent.layout.width,
                    });
                    if (day === selectedDay) {
                      scrollDayIntoView(day, false);
                    }
                  }}
                  onPress={() => selectTripDay(day)}
                  className="min-w-19.5 rounded-2xl px-4 py-2.5"
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
            </View>

            <GestureDetector gesture={daySwipeGesture}>
              <Reanimated.View
                key={selectedDay}
                entering={
                  dayTransitionDirection === 1
                    ? FadeInRight.duration(190)
                    : FadeInLeft.duration(190)
                }
                exiting={
                  dayTransitionDirection === 1
                    ? FadeOutLeft.duration(140)
                    : FadeOutRight.duration(140)
                }
                style={{ paddingHorizontal: 18, paddingTop: 6 }}
              >
            {selectedDay === UNPLANNED ? (
              <Text className="mb-3 text-lg font-bold text-black dark:text-white">
                {t("savedPlaces")}
              </Text>
            ) : null}
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
              <View className="items-center rounded-3xl border border-dashed border-gray-300 px-6 py-12 dark:border-gray-700">
                <CalendarBlankIcon size={40} color="#D97706" weight="duotone" />
                <Text className="mt-3 text-center font-bold text-black dark:text-white">
                  {selectedDay === UNPLANNED ? t("everythingPlanned") : t("nothingPlannedForDay")}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">{t("assignRestaurantDayHint")}</Text>
              </View>
            ) : null}
            {selectedDay !== UNPLANNED ? (
              <View>
                <Text className="mb-3 text-xl font-bold text-black dark:text-white">
                  {t("daySchedule")}
                </Text>
                {untimedItems.length ? (
                  <View className="mb-4 rounded-[22px] bg-violet-50 p-3 dark:bg-violet-950/35">
                    <Text className="mb-2 font-bold text-violet-950 dark:text-violet-100">
                      {t("withoutTime")}
                    </Text>
                    {untimedItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        disabled={!list.canEdit}
                        onPress={() => openSchedule(item)}
                        className="mb-2 flex-row items-center rounded-2xl bg-white px-3 py-3 dark:bg-[#211F25]"
                      >
                        <CalendarBlankIcon size={19} color="#7C3AED" weight="duotone" />
                        <Text numberOfLines={1} className="ml-2 flex-1 font-bold text-black dark:text-white">
                          {item.restaurant.name}
                        </Text>
                        <Text className="text-xs font-bold text-violet-600 dark:text-violet-300">
                          {t("addTime")}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                <View
                  style={{ marginHorizontal: -18, height: HOUR_ROW_HEIGHT * 24 }}
                  className="overflow-hidden bg-white dark:bg-[#171716]"
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <View
                      key={hour}
                      style={{ height: HOUR_ROW_HEIGHT }}
                      className="flex-row border-b border-gray-100 dark:border-gray-800"
                    >
                      <View className="w-[58px] items-center justify-center px-1">
                        <Text className="text-center text-xs font-bold text-gray-500">
                          {formatTime(hour * 60)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        disabled={!list.canEdit}
                        onPress={() => setAddingAtMinutes(hour * 60)}
                        accessibilityRole="button"
                        accessibilityLabel={t("addPlaceAtTime", { time: formatTime(hour * 60) })}
                        className="flex-1 border-l border-gray-100 dark:border-gray-800"
                      />
                    </View>
                  ))}
                  <View
                    pointerEvents="box-none"
                    style={{ position: "absolute", top: 0, right: 8, bottom: 0, left: 66 }}
                  >
                    {timedItems.map((item) => (
                      <TimelineEventCard
                        key={item.id}
                        item={item}
                        isDark={isDark}
                        disabled={!list.canEdit || saving}
                        onPress={() => openSchedule(item)}
                        onDrop={(verticalDistance) => moveEventOnTimeline(item, verticalDistance)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
              </Reanimated.View>
            </GestureDetector>
          </ScrollView>
        )}
      </View>

      <AppBottomSheet
        open={tripReminderOpen}
        onClose={() => setTripReminderOpen(false)}
        snapPoints={["58%"]}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}>
          <View className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <BellIcon size={27} color="#D97706" weight="duotone" />
            </View>
            <Text className="mt-3 text-xl font-bold text-black dark:text-white">
              {t("tripReminder")}
            </Text>
            <Text className="mb-5 mt-1 text-center text-sm text-gray-500">
              {t("tripReminderHint")}
            </Text>
          </View>
          {TRIP_REMINDER_OFFSETS.map((offset) => {
            const selected = (reminderSettings.trip?.offsetDays ?? null) === offset;
            return (
              <TouchableOpacity
                key={offset == null ? "off" : offset}
                disabled={savingReminder}
                onPress={() => void updateTripReminder(offset)}
                className="mb-2 h-14 flex-row items-center rounded-2xl bg-gray-100 px-4 dark:bg-[#242422]"
              >
                <Text className="flex-1 font-bold text-black dark:text-white">
                  {tripReminderLabel(offset)}
                </Text>
                {selected ? <CheckIcon size={20} color="#D97706" weight="bold" /> : null}
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </AppBottomSheet>

      <AppBottomSheet
        open={addingAtMinutes != null}
        onClose={() => setAddingAtMinutes(null)}
        snapPoints={["70%"]}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}>
          <Text className="text-center text-lg font-bold text-black dark:text-white">
            {t("addPlaceAtTime", { time: formatTime(addingAtMinutes ?? 0) })}
          </Text>
          <Text className="mb-5 mt-1 text-center text-sm text-gray-500">
            {t("chooseSavedPlace")}
          </Text>

          {unplannedItems.map((item) => {
            const cover = item.restaurant.coverUrl;
            const logo = item.restaurant.logoUrl;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => addPlaceAtTime(item)}
                className="mb-3 flex-row items-center rounded-[20px] bg-gray-100 p-3 dark:bg-[#242422]"
              >
                <View className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800">
                  {cover ? (
                    <ProgressiveImage
                      source={{ uri: cover }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : null}
                  <View className="absolute bottom-1 left-1 h-7 w-7 overflow-hidden rounded-full border border-white bg-white dark:border-[#242422] dark:bg-gray-800">
                    {logo ? (
                      <ProgressiveImage
                        source={{ uri: logo }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <StorefrontIcon size={15} color="#D97706" weight="fill" />
                      </View>
                    )}
                  </View>
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-bold text-black dark:text-white">
                    {item.restaurant.name}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500">
                    {formatTime(addingAtMinutes ?? 0)}
                  </Text>
                </View>
                <DirectionalIcon direction="forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}

          {!unplannedItems.length ? (
            <View className="items-center px-6 py-8">
              <StorefrontIcon size={42} color="#D97706" weight="duotone" />
              <Text className="mt-3 text-center font-bold text-black dark:text-white">
                {t("noUnplannedPlaces")}
              </Text>
            </View>
          ) : null}

          {list?.canEdit ? (
            <TouchableOpacity
              onPress={openAddPlaces}
              className="mt-2 h-14 flex-row items-center justify-center rounded-2xl bg-amber-500"
            >
              <PlusIcon size={20} color="#FAF9F6" weight="bold" />
              <Text className="ml-2 font-bold text-white">{t("addPlaces")}</Text>
            </TouchableOpacity>
          ) : null}
        </BottomSheetScrollView>
      </AppBottomSheet>

      <AppBottomSheet
        open={Boolean(movingItem)}
        onClose={() => setMovingItem(null)}
        snapPoints={["90%"]}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}>
          <Text className="text-center text-xl font-bold text-black dark:text-white">
            {t("editSchedule")}
          </Text>
          <View className="mb-5 mt-4 flex-row items-center rounded-3xl bg-gray-100 p-3 dark:bg-[#242422]">
            <View className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800">
              {movingItem?.restaurant.coverUrl ? (
                <ProgressiveImage
                  source={{ uri: movingItem.restaurant.coverUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : null}
              <View className="absolute bottom-1 left-1 h-7 w-7 overflow-hidden rounded-full border border-white bg-white dark:border-[#242422] dark:bg-gray-800">
                {movingItem?.restaurant.logoUrl ? (
                  <ProgressiveImage
                    source={{ uri: movingItem.restaurant.logoUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <StorefrontIcon size={15} color="#D97706" weight="fill" />
                  </View>
                )}
              </View>
            </View>
            <View className="ml-3 min-w-0 flex-1">
              <Text numberOfLines={1} className="text-base font-bold text-black dark:text-white">
                {movingItem?.restaurant.name}
              </Text>
              <Text className="mt-1 text-sm text-gray-500">
                {draftDay === UNPLANNED
                  ? t("unplanned")
                  : `${formatTime(draftStartMinutes ?? 0)} – ${formatTime(draftEndMinutes ?? 0)}`}
              </Text>
            </View>
            <View
              style={{ backgroundColor: eventColors(draftColor, isDark).swatch }}
              className="h-9 w-9 rounded-full"
            />
          </View>

          <Text className="mb-2 text-sm font-bold text-black dark:text-white">{t("chooseDay")}</Text>
          <GestureDetector gesture={dayPickerGesture}>
            <ScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
            >
            {[...days, UNPLANNED].map((day, index) => {
              const current = draftDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => {
                    setDraftDay(day);
                    if (day === UNPLANNED) {
                      setDraftStartMinutes(null);
                      setDraftEndMinutes(null);
                    } else if (draftStartMinutes == null) {
                      setDraftStartMinutes(12 * 60);
                      setDraftEndMinutes(13 * 60 + 30);
                    }
                  }}
                  className="min-w-23 rounded-2xl px-3 py-3"
                  style={{ backgroundColor: current ? "#D97706" : isDark ? "#252523" : "#F0ECE6" }}
                >
                  <Text numberOfLines={1} className="text-center text-xs font-bold" style={{ color: current ? "#FAF9F6" : ink }}>
                    {day === UNPLANNED ? t("unplanned") : `${t("day", { defaultValue: "Day" })} ${index + 1}`}
                  </Text>
                  {day !== UNPLANNED ? (
                    <Text
                      numberOfLines={1}
                      className="mt-1 text-center text-xs"
                      style={{ color: current ? "#FFF1D6" : "#77736D" }}
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        month: "short",
                        day: "numeric",
                      }).format(new Date(`${day}T12:00:00`))}
                    </Text>
                  ) : null}
                  {current ? (
                    <CheckIcon
                      style={{ alignSelf: "center", marginTop: 4 }}
                      size={16}
                      color="#FAF9F6"
                      weight="bold"
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </GestureDetector>

          {draftDay !== UNPLANNED ? (
            <View className="mt-5">
              <Text className="mb-2 text-sm font-bold text-black dark:text-white">{t("time")}</Text>
              <View className="rounded-[22px] bg-gray-100 p-3 dark:bg-[#242422]">
                <View className="flex-row items-center">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                    <ClockIcon size={22} color="#D97706" weight="duotone" />
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setTimePickerTarget((current) => current === "start" ? null : "start")
                    }
                    className="ml-3 flex-1 rounded-2xl px-3 py-2"
                    style={{
                      backgroundColor:
                        timePickerTarget === "start"
                          ? isDark ? "#343431" : "#FFFFFF"
                          : "transparent",
                    }}
                  >
                    <Text className="text-xs font-bold text-gray-500">{t("startTime")}</Text>
                    <Text className="mt-0.5 text-lg font-bold text-black dark:text-white">
                      {formatTime(draftStartMinutes ?? 12 * 60)}
                    </Text>
                  </TouchableOpacity>
                  <DirectionalIcon direction="forward" variant="arrow" size={18} color="#9CA3AF" />
                  <TouchableOpacity
                    onPress={() =>
                      setTimePickerTarget((current) => current === "end" ? null : "end")
                    }
                    className="ml-1 flex-1 rounded-2xl px-3 py-2"
                    style={{
                      backgroundColor:
                        timePickerTarget === "end"
                          ? isDark ? "#343431" : "#FFFFFF"
                          : "transparent",
                    }}
                  >
                    <Text className="text-xs font-bold text-gray-500">{t("endTime")}</Text>
                    <Text className="mt-0.5 text-lg font-bold text-black dark:text-white">
                      {formatTime(draftEndMinutes ?? 13 * 60 + 30)}
                    </Text>
                  </TouchableOpacity>
                </View>
                {Platform.OS === "ios" && timePickerTarget ? (
                  <DateTimePicker
                    value={timePickerValue(
                      timePickerTarget === "start"
                        ? draftStartMinutes ?? 12 * 60
                        : draftEndMinutes ?? 13 * 60 + 30,
                    )}
                    mode="time"
                    display="spinner"
                    minuteInterval={5}
                    themeVariant={isDark ? "dark" : "light"}
                    onValueChange={(_, value) => updateDraftTime(timePickerTarget, value)}
                    style={{ height: 146, alignSelf: "stretch" }}
                  />
                ) : null}
              </View>
              {Platform.OS === "android" && timePickerTarget ? (
                <DateTimePicker
                  value={timePickerValue(
                    timePickerTarget === "start"
                      ? draftStartMinutes ?? 12 * 60
                      : draftEndMinutes ?? 13 * 60 + 30,
                  )}
                  mode="time"
                  display="default"
                  minuteInterval={5}
                  onValueChange={(_, value) => updateDraftTime(timePickerTarget, value)}
                  onDismiss={() => setTimePickerTarget(null)}
                />
              ) : null}
              <Text className="mb-2 mt-5 text-sm font-bold text-black dark:text-white">
                {t("eventReminder")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 3 }}
              >
                {EVENT_REMINDER_OFFSETS.map((offset) => {
                  const selected = draftReminderOffset === offset;
                  return (
                    <TouchableOpacity
                      key={offset == null ? "off" : offset}
                      onPress={() => setDraftReminderOffset(offset)}
                      className="h-11 flex-row items-center rounded-full px-4"
                      style={{
                        backgroundColor: selected
                          ? "#D97706"
                          : isDark
                            ? "#252523"
                            : "#F0ECE6",
                      }}
                    >
                      {selected ? (
                        <CheckIcon size={16} color="#FAF9F6" weight="bold" />
                      ) : (
                        <BellIcon size={16} color={isDark ? "#C9C5BE" : "#6B6761"} />
                      )}
                      <Text
                        className="ml-2 text-sm font-bold"
                        style={{ color: selected ? "#FAF9F6" : ink }}
                      >
                        {eventReminderLabel(offset)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text className="mb-2 mt-5 text-sm font-bold text-black dark:text-white">
                {t("eventColor")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingVertical: 3, paddingHorizontal: 2 }}
              >
                {EVENT_COLORS.map((color) => {
                  const selected = draftColor === color.key;
                  return (
                    <TouchableOpacity
                      key={color.key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t(`eventColors.${color.key.toLowerCase()}`)}
                      onPress={() => {
                        setDraftColor(color.key);
                        setCustomColorOpen(false);
                      }}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: color.swatch,
                        borderWidth: selected ? 3 : 0,
                        borderColor: isDark ? "#F5F2EC" : "#1B1A18",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected ? <CheckIcon size={19} color="#FAF9F6" weight="bold" /> : null}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("customColor")}
                  onPress={() => {
                    setCustomColorOpen(true);
                    if (!draftColor.startsWith("#")) setDraftColor("#E11D48");
                  }}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    borderWidth: draftColor.startsWith("#") ? 3 : 0,
                    borderColor: isDark ? "#F5F2EC" : "#1B1A18",
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={[...CUSTOM_COLOR_STOPS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                  >
                    <PaletteIcon size={19} color="#FAF9F6" weight="fill" />
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>

              {customColorOpen ? (
                <View className="mt-4 rounded-2xl bg-gray-100 p-3 dark:bg-[#242422]">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-black dark:text-white">{t("customColor")}</Text>
                    <Text className="text-xs font-bold text-gray-500">{draftColor}</Text>
                  </View>
                  <Pressable
                    onLayout={(event) => setColorBarWidth(Math.max(1, event.nativeEvent.layout.width))}
                    onPress={(event) =>
                      setDraftColor(interpolateColor(event.nativeEvent.locationX / colorBarWidth))
                    }
                    onTouchMove={(event) =>
                      setDraftColor(interpolateColor(event.nativeEvent.locationX / colorBarWidth))
                    }
                    className="h-11 overflow-hidden rounded-xl"
                  >
                    <LinearGradient
                      colors={[...CUSTOM_COLOR_STOPS]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ flex: 1 }}
                    />
                  </Pressable>
                </View>
              ) : null}

              <View
                style={{
                  backgroundColor: eventColors(draftColor, isDark).background,
                  borderLeftColor: eventColors(draftColor, isDark).swatch,
                  borderLeftWidth: 5,
                }}
                className="mt-4 flex-row items-center rounded-2xl p-3"
              >
                <PaletteIcon size={21} color={eventColors(draftColor, isDark).swatch} weight="fill" />
                <View className="ml-3 min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-bold" style={{ color: eventColors(draftColor, isDark).text }}>
                    {movingItem?.restaurant.name}
                  </Text>
                  <Text className="mt-0.5 text-xs" style={{ color: eventColors(draftColor, isDark).text, opacity: 0.76 }}>
                    {draftDay === UNPLANNED
                      ? t("unplanned")
                      : `${formatTime(draftStartMinutes ?? 0)} – ${formatTime(draftEndMinutes ?? 0)}`}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={
              draftDay !== UNPLANNED &&
              (draftStartMinutes == null || draftEndMinutes == null || draftEndMinutes <= draftStartMinutes)
            }
            onPress={applySchedule}
            className="mt-6 h-14 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: eventColors(draftColor, isDark).swatch,
              opacity:
                draftDay !== UNPLANNED &&
                (draftStartMinutes == null || draftEndMinutes == null || draftEndMinutes <= draftStartMinutes)
                  ? 0.45
                  : 1,
            }}
          >
            <Text
              className="font-bold"
              style={{ color: foregroundForColor(eventColors(draftColor, isDark).swatch) }}
            >
              {t("saveSchedule")}
            </Text>
          </TouchableOpacity>
          {draftDay !== UNPLANNED ? (
            <TouchableOpacity
              onPress={removeEventFromSchedule}
              className="mt-3 h-12 flex-row items-center justify-center rounded-2xl"
            >
              <TrashIcon size={19} color="#DC2626" weight="duotone" />
              <Text className="ml-2 font-bold text-red-600 dark:text-red-400">
                {t("removeFromSchedule")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </BottomSheetScrollView>
      </AppBottomSheet>
    </SafeAreaView>
  );
}
