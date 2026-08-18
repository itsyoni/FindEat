import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { Post } from "@findeat/types/post";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ChatCircleIcon,
  HeartIcon,
  ShareFatIcon,
  DotsThreeIcon,
  RepeatIcon,
} from "phosphor-react-native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import RestaurantBadge from "@/components/restaurants/RestaurantBadge";
import { useTranslation } from "react-i18next";
import PostVisibilityIcon from "@/components/posts/PostVisibilityIcon";
import PinchZoomImage from "@/components/common/PinchZoomImage";
import PlaceStatusBookmark, {
  getPlaceStatusLabelKey,
} from "@/components/restaurants/PlaceStatusBookmark";
import PostDate from "@/components/posts/PostDate";
import { isRtlText } from "@/lib/textDirection";
import PostConnectionCard from "@/components/posts/PostConnectionCard";
import ExpandablePostCaption from "@/components/posts/ExpandablePostCaption";
import { useSaveToLists } from "@/contexts/SaveToListsContext";
import PostAuthorFollowAction from "@/components/posts/PostAuthorFollowAction";
import ContentVideo from "./ContentVideo";
import SoundPlayback from "@/components/sounds/SoundPlayback";
import SoundLabel from "@/components/sounds/SoundLabel";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppTheme } from "@/contexts/ThemeContext";
import SnapAvatarButton from "@/components/snaps/SnapAvatarButton";
import TaggedUsersBottomSheet from "./TaggedUsersBottomSheet";
import PostLikesBottomSheet from "@/components/posts/PostLikesBottomSheet";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";
import {
  setContentFeedMuted,
  useContentFeedAudio,
} from "@/hooks/useContentFeedAudio";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";
import { updatePostInFeedCache } from "@/hooks/useFeed";

const CONTENT_ACTION_ICON_SIZE = 31;

type Props = {
  post: Post;
  height: number;
  contentTopInset?: number;
  controlsTopInset?: number;
  bottomAuthorBarHeight?: number;
  isActive?: boolean;
  onToggleLike: (postId: string, isLiked: boolean) => void;
  onOpenComments: (postId: string) => void;
  onOpenSharePost: (postId: string) => void;
  onOpenPostOptions: (postId: string) => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  onToggleWantToTry: (
    postId: string,
    restaurantId: string,
    isWantToTry: boolean,
  ) => void;
  useExternalBookmarkHandler?: boolean;
  savedToExternalList?: boolean;
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function ContentPaginationDot({ active }: { active: boolean }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, { duration: 170 }));
  }, [active, progress]);
  const style = useAnimatedStyle(() => ({
    width: 6 + progress.value * 10,
    opacity: 0.5 + progress.value * 0.5,
  }));
  return <Animated.View className="h-1.5 rounded-full bg-white" style={style} />;
}

