import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { CaretLeftIcon, CaretRightIcon, XIcon } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function sameDay(left: Date | null, right: Date) {
  return Boolean(
    left &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate(),
  );
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export default function DateRangePickerModal({
  visible,
  startDate,
  endDate,
  selectionMode = "range",
  title,
  onChange,
  onClose,
}: {
  visible: boolean;
  startDate: Date | null;
  endDate: Date | null;
  selectionMode?: "single" | "range";
  title?: string;
  onChange: (start: Date, end: Date | null) => void;
  onClose: () => void;
}) {
  const { isDark } = useAppTheme();
  const { t } = useTranslation("common");
  const [month, setMonth] = useState(() => startDate ?? new Date());
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: first.getDay() }, () => null),
      ...Array.from(
        { length: count },
        (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
      ),
    ];
  }, [month]);
  const today = startOfDay(new Date());
  const ink = isDark ? "#F5F2EC" : "#1B1A18";
  const isSingleDate = selectionMode === "single";

  function pick(day: Date) {
    if (day < today) return;
    if (isSingleDate) {
      onChange(day, null);
      return;
    }
    if (!startDate || endDate || day < startDate) {
      onChange(day, null);
      return;
    }
    onChange(startDate, day);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={() => setMonth(startDate ?? new Date())}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/45" onPress={onClose}>
        <Pressable onPress={() => undefined}>
          <SafeAreaView
            edges={["bottom"]}
            className="rounded-t-[30px]"
            style={{
              backgroundColor: isDark ? "#171716" : "#F7F4EF",
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 20,
            }}
          >
            <View className="mb-4 flex-row items-center">
              <Text className="flex-1 text-xl font-bold text-black dark:text-white">
                {title ?? t("selectTripDates")}
              </Text>
              <TouchableOpacity onPress={onClose} className="h-10 w-10 items-center justify-center">
                <XIcon size={22} color={ink} weight="bold" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="h-11 w-11 items-center justify-center"
              >
                <CaretLeftIcon size={20} color={ink} weight="bold" />
              </TouchableOpacity>
              <Text className="text-base font-bold text-black dark:text-white">
                {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}
              </Text>
              <TouchableOpacity
                onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="h-11 w-11 items-center justify-center"
              >
                <CaretRightIcon size={20} color={ink} weight="bold" />
              </TouchableOpacity>
            </View>

            <View className="mt-2 flex-row">
              {Array.from({ length: 7 }, (_, index) => (
                <Text key={index} className="flex-1 text-center text-xs font-bold text-gray-500">
                  {new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(
                    new Date(2026, 7, 2 + index),
                  )}
                </Text>
              ))}
            </View>
            <View className="mt-2 flex-row flex-wrap">
              {days.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={{ width: "14.2857%", height: 46 }} />;
                const disabled = day < today;
                const selected =
                  sameDay(startDate, day) ||
                  (!isSingleDate && sameDay(endDate, day));
                const within = Boolean(
                  !isSingleDate &&
                    startDate &&
                    endDate &&
                    day > startDate &&
                    day < endDate,
                );
                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    disabled={disabled}
                    onPress={() => pick(day)}
                    className="items-center justify-center"
                    style={{
                      width: "14.2857%",
                      height: 46,
                      backgroundColor: within ? (isDark ? "#49371E" : "#FCE7BF") : "transparent",
                    }}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: selected ? "#D97706" : "transparent" }}
                    >
                      <Text
                        className="font-bold"
                        style={{ color: disabled ? "#AAA6A0" : selected ? "#FAF9F6" : ink }}
                      >
                        {day.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-white px-4 py-3 dark:bg-[#242422]">
                <Text className="text-xs font-bold uppercase text-gray-500">
                  {t(isSingleDate ? "day" : "startDate")}
                </Text>
                <Text className="mt-1 font-bold text-black dark:text-white">
                  {startDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(startDate) : t("selectDate")}
                </Text>
              </View>
              {!isSingleDate ? (
                <View className="flex-1 rounded-2xl bg-white px-4 py-3 dark:bg-[#242422]">
                  <Text className="text-xs font-bold uppercase text-gray-500">
                    {t("endDate")}
                  </Text>
                  <Text className="mt-1 font-bold text-black dark:text-white">
                    {endDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(endDate) : t("selectDate")}
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              disabled={!startDate || (!isSingleDate && !endDate)}
              onPress={onClose}
              className="mt-4 h-14 items-center justify-center rounded-2xl bg-amber-500"
              style={{ opacity: startDate && (isSingleDate || endDate) ? 1 : 0.45 }}
            >
              <Text className="font-bold text-white">
                {t(isSingleDate ? "useDate" : "useDateRange")}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
