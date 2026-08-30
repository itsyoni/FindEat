import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import {
  CalendarCheckIcon,
  CaretLeftIcon,
  CheckCircleIcon,
  MinusIcon,
  PlusIcon,
  UsersIcon,
} from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import type { RestaurantReservationConfig } from "@findeat/types";

function roundedStart(config: RestaurantReservationConfig) {
  const date = new Date(Date.now() + config.minimumLeadMinutes * 60_000);
  const interval = config.bookingIntervalMinutes;
  date.setMinutes(Math.ceil(date.getMinutes() / interval) * interval, 0, 0);
  return date;
}

export default function RestaurantReservationScreen() {
  const { restaurantId, restaurantName } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName?: string;
  }>();
  const { isDark } = useAppTheme();
  const [config, setConfig] = useState<RestaurantReservationConfig | null>(null);
  const [date, setDate] = useState(new Date(Date.now() + 60 * 60_000));
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    void api.reservations
      .getPublicConfig(restaurantId)
      .then((next) => {
        if (!active) return;
        setConfig(next);
        setDate(roundedStart(next));
        setPartySize(Math.min(Math.max(2, next.minPartySize), next.maxPartySize));
      })
      .catch(() => {
        if (active) {
          Alert.alert("Booking unavailable", "This restaurant is not accepting FindEat reservations right now.");
          router.back();
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const latestDate = useMemo(
    () => new Date(Date.now() + (config?.advanceBookingDays ?? 30) * 86_400_000),
    [config?.advanceBookingDays],
  );

  async function submit() {
    if (!restaurantId || !config || saving) return;
    setSaving(true);
    try {
      await api.reservations.createNative(restaurantId, {
        reservationTime: date.toISOString(),
        partySize,
        guestNotes: notes.trim() || undefined,
      });
      setComplete(true);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "No table is available for that time. Try another time or party size.";
      Alert.alert("Couldn’t book this table", message);
    } finally {
      setSaving(false);
    }
  }

  const surface = isDark ? "#171717" : "#FFFFFF";
  const ink = isDark ? "#FAF9F6" : "#171717";
  const muted = isDark ? "#A3A3A3" : "#737373";

  return (
    <SafeAreaView className="flex-1 bg-[#FAF9F6] dark:bg-[#0B0B0A]">
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
        <TouchableOpacity className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-900" onPress={() => router.back()}>
          <CaretLeftIcon size={22} color={ink} weight="bold" />
        </TouchableOpacity>
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-bold text-black dark:text-white">Book a table</Text>
          <Text numberOfLines={1} className="text-sm text-gray-500 dark:text-gray-400">{restaurantName || "Restaurant"}</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#FF7255" /></View>
      ) : complete ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50"><CheckCircleIcon size={45} color="#10B981" weight="fill" /></View>
          <Text className="mt-6 text-center text-3xl font-bold text-black dark:text-white">Your table is booked</Text>
          <Text className="mt-3 text-center text-base leading-6 text-gray-500 dark:text-gray-400">The reservation is {config?.autoConfirm ? "confirmed" : "waiting for the restaurant to confirm"}. You’ll receive updates from FindEat.</Text>
          <TouchableOpacity className="mt-8 w-full items-center rounded-2xl bg-[#FF7255] py-4" onPress={() => router.back()}><Text className="font-bold text-white">Back to restaurant</Text></TouchableOpacity>
        </View>
      ) : config ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View className="rounded-[28px] p-5" style={{ backgroundColor: surface }}>
            <View className="flex-row items-center gap-3"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/50"><CalendarCheckIcon size={26} color="#FF7255" weight="duotone" /></View><View><Text className="text-lg font-bold text-black dark:text-white">Choose when you’re coming</Text><Text className="text-sm text-gray-500 dark:text-gray-400">We’ll find the best available table.</Text></View></View>

            <View className="mt-6 gap-3">
              <View className="rounded-2xl bg-gray-50 p-3 dark:bg-neutral-900">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Date</Text>
                <DateTimePicker value={date} mode="date" minimumDate={new Date()} maximumDate={latestDate} display={Platform.OS === "ios" ? "compact" : "default"} accentColor="#FF7255" onChange={(_, next) => { if (next) setDate((current) => { const value = new Date(next); value.setHours(current.getHours(), current.getMinutes(), 0, 0); return value; }); }} />
              </View>
              <View className="rounded-2xl bg-gray-50 p-3 dark:bg-neutral-900">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Time</Text>
                <DateTimePicker value={date} mode="time" minuteInterval={config.bookingIntervalMinutes as 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30} display={Platform.OS === "ios" ? "compact" : "default"} accentColor="#FF7255" onChange={(_, next) => { if (next) setDate((current) => { const value = new Date(current); value.setHours(next.getHours(), next.getMinutes(), 0, 0); return value; }); }} />
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-neutral-900"><View className="flex-row items-center gap-3"><UsersIcon size={22} color="#FF7255" weight="duotone" /><View><Text className="font-bold text-black dark:text-white">Party size</Text><Text className="text-xs text-gray-500">{config.minPartySize}–{config.maxPartySize} guests</Text></View></View><View className="flex-row items-center gap-4"><TouchableOpacity disabled={partySize <= config.minPartySize} className="h-9 w-9 items-center justify-center rounded-full bg-white disabled:opacity-35 dark:bg-neutral-800" onPress={() => setPartySize((value) => value - 1)}><MinusIcon size={17} color={ink} weight="bold" /></TouchableOpacity><Text className="min-w-5 text-center text-lg font-bold text-black dark:text-white">{partySize}</Text><TouchableOpacity disabled={partySize >= config.maxPartySize} className="h-9 w-9 items-center justify-center rounded-full bg-white disabled:opacity-35 dark:bg-neutral-800" onPress={() => setPartySize((value) => value + 1)}><PlusIcon size={17} color={ink} weight="bold" /></TouchableOpacity></View></View>

            <Text className="mb-2 mt-5 text-sm font-bold text-black dark:text-white">Anything the restaurant should know?</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Accessibility needs, celebration, allergies…" placeholderTextColor={muted} multiline maxLength={1000} className="min-h-28 rounded-2xl bg-gray-50 p-4 text-base text-black dark:bg-neutral-900 dark:text-white" textAlignVertical="top" />
          </View>
          <TouchableOpacity disabled={saving} className="mt-5 min-h-14 items-center justify-center rounded-2xl bg-[#FF7255] disabled:opacity-60" onPress={() => void submit()}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-bold text-white">Confirm reservation</Text>}</TouchableOpacity>
          <Text className="mt-3 text-center text-xs leading-5 text-gray-500">The restaurant manages this reservation directly in FindEat.</Text>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