export default function ContentPost({
  post,
  height,
  contentTopInset = 0,
  bottomAuthorBarHeight = 0,
  isActive = true,
  onToggleLike,
  onOpenComments,
  onOpenSharePost,
  onOpenPostOptions,
  onToggleWantToTry,
  useExternalBookmarkHandler = false,
  savedToExternalList = false,
  onPinchStart,
  onPinchEnd,
}: Props) {
  const { t } = useTranslation("restaurants");
  const { t: tCommon, i18n } = useTranslation("common");
  const { width } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [taggedUsersOpen, setTaggedUsersOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [mediaOnly, setMediaOnly] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [repostOverride, setRepostOverride] = useState<{
    postId: string;
    value: boolean;
  } | null>(null);
  const [soundPlaybackRevision, setSoundPlaybackRevision] = useState(0);
  const [soundPlaybackOffsetMs, setSoundPlaybackOffsetMs] = useState(0);
  const contentFeedMuted = useContentFeedAudio();
  const mediaHeight = Math.max(1, height - bottomAuthorBarHeight);
  const likePressStartedAt = useRef(0);
  const mediaCarouselGesture = useMemo(
    () => Gesture.Native().disallowInterruption(true),
    [],
  );
  const {
    openManageSavedPlace,
    quickSavePlace,
    savedListCounts,
    statusOverrides,
  } = useSaveToLists();
  const isRtl = i18n.language.startsWith("he");
  const userRestaurant = post.restaurant?.id
    ? (statusOverrides[post.restaurant.id] ?? post.restaurant.userSaves?.[0])
    : undefined;
  const isWantToTry = !!userRestaurant?.wantToTry;
  const isVisited = !!userRestaurant?.visited;
  const isFavorite = !!userRestaurant?.favorite;
  const knownSavedListCount = post.restaurant
    ? (savedListCounts[post.restaurant.id] ?? post.restaurantSavedListCount ?? 0)
    : 0;
  const savedListCount = savedToExternalList
    ? Math.max(1, knownSavedListCount)
    : knownSavedListCount;

  const isReposted =
    repostOverride?.postId === post.id
      ? repostOverride.value
      : Boolean(post.isReposted);

  async function toggleRepost() {
    if (!post.canRepost || reposting) return;
    try {
      setReposting(true);
      const nextPost = isReposted
        ? await api.posts.removeRepost(post.id)
        : await api.posts.repost(post.id);
      const nextReposted = Boolean(nextPost.isReposted);
      setRepostOverride({ postId: post.id, value: nextReposted });
      updatePostInFeedCache(queryClient, (cachedPost) =>
        cachedPost.id === post.id
          ? { ...cachedPost, isReposted: nextReposted }
          : cachedPost,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["user-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
      ]);
      showToast(tCommon(nextReposted ? "postReposted" : "repostRemoved"));
    } catch {
      showToast(tCommon("repostError"), { kind: "error" });
    } finally {
      setReposting(false);
    }
  }

  function openAuthorProfile() {
    if (isOfficialPost && post.restaurant) {
      router.push({
        pathname: "/restaurants/[id]",
        params: { id: post.restaurant.id },
      });
      return;
    }
    if (!post.author?.id) return;
    router.push({
      pathname: "/(users)/[id]",
      params: { id: post.author.id },
    });
  }
  const content = post.contentPost;
  const isRestaurantPost = !!post.authorRestaurantId && !!post.authorRestaurant;
  const isOfficialPost = isRestaurantPost && !!post.restaurant;

  const displayAvatar = isRestaurantPost
    ? post.authorRestaurant?.logoUrl
    : post.author?.avatarUrl;

  const displayName = isRestaurantPost
    ? (post.authorRestaurant?.name ?? "")
    : userDisplayName(post.author);

  const media =
    content?.media?.length
      ? content.media
      : content?.videoUrl
        ? [
            {
              id: `${post.id}-video`,
              contentPostId: post.id,
              type: "VIDEO" as const,
              videoUrl: content.videoUrl,
              width: 4,
              height: 5,
              order: 0,
            },
          ]
        : content?.imageUrl
          ? [
              {
                id: `${post.id}-image`,
                contentPostId: post.id,
                type: "IMAGE" as const,
                imageUrl: content.imageUrl,
                thumbnailUrl: content.thumbnailUrl,
                width: 4,
                height: 5,
                order: 0,
              },
            ]
          : [];
  const caption = content?.caption;
  const videoMedia = media.find(
    (item) => item.type === "VIDEO" && !!item.videoUrl,
  );
  const singleImageMedia =
    !videoMedia && media.length === 1 && media[0].imageUrl ? media[0] : null;
  const captionIsRtl = isRtlText(caption, isRtl);

  const heartOverlayScale = useSharedValue(0);
  const heartOverlayOpacity = useSharedValue(0);
  const heartOverlayX = useSharedValue(0);
  const heartOverlayY = useSharedValue(0);
  const heartOverlayRotation = useSharedValue(0);

  const heartOverlayStyle = useAnimatedStyle(() => ({
    opacity: heartOverlayOpacity.value,
    left: heartOverlayX.value - 55,
    top: heartOverlayY.value - 55,
    transform: [
      { rotate: `${heartOverlayRotation.value}deg` },
      { scale: heartOverlayScale.value },
    ],
  }));

  const likeScale = useSharedValue(1);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const gradientHeight = useSharedValue(280);
  const gradientAnimatedStyle = useAnimatedStyle(() => ({
    height: gradientHeight.value,
  }));
  const cardTopInset = useSharedValue(contentTopInset);
  const cardTopRadius = useSharedValue(contentTopInset > 0 ? 24 : 0);
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    marginTop: cardTopInset.value,
    borderTopLeftRadius: cardTopRadius.value,
    borderTopRightRadius: cardTopRadius.value,
  }));

  useEffect(() => {
    cardTopInset.set(withTiming(contentTopInset, { duration: 220 }));
    cardTopRadius.set(
      withTiming(contentTopInset > 0 ? 24 : 0, { duration: 220 }),
    );
  }, [cardTopInset, cardTopRadius, contentTopInset]);

  const iconShadow = {
    shadowColor: "#0B0B0A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  };

  const textShadow = {
    textShadowColor: "#0B0B0A",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 8,
  };

  function handleDoubleTapLike(x: number, y: number) {
    heartOverlayX.set(x);
    heartOverlayY.set(y);

    const randomRotation = Math.random() * 30 - 15;
    heartOverlayRotation.set(randomRotation);

    heartOverlayOpacity.set(1);
    heartOverlayScale.set(0.4);

    heartOverlayScale.set(
      withSequence(withSpring(1.25), withSpring(1), withSpring(0)),
    );

    heartOverlayOpacity.set(
      withSequence(withSpring(1), withSpring(1), withSpring(0)),
    );

    if (post.isLiked) return;

    likeScale.set(1);
    likeScale.set(withSequence(withSpring(1.35), withSpring(1)));

    onToggleLike(post.id, false);
  }

  function handleLike() {
    if (!post.isLiked) {
      likeScale.set(1);
      likeScale.set(withSequence(withSpring(1.25), withSpring(1)));
    } else {
      likeScale.set(1);
    }

    onToggleLike(post.id, post.isLiked);
  }

  function handleWantToTry() {
    if (!post.restaurant?.id) return;

    if (useExternalBookmarkHandler) {
      onToggleWantToTry(post.id, post.restaurant.id, isWantToTry);
      return;
    }

    if (!isWantToTry && !isVisited && !isFavorite && savedListCount === 0) {
      void quickSavePlace(post.restaurant.id, post.id);
      return;
    }

    openManageSavedPlace({
      restaurantId: post.restaurant.id,
      currentStatus: userRestaurant,
      savedFromPostId: post.id,
    });
  }

  function handleCaptionExpansion(
    expanded: boolean,
    fullTextHeight: number,
  ) {
    const extraCaptionHeight = Math.max(0, fullTextHeight - 24) + 28;
    const maximumHeight = Math.max(280, mediaHeight - contentTopInset);
    const nextHeight = expanded
      ? Math.min(maximumHeight, 280 + extraCaptionHeight)
      : 280;

    gradientHeight.set(withTiming(nextHeight, { duration: 260 }));
  }

  const bookmarkLabelKey = getPlaceStatusLabelKey(
    isWantToTry,
    isVisited,
    isFavorite,
  );
  return (
    <View
      style={{ height, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <Pressable
        style={{ height: mediaHeight }}
        delayLongPress={220}
        onLongPress={videoMedia?.videoUrl ? undefined : () => setMediaOnly(true)}
        onPressOut={videoMedia?.videoUrl ? undefined : () => setMediaOnly(false)}
      >
      <Animated.View
        style={[
          {
            flex: 1,
            overflow: "hidden",
            backgroundColor: "#080808",
          },
          cardAnimatedStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: 110,
              height: 110,
              zIndex: 20,
              alignItems: "center",
              justifyContent: "center",
            },
            heartOverlayStyle,
          ]}
        >
          <HeartIcon
            size={110}
            color="#FF3040"
            weight="fill"
            style={iconShadow}
          />
        </Animated.View>
        {videoMedia?.videoUrl ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              width,
              height: mediaHeight,
              backgroundColor: "#080808",
            }}
          >
            <ContentVideo
              uri={videoMedia.videoUrl}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              autoPlay={isActive}
              nativeControls={false}
              tapToToggle
              showProgress
              muted={contentFeedMuted}
              volume={content?.originalAudioVolume ?? 1}
              onMutedChange={setContentFeedMuted}
              onPlayingChange={setVideoPlaying}
              onSeek={(seconds) => {
                setSoundPlaybackOffsetMs(Math.round(seconds * 1000));
                setSoundPlaybackRevision((current) => current + 1);
              }}
              onDoubleTap={handleDoubleTapLike}
              mediaOnly={mediaOnly}
              pinchToZoom
              onLongPress={() => setMediaOnly(true)}
              onPressOut={() => setMediaOnly(false)}
              onPinchStart={() => {
                setMediaOnly(true);
                onPinchStart?.();
              }}
              onPinchEnd={() => {
                setMediaOnly(false);
                onPinchEnd?.();
              }}
            />
          </View>
        ) : singleImageMedia?.imageUrl ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              width,
              height: mediaHeight,
              backgroundColor: "#080808",
            }}
          >
            <PinchZoomImage
              uri={singleImageMedia.imageUrl}
              thumbnailUrl={singleImageMedia.thumbnailUrl}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              onDoubleTap={handleDoubleTapLike}
              onPinchStart={onPinchStart}
              onPinchEnd={onPinchEnd}
            />
          </View>
        ) : media.length ? (
          <GestureDetector gesture={mediaCarouselGesture}>
          <FlatList
            style={{ position: "absolute", inset: 0 }}
            horizontal
            pagingEnabled
            directionalLockEnabled
            nestedScrollEnabled
            data={media}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const nextIndex = Math.max(
                0,
                Math.min(
                  media.length - 1,
                  Math.round(event.nativeEvent.contentOffset.x / width),
                ),
              );
              setActiveMediaIndex(nextIndex);
            }}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={{ width, height: mediaHeight, backgroundColor: "#080808" }}>
                {item.imageUrl ? (
                  <PinchZoomImage
                    uri={item.imageUrl}
                    thumbnailUrl={item.thumbnailUrl}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    onDoubleTap={handleDoubleTapLike}
                    onPinchStart={onPinchStart}
                    onPinchEnd={onPinchEnd}
                  />
                ) : null}
              </View>
            )}
          />
          </GestureDetector>
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-gray-900">
            <Text
              style={[
                textShadow,
                {
                  alignSelf: "stretch",
                  width: "100%",
                  textAlign: "auto",
                  writingDirection: captionIsRtl ? "rtl" : "ltr",
                },
              ]}
              className="px-8 text-2xl font-bold text-white"
            >
              {caption}
            </Text>
          </View>
        )}

        <SoundPlayback
          key={`${content?.sound?.id ?? "none"}-${soundPlaybackRevision}`}
          sound={content?.sound}
          startTimeMs={
            content?.sound
              ? ((content.soundStartTimeMs ?? 0) + soundPlaybackOffsetMs) %
                Math.max(1, content.sound.durationMs)
              : 0
          }
          volume={contentFeedMuted ? 0 : (content?.soundVolume ?? 1)}
          playing={Boolean(content?.sound) && isActive && (videoMedia ? videoPlaying : true)}
        />

        {!mediaOnly && media.length > 1 ? (
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 z-10 flex-row justify-center gap-1.5"
            style={{ bottom: 8 }}
          >
            {media.map((item, index) => (
              <ContentPaginationDot
                key={item.id}
                active={index === activeMediaIndex}
              />
            ))}
          </View>
        ) : null}

        {!mediaOnly ? <AnimatedLinearGradient
          pointerEvents="none"
          colors={[
            "transparent",
            "rgba(0,0,0,0.1)",
            "rgba(0,0,0,0.25)",
            "rgba(0,0,0,0.5)",
          ]}
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
            },
            gradientAnimatedStyle,
          ]}
        /> : null}

        {!mediaOnly ? <View className="absolute bottom-8 left-4 right-24">
          {post.repostedBy ? (
            <View className="mb-2 flex-row items-center gap-1.5">
              <RepeatIcon size={14} color="#FAF9F6" weight="bold" />
              <Text className="text-xs font-semibold text-white/85">
                {tCommon("repostedBy", { name: userDisplayName(post.repostedBy) })}
              </Text>
            </View>
          ) : null}
          {bottomAuthorBarHeight === 0 ? <View className="mb-3 flex-row items-center justify-start gap-3">
            <View className="min-w-0 shrink flex-row items-center gap-3">
              {isRestaurantPost ? (
                <TouchableOpacity activeOpacity={0.8} onPress={openAuthorProfile}>
                  <Avatar
                    uri={displayAvatar}
                    username={displayName ?? ""}
                    size={42}
                    fallbackType="restaurant"
                  />
                </TouchableOpacity>
              ) : (
                <SnapAvatarButton
                  avatarUrl={displayAvatar}
                  username={displayName}
                  userId={post.author?.id}
                  size={42}
                  indicatorPlacement="outside"
                  onPressWithoutSnap={openAuthorProfile}
                />
              )}
              <TouchableOpacity activeOpacity={0.8} onPress={openAuthorProfile}>
                <View className="min-w-0 shrink">
                  <View className="flex-row items-center">
                    <Text
                      numberOfLines={1}
                      className="shrink font-bold text-white"
                    >
                      {displayName}
                    </Text>
                    {isOfficialPost ? <RestaurantBadge /> : null}
                    {!isOfficialPost && post.visibility !== "PUBLIC" ? (
                      <View className="ml-1.5">
                        <PostVisibilityIcon
                          visibility={post.visibility}
                          color="#FFFFFFCC"
                        />
                      </View>
                    ) : null}
                  </View>

                  {isOfficialPost && (
                    <Text className="mt-1 text-xs font-semibold text-[#F7D786]">
                      Official restaurant
                    </Text>
                  )}
                  {!isOfficialPost && post.author?.displayName?.trim() ? (
                    <Text className="mt-0.5 text-xs text-white/75">
                      {usernameLabel(post.author.username)}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>
            <PostAuthorFollowAction post={post} onMedia />
          </View> : null}

          {!!post.restaurant || !!post.taggedUsers?.length ? (
            <View className="mb-3 flex-row items-center">
              {!!post.restaurant ? (
                <TouchableOpacity
                  className="max-w-[55%] shrink rounded-full bg-[#00000080] px-3 py-2"
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/restaurants/[id]",
                      params: { id: post.restaurant!.id },
                    })
                  }
                >
                  <View className="min-w-0 flex-row items-center">
                    <Text
                      numberOfLines={1}
                      className="shrink font-semibold text-white"
                    >
                      {post.restaurant.name}
                    </Text>
                    <RestaurantBadge
                      size={14}
                      status={post.restaurant.status}
                    />
                  </View>
                </TouchableOpacity>
              ) : null}

              {!!post.taggedUsers?.length ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="ml-2 min-w-0 shrink flex-row items-center rounded-full bg-[#00000080] py-1.5 pl-1.5 pr-3"
                  onPress={() => {
                    if (post.taggedUsers!.length > 1) {
                      setTaggedUsersOpen(true);
                      return;
                    }
                    router.push({
                      pathname: "/(users)/[id]",
                      params: { id: post.taggedUsers![0].id },
                    });
                  }}
                >
                  <View className="mr-2 flex-row">
                    {post.taggedUsers.slice(0, 2).map((person, index) => (
                      <View
                        key={person.id}
                        className="rounded-full"
                        style={{ marginLeft: index === 0 ? 0 : -6 }}
                      >
                        <Avatar
                          uri={
                            person.avatarUrl ?? person.avatarThumbnailUrl
                          }
                          username={person.username}
                          userId={person.id}
                          size={20}
                          showSnapIndicator={false}
                        />
                      </View>
                    ))}
                  </View>
                  <Text
                    numberOfLines={1}
                    className="shrink text-xs font-bold text-white"
                  >
                    {post.taggedUsers.length === 1
                      ? usernameLabel(post.taggedUsers[0].username)
                      : tCommon("taggedPeopleCount", {
                          count: post.taggedUsers.length,
                        })}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {post.canRepost ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={tCommon(isReposted ? "reposted" : "repost")}
                  accessibilityState={{ disabled: reposting || isReposted }}
                  disabled={reposting || isReposted}
                  activeOpacity={0.8}
                  className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-[#00000080]"
                  onPress={() => void toggleRepost()}
                  style={{ opacity: reposting ? 0.6 : 1 }}
                >
                  {reposting ? (
                    <ActivityIndicator size="small" color="#F7D786" />
                  ) : (
                    <RepeatIcon
                      size={15}
                      color={isReposted ? "#F7D786" : "#FAF9F6"}
                      weight="bold"
                    />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View>
            {content?.sound ? (
              <View className="mb-2">
                <SoundLabel
                  sound={content.sound}
                  tone="overlay"
                  onPress={() =>
                    router.push({
                      pathname: "/create/content",
                      params: { soundId: content.sound!.id },
                    })
                  }
                />
              </View>
            ) : null}
            {!!caption && (
              <>
                <ExpandablePostCaption
                  key={`${post.id}-${caption}`}
                  text={caption}
                  isRtl={captionIsRtl}
                  tone="overlay"
                  authorName={displayName}
                  onAuthorPress={openAuthorProfile}
                  onExpansionChange={handleCaptionExpansion}
                />
                {!!content?.captionEditedAt && (
                  <Text
                    className="mt-0.5 text-xs text-white/70"
                    style={{
                      alignSelf: "stretch",
                      width: "100%",
                      textAlign: "auto",
                      writingDirection: captionIsRtl ? "rtl" : "ltr",
                    }}
                  >
                    {tCommon("edited")}
                  </Text>
                )}
              </>
            )}
            <PostConnectionCard
              sourceType="CONTENT"
              linkedPosts={post.linkedPosts}
              tone="overlay"
              fallbackImageUrl={
                media[0]?.thumbnailUrl ?? media[0]?.imageUrl ?? null
              }
            />
            <PostDate
              createdAt={post.createdAt}
              tone="overlay"
              hasContentAbove={!!caption || !!post.linkedPosts?.length}
            />
          </View>
        </View> : null}

        {!mediaOnly ? <View className="absolute bottom-8 right-4 w-16 items-center gap-5">
          <TouchableOpacity
            className="w-16 items-center"
            delayLongPress={350}
            onPressIn={() => {
              likePressStartedAt.current = Date.now();
            }}
            onPress={() => {
              if (Date.now() - likePressStartedAt.current < 350) handleLike();
            }}
            onLongPress={
              post.canViewLikes ? () => setLikesOpen(true) : undefined
            }
          >
            <Animated.View style={likeAnimatedStyle}>
              <HeartIcon
                weight="fill"
                color={post.isLiked ? "#FF3040" : "#FFFFFFCC"}
                size={CONTENT_ACTION_ICON_SIZE}
                style={[
                  iconShadow,
                  post.isLiked && {
                    shadowColor: "#FF3040",
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                  },
                ]}
              />
            </Animated.View>

            {post.canViewLikes ? (
              <Text style={textShadow} className="text-center text-lg text-white">
                {post.likesCount}
              </Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            className="w-16 items-center"
            disabled={post.commentsDisabled}
            onPress={() => onOpenComments(post.id)}
            style={{ opacity: post.commentsDisabled ? 0.55 : 1 }}
          >
            <ChatCircleIcon
              weight="fill"
              color="#FFFFFFCC"
              size={CONTENT_ACTION_ICON_SIZE}
              style={iconShadow}
            />
            <Text style={textShadow} className="text-center text-lg text-white">
              {post.commentsDisabled
                ? tCommon("commentsOff")
                : post.commentsCount}
            </Text>
          </TouchableOpacity>

          {post.visibility === "PUBLIC" && (
            <TouchableOpacity
              className="w-16 items-center"
              onPress={() => onOpenSharePost(post.id)}
            >
              <ShareFatIcon
                weight="fill"
                color="#FFFFFFCC"
                size={CONTENT_ACTION_ICON_SIZE}
                style={iconShadow}
              />
              <Text style={textShadow} className="text-center text-lg text-white">
                {post.sharesCount ?? 0}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity className="w-16 items-center" onPress={handleWantToTry}>
            <PlaceStatusBookmark
              wantToTry={isWantToTry}
              visited={isVisited}
              favorite={isFavorite}
              size={CONTENT_ACTION_ICON_SIZE}
              defaultColor="#FFFFFFCC"
              savedListCount={savedListCount}
              style={iconShadow}
            />

            <Text
              numberOfLines={1}
              style={textShadow}
              className="mt-1 w-16 text-center text-xs font-bold text-white"
            >
              {!isWantToTry && !isVisited && !isFavorite && savedListCount > 0
                ? tCommon("inList")
                : t(bookmarkLabelKey)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="w-16 items-center justify-center"
            activeOpacity={0.8}
            onPress={() => onOpenPostOptions(post.id)}
            accessibilityRole="button"
            accessibilityLabel={tCommon("postOptions")}
          >
            <DotsThreeIcon
              size={CONTENT_ACTION_ICON_SIZE}
              color="#FFFFFFCC"
              weight="bold"
              style={iconShadow}
            />
          </TouchableOpacity>
        </View> : null}
      </Animated.View>
      </Pressable>
      {bottomAuthorBarHeight > 0 ? (
        <View
          style={{
            height: bottomAuthorBarHeight,
            backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
          }}
        >
          {!mediaOnly ? (
            <View className="h-[49px] flex-row items-center px-4">
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                {isRestaurantPost ? (
                  <TouchableOpacity activeOpacity={0.8} onPress={openAuthorProfile}>
                    <Avatar
                      uri={displayAvatar}
                      username={displayName ?? ""}
                      size={38}
                      fallbackType="restaurant"
                    />
                  </TouchableOpacity>
                ) : (
                  <SnapAvatarButton
                    avatarUrl={displayAvatar}
                    username={displayName}
                    userId={post.author?.id}
                    size={38}
                    indicatorPlacement="outside"
                    onPressWithoutSnap={openAuthorProfile}
                  />
                )}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={openAuthorProfile}
                  className="min-w-0 shrink"
                >
                  <View className="min-w-0 shrink">
                    <View className="flex-row items-center">
                      <Text
                        numberOfLines={1}
                        className="shrink font-bold text-[#171717] dark:text-[#FAF9F6]"
                      >
                        {displayName}
                      </Text>
                      {isOfficialPost ? <RestaurantBadge /> : null}
                      {!isOfficialPost && post.visibility !== "PUBLIC" ? (
                        <View className="ml-1.5">
                          <PostVisibilityIcon
                            visibility={post.visibility}
                            color={isDark ? "#FAF9F6CC" : "#171717B3"}
                          />
                        </View>
                      ) : null}
                    </View>
                    {isOfficialPost ? (
                      <Text className="mt-0.5 text-xs font-semibold text-[#B78300] dark:text-[#F7D786]">
                        Official restaurant
                      </Text>
                    ) : post.author?.displayName?.trim() ? (
                      <Text className="mt-0.5 text-xs text-gray-500 dark:text-white/65">
                        {usernameLabel(post.author.username)}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
              <View className="ml-3">
                <PostAuthorFollowAction post={post} />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      <TaggedUsersBottomSheet
        open={taggedUsersOpen}
        users={post.taggedUsers ?? []}
        displayNames
        showRelationshipActions
        onClose={() => setTaggedUsersOpen(false)}
      />
      <PostLikesBottomSheet
        postId={post.id}
        open={likesOpen}
        onClose={() => setLikesOpen(false)}
      />
    </View>
  );
}
