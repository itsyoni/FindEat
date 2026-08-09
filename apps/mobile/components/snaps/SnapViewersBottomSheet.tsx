import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { EyeIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";

type Props = {
  snapId: string | null;
  open: boolean;
  onClose: () => void;
};

export default function SnapViewersBottomSheet({ snapId, open, onClose }: Props) {
  const { t } = useTranslation("snaps");
  const viewers = useQuery({
    queryKey: ["snap-viewers", snapId],
    queryFn: () => api.snaps.viewers(snapId!),
    enabled: open && !!snapId,
    staleTime: 10_000,
  });

  return (
    <AppBottomSheet open={open} onClose={onClose} snapPoints={["55%"]}>
      <View className="flex-1 px-5 pb-6">
        <View className="mb-4 flex-row items-center">
          <EyeIcon size={23} color="#F97316" weight="fill" />
          <View className="ml-3">
            <Text className="text-xl font-bold text-black dark:text-white">
              {t("activity")}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("viewedByCount", { count: viewers.data?.length ?? 0 })}
            </Text>
          </View>
        </View>

        {viewers.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : viewers.data?.length ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {viewers.data.map((viewer) => (
              <View key={viewer.user.id} className="flex-row items-center py-2.5">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: "/(users)/[id]",
                      params: { id: viewer.user.id },
                    });
                  }}
                >
                  <Avatar
                    userId={viewer.user.id}
                    username={viewer.user.username}
                    uri={viewer.user.avatarUrl}
                    size={44}
                    showSnapIndicator={false}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  className="ml-3 min-w-0 flex-1"
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: "/(users)/[id]",
                      params: { id: viewer.user.id },
                    });
                  }}
                >
                  <Text numberOfLines={1} className="font-bold text-black dark:text-white">
                    {viewer.user.username}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-gray-500 dark:text-gray-400">
              {t("noViewers")}
            </Text>
          </View>
        )}
      </View>
    </AppBottomSheet>
  );
}
