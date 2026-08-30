import { AppAlert as Alert } from "@/lib/appAlert";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import {
  CreateReviewDraft,
  CreateReviewStep,
  ReviewDishFormDraft,
  ReviewInviteeDraft,
  SelectedReviewDish,
} from "@findeat/types/review";
import type { PostVisibility, SelectedRestaurant } from "@findeat/types";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import AddDishDetailsStep from "./steps/AddDishDetailsStep";
import CoverStep from "./steps/CoverStep";
import DishesStep from "./steps/DishesStep";
import PreviewStep from "./steps/PreviewStep";
import RestaurantStep from "./steps/RestaurantStep";
import SelectMenuDishStep from "./steps/SelectMenuDishStep";
import ReviewParticipantsStep from "./steps/ReviewParticipantsStep";
import {
  prependPostToFeedCache,
  updatePostInFeedCache,
  updateRestaurantStatusInFeedCache,
} from "@/hooks/useFeed";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  createCombinedUploadProgress,
  usePostUpload,
} from "@/contexts/PostUploadContext";
import {
  clearPostDraft,
  loadReviewPostDraft,
  type ReviewPostDraft,
  saveReviewPostDraft,
} from "@/lib/postDrafts";
import { calculateReviewBill } from "@/lib/reviewPricing";

const initialDraft: CreateReviewDraft = {
  visibility: "PUBLIC",
  restaurant: null,
  summary: "",
  experienceTags: [],
  items: [],
  participants: [],
};

export type ReviewCreatorSnapshot = {
  step: CreateReviewStep;
  draft: CreateReviewDraft;
  selectedMenuDish: SelectedReviewDish | null;
  pendingDish: ReviewDishFormDraft | null;
  editingDishId?: string | null;
};

export type LinkedContentPreview = {
  media: {
    id: string;
    type: "IMAGE" | "VIDEO";
    uri: string;
    videoOverlayUri?: string;
    muted?: boolean;
  }[];
  caption: string;
};

