import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { snapsQueryKey } from "@/hooks/useSnaps";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { uploadImage } from "@/lib/uploadImage";
import type { SelectedRestaurant, SnapGroup } from "@findeat/types";
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
import { router, Stack } from "expo-router";
import {
  ArrowsClockwiseIcon,
  ImagesIcon,
  LightningIcon,
  LightningSlashIcon,
  MapPinIcon,
  PaperPlaneTiltIcon,
  XIcon,
} from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateSnapScreen() {
  const { t } = useTranslation(["snaps", "common"]);
  const queryClient = useQueryClient();
  const { startPostUpload } = usePostUpload();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [caption, setCaption] = useState("");
  const [restaurant, setRestaurant] = useState<SelectedRestaurant | null>(null);
  const [choosingRestaurant, setChoosingRestaurant] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const publishStartedRef = useRef(false);

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) setImageUri(photo.uri);
    } catch {
      Alert.alert(t("common:error"), t("snaps:captureError"));
    } finally {
      setCapturing(false);
    }
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("snaps:photosPermissionTitle"),
        t("snaps:photosPermissionBody"),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }

  function publish() {
    if (!imageUri || publishing || publishStartedRef.current) return;

    setPublishing(true);
    publishStartedRef.current = true;
    const pendingImageUri = imageUri;
    const pendingCaption = caption.trim() || undefined;
    const pendingRestaurant = restaurant;

    startPostUpload({
      kind: "snap",
      run: async (reportProgress) => {
        reportProgress(0.04);
        const imageUrl = await uploadImage(
          pendingImageUri,
          "snap",
          (progress) => reportProgress(0.08 + progress * 0.78),
        );
        reportProgress(0.88);
        const restaurantId =
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

        reportProgress(0.94);
        const createdSnap = await api.snaps.create({
          imageUrl,
          caption: pendingCaption,
          restaurantId,
        });
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
              ? { ...group, snaps: [...group.snaps, createdSnap] }
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
      {imageUri ? (
        <>
          <Image
            source={{ uri: imageUri }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.previewScrim]} />
          <SafeAreaView edges={["top"]} style={styles.previewHeader}>
            <TouchableOpacity
              onPress={() => setImageUri(null)}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/45"
            >
              <DirectionalIcon
                direction="back"
                size={24}
                color="#FAF9F6"
                weight="bold"
              />
            </TouchableOpacity>
            <Text className="ml-3 text-xl font-bold text-white">
              {t("snaps:newSnap")}
            </Text>
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
        <ActivityIndicator style={styles.cameraLoader} color="#FAF9F6" size="large" />
      ) : !cameraPermission.granted ? (
        <SafeAreaView style={styles.permissionState}>
          <Text className="text-center text-lg font-bold text-white">
            {t("snaps:cameraPermissionTitle")}
          </Text>
          <Text className="mt-2 text-center text-white/70">
            {t("snaps:cameraPermissionBody")}
          </Text>
          {cameraPermission.canAskAgain ? (
            <TouchableOpacity
              onPress={() => void requestCameraPermission()}
              className="mt-5 rounded-full bg-white px-6 py-3"
            >
              <Text className="font-bold text-black">{t("snaps:allowCamera")}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => router.back()} className="mt-5 px-6 py-3">
            <Text className="font-bold text-white">{t("common:close")}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : (
        <View style={styles.cameraStage}>
          <CameraView
            ref={cameraRef}
            active={!imageUri}
            facing={cameraFacing}
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
              <Text className="text-lg font-bold text-white">{t("snaps:newSnap")}</Text>
              <TouchableOpacity
                accessibilityLabel={t("snaps:toggleFlash")}
                onPress={() => setFlash((current) => (current === "off" ? "on" : "off"))}
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
                onPress={() => void choosePhoto()}
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
                  setCameraFacing((current) => (current === "back" ? "front" : "back"))
                }
                className="h-12 w-12 items-center justify-center"
              >
                <ArrowsClockwiseIcon size={30} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
});
