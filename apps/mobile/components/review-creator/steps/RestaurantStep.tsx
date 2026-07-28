import Text from "@/components/common/AppText";
import RestaurantSearch from "@/components/restaurants/RestaurantSearch";
import { SelectedRestaurant } from "@findeat/types/restaurant";
import { TouchableOpacity, View } from "react-native";
import { Skeleton, SkeletonPulse, ThemedSafeAreaView } from "@/components/common";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useTranslation } from "react-i18next";

type Props = {
  selectedRestaurant: SelectedRestaurant | null;
  onSelect: (restaurant: SelectedRestaurant | null) => void;
  onBack: () => void;
  loading?: boolean;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
};

export default function RestaurantStep({
  selectedRestaurant,
  onSelect,
  onBack,
  loading = false,
  onSaveDraft,
  savingDraft,
}: Props) {
  const { t } = useTranslation(["create", "common"]);

  return (
    <ThemedSafeAreaView
      style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}
    >
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={onBack} className="py-2 pr-4">
          <Text className="font-bold text-black dark:text-white">
            {t("common:back")}
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          {onSaveDraft && <SaveDraftButton onPress={onSaveDraft} saving={savingDraft} />}
          <Text className="text-sm font-semibold text-gray-400">
            {t("create:stepOf", { current: 1, total: 4 })}
          </Text>
        </View>
      </View>
      <Text className="text-3xl font-bold text-black dark:text-white">
        {t("create:reviewRestaurantTitle")}
      </Text>

      <Text className="mt-2 text-gray-500">
        {t("create:reviewRestaurantSubtitle")}
      </Text>

      {loading ? (
        <SkeletonPulse style={{ marginTop: 24 }}>
          <Skeleton height={52} radius={17} />
          <Skeleton width="38%" height={16} radius={7} style={{ marginTop: 24, marginBottom: 12 }} />
          {Array.from({ length: 6 }, (_, index) => <View key={index} className="flex-row items-center py-3"><Skeleton width={54} height={54} circle /><View className="ml-3 flex-1 gap-2"><Skeleton width="62%" height={15} radius={7} /><Skeleton width="48%" height={11} radius={6} /></View></View>)}
        </SkeletonPulse>
      ) : (
        <RestaurantSearch selectedRestaurant={selectedRestaurant} onSelect={onSelect} />
      )}
    </ThemedSafeAreaView>
  );
}
