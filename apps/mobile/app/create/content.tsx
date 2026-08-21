import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { TextInput } from "@/components/common";
import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import PostVisibilitySelector from "@/components/posts/PostVisibilitySelector";
import PostConnectionPicker from "@/components/posts/PostConnectionPicker";
import ReviewCreator, {
  type ReviewCreatorSnapshot,
} from "@/components/review-creator/ReviewCreator";
import ReviewParticipantsStep from "@/components/review-creator/steps/ReviewParticipantsStep";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import ContentMediaEditor from "@/components/create/ContentMediaEditor";
import SoundPickerModal from "@/components/sounds/SoundPickerModal";
import SoundPlayback from "@/components/sounds/SoundPlayback";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createCombinedUploadProgress,
  usePostUpload,
} from "@/contexts/PostUploadContext";
import { prependPostToFeedCache } from "@/hooks/useFeed";
import { useGallerySaveFeedback } from "@/hooks/useGallerySaveFeedback";
import { api } from "@/lib/api";
import { uploadImage, uploadVideo } from "@/lib/uploadImage";
import { createVideoCover } from "@/lib/createVideoCover";
import { getVideoDurationMs } from "@/lib/videoDuration";
import { cropPostImage } from "@/lib/cropPostImage";
import { normalizeFrontCameraPhoto } from "@/lib/normalizeCameraPhoto";
import {
  MediaLibraryPermissionError,
  saveImageToGallery,
} from "@/lib/saveImageToGallery";
import type { PhotoFilterId } from "@/lib/photoFilters";
import {
  coordinateDistanceKm,
  coordinatesFromExif,
  estimateMediaLocation,
} from "@/lib/imageLocation";
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
  SoundSelection,
} from "@findeat/types";
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FlashMode,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  ArrowCounterClockwiseIcon,
  CameraIcon,
  ImagesSquareIcon,
  LightningIcon,
  LightningSlashIcon,
  LockIcon,
  SquareIcon,
  StorefrontIcon,
  NotePencilIcon,
  TrashIcon,
  UsersThreeIcon,
  XIcon,
  MusicNoteIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Linking,
  ScrollView,
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
import type { KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import ContextualCoachMark from "@/components/onboarding/ContextualCoachMark";

type Step =
  | "CAMERA"
  | "EDIT_MEDIA"
  | "DETAILS"
  | "RESTAURANT"
  | "PEOPLE"
  | "READY"
  | "REVIEW";
type CameraZoomPreset = "0.5" | "1" | "CUSTOM";

const CAMERA_ZOOM_VALUES: Record<Exclude<CameraZoomPreset, "CUSTOM">, number> = {
  "0.5": 0,
  "1": 0,
};

function preferredPictureSize(sizes: string[]) {
  const parsed = sizes
    .map((size) => {
      const match = size.match(/^(\d+)x(\d+)$/i);
      if (!match) return null;
      const width = Number(match[1]);
      const height = Number(match[2]);
      return {
        size,
        area: width * height,
        longEdge: Math.max(width, height),
        aspectRatio: Math.max(width, height) / Math.min(width, height),
      };
    })
    .filter((size): size is NonNullable<typeof size> => !!size);
  if (!parsed.length) return undefined;

  const useful = parsed.filter((size) => size.area >= 1_500_000);
  const candidates = useful.length ? useful : parsed;
  return [...candidates].sort((first, second) => {
    const firstScore =
      Math.abs(first.longEdge - 2048) +
      Math.abs(first.aspectRatio - 4 / 3) * 900;
    const secondScore =
      Math.abs(second.longEdge - 2048) +
      Math.abs(second.aspectRatio - 4 / 3) * 900;
    return firstScore - secondScore;
  })[0]?.size;
}

function firstMediaLocation(media: ContentMediaDraft[]) {
  return estimateMediaLocation(
    media.map((item) =>
      typeof item.locationLatitude === "number" &&
      typeof item.locationLongitude === "number"
        ? {
            latitude: item.locationLatitude,
            longitude: item.locationLongitude,
          }
        : null,
    ),
  );
}

export default function CreateContentScreen() {
  const { restaurantId, linkedPostId: initialLinkedPostId, soundId: initialSoundId } =
    useLocalSearchParams<{ restaurantId?: string; linkedPostId?: string; soundId?: string }>();
  const { t } = useTranslation("create");
  const { t: tSound } = useTranslation("sound");
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const { showToast } = useToast();
  const { startPostUpload } = usePostUpload();
  const { width: screenWidth } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const mediaListRef = useRef<FlatList<ContentMediaDraft>>(null);
  const detailsScrollRef = useRef<KeyboardAwareScrollViewRef>(null);
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
  const [appendingCameraPhoto, setAppendingCameraPhoto] = useState(false);
  const [caption, setCaption] = useState("");
  const [soundSelection, setSoundSelection] = useState<SoundSelection | null>(null);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [linkedPostId, setLinkedPostId] = useState<string | undefined>(
    initialLinkedPostId,
  );
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<SelectedRestaurant | null>(null);
  const [taggedPeople, setTaggedPeople] = useState<ReviewInviteeDraft[]>([]);
  const [linkedReviewSnapshot, setLinkedReviewSnapshot] =
    useState<ReviewCreatorSnapshot | null>(null);
  const [editingMedia, setEditingMedia] = useState(false);
  const {
    status: gallerySaveStatus,
    isSaving: savingPhotoToGallery,
    begin: beginGallerySave,
    succeed: completeGallerySave,
    fail: failGallerySave,
  } = useGallerySaveFeedback();
  const [cameraReady, setCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string>();
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
  const createdContentResultRef = useRef<{
    postId: string;
    restaurantId: string;
    coverImageUrl?: string;
  } | null>(null);

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
        caption,
        visibility,
        linkedPostId,
        selectedRestaurant,
        taggedPeople,
        soundSelection,
      }).catch((error) => console.error("Could not save content draft", error));
    }, 500);
    return () => clearTimeout(timer);
  }, [
    caption,
    draftHydrated,
    media,
    linkedPostId,
    publishing,
    selectedRestaurant,
    step,
    taggedPeople,
    soundSelection,
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
            caption,
            visibility,
            linkedPostId,
            selectedRestaurant,
            taggedPeople,
            soundSelection,
          }
        : null;
  }, [
    caption,
    draftHydrated,
    media,
    linkedPostId,
    publishing,
    selectedRestaurant,
    step,
    taggedPeople,
    soundSelection,
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

  useEffect(() => {
    if (!initialSoundId || soundSelection) return;
    let cancelled = false;
    void api.sounds.find(initialSoundId).then((sound) => {
      if (!cancelled && sound.isAvailable !== false && sound.audioUrl) {
        setSoundSelection({
          sound,
          soundStartTimeMs: 0,
          soundVolume: 0.8,
          originalAudioVolume: 1,
        });
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [initialSoundId, soundSelection]);

  const selectPhoto = useCallback((uri: string, width = 4, height = 5) => {
    setAvailableDraft(null);
    setMedia([
      {
        id: `${Date.now()}-camera`,
        type: "IMAGE",
        uri,
        originalUri: uri,
        originalWidth: width,
        originalHeight: height,
        width,
        height,
      },
    ]);
    setStep("EDIT_MEDIA");
  }, []);

  const openMediaPicker = useCallback(() => {
    setAppendingCameraPhoto(false);
    setCameraReady(false);
    setStep("CAMERA");
  }, []);

  function continueDraft() {
    if (!availableDraft) return;
    setMedia(availableDraft.media);
    setCaption(availableDraft.caption);
    setVisibility(availableDraft.visibility);
    setLinkedPostId(availableDraft.linkedPostId);
    setSelectedRestaurant(availableDraft.selectedRestaurant);
    setTaggedPeople(availableDraft.taggedPeople ?? []);
    setSoundSelection(availableDraft.soundSelection ?? null);
    setStep(
      availableDraft.step === "CAMERA"
        ? "EDIT_MEDIA"
        : availableDraft.step === "READY"
          ? "DETAILS"
          : availableDraft.step,
    );
    setAvailableDraft(null);
  }

  function continueCameraDraft() {
    if (!media.length) {
      continueDraft();
      return;
    }
    setAppendingCameraPhoto(false);
    setPreviewMediaIndex((current) =>
      Math.min(current, Math.max(0, media.length - 1)),
    );
    setStep(media.every((item) => item.type === "IMAGE") ? "EDIT_MEDIA" : "DETAILS");
  }

  async function discardAvailableDraft() {
    if (!user?.id) return;
    setAvailableDraft(null);
    setMedia([]);
    setPreviewMediaIndex(0);
    setCaption("");
    setVisibility("PUBLIC");
    setLinkedPostId(initialLinkedPostId);
    setSelectedRestaurant(null);
    setTaggedPeople([]);
    setSoundSelection(null);
    setLinkedReviewSnapshot(null);
    draftSnapshotRef.current = null;
    try {
      await clearPostDraft(user.id, "content");
    } catch (error) {
      console.error("Could not discard content draft", error);
    }
  }

  function confirmDiscardAvailableDraft() {
    Alert.alert(t("deleteDraftTitle"), t("deleteDraftBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deleteDraft"),
        style: "destructive",
        onPress: () => void discardAvailableDraft(),
      },
    ]);
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
        quality: 0.8,
        mirror: false,
      });
      const capturedPhoto =
        cameraFacing === "front"
          ? await normalizeFrontCameraPhoto(photo.uri)
          : photo;
      if (appendingCameraPhoto) {
        const nextMedia = [
          ...media,
          {
            id: `${Date.now()}-camera`,
            type: "IMAGE" as const,
            uri: capturedPhoto.uri,
            originalUri: capturedPhoto.uri,
            originalWidth: capturedPhoto.width,
            originalHeight: capturedPhoto.height,
            width: capturedPhoto.width,
            height: capturedPhoto.height,
          },
        ].slice(0, 10);
        setAvailableDraft(null);
        setMedia(nextMedia);
        setPreviewMediaIndex(nextMedia.length - 1);
        setAppendingCameraPhoto(false);
        setStep("EDIT_MEDIA");
      } else {
        selectPhoto(
          capturedPhoto.uri,
          capturedPhoto.width,
          capturedPhoto.height,
        );
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
    cameraFacing,
    capturing,
    media,
    selectPhoto,
    showToast,
    t,
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

  const handleCameraReady = useCallback(async () => {
    const camera = cameraRef.current;
    if (captureMode === "picture" && camera && !pictureSize) {
      try {
        const sizes = await camera.getAvailablePictureSizesAsync();
        setPictureSize(preferredPictureSize(sizes));
      } catch (error) {
        console.warn("Could not select content camera picture size", error);
      }
    }
    setCameraReady(true);
  }, [captureMode, pictureSize]);

  const openGallery = useCallback(async (options?: { append?: boolean }) => {
    try {
      const existingPhotos =
        options?.append && media.every((item) => item.type === "IMAGE")
          ? media
          : [];
      const remaining = Math.max(1, 10 - existingPhotos.length);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        exif: true,
        allowsMultipleSelection: true,
        allowsEditing: false,
        orderedSelection: true,
        selectionLimit: remaining,
        defaultTab: "photos",
        quality: 0.9,
      });
      if (result.canceled) {
        return;
      }
      const selectedVideo = result.assets.find(
        (asset) => asset.type === "video",
      );
      if (selectedVideo) {
        if (result.assets.length !== 1 || existingPhotos.length > 0) {
          showToast(t("contentMediaRules"), { kind: "error" });
          return;
        }
        const durationMs = await getVideoDurationMs(selectedVideo.uri);
        if (durationMs > 10_250) {
          showToast(t("videoTooLongBody"), { kind: "error" });
          return;
        }
        setMedia([
          {
            id: selectedVideo.assetId ?? `${Date.now()}-video`,
            type: "VIDEO",
            uri: selectedVideo.uri,
            width: selectedVideo.width,
            height: selectedVideo.height,
            durationMs: Math.min(10_000, durationMs),
          },
        ]);
        setAvailableDraft(null);
        setAppendingCameraPhoto(false);
        setPreviewMediaIndex(0);
        setStep("DETAILS");
        return;
      }
      const selected: ContentMediaDraft[] = result.assets
        .slice(0, remaining)
        .map((asset, index) => {
          const coordinates = coordinatesFromExif(asset.exif);
          return {
            id: `${asset.assetId ?? "gallery"}-${Date.now()}-${index}`,
            type: "IMAGE",
            uri: asset.uri,
            originalUri: asset.uri,
            originalWidth: asset.width,
            originalHeight: asset.height,
            width: asset.width,
            height: asset.height,
            ...(coordinates
              ? {
                  locationLatitude: coordinates.latitude,
                  locationLongitude: coordinates.longitude,
                }
              : {}),
          };
        });
      if (selected.length === 0) return;
      const nextMedia = [...existingPhotos, ...selected].slice(0, 10);
      const firstAddedIndex = Math.min(existingPhotos.length, nextMedia.length - 1);
      setMedia(nextMedia);
      setAvailableDraft(null);
      setAppendingCameraPhoto(false);
      setPreviewMediaIndex(firstAddedIndex);
      setStep("EDIT_MEDIA");
      requestAnimationFrame(() => {
        mediaListRef.current?.scrollToIndex({
          index: firstAddedIndex,
          animated: existingPhotos.length > 0,
        });
      });
    } catch (error) {
      console.error("content image picker failed", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    }
  }, [media, showToast, t]);

  const cropSelectedPhoto = useCallback(async () => {
    const selected = media[previewMediaIndex];
    if (!selected || selected.type !== "IMAGE" || editingMedia) return;
    try {
      setEditingMedia(true);
      const sourceOriginalUri = selected.originalUri ?? selected.uri;
      // Native pickers can clean or replace temporary files after editing.
      // Archive the untouched source before opening the cropper so every
      // later crop begins with the complete image, never the previous crop.
      const originalUri = userId
        ? (await persistContentMediaUri(
            userId,
            sourceOriginalUri,
            `original-${selected.id}`,
          )) ?? sourceOriginalUri
        : sourceOriginalUri;
      setMedia((current) =>
        current.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                originalUri,
                originalWidth: selected.originalWidth ?? selected.width,
                originalHeight: selected.originalHeight ?? selected.height,
              }
            : item,
        ),
      );
      const cropped = await cropPostImage({
        uri: originalUri,
        width: selected.originalWidth ?? selected.width,
        height: selected.originalHeight ?? selected.height,
        aspect: "CONTENT",
        toolbarTitle: t("cropContentPhoto"),
      });
      if (!cropped) return;
      const stableUri = userId
        ? await persistContentMediaUri(
            userId,
            cropped.uri,
            `crop-${selected.id}-${Date.now()}`,
          )
        : cropped.uri;
      setMedia((current) =>
        current.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                uri: stableUri ?? cropped.uri,
                originalUri,
                originalWidth: selected.originalWidth ?? selected.width,
                originalHeight: selected.originalHeight ?? selected.height,
                width: cropped.width,
                height: cropped.height,
                filterSourceUri: undefined,
                photoFilter: "ORIGINAL",
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("content crop failed", error);
      showToast(t("imageCropErrorBody"), { kind: "error" });
    } finally {
      setEditingMedia(false);
    }
  }, [editingMedia, media, previewMediaIndex, showToast, t, userId]);

  const saveSelectedPhotoToGallery = useCallback(async () => {
    const selected = media[previewMediaIndex];
    if (
      !selected ||
      selected.type !== "IMAGE" ||
      editingMedia ||
      savingPhotoToGallery
    ) return;
    beginGallerySave();
    try {
      await saveImageToGallery(selected.uri);
      completeGallerySave();
      showToast(t("common:savedToGallery"), { kind: "success" });
    } catch (error) {
      failGallerySave();
      showToast(
        t(
          error instanceof MediaLibraryPermissionError
            ? "common:saveToGalleryPermission"
            : "common:saveToGalleryFailed",
        ),
        { kind: "error" },
      );
    }
  }, [
    beginGallerySave,
    completeGallerySave,
    editingMedia,
    failGallerySave,
    media,
    previewMediaIndex,
    savingPhotoToGallery,
    showToast,
    t,
  ]);

  const applySelectedPhotoFilter = useCallback(
    async (filterId: PhotoFilterId) => {
      const selected = media[previewMediaIndex];
      if (!selected || selected.type !== "IMAGE" || editingMedia) return;
      setEditingMedia(true);
      try {
        const sourceUri = selected.filterSourceUri ?? selected.uri;
        const stableSourceUri = userId
          ? (await persistContentMediaUri(
              userId,
              sourceUri,
              `filter-source-${selected.id}`,
            )) ?? sourceUri
          : sourceUri;
        const { applyPhotoFilter } = await import("@/lib/photoFilters");
        const filtered = await applyPhotoFilter(stableSourceUri, filterId);
        const stableFilteredUri = userId
          ? (await persistContentMediaUri(
              userId,
              filtered.uri,
              `filter-${selected.id}-${filterId.toLowerCase()}-${Date.now()}`,
            )) ?? filtered.uri
          : filtered.uri;
        setMedia((current) =>
          current.map((item) =>
            item.id === selected.id
              ? {
                  ...item,
                  uri: stableFilteredUri,
                  filterSourceUri: stableSourceUri,
                  photoFilter: filterId,
                  width: filtered.width ?? item.width,
                  height: filtered.height ?? item.height,
                }
              : item,
          ),
        );
      } catch (error) {
        console.error("content filter failed", error);
        showToast(t("imageEditError"), { kind: "error" });
        throw error;
      } finally {
        setEditingMedia(false);
      }
    },
    [editingMedia, media, previewMediaIndex, showToast, t, userId],
  );

  const rotateSelectedPhoto = useCallback(async () => {
    const selected = media[previewMediaIndex];
    if (!selected || selected.type !== "IMAGE" || editingMedia) return;
    try {
      setEditingMedia(true);
      const context = ImageManipulator.manipulate(selected.uri);
      context.rotate(90);
      const rendered = await context.renderAsync();
      const rotated = await rendered.saveAsync({
        compress: 0.9,
        format: SaveFormat.JPEG,
      });
      const stableUri = userId
        ? await persistContentMediaUri(
            userId,
            rotated.uri,
            `rotate-${selected.id}-${Date.now()}`,
          )
        : rotated.uri;
      setMedia((current) =>
        current.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                id: `${item.id}-rotate-${Date.now()}`,
                uri: stableUri ?? rotated.uri,
                width: rotated.width,
                height: rotated.height,
                filterSourceUri: undefined,
                photoFilter: "ORIGINAL",
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("content rotate failed", error);
      showToast(t("imageEditError"), { kind: "error" });
    } finally {
      setEditingMedia(false);
    }
  }, [editingMedia, media, previewMediaIndex, showToast, t, userId]);

  const reorderPhotos = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= media.length ||
        toIndex >= media.length
      ) {
        return;
      }
      const selectedId = media[previewMediaIndex]?.id;
      const reordered = [...media];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      setMedia(reordered);
      if (selectedId) {
        setPreviewMediaIndex(
          Math.max(0, reordered.findIndex((item) => item.id === selectedId)),
        );
      }
    },
    [media, previewMediaIndex],
  );

  function takeAdditionalPhoto() {
    setAppendingCameraPhoto(true);
    setCaptureMode("picture");
    setCameraReady(false);
    setStep("CAMERA");
  }

  function promptAddPhoto() {
    Alert.alert(t("addPhotosTitle"), undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: t("takeAnotherPhoto"), onPress: takeAdditionalPhoto },
      {
        text: t("chooseFromGallery"),
        onPress: () => void openGallery({ append: true }),
      },
    ]);
  }

  function closeCamera() {
    if (appendingCameraPhoto && media.length > 0) {
      setAppendingCameraPhoto(false);
      setStep("EDIT_MEDIA");
      return;
    }
    confirmExit();
  }

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

  async function createContentPost(
    reportProgress: (progress: number) => void,
    needsReviewCover = false,
  ) {
    if (createdContentResultRef.current) {
      reportProgress(1);
      return createdContentResultRef.current;
    }

    if (!media.length || !selectedRestaurant) {
      throw new Error(t("restaurantRequired"));
    }

    setPublishing(true);
    publishCompletedRef.current = true;
    draftSnapshotRef.current = null;

    const pendingMedia = [...media];
    const pendingCaption = caption.trim();
    const pendingVisibility = visibility;
    const pendingLinkedPostId = linkedPostId;
    const pendingTaggedUserIds = taggedPeople.map((person) => person.id);
    const pendingSoundSelection = soundSelection;
    const pendingUserId = user?.id;
    const pendingRestaurantCoverUrl =
      selectedRestaurant.source === "FINDEAT"
        ? selectedRestaurant.restaurant.coverUrl
        : undefined;

    reportProgress(0.04);
    const restaurantId = await getRestaurantId();
    if (!restaurantId) throw new Error(t("restaurantRequired"));

    const reportMediaProgress = createCombinedUploadProgress(
      pendingMedia.length,
      reportProgress,
    );
    const isVideoPost =
      pendingMedia.length === 1 && pendingMedia[0]?.type === "VIDEO";
    const uploadedMedia = await Promise.all(
      pendingMedia.map(async (item, index) => {
        if (isVideoPost) {
          const videoUrl = await uploadVideo(
            item.uri,
            reportMediaProgress(index),
          );
          const uploadedItem = {
            type: "VIDEO" as const,
            videoUrl,
            width:
              Number.isFinite(item.width) && item.width > 0
                ? Math.round(item.width)
                : 4,
            height:
              Number.isFinite(item.height) && item.height > 0
                ? Math.round(item.height)
                : 5,
            durationMs: item.durationMs,
          };
          return uploadedItem;
        }

        const imageUrl = await uploadImage(
          item.uri,
          "post",
          reportMediaProgress(index),
        );
        const uploadedItem = {
          type: "IMAGE" as const,
          imageUrl,
          width:
            Number.isFinite(item.width) && item.width > 0
              ? Math.round(item.width)
              : 1200,
          height:
            Number.isFinite(item.height) && item.height > 0
              ? Math.round(item.height)
              : 1500,
        };
        return uploadedItem;
      }),
    );
    let generatedVideoCoverUrl: string | undefined;
    const video = isVideoPost ? pendingMedia[0] : undefined;
    if (video && needsReviewCover) {
      const cover = await createVideoCover(video.uri);
      generatedVideoCoverUrl = await uploadImage(
        cover.uri,
        "review",
        (progress) => reportProgress(0.9 + progress * 0.04),
      );
    }
    reportProgress(0.94);
    const createdPost = await api.posts.createContent({
      restaurantId,
      caption: pendingCaption,
      visibility: pendingVisibility,
      linkedPostId: pendingLinkedPostId,
      taggedUserIds: pendingTaggedUserIds,
      media: uploadedMedia,
      soundId: pendingSoundSelection?.sound.id,
      soundStartTimeMs: pendingSoundSelection?.soundStartTimeMs,
      soundVolume: pendingSoundSelection?.soundVolume,
      originalAudioVolume: pendingSoundSelection?.originalAudioVolume,
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
    const result = {
      postId: createdPost.id,
      restaurantId,
      coverImageUrl:
        createdPost.contentPost?.media?.[0]?.imageUrl ??
        createdPost.contentPost?.imageUrl ??
        createdPost.contentPost?.thumbnailUrl ??
        generatedVideoCoverUrl ??
        pendingRestaurantCoverUrl ??
        undefined,
    };
    createdContentResultRef.current = result;
    return result;
  }

  function publishWithoutReview() {
    if (publishing || publishCompletedRef.current) return;
    startPostUpload({
      kind: "content",
      run: async (reportProgress) => {
        const result = await createContentPost(reportProgress);
        return { type: "post", postId: result.postId };
      },
    });

    router.dismissTo("/(tabs)");
  }

  function handleReadyPost() {
    if (!linkedReviewSnapshot) {
      publishWithoutReview();
      return;
    }

    Alert.alert(t("unfinishedReviewTitle"), t("unfinishedReviewBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("discardReviewAndPost"),
        style: "destructive",
        onPress: () => {
          setLinkedReviewSnapshot(null);
          publishWithoutReview();
        },
      },
      {
        text: t("finishReview"),
        onPress: () => setStep("REVIEW"),
      },
    ]);
  }

  async function handleSaveDraft() {
    if (!user?.id || !media.length || savingDraft) return;
    try {
      setSavingDraft(true);
      await saveContentPostDraft(user.id, {
        step,
        imageUri: media[0].uri,
        media,
        caption,
        visibility,
        linkedPostId,
        selectedRestaurant,
        taggedPeople,
        soundSelection,
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

  function confirmExit() {
    if (!media.length) {
      router.back();
      return;
    }
    Alert.alert(t("leavePostTitle"), t("leavePostBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("discardPost"),
        style: "destructive",
        onPress: () => {
          publishCompletedRef.current = true;
          draftSnapshotRef.current = null;
          if (user?.id) void clearPostDraft(user.id, "content");
          router.back();
        },
      },
      { text: t("saveDraft"), onPress: () => void handleSaveDraft() },
    ]);
  }

  const selectedPlace =
    selectedRestaurant?.source === "FINDEAT"
      ? selectedRestaurant.restaurant
      : selectedRestaurant;
  const selectedPlaceLogo =
    selectedRestaurant?.source === "FINDEAT"
      ? selectedRestaurant.restaurant.logoUrl
      : null;
  const detailPickerCircleSize = 40;

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
    setCameraReady(false);
    setPictureSize(undefined);
    if (preset === "0.5" && ultraWideLens) {
      setSelectedCameraLens(ultraWideLens);
    } else {
      setSelectedCameraLens("builtInWideAngleCamera");
    }
    setCameraZoomValue(CAMERA_ZOOM_VALUES[preset], preset);
  }

  function flipCamera() {
    setCameraReady(false);
    setPictureSize(undefined);
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
        <ActivityIndicator color="#FAF9F6" size="large" />
      </View>
    );
  }

  if (step === "EDIT_MEDIA" && media.every((item) => item.type === "IMAGE")) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ContentMediaEditor
          media={media}
          selectedIndex={previewMediaIndex}
          busy={editingMedia}
          gallerySaveStatus={gallerySaveStatus}
          onSelect={setPreviewMediaIndex}
          onBack={() => {
            setCameraReady(false);
            setStep("CAMERA");
          }}
          onNext={() => setStep("DETAILS")}
          onAdd={promptAddPhoto}
          onCrop={() => void cropSelectedPhoto()}
          onRotate={() => void rotateSelectedPhoto()}
          onApplyFilter={applySelectedPhotoFilter}
          onSaveToGallery={() => void saveSelectedPhotoToGallery()}
          onDelete={removePreviewMedia}
          onReorder={reorderPhotos}
        />
      </>
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
                mirror={false}
                flash={flashMode}
                mode={captureMode}
                zoom={cameraZoom}
                autofocus={cameraAutofocus}
                pictureSize={captureMode === "picture" ? pictureSize : undefined}
                selectedLens={
                  cameraFacing === "back" ? selectedCameraLens : undefined
                }
                onAvailableLensesChanged={({ lenses }) =>
                  setAvailableCameraLenses(lenses)
                }
                onCameraReady={() => void handleCameraReady()}
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
                    shadowColor: "#0B0B0A",
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
                <View className="relative flex-row items-center justify-between">
                  <TouchableOpacity
                    disabled={recording}
                    onPress={closeCamera}
                    className={`h-11 w-11 items-center justify-center rounded-full bg-black/50 ${
                      recording ? "opacity-40" : ""
                    }`}
                  >
                    <XIcon size={23} color="#FAF9F6" weight="bold" />
                  </TouchableOpacity>
                  {availableDraft || media.length > 0 ? (
                    <View className="absolute left-14 right-14 flex-row items-center justify-center">
                      <View className="flex-row items-center overflow-hidden rounded-full bg-black/65 pl-3">
                        <TouchableOpacity
                          onPress={continueCameraDraft}
                          className="flex-row items-center py-1.5 pr-2"
                        >
                          {(media[0]?.uri ?? availableDraft?.media[0]?.uri) ? (
                            <ProgressiveImage
                              source={{
                                uri: media[0]?.uri ?? availableDraft?.media[0]?.uri,
                              }}
                              style={{ width: 30, height: 30, borderRadius: 15 }}
                              contentFit="cover"
                            />
                          ) : null}
                          <Text
                            numberOfLines={1}
                            className="ml-2 text-xs font-bold text-white"
                          >
                            {t("currentDraft")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityLabel={t("deleteDraft")}
                          onPress={confirmDiscardAvailableDraft}
                          className="h-10 w-10 items-center justify-center border-l border-white/15"
                        >
                          <TrashIcon size={16} color="#FAF9F6" weight="bold" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : captureMode === "video" ? (
                    <View
                      pointerEvents="none"
                      className="absolute left-16 right-16 items-center"
                    >
                      <Text
                        numberOfLines={2}
                        className="text-center text-xs font-semibold text-white/75"
                      >
                        {t("videoCaptureLimit")}
                      </Text>
                    </View>
                  ) : (
                    <View className="absolute left-16 right-16 items-center">
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("writeReviewOnly")}
                        onPress={() => router.replace("/create/review")}
                        className="flex-row items-center rounded-full bg-black/55 px-3 py-2"
                      >
                        <NotePencilIcon
                          size={16}
                          color="#F7D786"
                          weight="fill"
                        />
                        <Text className="ml-1.5 text-xs font-bold text-white">
                          {t("writeReviewOnly")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    disabled={recording}
                    onPress={cycleFlashMode}
                    className={`h-11 min-w-11 flex-row items-center justify-center rounded-full bg-black/50 px-3 ${
                      recording ? "opacity-40" : ""
                    }`}
                  >
                    {flashMode === "off" ? (
                      <LightningSlashIcon size={21} color="#FAF9F6" weight="bold" />
                    ) : (
                      <LightningIcon size={21} color="#F7D786" weight="fill" />
                    )}
                    {flashMode === "auto" ? (
                      <Text className="ml-1 text-xs font-bold text-white">A</Text>
                    ) : null}
                  </TouchableOpacity>
                </View>

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
                {cameraFacing === "back" && ultraWideLens ? (
                  <View className="mb-3 items-center">
                    <TouchableOpacity
                      disabled={recording}
                      accessibilityRole="button"
                      accessibilityLabel={t("cameraZoom", {
                        value: cameraZoomPreset === "0.5" ? "1×" : "0.5×",
                      })}
                      onPress={() =>
                        selectCameraZoom(cameraZoomPreset === "0.5" ? "1" : "0.5")
                      }
                      className={`h-10 min-w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 px-2.5 ${
                        recording ? "opacity-40" : ""
                      }`}
                    >
                      <Text className="text-xs font-bold text-white">
                        {cameraZoomPreset === "0.5" ? "1×" : "0.5×"}
                      </Text>
                    </TouchableOpacity>
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
                      t("chooseFromGallery")
                    }
                    onPress={() => void openGallery()}
                    className={`h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-black/55 ${
                      recording ? "opacity-40" : ""
                    }`}
                  >
                    <ImagesSquareIcon size={26} color="#FAF9F6" weight="fill" />
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
                    style={{
                      transform: [
                        {
                          scale:
                            capturing && !recording && captureMode === "picture"
                              ? 0.9
                              : 1,
                        },
                      ],
                    }}
                  >
                    {recording ? (
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-500">
                        <SquareIcon size={18} color="#FAF9F6" weight="fill" />
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
                      color="#FAF9F6"
                      weight="bold"
                    />
                  </TouchableOpacity>
                </View>

              </View>
            </SafeAreaView>
          </View>
        ) : cameraPermission === null ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#FAF9F6" size="large" />
          </View>
        ) : (
          <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: "#0B0B0A" }}
          >
            <View className="px-5 pt-2">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("cancel")}
                onPress={closeCamera}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
              >
                <XIcon size={23} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 28,
                paddingVertical: 24,
              }}
            >
              <View className="h-20 w-20 items-center justify-center rounded-[24px] bg-[#F7D786]">
                <CameraIcon size={38} color="#171717" weight="fill" />
              </View>
              <Text className="mt-6 text-center text-[26px] font-bold leading-8 text-[#FAF9F6]">
                {t(
                  canAskForCamera
                    ? "cameraPermissionTitle"
                    : "cameraPermissionDeniedTitle",
                )}
              </Text>
              <Text className="mt-3 max-w-sm text-center text-base leading-6 text-gray-400">
                {t(
                  canAskForCamera
                    ? "cameraPermissionBody"
                    : "cameraPermissionDeniedBody",
                )}
              </Text>
              <View className="mt-6 max-w-sm flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <LockIcon size={16} color="#D1D5DB" weight="fill" />
                </View>
                <Text className="ml-3 flex-1 text-sm leading-5 text-gray-300">
                  {t("cameraPrivacy")}
                </Text>
              </View>
            </ScrollView>

            <View className="px-5 pb-3 pt-2">
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  void (canAskForCamera
                    ? requestCameraPermission()
                    : Linking.openSettings())
                }
                className="rounded-2xl bg-[#F7D786] py-4"
              >
                <Text className="text-center text-base font-bold text-[#171717]">
                  {t(canAskForCamera ? "allowCamera" : "openSettings")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  void openGallery(
                    appendingCameraPhoto ? { append: true } : undefined,
                  )
                }
                className="mt-3 flex-row items-center justify-center rounded-2xl border border-white/15 py-4"
              >
                <ImagesSquareIcon size={21} color="#F7D786" weight="fill" />
                <Text className="ml-2 text-base font-bold text-[#FAF9F6]">
                  {t("chooseFromGallery")}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </View>
    );
  }

  if (step === "REVIEW" && selectedRestaurant) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewCreator
          initialRestaurant={selectedRestaurant}
          initialCoverImageUri={
            media[0]?.type === "IMAGE" ? media[0].uri : undefined
          }
          initialParticipants={taggedPeople}
          initialVisibility={visibility}
          initialSnapshot={linkedReviewSnapshot}
          linkedContentPreview={{ media, caption }}
          onLinkedFlowBack={(snapshot) => {
            setLinkedReviewSnapshot(snapshot);
            setStep("DETAILS");
          }}
          linkedContentPublisher={(reportProgress) =>
            createContentPost(reportProgress, true)
          }
        />
      </>
    );
  }

  if (step === "READY") {
    const readyPreviewWidth = screenWidth - 40;
    return (
      <View
        style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-4 py-2">
            <TouchableOpacity
              onPress={() => setStep("DETAILS")}
              className="h-11 w-11 items-center justify-center rounded-full"
            >
              <DirectionalIcon
                direction="back"
                size={25}
                color={isDark ? "#FAF9F6" : "#171717"}
                weight="bold"
              />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-bold text-black dark:text-white">
              {t("postReadyTitle")}
            </Text>
            <TouchableOpacity
              disabled={publishing}
              onPress={handleReadyPost}
              className={`h-11 min-w-11 items-center justify-center px-2 ${
                publishing ? "opacity-40" : ""
              }`}
            >
              <Text className="font-bold text-brand">{t("post")}</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareFormScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          >
            <View className="my-5 h-px bg-gray-200 dark:bg-gray-800" />
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              {t("postPreview")}
            </Text>
            {media.length > 0 ? (
              <View
                className="overflow-hidden rounded-3xl bg-black"
                style={{ width: readyPreviewWidth, aspectRatio: 4 / 5 }}
              >
                <FlatList
                  horizontal
                  pagingEnabled
                  nestedScrollEnabled
                  directionalLockEnabled
                  data={media}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  getItemLayout={(_, index) => ({
                    length: readyPreviewWidth,
                    offset: readyPreviewWidth * index,
                    index,
                  })}
                  scrollEventThrottle={16}
                  onScroll={(event) => {
                    const nextIndex = Math.max(
                      0,
                      Math.min(
                        media.length - 1,
                        Math.round(
                          event.nativeEvent.contentOffset.x / readyPreviewWidth,
                        ),
                      ),
                    );
                    setPreviewMediaIndex((current) =>
                      current === nextIndex ? current : nextIndex,
                    );
                  }}
                  onMomentumScrollEnd={(event) =>
                    setPreviewMediaIndex(
                      Math.max(
                        0,
                        Math.min(
                          media.length - 1,
                          Math.round(
                            event.nativeEvent.contentOffset.x /
                              readyPreviewWidth,
                          ),
                        ),
                      ),
                    )
                  }
                  renderItem={({ item }) => (
                    <View
                      style={{ width: readyPreviewWidth, height: "100%" }}
                    >
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
                          autoPlay
                          tapToToggle
                          showProgress
                          volume={soundSelection?.originalAudioVolume ?? 1}
                        />
                      )}
                    </View>
                  )}
                />
                {media.length > 1 ? (
                  <View
                    pointerEvents="none"
                    className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1"
                  >
                    <Text className="text-xs font-bold text-white">
                      {previewMediaIndex + 1}/{media.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {caption.trim() ? (
              <Text className="mt-3 text-base leading-6 text-black dark:text-white">
                {caption.trim()}
              </Text>
            ) : null}

            <View className="my-6 h-px bg-gray-200 dark:bg-gray-800" />
            <View className="rounded-3xl bg-brand/10 p-5">
              <Text className="text-2xl">✨</Text>
              <Text className="mt-3 text-xl font-bold text-black dark:text-white">
                {t("addFullReviewTitle")}
              </Text>
              <Text className="mt-2 leading-6 text-gray-600 dark:text-gray-300">
                {t("addFullReviewBody")}
              </Text>
              <TouchableOpacity
                onPress={() => setStep("REVIEW")}
                className="mt-5 rounded-2xl bg-black py-4 dark:bg-white"
              >
                <Text className="text-center font-bold text-white dark:text-black">
                  {t("addFullReviewAction")}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareFormScrollView>
        </SafeAreaView>
        <SoundPlayback
          sound={soundSelection?.sound}
          startTimeMs={soundSelection?.soundStartTimeMs}
          volume={soundSelection?.soundVolume}
          playing
        />
      </View>
    );
  }

  if (step === "RESTAURANT") {
    const mediaLocation = firstMediaLocation(media);
    const selectRestaurant = (restaurant: SelectedRestaurant) => {
      const coordinates =
        restaurant.source === "FINDEAT"
          ? {
              latitude: restaurant.restaurant.latitude,
              longitude: restaurant.restaurant.longitude,
            }
          : {
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
            };
      const hasRestaurantLocation =
        typeof coordinates.latitude === "number" &&
        typeof coordinates.longitude === "number";
      const isVeryFar =
        mediaLocation?.confidence === "HIGH" &&
        hasRestaurantLocation &&
        coordinateDistanceKm(mediaLocation, {
          latitude: coordinates.latitude!,
          longitude: coordinates.longitude!,
        }) >= 250;
      const applySelection = () => {
        const previousId =
          selectedRestaurant?.source === "FINDEAT"
            ? selectedRestaurant.restaurant.id
            : undefined;
        const nextId =
          restaurant.source === "FINDEAT"
            ? restaurant.restaurant.id
            : undefined;
        if (previousId !== nextId) {
          setLinkedPostId(undefined);
          setLinkedReviewSnapshot(null);
        }
        setSelectedRestaurant(restaurant);
        setStep("DETAILS");
      };
      if (!isVeryFar) {
        applySelection();
        return;
      }
      Alert.alert(
        t("farRestaurantTitle"),
        t("farRestaurantBody"),
        [
          { text: t("chooseAnotherRestaurant"), style: "cancel" },
          { text: t("confirmRestaurant"), onPress: applySelection },
        ],
      );
    };
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullPageRestaurantPicker
          selectedRestaurant={selectedRestaurant}
          preferredLocation={mediaLocation}
          onSelect={selectRestaurant}
          onBack={() => setStep("DETAILS")}
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
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ContextualCoachMark markKey="create" style={{ top: 72 }} />
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-4 py-2">
          <TouchableOpacity
            disabled={savingDraft}
            onPress={() =>
              media.every((item) => item.type === "IMAGE")
                ? setStep("EDIT_MEDIA")
                : confirmExit()
            }
            className="h-11 w-11 items-center justify-center rounded-full"
          >
            <DirectionalIcon direction="back" size={25} color={isDark ? "#FAF9F6" : "#171717"} weight="bold" />
          </TouchableOpacity>
          <Text className="ml-2 flex-1 text-xl font-bold text-black dark:text-white">
            {t("newPost")}
          </Text>
          <TouchableOpacity
            disabled={publishing || !selectedRestaurant}
            onPress={handleReadyPost}
            className={`px-2 py-2 ${
              publishing || !selectedRestaurant ? "opacity-35" : ""
            }`}
          >
            <Text className="font-bold text-brand">{t("post")}</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAwareFormScrollView
          ref={detailsScrollRef}
          contentContainerStyle={{ paddingBottom: 40 }}
          bottomOffset={20}
        >
          {media.length > 0 && (
            <View>
              <View
                style={{ width: screenWidth, aspectRatio: 4 / 5 }}
                className="overflow-hidden bg-black"
              >
                <FlatList
                  ref={mediaListRef}
                  horizontal
                  pagingEnabled
                  data={media}
                  initialScrollIndex={previewMediaIndex}
                  getItemLayout={(_, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                  })}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={(event) => {
                    const nextIndex = Math.max(
                      0,
                      Math.min(
                        media.length - 1,
                        Math.round(
                          event.nativeEvent.contentOffset.x / screenWidth,
                        ),
                      ),
                    );
                    setPreviewMediaIndex((current) =>
                      current === nextIndex ? current : nextIndex,
                    );
                  }}
                  onMomentumScrollEnd={(event) =>
                    setPreviewMediaIndex(
                      Math.max(
                        0,
                        Math.min(
                          media.length - 1,
                          Math.round(
                            event.nativeEvent.contentOffset.x / screenWidth,
                          ),
                        ),
                      ),
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
                          autoPlay
                          tapToToggle
                          showProgress
                          volume={soundSelection?.originalAudioVolume ?? 1}
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

              </View>
            </View>
          )}

          <View className="px-5">
            <TextInput
              value={caption}
              onChangeText={setCaption}
              onFocus={() => {
                setTimeout(
                  () => detailsScrollRef.current?.assureFocusedInputVisible(),
                  180,
                );
              }}
              placeholder={t("captionPlaceholder")}
              multiline
              maxLength={500}
              className="min-h-24 rounded-none border-0 bg-transparent px-0 dark:border-0 dark:bg-transparent"
              style={{ minHeight: 96, paddingTop: 18, paddingBottom: 12 }}
            />

            <View className="h-px bg-gray-200 dark:bg-gray-800" />

            <TouchableOpacity
              onPress={() => setSoundPickerOpen(true)}
              className="flex-row items-center border-b border-gray-100 py-4 dark:border-gray-800"
            >
              <View
                className="items-center justify-center rounded-full bg-brand/15"
                style={{ width: detailPickerCircleSize, height: detailPickerCircleSize }}
              >
                <MusicNoteIcon size={21} color="#C89C25" weight="fill" />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="font-bold text-black dark:text-white">
                  {soundSelection ? soundSelection.sound.title : tSound("addSound")}
                </Text>
                <Text numberOfLines={1} className="mt-1 text-sm text-gray-500">
                  {soundSelection ? soundSelection.sound.artist : tSound("musicForPost")}
                </Text>
              </View>
              <DirectionalIcon direction="forward" size={20} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep("RESTAURANT")}
              className="flex-row items-center border-b border-gray-100 py-4 dark:border-gray-800"
            >
              {selectedPlace && selectedPlaceLogo ? (
                <Avatar
                  uri={selectedPlaceLogo}
                  username={selectedPlace.name}
                  size={detailPickerCircleSize}
                  fallbackType="restaurant"
                  showSnapIndicator={false}
                />
              ) : (
                <View
                  className="items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900"
                  style={{
                    width: detailPickerCircleSize,
                    height: detailPickerCircleSize,
                  }}
                >
                  <StorefrontIcon size={20} color="#9CA3AF" weight="fill" />
                </View>
              )}
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="font-bold text-black dark:text-white">
                    {selectedPlace?.name ?? t("addRestaurant")}
                  </Text>
                  {!selectedPlace ? (
                    <View className="ml-2 rounded-full bg-brand/15 px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-brand">
                        {t("required")}
                      </Text>
                    </View>
                  ) : null}
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
                <Text
                  numberOfLines={1}
                  className={`mt-1 text-sm ${
                    selectedPlace ? "text-gray-500" : "font-semibold text-brand"
                  }`}
                >
                  {selectedPlace
                    ? selectedPlace.address ?? selectedPlace.city
                    : t("restaurantRequired")}
                </Text>
              </View>
              <DirectionalIcon direction="forward" size={20} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep("PEOPLE")}
              className="mt-2 flex-row items-center border-b border-gray-100 py-4 dark:border-gray-800"
            >
              <View
                className="items-center justify-center rounded-full bg-brand/15"
                style={{
                  width: detailPickerCircleSize,
                  height: detailPickerCircleSize,
                }}
              >
                <UsersThreeIcon size={21} color="#C89C25" weight="fill" />
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

            <PostVisibilitySelector
              value={visibility}
              onChange={changeVisibility}
            />

            {!linkedPostId ? (
              <TouchableOpacity
                disabled={!selectedRestaurant}
                onPress={() => setStep("REVIEW")}
                className={`mb-3 mt-2 flex-row items-center rounded-2xl border border-[#E8D39A] bg-[#FFF9E9] p-4 dark:border-[#5A4820] dark:bg-[#1B170D] ${
                  !selectedRestaurant ? "opacity-40" : ""
                }`}
              >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F7D786]/25">
                <NotePencilIcon size={23} color="#C89C25" weight="fill" />
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="font-bold text-black dark:text-white">
                    {linkedReviewSnapshot
                      ? t("continueFullReview")
                      : t("addFullReviewTitle")}
                  </Text>
                  <View className="ml-2 rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
                    <Text className="text-[10px] font-bold text-gray-500 dark:text-gray-300">
                      {t("optional")}
                    </Text>
                  </View>
                </View>
                <Text numberOfLines={2} className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {linkedReviewSnapshot
                    ? t("continueFullReviewHint")
                    : t("addFullReviewBody")}
                </Text>
              </View>
              <DirectionalIcon
                direction="forward"
                size={20}
                color="#9CA3AF"
                weight="bold"
              />
              </TouchableOpacity>
            ) : null}

            <PostConnectionPicker
              restaurantId={
                selectedRestaurant?.source === "FINDEAT"
                  ? selectedRestaurant.restaurant.id
                  : undefined
              }
              candidateType="REVIEW"
              selectedPostId={linkedPostId}
              onSelect={(postId) => {
                setLinkedPostId(postId);
                if (postId) setLinkedReviewSnapshot(null);
              }}
            />

          </View>
        </KeyboardAwareFormScrollView>
      </SafeAreaView>
      <SoundPickerModal
        visible={soundPickerOpen}
        value={soundSelection}
        hasOriginalAudio={media.some((item) => item.type === "VIDEO")}
        onClose={() => setSoundPickerOpen(false)}
        onChange={setSoundSelection}
      />
      <SoundPlayback
        sound={soundSelection?.sound}
        startTimeMs={soundSelection?.soundStartTimeMs}
        volume={soundSelection?.soundVolume}
        playing={!soundPickerOpen}
      />
    </View>
  );
}
