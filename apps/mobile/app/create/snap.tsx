import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { snapsQueryKey } from "@/hooks/useSnaps";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { uploadImage, uploadVideo } from "@/lib/uploadImage";
import { getVideoDurationMs } from "@/lib/videoDuration";
import {
  MediaLibraryPermissionError,
  saveImageToGallery,
} from "@/lib/saveImageToGallery";
import ContentVideo from "@/components/posts/content/ContentVideo";
import SoundPickerModal from "@/components/sounds/SoundPickerModal";
import SoundPlayback from "@/components/sounds/SoundPlayback";
import type { SelectedRestaurant, SnapGroup, SoundSelection } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { usePostUpload } from "@/contexts/PostUploadContext";
import { Image } from "expo-image";
import {
  CameraView,
  type CameraType,
  type FlashMode,
  useCameraPermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { router, Stack } from "expo-router";
import {
  ArrowsClockwiseIcon,
  CameraIcon,
  DownloadSimpleIcon,
  ImagesIcon,
  LightningIcon,
  LightningSlashIcon,
  MapPinIcon,
  PaperPlaneTiltIcon,
  XIcon,
  LockIcon,
  MusicNoteIcon,
} from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateSnapScreen() {
  const { t } = useTranslation(["snaps", "common"]);
  const { t: tSound } = useTranslation("sound");
  const queryClient = useQueryClient();
  const { startPostUpload } = usePostUpload();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [caption, setCaption] = useState("");
  const [soundSelection, setSoundSelection] = useState<SoundSelection | null>(null);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<SelectedRestaurant | null>(null);
  const [choosingRestaurant, setChoosingRestaurant] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingToGallery, setSavingToGallery] = useState(false);
  const publishStartedRef = useRef(false);

  async function saveSnapPhotoToGallery() {
    if (!imageUri || savingToGallery) return;
    setSavingToGallery(true);
    try {
      await saveImageToGallery(imageUri);
      Alert.alert(t("common:savedToGallery"));
    } catch (error) {
      Alert.alert(
        t(
          error instanceof MediaLibraryPermissionError
            ? "common:saveToGalleryPermission"
            : "common:saveToGalleryFailed",
        ),
      );
    } finally {
      setSavingToGallery(false);
    }
  }

  useEffect(() => {
    if (
      cameraPermission &&
      !cameraPermission.granted &&
      cameraPermission.canAskAgain
    ) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        mirror: false,
      });
      if (photo?.uri) {
        if (cameraFacing === "front") {
          const context = ImageManipulator.manipulate(photo.uri);
          context.flip("horizontal");
          const rendered = await context.renderAsync();
          const corrected = await rendered.saveAsync({
            compress: 0.9,
            format: SaveFormat.JPEG,
          });
          setImageUri(corrected.uri);
        } else {
          setImageUri(photo.uri);
        }
      }
    } catch {
      Alert.alert(t("common:error"), t("snaps:captureError"));
    } finally {
      setCapturing(false);
    }
  }

  async function chooseMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("snaps:photosPermissionTitle"),
        t("snaps:photosPermissionBody"),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      allowsEditing: true,
      videoMaxDuration: 10,
      videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      if (asset.type === "video") {
        const duration = await getVideoDurationMs(asset.uri);
        if (duration > 10_250) {
          Alert.alert(
            t("snaps:videoTooLongTitle"),
            t("snaps:videoTooLongBody"),
          );
          return;
        }
        setImageUri(null);
        setVideoUri(asset.uri);
        setVideoDurationMs(Math.min(10_000, duration));
      } else {
        setVideoUri(null);
        setVideoDurationMs(null);
        setImageUri(asset.uri);
      }
    }
  }

  function publish() {
    if ((!imageUri && !videoUri) || publishing || publishStartedRef.current)
      return;

    setPublishing(true);
    publishStartedRef.current = true;
    const pendingImageUri = imageUri;
    const pendingVideoUri = videoUri;
    const pendingVideoDurationMs = videoDurationMs;
    const pendingCaption = caption.trim() || undefined;
    const pendingSoundSelection = soundSelection;
    const pendingRestaurant = restaurant;
    const clientRequestId = `snap-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 12)}`;
    let uploadedImageUrl: string | null = null;
    let uploadedVideoUrl: string | null = null;
    let resolvedRestaurantId: string | undefined;
    let restaurantResolved = false;

    startPostUpload({
      kind: "snap",
      run: async (reportProgress) => {
        reportProgress(0.04);
        if (pendingVideoUri && !uploadedVideoUrl) {
          uploadedVideoUrl = await uploadVideo(
            pendingVideoUri,
            (progress) => reportProgress(0.08 + progress * 0.78),
            "snap",
          );
        } else if (pendingImageUri && !uploadedImageUrl) {
          uploadedImageUrl = await uploadImage(
            pendingImageUri,
            "snap",
            (progress) => reportProgress(0.08 + progress * 0.78),
          );
        } else {
          reportProgress(0.86);
        }
        reportProgress(0.88);
        if (!restaurantResolved) {
          resolvedRestaurantId =
            pendingRestaurant?.source === "FINDEAT"
              ? pendingRestaurant.restaurant.id
              : pendingRestaurant?.source === "GOOGLE"
                ? (
                    await api.restaurants.fromGoogle({
                      name: pendingRestaurant.name,
                      address: pendingRestaurant.address,
                      latitude: pendingRestaurant.latitude,
                      longitude: pendingRestaurant.longitude,
                      googlePlaceId: pendingRestaurant.googlePlaceId,
                    })
                  ).id
                : undefined;
          restaurantResolved = true;
        }

        reportProgress(0.94);
        const shared = {
          clientRequestId,
          caption: pendingCaption,
          restaurantId: resolvedRestaurantId,
          soundId: pendingSoundSelection?.sound.id,
          soundStartTimeMs: pendingSoundSelection?.soundStartTimeMs,
          soundVolume: pendingSoundSelection?.soundVolume,
          originalAudioVolume: pendingSoundSelection?.originalAudioVolume,
        };
        const createdSnap = await api.snaps.create(
          uploadedVideoUrl && pendingVideoDurationMs
            ? {
                ...shared,
                videoUrl: uploadedVideoUrl,
                durationMs: pendingVideoDurationMs,
              }
            : { ...shared, imageUrl: uploadedImageUrl! },
        );
        queryClient.setQueryData<SnapGroup[]>(snapsQueryKey, (current) => {
          if (!current) {
            return [
              {
                user: createdSnap.user,
                snaps: [createdSnap],
                isOwn: true,
                hasUnseen: false,
              },
            ];
          }
          const ownGroup = current.find(
            (group) => group.isOwn || group.user.id === createdSnap.user.id,
          );
          if (!ownGroup) {
            return [
              {
                user: createdSnap.user,
                snaps: [createdSnap],
                isOwn: true,
                hasUnseen: false,
              },
              ...current,
            ];
          }
          return current.map((group) =>
            group === ownGroup
              ? group.snaps.some((snap) => snap.id === createdSnap.id)
                ? group
                : { ...group, snaps: [...group.snaps, createdSnap] }
              : group,
          );
        });
        await queryClient.invalidateQueries({
          queryKey: snapsQueryKey,
          refetchType: "active",
        });
        return { type: "snap", userId: createdSnap.user.id };
      },
    });
    router.dismissTo("/(tabs)");
  }

  if (choosingRestaurant) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullPageRestaurantPicker
          selectedRestaurant={restaurant}
          onSelect={(selected) => {
            setRestaurant(selected);
            setChoosingRestaurant(false);
          }}
          onBack={() => setChoosingRestaurant(false)}
        />
      </>
    );
  }

  const restaurantName =
    restaurant?.source === "FINDEAT"
      ? restaurant.restaurant.name
      : restaurant?.name;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      {imageUri || videoUri ? (
        <>
          {videoUri ? (
            <ContentVideo
              uri={videoUri}
              autoPlay
              loop
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              volume={soundSelection?.originalAudioVolume ?? 1}
            />
          ) : (
            <Image
              source={{ uri: imageUri! }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
          <SoundPlayback
            sound={soundSelection?.sound}
            startTimeMs={soundSelection?.soundStartTimeMs}
            volume={soundSelection?.soundVolume}
            playing={!soundPickerOpen}
          />
          <View style={[StyleSheet.absoluteFill, styles.previewScrim]} />
          <SafeAreaView edges={["top"]} style={styles.previewHeader}>
            <TouchableOpacity
              onPress={() => {
                setImageUri(null);
                setVideoUri(null);
                setVideoDurationMs(null);
              }}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/45"
            >
              <DirectionalIcon
                direction="back"
                size={24}
                color="#FAF9F6"
                weight="bold"
              />
            </TouchableOpacity>
            <Text className="ml-3 flex-1 text-xl font-bold text-white">
              {t("snaps:newSnap")}
            </Text>
            {imageUri ? (
              <TouchableOpacity
                accessibilityLabel={t("common:saveToGallery")}
                disabled={savingToGallery}
                onPress={() => void saveSnapPhotoToGallery()}
                className="mr-2 h-11 w-11 items-center justify-center rounded-full bg-black/45"
              >
                {savingToGallery ? (
                  <ActivityIndicator size="small" color="#FAF9F6" />
                ) : (
                  <DownloadSimpleIcon
                    size={21}
                    color="#FAF9F6"
                    weight="bold"
                  />
                )}
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setSoundPickerOpen(true)}
              className="h-11 flex-row items-center rounded-full bg-black/45 px-3"
            >
              <MusicNoteIcon size={19} color="#F7D786" weight="fill" />
              <Text numberOfLines={1} className="ml-1.5 max-w-28 font-bold text-white">
                {soundSelection?.sound.title ?? tSound("addSound")}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>

          <KeyboardAvoidingView
            behavior="padding"
            automaticOffset
            style={styles.previewKeyboardArea}
          >
            <SafeAreaView edges={["bottom"]} style={styles.previewComposer}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder={t("snaps:captionPlaceholder")}
                placeholderTextColor="#D1D5DB"
                maxLength={280}
                multiline
                style={{
                  minHeight: 48,
                  maxHeight: 110,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  color: "#FAF9F6",
                  fontSize: 16,
                  fontFamily: "CabinetRegular",
                  includeFontPadding: false,
                  textAlign: "auto",
                }}
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setChoosingRestaurant(true)}
                  className="min-w-0 flex-1 flex-row items-center rounded-2xl bg-white/15 px-4 py-3.5"
                >
                  <MapPinIcon size={20} color="#F7D786" weight="fill" />
                  <Text
                    numberOfLines={1}
                    className="ml-2 min-w-0 flex-1 font-bold text-white"
                  >
                    {restaurantName ?? t("snaps:tagRestaurant")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={publishing}
                  onPress={() => void publish()}
                  className="h-13 min-w-28 flex-row items-center justify-center rounded-2xl bg-white px-5"
                  style={{ opacity: publishing ? 0.65 : 1 }}
                >
                  {publishing ? (
                    <ActivityIndicator color="#111" />
                  ) : (
                    <>
                      <PaperPlaneTiltIcon
                        size={20}
                        color="#111"
                        weight="fill"
                      />
                      <Text className="ml-2 font-bold text-black">
                        {t("snaps:share")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </>
      ) : !cameraPermission ? (
        <ActivityIndicator
          style={styles.cameraLoader}
          color="#FAF9F6"
          size="large"
        />
      ) : !cameraPermission.granted ? (
        <SafeAreaView style={styles.permissionState}>
          <View className="px-5 pt-2">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common:cancel")}
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <XIcon size={23} color="#FAF9F6" weight="bold" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.permissionContent}
          >
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-[#F7D786]">
              <CameraIcon size={38} color="#171717" weight="fill" />
            </View>
            <Text className="mt-6 text-center text-[26px] font-bold leading-8 text-[#FAF9F6]">
              {t("snaps:cameraPermissionTitle")}
            </Text>
            <Text className="mt-3 max-w-sm text-center text-base leading-6 text-gray-400">
              {t("snaps:cameraPermissionBody")}
            </Text>
            <View className="mt-6 max-w-sm flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <LockIcon size={16} color="#D1D5DB" weight="fill" />
              </View>
              <Text className="ml-3 flex-1 text-sm leading-5 text-gray-300">
                {t("snaps:cameraPrivacy")}
              </Text>
            </View>
          </ScrollView>
          <View className="px-5 pb-3 pt-2">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                void (cameraPermission.canAskAgain
                  ? requestCameraPermission()
                  : Linking.openSettings())
              }
              className="rounded-2xl bg-[#F7D786] py-4"
            >
              <Text className="text-center text-base font-bold text-[#171717]">
                {t(
                  cameraPermission.canAskAgain
                    ? "snaps:allowCamera"
                    : "snaps:openSettings",
                )}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void chooseMedia()}
              className="mt-3 flex-row items-center justify-center rounded-2xl border border-white/15 py-4"
            >
              <ImagesIcon size={21} color="#F7D786" weight="fill" />
              <Text className="ml-2 text-base font-bold text-[#FAF9F6]">
                {t("snaps:choosePhoto")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.cameraStage}>
          <CameraView
            ref={cameraRef}
            active={!imageUri && !videoUri}
            facing={cameraFacing}
            mirror={false}
            flash={flash}
            mode="picture"
            onCameraReady={() => setCameraReady(true)}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top", "bottom"]} style={styles.cameraControls}>
            <View className="flex-row items-center justify-between px-5">
              <TouchableOpacity
                accessibilityLabel={t("common:close")}
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center"
              >
                <XIcon size={29} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-white">
                {t("snaps:newSnap")}
              </Text>
              <TouchableOpacity
                accessibilityLabel={t("snaps:toggleFlash")}
                onPress={() =>
                  setFlash((current) => (current === "off" ? "on" : "off"))
                }
                className="h-11 w-11 items-center justify-center"
              >
                {flash === "off" ? (
                  <LightningSlashIcon size={26} color="#FAF9F6" weight="bold" />
                ) : (
                  <LightningIcon size={26} color="#FAF9F6" weight="fill" />
                )}
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between px-8 pb-5">
              <TouchableOpacity
                accessibilityLabel={t("snaps:choosePhoto")}
                onPress={() => void chooseMedia()}
                className="h-12 w-12 items-center justify-center"
              >
                <ImagesIcon size={30} color="#FAF9F6" weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t("snaps:takePhoto")}
                disabled={!cameraReady || capturing}
                onPress={() => void takePhoto()}
                className="h-20 w-20 items-center justify-center rounded-full border-4 border-white"
                style={{ opacity: cameraReady && !capturing ? 1 : 0.55 }}
              >
                <View className="h-16 w-16 rounded-full bg-white" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t("snaps:flipCamera")}
                onPress={() =>
                  setCameraFacing((current) =>
                    current === "back" ? "front" : "back",
                  )
                }
                className="h-12 w-12 items-center justify-center"
              >
                <ArrowsClockwiseIcon size={30} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}
      <SoundPickerModal
        visible={soundPickerOpen}
        value={soundSelection}
        hasOriginalAudio={Boolean(videoUri)}
        onClose={() => setSoundPickerOpen(false)}
        onChange={setSoundSelection}
        surface="snap"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0B0A",
  },
  previewScrim: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  previewKeyboardArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  previewComposer: {
    gap: 12,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cameraLoader: {
    flex: 1,
  },
  cameraStage: {
    flex: 1,
    overflow: "hidden",
  },
  cameraControls: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  permissionState: {
    flex: 1,
    backgroundColor: "#0B0B0A",
  },
  permissionContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
});
