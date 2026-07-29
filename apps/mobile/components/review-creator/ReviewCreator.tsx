import { AppAlert as Alert } from "@/lib/appAlert";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import { Dish } from "@findeat/types";
import {
  CreateReviewDraft,
  CreateReviewStep,
  ReviewDishFormDraft,
} from "@findeat/types/review";
import type { PostVisibility } from "@findeat/types";
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
  updateRestaurantStatusInFeedCache,
} from "@/hooks/useFeed";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
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

const initialDraft: CreateReviewDraft = {
  visibility: "PUBLIC",
  restaurant: null,
  summary: "",
  items: [],
  participants: [],
};

export default function ReviewCreator({
  initialRestaurantId,
  initialLinkedPostId,
}: {
  initialRestaurantId?: string;
  initialLinkedPostId?: string;
}) {
  const queryClient = useQueryClient();
  const { refreshUser, user } = useAuth();
  const { t } = useTranslation("create");
  const { showToast } = useToast();
  const { startPostUpload } = usePostUpload();
  const [step, setStep] = useState<CreateReviewStep>("RESTAURANT");
  const [draft, setDraft] = useState<CreateReviewDraft>(initialDraft);
  const [loading, setLoading] = useState(false);
  const [selectedMenuDish, setSelectedMenuDish] = useState<Dish | null>(null);
  const [pendingDish, setPendingDish] = useState<ReviewDishFormDraft | null>(null);
  const [initializingRestaurant, setInitializingRestaurant] = useState(
    !!initialRestaurantId,
  );
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [resumedDraft, setResumedDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const draftSnapshotRef = useRef<Omit<ReviewPostDraft, "updatedAt"> | null>(null);
  const publishCompletedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
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
              });
              setSelectedMenuDish(savedDraft.selectedMenuDish ?? null);
              setPendingDish(savedDraft.pendingDish ?? null);
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
  }, [t, user?.id]);

  useEffect(() => {
    if (
      !draftHydrated ||
      !user?.id ||
      loading ||
      publishCompletedRef.current
    ) {
      return;
    }
    const hasDraftContent =
      draft.restaurant !== null ||
      !!draft.coverImageUri ||
      !!draft.summary.trim() ||
      draft.items.length > 0 ||
      draft.participants.length > 0 ||
      draft.overallRating !== undefined ||
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
      }).catch((error) => console.error("Could not save review draft", error));
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, draftHydrated, loading, pendingDish, selectedMenuDish, step, user?.id]);

  useEffect(() => {
    const hasDraftContent =
      draft.restaurant !== null ||
      !!draft.coverImageUri ||
      !!draft.summary.trim() ||
      draft.items.length > 0 ||
      draft.participants.length > 0 ||
      draft.overallRating !== undefined ||
      draft.atmosphereRating !== undefined ||
      draft.serviceRating !== undefined ||
      draft.valueRating !== undefined;
    draftSnapshotRef.current =
      draftHydrated &&
      hasDraftContent &&
      !loading &&
      !publishCompletedRef.current
        ? { step, draft, selectedMenuDish, pendingDish }
        : null;
  }, [draft, draftHydrated, loading, pendingDish, selectedMenuDish, step]);

  useEffect(() => {
    if (!user?.id) return;
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
  }, [user?.id]);

  useEffect(() => {
    if (!draftHydrated || !initialRestaurantId || resumedDraft) return;
    let cancelled = false;

    void api.restaurants
      .get(initialRestaurantId)
      .then((restaurant) => {
        if (cancelled) return;
        setDraft((current) => ({
          ...current,
          restaurant: { source: "FINDEAT", restaurant },
          linkedPostId: initialLinkedPostId,
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
  }, [draftHydrated, initialLinkedPostId, initialRestaurantId, resumedDraft]);

  function updateDraft(update: Partial<CreateReviewDraft>) {
    setDraft((current) => ({
      ...current,
      ...update,
    }));
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
    if (typeof draft.overallRating === "number") {
      return draft.overallRating;
    }

    const ratings = [
      draft.atmosphereRating,
      draft.serviceRating,
      draft.valueRating,
      ...draft.items.map((item) => item.rating),
    ].filter((rating): rating is number => typeof rating === "number");

    if (ratings.length === 0) return undefined;

    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
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
    const pendingOverallRating = calculateOverallRating();
    const pendingUserId = user?.id;
    const uploadCount =
      (pendingDraft.coverImageUri ? 1 : 0) +
      pendingDraft.items.filter((item) => !!item.imageUri).length;

    startPostUpload({
      kind: "review",
      run: async (reportProgress) => {
        reportProgress(0.04);
        const restaurantId = await getRestaurantId();
        if (!restaurantId) throw new Error(t("missingRestaurantBody"));

        const reportMediaProgress = createCombinedUploadProgress(
          uploadCount,
          reportProgress,
        );
        let uploadIndex = 0;
        const coverImageUrl = pendingDraft.coverImageUri
          ? await uploadImage(
              pendingDraft.coverImageUri,
              "review",
              reportMediaProgress(uploadIndex++),
            )
          : undefined;

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
              text: item.text.trim(),
              order: item.order,
            };
          }),
        );
        if (uploadCount === 0) reportProgress(0.9);
        reportProgress(0.94);
        const createdPost = await api.posts.createReview({
          restaurantId,
          visibility: pendingDraft.visibility,
          coverImageUrl,
          overallRating: pendingOverallRating,
          summary: pendingDraft.summary.trim() || undefined,
          atmosphereRating: pendingDraft.atmosphereRating,
          serviceRating: pendingDraft.serviceRating,
          valueRating: pendingDraft.valueRating,
          linkedPostId: pendingDraft.linkedPostId,
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
        prependPostToFeedCache(queryClient, createdPost);
        void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
        void refreshUser();
        return {
          type: "post",
          postId: createdPost.id,
          afterOpen: pendingDraft.linkedPostId
            ? undefined
            : () => {
                Alert.alert(
                  t("addContentPromptTitle"),
                  t("addContentPromptBody"),
                  [
                    { text: t("done"), style: "cancel" },
                    {
                      text: t("addQuickPost"),
                      onPress: () =>
                        router.push({
                          pathname: "/create/content",
                          params: {
                            restaurantId,
                            linkedPostId: createdPost.id,
                          },
                        }),
                    },
                  ],
                );
              },
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
    <View className="flex-1 bg-canvas dark:bg-black">
      {step === "RESTAURANT" && (
        <RestaurantStep
          selectedRestaurant={draft.restaurant}
          onSelect={(restaurant) => {
            if (!restaurant) return;
            updateDraft({ restaurant, linkedPostId: undefined });
            setStep("COVER");
          }}
          onBack={() => router.back()}
          onSaveDraft={() => void handleSaveDraft()}
          savingDraft={savingDraft}
        />
      )}

      {step === "COVER" && (
        <CoverStep
          draft={draft}
          onChange={updateDraft}
          onBack={() => {
            updateDraft({ restaurant: null, items: [] });
            setSelectedMenuDish(null);
            setStep("RESTAURANT");
          }}
          onNext={() => setStep("DISHES")}
          onChooseParticipants={() => setStep("PARTICIPANTS")}
          onSaveDraft={() => void handleSaveDraft()}
          savingDraft={savingDraft}
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
          onBack={() => setStep("COVER")}
          onAddCustomDish={() => {
            setSelectedMenuDish(null);
            setPendingDish(null);
            setStep("ADD_DISH_DETAILS");
          }}
          onAddMenuDish={() => setStep("SELECT_MENU_DISH")}
          onRemoveDish={(id) =>
            setDraft((current) => ({
              ...current,
              items: current.items
                .filter((item) => item.id !== id)
                .map((item, index) => ({ ...item, order: index })),
            }))
          }
          onNext={() => setStep("PREVIEW")}
          onSaveDraft={() => void handleSaveDraft()}
          savingDraft={savingDraft}
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
            setSelectedMenuDish(dish);
            setPendingDish(null);
            setStep("ADD_DISH_DETAILS");
          }}
          onAddCustom={() => {
            setSelectedMenuDish(null);
            setPendingDish(null);
            setStep("ADD_DISH_DETAILS");
          }}
          onSaveDraft={() => void handleSaveDraft()}
          savingDraft={savingDraft}
        />
      )}

      {step === "ADD_DISH_DETAILS" && (
        <AddDishDetailsStep
          selectedDish={selectedMenuDish}
          initialDraft={pendingDish}
          onDraftChange={setPendingDish}
          onSaveDraft={() => void handleSaveDraft()}
          savingDraft={savingDraft}
          onBack={() =>
            selectedMenuDish
              ? setStep("SELECT_MENU_DISH")
              : setStep("DISHES")
          }
          onSave={(item) => {
            setDraft((current) => ({
              ...current,
              items: [
                ...current.items,
                {
                  ...item,
                  id: Date.now().toString(),
                  order: current.items.length,
                },
              ],
            }));

            setSelectedMenuDish(null);
            setPendingDish(null);
            setStep("DISHES");
          }}
        />
      )}

      {step === "PREVIEW" && (
        <PreviewStep
          draft={draft}
          loading={loading}
          onBack={() => setStep("DISHES")}
          onPublish={publishReview}
          onVisibilityChange={changeVisibility}
          onLinkedPostChange={(linkedPostId) => updateDraft({ linkedPostId })}
          onSaveDraft={() => void handleSaveDraft()}
          savingDraft={savingDraft}
        />
      )}
    </View>
  );
}
