import {
  AppAlert as Alert,
  type AppAlertButton,
} from "@/lib/appAlert";
import { AppButton, Skeleton, SkeletonPulse } from "@/components/common";
import ConfettiBurst from "@/components/common/feedback/ConfettiBurst";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import FormInput from "@/components/forms/FormInput";
import ProfileDetailsEditor, {
  EMPTY_PROFILE_DETAILS,
  PROFILE_DETAIL_ANSWER_FIELDS,
  type ProfileDetailsDraft,
} from "@/components/profile/ProfileDetailsEditor";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getErrorMessage } from "@findeat/utils";
import { uploadImage } from "@/lib/uploadImage";
import { normalizeFrontCameraPhoto } from "@/lib/normalizeCameraPhoto";
import SingleImageCropEditor, {
  type EditableImage,
} from "@/components/create/SingleImageCropEditor";
import * as ImagePicker from "expo-image-picker";
import {
  CameraView,
  type CameraType,
  type FlashMode,
  useCameraPermissions,
} from "expo-camera";
import { router } from "expo-router";
import { DirectionalBackIcon } from "@/components/common/icons/DirectionalIcon";
import {
  ArrowsClockwiseIcon,
  ImagesIcon,
  LightningIcon,
  LightningSlashIcon,
  XIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getProfileCompletion } from "@/lib/profileCompletion";

