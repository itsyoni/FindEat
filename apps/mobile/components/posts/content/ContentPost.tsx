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
} from "phosphor-react-native";
import {
  FlatList,
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
import { useEffect, useState } from "react";
import { useAppTheme } from "@/contexts/ThemeContext";
import SnapAvatarButton from "@/components/snaps/SnapAvatarButton";

const CONTENT_ACTION_ICON_SIZE = 31;

type Props = {
  post: Post;
  height: number;
  contentTopInset?: number;
  controlsTopInset?: number;
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
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function ContentPost({
  post,
  height,
  contentTopInset = 0,
  isActive = true,
  onToggleLike,
  onOpenComments,
  onOpenSharePost,
  onOpenPostOptions,
  onPinchStart,
  onPinchEnd,
}: Props) {
  const { t } = useTranslation("restaurants");
  const { t: tCommon, i18n } = useTranslation("common");
  const { width } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
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
  const savedListCount = post.restaurant
    ? (savedListCounts[post.restaurant.id] ?? post.restaurantSavedListCount ?? 0)
    : 0;

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
    : (post.author?.username ?? "");

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
    const maximumHeight = Math.max(280, height - contentTopInset);
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
              height,
              backgroundColor: "#080808",
            }}
          >
            <ContentVideo
              uri={videoMedia.videoUrl}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              autoPlay={isActive}
              nativeControls={false}
              tapToToggle
              showProgress
            />
          </View>
        ) : singleImageMedia?.imageUrl ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              width,
              height,
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
          <FlatList
            style={{ position: "absolute", inset: 0 }}
            horizontal
            pagingEnabled
            data={media}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setActiveMediaIndex(
                Math.round(event.nativeEvent.contentOffset.x / width),
              )
            }
            renderItem={({ item }) => (
              <View style={{ width, height, backgroundColor: "#080808" }}>
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

        {media.length > 1 ? (
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 z-10 flex-row justify-center gap-1.5"
            style={{ bottom: 8 }}
          >
            {media.map((item, index) => (
              <View
                key={item.id}
                className={`h-1.5 rounded-full ${
                  index === activeMediaIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </View>
        ) : null}

        <AnimatedLinearGradient
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
        />

        <View className="absolute bottom-8 left-4 right-24">
          <View className="mb-3 flex-row items-center justify-start gap-3">
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
                      {isOfficialPost ? displayName : `@${displayName}`}
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
                </View>
              </TouchableOpacity>
            </View>
            <PostAuthorFollowAction post={post} onMedia />
          </View>

          {!!post.taggedUsers?.length && (
            <View className="mb-3 flex-row items-center">
              <View className="mr-2 flex-row">
                {post.taggedUsers.slice(0, 3).map((person, index) => (
                  <TouchableOpacity
                    key={person.id}
                    activeOpacity={0.8}
                    style={{ marginLeft: index === 0 ? 0 : -8 }}
                    onPress={() =>
                      router.push({
                        pathname: "/(users)/[id]",
                        params: { id: person.id },
                      })
                    }
                  >
                    <View className="rounded-full border border-white/80">
                      <Avatar
                        uri={person.avatarUrl}
                        username={person.username}
                        size={27}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/(users)/[id]",
                    params: { id: post.taggedUsers![0].id },
                  })
                }
              >
                <Text
                  numberOfLines={1}
                  style={textShadow}
                  className="max-w-56 text-sm font-semibold text-white"
                >
                  {post.taggedUsers.length === 1
                    ? `${tCommon("taggedWith")} @${post.taggedUsers[0].username}`
                    : tCommon("taggedWithMore", {
                        name: `@${post.taggedUsers[0].username}`,
                        count: post.taggedUsers.length - 1,
                      })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!!post.restaurant && (
            <TouchableOpacity
              className="mb-3 self-start rounded-full bg-[#00000080] px-3 py-2"
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/restaurants/[id]",
                  params: { id: post.restaurant!.id },
                })
              }
            >
              <View className="flex-row items-center">
                <Text className="font-semibold text-white">
                  {post.restaurant.name}
                </Text>
                <RestaurantBadge size={14} status={post.restaurant.status} />
              </View>
            </TouchableOpacity>
          )}

          <View>
            {!!caption && (
              <>
                <ExpandablePostCaption
                  key={`${post.id}-${caption}`}
                  text={caption}
                  isRtl={captionIsRtl}
                  tone="overlay"
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
        </View>

        <View className="absolute bottom-8 right-4 w-16 items-center gap-5">
          <TouchableOpacity className="w-16 items-center" onPress={handleLike}>
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

            <Text style={textShadow} className="text-center text-lg text-white">
              {post.likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-16 items-center"
            onPress={() => onOpenComments(post.id)}
          >
            <ChatCircleIcon
              weight="fill"
              color="#FFFFFFCC"
              size={CONTENT_ACTION_ICON_SIZE}
              style={iconShadow}
            />
            <Text style={textShadow} className="text-center text-lg text-white">
              {post.commentsCount}
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
        </View>
      </Animated.View>
    </View>
  );
}
