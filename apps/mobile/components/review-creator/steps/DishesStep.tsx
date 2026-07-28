import Text from "@/components/common/AppText";
import { ReviewDishDraft } from "@findeat/types/review";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ThemedSafeAreaView } from "@/components/common";
import DishCard from "../components/DishCard";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useTranslation } from "react-i18next";

type Props = {
  items: ReviewDishDraft[];
  onBack: () => void;
  onAddCustomDish: () => void;
  onAddMenuDish: () => void;
  onRemoveDish: (id: string) => void;
  onNext: () => void;
  onSaveDraft: () => void;
  savingDraft?: boolean;
};

export default function DishesStep({
  items,
  onBack,
  onAddCustomDish,
  onAddMenuDish,
  onRemoveDish,
  onNext,
  onSaveDraft,
  savingDraft,
}: Props) {
  const { t } = useTranslation(["create", "common"]);

  return (
    <ThemedSafeAreaView>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 40,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack}>
            <Text className="font-bold text-black dark:text-white">
              {t("common:back")}
            </Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <SaveDraftButton onPress={onSaveDraft} saving={savingDraft} />
            <Text className="text-sm font-semibold text-gray-400">
              {t("create:stepOf", { current: 3, total: 4 })}
            </Text>
          </View>
        </View>

        <Text className="mt-6 text-3xl font-bold text-black dark:text-white">
          {t("create:whatDidYouOrder")}
        </Text>

        <Text className="mt-2 text-gray-500">
          {t("create:dishesStepSubtitle")}
        </Text>

        <View className="mt-7 gap-3">
          <TouchableOpacity
            className="rounded-2xl bg-black px-4 py-4 dark:bg-white"
            onPress={onAddMenuDish}
          >
            <Text className="text-center font-bold text-white dark:text-black">
              {t("create:chooseFromRestaurantMenu")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="py-2" onPress={onAddCustomDish}>
            <Text className="text-center font-bold text-gray-500">
              {t("create:addCustomDishPrompt")}
            </Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View className="mt-6 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 dark:border-gray-700 dark:bg-gray-900">
            <Text className="text-center text-lg font-bold text-black dark:text-white">
              {t("create:noDishesYet")}
            </Text>

            <Text className="mt-2 text-center text-gray-500">
              {t("create:noDishesReviewHint")}
            </Text>
          </View>
        ) : (
          <View className="mt-8 gap-4">
            {items.map((item) => (
              <DishCard
                key={item.id}
                item={item}
                onRemove={() => onRemoveDish(item.id)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          className="mt-7 rounded-2xl bg-black py-4 dark:bg-white"
          onPress={onNext}
        >
          <Text className="text-center font-bold text-white dark:text-black">
            {items.length > 0
              ? t("create:reviewEverything")
              : t("create:skipDishes")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedSafeAreaView>
  );
}
