import Text from "@/components/common/AppText";
import { CreateReviewDraft } from "@findeat/types/review";
import {
  FlatList,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { AppButton, ThemedSafeAreaView } from "@/components/common";
import DishCard from "../components/DishCard";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import PostVisibilitySelector from "@/components/posts/PostVisibilitySelector";
import type { PostVisibility } from "@findeat/types";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useTranslation } from "react-i18next";
import Avatar from "@/components/common/Avatar";
import { UsersThreeIcon } from "phosphor-react-native";
import ContentVideo from "@/components/posts/content/ContentVideo";
import { useState } from "react";
import type { LinkedContentPreview } from "../ReviewCreator";
import DishPreviewImage from "../components/DishPreviewImage";

type Props = {
  draft: CreateReviewDraft;
  overallRating?: number;
  loading: boolean;
  onBack: () => void;
  onPublish: () => void;
  onVisibilityChange: (visibility: PostVisibility) => void;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
  linkedContentPreview?: LinkedContentPreview;
  showVisibilitySelector?: boolean;
};

type PreviewMediaItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  uri: string;
  dishName?: string;
  dishPrice?: number | null;
  fallbackUri?: string | null;
};

export default function PreviewStep({
  draft,
  overallRating,
  loading,
  onBack,
  onPublish,
  onVisibilityChange,
  onSaveDraft,
  savingDraft,
  linkedContentPreview,
  showVisibilitySelector = true,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const { width: screenWidth } = useWindowDimensions();
  const [mediaIndex, setMediaIndex] = useState(0);
  const previewWidth = screenWidth - 48;
  const restaurantName =
    draft.restaurant?.source === "FINDEAT"
      ? draft.restaurant.restaurant.name
      : draft.restaurant?.name;
  const reviewMedia: PreviewMediaItem[] = [
    ...(draft.coverImageUri || draft.coverImageUrl
      ? [
          {
            id: "review-cover",
            type: "IMAGE" as const,
            uri: (draft.coverImageUri ?? draft.coverImageUrl)!,
          },
        ]
      : []),
    ...draft.items.flatMap((item) => {
      const uri = item.imageUri ?? item.fallbackImageUrl;
      const dishName =
        item.menuItemName ?? item.customDishName ?? t("create:dish");
      const dishPrice = item.customPrice ?? item.menuItemPrice;
      return uri
        ? [
            {
              id: `dish-${item.id}`,
              type: "IMAGE" as const,
              uri,
              dishName,
              dishPrice,
              fallbackUri: item.fallbackImageUrl,
            },
          ]
        : [];
    }),
  ];
  const previewMedia: PreviewMediaItem[] = linkedContentPreview?.media.length
    ? linkedContentPreview.media
    : reviewMedia;

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 32,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack}>
            <Text className="font-bold text-black dark:text-white">
              {t("common:back")}
            </Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            {onSaveDraft ? (
              <SaveDraftButton onPress={onSaveDraft} saving={savingDraft} />
            ) : null}
            <Text className="text-sm font-semibold text-gray-400">
              {t("create:stepOf", { current: 4, total: 4 })}
            </Text>
          </View>
        </View>

        <Text className="mt-6 text-3xl font-bold text-black dark:text-white">
          {t("create:reviewPreviewTitle")}
        </Text>

        <Text className="mt-2 text-gray-500">
          {t("create:reviewPreviewSubtitle")}
        </Text>

        {!!restaurantName && (
          <View className="mt-2 flex-row items-center">
            <Text className="text-gray-500">{restaurantName}</Text>
            <RestaurantBadge />
          </View>
        )}

        {linkedContentPreview ? (
          <Text className="mt-6 text-lg font-bold text-black dark:text-white">
            {t("create:postPreview")}
          </Text>
        ) : null}

        {previewMedia.length > 0 ? (
          <View
            className="mt-4 overflow-hidden rounded-3xl bg-black"
            style={{ width: previewWidth, aspectRatio: 4 / 5 }}
          >
            <FlatList
              horizontal
              pagingEnabled
              nestedScrollEnabled
              directionalLockEnabled
              data={previewMedia}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, index) => ({
                length: previewWidth,
                offset: previewWidth * index,
                index,
              })}
              onMomentumScrollEnd={(event) =>
                setMediaIndex(
                  Math.round(
                    event.nativeEvent.contentOffset.x / previewWidth,
                  ),
                )
              }
              renderItem={({ item }) => (
                <View style={{ width: previewWidth, height: "100%" }}>
                  {item.type === "VIDEO" ? (
                    <ContentVideo
                      uri={item.uri}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      autoPlay
                      tapToToggle
                      showProgress
                    />
                  ) : item.dishName ? (
                    <DishPreviewImage
                      pickedUri={item.uri}
                      menuImageUrl={item.fallbackUri}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <ProgressiveImage
                      source={{ uri: item.uri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  )}
                  {item.dishName ? (
                    <View
                      pointerEvents="none"
                      className="absolute inset-x-0 bottom-0 flex-row items-end justify-between gap-3 bg-black/60 px-4 py-4"
                    >
                      <Text
                        numberOfLines={2}
                        className="flex-1 text-lg font-bold text-white"
                      >
                        {item.dishName}
                      </Text>
                      {item.dishPrice != null ? (
                        <Text className="font-bold text-white">
                          ₪{item.dishPrice}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              )}
            />
            {previewMedia.length > 1 ? (
              <View
                pointerEvents="none"
                className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1"
              >
                <Text className="text-xs font-bold text-white">
                  {mediaIndex + 1}/{previewMedia.length}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {linkedContentPreview?.caption.trim() ? (
          <Text className="mt-3 text-base leading-6 text-black dark:text-white">
            {linkedContentPreview.caption.trim()}
          </Text>
        ) : null}

        {linkedContentPreview ? (
          <View className="mb-1 mt-7 border-t border-gray-200 pt-7 dark:border-gray-800">
            <Text className="text-xl font-bold text-black dark:text-white">
              {t("create:fullReviewDetails")}
            </Text>
          </View>
        ) : null}

        <View className="mt-6 rounded-3xl bg-gray-50 p-5 dark:bg-gray-900">
          {!!overallRating && (
            <Text className="text-xl font-bold text-black dark:text-white">
              ⭐ {overallRating}/10
            </Text>
          )}

          <View className="mt-4 gap-2">
            {!!draft.atmosphereRating && (
              <Text className="text-gray-700 dark:text-gray-300">
                {t("create:atmosphere")}: {draft.atmosphereRating}/10
              </Text>
            )}

            {!!draft.serviceRating && (
              <Text className="text-gray-700 dark:text-gray-300">
                {t("create:service")}: {draft.serviceRating}/10
              </Text>
            )}

            {!!draft.valueRating && (
              <Text className="text-gray-700 dark:text-gray-300">
                {t("create:value")}: {draft.valueRating}/10
              </Text>
            )}

            {draft.totalPrice != null && (
              <Text className="text-gray-700 dark:text-gray-300">
                {t("create:bill")}: ₪{draft.totalPrice}
              </Text>
            )}
          </View>

          {!!draft.summary && (
            <Text className="mt-4 text-base text-black dark:text-white">
              {draft.summary}
            </Text>
          )}
          {draft.recommendedFor || draft.visitDate || draft.experienceTags?.length ? (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {draft.recommendedFor ? (
                <View className="rounded-full bg-[#FAF9F6] px-3 py-2 dark:bg-[#20201E]">
                  <Text className="text-xs font-semibold text-[#171716] dark:text-[#F7F6F2]">
                    {t(`create:visitOccasions.${draft.recommendedFor}`)}
                  </Text>
                </View>
              ) : null}
              {draft.visitDate ? (
                <View className="rounded-full bg-[#FAF9F6] px-3 py-2 dark:bg-[#20201E]">
                  <Text className="text-xs font-semibold text-[#171716] dark:text-[#F7F6F2]">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(draft.visitDate))}
                  </Text>
                </View>
              ) : null}
              {(draft.experienceTags ?? []).map((tag) => (
                <View key={tag} className="rounded-full bg-[#FAF9F6] px-3 py-2 dark:bg-[#20201E]">
                  <Text className="text-xs font-semibold text-[#171716] dark:text-[#F7F6F2]">
                    {t(`create:experienceTags.${tag}`)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {draft.items.length > 0 && (
          <>
            <Text className="mt-8 text-xl font-bold text-black dark:text-white">
              {t("create:whatIOrdered")}
            </Text>

            <View className="mt-4 gap-4">
              {draft.items.map((item) => (
                <DishCard key={item.id} item={item} />
              ))}
            </View>
          </>
        )}

        {draft.participants.length > 0 && (
          <View className="mt-8 rounded-3xl border border-brand/30 bg-brand/10 p-4">
            <View className="flex-row items-center">
              <UsersThreeIcon size={22} color="#C89C25" weight="fill" />
              <View className="ml-3 flex-1">
                <Text className="font-bold text-black dark:text-white">
                  {t("create:reviewingTogether")}
                </Text>
                <Text className="mt-1 text-sm text-gray-500">
                  {t("create:reviewInvitesAfterPublish", {
                    count: draft.participants.length,
                  })}
                </Text>
              </View>
              <View className="flex-row">
                {draft.participants.slice(0, 4).map((participant, index) => (
                  <View
                    key={participant.id}
                    style={{ marginLeft: index === 0 ? 0 : -9 }}
                  >
                    <Avatar
                      uri={participant.avatarUrl}
                      username={participant.username}
                      size={34}
                      showSnapIndicator={false}
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {showVisibilitySelector ? (
          <PostVisibilitySelector
            value={draft.visibility}
            onChange={onVisibilityChange}
          />
        ) : null}

      </ScrollView>

      <View className="border-t border-gray-200 bg-[#FBFAF8] px-6 pb-2 pt-3 dark:border-gray-800 dark:bg-[#0B0B0A]">
        <AppButton
          title={t("create:publishReview")}
          onPress={onPublish}
          loading={loading}
        />
      </View>
    </ThemedSafeAreaView>
  );
}