export default function EditProfileScreen() {
  const { t } = useTranslation(["profile", "common"]);
  const { isDark } = useAppTheme();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [details, setDetails] = useState<ProfileDetailsDraft>(EMPTY_PROFILE_DETAILS);
  const [originalDetails, setOriginalDetails] =
    useState<ProfileDetailsDraft>(EMPTY_PROFILE_DETAILS);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [newCoverUri, setNewCoverUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const previousCompletion = useRef<number | null>(null);
  const profileCameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [profileCameraOpen, setProfileCameraOpen] = useState(false);
  const [profileCameraFacing, setProfileCameraFacing] =
    useState<CameraType>("front");
  const [profileCameraFlash, setProfileCameraFlash] =
    useState<FlashMode>("off");
  const [profileCameraCapture, setProfileCameraCapture] =
    useState<EditableImage | null>(null);
  const [pendingProfileImage, setPendingProfileImage] = useState<{
    image: EditableImage;
    kind: "avatar" | "cover";
  } | null>(null);
  const [profileCameraCapturing, setProfileCameraCapturing] = useState(false);
  const [profileCameraApplying, setProfileCameraApplying] = useState(false);
  const [profileCameraPickingLibrary, setProfileCameraPickingLibrary] =
    useState(false);
  const { refreshUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [original, setOriginal] = useState<{
    username: string;
    displayName: string;
    bio: string;
  }>({
    username: "",
    displayName: "",
    bio: "",
  });

  const displayedAvatar = newAvatarUri || avatarUrl;

  function closeEditProfile() {
    router.dismissTo("/(tabs)/profile");
  }

  const hasChanges =
    username !== original.username ||
    displayName !== original.displayName ||
    bio !== (original.bio ?? "") ||
    JSON.stringify(details) !== JSON.stringify(originalDetails) ||
    newAvatarUri !== null ||
    newCoverUri !== null;

  const completion = getProfileCompletion({
    avatarUrl: newAvatarUri || avatarUrl,
    coverUrl: newCoverUri || coverUrl,
    displayName,
    username,
    bio,
    birthday: details.birthday,
    pronouns: details.pronouns,
    allergies: details.allergies,
    foodPreferences: details.foodPreferences,
    dietaryRestrictions: details.dietaryRestrictions,
    restaurantDietaryRequirements: details.restaurantDietaryRequirements,
    favoriteCuisines: details.favoriteCuisines,
    profileCompletedFields: details.completedFields,
  });
  const profileCompletion = completion.percentage;

  useEffect(() => {
    if (initialLoading) return;

    if (
      previousCompletion.current !== null &&
      previousCompletion.current < 100 &&
      profileCompletion === 100
    ) {
      setShowConfetti(true);
    }

    previousCompletion.current = profileCompletion;
  }, [initialLoading, profileCompletion]);

  const finishConfetti = useCallback(() => setShowConfetti(false), []);

  useEffect(() => {
    let cancelled = false;

    api.users
      .me()
      .then((data) => {
        if (cancelled) return;

        const nextDetails: ProfileDetailsDraft = {
          birthday: data.birthday?.slice(0, 10) ?? "",
          pronouns: data.pronouns
            ? data.pronouns.split(" · ").map((item) => item.trim()).filter(Boolean)
            : [],
          allergies: data.allergies ?? [],
          foodPreferences: data.foodPreferences ?? [],
          dietaryRestrictions: data.dietaryRestrictions ?? [],
          restaurantDietaryRequirements:
            data.restaurantDietaryRequirements ?? [],
          favoriteCuisines: data.favoriteCuisines ?? [],
          completedFields: PROFILE_DETAIL_ANSWER_FIELDS.filter(
            (field) =>
              data.profileCompletedFields?.includes(field) ||
              (field === "birthday"
                ? Boolean(data.birthday)
                : field === "pronouns"
                  ? Boolean(data.pronouns)
                  : (data[field]?.length ?? 0) > 0),
          ),
        };
        setOriginal({
          username: data.username ?? "",
          displayName: data.displayName ?? "",
          bio: data.bio ?? "",
        });
        setAvatarUrl(data.avatarUrl ?? null);
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        setDisplayName(data.displayName ?? "");
        setCoverUrl(data.coverUrl ?? null);
        setDetails(nextDetails);
        setOriginalDetails(nextDetails);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (initialLoading) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
      >
        <SkeletonPulse>
          <View className="relative">
            <Skeleton height={288} radius={0} />
            <SafeAreaView
              edges={["top"]}
              style={{ position: "absolute", left: 0, right: 0, top: 0 }}
            >
              <View className="flex-row items-center px-4 pt-2">
                <Skeleton width={44} height={44} circle />
                <Skeleton width="38%" height={24} radius={9} style={{ marginLeft: 10 }} />
              </View>
            </SafeAreaView>
          </View>
          <View
            className="-mt-7 rounded-t-[30px] px-5 pb-10"
            style={{ backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
          >
            <View className="items-center">
              <Skeleton width={112} height={112} circle style={{ marginTop: -56 }} />
              <Skeleton width={150} height={13} radius={6} style={{ marginTop: 12 }} />
            </View>
            <Skeleton width="28%" height={21} radius={8} style={{ marginTop: 32, marginBottom: 14 }} />
            {[0, 1].map((item) => <View key={item} className="mb-5 gap-2"><Skeleton width="26%" height={11} radius={5} /><Skeleton height={52} radius={14} /></View>)}
            <View className="mb-5 gap-2"><Skeleton width="16%" height={11} radius={5} /><Skeleton height={104} radius={14} /></View>
            <Skeleton height={48} radius={14} />
          </View>
        </SkeletonPulse>
      </SafeAreaView>
    );
  }

  async function saveProfile() {
    if (!username.trim()) {
      Alert.alert(
        t("profile:missingUsername"),
        t("profile:missingUsernameDescription"),
      );
      return;
    }

    if (!displayName.trim()) {
      Alert.alert(
        t("profile:missingDisplayName"),
        t("profile:missingDisplayNameDescription"),
      );
      return;
    }

    try {
      setLoading(true);

      const finalCoverUrl = newCoverUri
        ? await uploadImage(newCoverUri, "cover")
        : coverUrl;
      const finalAvatarUrl = newAvatarUri
        ? await uploadImage(newAvatarUri, "avatar")
        : avatarUrl;

      await api.users.updateMe({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
        avatarUrl: finalAvatarUrl ?? undefined,
        coverUrl: finalCoverUrl,
        birthday: details.birthday || null,
        pronouns: details.pronouns.length ? details.pronouns.join(" · ") : null,
        allergies: details.allergies,
        foodPreferences: details.foodPreferences,
        dietaryRestrictions: details.dietaryRestrictions,
        restaurantDietaryRequirements: details.restaurantDietaryRequirements,
        favoriteCuisines: details.favoriteCuisines,
        profileCompletedFields: details.completedFields,
        showPronouns: details.pronouns.length > 0,
      });

      await refreshUser();
      closeEditProfile();
    } catch (error) {
      console.error(error);

      Alert.alert(
        t("common:error"),
        getErrorMessage(error, t("profile:updateError")),
      );
    } finally {
      setLoading(false);
    }
  }

  async function openProfileCamera() {
    let permission = cameraPermission;
    if (!permission?.granted && permission?.canAskAgain !== false) {
      permission = await requestCameraPermission();
    }
    setProfileCameraFacing("front");
    setProfileCameraFlash("off");
    setProfileCameraCapture(null);
    setProfileCameraOpen(true);
  }

  function closeProfileCamera() {
    if (profileCameraApplying) return;
    setProfileCameraOpen(false);
    setProfileCameraCapture(null);
  }

  async function takeProfileCameraPhoto() {
    if (!profileCameraRef.current || profileCameraCapturing) return;

    try {
      setProfileCameraCapturing(true);
      const photo = await profileCameraRef.current.takePictureAsync({
        quality: 0.9,
        mirror: false,
      });
      const corrected =
        profileCameraFacing === "front"
          ? await normalizeFrontCameraPhoto(photo.uri)
          : photo;
      setProfileCameraCapture({
        uri: corrected.uri,
        width: Math.max(1, Math.round(corrected.width)),
        height: Math.max(1, Math.round(corrected.height)),
      });
    } catch (error) {
      console.error("Could not capture profile photo", error);
      Alert.alert(t("common:error"), t("profile:imagePickerError"));
    } finally {
      setProfileCameraCapturing(false);
    }
  }

  async function chooseProfilePhotoFromCameraGallery() {
    if (profileCameraPickingLibrary || profileCameraApplying) return;

    try {
      setProfileCameraPickingLibrary(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: false,
        selectionLimit: 1,
        defaultTab: "photos",
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      const asset = result.assets[0];
      setPendingProfileImage({
        kind: "avatar",
        image: {
          uri: asset.uri,
          width: Math.max(1, Math.round(asset.width)),
          height: Math.max(1, Math.round(asset.height)),
        },
      });
      setProfileCameraOpen(false);
      setProfileCameraCapture(null);
    } catch (error) {
      if ((error as { code?: string }).code !== "E_PICKER_CANCELLED") {
        console.error("Could not open profile camera gallery", error);
        Alert.alert(t("common:error"), t("profile:imagePickerError"));
      }
    } finally {
      setProfileCameraPickingLibrary(false);
    }
  }

  async function applyProfileCameraPhoto() {
    if (!profileCameraCapture || profileCameraApplying) return;

    setProfileCameraApplying(true);
    setPendingProfileImage({
      kind: "avatar",
      image: profileCameraCapture,
    });
    setProfileCameraOpen(false);
    setProfileCameraCapture(null);
    setProfileCameraApplying(false);
  }

  async function pickImage(kind: "avatar" | "cover") {
    const isAvatar = kind === "avatar";

    async function openCamera() {
      try {
        if (isAvatar) {
          await openProfileCamera();
          return;
        }

        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(t("common:error"), t("profile:imagePickerError"));
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.9,
          cameraType: ImagePicker.CameraType.back,
        });
        if (result.canceled || !result.assets[0]?.uri) return;

        const captured = result.assets[0];
        setPendingProfileImage({
          kind,
          image: {
            uri: captured.uri,
            width: Math.max(1, Math.round(captured.width)),
            height: Math.max(1, Math.round(captured.height)),
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "E_PICKER_CANCELLED") {
          console.error("Could not open profile camera or crop photo", error);
          Alert.alert(t("common:error"), t("profile:imagePickerError"));
        }
      }
    }

    async function openLibrary() {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          allowsMultipleSelection: false,
          selectionLimit: 1,
          defaultTab: "photos",
          quality: 0.9,
        });
        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        setPendingProfileImage({
          kind,
          image: {
            uri: asset.uri,
            width: Math.max(1, Math.round(asset.width)),
            height: Math.max(1, Math.round(asset.height)),
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "E_PICKER_CANCELLED") {
          console.error("Could not open profile gallery or crop photo", error);
          Alert.alert(t("common:error"), t("profile:imagePickerError"));
        }
      }
    }

    async function removeProfilePicture() {
      try {
        const result = await api.users.removeAvatar();

        setAvatarUrl(result.avatarUrl);
        setNewAvatarUri(null);
      } catch (error) {
        console.error(error);
        Alert.alert(
          t("common:error"),
          getErrorMessage(error, t("profile:removeProfilePictureError")),
        );
      }
    }

    const actions: AppAlertButton[] = [
      {
        text: t("profile:takePhoto"),
        icon: "camera",
        onPress: openCamera,
      },
      {
        text: t("profile:chooseFromLibrary"),
        icon: "gallery",
        onPress: openLibrary,
      },
    ];

    if (isAvatar && displayedAvatar) {
      actions.push({
        text: t("profile:removeProfilePicture"),
        icon: "trash",
        style: "destructive",
        onPress: removeProfilePicture,
      });
    }

    actions.push({
      text: t("common:cancel"),
      icon: "close",
      style: "cancel",
    });

    Alert.alert(
      isAvatar
        ? t("profile:profilePhoto")
        : t(
            newCoverUri || coverUrl
              ? "profile:changeCoverPhoto"
              : "profile:addCoverPhoto",
          ),
      t("profile:chooseImageDescription"),
      actions,
      {
        tone: "default",
        illustration: "none",
        cancelable: true,
      },
    );
  }

  async function pickAvatar() {
    await pickImage("avatar");
  }

  function handleBack() {
    if (!hasChanges) {
      closeEditProfile();
      return;
    }

    Alert.alert(
      t("profile:unsavedChanges"),
      t("profile:unsavedChangesDescription"),
      [
        {
          text: t("common:cancel"),
          style: "cancel",
        },
        {
          text: t("profile:discard"),
          style: "destructive",
          onPress: closeEditProfile,
        },
        {
          text: t("common:save"),
          onPress: saveProfile,
        },
      ],
    );
  }

  if (pendingProfileImage) {
    const isAvatar = pendingProfileImage.kind === "avatar";
    return (
      <SingleImageCropEditor
        image={pendingProfileImage.image}
        aspectRatio={isAvatar ? 1 : 4 / 3}
        outputWidth={isAvatar ? 1000 : 1200}
        outputHeight={isAvatar ? 1000 : 900}
        canvasAspectRatio={isAvatar ? 9 / 16 : undefined}
        cropShape={isAvatar ? "circle" : "rectangle"}
        showEditorTools={false}
        showHeaderCounter={false}
        headerTitle={t("profile:cropImage")}
        primaryActionLabel={t("common:done")}
        onCancel={() => setPendingProfileImage(null)}
        onApply={(image) => {
          if (isAvatar) setNewAvatarUri(image.uri);
          else setNewCoverUri(image.uri);
          setPendingProfileImage(null);
        }}
      />
    );
  }

  if (profileCameraOpen) {
    const cameraGranted = cameraPermission?.granted === true;

    return (
      <View style={{ flex: 1, backgroundColor: "#0B0B0A" }}>
        {cameraGranted ? (
          <>
            {profileCameraCapture ? (
              <ProgressiveImage
                source={{ uri: profileCameraCapture.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <CameraView
                ref={profileCameraRef}
                active={!profileCameraPickingLibrary}
                facing={profileCameraFacing}
                mirror={false}
                flash={profileCameraFlash}
                mode="picture"
                style={StyleSheet.absoluteFill}
              />
            )}

            <SafeAreaView
              edges={["top", "bottom"]}
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none"
            >
              <View className="flex-1 justify-between px-5 pb-5">
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity
                    accessibilityLabel={t("common:close")}
                    onPress={closeProfileCamera}
                    className="h-11 w-11 items-center justify-center"
                  >
                    <XIcon size={29} color="#FAF9F6" weight="bold" />
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-[#FAF9F6]">
                    {t("profile:profilePhoto")}
                  </Text>
                  {profileCameraCapture ? (
                    <View className="h-11 w-11" />
                  ) : (
                    <TouchableOpacity
                      accessibilityLabel={t("profile:toggleFlash")}
                      onPress={() =>
                        setProfileCameraFlash((current) =>
                          current === "off" ? "on" : "off",
                        )
                      }
                      className="h-11 w-11 items-center justify-center"
                    >
                      {profileCameraFlash === "off" ? (
                        <LightningSlashIcon
                          size={27}
                          color="#FAF9F6"
                          weight="bold"
                        />
                      ) : (
                        <LightningIcon
                          size={27}
                          color="#F7D786"
                          weight="fill"
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {profileCameraCapture ? (
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={profileCameraApplying}
                      onPress={() => {
                        setProfileCameraCapture(null);
                      }}
                      className="items-center justify-center rounded-2xl bg-[#242422]/95 px-5 py-4"
                      style={{ width: 0, flexGrow: 1, flexShrink: 1 }}
                    >
                      <Text className="font-bold text-[#FAF9F6]">
                        {t("profile:retake")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={profileCameraApplying}
                      onPress={() => void applyProfileCameraPhoto()}
                      className="flex-row items-center justify-center rounded-2xl bg-[#F7D786] px-5 py-4"
                      style={{ width: 0, flexGrow: 1, flexShrink: 1 }}
                    >
                      {profileCameraApplying ? (
                        <ActivityIndicator color="#171717" />
                      ) : (
                        <Text className="font-bold text-[#171717]">
                          {t("profile:usePhoto")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between px-5">
                    <TouchableOpacity
                      accessibilityLabel={t("profile:chooseFromLibrary")}
                      disabled={profileCameraPickingLibrary}
                      onPress={() =>
                        void chooseProfilePhotoFromCameraGallery()
                      }
                      className="h-12 w-12 items-center justify-center"
                    >
                      {profileCameraPickingLibrary ? (
                        <ActivityIndicator color="#FAF9F6" />
                      ) : (
                        <ImagesIcon
                          size={30}
                          color="#FAF9F6"
                          weight="fill"
                        />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel={t("profile:takePhoto")}
                      disabled={
                        profileCameraCapturing || profileCameraPickingLibrary
                      }
                      onPress={() => void takeProfileCameraPhoto()}
                      className="h-20 w-20 items-center justify-center rounded-full border-4 border-[#FAF9F6]"
                      style={{
                        opacity:
                          !profileCameraCapturing &&
                          !profileCameraPickingLibrary
                            ? 1
                            : 0.65,
                      }}
                    >
                      <View className="h-16 w-16 rounded-full bg-[#FAF9F6]" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel={t("profile:flipCamera")}
                      onPress={() => {
                        setProfileCameraFacing((current) =>
                          current === "front" ? "back" : "front",
                        );
                      }}
                      className="h-12 w-12 items-center justify-center"
                    >
                      <ArrowsClockwiseIcon
                        size={30}
                        color="#FAF9F6"
                        weight="bold"
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </>
        ) : (
          <SafeAreaView
            edges={["top", "bottom"]}
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}
          >
            <Text className="text-center text-2xl font-bold text-[#FAF9F6]">
              {t("profile:cameraPermissionTitle")}
            </Text>
            <Text className="mt-3 text-center leading-6 text-[#C9C7C1]">
              {t("profile:cameraPermission")}
            </Text>
            <TouchableOpacity
              onPress={() =>
                void (cameraPermission?.canAskAgain
                  ? requestCameraPermission()
                  : Linking.openSettings())
              }
              className="mt-7 rounded-2xl bg-[#F7D786] py-4"
            >
              <Text className="text-center font-bold text-[#171717]">
                {t(
                  cameraPermission?.canAskAgain
                    ? "profile:allowCamera"
                    : "profile:openSettings",
                )}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={closeProfileCamera} className="py-4">
              <Text className="text-center font-semibold text-[#FAF9F6]">
                {t("common:cancel")}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <View style={{ flex: 1 }}>
        <KeyboardAwareFormScrollView
          className="flex-1 bg-canvas dark:bg-black"
          contentInsetAdjustmentBehavior="never"
          bottomOffset={28}
        >
          <View className="relative">
          <View>
            <View className="h-72 overflow-hidden bg-gray-100 dark:bg-gray-800">
              {newCoverUri || coverUrl ? (
                <ProgressiveImage
                  source={{ uri: newCoverUri ?? coverUrl ?? "" }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-full w-full" />
              )}
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void pickImage("cover")}
                className="absolute bottom-10 right-4 rounded-full bg-[#171717]/75 px-3 py-2"
              >
                <Text className="text-xs font-bold text-[#FAF9F6]">
                  {newCoverUri || coverUrl
                    ? t("profile:changeCoverPhoto")
                    : t("profile:addCoverPhoto")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <SafeAreaView
            edges={["top"]}
            pointerEvents="box-none"
            style={{ position: "absolute", left: 0, right: 0, top: 0 }}
          >
            <View className="flex-row items-center px-4 pt-2">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("common:back")}
                onPress={handleBack}
                className="h-11 w-11 items-center justify-center rounded-full bg-[#171717]/55"
              >
                <DirectionalBackIcon size={24} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
              <Text
                className="ml-3 text-2xl font-bold text-[#FAF9F6]"
                style={{
                  textShadowColor: "rgba(0,0,0,0.75)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
              >
                {t("profile:editProfile")}
              </Text>
            </View>
          </SafeAreaView>
          </View>

          <View
            className="-mt-7 rounded-t-[30px] px-5 pb-10"
            style={{ backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
          >
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.85}
              className="items-center self-center"
              style={{ marginTop: -56 }}
            >
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 112,
                  height: 112,
                  borderWidth: 2,
                  borderColor: isDark ? "#0B0B0A" : "#FBFAF8",
                  backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8",
                }}
              >
                <Avatar
                  uri={displayedAvatar}
                  username={username}
                  size={104}
                  showSnapIndicator={false}
                />
              </View>

              <Text className="mt-2 font-semibold text-black dark:text-white">
                {t("profile:changeProfilePhoto")}
              </Text>
            </TouchableOpacity>

            <ProfileCompletion
              percentage={profileCompletion}
              completed={completion.completed}
              total={completion.total}
            />

          <SectionTitle title={t("profile:account")} />

          <FormInput
            label={t("profile:displayName")}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t("profile:displayName")}
          />

          <FormInput
            label={t("common:username")}
            value={username}
            onChangeText={setUsername}
            placeholder={t("common:username")}
            autoCapitalize="none"
          />

          <FormInput
            label={t("profile:bio")}
            value={bio}
            onChangeText={setBio}
            placeholder={t("profile:bioPlaceholder")}
            multiline
          />

          <SectionTitle title={t("profile:personalization")} />
          <ProfileDetailsEditor value={details} onChange={setDetails} />
        </View>
        </KeyboardAwareFormScrollView>
        <View className="border-t border-black/5 bg-canvas px-5 pb-2 pt-3 dark:border-white/10 dark:bg-black">
          <AppButton
            title={loading ? t("common:saving") : t("common:save")}
            onPress={saveProfile}
            disabled={loading}
          />
        </View>
      </View>
      {showConfetti && profileCompletion === 100 && (
        <ConfettiBurst onComplete={finishConfetti} />
      )}
    </SafeAreaView>
  );
}

function ProfileCompletion({
  percentage,
  completed,
  total,
}: {
  percentage: number;
  completed: number;
  total: number;
}) {
  const { t } = useTranslation("profile");

  return (
    <View className="mt-5 rounded-3xl bg-[#F1EFEA] p-4 dark:bg-gray-900">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-bold text-black dark:text-white">
            {t("profileCompletion")}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
            {percentage === 100
              ? t("profileCompletionDone")
              : t("profileCompletionHint", {
                  count: total - completed,
                })}
          </Text>
        </View>
        <Text className="text-xl font-bold text-amber-600 dark:text-amber-300">
          {percentage}%
        </Text>
      </View>
      {percentage < 100 && (
        <View className="mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <View
            className="h-full rounded-full bg-amber-400"
            style={{ width: `${percentage}%` }}
          />
        </View>
      )}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="mb-3 mt-8 text-xl font-bold text-black dark:text-white">
      {title}
    </Text>
  );
}
