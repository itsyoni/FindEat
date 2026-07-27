import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { consumePendingListLocation } from "@/lib/listLocationSelection";
import type {
  PlaceListDetail,
  PlaceListEventType,
} from "@findeat/types";
import { uploadImage } from "@/lib/uploadImage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  CalendarBlankIcon,
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

const EVENT_TYPES: PlaceListEventType[] = [
  "BIRTHDAY",
  "TRIP",
  "DINNER",
  "DATE_NIGHT",
  "ANNIVERSARY",
  "NIGHT_OUT",
  "GRADUATION",
  "CELEBRATION",
  "CUSTOM",
];

export default function EditSavedListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [newCoverUri, setNewCoverUri] = useState<string | null>(null);
  const [eventType, setEventType] = useState<PlaceListEventType | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState("");
  const [eventLocationLatitude, setEventLocationLatitude] = useState<number | null>(null);
  const [eventLocationLongitude, setEventLocationLongitude] = useState<number | null>(null);
  const [allowInvites, setAllowInvites] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
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
        setEventLocation(value.eventLocation ?? "");
        setEventLocationLatitude(value.eventLocationLatitude ?? null);
        setEventLocationLongitude(value.eventLocationLongitude ?? null);
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
    }, [id]),
  );

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
    if (!list || !name.trim() || saving) return;
    setSaving(true);
    try {
      const nextCoverUrl = newCoverUri
        ? await uploadImage(newCoverUri, "list")
        : coverUrl;
      await api.placeLists.update(list.id, {
        name: name.trim(),
        description: description.trim() || null,
        coverUrl: nextCoverUrl,
        eventType,
        eventAt: eventType && eventDate ? eventDate.toISOString() : null,
        eventLocation: eventLocation.trim() || null,
        eventLocationLatitude,
        eventLocationLongitude,
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

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}
    >
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FFF" : "#171717"} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("editList")}
        </Text>
        <TouchableOpacity
          disabled={!list || !name.trim() || saving}
          onPress={() => void save()}
          className="min-w-11 px-1 py-3"
          style={{ opacity: !list || !name.trim() || saving ? 0.45 : 1 }}
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
              <Image source={{ uri: coverPreview }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
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
                <CameraIcon size={16} color="#FFF" weight="fill" />
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

          <Text className="mb-2 mt-6 text-sm font-bold text-gray-500">{t("listType")}</Text>
          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => setEventType(null)}
              className={`rounded-full px-3.5 py-2 ${!eventType ? "bg-black dark:bg-white" : "bg-gray-100 dark:bg-gray-900"}`}
            >
              <Text className={`text-sm font-bold ${!eventType ? "text-white dark:text-black" : "text-gray-600 dark:text-gray-300"}`}>
                {t("regularList")}
              </Text>
            </TouchableOpacity>
            {EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setEventType(type)}
                className={`rounded-full px-3.5 py-2 ${eventType === type ? "bg-amber-500" : "bg-gray-100 dark:bg-gray-900"}`}
              >
                <Text className={`text-sm font-bold ${eventType === type ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
                  {t(`listEventTypes.${type}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {eventType ? (
            <>
              <TouchableOpacity
                onPress={() => setDatePickerOpen((current) => !current)}
                className="mt-4 flex-row items-center rounded-2xl border border-[#D8D3CA] bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900"
              >
                <CalendarBlankIcon size={20} color="#D97706" weight="fill" />
                <Text className="ml-3 flex-1 text-black dark:text-white">
                  {eventDate
                    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(eventDate)
                    : t("chooseEventDate")}
                </Text>
              </TouchableOpacity>
              {datePickerOpen ? (
                <DateTimePicker
                  value={eventDate ?? new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  themeVariant={isDark ? "dark" : "light"}
                  onValueChange={(_, value) => {
                    setEventDate(value);
                    if (Platform.OS === "android") setDatePickerOpen(false);
                  }}
                  onDismiss={() => setDatePickerOpen(false)}
                />
              ) : null}
            </>
          ) : null}

          <Text className="mb-2 mt-5 text-sm font-bold text-gray-500">{t("location")}</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: "/saved-lists/location-search",
                params: { id },
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
                thumbColor="#FFF"
              />
            </View>
          ) : null}
        </KeyboardAwareFormScrollView>
      </View>
    </SafeAreaView>
  );
}
