import { AppAlert as Alert } from "@/lib/appAlert";
import { Skeleton, SkeletonList, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import ProfileAvatarRing from "@/components/profile/ProfileAvatarRing";
import FullScreenImageViewer from "@/components/common/FullScreenImageViewer";
import Tabs from "@/components/common/Tabs";
import ProfileManagedRestaurants from "@/components/profile/ProfileManagedRestaurants";
import ProfileDetails from "@/components/profile/ProfileDetails";
import ProfilePostGrid from "@/components/profile/ProfilePostGrid";
import ProfileActionsBottomSheet from "@/components/profile/ProfileActionsBottomSheet";
import ParallaxProfileCover from "@/components/profile/ParallaxProfileCover";
import ReportBottomSheet from "@/components/moderation/ReportBottomSheet";
import { useUserProfile } from "@/hooks/useUserProfile";
import { snapsQueryKey } from "@/hooks/useSnaps";
import { useSnapIndicator } from "@/contexts/SnapIndicatorContext";
import { api } from "@/lib/api";
import { usernameLabel } from "@/lib/userIdentity";
import { cacheProfilePostsForNavigation } from "@/lib/profilePostNavigationCache";
import { useAuth } from "@/contexts/AuthContext";
import { PostType } from "@findeat/types/post";
import {
  filterPostsByType,
  getRelationshipButtonText,
  isFollowingRelationship,
  shouldRemoveFollowRelationship,
} from "@findeat/utils";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  ChatCircleIcon,
  DotsThreeIcon,
  LockKeyIcon,
  ProhibitIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAppTheme } from "@/contexts/ThemeContext";
