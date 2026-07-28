import Text from "@/components/common/AppText";
import { CreateReviewDraft } from "@findeat/types/review";
import { ScrollView, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { ThemedSafeAreaView } from "@/components/common";
import DishCard from "../components/DishCard";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import PostVisibilitySelector from "@/components/posts/PostVisibilitySelector";
import type { PostVisibility } from "@findeat/types";
import PostConnectionPicker from "@/components/posts/PostConnectionPicker";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import { useTranslation } from "react-i18next";
import Avatar from "@/components/common/Avatar";
import { UsersThreeIcon } from "phosphor-react-native";

type Props = {
  draft: CreateReviewDraft;
  loading: boolean;
  onBack: () => void;
  onPublish: () => void;
  onVisibilityChange: (visibility: PostVisibility) => void;
  onLinkedPostChange: (postId?: string) => void;
  onSaveDraft: () => void;
  savingDraft?: boolean;
};

export default function PreviewStep({
  draft,
  loading,
  onBack,
  onPublish,
  onVisibilityChange,
  onLinkedPostChange,
  onSaveDraft,
  savingDraft,
}: Props) {
  const { t } = useTranslation(["create", "common"]);
  const restaurantName =
    draft.restaurant?.source === "FINDEAT"
      ? draft.restaurant.restaurant.name
      : draft.restaurant?.name;

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

        {draft.coverImageUri && (
          <ProgressiveImage
            source={{ uri: draft.coverImageUri }}
            className="mt-6 h-80 w-full rounded-3xl bg-gray-100"
            resizeMode="cover"
          />
        )}

        <View className="mt-6 rounded-3xl bg-gray-50 p-5 dark:bg-gray-900">
          {!!draft.overallRating && (
            <Text className="text-xl font-bold text-black dark:text-white">
              ⭐ {draft.overallRating}/10
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
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <PostVisibilitySelector
          value={draft.visibility}
          onChange={onVisibilityChange}
        />

        <PostConnectionPicker
          restaurantId={
            draft.restaurant?.source === "FINDEAT"
              ? draft.restaurant.restaurant.id
              : undefined
          }
          candidateType="CONTENT"
          selectedPostId={draft.linkedPostId}
          onSelect={onLinkedPostChange}
        />

        <TouchableOpacity
          className={`mt-8 rounded-2xl py-4 ${
            loading ? "bg-gray-400" : "bg-black dark:bg-white"
          }`}
          onPress={onPublish}
          disabled={loading}
        >
          <Text className="text-center font-bold text-white dark:text-black">
            {loading
              ? t("create:publishing")
              : t("create:publishReview")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedSafeAreaView>
  );
}
