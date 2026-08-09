import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import type { UserSummary } from "@findeat/types";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { ChecksIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

export type SeenByViewer = {
  user: UserSummary;
  readAt: string;
};

type Props = {
  open: boolean;
  viewers: SeenByViewer[];
  onClose: () => void;
};

export default function SeenByBottomSheet({ open, viewers, onClose }: Props) {
  const { t } = useTranslation("chat");

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      snapPoints={[viewers.length > 5 ? "68%" : "50%"]}
    >
      <BottomSheetFlatList
        data={viewers}
        keyExtractor={(item: SeenByViewer) => item.user.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="items-center px-5 pb-5 pt-1">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
              <ChecksIcon size={25} color="#10B981" weight="bold" />
            </View>
            <Text className="mt-3 text-xl font-bold text-black dark:text-white">
              {t("seenBy")}
            </Text>
          </View>
        }
        renderItem={({ item }: { item: SeenByViewer }) => (
          <View className="mx-4 mb-2 flex-row items-center rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
            <Avatar
              uri={item.user.avatarUrl}
              username={item.user.username}
              size={44}
              showSnapIndicator={false}
            />
            <View className="ml-3 min-w-0 flex-1">
              <Text
                numberOfLines={1}
                className="font-bold text-black dark:text-white"
              >
                {item.user.username}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {t("seen")}
              </Text>
            </View>
            <ChecksIcon size={19} color="#10B981" weight="bold" />
          </View>
        )}
      />
    </AppBottomSheet>
  );
}