import CreatorLevelBadge from "@/components/profile/CreatorLevelBadge";
import ProfileTagBadge from "@/components/profile/ProfileTagBadge";
import RelationshipActionButton from "@/components/profile/RelationshipActionButton";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation(["common", "profile"]);
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const [activeFeed, setActiveFeed] = useState<PostType>("CONTENT");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarLongPressRef = useRef(false);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const {
    profile: user,
    setProfile: setUser,
    loading,
  } = useUserProfile(id as string);

  const snapIndicator = useSnapIndicator({
    userId: user?.id,
    username: user?.username,
    avatarUrl: user?.avatarUrl,
  });
  const hasSnap = snapIndicator !== null;

  const posts = useMemo(
    () => filterPostsByType(user?.posts, activeFeed),
    [user, activeFeed],
  );

  useEffect(() => {
    router.prefetch("/(users)/content-feed");
    router.prefetch("/(users)/reviews-feed");
  }, []);

  async function toggleFollow() {
    if (!user) return;

    try {
      const shouldUnfollow = shouldRemoveFollowRelationship(user.relationship);
      const wasFollowing = isFollowingRelationship(user.relationship);

      const result = shouldUnfollow
        ? await api.users.unfollow(user.id)
        : await api.users.follow(user.id);

      setUser((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              relationship: result.relationship,
              isFollowing: isFollowingRelationship(result.relationship),
              followersCount:
                currentUser.followersCount +
                (isFollowingRelationship(result.relationship) ? 1 : 0) -
                (wasFollowing ? 1 : 0),
            }
          : currentUser,
      );

      void queryClient.invalidateQueries({ queryKey: snapsQueryKey });
    } catch (error) {
      console.error(error);
    }
  }

  function openAvatarOrSnap() {
    if (!user) return;
    if (avatarLongPressRef.current) return;
    if (hasSnap) {
      router.push({
        pathname: "/snaps/[userId]",
        params: { userId: user.id },
      });
    }
  }

  function openAvatarPicture() {
    avatarLongPressRef.current = true;
    setAvatarOpen(true);
  }

  function startChat() {
    if (!user) return;
    router.push({
      pathname: "/chats/[id]",
      params: {
        id: "new-direct",
        type: "DIRECT",
        targetUserId: user.id,
        title: user.displayName?.trim() || user.username,
        imageUrl: user.avatarUrl ?? "",
      },
    });
  }

  function confirmBlock() {
    if (!user) return;
    setOptionsOpen(false);

    Alert.alert(
      t("profile:blockUserTitle", { username: user.username }),
      t("profile:blockUserDescription"),
      [
        { text: t("common:cancel"), style: "cancel" },
        {
          text: t("profile:block"),
          style: "destructive",
          onPress: () => {
            void api.users
              .block(user.id)
              .then(() => {
                void queryClient.invalidateQueries({ queryKey: ["feed"] });
                router.back();
              })
              .catch((error) => {
                console.error("Could not block user", error);
                Alert.alert(t("common:error"), t("profile:blockUserError"));
              });
          },
        },
      ],
    );
  }

  if (currentUser?.id === id) {
    return <Redirect href="/(tabs)/profile" />;
  }

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
        }}
      >
        <SkeletonPulse>
          <View className="relative">
            <Skeleton height={240} radius={0} />
            <SafeAreaView
              edges={["top"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0 }}
            >
              <View className="mt-2 flex-row justify-between px-4">
                <Skeleton width={44} height={44} circle />
                <Skeleton width={44} height={44} circle />
              </View>
            </SafeAreaView>
          </View>
          <View className="-mt-7 items-center rounded-t-[30px] bg-white pb-5 dark:bg-black">
            <Skeleton
              width={112}
              height={112}
              circle
              style={{ marginTop: -48 }}
            />
            <Skeleton
              width="48%"
              height={23}
              radius={9}
              style={{ marginTop: 12 }}
            />
            <Skeleton
              width="28%"
              height={13}
              radius={6}
              style={{ marginTop: 8 }}
            />
            <View className="mt-5 w-full flex-row">
              {[0, 1, 2].map((item) => (
                <View key={item} className="flex-1 items-center gap-2">
                  <Skeleton width={38} height={19} radius={7} />
                  <Skeleton width={58} height={11} radius={6} />
                </View>
              ))}
            </View>
            <View className="mt-5 w-full flex-row gap-3 px-5">
              <Skeleton width="48%" height={44} radius={12} />
              <Skeleton width="48%" height={44} radius={12} />
            </View>
          </View>
        </SkeletonPulse>
        <Tabs
          activeTab="CONTENT"
          onChange={() => undefined}
          tabs={[
            { label: t("common:content"), value: "CONTENT" },
            { label: t("common:reviews"), value: "REVIEW" },
          ]}
        />
        <SkeletonList variant="grid" count={9} />
      </ScrollView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-black">
        <TouchableOpacity
          className="ml-4 mt-2 h-11 w-11 items-center justify-center"
          onPress={() => router.back()}
        >
          <DirectionalIcon
            direction="back"
            size={24}
            color="#6B7280"
            weight="bold"
          />
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
            <ProhibitIcon size={34} color="#6B7280" weight="bold" />
          </View>
          <Text className="mt-5 text-xl font-bold text-black dark:text-white">
            {t("profile:userUnavailable")}
          </Text>
          <Text className="mt-2 text-center text-gray-500">
            {t("profile:userUnavailableHint")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}>
      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
        }}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        <View className="relative">
          <ParallaxProfileCover uri={user.coverUrl} scrollY={scrollY} />

          <SafeAreaView
            edges={["top"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            <View className="mt-2 flex-row items-center justify-between px-4">
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center rounded-full bg-black/30"
                onPress={() => router.back()}
              >
                <DirectionalIcon direction="back" size={24} color="#FAF9F6" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center rounded-full bg-black/30"
                onPress={() => setOptionsOpen(true)}
              >
                <DotsThreeIcon size={25} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View
          className="-mt-7 rounded-t-[30px]"
          style={{ backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
        >
          <View className="items-center px-5" style={{ marginTop: -56 }}>
            <TouchableOpacity
              activeOpacity={1}
              accessibilityRole="imagebutton"
              accessibilityLabel={
                hasSnap
                  ? "View snap"
                  : user.avatarUrl
                    ? "Long press to view profile picture"
                  : undefined
              }
              onPressIn={() => {
                avatarLongPressRef.current = false;
              }}
              onPress={openAvatarOrSnap}
              onLongPress={openAvatarPicture}
              delayLongPress={280}
            >
              <ProfileAvatarRing
                avatarUrl={user.avatarUrl}
                username={user.username}
                snapIndicator={snapIndicator}
              />
            </TouchableOpacity>
          </View>
          <View className="items-center px-5 pb-5">
            <View className="mt-2 flex-row items-center justify-center gap-2 px-5">
              <Text className="shrink text-2xl font-bold text-black dark:text-white">
                {user.displayName || user.username}
              </Text>
              <ProfileDetails profile={user} />
            </View>
            <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {usernameLabel(user.username)}
            </Text>
            <CreatorLevelBadge score={user.creatorScore} />
            <ProfileTagBadge tag={user.selectedProfileTag} />

            <View className="w-full">
              <ProfileManagedRestaurants
                memberships={user.restaurantMemberships}
              />
            </View>

            {!!user.bio && (
              <Text className="mt-4 text-center text-base text-black dark:text-white">
                {user.bio}
              </Text>
            )}

            <View className="mt-5 w-full flex-row">
              <View className="flex-1">
                <Text className="text-center text-xl font-bold text-black dark:text-white">
                  {user.postsCount}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  {t("profile:posts")}
                </Text>
              </View>

              <TouchableOpacity
                className="flex-1"
                onPress={() =>
                  router.push({
                    pathname: "/(users)/connections",
                    params: { id: user.id, type: "followers" },
                  })
                }
              >
                <Text className="text-center text-xl font-bold text-black dark:text-white">
                  {user.followersCount}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  {t("profile:followers")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1"
                onPress={() =>
                  router.push({
                    pathname: "/(users)/connections",
                    params: { id: user.id, type: "following" },
                  })
                }
              >
                <Text className="text-center text-xl font-bold text-black dark:text-white">
                  {user.followingCount}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  {t("profile:following")}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mt-5 w-full flex-row gap-2">
              <View className="flex-1">
                <RelationshipActionButton
                  className="w-full rounded-xl py-2.5"
                  relationship={user.relationship}
                  label={getRelationshipButtonText(user.relationship)}
                  onPress={toggleFollow}
                  showIcon
                />
              </View>

              <View className="flex-1">
                <TouchableOpacity
                  className="w-full items-center justify-center rounded-xl bg-[#F5F4F5] py-2.5 dark:bg-gray-800"
                  onPress={startChat}
                >
                  <View className="flex-row items-center justify-center">
                    <ChatCircleIcon
                      size={18}
                      color={isDark ? "#FAF9F6" : "#171717"}
                      weight="bold"
                    />

                    <Text className="ml-2 text-center font-bold text-black dark:text-white">
                      {t("profile:message")}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {user.isPrivate && !user.canViewPrivateContent ? (
            <View className="mt-7 min-h-80 items-center border-t border-line px-8 pt-10 dark:border-gray-800">
              <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-black dark:border-white">
                <LockKeyIcon
                  size={29}
                  color={isDark ? "#FAF9F6" : "#171717"}
                  weight="fill"
                />
              </View>
              <Text
                weight="bold"
                className="mt-4 text-xl text-black dark:text-white"
              >
                {t("profile:privateAccount")}
              </Text>
              <Text className="mt-2 text-center leading-5 text-gray-500">
                {t("profile:privateAccountHint")}
              </Text>
            </View>
          ) : (
            <>
              <Tabs
                activeTab={activeFeed}
                onChange={setActiveFeed}
                tabs={[
                  { label: t("common:content"), value: "CONTENT" },
                  { label: t("common:reviews"), value: "REVIEW" },
                ]}
              />

              <ProfilePostGrid
                posts={posts}
                type={activeFeed}
                onPressPost={(postId) => {
                  cacheProfilePostsForNavigation(user.id, activeFeed, posts);
                  router.push({
                    pathname:
                      activeFeed === "CONTENT"
                        ? "/(users)/content-feed"
                        : "/(users)/reviews-feed",
                    params: {
                      userId: user.id,
                      postId,
                    },
                  });
                }}
              />
            </>
          )}
        </View>
      </Animated.ScrollView>

      <ProfileActionsBottomSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        type="USER"
        onBlock={confirmBlock}
        onReport={() => {
          setOptionsOpen(false);
          setTimeout(() => setReportOpen(true), 250);
        }}
      />
      <ReportBottomSheet
        open={reportOpen}
        targetType="USER"
        targetId={user.id}
        onClose={() => setReportOpen(false)}
      />
      <FullScreenImageViewer
        uri={user.avatarUrl}
        visible={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        showDefaultAvatar
      />
    </View>
  );
}
