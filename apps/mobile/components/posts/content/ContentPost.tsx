import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { Post, type ContentPostMedia } from "@findeat/types/post";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ChatCircleIcon,
  HeartIcon,
  ShareFatIcon,
  DotsThreeIcon,
  MusicNoteIcon,
  RepeatIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "phosphor-react-native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewToken,
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
import { FeedContentVideo } from "./ContentVideo";
import SoundPlayback from "@/components/sounds/SoundPlayback";
import {
  memo,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import type { MediaSuspensionController } from "./mediaSuspensionController";
import type { FeedVideoController } from "./feedVideoController";
import { prefetchImageUrls } from "@/lib/imagePrefetch";

const CONTENT_ACTION_ICON_SIZE = 31;
const contentPostStyles = StyleSheet.create({
  iconShadow: {
    shadowColor: "#0B0B0A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  textShadow: {
    textShadowColor: "#0B0B0A",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});

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
  deferMediaWhenInactive?: boolean;
  enablePreparedCarouselInteraction?: boolean;
  prepareSoundPlayback?: boolean;
  mediaSuspensionController: MediaSuspensionController;
  feedVideoController: FeedVideoController;
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function getContentMedia(
  postId: string,
  content: Post["contentPost"],
): ContentPostMedia[] {
  if (content?.media?.length) return content.media;
  if (content?.videoUrl) {
    return [
      {
        id: `${postId}-video`,
        contentPostId: postId,
        type: "VIDEO",
        videoUrl: content.videoUrl,
        thumbnailUrl: content.thumbnailUrl,
        width: 4,
        height: 5,
        order: 0,
      },
    ];
  }
  if (content?.imageUrl) {
    return [
      {
        id: `${postId}-image`,
        contentPostId: postId,
        type: "IMAGE",
        imageUrl: content.imageUrl,
        thumbnailUrl: content.thumbnailUrl,
        width: 4,
        height: 5,
        order: 0,
      },
    ];
  }
  return [];
}

const StaticMediaPresentation = memo(function StaticMediaPresentation({
  uri,
  thumbnailUrl,
  overlayUri,
}: {
  uri?: string | null;
  thumbnailUrl?: string | null;
  overlayUri?: string | null;
}) {
  return (
    <View className="absolute inset-0 bg-black">
      {uri ? (
        <ProgressiveImage
          source={{ uri }}
          thumbnailUrl={thumbnailUrl}
          contentFit="cover"
          transition={0}
          style={{ position: "absolute", inset: 0 }}
        />
      ) : (
        <View className="absolute inset-0 items-center justify-center bg-gray-900">
          <ActivityIndicator size="large" color="#FAF9F6" />
        </View>
      )}
      {overlayUri ? (
        <ProgressiveImage
          source={{ uri: overlayUri }}
          contentFit="fill"
          transition={0}
          style={{ position: "absolute", inset: 0 }}
        />
      ) : null}
    </View>
  );
});

const ContentPaginationDot = memo(function ContentPaginationDot({
  active,
}: {
  active: boolean;
}) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, { duration: 170 }));
  }, [active, progress]);
  const style = useAnimatedStyle(() => ({
    width: 6 + progress.value * 10,
    opacity: 0.5 + progress.value * 0.5,
  }));
  return <Animated.View className="h-1.5 rounded-full bg-white" style={style} />;
});

const carouselViewabilityConfig = { itemVisiblePercentThreshold: 51 };

const StaticContentPaginationDot = memo(function StaticContentPaginationDot({
  active,
}: {
  active: boolean;
}) {
  return (
    <View
      className="h-1.5 rounded-full bg-white"
      style={{ width: active ? 16 : 6, opacity: active ? 1 : 0.5 }}
    />
  );
});

const ContentPagination = memo(function ContentPagination({
  media,
  activeIndex,
  animated,
}: {
  media: ContentPostMedia[];
  activeIndex: number;
  animated: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      className="absolute left-0 right-0 z-10 flex-row justify-center gap-1.5"
      style={{ bottom: 8 }}
    >
      {media.map((item, index) =>
        animated ? (
          <ContentPaginationDot
            key={item.id}
            active={index === activeIndex}
          />
        ) : (
          <StaticContentPaginationDot
            key={item.id}
            active={index === activeIndex}
          />
        ),
      )}
    </View>
  );
});