export default function ReviewCreator({
  initialRestaurantId,
  initialRestaurant,
  initialLinkedPostId,
  initialCoverImageUrl,
  initialCoverImageUri,
  linkedContentPublisher,
  onLinkedFlowBack,
  initialParticipants = [],
  initialVisibility = "PUBLIC",
  initialSnapshot,
  linkedContentPreview,
}: {
  initialRestaurantId?: string;
  initialRestaurant?: SelectedRestaurant;
  initialLinkedPostId?: string;
  initialCoverImageUrl?: string;
  initialCoverImageUri?: string;
  linkedContentPublisher?: (
    reportProgress: (progress: number) => void,
  ) => Promise<{ postId: string; restaurantId: string; coverImageUrl?: string }>;
  onLinkedFlowBack?: (snapshot: ReviewCreatorSnapshot | null) => void;
  initialParticipants?: ReviewInviteeDraft[];
  initialVisibility?: PostVisibility;
  initialSnapshot?: ReviewCreatorSnapshot | null;
  linkedContentPreview?: LinkedContentPreview;
}) {
  const queryClient = useQueryClient();
  const { refreshUser, user } = useAuth();
  const { t } = useTranslation("create");
  const { showToast } = useToast();
  const { isDark } = useAppTheme();
  const { startPostUpload } = usePostUpload();
  const embeddedFlow = !!linkedContentPublisher;
  const [step, setStep] = useState<CreateReviewStep>(
    initialSnapshot?.step ?? (initialRestaurant ? "COVER" : "RESTAURANT"),
  );
  const [draft, setDraft] = useState<CreateReviewDraft>(() =>
    initialSnapshot
      ? {
          ...initialSnapshot.draft,
          experienceTags: initialSnapshot.draft.experienceTags ?? [],
          visibility: embeddedFlow
            ? initialVisibility
            : initialSnapshot.draft.visibility,
          participants: [...initialParticipants],
        }
      : {
          ...initialDraft,
          visibility: initialVisibility,
          restaurant: initialRestaurant ?? null,
          linkedPostId: initialLinkedPostId,
          coverImageUrl: initialCoverImageUrl,
          coverImageUri: initialCoverImageUri,
          participants: [...initialParticipants],
        },
  );
  const [loading, setLoading] = useState(false);
  const [selectedMenuDish, setSelectedMenuDish] = useState<SelectedReviewDish | null>(
    initialSnapshot?.selectedMenuDish ?? null,
  );
  const [pendingDish, setPendingDish] = useState<ReviewDishFormDraft | null>(
    initialSnapshot?.pendingDish ?? null,
  );
  const [editingDishId, setEditingDishId] = useState<string | null>(
    initialSnapshot?.editingDishId ?? null,
  );
  const [initializingRestaurant, setInitializingRestaurant] = useState(
    !!initialRestaurantId && !initialRestaurant,
  );
  const [draftHydrated, setDraftHydrated] = useState(embeddedFlow);
  const [resumedDraft, setResumedDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const draftSnapshotRef = useRef<Omit<ReviewPostDraft, "updatedAt"> | null>(null);
  const publishCompletedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    if (embeddedFlow) return;
    let cancelled = false;

    void loadReviewPostDraft(user.id)
      .then((savedDraft) => {
        if (cancelled) return;
        if (!savedDraft) {
          setDraftHydrated(true);
          return;
        }

        Alert.alert(t("draftFoundTitle"), t("reviewDraftFoundBody"), [
          {
            text: t("discardDraft"),
            style: "destructive",
            onPress: () => {
              void clearPostDraft(user.id, "review");
              setDraftHydrated(true);
            },
          },
          {
            text: t("continueDraft"),
            onPress: () => {
              setDraft({
                ...savedDraft.draft,
                participants: savedDraft.draft.participants ?? [],
                experienceTags: savedDraft.draft.experienceTags ?? [],
              });
              setSelectedMenuDish(savedDraft.selectedMenuDish ?? null);
              setPendingDish(savedDraft.pendingDish ?? null);
              setEditingDishId(savedDraft.editingDishId ?? null);
              setStep(savedDraft.step);
              setInitializingRestaurant(false);
              setResumedDraft(true);
              setDraftHydrated(true);
            },
          },
        ]);
      })
      .catch((error) => {
        console.error("Could not restore review draft", error);
        if (!cancelled) setDraftHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [embeddedFlow, t, user?.id]);

  useEffect(() => {
    if (
      !draftHydrated ||
      !user?.id ||
      embeddedFlow ||
      loading ||
      publishCompletedRef.current
    ) {
      return;
    }
    const hasDraftContent =
      draft.restaurant !== null ||
      !!draft.coverImageUri ||
      !!draft.coverImageUrl ||
      !!draft.summary.trim() ||
      draft.items.length > 0 ||
      draft.participants.length > 0 ||
      draft.visitDate !== undefined ||
      draft.recommendedFor !== undefined ||
      draft.experienceTags.length > 0 ||
      draft.atmosphereRating !== undefined ||
      draft.serviceRating !== undefined ||
      draft.valueRating !== undefined;
    if (!hasDraftContent) return;

    const timer = setTimeout(() => {
      if (publishCompletedRef.current) return;
      void saveReviewPostDraft(user.id, {
        step,
        draft,
        selectedMenuDish,
        pendingDish,
        editingDishId,
      }).catch((error) => console.error("Could not save review draft", error));
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, draftHydrated, editingDishId, embeddedFlow, loading, pendingDish, selectedMenuDish, step, user?.id]);

  useEffect(() => {
    if (embeddedFlow) {
      draftSnapshotRef.current = null;
      return;
    }
    const hasDraftContent =
      draft.restaurant !== null ||
      !!draft.coverImageUri ||
      !!draft.coverImageUrl ||
      !!draft.summary.trim() ||
      draft.items.length > 0 ||
      draft.participants.length > 0 ||
      draft.visitDate !== undefined ||
      draft.recommendedFor !== undefined ||
      draft.experienceTags.length > 0 ||
      draft.atmosphereRating !== undefined ||
      draft.serviceRating !== undefined ||
      draft.valueRating !== undefined;
    draftSnapshotRef.current =
      draftHydrated &&
      hasDraftContent &&
      !loading &&
      !publishCompletedRef.current
        ? { step, draft, selectedMenuDish, pendingDish, editingDishId }
        : null;
  }, [draft, draftHydrated, editingDishId, embeddedFlow, loading, pendingDish, selectedMenuDish, step]);

  useEffect(() => {
    if (!user?.id || embeddedFlow) return;
    const subscription = AppState.addEventListener("change", (state) => {
      const snapshot = draftSnapshotRef.current;
      if (
        state !== "active" &&
        snapshot &&
        !publishCompletedRef.current
      ) {
        void saveReviewPostDraft(user.id, snapshot);
      }
    });
    return () => subscription.remove();
  }, [embeddedFlow, user?.id]);

  useEffect(() => {
    if (!draftHydrated || initialRestaurant || !initialRestaurantId || resumedDraft) return;
    let cancelled = false;

    void api.restaurants
      .get(initialRestaurantId)
      .then((restaurant) => {
        if (cancelled) return;
        setDraft((current) => ({
          ...current,
          restaurant: { source: "FINDEAT", restaurant },
          linkedPostId: initialLinkedPostId,
          coverImageUrl: initialCoverImageUrl,
        }));
        setStep("COVER");
      })
      .catch((error) => {
        console.error("failed to preselect restaurant", error);
        if (!cancelled) setStep("RESTAURANT");
      })
      .finally(() => {
        if (!cancelled) setInitializingRestaurant(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draftHydrated, initialCoverImageUrl, initialLinkedPostId, initialRestaurant, initialRestaurantId, resumedDraft]);

  function updateDraft(update: Partial<CreateReviewDraft>) {
    setDraft((current) => ({
      ...current,
      ...update,
    }));
  }

  function currentSnapshot(): ReviewCreatorSnapshot {
    return {
      step,
      draft: { ...draft, participants: [...draft.participants] },
      selectedMenuDish,
      pendingDish,
      editingDishId,
    };
  }

  function hasReviewProgress() {
    return (
      draft.restaurant !== null ||
      !!draft.coverImageUri ||
      !!draft.coverImageUrl ||
      !!draft.summary.trim() ||
      draft.items.length > 0 ||
      draft.participants.length > 0 ||
      draft.visitDate !== undefined ||
      draft.recommendedFor !== undefined ||
      draft.experienceTags.length > 0 ||
      draft.atmosphereRating !== undefined ||
      draft.serviceRating !== undefined ||
      draft.valueRating !== undefined ||
      !!pendingDish
    );
  }

  function confirmExitReview() {
    if (!hasReviewProgress()) {
      router.back();
      return;
    }

    Alert.alert(t("exitReviewTitle"), t("exitReviewBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("discardAndExit"),
        style: "destructive",
        onPress: () => {
          if (user?.id) void clearPostDraft(user.id, "review");
          router.back();
        },
      },
      {
        text: t("saveAndExit"),
        onPress: () => void handleSaveDraft(),
      },
    ]);
  }

  function leaveLinkedReview() {
    if (!onLinkedFlowBack) return;
    const hasReviewDetails =
      !!draft.summary.trim() ||
      draft.items.length > 0 ||
      draft.atmosphereRating !== undefined ||
      draft.serviceRating !== undefined ||
      draft.valueRating !== undefined ||
      draft.visitDate !== undefined ||
      draft.recommendedFor !== undefined ||
      draft.experienceTags.length > 0 ||
      !!pendingDish;

    if (!hasReviewDetails) {
      onLinkedFlowBack(null);
      return;
    }

    Alert.alert(t("leaveReviewTitle"), t("leaveReviewBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("discardReviewDetails"),
        style: "destructive",
        onPress: () => onLinkedFlowBack(null),
      },
      {
        text: t("saveReviewDetails"),
        onPress: () => onLinkedFlowBack(currentSnapshot()),
      },
    ]);
  }

  function changeVisibility(visibility: PostVisibility) {
    if (visibility === "PRIVATE" && draft.participants.length > 0) {
      Alert.alert(
        t("privateReviewTogetherTitle"),
        t("privateReviewTogetherBody"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("makePrivate"),
            style: "destructive",
            onPress: () =>
              updateDraft({ visibility, participants: [] }),
          },
        ],
      );
      return;
    }
    updateDraft({ visibility });
  }

  function calculateOverallRating() {
    const ratings = [
      draft.atmosphereRating,
      draft.serviceRating,
      draft.valueRating,
      ...draft.items.map((item) => item.rating),
    ].filter((rating): rating is number => typeof rating === "number");

    if (ratings.length === 0) return undefined;

    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    return Math.round(average * 10) / 10;
  }

  async function getRestaurantId() {
    if (!draft.restaurant) return undefined;

    if (draft.restaurant.source === "FINDEAT") {
      return draft.restaurant.restaurant.id;
    }

    const restaurant = await api.restaurants.fromGoogle({
      name: draft.restaurant.name,
      address: draft.restaurant.address,
      latitude: draft.restaurant.latitude,
      longitude: draft.restaurant.longitude,
      googlePlaceId: draft.restaurant.googlePlaceId,
    });

    return restaurant.id;
  }

  function publishReview() {
    if (publishCompletedRef.current) return;

    if (!draft.restaurant) {
      Alert.alert(t("missingRestaurantTitle"), t("missingRestaurantBody"));
      return;
    }

    setLoading(true);
    publishCompletedRef.current = true;
    draftSnapshotRef.current = null;

    const pendingDraft = {
      ...draft,
      items: draft.items.map((item) => ({ ...item })),
      participants: [...draft.participants],
    };
    const clientRequestId = `review-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const pendingUserId = user?.id;
    const uploadCount =
      (pendingDraft.coverImageUri && !linkedContentPublisher ? 1 : 0) +
      pendingDraft.items.filter((item) => !!item.imageUri).length;

    startPostUpload({
      kind: "review",
      run: async (reportProgress) => {
        reportProgress(0.04);
        const linkedContent = linkedContentPublisher
          ? await linkedContentPublisher((progress) =>
              reportProgress(0.04 + progress * 0.54),
            )
          : undefined;
        const restaurantId = linkedContent?.restaurantId ?? (await getRestaurantId());
        if (!restaurantId) throw new Error(t("missingRestaurantBody"));

        const reportMediaProgress = createCombinedUploadProgress(
          uploadCount,
          reportProgress,
          linkedContent ? 0.6 : 0.08,
          0.9,
        );
        let uploadIndex = 0;
        const coverImageUrl = linkedContent?.coverImageUrl ??
          (pendingDraft.coverImageUri
            ? await uploadImage(
                pendingDraft.coverImageUri,
                "review",
                reportMediaProgress(uploadIndex++),
              )
            : pendingDraft.coverImageUrl);

        const uploadedItems = await Promise.all(
          pendingDraft.items.map(async (item) => {
            const progress =
              item.imageUri
                ? reportMediaProgress(uploadIndex++)
                : undefined;
            return {
              menuItemId: item.menuItemId,
              customDishName: item.customDishName?.trim() || undefined,
              customPrice: item.customPrice,
              imageUrl:
                item.imageUri && progress
                  ? await uploadImage(item.imageUri, "dish", progress)
                  : undefined,
              rating: item.rating,
              text: item.text?.trim() || undefined,
              order: item.order,
            };
          }),
        );
        if (uploadCount === 0) reportProgress(0.9);
        reportProgress(0.94);
        const createdPost = await api.posts.createReview({
          clientRequestId,
          restaurantId,
          visibility: pendingDraft.visibility,
          coverImageUrl,
          summary: pendingDraft.summary.trim() || undefined,
          visitDate: pendingDraft.visitDate,
          recommendedFor: pendingDraft.recommendedFor,
          experienceTags: pendingDraft.experienceTags,
          atmosphereRating: pendingDraft.atmosphereRating,
          serviceRating: pendingDraft.serviceRating,
          valueRating: pendingDraft.valueRating,
          totalPrice: calculateReviewBill(pendingDraft.items),
          linkedPostId: linkedContent?.postId ?? pendingDraft.linkedPostId,
          participantIds: pendingDraft.participants.map(
            (participant) => participant.id,
          ),
          items: uploadedItems,
        });
        reportProgress(0.98);

        if (pendingUserId) {
          try {
            await clearPostDraft(pendingUserId, "review");
          } catch (error) {
            console.error("Could not clear published review draft", error);
          }
        }
        updateRestaurantStatusInFeedCache(queryClient, restaurantId, {
          visited: true,
          wantToTry: false,
        });
        if (linkedContent?.postId && createdPost.reviewPost) {
          const dishPreviewImage = createdPost.reviewPost.items
            .map(
              (item) =>
                item.primaryMedia?.imageUrl ||
                item.media?.[0]?.imageUrl ||
                item.imageUrl ||
                item.menuItem?.imageUrl,
            )
            .find((imageUrl) => !!imageUrl?.trim());
          const reviewPreviewImages = [
            dishPreviewImage?.trim(),
            createdPost.reviewPost.coverImageUrl?.trim(),
            linkedContent.coverImageUrl?.trim(),
          ].filter(
            (imageUrl, index, candidates): imageUrl is string =>
              Boolean(imageUrl) && candidates.indexOf(imageUrl) === index,
          );
          const linkedReview = {
            id: createdPost.id,
            type: createdPost.type,
            visibility: createdPost.visibility,
            authorId: createdPost.authorId,
            restaurantId: createdPost.restaurantId,
            createdAt: createdPost.createdAt,
            contentPost: null,
            reviewPost: {
              coverImageUrl: createdPost.reviewPost.coverImageUrl,
              summary: createdPost.reviewPost.summary,
              overallRating: createdPost.reviewPost.overallRating,
              previewImageUrl: reviewPreviewImages[0] ?? null,
              previewImageUrls: reviewPreviewImages,
            },
          };
          updatePostInFeedCache(queryClient, (cachedPost) =>
            cachedPost.id === linkedContent.postId
              ? {
                  ...cachedPost,
                  linkedPosts: [
                    linkedReview,
                    ...(cachedPost.linkedPosts ?? []).filter(
                      (linkedPost) => linkedPost.id !== linkedReview.id,
                    ),
                  ],
                }
              : cachedPost,
          );
        }
        prependPostToFeedCache(queryClient, createdPost);
        // A linked content post may already be visible in the feed from the
        // first half of this publish flow. Refresh it now that the review and
        // its preview media exist on the shared experience.
        void queryClient.invalidateQueries({ queryKey: ["feed"] });
        void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
        void refreshUser();
        return {
          type: "post",
          postId: createdPost.id,
        };
      },
    });

    router.dismissTo("/(tabs)");
  }

  async function handleSaveDraft() {
    if (!user?.id || savingDraft) return;
    try {
      setSavingDraft(true);
      await saveReviewPostDraft(user.id, {
        step,
        draft,
        selectedMenuDish,
        pendingDish,
        editingDishId,
      });
      showToast(t("draftSaved"));
      router.back();
    } catch (error) {
      console.error("Could not save review draft", error);
      showToast(t("draftSaveError"), { kind: "error" });
    } finally {
      setSavingDraft(false);
    }
  }

  if (!draftHydrated || initializingRestaurant) {
    return <RestaurantStep selectedRestaurant={null} loading onSelect={() => undefined} onBack={() => router.back()} />;
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      {step === "RESTAURANT" && (
        <RestaurantStep
          selectedRestaurant={draft.restaurant}
          onSelect={(restaurant) => {
            if (!restaurant) return;
            updateDraft({ restaurant, linkedPostId: undefined });
            setStep("COVER");
          }}
          onBack={confirmExitReview}
        />
      )}

      {step === "COVER" && (
        <CoverStep
          draft={draft}
          onChange={updateDraft}
          onBack={() => {
            if (onLinkedFlowBack) {
              leaveLinkedReview();
              return;
            }
            if (initialLinkedPostId) {
              confirmExitReview();
              return;
            }
            updateDraft({ restaurant: null, items: [] });
            setSelectedMenuDish(null);
            setStep("RESTAURANT");
          }}
          onNext={() => setStep("DISHES")}
          onChooseParticipants={
            embeddedFlow ? undefined : () => setStep("PARTICIPANTS")
          }
          derivedCover={!!initialCoverImageUrl || !!initialCoverImageUri}
          compactLinkedFlow={embeddedFlow}
        />
      )}

      {step === "PARTICIPANTS" && (
        <ReviewParticipantsStep
          selected={draft.participants}
          onChange={(participants) => updateDraft({ participants })}
          onBack={() => setStep("COVER")}
        />
      )}

      {step === "DISHES" && (
        <DishesStep
          items={draft.items}
          pendingDish={pendingDish}
          onBack={() => setStep("COVER")}
          onAddCustomDish={() => {
            setEditingDishId(null);
            setSelectedMenuDish(null);
            setPendingDish(null);
            setStep("ADD_DISH_DETAILS");
          }}
          onAddMenuDish={() => {
            setEditingDishId(null);
            setStep("SELECT_MENU_DISH");
          }}
          onEditDish={(item) => {
            setEditingDishId(item.id);
            setSelectedMenuDish(
              item.menuItemId && item.menuItemName
                ? {
                    id: item.menuItemId,
                    name: item.menuItemName,
                    price: item.menuItemPrice,
                    imageUrl: item.fallbackImageUrl,
                  }
                : null,
            );
            setPendingDish({
              dishName: item.customDishName ?? item.menuItemName ?? "",
              price: item.customPrice ?? item.menuItemPrice ?? undefined,
              imageUri: item.imageUri,
              rating: item.rating,
              text: item.text ?? "",
            });
            setStep("ADD_DISH_DETAILS");
          }}
          onContinuePendingDish={() => setStep("ADD_DISH_DETAILS")}
          onDiscardPendingDish={() => {
            setEditingDishId(null);
            setSelectedMenuDish(null);
            setPendingDish(null);
          }}
          onRemoveDish={(id) =>
            setDraft((current) => ({
              ...current,
              items: current.items
                .filter((item) => item.id !== id)
                .map((item, index) => ({ ...item, order: index })),
            }))
          }
          onNext={() =>
            setStep(pendingDish ? "ADD_DISH_DETAILS" : "PREVIEW")
          }
        />
      )}

      {step === "SELECT_MENU_DISH" && (
        <SelectMenuDishStep
          restaurant={
            draft.restaurant?.source === "FINDEAT"
              ? draft.restaurant.restaurant
              : null
          }
          onBack={() => setStep("DISHES")}
          onSelect={(dish) => {
            setEditingDishId(null);
            setSelectedMenuDish(dish);
            setPendingDish(null);
            setStep("ADD_DISH_DETAILS");
          }}
          onAddCustom={() => {
            setEditingDishId(null);
            setSelectedMenuDish(null);
            setPendingDish(null);
            setStep("ADD_DISH_DETAILS");
          }}
        />
      )}

      {step === "ADD_DISH_DETAILS" && (
        <AddDishDetailsStep
          selectedDish={selectedMenuDish}
          initialDraft={pendingDish}
          onDraftChange={(update) =>
            setPendingDish((current) => ({
              dishName: selectedMenuDish?.name ?? "",
              price: selectedMenuDish?.price ?? undefined,
              text: "",
              ...current,
              ...update,
            }))
          }
          editing={!!editingDishId}
          onBack={() => {
            const hasEnteredDetails = !!pendingDish && (
              (!selectedMenuDish && !!pendingDish.dishName.trim()) ||
              (!selectedMenuDish && pendingDish.price !== undefined) ||
              !!pendingDish.imageUri ||
              pendingDish.rating !== undefined ||
              !!pendingDish.text.trim()
            );

            if (editingDishId || !hasEnteredDetails) {
              setPendingDish(null);
              setEditingDishId(null);
            }

            if (editingDishId || hasEnteredDetails || !selectedMenuDish) {
              if (!hasEnteredDetails) setSelectedMenuDish(null);
              setStep("DISHES");
              return;
            }

            setPendingDish(null);
            setStep("SELECT_MENU_DISH");
          }}
          onSave={(item) => {
            setDraft((current) => ({
              ...current,
              items: editingDishId
                ? current.items.map((currentItem) =>
                    currentItem.id === editingDishId
                      ? { ...currentItem, ...item }
                      : currentItem,
                  )
                : [
                    ...current.items,
                    {
                      ...item,
                      id: Date.now().toString(),
                      order: current.items.length,
                    },
                  ],
            }));

            setEditingDishId(null);
            setSelectedMenuDish(null);
            setPendingDish(null);
            setStep("DISHES");
          }}
        />
      )}

      {step === "PREVIEW" && (
        <PreviewStep
          draft={draft}
          overallRating={calculateOverallRating()}
          loading={loading}
          onBack={() => setStep("DISHES")}
          onPublish={publishReview}
          onVisibilityChange={changeVisibility}
          linkedContentPreview={linkedContentPreview}
          showVisibilitySelector={!embeddedFlow}
        />
      )}
    </View>
  );
}
