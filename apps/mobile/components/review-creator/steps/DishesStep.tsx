import Text from "@/components/common/AppText";
import { ThemedSafeAreaView } from "@/components/common";
import { useAppTheme } from "@/contexts/ThemeContext";
import type {
  ReviewDishDraft,
  ReviewDishFormDraft,
} from "@findeat/types/review";
import {
  ForkKnifeIcon,
  PlusCircleIcon,
  TrashIcon,
} from "phosphor-react-native";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import DishCard from "../components/DishCard";

type Props = {
  items: ReviewDishDraft[];
  pendingDish?: ReviewDishFormDraft | null;
  onBack: () => void;
  onAddCustomDish: () => void;
  onAddMenuDish: () => void;
  onEditDish: (item: ReviewDishDraft) => void;
  onContinuePendingDish: () => void;
  onDiscardPendingDish: () => void;
  onRemoveDish: (id: string) => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
};

export default function DishesStep({
  items,
  pendingDish,
  onBack,
  onAddCustomDish,
  onAddMenuDish,
  onEditDish,
  onContinuePendingDish,
  onDiscardPendingDish,
  onRemoveDish,
  onNext,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#FAF9F6" : "#171717";

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
        <TouchableOpacity onPress={onBack} className="min-w-16 px-2 py-2">
          <Text className="font-bold text-black dark:text-white">
            {t("common:back")}
          </Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-black dark:text-white">
          {t("whatDidYouOrder")}
        </Text>
        <TouchableOpacity onPress={onNext} className="min-w-16 px-2 py-2">
          <Text className="text-right font-bold text-brand">
            {t("next")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-black dark:text-white">
          {items.length > 0 ? t("yourDishes") : t("addDishesTitle")}
        </Text>
        <Text className="mt-2 leading-5 text-gray-500 dark:text-gray-400">
          {t("dishesStepSubtitle")}
        </Text>

        {pendingDish ? (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onContinuePendingDish}
            className="mt-6 flex-row items-center rounded-3xl border border-brand/35 bg-brand/10 p-4"
          >
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-brand">
                {t("unfinishedDish")}
              </Text>
              <Text
                numberOfLines={1}
                className="mt-1 text-lg font-bold text-black dark:text-white"
              >
                {pendingDish.dishName || t("dish")}
              </Text>
              <Text className="mt-1 text-sm text-gray-500">
                {t("continueEditingDish")}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel={t("discardDishDraft")}
              onPress={(event) => {
                event.stopPropagation();
                onDiscardPendingDish();
              }}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            >
              <TrashIcon size={18} color={iconColor} weight="fill" />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onAddMenuDish}
          className="mt-7 flex-row items-center rounded-3xl bg-black p-5 dark:bg-white"
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15 dark:bg-black/10">
            <ForkKnifeIcon
              size={25}
              color={isDark ? "#171717" : "#FAF9F6"}
              weight="bold"
            />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-bold text-white dark:text-black">
              {t("chooseFromRestaurantMenu")}
            </Text>
            <Text className="mt-1 text-sm text-white/65 dark:text-black/55">
              {t("menuDishPickerHint")}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onAddCustomDish}
          className="mt-3 flex-row items-center rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <PlusCircleIcon size={27} color={iconColor} weight="bold" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-bold text-black dark:text-white">
              {t("addCustomDish")}
            </Text>
            <Text className="mt-1 text-sm text-gray-500">
              {t("addCustomDishHint")}
            </Text>
          </View>
        </TouchableOpacity>

        {items.length > 0 ? (
          <View className="mt-8 gap-4">
            <View className="flex-row items-end justify-between">
              <Text className="text-xl font-bold text-black dark:text-white">
                {t("addedDishes", { count: items.length })}
              </Text>
              <Text className="text-sm text-gray-400">{t("tapDishToEdit")}</Text>
            </View>
            {items.map((item) => (
              <DishCard
                key={item.id}
                item={item}
                onPress={() => onEditDish(item)}
                onRemove={() => onRemoveDish(item.id)}
              />
            ))}
          </View>
        ) : (
          <View className="mt-8 items-center rounded-3xl bg-gray-50 px-6 py-8 dark:bg-gray-900">
            <Text className="text-center font-bold text-black dark:text-white">
              {t("noDishesReviewHint")}
            </Text>
            <TouchableOpacity onPress={onNext} className="mt-3 px-4 py-2">
              <Text className="font-bold text-gray-500">{t("skipDishes")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedSafeAreaView>
  );
}
