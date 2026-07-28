import Text from "@/components/common/AppText";
import { DirectionalForwardIcon } from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarBlankIcon, CheckCircleIcon, XCircleIcon } from "phosphor-react-native";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Platform,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import ProfileTagPickerPage, {
  getProfileTagLabel,
  type ProfileTagField,
} from "./ProfileTagPickerPage";

export type ProfileDetailAnswerField =
  | "birthday"
  | "pronouns"
  | "allergies"
  | "foodPreferences"
  | "dietaryRestrictions"
  | "favoriteCuisines";

export const PROFILE_DETAIL_ANSWER_FIELDS: ProfileDetailAnswerField[] = [
  "birthday",
  "pronouns",
  "allergies",
  "foodPreferences",
  "dietaryRestrictions",
  "favoriteCuisines",
];

export type ProfileDetailsDraft = {
  birthday: string;
  pronouns: string[];
  showPronouns: boolean;
  allergies: string[];
  foodPreferences: string[];
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  completedFields: ProfileDetailAnswerField[];
};

export const EMPTY_PROFILE_DETAILS: ProfileDetailsDraft = {
  birthday: "",
  pronouns: [],
  showPronouns: true,
  allergies: [],
  foodPreferences: [],
  dietaryRestrictions: [],
  favoriteCuisines: [],
  completedFields: [],
};

type Props = {
  value: ProfileDetailsDraft;
  onChange: Dispatch<SetStateAction<ProfileDetailsDraft>>;
};

const TAG_FIELDS: ProfileTagField[] = [
  "foodPreferences",
  "dietaryRestrictions",
  "allergies",
  "favoriteCuisines",
];

function dateFromIso(value: string) {
  if (!value) return new Date(2000, 0, 1);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function isoFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ProfileDetailsEditor({ value, onChange }: Props) {
  const { t, i18n } = useTranslation(["profile", "common"]);
  const { isDark } = useAppTheme();
  const [activeTagField, setActiveTagField] = useState<ProfileTagField | null>(null);
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [pendingBirthday, setPendingBirthday] = useState(() => dateFromIso(value.birthday));

  const update = <K extends keyof ProfileDetailsDraft>(
    key: K,
    nextValue: ProfileDetailsDraft[K],
  ) => onChange((current) => ({ ...current, [key]: nextValue }));

  const isCompleted = (field: ProfileDetailAnswerField) =>
    value.completedFields.includes(field);

  function setCompleted(field: ProfileDetailAnswerField, completed = true) {
    onChange((current) => ({
      ...current,
      completedFields: completed
        ? Array.from(new Set([...current.completedFields, field]))
        : current.completedFields.filter((item) => item !== field),
    }));
  }

  const formattedBirthday = useMemo(() => {
    if (!value.birthday) return "";
    return new Intl.DateTimeFormat(i18n.language.startsWith("he") ? "he-IL" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dateFromIso(value.birthday));
  }, [i18n.language, value.birthday]);

  function openBirthdayPicker() {
    setPendingBirthday(dateFromIso(value.birthday));
    setBirthdayPickerOpen(true);
  }

  function handleAndroidDate(date: Date) {
    setBirthdayPickerOpen(false);
    update("birthday", isoFromDate(date));
    setCompleted("birthday");
  }

  return (
    <View>
      <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
        {t("profile:foodProfileHint")}
      </Text>

      <FieldLabel
        label={t("profile:birthday")}
        completed={!!value.birthday || isCompleted("birthday")}
      />
      <View className="overflow-hidden rounded-2xl bg-[#f8f8f8] dark:bg-gray-900">
        <TouchableOpacity
          onPress={openBirthdayPicker}
          activeOpacity={0.75}
          className="flex-row items-center gap-3 px-4 py-4"
        >
          <CalendarBlankIcon size={21} color={isDark ? "#D1D5DB" : "#525252"} />
          <Text
            className={`flex-1 text-base ${
              formattedBirthday
                ? "text-black dark:text-white"
                : "text-gray-400"
            }`}
          >
            {formattedBirthday || t("profile:birthdayPlaceholder")}
          </Text>
          {!!value.birthday && (
            <TouchableOpacity
              onPress={() => {
                update("birthday", "");
                setCompleted("birthday", false);
              }}
              hitSlop={10}
              accessibilityLabel={t("profile:clearBirthday")}
            >
              <XCircleIcon
                size={21}
                color={isDark ? "#9CA3AF" : "#737373"}
                weight="fill"
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <View className="h-px bg-black/5 dark:bg-white/10" />
        <TouchableOpacity
          onPress={() => {
            update("birthday", "");
            setCompleted("birthday", true);
          }}
          className="flex-row items-center px-4 py-4"
        >
          <Text className="flex-1 text-base text-black dark:text-white">
            {t("profile:preferNotToAnswer")}
          </Text>
          <CheckCircleIcon
            size={22}
            color={
              !value.birthday && isCompleted("birthday")
                ? "#D6A92D"
                : isDark
                  ? "#4B5563"
                  : "#D1D5DB"
            }
            weight={
              !value.birthday && isCompleted("birthday") ? "fill" : "regular"
            }
          />
        </TouchableOpacity>
      </View>

      <SelectedTagsField
        field="pronouns"
        selected={value.pronouns}
        completed={value.pronouns.length > 0 || isCompleted("pronouns")}
        onPress={() => setActiveTagField("pronouns")}
      />
      <View className="mt-2 flex-row items-center justify-between rounded-2xl bg-[#f8f8f8] px-4 py-3 dark:bg-gray-900">
        <Text className="text-sm text-gray-600 dark:text-gray-300">
          {t("profile:showPronounsOnProfile")}
        </Text>
        <Switch
          value={value.showPronouns}
          onValueChange={(nextValue) => update("showPronouns", nextValue)}
          trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#F6C445" }}
          thumbColor="#FFFFFF"
        />
      </View>

      {TAG_FIELDS.map((field) => (
        <SelectedTagsField
          key={field}
          field={field}
          selected={value[field]}
          completed={value[field].length > 0 || isCompleted(field)}
          onPress={() => setActiveTagField(field)}
        />
      ))}

      <Text className="mt-5 text-xs leading-5 text-gray-400">
        {t("profile:allergySafetyNotice")}
      </Text>

      {activeTagField && (
        <ProfileTagPickerPage
          field={activeTagField}
          selected={value[activeTagField]}
          noneSelected={
            value[activeTagField].length === 0 && isCompleted(activeTagField)
          }
          onClose={() => setActiveTagField(null)}
          onDone={(selected, noneSelected) => {
            update(activeTagField, selected);
            setCompleted(activeTagField, selected.length > 0 || noneSelected);
            setActiveTagField(null);
          }}
        />
      )}

      {Platform.OS === "android" && birthdayPickerOpen && (
        <DateTimePicker
          value={pendingBirthday}
          mode="date"
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onValueChange={(_, date) => handleAndroidDate(date)}
          onDismiss={() => setBirthdayPickerOpen(false)}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal
          visible={birthdayPickerOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setBirthdayPickerOpen(false)}
        >
          <SafeAreaProvider style={{ flex: 1 }}>
            <SafeAreaView
              edges={["top", "bottom"]}
              style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}
            >
              <View className="flex-1 bg-canvas px-5 dark:bg-black">
              <View className="flex-row items-center justify-between py-3">
                <TouchableOpacity onPress={() => setBirthdayPickerOpen(false)} className="px-2 py-3">
                  <Text className="text-gray-500">{t("common:cancel")}</Text>
                </TouchableOpacity>
                <Text className="text-lg font-bold text-black dark:text-white">
                  {t("profile:chooseBirthday")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    update("birthday", isoFromDate(pendingBirthday));
                    setCompleted("birthday");
                    setBirthdayPickerOpen(false);
                  }}
                  className="px-2 py-3"
                >
                  <Text className="font-bold text-amber-600 dark:text-amber-300">
                    {t("common:done")}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingBirthday}
                mode="date"
                display="inline"
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                themeVariant={isDark ? "dark" : "light"}
                onValueChange={(_, date) => setPendingBirthday(date)}
                style={{ alignSelf: "stretch", marginTop: 12 }}
              />
              </View>
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>
      )}
    </View>
  );
}