type ContentMediaCarouselProps = {
  media: ContentPostMedia[];
  width: number;
  height: number;
  onDoubleTap: (x: number, y: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
};

const ContentMediaCarousel = memo(function ContentMediaCarousel({
  media,
  width,
  height,
  onDoubleTap,
  onPinchStart,
  onPinchEnd,
}: ContentMediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const gesture = useMemo(
    () => Gesture.Native().disallowInterruption(true),
    [],
  );
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ContentPostMedia>[] }) => {
      const visible = viewableItems.find(
        (item) => item.isViewable && typeof item.index === "number",
      );
      if (typeof visible?.index === "number") {
        setActiveIndex(visible.index);
      }
    },
    [],
  );

  useEffect(() => {
    prefetchImageUrls([
      media[activeIndex - 1]?.imageUrl,
      media[activeIndex + 1]?.imageUrl,
    ]);
  }, [activeIndex, media]);

  return (
    <>
      <GestureDetector gesture={gesture}>
        <FlatList
          style={{ position: "absolute", inset: 0 }}
          horizontal
          pagingEnabled
          directionalLockEnabled
          nestedScrollEnabled
          data={media}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          removeClippedSubviews
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={carouselViewabilityConfig}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={{ width, height, backgroundColor: "#080808" }}>
              {item.imageUrl ? (
                <PinchZoomImage
                  uri={item.imageUrl}
                  thumbnailUrl={item.thumbnailUrl}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                  onDoubleTap={onDoubleTap}
                  onPinchStart={onPinchStart}
                  onPinchEnd={onPinchEnd}
                />
              ) : null}
            </View>
          )}
        />
      </GestureDetector>
      <ContentPagination media={media} activeIndex={activeIndex} animated />
    </>
  );
});

type PostActionRailProps = {
  isLiked: boolean;
  canViewLikes: boolean;
  likesCount: number;
  commentsDisabled: boolean;
  commentsLabel: string | number;
  isPublic: boolean;
  sharesCount: number;
  isWantToTry: boolean;
  isVisited: boolean;
  isFavorite: boolean;
  savedListCount: number;
  saveLabel: string;
  optionsLabel: string;
  likeAnimatedStyle: ComponentProps<typeof Animated.View>["style"];
  onLike: () => void;
  onOpenLikes: () => void;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onSave: () => void;
  onOpenOptions: () => void;
};

const PostActionRail = memo(function PostActionRail({
  isLiked,
  canViewLikes,
  likesCount,
  commentsDisabled,
  commentsLabel,
  isPublic,
  sharesCount,
  isWantToTry,
  isVisited,
  isFavorite,
  savedListCount,
  saveLabel,
  optionsLabel,
  likeAnimatedStyle,
  onLike,
  onOpenLikes,
  onOpenComments,
  onOpenShare,
  onSave,
  onOpenOptions,
}: PostActionRailProps) {
  const likePressStartedAt = useRef(0);

  return (
    <View className="absolute bottom-8 right-4 w-16 items-center gap-5">
      <TouchableOpacity
          className="w-16 items-center"
          delayLongPress={350}
          onPressIn={() => {
            likePressStartedAt.current = Date.now();
          }}
          onPress={() => {
            if (Date.now() - likePressStartedAt.current < 350) onLike();
          }}
          onLongPress={canViewLikes ? onOpenLikes : undefined}
        >
          <Animated.View style={likeAnimatedStyle}>
            <HeartIcon
              weight="fill"
              color={isLiked ? "#FF3040" : "#FFFFFFCC"}
              size={CONTENT_ACTION_ICON_SIZE}
              style={[
                contentPostStyles.iconShadow,
                isLiked && {
                  shadowColor: "#FF3040",
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                },
              ]}
            />
          </Animated.View>
          {canViewLikes ? (
                <Text
                  style={contentPostStyles.textShadow}
                  className="text-center text-lg text-white"
                >
                  {likesCount}
                </Text>
              ) : null}
        </TouchableOpacity>

      <TouchableOpacity
          className="w-16 items-center"
          disabled={commentsDisabled}
          onPress={onOpenComments}
          style={{ opacity: commentsDisabled ? 0.55 : 1 }}
        >
          <ChatCircleIcon
            weight="fill"
            color="#FFFFFFCC"
            size={CONTENT_ACTION_ICON_SIZE}
            style={contentPostStyles.iconShadow}
          />
          <Text
              style={contentPostStyles.textShadow}
              className="text-center text-lg text-white"
            >
              {commentsLabel}
            </Text>
        </TouchableOpacity>

      {isPublic ? (
            <TouchableOpacity className="w-16 items-center" onPress={onOpenShare}>
              <ShareFatIcon
                weight="fill"
                color="#FFFFFFCC"
                size={CONTENT_ACTION_ICON_SIZE}
                style={contentPostStyles.iconShadow}
              />
              <Text
                  style={contentPostStyles.textShadow}
                  className="text-center text-lg text-white"
                >
                  {sharesCount}
                </Text>
            </TouchableOpacity>
          ) : null}

      <TouchableOpacity className="w-16 items-center" onPress={onSave}>
          <PlaceStatusBookmark
            wantToTry={isWantToTry}
            visited={isVisited}
            favorite={isFavorite}
            size={CONTENT_ACTION_ICON_SIZE}
            defaultColor="#FFFFFFCC"
            savedListCount={savedListCount}
            style={contentPostStyles.iconShadow}
          />
          <Text
              numberOfLines={1}
              style={contentPostStyles.textShadow}
              className="mt-1 w-16 text-center text-xs font-bold text-white"
            >
              {saveLabel}
            </Text>
        </TouchableOpacity>

      <TouchableOpacity
          className="w-16 items-center justify-center"
          activeOpacity={0.8}
          onPress={onOpenOptions}
          accessibilityRole="button"
          accessibilityLabel={optionsLabel}
        >
          <DotsThreeIcon
            size={CONTENT_ACTION_ICON_SIZE}
            color="#FFFFFFCC"
            weight="bold"
            style={contentPostStyles.iconShadow}
          />
        </TouchableOpacity>
    </View>
  );
});

