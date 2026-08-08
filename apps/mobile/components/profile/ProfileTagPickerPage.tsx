import Text from "@/components/common/AppText";
import { DirectionalBackIcon } from "@/components/common/icons/DirectionalIcon";
import { TextInput } from "@/components/common";
import { useAppTheme } from "@/contexts/ThemeContext";
import { CheckCircleIcon, MagnifyingGlassIcon } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { FlatList, Modal, TouchableOpacity, View } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  ALLERGEN_OPTIONS,
  CUISINE_OPTIONS,
  DIETARY_RESTRICTION_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  PRONOUN_OPTIONS,
} from "@findeat/types";

export type ProfileTagField =
  | "pronouns"
  | "foodPreferences"
  | "dietaryRestrictions"
  | "allergies"
  | "favoriteCuisines";

export const PROFILE_TAG_OPTIONS: Record<ProfileTagField, readonly string[]> = {
  pronouns: PRONOUN_OPTIONS,
  foodPreferences: FOOD_PREFERENCE_OPTIONS,
  dietaryRestrictions: DIETARY_RESTRICTION_OPTIONS,
  allergies: ALLERGEN_OPTIONS,
  favoriteCuisines: CUISINE_OPTIONS,
};

const NONE_OPTION = "__NONE__";

function humanizeTag(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getProfileTagLabel(t: TFunction, value: string) {
  return t(`profileOptions.${value}`, { defaultValue: humanizeTag(value) });
}

type Props = {
  field: ProfileTagField;
  selected: string[];
  noneSelected?: boolean;
  onClose: () => void;
  onDone: (selected: string[], noneSelected: boolean) => void;
};

export default function ProfileTagPickerPage({
  field,
  selected,
  noneSelected = false,
  onClose,
  onDone,
}: Props) {
  const { t } = useTranslation("profile");
  const { isDark } = useAppTheme();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selected);
  const [choseNone, setChoseNone] = useState(noneSelected);
  const [customPronouns, setCustomPronouns] = useState("");

  const fieldLabel = t(field);
  const optionLabel = (option: string) =>
    option === NONE_OPTION ? t("noneOption") : getProfileTagLabel(t, option);
  const options = useMemo(() => {
    const seenLabels = new Set<string>();
    return [NONE_OPTION, ...selected, ...PROFILE_TAG_OPTIONS[field]].filter((option) => {
      const label =
        option === NONE_OPTION
          ? t("noneOption").toLocaleLowerCase()
          : getProfileTagLabel(t, option).toLocaleLowerCase();
      if (seenLabels.has(label)) return false;
      seenLabels.add(label);
      return true;
    });
  }, [field, selected, t]);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      (option === NONE_OPTION ? t("noneOption") : getProfileTagLabel(t, option))
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query, t]);

  function toggle(option: string) {
    if (option === NONE_OPTION) {
      setDraft([]);
      setChoseNone(true);
      return;
    }
    setChoseNone(false);
    setDraft((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  function addCustomPronouns() {
    const custom = customPronouns.trim();
    if (!custom) return;
    setChoseNone(false);
    setDraft((current) =>
      current.some((item) => item.toLocaleLowerCase() === custom.toLocaleLowerCase())
        ? current
        : [...current, custom],
    );
    setCustomPronouns("");
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaProvider style={{ flex: 1 }}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
        >
          <View className="flex-1 bg-canvas px-5 dark:bg-black">
          <View className="flex-row items-center justify-between py-3">
            <TouchableOpacity onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full">
              <DirectionalBackIcon size={25} color={isDark ? "#FAF9F6" : "#171717"} />
            </TouchableOpacity>
            <View className="flex-1 px-3">
              <Text className="text-center text-lg font-bold text-black dark:text-white">
                {t("chooseTags", { name: fieldLabel })}
              </Text>
              <Text className="mt-0.5 text-center text-xs text-gray-500 dark:text-gray-400">
                {choseNone
                  ? t("preferNotToAnswer")
                  : t("selectedCount", { count: draft.length })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onDone(choseNone ? [] : draft, choseNone)}
              className="min-w-11 px-1 py-3"
            >
              <Text className="text-right font-bold text-amber-600 dark:text-amber-300">
                {t("common:done")}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("searchTags", { name: fieldLabel })}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<MagnifyingGlassIcon size={20} color={isDark ? "#9CA3AF" : "#737373"} />}
            className="mb-3 border-0 bg-[#F1EFEA] dark:bg-gray-900"
          />

          {field === "pronouns" && (
            <View className="mb-3 flex-row items-center gap-2">
              <TextInput
                value={customPronouns}
                onChangeText={setCustomPronouns}
                placeholder={t("customPronounsPlaceholder")}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={addCustomPronouns}
                className="flex-1 border-0 bg-[#F1EFEA] dark:bg-gray-900"
              />
              <TouchableOpacity
                onPress={addCustomPronouns}
                disabled={!customPronouns.trim()}
                className={`rounded-xl px-4 py-3.5 ${
                  customPronouns.trim()
                    ? "bg-black dark:bg-white"
                    : "bg-gray-200 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={
                    customPronouns.trim()
                      ? "font-bold text-white dark:text-black"
                      : "font-bold text-gray-400"
                  }
                >
                  {t("addPronouns")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="mb-2 min-h-10 flex-row items-center justify-between">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {fieldLabel}
            </Text>
            {!!draft.length && (
              <TouchableOpacity
                onPress={() => {
                  setDraft([]);
                  setChoseNone(false);
                }}
                className="px-2 py-2"
              >
                <Text className="text-sm font-bold text-red-500">{t("clearAll")}</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 28 }}
            ItemSeparatorComponent={() => <View className="h-px bg-black/5 dark:bg-white/10" />}
            ListEmptyComponent={
              <View className="items-center px-6 py-16">
                <Text className="text-center text-gray-500 dark:text-gray-400">
                  {t("noMatchingTags")}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected =
                item === NONE_OPTION ? choseNone : draft.includes(item);
              return (
                <TouchableOpacity
                  onPress={() => toggle(item)}
                  activeOpacity={0.7}
                  className="flex-row items-center py-4"
                >
                  <Text className="flex-1 text-base text-black dark:text-white">
                    {optionLabel(item)}
                  </Text>
                  <CheckCircleIcon
                    size={25}
                    color={isSelected ? "#D6A92D" : isDark ? "#4B5563" : "#D1D5DB"}
                    weight={isSelected ? "fill" : "regular"}
                  />
                </TouchableOpacity>
              );
            }}
          />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