function FieldLabel({
  label,
  completed,
}: {
  label: string;
  completed?: boolean;
}) {
  const { t } = useTranslation("profile");

  return (
    <View className="mb-2 mt-5 flex-row items-center justify-between">
      <Text className="text-sm text-gray-500" weight="bold">
        {label}
      </Text>
      {completed === false && (
        <View className="flex-row items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-900/40">
          <View className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <Text className="text-xs text-amber-800 dark:text-amber-200" weight="bold">
            {t("notSelected")}
          </Text>
        </View>
      )}
    </View>
  );
}

function SelectedTagsField({
  field,
  selected,
  completed,
  onPress,
}: {
  field: ProfileTagField;
  selected: string[];
  completed: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation("profile");
  const { isDark } = useAppTheme();

  return (
    <View>
      <FieldLabel label={t(field)} completed={completed} />
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        className="min-h-16 flex-row items-center gap-3 rounded-2xl bg-[#f8f8f8] px-4 py-3 dark:bg-gray-900"
      >
        <View className="flex-1 flex-row flex-wrap gap-2">
          {selected.length ? (
            selected.map((tag) => (
              <View key={tag} className="rounded-full bg-amber-100 px-3 py-2 dark:bg-amber-900/50">
                <Text className="text-sm text-amber-950 dark:text-amber-100">
                  {getProfileTagLabel(t, tag)}
                </Text>
              </View>
            ))
          ) : completed ? (
            <Text className="py-1 text-gray-500 dark:text-gray-300">
              {t("preferNotToAnswer")}
            </Text>
          ) : (
            <Text className="py-1 text-amber-700 dark:text-amber-300">
              {t("noTagsSelected")}
            </Text>
          )}
        </View>
        <View>
          <DirectionalForwardIcon size={20} color={isDark ? "#9CA3AF" : "#737373"} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
