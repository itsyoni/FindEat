import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { TextInput } from "@/components/common";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import PostVisibilitySelector from "@/components/posts/PostVisibilitySelector";
import PostConnectionPicker from "@/components/posts/PostConnectionPicker";
import SaveDraftButton from "@/components/posts/SaveDraftButton";
import ReviewParticipantsStep from "@/components/review-creator/steps/ReviewParticipantsStep";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createCombinedUploadProgress,
  usePostUpload,
} from "@/contexts/PostUploadContext";
import { prependPostToFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { uploadImage, uploadVideo } from "@/lib/uploadImage";
import { cropPostImage } from "@/lib/cropPostImage";
import {
  clearPostDraft,
  type ContentMediaDraft,
  type ContentPostDraft,
  loadContentPostDraft,
  persistContentMediaUri,
  saveContentPostDraft,
} from "@/lib/postDrafts";
import type {
  PostVisibility,
  ReviewInviteeDraft,
  SelectedRestaurant,
} from "@findeat/types";
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FlashMode,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import {
  ArrowCounterClockwiseIcon,
  CameraIcon,
  ImagesSquareIcon,
  LightningIcon,
  LightningSlashIcon,
  LockIcon,
  SquareIcon,
  StorefrontIcon,
  PlusIcon,
  TrashIcon,
  UsersThreeIcon,
  XIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Linking,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import ContentVideo from "@/components/posts/content/ContentVideo";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

type Step = "CAMERA" | "DETAILS" | "RESTAURANT" | "PEOPLE";
type CameraZoomPreset = "0.5" | "1" | "2" | "5" | "CUSTOM";

const CAMERA_ZOOM_VALUES: Record<Exclude<CameraZoomPreset, "CUSTOM">, number> = {
  "0.5": 0,
  "1": 0,
  "2": 0.16,
  "5": 0.48,
};

export default function CreateContentScreen() {
  const { restaurantId, linkedPostId: initialLinkedPostId } =
    useLocalSearchParams<{ restaurantId?: string; linkedPostId?: string }>();
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const { showToast } = useToast();
  const { startPostUpload } = usePostUpload();
  const { width: screenWidth } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const recordingStartedAtRef = useRef(0);
  const recordingStopRequestedRef = useRef(false);
  const cameraZoomRef = useRef(0);
  const pinchStartZoomRef = useRef(0);
  const pinchStartDistanceRef = useRef(0);
  const cameraTouchStartRef = useRef<{
    x: number;
    y: number;
    startedAt: number;
  } | null>(null);
  const cameraPinchingRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>("CAMERA");
  const [media, setMedia] = useState<ContentMediaDraft[]>([]);
  const [availableDraft, setAvailableDraft] =
    useState<ContentPostDraft | null>(null);
  const [previewMediaIndex, setPreviewMediaIndex] = useState(0);
  const [addPhotoOptionsOpen, setAddPhotoOptionsOpen] = useState(false);
  const [appendingCameraPhoto, setAppendingCameraPhoto] = useState(false);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [linkedPostId, setLinkedPostId] = useState<string | undefined>(
    initialLinkedPostId,
  );
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<SelectedRestaurant | null>(null);
  const [taggedPeople, setTaggedPeople] = useState<ReviewInviteeDraft[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [cameraZoom, setCameraZoom] = useState(0);
  const [cameraZoomPreset, setCameraZoomPreset] =
    useState<CameraZoomPreset>("1");
  const [cameraAutofocus, setCameraAutofocus] = useState<"on" | "off">("off");
  const [focusPoint, setFocusPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [availableCameraLenses, setAvailableCameraLenses] = useState<string[]>(
    [],
  );
  const [selectedCameraLens, setSelectedCameraLens] = useState(
    "builtInWideAngleCamera",
  );
  const [captureMode, setCaptureMode] = useState<"picture" | "video">(
    "picture",
  );
  const [capturing, setCapturing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const draftSnapshotRef = useRef<Omit<ContentPostDraft, "updatedAt"> | null>(null);
  const publishCompletedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    void loadContentPostDraft(user.id)
      .then((savedDraft) => {
        if (cancelled) return;
        if (!savedDraft) {
          setDraftHydrated(true);
          return;
        }
        setAvailableDraft(savedDraft);
        setDraftHydrated(true);
      })
      .catch((error) => {
        console.error("Could not restore content draft", error);
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
      !media.length ||
      publishing ||
      publishCompletedRef.current
    ) {
      return;
    }
    const timer = setTimeout(() => {
      if (publishCompletedRef.current) return;
      void saveContentPostDraft(user.id, {
        step,
        imageUri: media[0].uri,
        media,
        description,
        visibility,
        linkedPostId,
        selectedRestaurant,
        taggedPeople,
      }).catch((error) => console.error("Could not save content draft", error));
    }, 500);
    return () => clearTimeout(timer);
  }, [
    description,
    draftHydrated,
    media,
    linkedPostId,
    publishing,
    selectedRestaurant,
    step,
    taggedPeople,
    user?.id,
    visibility,
  ]);

  useEffect(() => {
    draftSnapshotRef.current =
      draftHydrated &&
      media.length > 0 &&
      !publishing &&
      !publishCompletedRef.current
        ? {
            step,
            imageUri: media[0].uri,
            media,
            description,
            visibility,
            linkedPostId,
            selectedRestaurant,
            taggedPeople,
          }
        : null;
  }, [
    description,
    draftHydrated,
    media,
    linkedPostId,
    publishing,
    selectedRestaurant,
    step,
    taggedPeople,
    visibility,
  ]);

  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener("change", (state) => {
      const snapshot = draftSnapshotRef.current;
      if (
        state !== "active" &&
        snapshot &&
        !publishCompletedRef.current
      ) {
        void saveContentPostDraft(user.id, snapshot);
      }
    });
    return () => subscription.remove();
  }, [user?.id]);

  useEffect(() => {
    if (!recording) return;

    const updateTimer = () => {
      const elapsed = Math.min(
        10_000,
        Date.now() - recordingStartedAtRef.current,
      );
      setRecordingElapsedMs(elapsed);
      if (elapsed >= 10_000 && !recordingStopRequestedRef.current) {
        recordingStopRequestedRef.current = true;
        cameraRef.current?.stopRecording();
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [recording]);

  useEffect(
    () => () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!draftHydrated || !restaurantId || selectedRestaurant) return;
    let cancelled = false;

    void api.restaurants
      .get(restaurantId)
      .then((restaurant) => {
        if (!cancelled) {
          setSelectedRestaurant({ source: "FINDEAT", restaurant });
        }
      })
      .catch((error) => console.error("failed to preselect restaurant", error));

    return () => {
      cancelled = true;
    };
  }, [draftHydrated, restaurantId, selectedRestaurant]);

  const selectPhoto = useCallback((uri: string, width = 4, height = 5) => {
    setAvailableDraft(null);
    setMedia([
      {
        id: `${Date.now()}-camera`,
        type: "IMAGE",
        uri,
        width,
        height,
      },
    ]);
    setStep("DETAILS");
  }, []);

  const openMediaPicker = useCallback(() => {
    setAppendingCameraPhoto(false);
    setCameraReady(false);
    setStep("CAMERA");
  }, []);

  function continueDraft() {
    if (!availableDraft) return;
    setMedia(availableDraft.media);
    setDescription(availableDraft.description);
    setVisibility(availableDraft.visibility);
    setLinkedPostId(availableDraft.linkedPostId);
    setSelectedRestaurant(availableDraft.selectedRestaurant);
    setTaggedPeople(availableDraft.taggedPeople ?? []);
    setStep(
      availableDraft.step === "CAMERA" ? "DETAILS" : availableDraft.step,
    );
    setAvailableDraft(null);
  }

  async function discardAvailableDraft() {
    if (!user?.id) return;
    setAvailableDraft(null);
    try {
      await clearPostDraft(user.id, "content");
    } catch (error) {
      console.error("Could not discard content draft", error);
    }
  }

  function removePreviewMedia() {
    const remainingMedia = media.filter(
      (_, index) => index !== previewMediaIndex,
    );
    setMedia(remainingMedia);

    if (remainingMedia.length === 0) {
      setPreviewMediaIndex(0);
      openMediaPicker();
      return;
    }

    setPreviewMediaIndex(
      Math.min(previewMediaIndex, remainingMedia.length - 1),
    );
  }

  const takeCameraPhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;

    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });
      const croppedPhoto = await cropPostImage({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        aspect: "CONTENT",
        toolbarTitle: t("cropContentPhoto"),
      });
      const stableUri = userId
        ? await persistContentMediaUri(
            userId,
            croppedPhoto.uri,
            `camera-${Date.now()}`,
          )
        : croppedPhoto.uri;
      const photoUri = stableUri ?? croppedPhoto.uri;
      if (appendingCameraPhoto) {
        const nextMedia = [
          ...media,
          {
            id: `${Date.now()}-camera`,
            type: "IMAGE" as const,
            uri: photoUri,
            width: croppedPhoto.width,
            height: croppedPhoto.height,
          },
        ].slice(0, 10);
        setAvailableDraft(null);
        setMedia(nextMedia);
        setPreviewMediaIndex(nextMedia.length - 1);
        setAppendingCameraPhoto(false);
        setStep("DETAILS");
      } else {
        selectPhoto(photoUri, croppedPhoto.width, croppedPhoto.height);
      }
    } catch (error) {
      console.error("content camera capture failed", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    } finally {
      setCapturing(false);
    }
  }, [
    appendingCameraPhoto,
    cameraReady,
    capturing,
    media,
    selectPhoto,
    showToast,
    t,
    userId,
  ]);

  const toggleCameraRecording = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera || !cameraReady) return;
    if (recording) {
      recordingStopRequestedRef.current = true;
      camera.stopRecording();
      return;
    }
    if (capturing) return;

    try {
      setCapturing(true);
      setRecording(true);
      recordingStartedAtRef.current = Date.now();
      recordingStopRequestedRef.current = false;
      setRecordingElapsedMs(0);
      const video = await camera.recordAsync({ maxDuration: 10 });
      if (!video) return;
      const durationMs = Math.min(
        10_000,
        Math.max(1, Date.now() - recordingStartedAtRef.current),
      );
      setAvailableDraft(null);
      setMedia([
        {
          id: `${Date.now()}-camera-video`,
          type: "VIDEO",
          uri: video.uri,
          width: 4,
          height: 5,
          durationMs,
        },
      ]);
      setPreviewMediaIndex(0);
      setStep("DETAILS");
    } catch (error) {
      console.error("content camera recording failed", error);
      showToast(t("videoPickerErrorBody"), { kind: "error" });
    } finally {
      recordingStopRequestedRef.current = false;
      setRecording(false);
      setCapturing(false);
    }
  }, [cameraReady, capturing, recording, showToast, t]);

  const openGallery = useCallback(async (options?: { append?: boolean }) => {
    try {
      const existingPhotos =
        options?.append && media.every((item) => item.type === "IMAGE")
          ? media
          : [];
      const remaining = Math.max(1, 10 - existingPhotos.length);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: remaining,
        quality: 0.9,
      });
      if (result.canceled) {
        return;
      }
      const selected: ContentMediaDraft[] = [];
      for (const [index, asset] of result.assets
        .slice(0, remaining)
        .entries()) {
        const croppedAsset = await cropPostImage({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          aspect: "CONTENT",
          toolbarTitle: t("cropContentPhoto"),
        });
        selected.push({
          id: asset.assetId ?? `${Date.now()}-${index}`,
          type: "IMAGE",
          uri: croppedAsset.uri,
          width: croppedAsset.width,
          height: croppedAsset.height,
        });
      }
      setMedia([...existingPhotos, ...selected].slice(0, 10));
      setAvailableDraft(null);
      setAppendingCameraPhoto(false);
      setPreviewMediaIndex(0);
      setStep("DETAILS");
    } catch (error) {
      console.error("content image picker failed", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    }
  }, [media, showToast, t]);

  function takeAdditionalPhoto() {
    setAddPhotoOptionsOpen(false);
    setAppendingCameraPhoto(true);
    setCaptureMode("picture");
    setCameraReady(false);
    setStep("CAMERA");
  }

  function chooseAdditionalPhotos() {
    setAddPhotoOptionsOpen(false);
    requestAnimationFrame(() => {
      void openGallery({ append: true });
    });
  }

  const openVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        videoMaxDuration: 10,
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      // iOS reports video duration as a floating-point millisecond value,
      // while the API and database store whole milliseconds.
      const durationMs = Math.ceil(asset.duration ?? 0);
      if (!durationMs || durationMs > 10_000) {
        showToast(t("videoTooLongBody"), { kind: "error" });
        return;
      }
      setMedia([
        {
          id: asset.assetId ?? `${Date.now()}-video`,
          type: "VIDEO",
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          durationMs,
        },
      ]);
      setAvailableDraft(null);
      setPreviewMediaIndex(0);
      setStep("DETAILS");
    } catch (error) {
      console.error("content video picker failed", error);
      showToast(t("videoPickerErrorBody"), { kind: "error" });
    }
  }, [showToast, t]);

  async function getRestaurantId() {
    if (!selectedRestaurant) return undefined;
    if (selectedRestaurant.source === "FINDEAT") {
      return selectedRestaurant.restaurant.id;
    }

    const restaurant = await api.restaurants.fromGoogle({
      name: selectedRestaurant.name,
      address: selectedRestaurant.address,
      latitude: selectedRestaurant.latitude,
      longitude: selectedRestaurant.longitude,
      googlePlaceId: selectedRestaurant.googlePlaceId,
    });
    return restaurant.id;
  }

  function publish() {
    if (
      !media.length ||
      !selectedRestaurant ||
      publishing ||
      publishCompletedRef.current
    ) {
      return;
    }

    setPublishing(true);
    publishCompletedRef.current = true;
    draftSnapshotRef.current = null;

    const pendingMedia = [...media];
    const pendingDescription = description.trim();
    const pendingVisibility = visibility;
    const pendingLinkedPostId = linkedPostId;
    const pendingTaggedUserIds = taggedPeople.map((person) => person.id);
    const pendingUserId = user?.id;

    startPostUpload({
      kind: "content",
      run: async (reportProgress) => {
        reportProgress(0.04);
        const restaurantId = await getRestaurantId();
        if (!restaurantId) throw new Error(t("restaurantRequired"));

        const reportMediaProgress = createCombinedUploadProgress(
          pendingMedia.length,
          reportProgress,
        );
        const uploadedMedia = await Promise.all(
          pendingMedia.map(async (item, index) =>
            item.type === "IMAGE"
              ? {
                  type: "IMAGE" as const,
                  imageUrl: await uploadImage(
                    item.uri,
                    "post",
                    reportMediaProgress(index),
                  ),
                  width: Math.max(1, Math.round(item.width)),
                  height: Math.max(1, Math.round(item.height)),
                }
              : {
                  type: "VIDEO" as const,
                  videoUrl: await uploadVideo(
                    item.uri,
                    reportMediaProgress(index),
                  ),
                  width: Math.max(1, Math.round(item.width)),
                  height: Math.max(1, Math.round(item.height)),
                  durationMs: item.durationMs,
                },
          ),
        );
        reportProgress(0.94);
        const createdPost = await api.posts.createContent({
          restaurantId,
          description: pendingDescription,
          visibility: pendingVisibility,
          linkedPostId: pendingLinkedPostId,
          taggedUserIds: pendingTaggedUserIds,
          media: uploadedMedia,
        });
        reportProgress(0.98);

        if (pendingUserId) {
          try {
            await clearPostDraft(pendingUserId, "content");
          } catch (error) {
            console.error("Could not clear published content draft", error);
          }
        }
        prependPostToFeedCache(queryClient, createdPost);
        void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
        return {
          type: "post",
          postId: createdPost.id,
          afterOpen: pendingLinkedPostId
            ? undefined
            : () => {
                Alert.alert(
                  t("addReviewPromptTitle"),
                  t("addReviewPromptBody"),
                  [
                    { text: t("maybeLater"), style: "cancel" },
                    {
                      text: t("writeFullReview"),
                      onPress: () =>
                        router.push({
                          pathname: "/create/review",
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
    if (!user?.id || !media.length || savingDraft) return;
    try {
      setSavingDraft(true);
      await saveContentPostDraft(user.id, {
        step,
        imageUri: media[0].uri,
        media,
        description,
        visibility,
        linkedPostId,
        selectedRestaurant,
        taggedPeople,
      });
      showToast(t("draftSaved"));
      router.back();
    } catch (error) {
      console.error("Could not save content draft", error);
      showToast(t("draftSaveError"), { kind: "error" });
    } finally {
      setSavingDraft(false);
    }
  }

  const selectedPlace =
    selectedRestaurant?.source === "FINDEAT"
      ? selectedRestaurant.restaurant
      : selectedRestaurant;
  const selectedPlaceLogo =
    selectedRestaurant?.source === "FINDEAT"
      ? selectedRestaurant.restaurant.logoUrl
      : null;

  function changeVisibility(nextVisibility: PostVisibility) {
    if (nextVisibility === "PRIVATE" && taggedPeople.length > 0) {
      Alert.alert(t("privateTagPeopleTitle"), t("privateTagPeopleBody"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("makePrivate"),
          style: "destructive",
          onPress: () => {
            setVisibility(nextVisibility);
            setTaggedPeople([]);
          },
        },
      ]);
      return;
    }
    setVisibility(nextVisibility);
  }

  function cycleFlashMode() {
    setFlashMode((current) =>
      current === "off" ? "auto" : current === "auto" ? "on" : "off",
    );
  }

  const setCameraZoomValue = useCallback(
    (value: number, preset: CameraZoomPreset = "CUSTOM") => {
      const nextZoom = Math.max(0, Math.min(0.6, value));
      cameraZoomRef.current = nextZoom;
      setCameraZoom(nextZoom);
      setCameraZoomPreset(preset);
    },
    [],
  );

  const focusCamera = useCallback((x: number, y: number) => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    setFocusPoint({ x, y });
    setCameraAutofocus("on");
    focusTimerRef.current = setTimeout(() => {
      setCameraAutofocus("off");
      setFocusPoint(null);
      focusTimerRef.current = null;
    }, 900);
  }, []);

  function touchDistance(touches: NativeTouchEvent["touches"]) {
    if (touches.length < 2) return 0;
    const [first, second] = touches;
    return Math.hypot(
      second.locationX - first.locationX,
      second.locationY - first.locationY,
    );
  }

  function handleCameraTouchStart(
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) {
    const { touches } = event.nativeEvent;
    if (touches.length >= 2) {
      cameraPinchingRef.current = true;
      pinchStartDistanceRef.current = touchDistance(touches);
      pinchStartZoomRef.current = cameraZoomRef.current;
      cameraTouchStartRef.current = null;
      return;
    }

    const touch = touches[0];
    if (!touch) return;
    cameraPinchingRef.current = false;
    cameraTouchStartRef.current = {
      x: touch.locationX,
      y: touch.locationY,
      startedAt: Date.now(),
    };
  }

  function handleCameraTouchMove(
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) {
    const { touches } = event.nativeEvent;
    if (touches.length < 2) return;

    if (!cameraPinchingRef.current) {
      cameraPinchingRef.current = true;
      pinchStartDistanceRef.current = touchDistance(touches);
      pinchStartZoomRef.current = cameraZoomRef.current;
    }

    const startDistance = pinchStartDistanceRef.current;
    if (startDistance <= 0) return;
    const scale = touchDistance(touches) / startDistance;
    setCameraZoomValue(
      pinchStartZoomRef.current + Math.log2(Math.max(scale, 0.1)) * 0.2,
    );
  }

  function handleCameraTouchEnd(
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) {
    if (cameraPinchingRef.current) {
      if (event.nativeEvent.touches.length === 0) {
        cameraPinchingRef.current = false;
        pinchStartDistanceRef.current = 0;
      }
      return;
    }

    const started = cameraTouchStartRef.current;
    const ended = event.nativeEvent.changedTouches[0];
    cameraTouchStartRef.current = null;
    if (!started || !ended || Date.now() - started.startedAt > 300) return;
    if (Math.hypot(ended.locationX - started.x, ended.locationY - started.y) > 12) {
      return;
    }
    focusCamera(ended.locationX, ended.locationY);
  }

  const ultraWideLens = availableCameraLenses.find((lens) =>
    lens.toLowerCase().includes("ultrawide"),
  );
  function selectCameraZoom(preset: Exclude<CameraZoomPreset, "CUSTOM">) {
    if (preset === "0.5" && ultraWideLens) {
      setSelectedCameraLens(ultraWideLens);
    } else {
      setSelectedCameraLens("builtInWideAngleCamera");
    }
    setCameraZoomValue(CAMERA_ZOOM_VALUES[preset], preset);
  }

  function flipCamera() {
    setCameraReady(false);
    setCameraFacing((current) => (current === "back" ? "front" : "back"));
    setFlashMode("off");
    setSelectedCameraLens("builtInWideAngleCamera");
    setCameraZoomValue(0, "1");
    setAvailableCameraLenses([]);
  }

  if (!draftHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  if (step === "CAMERA") {
    const canAskForCamera = cameraPermission?.canAskAgain !== false;

    return (
      <View className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        {cameraPermission?.granted ? (
          <View className="flex-1">
            <View
              style={{ position: "absolute", inset: 0 }}
              onTouchStart={handleCameraTouchStart}
              onTouchMove={handleCameraTouchMove}
              onTouchEnd={handleCameraTouchEnd}
              onTouchCancel={() => {
                cameraPinchingRef.current = false;
                cameraTouchStartRef.current = null;
                pinchStartDistanceRef.current = 0;
              }}
            >
              <CameraView
                key={`${cameraFacing}-${captureMode}`}
                ref={cameraRef}
                style={{ position: "absolute", inset: 0 }}
                facing={cameraFacing}
                flash={flashMode}
                mode={captureMode}
                zoom={cameraZoom}
                autofocus={cameraAutofocus}
                selectedLens={
                  cameraFacing === "back" ? selectedCameraLens : undefined
                }
                onAvailableLensesChanged={({ lenses }) =>
                  setAvailableCameraLenses(lenses)
                }
                onCameraReady={() => setCameraReady(true)}
              />
              {focusPoint ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: focusPoint.x - 29,
                    top: focusPoint.y - 29,
                    width: 58,
                    height: 58,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: "#F7D786",
                    shadowColor: "#000",
                    shadowOpacity: 0.35,
                    shadowRadius: 5,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                />
              ) : null}
            </View>

            <SafeAreaView
              pointerEvents="box-none"
              style={{ flex: 1, justifyContent: "space-between" }}
            >
              <View className="px-4 pt-2">
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity
                    disabled={recording}
                    onPress={() => {
                      setAppendingCameraPhoto(false);
                      if (media.length) setStep("DETAILS");
                      else router.back();
                    }}
                    className={`h-11 w-11 items-center justify-center rounded-full bg-black/50 ${
                      recording ? "opacity-40" : ""
                    }`}
                  >
                    <XIcon size={23} color="#FFF" weight="bold" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={recording}
                    onPress={cycleFlashMode}
                    className={`h-11 min-w-11 flex-row items-center justify-center rounded-full bg-black/50 px-3 ${
                      recording ? "opacity-40" : ""
                    }`}
                  >
                    {flashMode === "off" ? (
                      <LightningSlashIcon size={21} color="#FFF" weight="bold" />
                    ) : (
                      <LightningIcon size={21} color="#F7D786" weight="fill" />
                    )}
                    {flashMode === "auto" ? (
                      <Text className="ml-1 text-xs font-bold text-white">A</Text>
                    ) : null}
                  </TouchableOpacity>
                </View>

                {availableDraft ? (
                  <View className="mt-3 flex-row items-center self-center overflow-hidden rounded-full bg-black/65 pl-4">
                    <TouchableOpacity onPress={continueDraft} className="py-2.5 pr-3">
                      <Text className="text-sm font-bold text-white">
                        {t("continueDraft")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void discardAvailableDraft()}
                      className="h-10 w-10 items-center justify-center border-l border-white/15"
                    >
                      <XIcon size={15} color="#FFF" weight="bold" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {recording ? (
                  <View className="mt-3 self-center overflow-hidden rounded-full bg-black/70 px-4 py-2">
                    <View className="flex-row items-center justify-center">
                      <View className="mr-2 h-2.5 w-2.5 rounded-full bg-red-500" />
                      <Text className="font-bold tabular-nums text-white">
                        {`0:${Math.floor(recordingElapsedMs / 1000)
                          .toString()
                          .padStart(2, "0")} / 0:10`}
                      </Text>
                    </View>
                    <View className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-white/25">
                      <View
                        className="h-full rounded-full bg-red-500"
                        style={{
                          width: `${Math.min(100, recordingElapsedMs / 100)}%`,
                        }}
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              <View className="pb-8">
                {cameraFacing === "back" ? (
                  <View className="mb-3 flex-row justify-center gap-2">
                    {(["0.5", "1", "2", "5"] as const)
                      .filter((preset) => preset !== "0.5" || !!ultraWideLens)
                      .map((preset) => {
                        const active = cameraZoomPreset === preset;
                        const label = `${preset}×`;
                        return (
                          <TouchableOpacity
                            key={preset}
                            disabled={recording}
                            accessibilityRole="button"
                            accessibilityLabel={t("cameraZoom", {
                              value: label,
                            })}
                            onPress={() => selectCameraZoom(preset)}
                            className={`h-10 min-w-10 items-center justify-center rounded-full px-2.5 ${
                              active
                                ? "bg-white"
                                : "border border-white/20 bg-black/55"
                            } ${recording ? "opacity-40" : ""}`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                active ? "text-black" : "text-white"
                              }`}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                ) : null}
                <View className="mb-5 flex-row justify-center gap-8">
                  <TouchableOpacity
                    disabled={recording}
                    onPress={() => {
                      setCameraReady(false);
                      setCaptureMode("picture");
                    }}
                    className="items-center py-2"
                  >
                    <Text
                      className={`text-sm font-bold ${
                        captureMode === "picture"
                          ? "text-[#F7D786]"
                          : "text-white/65"
                      }`}
                    >
                      {t("photoMode")}
                    </Text>
                    {captureMode === "picture" ? (
                      <View className="mt-1 h-0.5 w-6 rounded-full bg-[#F7D786]" />
                    ) : null}
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={recording}
                    onPress={() => {
                      setCameraReady(false);
                      setCaptureMode("video");
                    }}
                    className="items-center py-2"
                  >
                    <Text
                      className={`text-sm font-bold ${
                        captureMode === "video"
                          ? "text-[#F7D786]"
                          : "text-white/65"
                      }`}
                    >
                      {t("videoMode")}
                    </Text>
                    {captureMode === "video" ? (
                      <View className="mt-1 h-0.5 w-6 rounded-full bg-[#F7D786]" />
                    ) : null}
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center justify-between px-7">
                  <TouchableOpacity
                    disabled={recording}
                    accessibilityRole="button"
                    accessibilityLabel={
                      captureMode === "picture"
                        ? t("choosePhotos")
                        : t("chooseShortVideo")
                    }
                    onPress={() =>
                      void (captureMode === "picture"
                        ? openGallery()
                        : openVideo())
                    }
                    className={`h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-black/55 ${
                      recording ? "opacity-40" : ""
                    }`}
                  >
                    <ImagesSquareIcon size={26} color="#FFF" weight="fill" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={!cameraReady || (capturing && !recording)}
                    onPress={() =>
                      void (captureMode === "picture"
                        ? takeCameraPhoto()
                        : toggleCameraRecording())
                    }
                    className={`h-20 w-20 items-center justify-center rounded-full border-4 border-white ${
                      !cameraReady ? "opacity-50" : ""
                    }`}
                  >
                    {recording ? (
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-500">
                        <SquareIcon size={18} color="#FFF" weight="fill" />
                      </View>
                    ) : (
                      <View
                        className={`h-16 w-16 rounded-full ${
                          captureMode === "video" ? "bg-red-500" : "bg-white"
                        }`}
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={recording}
                    onPress={flipCamera}
                    className="h-14 w-14 items-center justify-center rounded-full bg-black/55"
                  >
                    <ArrowCounterClockwiseIcon
                      size={25}
                      color="#FFF"
                      weight="bold"
                    />
                  </TouchableOpacity>
                </View>

                {captureMode === "video" ? (
                  <Text className="mt-4 text-center text-xs font-semibold text-white/75">
                    {t("videoCaptureLimit")}
                  </Text>
                ) : null}
              </View>
            </SafeAreaView>
          </View>
        ) : cameraPermission === null ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#FFF" size="large" />
          </View>
        ) : (
          <SafeAreaView className="flex-1 px-5 pb-5">
            <TouchableOpacity
              onPress={() => {
                setAppendingCameraPhoto(false);
                if (media.length) setStep("DETAILS");
                else router.back();
              }}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <XIcon size={23} color="#FFF" weight="bold" />
            </TouchableOpacity>

            <View className="flex-1 items-center justify-center px-5">
              <View className="h-24 w-24 items-center justify-center rounded-[28px] bg-[#F7D786]">
                <CameraIcon size={44} color="#171717" weight="fill" />
              </View>
              <Text className="mt-6 text-center text-2xl font-bold text-white">
                {t(
                  canAskForCamera
                    ? "cameraPermissionTitle"
                    : "cameraPermissionDeniedTitle",
                )}
              </Text>
              <Text className="mt-3 text-center leading-6 text-gray-400">
                {t(
                  canAskForCamera
                    ? "cameraPermissionBody"
                    : "cameraPermissionDeniedBody",
                )}
              </Text>
              <View className="mt-5 flex-row items-center rounded-2xl bg-white/5 px-4 py-3">
                <LockIcon size={17} color="#A3A3A3" weight="fill" />
                <Text className="ml-2 flex-1 text-xs leading-4 text-gray-400">
                  {t("cameraPrivacy")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() =>
                void (canAskForCamera
                  ? requestCameraPermission()
                  : Linking.openSettings())
              }
              className="rounded-2xl bg-white py-4"
            >
              <Text className="text-center font-bold text-black">
                {t(canAskForCamera ? "allowCamera" : "openSettings")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                void openGallery(
                  appendingCameraPhoto ? { append: true } : undefined,
                )
              }
              className="mt-3 flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4"
            >
              <ImagesSquareIcon size={21} color="#F7D786" weight="fill" />
              <Text className="ml-2 font-bold text-white">
                {t("chooseFromGallery")}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>
    );
  }

  if (step === "RESTAURANT") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullPageRestaurantPicker
          selectedRestaurant={selectedRestaurant}
          onSelect={(restaurant) => {
            const previousId =
              selectedRestaurant?.source === "FINDEAT"
                ? selectedRestaurant.restaurant.id
                : undefined;
            const nextId =
              restaurant?.source === "FINDEAT"
                ? restaurant.restaurant.id
                : undefined;
            if (previousId !== nextId) setLinkedPostId(undefined);
            setSelectedRestaurant(restaurant);
            setStep("DETAILS");
          }}
          onBack={() => setStep("DETAILS")}
          headerRight={
            <SaveDraftButton
              saving={savingDraft}
              onPress={() => void handleSaveDraft()}
            />
          }
        />
      </>
    );
  }

  if (step === "PEOPLE") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewParticipantsStep
          mode="tag"
          selected={taggedPeople}
          onChange={setTaggedPeople}
          onBack={() => setStep("DETAILS")}
        />
      </>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-4 py-2">
          <TouchableOpacity
            disabled={savingDraft}
            onPress={() => void handleSaveDraft()}
            className="h-11 w-11 items-center justify-center rounded-full"
          >
            <DirectionalIcon direction="back" size={25} color={isDark ? "#FFF" : "#171717"} weight="bold" />
          </TouchableOpacity>
          <Text className="ml-2 flex-1 text-xl font-bold text-black dark:text-white">
            {t("newPost")}
          </Text>
          <SaveDraftButton
            saving={savingDraft}
            onPress={() => void handleSaveDraft()}
          />
          <TouchableOpacity
            disabled={!selectedRestaurant || publishing}
            onPress={() => void publish()}
            className="min-w-14 items-end px-1 py-2"
          >
            {publishing ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text
                className={`font-bold ${
                  selectedRestaurant
                    ? "text-black dark:text-white"
                    : "text-gray-300 dark:text-gray-700"
                }`}
              >
                {t("post")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAwareFormScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          bottomOffset={28}
        >
          {media.length > 0 && (
            <View className="mb-2">
              <View
                style={{ width: screenWidth, aspectRatio: 4 / 5 }}
                className="overflow-hidden bg-black"
              >
                <FlatList
                  horizontal
                  pagingEnabled
                  data={media}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) =>
                    setPreviewMediaIndex(
                      Math.round(event.nativeEvent.contentOffset.x / screenWidth),
                    )
                  }
                  renderItem={({ item }) => (
                    <View style={{ width: screenWidth, height: "100%" }}>
                      {item.type === "IMAGE" ? (
                        <ProgressiveImage
                          source={{ uri: item.uri }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : (
                        <ContentVideo
                          uri={item.uri}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      )}
                    </View>
                  )}
                />

                {media.length > 1 ? (
                  <View
                    pointerEvents="none"
                    className="absolute right-4 top-4 rounded-full bg-black/65 px-2.5 py-1"
                  >
                    <Text className="text-xs font-bold text-white">
                      {previewMediaIndex + 1}/{media.length}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={removePreviewMedia}
                  className="absolute left-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/65"
                >
                  <TrashIcon size={18} color="white" weight="bold" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between px-4 py-3">
                <TouchableOpacity
                  onPress={openMediaPicker}
                  className="flex-row items-center rounded-full bg-gray-100 px-4 py-2.5 dark:bg-gray-900"
                >
                  <ArrowCounterClockwiseIcon
                    size={17}
                    color={isDark ? "#FFF" : "#171717"}
                  />
                  <Text className="ml-2 text-sm font-bold text-black dark:text-white">
                    {t("changeMedia")}
                  </Text>
                </TouchableOpacity>

                {media[0].type === "IMAGE" && media.length < 10 ? (
                  <TouchableOpacity
                    onPress={() => setAddPhotoOptionsOpen(true)}
                    className="flex-row items-center rounded-full bg-gray-100 px-4 py-2.5 dark:bg-gray-900"
                  >
                    <PlusIcon
                      size={17}
                      color={isDark ? "#FFF" : "#171717"}
                      weight="bold"
                    />
                    <Text className="ml-1.5 text-sm font-bold text-black dark:text-white">
                      {t("addPhotos")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          <View className="px-5">
            <TouchableOpacity
              onPress={() => setStep("RESTAURANT")}
              className="mt-2 flex-row items-center border-b border-gray-100 py-4 dark:border-gray-800"
            >
              {selectedPlace ? (
                <Avatar
                  uri={selectedPlaceLogo}
                  username={selectedPlace.name}
                  size={46}
                  fallbackType="restaurant"
                />
              ) : (
                <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                  <StorefrontIcon size={22} color="#9CA3AF" weight="fill" />
                </View>
              )}
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="font-bold text-black dark:text-white">
                    {selectedPlace?.name ?? t("addRestaurant")}
                  </Text>
                  {selectedPlace ? (
                    <RestaurantBadge
                      size={14}
                      claimed={
                        selectedRestaurant?.source === "FINDEAT" &&
                        selectedRestaurant.restaurant.status === "CLAIMED"
                      }
                    />
                  ) : null}
                </View>
                <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
                  {selectedPlace
                    ? selectedPlace.address ?? selectedPlace.city
                    : t("restaurantRequired")}
                </Text>
              </View>
              <DirectionalIcon direction="forward" size={20} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>

            <View className="mt-5">
              <Text className="mb-2 text-base font-bold text-black dark:text-white">
                {t("descriptionOptional")}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t("descriptionPlaceholder")}
                multiline
                maxLength={500}
                className="min-h-28 bg-gray-50 dark:bg-gray-900"
              />
            </View>

            <TouchableOpacity
              onPress={() => setStep("PEOPLE")}
              className="mt-2 flex-row items-center border-b border-gray-100 py-4 dark:border-gray-800"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand/15">
                <UsersThreeIcon size={23} color="#C89C25" weight="fill" />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="font-bold text-black dark:text-white">
                  {t("tagPeopleRowTitle")}
                </Text>
                <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
                  {taggedPeople.length > 0
                    ? t("tagPeopleInPost", { count: taggedPeople.length })
                    : t("tagPeopleRowHint")}
                </Text>
              </View>
              {taggedPeople.slice(0, 3).map((person, index) => (
                <View
                  key={person.id}
                  style={{ marginLeft: index === 0 ? 0 : -10 }}
                >
                  <Avatar
                    uri={person.avatarUrl}
                    username={person.username}
                    size={32}
                  />
                </View>
              ))}
              <View className="ml-2">
                <DirectionalIcon
                  direction="forward"
                  size={20}
                  color="#9CA3AF"
                  weight="bold"
                />
              </View>
            </TouchableOpacity>

            <PostConnectionPicker
              restaurantId={
                selectedRestaurant?.source === "FINDEAT"
                  ? selectedRestaurant.restaurant.id
                  : undefined
              }
              candidateType="REVIEW"
              selectedPostId={linkedPostId}
              onSelect={setLinkedPostId}
            />

            <PostVisibilitySelector
              value={visibility}
              onChange={changeVisibility}
            />
          </View>
        </KeyboardAwareFormScrollView>
      </SafeAreaView>
      <AppBottomSheet
        open={addPhotoOptionsOpen}
        onClose={() => setAddPhotoOptionsOpen(false)}
        snapPoints={["32%"]}
      >
        <BottomSheetView className="flex-1 px-5 pb-7 pt-1">
          <Text className="mb-4 text-center text-lg font-bold text-black dark:text-white">
            {t("addPhotosTitle")}
          </Text>
          <TouchableOpacity
            onPress={takeAdditionalPhoto}
            className="mb-2 flex-row items-center rounded-2xl bg-gray-50 px-4 py-3.5 dark:bg-gray-900"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F7D786]">
              <CameraIcon size={21} color="#171717" weight="fill" />
            </View>
            <Text className="ml-3 font-bold text-black dark:text-white">
              {t("takeAnotherPhoto")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={chooseAdditionalPhotos}
            className="flex-row items-center rounded-2xl bg-gray-50 px-4 py-3.5 dark:bg-gray-900"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F7D786]">
              <ImagesSquareIcon size={21} color="#171717" weight="fill" />
            </View>
            <Text className="ml-3 font-bold text-black dark:text-white">
              {t("chooseFromGallery")}
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </AppBottomSheet>
    </View>
  );
}
