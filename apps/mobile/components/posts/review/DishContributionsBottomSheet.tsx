import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import type { ReviewItem } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { CheckCircleIcon, StarIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";

type Props = {
  item: ReviewItem | null;
  onClose: () => void;
  canChoosePrimary?: boolean;
  primaryMediaId?: string | null;
  onChoosePrimary?: (itemId: string, mediaId: string) => void;
};

export default function DishContributionsBottomSheet({
  item,
  onClose,
  canChoosePrimary = false,
  primaryMediaId,
  onChoosePrimary,
}: Props) {
  const { t } = useTranslation("collaborativeReview");
  const contributions = item?.contributions ?? [];
  const dishName = item?.menuItem?.name ?? item?.customDishName ?? t("dish");

  return (
    <AppBottomSheet
      open={!!item}
      onClose={onClose}
      snapPoints={["68%", "90%"]}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
      >
        <Text className="text-2xl font-bold text-black dark:text-white">
          {dishName}
        </Text>
        <Text className="mb-5 mt-1 text-sm text-gray-500">
          {t("peopleSharedTake", { count: contributions.length })}
        </Text>

        <View className="gap-3">
          {contributions.map((contribution) => {
            const photos = (item?.media ?? []).filter(
              (media) => media.uploadedById === contribution.userId,
            );
            return (
              <View
                key={contribution.id}
                className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <View className="flex-row items-center">
                  <Avatar
                    uri={contribution.user.avatarUrl}
                    username={contribution.user.username}
                    size={42}
                  />
                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-black dark:text-white">
                      {userDisplayName(contribution.user)}
                    </Text>
                    {contribution.user.displayName?.trim() ? (
                      <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {usernameLabel(contribution.user.username)}
                      </Text>
                    ) : null}
                    {contribution.rating != null && (
                      <View className="mt-1 flex-row items-center">
                        <StarIcon size={15} color="#E0B84F" weight="fill" />
                        <Text className="ml-1 font-bold text-black dark:text-white">
                          {contribution.rating}/10
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {!!contribution.text && (
                  <Text className="mt-3 leading-5 text-gray-700 dark:text-gray-300">
                    {contribution.text}
                  </Text>
                )}

                {photos.length > 0 && (
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    {photos.map((photo) => {
                      const isPrimary = photo.id === primaryMediaId;
                      return (
                        <TouchableOpacity
                          key={photo.id}
                          disabled={!canChoosePrimary || isPrimary}
                          onPress={() =>
                            item && onChoosePrimary?.(item.id, photo.id)
                          }
                        >
                          <ProgressiveImage
                            source={{ uri: photo.imageUrl }}
                            className="h-24 w-24 rounded-2xl bg-gray-200"
                            resizeMode="cover"
                          />
                          {isPrimary ? (
                            <View className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-brand">
                              <CheckCircleIcon
                                size={17}
                                color="#FAF9F6"
                                weight="fill"
                              />
                            </View>
                          ) : canChoosePrimary ? (
                            <View className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-black/70 px-2 py-1">
                              <Text
                                numberOfLines={1}
                                className="text-center text-[10px] font-bold text-white"
                              >
                                {t("makePrimary")}
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
}
