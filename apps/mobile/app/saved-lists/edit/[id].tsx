import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import DateRangePickerModal from "@/components/lists/DateRangePickerModal";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { consumePendingListLocation } from "@/lib/listLocationSelection";
import type {
  PlaceListDetail,
  PlaceListEventType,
  StayLocationSuggestion,
} from "@findeat/types";
import { uploadImage } from "@/lib/uploadImage";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  BedIcon,
  CameraIcon,
  MapPinIcon,
  TrashIcon,
  XIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditSavedListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [newCoverUri, setNewCoverUri] = useState<string | null>(null);
  const [eventType, setEventType] = useState<PlaceListEventType | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventEndDate, setEventEndDate] = useState<Date | null>(null);
  const [customDateMode, setCustomDateMode] = useState<"SINGLE" | "RANGE">("SINGLE");
  const [eventLocation, setEventLocation] = useState("");
  const [eventLocationLatitude, setEventLocationLatitude] = useState<number | null>(null);
  const [eventLocationLongitude, setEventLocationLongitude] = useState<number | null>(null);
  const [destinationCountryCode, setDestinationCountryCode] = useState<string | null>(null);
  const [destinationBounds, setDestinationBounds] = useState<PlaceListDetail["destinationBounds"]>(null);
  const [stayName, setStayName] = useState("");
  const [stayLatitude, setStayLatitude] = useState<number | null>(null);
  const [stayLongitude, setStayLongitude] = useState<number | null>(null);
  const [staySource, setStaySource] = useState<"SEARCH" | "MAP" | "CURRENT_LOCATION" | null>(null);
  const [stayResults, setStayResults] = useState<StayLocationSuggestion[]>([]);
  const [staySearchEnabled, setStaySearchEnabled] = useState(false);
  const [staySearching, setStaySearching] = useState(false);
  const [allowInvites, setAllowInvites] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.placeLists
      .get(id)
      .then((value) => {
        setList(value);
        setName(value.name);
        setDescription(value.description ?? "");
        setCoverUrl(value.coverUrl ?? null);
        setEventType(value.eventType ?? null);
        setEventDate(value.eventAt ? new Date(value.eventAt) : null);
        setEventEndDate(value.eventEndAt ? new Date(value.eventEndAt) : null);
        setCustomDateMode(value.eventEndAt ? "RANGE" : "SINGLE");
        setEventLocation(value.eventLocation ?? "");
        setEventLocationLatitude(value.eventLocationLatitude ?? null);
        setEventLocationLongitude(value.eventLocationLongitude ?? null);
        setDestinationCountryCode(value.destinationCountryCode ?? null);
        setDestinationBounds(value.destinationBounds ?? null);
        setStayName(value.stayLocation?.name ?? "");
        setStayLatitude(value.stayLocation?.latitude ?? null);
        setStayLongitude(value.stayLocation?.longitude ?? null);
        setStaySource(value.stayLocation?.source ?? null);
        setAllowInvites(value.allowMembersToInvite);
      })
      .catch(() => showToast(t("listLoadError"), { kind: "error" }));
  }, [id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const location = consumePendingListLocation(id);
      if (!location) return;
      setEventLocation(location.placeName);
      setEventLocationLatitude(location.latitude);
      setEventLocationLongitude(location.longitude);
      setDestinationCountryCode(location.countryCode ?? null);
      setDestinationBounds(location.bounds ?? null);
    }, [id]),
  );

  useEffect(() => {
    if (eventType !== "TRIP" || !staySearchEnabled) return;
    const query = stayName.trim();
    if (query.length < 2) return;
    let active = true;
    const timeout = setTimeout(async () => {
      try {
        setStaySearching(true);
        const results = await api.restaurants.searchStayLocations(
          query,
          i18n.language,
        );
        if (active) setStayResults(results);
      } catch {
        if (active) setStayResults([]);
      } finally {
        if (active) setStaySearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [eventType, i18n.language, stayName, staySearchEnabled]);

  async function pickCover() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled) setNewCoverUri(result.assets[0].uri);
  }

  async function save() {
    const rangeRequired =
      eventType === "TRIP" ||
      (eventType === "CUSTOM" && customDateMode === "RANGE");
    if (
      !list ||
      !name.trim() ||
      (eventType && !eventDate) ||
      (rangeRequired && !eventEndDate) ||
      saving
    ) return;
    setSaving(true);
    try {
      const nextCoverUrl = newCoverUri
        ? await uploadImage(newCoverUri, "list")
        : coverUrl;
      await api.placeLists.update(list.id, {
        name: name.trim(),
        description: description.trim() || null,
        coverUrl: nextCoverUrl,
        eventAt: eventType && eventDate ? eventDate.toISOString() : null,
        eventEndAt:
          (eventType === "TRIP" ||
            (eventType === "CUSTOM" && customDateMode === "RANGE")) &&
          eventEndDate
            ? eventEndDate.toISOString()
            : null,
        eventLocation: eventLocation.trim() || null,
        eventLocationLatitude,
        eventLocationLongitude,
        destinationCountryCode,
        destinationSouthLat: destinationBounds?.south ?? null,
        destinationWestLng: destinationBounds?.west ?? null,
        destinationNorthLat: destinationBounds?.north ?? null,
        destinationEastLng: destinationBounds?.east ?? null,
        stayName: stayName.trim() || null,
        stayLatitude,
        stayLongitude,
        staySource,
        allowMembersToInvite: allowInvites,
      });
      showToast(t("listUpdated"));
      router.back();
    } catch {
      showToast(t("listUpdateError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  const coverPreview = newCoverUri ?? coverUrl;
  const usesDateRange =
    eventType === "TRIP" ||
    (eventType === "CUSTOM" && customDateMode === "RANGE");
  const canSave = Boolean(
    list &&
      name.trim() &&
      (!eventType || (eventDate && (!usesDateRange || eventEndDate))),
  );

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FAF9F6" : "#171717"} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("editList")}
        </Text>
        <TouchableOpacity
          disabled={!canSave || saving}
          onPress={() => void save()}
          className="min-w-11 px-1 py-3"
          style={{ opacity: !canSave || saving ? 0.45 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#D97706" />
          ) : (
            <Text className="text-right font-bold text-amber-600 dark:text-amber-300">
              {t("save")}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        <KeyboardAwareFormScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          bottomOffset={28}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => void pickCover()}
            className="h-48 overflow-hidden rounded-[26px] bg-amber-50 dark:bg-amber-950/40"
          >
            {coverPreview ? (
              <ProgressiveImage source={{ uri: coverPreview }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <CameraIcon size={34} color="#D97706" weight="duotone" />
                <Text className="mt-2 font-bold text-amber-700 dark:text-amber-300">
                  {t("addListCover")}
                </Text>
              </View>
            )}
            {coverPreview ? (
              <View className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-black/60 px-3 py-2">
                <CameraIcon size={16} color="#FAF9F6" weight="fill" />
                <Text className="ml-1.5 text-xs font-bold text-white">{t("changeCover")}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          {coverPreview ? (
            <TouchableOpacity
              onPress={() => {
                setNewCoverUri(null);
                setCoverUrl(null);
              }}
              className="mt-2 flex-row items-center justify-center py-2"
            >
              <TrashIcon size={16} color="#DC2626" weight="bold" />
              <Text className="ml-1.5 text-sm font-bold text-red-600">{t("removeCover")}</Text>
            </TouchableOpacity>
          ) : null}

          <Text className="mb-2 mt-5 text-sm font-bold text-gray-500">{t("listName")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={80}
            placeholder={t("listNamePlaceholder")}
            placeholderTextColor="#9CA3AF"
            className="rounded-2xl border border-[#D8D3CA] bg-white px-4 py-3.5 text-base text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <Text className="mb-2 mt-5 text-sm font-bold text-gray-500">{t("description")}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            multiline
            placeholder={t("listDescriptionPlaceholder")}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
            className="min-h-24 rounded-2xl border border-[#D8D3CA] bg-white px-4 py-3.5 text-base text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />

          {eventType ? (
            <>
              {eventType === "CUSTOM" ? (
                <View className="mt-4">
                  <Text className="mb-2 text-sm font-bold text-gray-500">
                    {t("eventDateFormat")}
                  </Text>
                  <View className="flex-row rounded-2xl bg-[#F4F1EC] p-1 dark:bg-gray-900">
                    {(["SINGLE", "RANGE"] as const).map((mode) => {
                      const selected = customDateMode === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          onPress={() => {
                            setCustomDateMode(mode);
                            setDatePickerOpen(false);
                            if (mode === "SINGLE") setEventEndDate(null);
                          }}
                          className="h-11 flex-1 items-center justify-center rounded-xl"
                          style={{ backgroundColor: selected ? "#D97706" : "transparent" }}
                        >
                          <Text
                            weight="bold"
                            style={{ color: selected ? "#FAF9F6" : isDark ? "#FAF9F6" : "#171717" }}
                          >
                            {t(mode === "SINGLE" ? "fixedDate" : "eventDateRange")}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              {usesDateRange ? (
                <TouchableOpacity
                  onPress={() => setDateRangeOpen(true)}
                  className="mt-4 flex-row gap-3 rounded-2xl border border-[#D8D3CA] bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                >
                  <View className="min-h-14 flex-1 justify-center px-1">
                    <Text className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {t("startDate")}
                    </Text>
                    <Text numberOfLines={1} className="mt-1 font-bold text-black dark:text-white">
                      {eventDate
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(eventDate)
                        : t("selectDate")}
                    </Text>
                  </View>
                  <View className="w-px bg-gray-200 dark:bg-gray-700" />
                  <View className="min-h-14 flex-1 justify-center px-1">
                    <Text className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {t("endDate")}
                    </Text>
                    <Text numberOfLines={1} className="mt-1 font-bold text-black dark:text-white">
                      {eventEndDate
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(eventEndDate)
                        : t("selectDate")}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setDatePickerOpen((current) => !current)}
                  className="mt-4 rounded-2xl border border-[#D8D3CA] bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                >
                  <View className="min-h-14 justify-center px-1">
                    <Text className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {t("day")}
                    </Text>
                    <Text numberOfLines={1} className="mt-1 font-bold text-black dark:text-white">
                      {eventDate
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(eventDate)
                        : t("selectDate")}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </>
          ) : null}

          <Text className="mb-2 mt-5 text-sm font-bold text-gray-500">{t("location")}</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: "/saved-lists/location-search",
                params: { id, kind: "destination" },
              })
            }
            className="flex-row items-center rounded-2xl border border-[#D8D3CA] bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
          >
            <MapPinIcon size={20} color="#D97706" weight="fill" />
            <Text numberOfLines={1} className={`ml-3 flex-1 text-base ${eventLocation ? "text-black dark:text-white" : "text-gray-400"}`}>
              {eventLocation || t("eventLocationPlaceholder")}
            </Text>
            {eventLocation ? (
              <TouchableOpacity
                hitSlop={10}
                onPress={() => {
                  setEventLocation("");
                  setEventLocationLatitude(null);
                  setEventLocationLongitude(null);
                }}
                className="h-8 w-8 items-center justify-center"
              >
                <XIcon size={17} color="#9CA3AF" weight="bold" />
              </TouchableOpacity>
            ) : (
              <DirectionalIcon direction="forward" size={18} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {eventType === "TRIP" ? (
            <View className="mt-5 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
              <Text className="font-bold text-black dark:text-white">Your stay</Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Optional. We’ll show how far each place is from where you’re staying.
              </Text>
              <View className="mt-3 flex-row items-center rounded-xl border border-amber-200 bg-white px-3 dark:border-amber-900 dark:bg-gray-900">
                <BedIcon size={20} color="#D97706" weight="fill" />
                <TextInput
                  value={stayName}
                  onFocus={() => {
                    if (stayLatitude == null || stayLongitude == null) {
                      setStaySearchEnabled(true);
                    }
                  }}
                  onChangeText={(value) => {
                    setStayName(value);
                    setStayLatitude(null);
                    setStayLongitude(null);
                    setStaySource(null);
                    setStaySearchEnabled(true);
                    if (value.trim().length < 2) {
                      setStayResults([]);
                      setStaySearching(false);
                    }
                  }}
                  placeholder="Search hotel or address"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="search"
                  style={{
                    height: 48,
                    textAlignVertical: "center",
                    includeFontPadding: false,
                    paddingTop: 0,
                    paddingBottom: 0,
                    fontFamily: "CabinetRegular",
                    transform:
                      Platform.OS === "ios"
                        ? [{ translateY: -2 }]
                        : undefined,
                  }}
                  className="min-w-0 flex-1 px-2 text-base text-black dark:text-white"
                />
                {staySearching ? <ActivityIndicator size="small" color="#D97706" /> : null}
                {stayName && !staySearching ? (
                  <TouchableOpacity
                    onPress={() => {
                      setStayName("");
                      setStayLatitude(null);
                      setStayLongitude(null);
                      setStaySource(null);
                      setStayResults([]);
                      setStaySearchEnabled(false);
                    }}
                    className="h-10 w-10 items-center justify-center"
                  >
                    <XIcon size={17} color="#9CA3AF" weight="bold" />
                  </TouchableOpacity>
                ) : null}
              </View>
              {staySearchEnabled && stayResults.length > 0 ? (
                <View className="mt-2 overflow-hidden rounded-xl border border-amber-200 bg-white dark:border-amber-900 dark:bg-gray-900">
                  {stayResults.map((result, index) => (
                    <TouchableOpacity
                      key={result.googlePlaceId}
                      activeOpacity={0.7}
                      onPress={() => {
                        setStayName(result.name);
                        setStayLongitude(result.longitude);
                        setStayLatitude(result.latitude);
                        setStaySource("SEARCH");
                        setStayResults([]);
                        setStaySearchEnabled(false);
                      }}
                      className={`flex-row items-center px-3 py-3 ${index ? "border-t border-gray-100 dark:border-gray-800" : ""}`}
                    >
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                        <MapPinIcon size={16} color="#D97706" weight="fill" />
                      </View>
                      <Text numberOfLines={2} className="ml-3 min-w-0 flex-1 text-sm font-semibold text-black dark:text-white">
                        {result.name}
                        {result.address && result.address !== result.name ? (
                          <Text numberOfLines={1} className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                            {result.address}
                          </Text>
                        ) : null}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {list?.accessRole === "OWNER" ? (
            <View className="mt-6 flex-row items-center rounded-2xl bg-white p-4 dark:bg-gray-900">
              <View className="min-w-0 flex-1 pr-3">
                <Text className="font-bold text-black dark:text-white">{t("membersCanInvite")}</Text>
                <Text className="mt-1 text-xs leading-4 text-gray-500">{t("membersCanInviteHint")}</Text>
              </View>
              <Switch
                value={allowInvites}
                onValueChange={setAllowInvites}
                trackColor={{ false: "#A09D97", true: "#F59E0B" }}
                thumbColor="#FAF9F6"
              />
            </View>
          ) : null}
        </KeyboardAwareFormScrollView>
      </View>
      <DateRangePickerModal
        visible={dateRangeOpen}
        startDate={eventDate}
        endDate={eventEndDate}
        title={eventType === "CUSTOM" ? t("selectEventDates") : undefined}
        onChange={(start, end) => {
          setEventDate(start);
          setEventEndDate(end);
        }}
        onClose={() => setDateRangeOpen(false)}
      />
      <DateRangePickerModal
        visible={datePickerOpen}
        selectionMode="single"
        title={t("chooseEventDate")}
        startDate={eventDate}
        endDate={null}
        onChange={(day) => setEventDate(day)}
        onClose={() => setDatePickerOpen(false)}
      />
    </SafeAreaView>
  );
}
