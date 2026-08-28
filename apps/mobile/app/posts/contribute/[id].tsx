import { AppAlert as Alert } from "@/lib/appAlert";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { SkeletonList, ThemedSafeAreaView } from "@/components/common";
import CollaborativeDishPicker from "@/components/review-collaboration/CollaborativeDishPicker";
import ReviewContributionEditor, {
  type ContributionEditorValue,
} from "@/components/review-collaboration/ReviewContributionEditor";
import AddDishDetailsStep from "@/components/review-creator/steps/AddDishDetailsStep";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import type { Dish, Post, ReviewItem } from "@findeat/types";
import type { ReviewDishFormDraft } from "@findeat/types/review";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CaretDownIcon,
  CaretUpIcon,
  PlusCircleIcon,
  StarIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import RatingPicker from "@/components/review-creator/components/RatingPicker";

type ScreenMode = "LIST" | "PICK_DISH" | "EDIT_EXISTING" | "EDIT_NEW";

function itemName(item: ReviewItem, fallback: string) {
  return item.customDishName ?? item.menuItem?.name ?? fallback;
}

function itemImage(item: ReviewItem) {
  return (
    item.primaryMedia?.imageUrl ??
    item.imageUrl ??
    item.menuItem?.imageUrl ??
    null
  );
}

