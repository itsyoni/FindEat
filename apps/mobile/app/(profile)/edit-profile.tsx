import { AppAlert as Alert } from "@/lib/appAlert";
import { AppButton, IconButton, Skeleton, SkeletonPulse } from "@/components/common";
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
import ImageCropPicker from "react-native-image-crop-picker";
import { router } from "expo-router";
import { DirectionalBackIcon } from "@/components/common/icons/DirectionalIcon";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
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
          showPronouns: data.showPronouns ?? true,
          allergies: data.allergies ?? [],
          foodPreferences: data.foodPreferences ?? [],
          dietaryRestrictions: data.dietaryRestrictions ?? [],
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
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}>
        <SkeletonPulse>
          <View className="flex-row items-center px-5 pt-4"><Skeleton width={42} height={42} circle /><Skeleton width="38%" height={24} radius={9} style={{ marginLeft: 10 }} /></View>
          <View className="px-5 pb-10">
            <Skeleton height={192} radius={24} style={{ marginTop: 24 }} />
            <View className="mt-8 items-center"><Skeleton width={96} height={96} circle /><Skeleton width={150} height={13} radius={6} style={{ marginTop: 12 }} /></View>
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
        favoriteCuisines: details.favoriteCuisines,
        profileCompletedFields: details.completedFields,
        showPronouns: details.showPronouns,
      });

      await refreshUser();
      router.back();
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

  async function pickImage(
    aspect: [number, number],
    onSelect: (uri: string) => void,
  ) {
    const isAvatar = aspect[0] === aspect[1];
    const cropOptions = {
      width: isAvatar ? 1000 : 1800,
      height: isAvatar ? 1000 : 600,
      cropping: true,
      cropperCircleOverlay: isAvatar,
      freeStyleCropEnabled: false,
      mediaType: "photo" as const,
      compressImageQuality: 0.8,
      forceJpg: true,
      cropperToolbarTitle: isAvatar
        ? t("profile:cropProfilePhoto")
        : t("profile:cropCoverPhoto"),
    };

    async function openCamera() {
      try {
        const image = await ImageCropPicker.openCamera(cropOptions);
        onSelect(image.path);
      } catch (error) {
        if ((error as { code?: string }).code !== "E_PICKER_CANCELLED") {
          console.error("Could not open profile camera or crop photo", error);
          Alert.alert(t("common:error"), t("profile:imagePickerError"));
        }
      }
    }

    async function openLibrary() {
      try {
        const image = await ImageCropPicker.openPicker(cropOptions);
        onSelect(image.path);
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

    Alert.alert(t("profile:chooseImage"), t("profile:chooseImageDescription"), [
      {
        text: t("profile:takePhoto"),
        onPress: openCamera,
      },
      {
        text: t("profile:chooseFromLibrary"),
        onPress: openLibrary,
      },
      {
        text: t("profile:removeProfilePicture"),
        style: "destructive",
        onPress: removeProfilePicture,
      },
      {
        text: t("common:cancel"),
        style: "cancel",
      },
    ]);
  }

  async function pickAvatar() {
    await pickImage([1, 1], setNewAvatarUri);
  }

  function handleBack() {
    if (!hasChanges) {
      router.back();
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
          onPress: () => router.back(),
        },
        {
          text: t("common:save"),
          onPress: saveProfile,
        },
      ],
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#FBFAF8" }}
    >
      <View style={{ flex: 1 }}>
        <KeyboardAwareFormScrollView
          className="flex-1 bg-canvas dark:bg-black"
          contentInsetAdjustmentBehavior="automatic"
          bottomOffset={28}
        >
        <View className="flex-row items-center px-5 pt-4">
          <IconButton
            icon={DirectionalBackIcon}
            variant="ghost"
            onPress={handleBack}
          />

          <Text className="ml-2 text-2xl font-bold text-black dark:text-white">
            {t("profile:editProfile")}
          </Text>
        </View>
        <View className="px-5 pb-10">
          <ProfileCompletion
            percentage={profileCompletion}
            completed={completion.completed}
            total={completion.total}
          />

          <TouchableOpacity
            onPress={() => pickImage([3, 1], setNewCoverUri)}
            className="mt-6 h-48 overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800"
          >
            {newCoverUri || coverUrl ? (
              <ProgressiveImage
                source={{ uri: newCoverUri ?? coverUrl ?? "" }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Text className="text-gray-500">
                  {t("profile:addCoverPhoto")}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickAvatar}
            className={"mt-8 items-center"}
          >
            <Avatar uri={displayedAvatar} username={username} size={96} />

            <Text className="mt-3 font-semibold text-black dark:text-white">
              {t("profile:changeProfilePhoto")}
            </Text>
          </TouchableOpacity>

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
