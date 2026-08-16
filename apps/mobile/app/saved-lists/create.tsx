import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import DateRangePickerModal from "@/components/lists/DateRangePickerModal";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import * as ImagePicker from "expo-image-picker";
import type { PlaceListEventType } from "@findeat/types";
import { router, Stack } from "expo-router";
import {
  CalendarBlankIcon,
  CameraIcon,
  CheckCircleIcon,
  FolderSimpleIcon,
  FolderSimplePlusIcon,
  TrashIcon,
} from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EVENT_TYPES: PlaceListEventType[] = [
  "TRIP",
  "BIRTHDAY",
  "DINNER",
  "DATE_NIGHT",
  "ANNIVERSARY",
  "NIGHT_OUT",
  "GRADUATION",
  "CELEBRATION",
  "CUSTOM",
];

export default function CreateSavedListScreen() {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [eventType, setEventType] = useState<PlaceListEventType | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [customDateMode, setCustomDateMode] = useState<"SINGLE" | "RANGE">("SINGLE");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function createList() {
    const trimmedName = name.trim();
    const usesDateRange =
      eventType === "TRIP" ||
      (eventType === "CUSTOM" && customDateMode === "RANGE");
    if (
      !trimmedName ||
      (eventType && !startDate) ||
      (usesDateRange && !endDate) ||
      creating
    ) return;
    setCreating(true);
    try {
      const coverUrl = coverUri ? await uploadImage(coverUri, "list") : null;
      const created = await api.placeLists.create({
        name: trimmedName,
        description: description.trim() || null,
        coverUrl,
        eventType,
        eventAt: eventType && startDate ? startDate.toISOString() : null,
        eventEndAt:
          eventType && usesDateRange && endDate
            ? endDate.toISOString()
            : null,
      });
      showToast(t("listCreated"));
      router.replace({
        pathname: "/saved-lists/[id]",
        params: { id: created.id },
      });
    } catch {
      showToast(t("listCreateError"), { kind: "error" });
    } finally {
      setCreating(false);
    }
  }

  const ink = isDark ? "#FAF9F6" : "#171717";
  const usesDateRange =
    eventType === "TRIP" ||
    (eventType === "CUSTOM" && customDateMode === "RANGE");
  const canCreate = Boolean(
    name.trim() &&
      (!eventType || (startDate && (!usesDateRange || endDate))),
  );

  function selectEventType(type: PlaceListEventType) {
    setEventType(type);
    setDatePickerOpen(false);
    if (type !== "TRIP" && type !== "CUSTOM") {
      setEndDate(null);
    }
  }

  async function pickCover() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        allowsMultipleSelection: false,
        aspect: [16, 9],
        quality: 0.86,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setCoverUri(result.assets[0].uri);
      }
    } catch {
      showToast(t("coverPhotoError"), { kind: "error" });
    }
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center"
        >
          <DirectionalIcon direction="back" variant="arrow" size={24} color={ink} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("createNewList")}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <KeyboardAwareFormScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        bottomOffset={28}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center pt-5">
          <View className="h-24 w-24 items-center justify-center rounded-[30px] bg-amber-100 dark:bg-amber-950">
            <FolderSimplePlusIcon size={46} color="#D97706" weight="duotone" />
          </View>
          <Text className="mt-5 text-center text-2xl font-bold text-black dark:text-white">
            {t("createNewList")}
          </Text>
          <Text className="mt-2 max-w-sm text-center text-sm leading-5 text-gray-500">
            {t("noListsHint")}
          </Text>
        </View>

        <Text className="mb-2 text-sm font-bold text-black dark:text-white">
          {t("folderCover")}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t(coverUri ? "changeCover" : "addListCover")}
          activeOpacity={0.84}
          onPress={() => void pickCover()}
          className="h-44 overflow-hidden rounded-[24px] border border-[#E5E1DB] bg-amber-50 dark:border-[#30302E] dark:bg-amber-950/40"
        >
          {coverUri ? (
            <ProgressiveImage
              source={{ uri: coverUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <CameraIcon size={34} color="#D97706" weight="duotone" />
              <Text className="mt-2 font-bold text-amber-700 dark:text-amber-300">
                {t("addListCover")}
              </Text>
            </View>
          )}
          {coverUri ? (
            <View className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-[#171512]/65 px-3 py-2">
              <CameraIcon size={16} color="#FAF9F6" weight="fill" />
              <Text className="ml-1.5 text-xs font-bold text-[#FAF9F6]">
                {t("changeCover")}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        {coverUri ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("removeCover")}
            onPress={() => setCoverUri(null)}
            className="mt-2 flex-row items-center justify-center py-2"
          >
            <TrashIcon size={16} color="#DC2626" weight="bold" />
            <Text className="ml-1.5 text-sm font-bold text-red-600">
              {t("removeCover")}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text className="mb-2 mt-5 text-sm font-bold text-black dark:text-white">
          {t("listName")}
        </Text>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          placeholder={t("listNamePlaceholder")}
          placeholderTextColor="#9CA3AF"
          maxLength={80}
          returnKeyType="next"
          style={{
            minHeight: 54,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? "#30302E" : "#E5E1DB",
            backgroundColor: isDark ? "#171716" : "#F4F1EC",
            paddingHorizontal: 16,
            color: ink,
            fontFamily: "CabinetRegular",
            fontSize: 16,
            textAlign: "auto",
          }}
        />

        <Text className="mb-2 mt-6 text-sm font-bold text-black dark:text-white">
          {t("listType")}
        </Text>
        <View className="gap-3">
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ checked: eventType === null }}
            activeOpacity={0.82}
            onPress={() => setEventType(null)}
            className="flex-row items-center rounded-2xl border p-4"
            style={{
              borderColor:
                eventType === null
                  ? "#D97706"
                  : isDark
                    ? "#30302E"
                    : "#E5E1DB",
              backgroundColor:
                eventType === null
                  ? isDark
                    ? "#2B2114"
                    : "#FFF7E6"
                  : isDark
                    ? "#171716"
                    : "#F4F1EC",
            }}
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950">
              <FolderSimpleIcon size={23} color="#D97706" weight="fill" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-black dark:text-white">
                {t("regularList")}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500">
                {t("regularListHint")}
              </Text>
            </View>
            {eventType === null ? (
              <CheckCircleIcon size={24} color="#D97706" weight="fill" />
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ checked: eventType !== null }}
            activeOpacity={0.82}
            onPress={() => setEventType((current) => current ?? "TRIP")}
            className="flex-row items-center rounded-2xl border p-4"
            style={{
              borderColor:
                eventType !== null
                  ? "#D97706"
                  : isDark
                    ? "#30302E"
                    : "#E5E1DB",
              backgroundColor:
                eventType !== null
                  ? isDark
                    ? "#2B2114"
                    : "#FFF7E6"
                  : isDark
                    ? "#171716"
                    : "#F4F1EC",
            }}
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950">
              <CalendarBlankIcon size={23} color="#D97706" weight="fill" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-black dark:text-white">
                {t("listEvent")}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500">
                {t("listEventHint")}
              </Text>
            </View>
            {eventType !== null ? (
              <CheckCircleIcon size={24} color="#D97706" weight="fill" />
            ) : null}
          </TouchableOpacity>
        </View>

        {eventType ? (
          <View className="mt-5 gap-4 rounded-2xl border border-[#E5E1DB] bg-[#F4F1EC] p-4 dark:border-[#30302E] dark:bg-[#171716]">
            <View className="flex-row flex-wrap gap-2">
              {EVENT_TYPES.map((type) => {
                const selected = eventType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => selectEventType(type)}
                    className="rounded-full px-3.5 py-2"
                    style={{
                      backgroundColor: selected
                        ? "#D97706"
                        : isDark
                          ? "#252523"
                          : "#FFFFFF",
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: selected ? "#FAF9F6" : ink }}
                    >
                      {t(`listEventTypes.${type}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {eventType === "CUSTOM" ? (
              <View>
                <Text className="mb-2 text-sm font-bold text-black dark:text-white">
                  {t("eventDateFormat")}
                </Text>
                <View className="flex-row rounded-2xl bg-white p-1 dark:bg-[#222220]">
                  {(["SINGLE", "RANGE"] as const).map((mode) => {
                    const selected = customDateMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => {
                          setCustomDateMode(mode);
                          setDatePickerOpen(false);
                          if (mode === "SINGLE") setEndDate(null);
                        }}
                        className="h-11 flex-1 items-center justify-center rounded-xl"
                        style={{ backgroundColor: selected ? "#D97706" : "transparent" }}
                      >
                        <Text weight="bold" style={{ color: selected ? "#FAF9F6" : ink }}>
                          {t(mode === "SINGLE" ? "fixedDate" : "eventDateRange")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {usesDateRange ? (
              <>
                <Text className="mb-3 text-sm font-bold text-black dark:text-white">
                  {t("eventDateRange")}
                </Text>
                <TouchableOpacity
                  onPress={() => setDateRangeOpen(true)}
                  className="flex-row gap-3 rounded-2xl border border-[#D8D3CA] bg-white p-3 dark:border-gray-700 dark:bg-[#222220]"
                >
                  <View className="min-h-14 flex-1 justify-center px-1">
                    <Text className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {t("startDate")}
                    </Text>
                    <Text numberOfLines={1} className="mt-1 font-bold text-black dark:text-white">
                      {startDate
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(startDate)
                        : t("selectDate")}
                    </Text>
                  </View>
                  <View className="w-px bg-gray-200 dark:bg-gray-700" />
                  <View className="min-h-14 flex-1 justify-center px-1">
                    <Text className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {t("endDate")}
                    </Text>
                    <Text numberOfLines={1} className="mt-1 font-bold text-black dark:text-white">
                      {endDate
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(endDate)
                        : t("selectDate")}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text className="text-sm font-bold text-black dark:text-white">
                  {t("fixedDate")}
                </Text>
                <TouchableOpacity
                  onPress={() => setDatePickerOpen((current) => !current)}
                  className="rounded-2xl border border-[#D8D3CA] bg-white p-3 dark:border-gray-700 dark:bg-[#222220]"
                >
                  <View className="min-h-14 justify-center px-1">
                    <Text className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {t("day")}
                    </Text>
                    <Text numberOfLines={1} className="mt-1 font-bold text-black dark:text-white">
                      {startDate
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(startDate)
                        : t("selectDate")}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        <Text className="mb-2 mt-6 text-sm font-bold text-black dark:text-white">
          {t("description")}
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("listDescriptionPlaceholder")}
          placeholderTextColor="#9CA3AF"
          maxLength={280}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 116,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? "#30302E" : "#E5E1DB",
            backgroundColor: isDark ? "#171716" : "#F4F1EC",
            padding: 16,
            color: ink,
            fontFamily: "CabinetRegular",
            fontSize: 16,
            textAlign: "auto",
          }}
        />
      </KeyboardAwareFormScrollView>

      <SafeAreaView
        edges={["bottom"]}
        className="absolute bottom-0 left-0 right-0 px-5 pb-3 pt-3"
        style={{ backgroundColor: isDark ? "#0B0B0AF2" : "#FBFAF8F2" }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!canCreate || creating}
          onPress={() => void createList()}
          className="h-14 items-center justify-center rounded-2xl bg-amber-500"
          style={{ opacity: !canCreate || creating ? 0.45 : 1 }}
        >
          {creating ? (
            <ActivityIndicator color="#FAF9F6" />
          ) : (
            <Text className="text-base font-bold text-white">{t("create")}</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
      <DateRangePickerModal
        visible={dateRangeOpen}
        startDate={startDate}
        endDate={endDate}
        title={eventType === "CUSTOM" ? t("selectEventDates") : undefined}
        onChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
        onClose={() => setDateRangeOpen(false)}
      />
      <DateRangePickerModal
        visible={datePickerOpen}
        selectionMode="single"
        title={t("chooseEventDate")}
        startDate={startDate}
        endDate={null}
        onChange={(day) => setStartDate(day)}
        onClose={() => setDatePickerOpen(false)}
      />
    </SafeAreaView>
  );
}
