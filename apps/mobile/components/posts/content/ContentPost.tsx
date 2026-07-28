import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { Post } from "@findeat/types/post";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ChatCircleIcon,
  HeartIcon,
  ShareFatIcon,
  DotsThreeOutlineIcon,
} from "phosphor-react-native";
import { TouchableOpacity, View } from "react-native";
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

type Props = {
  post: Post;
  height: number;
  contentTopInset?: number;
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
  onToggleLike,
  onOpenComments,
  onOpenSharePost,
  onOpenPostOptions,
  onPinchStart,
  onPinchEnd,
}: Props) {
  const { t } = useTranslation("restaurants");
  const { t: tCommon, i18n } = useTranslation("common");
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
  const content = post.contentPost;
  const isRestaurantPost = !!post.authorRestaurantId && !!post.authorRestaurant;
  const isOfficialPost = isRestaurantPost && !!post.restaurant;

  const displayAvatar = isRestaurantPost
    ? post.authorRestaurant?.logoUrl
    : post.author?.avatarUrl;

  const displayName = isRestaurantPost
    ? (post.authorRestaurant?.name ?? "")
    : (post.author?.username ?? "");

  const imageUrl = content?.imageUrl;
  const description = content?.description;
  const descriptionIsRtl = isRtlText(description, isRtl);

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

  const iconShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  };

  const textShadow = {
    textShadowColor: "#000",
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
    <View style={{ height }}>
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
        {imageUrl ? (
          <PinchZoomImage
            uri={imageUrl}
            thumbnailUrl={content?.thumbnailUrl}
            style={{ position: "absolute", inset: 0 }}
            resizeMode="cover"
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
                  writingDirection: descriptionIsRtl ? "rtl" : "ltr",
                },
              ]}
              className="px-8 text-2xl font-bold text-white"
            >
              {description}
            </Text>
          </View>
        )}

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

        <TouchableOpacity
          className="absolute right-4 z-10 p-1"
          style={{ top: contentTopInset + 16 }}
          activeOpacity={0.8}
          onPress={() => onOpenPostOptions(post.id)}
        >
          <DotsThreeOutlineIcon
            size={30}
            color="white"
            weight="fill"
            style={iconShadow}
          />
        </TouchableOpacity>
        <View className="absolute bottom-8 left-4 right-20">
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <TouchableOpacity
              className="min-w-0 flex-1 flex-row items-center gap-3"
              activeOpacity={0.8}
              onPress={() => {
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
              }}
            >
              <Avatar
                uri={displayAvatar}
                username={displayName ?? ""}
                size={42}
                fallbackType={isOfficialPost ? "restaurant" : "user"}
              />

              <View className="min-w-0 flex-1">
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
            <PostAuthorFollowAction post={post} onMedia />
          </View>

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
            {!!description && (
              <>
                <ExpandablePostCaption
                  key={`${post.id}-${description}`}
                  text={description}
                  isRtl={descriptionIsRtl}
                  tone="overlay"
                  onExpansionChange={handleCaptionExpansion}
                />
                {!!content?.descriptionEditedAt && (
                  <Text
                    className="mt-0.5 text-xs text-white/70"
                    style={{
                      alignSelf: "stretch",
                      width: "100%",
                      textAlign: "auto",
                      writingDirection: descriptionIsRtl ? "rtl" : "ltr",
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
            />
            <PostDate
              createdAt={post.createdAt}
              tone="overlay"
              hasContentAbove={!!description || !!post.linkedPosts?.length}
            />
          </View>
        </View>

        <View className="absolute bottom-26 right-4 w-16 items-center gap-5">
          <TouchableOpacity onPress={handleLike}>
            <Animated.View style={likeAnimatedStyle}>
              <HeartIcon
                weight="fill"
                color={post.isLiked ? "#FF3040" : "#FFFFFFCC"}
                size={35}
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

          <TouchableOpacity onPress={() => onOpenComments(post.id)}>
            <ChatCircleIcon
              weight="fill"
              color="#FFFFFFCC"
              size={35}
              style={iconShadow}
            />
            <Text style={textShadow} className="text-center text-lg text-white">
              {post.commentsCount}
            </Text>
          </TouchableOpacity>

          {post.visibility === "PUBLIC" && (
            <TouchableOpacity onPress={() => onOpenSharePost(post.id)}>
              <ShareFatIcon
                weight="fill"
                color="#FFFFFFCC"
                size={35}
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
              size={35}
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
        </View>
    </View>
  );
}