type PostAuthorHeaderProps = {
  isRestaurantPost: boolean;
  isOfficialPost: boolean;
  displayAvatar?: string | null;
  displayName: string;
  authorId?: string | null;
  authorUsername?: string | null;
  authorHasDisplayName: boolean;
  authorRestaurantId?: string | null;
  authorRelationship: Post["authorRelationship"];
  visibility: Post["visibility"];
  onOpenAuthor: () => void;
};

const PostAuthorHeader = memo(function PostAuthorHeader({
  isRestaurantPost,
  isOfficialPost,
  displayAvatar,
  displayName,
  authorId,
  authorUsername,
  authorHasDisplayName,
  authorRestaurantId,
  authorRelationship,
  visibility,
  onOpenAuthor,
}: PostAuthorHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center justify-start gap-3">
      <View className="min-w-0 shrink flex-row items-center gap-3">
        {isRestaurantPost ? (
              <TouchableOpacity activeOpacity={0.8} onPress={onOpenAuthor}>
                <Avatar
                  uri={displayAvatar}
                  username={displayName}
                  size={42}
                  fallbackType="restaurant"
                />
              </TouchableOpacity>
            ) : (
              <SnapAvatarButton
                avatarUrl={displayAvatar}
                username={displayName}
                userId={authorId ?? undefined}
                size={42}
                indicatorPlacement="outside"
                onPressWithoutSnap={onOpenAuthor}
              />
            )}
        <TouchableOpacity activeOpacity={0.8} onPress={onOpenAuthor}>
          <View className="min-w-0 shrink">
            <View className="flex-row items-center">
              <Text
                numberOfLines={1}
                className="shrink font-bold text-white"
              >
                {displayName}
              </Text>
              {isOfficialPost ? <RestaurantBadge /> : null}
              {!isOfficialPost && visibility !== "PUBLIC" ? (
                <View className="ml-1.5">
                  <PostVisibilityIcon
                    visibility={visibility}
                    color="#FFFFFFCC"
                  />
                </View>
              ) : null}
            </View>
            {isOfficialPost ? (
              <Text className="mt-1 text-xs font-semibold text-[#F7D786]">
                Official restaurant
              </Text>
            ) : null}
            {!isOfficialPost && authorHasDisplayName ? (
              <Text className="mt-0.5 text-xs text-white/75">
                {usernameLabel(authorUsername)}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
      <PostAuthorFollowAction
          authorId={authorId}
          hasAuthor={Boolean(authorId)}
          authorRestaurantId={authorRestaurantId}
          authorRelationship={authorRelationship}
          onMedia
        />
    </View>
  );
});

type PostRestaurantMetadataProps = {
  restaurantName?: string | null;
  restaurantStatus?: NonNullable<Post["restaurant"]>["status"];
  taggedUsers: Post["taggedUsers"];
  taggedPeopleLabel?: string;
  canRepost: boolean;
  isReposted: boolean;
  reposting: boolean;
  repostLabel: string;
  onRestaurantPress: () => void;
  onTaggedUsersPress: () => void;
  onToggleRepost: () => void;
};

const PostRestaurantMetadata = memo(function PostRestaurantMetadata({
  restaurantName,
  restaurantStatus,
  taggedUsers,
  taggedPeopleLabel,
  canRepost,
  isReposted,
  reposting,
  repostLabel,
  onRestaurantPress,
  onTaggedUsersPress,
  onToggleRepost,
}: PostRestaurantMetadataProps) {
  return (
    <View className="mb-3 flex-row items-center">
      {restaurantName ? (
        <TouchableOpacity
          className="max-w-[55%] shrink rounded-full bg-[#00000080] px-3 py-2"
          activeOpacity={0.8}
          onPress={onRestaurantPress}
        >
          <View className="min-w-0 flex-row items-center">
            <Text
              numberOfLines={1}
              className="shrink font-semibold text-white"
            >
              {restaurantName}
            </Text>
            <RestaurantBadge size={14} status={restaurantStatus} />
          </View>
        </TouchableOpacity>
      ) : null}

      {taggedUsers?.length ? (
        <TouchableOpacity
          activeOpacity={0.8}
          className="ml-2 min-w-0 shrink flex-row items-center rounded-full bg-[#00000080] py-1.5 pl-1.5 pr-3"
          onPress={onTaggedUsersPress}
        >
          <View className="mr-2 flex-row">
            {taggedUsers.slice(0, 2).map((person, index) => (
              <View
                key={person.id}
                className="rounded-full"
                style={{ marginLeft: index === 0 ? 0 : -6 }}
              >
                <Avatar
                  uri={person.avatarUrl ?? person.avatarThumbnailUrl}
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
            {taggedUsers.length === 1
              ? usernameLabel(taggedUsers[0].username)
              : taggedPeopleLabel}
          </Text>
        </TouchableOpacity>
      ) : null}

      {canRepost ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={repostLabel}
          accessibilityState={{ disabled: reposting || isReposted }}
          disabled={reposting || isReposted}
          activeOpacity={0.8}
          className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-[#00000080]"
          onPress={onToggleRepost}
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
  );
});

type PostStaticSoundLabelProps = {
  title: string;
  artist: string;
  onPress: () => void;
};

const PostStaticSoundLabel = memo(function PostStaticSoundLabel({
  title,
  artist,
  onPress,
}: PostStaticSoundLabelProps) {
  return (
    <View className="mb-2">
      <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
        <View className="min-w-0 flex-row items-center gap-1.5">
          <MusicNoteIcon size={15} color="#FAF9F6" weight="fill" />
          <Text
            numberOfLines={1}
            className="shrink text-sm font-semibold text-white"
          >
            {title} · {artist}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});

type PostConnectedMetadataProps = {
  linkedPosts: Post["linkedPosts"];
  fallbackImageUrl?: string | null;
};

const PostConnectedMetadata = memo(function PostConnectedMetadata({
  linkedPosts,
  fallbackImageUrl,
}: PostConnectedMetadataProps) {
  return (
    <PostConnectionCard
      sourceType="CONTENT"
      linkedPosts={linkedPosts}
      tone="overlay"
      fallbackImageUrl={fallbackImageUrl}
    />
  );
});

type PostCaptionMetadataProps = {
  postId: string;
  soundTitle?: string | null;
  soundArtist?: string | null;
  caption?: string | null;
  captionIsRtl: boolean;
  displayName: string;
  linkedPosts: Post["linkedPosts"];
  fallbackImageUrl?: string | null;
  createdAt: Post["createdAt"];
  captionEdited: boolean;
  onSoundPress: () => void;
  onOpenAuthor: () => void;
  onCaptionExpansionChange: (
    expanded: boolean,
    fullTextHeight: number,
  ) => void;
};

const PostCaptionMetadata = memo(function PostCaptionMetadata({
  postId,
  soundTitle,
  soundArtist,
  caption,
  captionIsRtl,
  displayName,
  linkedPosts,
  fallbackImageUrl,
  createdAt,
  captionEdited,
  onSoundPress,
  onOpenAuthor,
  onCaptionExpansionChange,
}: PostCaptionMetadataProps) {
  return (
    <View>
      {soundTitle ? (
            <PostStaticSoundLabel
              title={soundTitle}
              artist={soundArtist ?? ""}
              onPress={onSoundPress}
            />
          ) : null}
      {caption ? (
            <ExpandablePostCaption
              key={`${postId}-${caption}`}
              text={caption}
              isRtl={captionIsRtl}
              tone="overlay"
              authorName={displayName}
              onAuthorPress={onOpenAuthor}
              onExpansionChange={onCaptionExpansionChange}
            />
          ) : null}
      <PostConnectedMetadata
          linkedPosts={linkedPosts}
          fallbackImageUrl={fallbackImageUrl}
        />
      <PostDate
          createdAt={createdAt}
          tone="overlay"
          hasContentAbove={Boolean(caption || linkedPosts?.length)}
          edited={captionEdited}
        />
    </View>
  );
});

type ContentPostStaticOverlayProps = {
  postId: string;
  repostedBy: Post["repostedBy"];
  bottomAuthorBarHeight: number;
  isRestaurantPost: boolean;
  isOfficialPost: boolean;
  displayAvatar?: string | null;
  displayName: string;
  authorId?: string | null;
  authorUsername?: string | null;
  authorHasDisplayName: boolean;
  authorRestaurantId?: string | null;
  authorRelationship: Post["authorRelationship"];
  visibility: Post["visibility"];
  restaurantId?: string | null;
  restaurantName?: string | null;
  restaurantStatus?: NonNullable<Post["restaurant"]>["status"];
  taggedUsers: Post["taggedUsers"];
  canRepost: boolean;
  isReposted: boolean;
  reposting: boolean;
  soundId?: string | null;
  soundTitle?: string | null;
  soundArtist?: string | null;
  caption?: string | null;
  captionIsRtl: boolean;
  linkedPosts: Post["linkedPosts"];
  fallbackImageUrl?: string | null;
  createdAt: Post["createdAt"];
  captionEdited: boolean;
  onOpenAuthor: () => void;
  onOpenTaggedUsers: () => void;
  onToggleRepost: () => void;
  onCaptionExpansionChange: (
    expanded: boolean,
    fullTextHeight: number,
  ) => void;
};

const ContentPostStaticOverlay = memo(function ContentPostStaticOverlay({
  postId,
  repostedBy,
  bottomAuthorBarHeight,
  isRestaurantPost,
  isOfficialPost,
  displayAvatar,
  displayName,
  authorId,
  authorUsername,
  authorHasDisplayName,
  authorRestaurantId,
  authorRelationship,
  visibility,
  restaurantId,
  restaurantName,
  restaurantStatus,
  taggedUsers,
  canRepost,
  isReposted,
  reposting,
  soundId,
  soundTitle,
  soundArtist,
  caption,
  captionIsRtl,
  linkedPosts,
  fallbackImageUrl,
  createdAt,
  captionEdited,
  onOpenAuthor,
  onOpenTaggedUsers,
  onToggleRepost,
  onCaptionExpansionChange,
}: ContentPostStaticOverlayProps) {
  const { t: tCommon } = useTranslation("common");
  const handleRestaurantPress = useCallback(() => {
    if (!restaurantId) return;
    router.push({
      pathname: "/restaurants/[id]",
      params: { id: restaurantId },
    });
  }, [restaurantId]);
  const handleTaggedUsersPress = useCallback(() => {
    if (!taggedUsers?.length) return;
    if (taggedUsers.length > 1) {
      onOpenTaggedUsers();
      return;
    }
    router.push({
      pathname: "/(users)/[id]",
      params: { id: taggedUsers[0].id },
    });
  }, [onOpenTaggedUsers, taggedUsers]);
  const handleSoundPress = useCallback(() => {
    if (!soundId) return;
    router.push({
      pathname: "/create/content",
      params: { soundId },
    });
  }, [soundId]);

  return (
    <View className="absolute bottom-8 left-4 right-24">
      {repostedBy ? (
        <View className="mb-2 flex-row items-center gap-1.5">
          <RepeatIcon size={14} color="#FAF9F6" weight="bold" />
          <Text className="text-xs font-semibold text-white/85">
            {tCommon("repostedBy", { name: userDisplayName(repostedBy) })}
          </Text>
        </View>
      ) : null}

      {bottomAuthorBarHeight === 0 ? (
            <PostAuthorHeader
              isRestaurantPost={isRestaurantPost}
              isOfficialPost={isOfficialPost}
              displayAvatar={displayAvatar}
              displayName={displayName}
              authorId={authorId}
              authorUsername={authorUsername}
              authorHasDisplayName={authorHasDisplayName}
              authorRestaurantId={authorRestaurantId}
              authorRelationship={authorRelationship}
              visibility={visibility}
              onOpenAuthor={onOpenAuthor}
            />
          ) : null}

      {restaurantId || taggedUsers?.length ? (
            <PostRestaurantMetadata
              restaurantName={restaurantName}
              restaurantStatus={restaurantStatus}
              taggedUsers={taggedUsers}
              taggedPeopleLabel={
                taggedUsers && taggedUsers.length > 1
                  ? tCommon("taggedPeopleCount", {
                      count: taggedUsers.length,
                    })
                  : undefined
              }
              canRepost={canRepost}
              isReposted={isReposted}
              reposting={reposting}
              repostLabel={tCommon(isReposted ? "reposted" : "repost")}
              onRestaurantPress={handleRestaurantPress}
              onTaggedUsersPress={handleTaggedUsersPress}
              onToggleRepost={onToggleRepost}
            />
          ) : null}

      <PostCaptionMetadata
          postId={postId}
          soundTitle={soundTitle}
          soundArtist={soundArtist}
          caption={caption}
          captionIsRtl={captionIsRtl}
          displayName={displayName}
          linkedPosts={linkedPosts}
          fallbackImageUrl={fallbackImageUrl}
          createdAt={createdAt}
          captionEdited={captionEdited}
          onSoundPress={handleSoundPress}
          onOpenAuthor={onOpenAuthor}
          onCaptionExpansionChange={onCaptionExpansionChange}
        />
    </View>
  );
});

type SuspendedFeedContentVideoProps = ComponentProps<
  typeof FeedContentVideo
> & {
  active: boolean;
  suspensionController: MediaSuspensionController;
};

function SuspendedFeedContentVideo({
  active,
  suspensionController,
  ...props
}: SuspendedFeedContentVideoProps) {
  const suspended = useSyncExternalStore(
    suspensionController.subscribe,
    () => active && suspensionController.getSnapshot(),
    () => false,
  );
  return (
    <FeedContentVideo
      {...props}
      active={active}
      paused={suspended}
      updatesSuspended={suspended}
    />
  );
}

type SuspendedSoundPlaybackProps = ComponentProps<typeof SoundPlayback> & {
  active: boolean;
  controller: MediaSuspensionController;
};

function SuspendedSoundPlayback({
  active,
  controller,
  playing,
  ...props
}: SuspendedSoundPlaybackProps) {
  const suspended = useSyncExternalStore(
    controller.subscribe,
    () => active && controller.getSnapshot(),
    () => false,
  );
  return <SoundPlayback {...props} playing={playing && !suspended} />;
}

function ContentPost({
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
  deferMediaWhenInactive = false,
  enablePreparedCarouselInteraction = false,
  prepareSoundPlayback = false,
  mediaSuspensionController,
  feedVideoController,
}: Props) {
  const { t } = useTranslation("restaurants");
  const { t: tCommon, i18n } = useTranslation("common");
  const { width } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
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
  const [soundControlVisible, setSoundControlVisible] = useState(false);
  const contentFeedMuted = useContentFeedAudio();
  const mediaHeight = Math.max(1, height - bottomAuthorBarHeight);
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
  const content = post.contentPost;
  const isRestaurantPost = !!post.authorRestaurantId && !!post.authorRestaurant;
  const isOfficialPost = isRestaurantPost && !!post.restaurant;
  const authorProfileId = post.author?.id;
  const officialRestaurantProfileId = isOfficialPost
    ? post.restaurant?.id
    : undefined;

  const toggleRepost = useCallback(async () => {
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
  }, [
    isReposted,
    post.canRepost,
    post.id,
    queryClient,
    reposting,
    showToast,
    tCommon,
  ]);

  const openAuthorProfile = useCallback(() => {
    if (officialRestaurantProfileId) {
      router.push({
        pathname: "/restaurants/[id]",
        params: { id: officialRestaurantProfileId },
      });
      return;
    }
    if (!authorProfileId) return;
    router.push({
      pathname: "/(users)/[id]",
      params: { id: authorProfileId },
    });
  }, [authorProfileId, officialRestaurantProfileId]);

  const openTaggedUsers = useCallback(() => setTaggedUsersOpen(true), []);

  const displayAvatar = isRestaurantPost
    ? post.authorRestaurant?.logoUrl
    : post.author?.avatarUrl;

  const displayName = isRestaurantPost
    ? (post.authorRestaurant?.name ?? "")
    : userDisplayName(post.author);

  const media = useMemo(
    () => getContentMedia(post.id, content),
    [content, post.id],
  );
  const caption = content?.caption;
  const videoMedia = media.find(
    (item) => item.type === "VIDEO" && !!item.videoUrl,
  );
  const singleImageMedia =
    !videoMedia && media.length === 1 && media[0].imageUrl ? media[0] : null;
  const deferMediaLifecycle = deferMediaWhenInactive && !isActive;
  const shouldMountSoundPlayback =
    Boolean(content?.sound?.audioUrl) &&
    (videoMedia ? isActive : prepareSoundPlayback);
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

  const iconShadow = contentPostStyles.iconShadow;
  const textShadow = contentPostStyles.textShadow;

  const handleDoubleTapLike = useCallback((x: number, y: number) => {
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
  }, [
    heartOverlayOpacity,
    heartOverlayRotation,
    heartOverlayScale,
    heartOverlayX,
    heartOverlayY,
    likeScale,
    onToggleLike,
    post.id,
    post.isLiked,
  ]);

  const handleLike = useCallback(() => {
    if (!post.isLiked) {
      likeScale.set(1);
      likeScale.set(withSequence(withSpring(1.25), withSpring(1)));
    } else {
      likeScale.set(1);
    }

    onToggleLike(post.id, post.isLiked);
  }, [likeScale, onToggleLike, post.id, post.isLiked]);

  const handleWantToTry = useCallback(() => {
    const restaurantId = post.restaurant?.id;
    if (!restaurantId) return;

    if (useExternalBookmarkHandler) {
      onToggleWantToTry(post.id, restaurantId, isWantToTry);
      return;
    }

    if (!isWantToTry && !isVisited && !isFavorite && savedListCount === 0) {
      void quickSavePlace(restaurantId, post.id);
      return;
    }

    openManageSavedPlace({
      restaurantId,
      currentStatus: userRestaurant,
      savedFromPostId: post.id,
    });
  }, [
    isFavorite,
    isVisited,
    isWantToTry,
    onToggleWantToTry,
    openManageSavedPlace,
    post.id,
    post.restaurant?.id,
    quickSavePlace,
    savedListCount,
    useExternalBookmarkHandler,
    userRestaurant,
  ]);

  const handleCaptionExpansion = useCallback((
    expanded: boolean,
    fullTextHeight: number,
  ) => {
    const extraCaptionHeight = Math.max(0, fullTextHeight - 24) + 28;
    const maximumHeight = Math.max(280, mediaHeight - contentTopInset);
    const nextHeight = expanded
      ? Math.min(maximumHeight, 280 + extraCaptionHeight)
      : 280;

    gradientHeight.set(withTiming(nextHeight, { duration: 260 }));
  }, [contentTopInset, gradientHeight, mediaHeight]);

  const handleOpenLikes = useCallback(() => setLikesOpen(true), []);
  const handleOpenComments = useCallback(
    () => onOpenComments(post.id),
    [onOpenComments, post.id],
  );
  const handleOpenShare = useCallback(
    () => onOpenSharePost(post.id),
    [onOpenSharePost, post.id],
  );
  const handleOpenOptions = useCallback(
    () => onOpenPostOptions(post.id),
    [onOpenPostOptions, post.id],
  );

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
        onPress={
          content?.sound && !videoMedia
            ? () => setSoundControlVisible((visible) => !visible)
            : undefined
        }
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
            {deferMediaLifecycle ? (
              <StaticMediaPresentation
                uri={videoMedia.thumbnailUrl ?? content?.thumbnailUrl}
                thumbnailUrl={videoMedia.thumbnailUrl ?? content?.thumbnailUrl}
                overlayUri={content?.videoOverlayImageUrl}
              />
            ) : (
              <SuspendedFeedContentVideo
                active={isActive}
                suspensionController={mediaSuspensionController}
                controller={feedVideoController}
                sourceKey={`${post.id}:${videoMedia.id}`}
                postId={post.id}
                mediaId={videoMedia.id}
                uri={videoMedia.videoUrl}
                posterUri={
                  videoMedia.thumbnailUrl ?? content?.thumbnailUrl ?? null
                }
                overlayUri={content?.videoOverlayImageUrl ?? undefined}
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
            )}
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
            {deferMediaLifecycle ? (
              <StaticMediaPresentation
                uri={singleImageMedia.imageUrl}
                thumbnailUrl={singleImageMedia.thumbnailUrl}
              />
            ) : (
              <PinchZoomImage
                uri={singleImageMedia.imageUrl}
                thumbnailUrl={singleImageMedia.thumbnailUrl}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
                onDoubleTap={handleDoubleTapLike}
                onPinchStart={onPinchStart}
                onPinchEnd={onPinchEnd}
              />
            )}
          </View>
        ) : media.length &&
          deferMediaLifecycle &&
          !enablePreparedCarouselInteraction ? (
          <StaticMediaPresentation
            uri={media[0]?.imageUrl ?? media[0]?.thumbnailUrl}
            thumbnailUrl={media[0]?.thumbnailUrl}
          />
        ) : media.length ? (
          <ContentMediaCarousel
            media={media}
            width={width}
            height={mediaHeight}
            onDoubleTap={handleDoubleTapLike}
            onPinchStart={onPinchStart}
            onPinchEnd={onPinchEnd}
          />
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

        {shouldMountSoundPlayback && content?.sound ? (
          <SuspendedSoundPlayback
            key={`${content.sound.id}-${soundPlaybackRevision}`}
            active={isActive}
            controller={mediaSuspensionController}
            sound={content.sound}
            startTimeMs={
              ((content.soundStartTimeMs ?? 0) + soundPlaybackOffsetMs) %
              Math.max(1, content.sound.durationMs)
            }
            volume={contentFeedMuted ? 0 : (content.soundVolume ?? 1)}
            playing={isActive && (videoMedia ? videoPlaying : true)}
            prepareWhileInactive={!videoMedia}
          />
        ) : null}

        {!mediaOnly &&
        content?.sound &&
        !videoMedia &&
        isActive &&
        soundControlVisible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={contentFeedMuted ? "Unmute" : "Mute"}
            onPress={(event) => {
              event.stopPropagation();
              setContentFeedMuted(!contentFeedMuted);
            }}
            style={[
              {
                position: "absolute",
                left: "50%",
                top: "50%",
                zIndex: 30,
                width: 48,
                height: 48,
                marginLeft: -24,
                marginTop: -24,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.58)",
              },
              iconShadow,
            ]}
          >
            {contentFeedMuted ? (
              <SpeakerSlashIcon size={25} color="#FFFFFF" weight="fill" />
            ) : (
              <SpeakerHighIcon size={25} color="#FFFFFF" weight="fill" />
            )}
          </Pressable>
        ) : null}

        {!mediaOnly &&
        media.length > 1 &&
        deferMediaLifecycle &&
        !enablePreparedCarouselInteraction
          ? <ContentPagination media={media} activeIndex={0} animated={false} />
          : null}

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

        {!mediaOnly ? (
          <ContentPostStaticOverlay
                postId={post.id}
                repostedBy={post.repostedBy}
                bottomAuthorBarHeight={bottomAuthorBarHeight}
                isRestaurantPost={isRestaurantPost}
                isOfficialPost={isOfficialPost}
                displayAvatar={displayAvatar}
                displayName={displayName}
                authorId={post.author?.id}
                authorUsername={post.author?.username}
                authorHasDisplayName={Boolean(
                  post.author?.displayName?.trim(),
                )}
                authorRestaurantId={post.authorRestaurantId}
                authorRelationship={post.authorRelationship}
                visibility={post.visibility}
                restaurantId={post.restaurant?.id}
                restaurantName={post.restaurant?.name}
                restaurantStatus={post.restaurant?.status}
                taggedUsers={post.taggedUsers}
                canRepost={Boolean(post.canRepost)}
                isReposted={isReposted}
                reposting={reposting}
                soundId={content?.sound?.id}
                soundTitle={content?.sound?.title}
                soundArtist={content?.sound?.artist}
                caption={caption}
                captionIsRtl={captionIsRtl}
                linkedPosts={post.linkedPosts}
                fallbackImageUrl={
                  media[0]?.thumbnailUrl ?? media[0]?.imageUrl ?? null
                }
                createdAt={post.createdAt}
                captionEdited={Boolean(content?.captionEditedAt)}
                onOpenAuthor={openAuthorProfile}
                onOpenTaggedUsers={openTaggedUsers}
                onToggleRepost={toggleRepost}
                onCaptionExpansionChange={handleCaptionExpansion}
          />
        ) : null}

        {!mediaOnly ? (
          <PostActionRail
                isLiked={post.isLiked}
                canViewLikes={post.canViewLikes}
                likesCount={post.likesCount}
                commentsDisabled={post.commentsDisabled}
                commentsLabel={
                  post.commentsDisabled
                    ? tCommon("commentsOff")
                    : post.commentsCount
                }
                isPublic={post.visibility === "PUBLIC"}
                sharesCount={post.sharesCount ?? 0}
                isWantToTry={isWantToTry}
                isVisited={isVisited}
                isFavorite={isFavorite}
                savedListCount={savedListCount}
                saveLabel={
                  !isWantToTry &&
                  !isVisited &&
                  !isFavorite &&
                  savedListCount > 0
                    ? tCommon("inList")
                    : t(bookmarkLabelKey)
                }
                optionsLabel={tCommon("postOptions")}
                likeAnimatedStyle={likeAnimatedStyle}
                onLike={handleLike}
                onOpenLikes={handleOpenLikes}
                onOpenComments={handleOpenComments}
                onOpenShare={handleOpenShare}
                onSave={handleWantToTry}
                onOpenOptions={handleOpenOptions}
          />
        ) : null}
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
      {taggedUsersOpen ? (
        <TaggedUsersBottomSheet
          open
          users={post.taggedUsers ?? []}
          displayNames
          showRelationshipActions
          onClose={() => setTaggedUsersOpen(false)}
        />
      ) : null}
      {likesOpen ? (
        <PostLikesBottomSheet
          postId={post.id}
          open
          onClose={() => setLikesOpen(false)}
        />
      ) : null}
    </View>
  );
}

export default memo(ContentPost);
