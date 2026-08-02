import Avatar from "@/components/common/Avatar";
import FullScreenImageViewer from "@/components/common/FullScreenImageViewer";
import { Profile } from "@findeat/types/profile";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Text from "../common/AppText";
import ProfileManagedRestaurants from "./ProfileManagedRestaurants";
import ProfileDetails from "./ProfileDetails";
import { useTranslation } from "react-i18next";
import {
  BookmarkSimpleIcon,
  GearSixIcon,
  PencilSimpleIcon,
} from "phosphor-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton, SkeletonPulse } from "../common";
import ParallaxProfileCover from "./ParallaxProfileCover";
import { useAppTheme } from "@/contexts/ThemeContext";
import CreatorLevelBadge from "./CreatorLevelBadge";
import ProfileTagBadge from "./ProfileTagBadge";
import { getProfileCompletion } from "@/lib/profileCompletion";
import { DirectionalForwardIcon } from "@/components/common/icons/DirectionalIcon";
import { useSnapIndicator } from "@/contexts/SnapIndicatorContext";
import { useRef, useState } from "react";

type Props = {
  profile?: Profile | null;
  loading?: boolean;
  scrollY: SharedValue<number>;
};

export default function PersonalProfileHeader({ profile, loading = false, scrollY }: Props) {
  const { t } = useTranslation(["common", "profile"]);
  const { isDark } = useAppTheme();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarLongPressRef = useRef(false);
  const snapIndicator = useSnapIndicator({
    userId: profile?.id,
    username: profile?.username,
    avatarUrl: profile?.avatarUrl,
  });
  const hasSnap = snapIndicator !== null;
  const completion = profile ? getProfileCompletion(profile) : null;

  function openSnap() {
    if (!profile || !hasSnap || avatarLongPressRef.current) return;
    router.push({
      pathname: "/snaps/[userId]",
      params: { userId: profile.id },
    });
  }

  function openAvatarPicture() {
    avatarLongPressRef.current = true;
    setAvatarOpen(true);
  }

  if (loading || !profile) {
    return (
      <SkeletonPulse>
        <View style={{ backgroundColor: isDark ? "#000" : "#FFF" }}>
          <View className="relative">
            <Skeleton height={240} radius={0} />
            <SafeAreaView edges={["top"]} style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
              <View className="items-end px-4 pt-2"><Skeleton width={44} height={44} circle /></View>
            </SafeAreaView>
          </View>
          <View
            className="-mt-7 items-center rounded-t-[30px] pb-5"
            style={{ backgroundColor: isDark ? "#000" : "#FFF" }}
          >
            <Skeleton width={112} height={112} circle style={{ marginTop: -48 }} />
            <Skeleton width="46%" height={22} radius={8} style={{ marginTop: 12 }} />
            <Skeleton width="27%" height={13} radius={6} style={{ marginTop: 8 }} />
            <View className="mt-5 w-full flex-row">
              {[0, 1, 2].map((item) => <View key={item} className="flex-1 items-center gap-2"><Skeleton width={38} height={19} radius={7} /><Skeleton width={58} height={11} radius={6} /></View>)}
            </View>
            <Skeleton width={160} height={38} radius={9} style={{ marginTop: 20 }} />
          </View>
        </View>
      </SkeletonPulse>
    );
  }
  return (
    <View style={{ backgroundColor: isDark ? "#000" : "#FFF" }}>
      <View className="relative">
        <ParallaxProfileCover uri={profile.coverUrl} scrollY={scrollY} />
        <SafeAreaView
          edges={["top"]}
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, top: 0 }}
        >
          <View className="items-end px-4 pt-2">
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/45"
            >
              <GearSixIcon size={24} color="white" weight="bold" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <View
        className="-mt-7 items-center rounded-t-[30px] pb-5"
        style={{ backgroundColor: isDark ? "#000" : "#FFF" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          accessibilityRole="imagebutton"
          accessibilityLabel={
            hasSnap
              ? "View snap"
              : profile.avatarUrl
                ? "Long press to view profile picture"
                : undefined
          }
          onPressIn={() => {
            avatarLongPressRef.current = false;
          }}
          onPress={openSnap}
          onLongPress={openAvatarPicture}
          delayLongPress={280}
          className={
            snapIndicator === "unseen"
              ? "-mt-12 rounded-full bg-brand p-1"
              : snapIndicator === "viewed"
                ? "-mt-12 rounded-full bg-gray-400 p-1 dark:bg-gray-600"
              : "-mt-12 rounded-full bg-white p-1.5 dark:bg-black"
          }
        >
          <View
            className={
              hasSnap ? "rounded-full bg-white p-0.5 dark:bg-black" : ""
            }
          >
            <Avatar
              uri={profile.avatarUrl}
              username={profile.username}
              size={100}
              showSnapIndicator={false}
            />
          </View>
        </TouchableOpacity>

        <View className="mt-2 flex-row items-center justify-center gap-2 px-5">
          <Text className="shrink text-2xl font-bold text-black dark:text-white">
            {profile.displayName || profile.username}
          </Text>
          <ProfileDetails profile={profile} />
        </View>
        <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          @{profile.username}
        </Text>
        <CreatorLevelBadge
          score={profile.creatorScore}
          onPress={() => router.push("/settings/creator-levels")}
        />
        <ProfileTagBadge tag={profile.selectedProfileTag} />

        <View className="w-full">
          <ProfileManagedRestaurants
            memberships={profile.restaurantMemberships}
          />
        </View>

        {!!profile.bio && (
          <Text className="mt-4 text-base text-black dark:text-white">
            {profile.bio}
          </Text>
        )}

        <View className="mt-5 w-full flex-row">
          <View className="flex-1">
            <Text className="text-center text-xl font-bold text-black dark:text-white">
              {profile.postsCount ?? 0}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 text-center">
              {t("profile:posts")}
            </Text>
          </View>

          <TouchableOpacity
            className="flex-1"
            onPress={() =>
              router.push({
                pathname: "/(users)/connections",
                params: { id: profile.id, type: "followers" },
              })
            }
          >
            <Text className="text-center text-xl font-bold text-black dark:text-white">
              {profile.followersCount ?? 0}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 text-center">
              {t("profile:followers")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1"
            onPress={() =>
              router.push({
                pathname: "/(users)/connections",
                params: { id: profile.id, type: "following" },
              })
            }
          >
            <Text className="text-center text-xl font-bold text-black dark:text-white">
              {profile.followingCount ?? 0}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 text-center">
              {t("profile:following")}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5 w-full flex-row gap-2 px-5">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-xl bg-[#F5F4F5] py-2.5 dark:bg-gray-800"
            onPress={() => router.push("/(profile)/edit-profile")}
          >
            <PencilSimpleIcon
              size={18}
              color={isDark ? "#FFF" : "#171717"}
              weight="bold"
            />
            <Text className="ml-2 text-center font-bold text-black dark:text-white">
              {t("profile:editProfile")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-xl bg-amber-100 py-2.5 dark:bg-amber-950"
            onPress={() => router.push("/saved")}
          >
            <BookmarkSimpleIcon size={18} color="#D97706" weight="fill" />
            <Text className="ml-2 text-center font-bold text-amber-800 dark:text-amber-200">
              {t("common:saved")}
            </Text>
          </TouchableOpacity>
        </View>

        {completion && completion.percentage < 100 ? (
          <TouchableOpacity
            onPress={() => router.push("/(profile)/edit-profile")}
            activeOpacity={0.75}
            className="mx-5 mt-3 self-stretch flex-row items-center rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-950/40"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900">
              <PencilSimpleIcon size={18} color="#B45309" weight="bold" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-amber-950 dark:text-amber-100">
                {t("profile:profileCompletion")}
              </Text>
              <Text className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                {t("profile:profileCompletionStatus", {
                  percentage: completion.percentage,
                  count: completion.remaining,
                })}
              </Text>
            </View>
            <DirectionalForwardIcon size={18} color="#D97706" weight="bold" />
          </TouchableOpacity>
        ) : null}
      </View>
      <FullScreenImageViewer
        uri={profile.avatarUrl}
        visible={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        showDefaultAvatar
      />
    </View>
  );
}