export default function ContributeToReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("collaborativeReview");
  const { t: tCommon } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ScreenMode>("LIST");
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [selectedMenuDish, setSelectedMenuDish] = useState<Dish | null>(null);
  const [customDish, setCustomDish] = useState(false);
  const [newDishDraft, setNewDishDraft] =
    useState<ReviewDishFormDraft | null>(null);
  const [experienceRatings, setExperienceRatings] = useState<{
    atmosphereRating?: number;
    serviceRating?: number;
    valueRating?: number;
  }>({});

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void api.posts
      .get(id)
      .then((value) => {
        if (!cancelled) {
          setPost(value);
          const ownParticipant = value.reviewParticipants?.find(
            (participant) => participant.userId === user?.id,
          );
          setExperienceRatings({
            atmosphereRating: ownParticipant?.atmosphereRating ?? undefined,
            serviceRating: ownParticipant?.serviceRating ?? undefined,
            valueRating: ownParticipant?.valueRating ?? undefined,
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Could not load collaborative review", error);
        showToast(t("loadError"), { kind: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, showToast, t, user?.id]);

  const ownContribution = selectedItem?.contributions?.find(
    (contribution) => contribution.userId === user?.id,
  );
  const ownMedia = (selectedItem?.media ?? [])
    .filter((media) => media.uploadedById === user?.id)
    .sort((left, right) => {
      const primaryId = selectedItem?.primaryMedia?.id;
      if (left.id === primaryId) return -1;
      if (right.id === primaryId) return 1;
      return 0;
    });

  async function uploadSelectedImages(imageUris: string[]) {
    return Promise.all(
      imageUris.map((uri) => uploadImage(uri, "dish")),
    );
  }

  function refreshSharedReviewCaches() {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  }

  async function saveExperienceRatings() {
    if (!post || saving) return;
    try {
      setSaving(true);
      const updated = await api.posts.upsertReviewExperienceRatings(post.id, {
        atmosphereRating: experienceRatings.atmosphereRating ?? null,
        serviceRating: experienceRatings.serviceRating ?? null,
        valueRating: experienceRatings.valueRating ?? null,
      });
      setPost(updated);
      refreshSharedReviewCaches();
      showToast(t("experienceSaved"));
    } catch (error) {
      console.error("Could not save shared experience ratings", error);
      showToast(t("experienceSaveError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveExisting(value: ContributionEditorValue) {
    if (!post || !selectedItem || saving) return;
    try {
      setSaving(true);
      const imageUrls = await uploadSelectedImages(value.imageUris);
      const updated = await api.posts.upsertReviewContribution(
        post.id,
        selectedItem.id,
        {
          rating: value.rating,
          text: value.text.trim() || undefined,
          imageUrls,
        },
      );
      setPost(updated);
      refreshSharedReviewCaches();
      setMode("LIST");
      setSelectedItem(null);
      showToast(t("takeSaved"));
    } catch (error) {
      console.error("Could not save review contribution", error);
      showToast(t("saveError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveNew(value: ContributionEditorValue) {
    if (!post || saving) return;
    try {
      setSaving(true);
      const imageUrls = await uploadSelectedImages(value.imageUris);
      const result = await api.posts.addCollaborativeReviewDish(post.id, {
        menuItemId: selectedMenuDish?.id,
        customDishName: customDish ? value.customDishName : undefined,
        customPrice: customDish ? value.customPrice : undefined,
        rating: value.rating,
        text: value.text.trim() || undefined,
        imageUrls,
      });
      setPost(result.post);
      refreshSharedReviewCaches();
      setSelectedMenuDish(null);
      setCustomDish(false);
      setNewDishDraft(null);
      setMode("LIST");
      showToast(t("dishAdded"));
    } catch (error) {
      console.error("Could not add collaborative review dish", error);
      showToast(t("addDishError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  function removeTake() {
    if (!post || !selectedItem || saving) return;
    Alert.alert(t("removeTakeTitle"), t("removeTakeBody"), [
      { text: tCommon("cancel"), style: "cancel" },
      {
        text: t("remove"),
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            const updated = await api.posts.removeReviewContribution(
              post.id,
              selectedItem.id,
            );
            setPost(updated);
            refreshSharedReviewCaches();
            setSelectedItem(null);
            setMode("LIST");
          } catch (error) {
            console.error("Could not remove review contribution", error);
            showToast(t("removeError"), { kind: "error" });
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  async function removeMedia(mediaId: string) {
    if (!post || saving) return;
    try {
      setSaving(true);
      const updated = await api.posts.removeReviewDishMedia(post.id, mediaId);
      setPost(updated);
      refreshSharedReviewCaches();
      setSelectedItem(
        updated.reviewPost?.items.find(
          (item) => item.id === selectedItem?.id,
        ) ?? null,
      );
    } catch (error) {
      console.error("Could not remove contribution photo", error);
      showToast(t("removeError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function moveDish(itemId: string, direction: -1 | 1) {
    if (!post || saving || post.authorId !== user?.id) return;
    const items = post.reviewPost?.items ?? [];
    const index = items.findIndex((item) => item.id === itemId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    setPost({
      ...post,
      reviewPost: post.reviewPost
        ? { ...post.reviewPost, items: reordered }
        : post.reviewPost,
    });
    try {
      setSaving(true);
      const updated = await api.posts.reorderReviewDishes(
        post.id,
        reordered.map((item) => item.id),
      );
      setPost(updated);
      refreshSharedReviewCaches();
      showToast(t("orderUpdated"));
    } catch (error) {
      console.error("Could not reorder collaborative review dishes", error);
      setPost(post);
      showToast(t("orderUpdateError"), { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  function leaveReview() {
    if (!post || saving || post.authorId === user?.id) return;
    Alert.alert(t("leaveTitle"), t("leaveBody"), [
      { text: tCommon("cancel"), style: "cancel" },
      {
        text: t("leave"),
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await api.posts.leaveReview(post.id);
            refreshSharedReviewCaches();
            showToast(t("leftReview"));
            router.back();
          } catch (error) {
            console.error("Could not leave collaborative review", error);
            showToast(t("leaveError"), { kind: "error" });
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (mode === "PICK_DISH" && post?.restaurantId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <CollaborativeDishPicker
          restaurantId={post.restaurantId}
          excludedMenuItemIds={(post.reviewPost?.items ?? [])
            .map((item) => item.menuItemId)
            .filter((itemId): itemId is string => !!itemId)}
          onBack={() => setMode("LIST")}
          onSelect={(dish) => {
            setSelectedMenuDish(dish);
            setCustomDish(false);
            setNewDishDraft({
              dishName: dish.name,
              price: dish.price ?? undefined,
              text: "",
            });
            setMode("EDIT_NEW");
          }}
          onCustom={() => {
            setSelectedMenuDish(null);
            setCustomDish(true);
            setNewDishDraft({ dishName: "", text: "" });
            setMode("EDIT_NEW");
          }}
        />
      </>
    );
  }

  if (mode === "EDIT_EXISTING" && selectedItem) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewContributionEditor
          title={itemName(selectedItem, t("dish"))}
          imageUrl={itemImage(selectedItem)}
          initialRating={ownContribution?.rating ?? undefined}
          initialText={ownContribution?.text ?? ""}
          existingMedia={ownMedia}
          saving={saving}
          onBack={() => {
            setSelectedItem(null);
            setMode("LIST");
          }}
          onRemoveExistingMedia={(mediaId) => void removeMedia(mediaId)}
          onRemove={ownContribution ? removeTake : undefined}
          onSave={(value) => void saveExisting(value)}
        />
      </>
    );
  }

  if (mode === "EDIT_NEW") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <AddDishDetailsStep
          selectedDish={selectedMenuDish}
          initialDraft={newDishDraft}
          onDraftChange={(update) =>
            setNewDishDraft((current) => ({
              dishName: selectedMenuDish?.name ?? "",
              price: selectedMenuDish?.price ?? undefined,
              text: "",
              ...current,
              ...update,
            }))
          }
          editing={false}
          submitting={saving}
          onBack={() => setMode("PICK_DISH")}
          onSave={(item) =>
            void saveNew({
              rating: item.rating,
              text: item.text ?? "",
              imageUris: item.imageUri ? [item.imageUri] : [],
              customDishName: customDish ? item.customDishName : undefined,
              customPrice: customDish ? item.customPrice : undefined,
            })
          }
        />
      </>
    );
  }

  const iconColor = isDark ? "#FAF9F6" : "#111827";
  const participants = (post?.reviewParticipants ?? []).filter(
    (participant) => participant.status === "JOINED",
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedSafeAreaView edges={["top", "bottom"]}>
        <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center"
          >
            <DirectionalIcon
              direction="back"
              size={25}
              color={iconColor}
              weight="bold"
            />
          </TouchableOpacity>
          <View className="ml-2 flex-1">
            <Text className="text-xl font-bold text-black dark:text-white">
              {t("yourTakeTitle")}
            </Text>
            <Text className="mt-0.5 text-sm text-gray-500">
              {post?.restaurant?.name}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} className="px-2 py-3">
            <Text className="font-bold text-brand">{t("done")}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <SkeletonList variant="menu" count={5} />
        ) : !post || !post.canContribute ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-gray-500">{t("loadError")}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            <View className="rounded-3xl bg-brand/10 p-4">
              <View className="flex-row items-center">
                <UsersThreeIcon size={24} color="#C89C25" weight="fill" />
                <Text className="ml-3 flex-1 font-bold text-black dark:text-white">
                  {t("reviewedTogether")}
                </Text>
                <View className="flex-row">
                  {participants.slice(0, 4).map((participant, index) => (
                    <View
                      key={participant.id}
                      style={{ marginLeft: index === 0 ? 0 : -8 }}
                    >
                      <Avatar
                        uri={participant.user.avatarUrl}
                        username={participant.user.username}
                        size={32}
                      />
                    </View>
                  ))}
                </View>
              </View>
              <Text className="mt-2 text-sm leading-5 text-gray-500">
                {t("yourTakeSubtitle")}
              </Text>
            </View>

            <View className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <Text className="text-lg font-bold text-black dark:text-white">
                {t("overallExperience")}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500">
                {t("overallExperienceHint")}
              </Text>
              <View className="mt-6 gap-7">
                <RatingPicker
                  label={t("atmosphere")}
                  value={experienceRatings.atmosphereRating}
                  onChange={(atmosphereRating) =>
                    setExperienceRatings((current) => ({
                      ...current,
                      atmosphereRating,
                    }))
                  }
                />
                <RatingPicker
                  label={t("service")}
                  value={experienceRatings.serviceRating}
                  onChange={(serviceRating) =>
                    setExperienceRatings((current) => ({
                      ...current,
                      serviceRating,
                    }))
                  }
                />
                <RatingPicker
                  label={t("value")}
                  value={experienceRatings.valueRating}
                  onChange={(valueRating) =>
                    setExperienceRatings((current) => ({
                      ...current,
                      valueRating,
                    }))
                  }
                />
              </View>
              <TouchableOpacity
                disabled={saving}
                onPress={() => void saveExperienceRatings()}
                className="mt-7 rounded-2xl bg-black py-4 dark:bg-white"
              >
                <Text className="text-center font-bold text-white dark:text-black">
                  {saving ? t("saving") : t("saveExperience")}
                </Text>
              </TouchableOpacity>
            </View>

            {(post.reviewPost?.items ?? []).length === 0 ? (
              <View className="mt-7 items-center rounded-3xl border border-dashed border-gray-300 px-6 py-10 dark:border-gray-700">
                <Text className="text-lg font-bold text-black dark:text-white">
                  {t("noDishesTitle")}
                </Text>
                <Text className="mt-2 text-center text-gray-500">
                  {t("noDishesBody")}
                </Text>
              </View>
            ) : (
              <View className="mt-7 gap-3">
                {(post.reviewPost?.items ?? []).map((item, index, allItems) => {
                  const contribution = item.contributions?.find(
                    (value) => value.userId === user?.id,
                  );
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setSelectedItem(item);
                        setMode("EDIT_EXISTING");
                      }}
                      className="flex-row items-center rounded-3xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                    >
                      {itemImage(item) ? (
                        <ProgressiveImage
                          source={{ uri: itemImage(item)! }}
                          className="h-20 w-20 rounded-2xl bg-gray-100"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                          <Text className="text-2xl">🍽️</Text>
                        </View>
                      )}
                      <View className="ml-4 flex-1">
                        <Text className="font-bold text-black dark:text-white">
                          {itemName(item, t("dish"))}
                        </Text>
                        {contribution?.rating != null ? (
                          <View className="mt-2 flex-row items-center">
                            <StarIcon
                              size={15}
                              color="#E0B84F"
                              weight="fill"
                            />
                            <Text className="ml-1 font-bold text-black dark:text-white">
                              {contribution.rating}/10
                            </Text>
                          </View>
                        ) : (
                          <Text className="mt-2 text-sm font-bold text-brand">
                            {t("addYourTake")}
                          </Text>
                        )}
                      </View>
                      {post.authorId === user?.id ? (
                        <View className="ml-2 gap-1">
                          <TouchableOpacity
                            disabled={index === 0 || saving}
                            onPress={() => void moveDish(item.id, -1)}
                            className={`h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 ${
                              index === 0 ? "opacity-30" : ""
                            }`}
                          >
                            <CaretUpIcon size={17} color={iconColor} weight="bold" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={index === allItems.length - 1 || saving}
                            onPress={() => void moveDish(item.id, 1)}
                            className={`h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 ${
                              index === allItems.length - 1 ? "opacity-30" : ""
                            }`}
                          >
                            <CaretDownIcon size={17} color={iconColor} weight="bold" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text className="text-sm text-gray-400">
                          {t("reviewTakes", {
                            count: item.contributions?.length ?? 0,
                          })}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              onPress={() => setMode("PICK_DISH")}
              className="mt-5 flex-row items-center justify-center rounded-2xl border border-dashed border-brand/60 bg-brand/10 py-4"
            >
              <PlusCircleIcon size={22} color="#C89C25" weight="fill" />
              <Text className="ml-2 font-bold text-black dark:text-white">
                {t("addMissingDish")}
              </Text>
            </TouchableOpacity>

            {post.authorId !== user?.id ? (
              <TouchableOpacity
                disabled={saving}
                onPress={leaveReview}
                className="mt-8 items-center py-3"
              >
                <Text className="font-bold text-red-500">
                  {t("leave")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        )}
      </ThemedSafeAreaView>
    </>
  );
}
