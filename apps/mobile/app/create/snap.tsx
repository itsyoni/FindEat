import FullPageRestaurantPicker from "@/components/restaurants/FullPageRestaurantPicker";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { snapsQueryKey } from "@/hooks/useSnaps";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { uploadImage } from "@/lib/uploadImage";
import type { SelectedRestaurant } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { usePostUpload } from "@/contexts/PostUploadContext";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import {
  CameraIcon,
  ImagesSquareIcon,
  MapPinIcon,
  PaperPlaneTiltIcon,
} from "phosphor-react-native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateSnapScreen() {
  const { t } = useTranslation(["snaps", "common"]);
  const queryClient = useQueryClient();
  const { startPostUpload } = usePostUpload();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [restaurant, setRestaurant] = useState<SelectedRestaurant | null>(null);
  const [choosingRestaurant, setChoosingRestaurant] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const publishStartedRef = useRef(false);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("snaps:cameraPermissionTitle"), t("snaps:cameraPermissionBody"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
      selectionLimit: 1,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
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
        void queryClient.invalidateQueries({ queryKey: snapsQueryKey });
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
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      {imageUri ? (
        <>
          <Image
            source={{ uri: imageUri }}
            contentFit="cover"
            style={{ position: "absolute", inset: 0 }}
          />
          <View className="absolute inset-0 bg-black/20" />
          <SafeAreaView edges={["top"]} className="flex-row items-center px-4">
            <TouchableOpacity
              onPress={() => setImageUri(null)}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/45"
            >
              <DirectionalIcon
                direction="back"
                size={24}
                color="#FFF"
                weight="bold"
              />
            </TouchableOpacity>
            <Text className="ml-3 text-xl font-bold text-white">
              {t("snaps:newSnap")}
            </Text>
          </SafeAreaView>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="mt-auto"
          >
            <SafeAreaView
              edges={["bottom"]}
              className="gap-3 bg-black/55 px-4 pb-3 pt-4"
            >
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
                  color: "#FFF",
                  fontSize: 16,
                  textAlign: "auto",
                }}
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setChoosingRestaurant(true)}
                  className="min-w-0 flex-1 flex-row items-center rounded-2xl bg-white/15 px-4 py-3.5"
                >
                  <MapPinIcon size={20} color="#F7D786" weight="fill" />
                  <Text numberOfLines={1} className="ml-2 min-w-0 flex-1 font-bold text-white">
                    {restaurantName ?? t("snaps:tagRestaurant")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={publishing}
                  onPress={() => void publish()}
                  className="h-[52px] min-w-28 flex-row items-center justify-center rounded-2xl bg-white px-5"
                  style={{ opacity: publishing ? 0.65 : 1 }}
                >
                  {publishing ? (
                    <ActivityIndicator color="#111" />
                  ) : (
                    <>
                      <PaperPlaneTiltIcon size={20} color="#111" weight="fill" />
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
      ) : (
        <SafeAreaView edges={["top", "bottom"]} className="flex-1 px-5">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center"
            >
              <DirectionalIcon
                direction="back"
                size={25}
                color="#FFF"
                weight="bold"
              />
            </TouchableOpacity>
            <Text className="ml-2 text-xl font-bold text-white">
              {t("snaps:newSnap")}
            </Text>
          </View>

          <View className="flex-1 justify-center pb-16">
            <Text className="text-center text-3xl font-bold text-white">
              {t("snaps:captureMoment")}
            </Text>
            <Text className="mx-8 mt-3 text-center text-base leading-6 text-gray-400">
              {t("snaps:expiresHint")}
            </Text>
            <TouchableOpacity
              onPress={() => void takePhoto()}
              className="mt-9 flex-row items-center rounded-3xl bg-white p-5"
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-black">
                <CameraIcon size={29} color="#FFF" weight="fill" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-black">
                  {t("snaps:takePhoto")}
                </Text>
                <Text className="mt-1 text-sm text-gray-500">
                  {t("snaps:takePhotoHint")}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void choosePhoto()}
              className="mt-3 flex-row items-center rounded-3xl border border-white/15 bg-white/10 p-5"
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <ImagesSquareIcon size={29} color="#F7D786" weight="fill" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-white">
                  {t("snaps:choosePhoto")}
                </Text>
                <Text className="mt-1 text-sm text-gray-400">
                  {t("snaps:choosePhotoHint")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
