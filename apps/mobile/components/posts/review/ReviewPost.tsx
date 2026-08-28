import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { Post } from "@findeat/types/post";
import { router } from "expo-router";
import {
  ChatCircleIcon,
  DotsThreeOutlineIcon,
  HeartIcon,
  ShareFatIcon,
  StarIcon,
  UserIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  I18nManager,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "@/contexts/ThemeContext";
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
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { useSaveToLists } from "@/contexts/SaveToListsContext";
import ReviewCollaborationCard from "./ReviewCollaborationCard";
import PostAuthorFollowAction from "@/components/posts/PostAuthorFollowAction";
import { prefetchImageUrls } from "@/lib/imagePrefetch";
import SnapAvatarButton from "@/components/snaps/SnapAvatarButton";
import TaggedUsersBottomSheet from "@/components/posts/content/TaggedUsersBottomSheet";
import PostLikesBottomSheet from "@/components/posts/PostLikesBottomSheet";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";

type Props = {
  post: Post;
  onToggleLike: (postId: string, isLiked: boolean) => void;
  onOpenComments: (postId: string) => void;
  onOpenSharePost: (postId: string) => void;
  onOpenPostOptions: (postId: string) => void;
  onToggleWantToTry: (
    postId: string,
    restaurantId: string,
    isWantToTry: boolean,
  ) => void;
  preferredPerspectiveUserId?: string;
};

type DishPerspective = {
  id: string;
  userId: string;
  username?: string | null;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  rating?: number | null;
  text?: string | null;
  textEditedAt?: string | null;
};

type ReviewSlide =
  | {
      type: "COVER";
      id: string;
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
      text?: string | null;
      textEditedAt?: string | null;
      captionAuthorUsername?: string | null;
      captionAuthorUserId?: string | null;
    }
  | {
      type: "DISH";
      id: string;
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
      text?: string | null;
      textEditedAt?: string | null;
      captionAuthorUsername?: string | null;
      captionAuthorUserId?: string | null;
      dishName: string;
      price?: number | null;
      rating?: number | null;
      menuItemId?: string | null;
      isLinkedToMenu: boolean;
      perspectives: DishPerspective[];
      selectedPerspectiveId: string;
    };

const reviewViewabilityConfig = { itemVisiblePercentThreshold: 60 };

function ReviewPaginationDot({
  active,
  isDark,
}: {
  active: boolean;
  isDark: boolean;
}) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, { duration: 170 }));
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: 6 + progress.value * 10,
    opacity: 0.55 + progress.value * 0.45,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      isDark ? ["#4B5563", "#FAF9F6"] : ["#D1D5DB", "#111111"],
    ),
  }));

  return <Animated.View className="h-1.5 rounded-full" style={animatedStyle} />;
}

export default function ReviewPost({
  post,
  onToggleLike,
  onOpenComments,
  onOpenSharePost,
  onOpenPostOptions,
  preferredPerspectiveUserId,
}: Props) {
  const {
    openManageSavedPlace,
    quickSavePlace,
    savedListCounts,
    statusOverrides,
  } = useSaveToLists();
  const { isDark } = useAppTheme();
  const { t } = useTranslation("restaurants");
  const { t: tCommon, i18n } = useTranslation("common");
  const { t: tCollaboration } = useTranslation("collaborativeReview");
  const { t: tCreate } = useTranslation("create");
  const isRtl = i18n.language.startsWith("he");
  const actionColor = isDark ? "#E5E7EB" : "#212121";
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPinchingMedia, setIsPinchingMedia] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [optimisticLike, setOptimisticLike] = useState<{
    isLiked: boolean;
    likesCount: number;
    baseIsLiked: boolean;
    baseLikesCount: number;
  } | null>(null);
  const likePressStartedAt = useRef(0);
  const [selectedPerspectiveIds, setSelectedPerspectiveIds] = useState<
    Record<string, string>
  >({});
  const [selectedCoverRatingId, setSelectedCoverRatingId] = useState<
    string | null
  >(preferredPerspectiveUserId ?? post.authorId ?? null);
  const review = post.reviewPost;
  const shouldShowOptimisticLike =
    optimisticLike?.baseIsLiked === post.isLiked &&
    optimisticLike?.baseLikesCount === post.likesCount;
  const displayedIsLiked = shouldShowOptimisticLike
    ? optimisticLike.isLiked
    : post.isLiked;
  const displayedLikesCount = shouldShowOptimisticLike
    ? optimisticLike.likesCount
    : post.likesCount;
  const items = review?.items ?? [];

  const totalPrice = items.reduce((sum, item) => {
    const price = item.menuItem?.price ?? item.customPrice ?? 0;
    return sum + price;
  }, 0);

  const slides: ReviewSlide[] = [
    {
      type: "COVER",
      id: "cover",
      imageUrl: review?.coverImageUrl,
      thumbnailUrl: review?.coverThumbnailUrl,
      text: review?.summary,
      textEditedAt: review?.summaryEditedAt,
      captionAuthorUsername:
        userDisplayName(post.author) || post.authorRestaurant?.name,
      captionAuthorUserId: post.author?.id,
    },
    ...items.map((item) => {
      const authorContribution = (item.contributions ?? []).find(
        (contribution) => contribution.userId === post.authorId,
      );
      const authorMedia = (item.media ?? []).find(
        (media) => media.uploadedById === post.authorId,
      );
      const authorImageUrl =
        authorMedia?.imageUrl ??
        (item.createdById === post.authorId ? item.imageUrl : undefined) ??
        item.menuItem?.imageUrl;
      const authorPerspective: DishPerspective = {
            id: post.authorId ?? "review-author",
            userId: post.authorId ?? "review-author",
            username: userDisplayName(post.author),
            avatarUrl: post.author?.avatarUrl,
            imageUrl: authorImageUrl,
            thumbnailUrl:
              authorMedia?.thumbnailUrl ??
              (item.createdById === post.authorId
                ? item.thumbnailUrl
                : undefined) ??
              item.menuItem?.thumbnailUrl,
            rating: authorContribution?.rating ?? item.rating,
            text: authorContribution?.text ?? item.text,
            textEditedAt:
              authorContribution?.textEditedAt ?? item.textEditedAt,
          };
      const collaboratorUserIds = [
        ...(item.contributions ?? []).map((contribution) => contribution.userId),
        ...(item.media ?? []).map((media) => media.uploadedById),
      ].filter(
        (userId, index, candidates) =>
          userId !== post.authorId && candidates.indexOf(userId) === index,
      );
      const collaboratorPerspectives = collaboratorUserIds.flatMap((userId) => {
        const contribution = (item.contributions ?? []).find(
          (candidate) => candidate.userId === userId,
        );
        const media = (item.media ?? []).find(
          (candidate) => candidate.uploadedById === userId,
        );
        const perspectiveUser = contribution?.user ?? media?.uploadedBy;
        const imageUrl =
          media?.imageUrl ??
          (item.createdById === userId
            ? item.imageUrl ?? item.menuItem?.imageUrl
            : item.primaryMedia?.imageUrl ??
              item.imageUrl ??
              item.menuItem?.imageUrl);
        if (!perspectiveUser) return [];

        return [
          {
            id: userId,
            userId,
            username: userDisplayName(perspectiveUser),
            avatarUrl: perspectiveUser.avatarUrl,
            imageUrl,
            thumbnailUrl:
              media?.thumbnailUrl ??
              (item.createdById === userId
                ? item.thumbnailUrl ?? item.menuItem?.thumbnailUrl
                : undefined),
            rating: contribution?.rating,
            text: contribution?.text,
            textEditedAt: contribution?.textEditedAt,
          } satisfies DishPerspective,
        ];
      });
      const perspectives = [
        ...(item.createdById === post.authorId || authorContribution
          ? [authorPerspective]
          : []),
        ...collaboratorPerspectives,
      ].filter(
        (perspective, index, candidates) =>
          candidates.findIndex(
            (candidate) => candidate.userId === perspective.userId,
          ) === index,
      );
      const preferredUserId = preferredPerspectiveUserId ?? post.authorId;
      const selectedPerspective =
        perspectives.find(
          (perspective) =>
            perspective.id === selectedPerspectiveIds[item.id],
        ) ??
        perspectives.find(
          (perspective) => perspective.userId === preferredUserId,
        ) ??
        perspectives[0];
      return {
      type: "DISH" as const,
      id: item.id,
      menuItemId: item.menuItemId,
      isLinkedToMenu: !!item.menuItemId,
      imageUrl: selectedPerspective?.imageUrl,
      thumbnailUrl: selectedPerspective?.thumbnailUrl,
      text: selectedPerspective?.text,
      textEditedAt: selectedPerspective?.textEditedAt,
      captionAuthorUsername: selectedPerspective?.username,
      captionAuthorUserId: selectedPerspective?.userId,
      dishName: item.customDishName ?? item.menuItem?.name ?? "Dish",
      price: item.customPrice ?? item.menuItem?.price,
      rating: selectedPerspective?.rating,
      perspectives,
      selectedPerspectiveId: selectedPerspective?.id ?? "",
    };
    }),
  ];

  const activeSlide = slides[activeIndex];
  const upcomingSlideUrls = slides
    .slice(activeIndex + 1, activeIndex + 3)
    .map((slide) => slide.imageUrl)
    .filter((url): url is string => !!url)
    .join("|");
  useEffect(() => {
    if (upcomingSlideUrls) {
      prefetchImageUrls(upcomingSlideUrls.split("|"));
    }
  }, [upcomingSlideUrls]);
  const activeTextIsRtl = isRtlText(activeSlide?.text, isRtl);
  const indicatorSlides = I18nManager.isRTL ? [...slides].reverse() : slides;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ReviewSlide>[] }) => {
      const nextIndex = viewableItems.find(
        (item) => item.isViewable && typeof item.index === "number",
      )?.index;
      if (typeof nextIndex === "number") setActiveIndex(nextIndex);
    },
    [setActiveIndex],
  );

  const isRestaurantPost = !!post.authorRestaurantId && !!post.authorRestaurant;

  const displayAvatar = isRestaurantPost
    ? post.authorRestaurant?.logoUrl
    : post.author?.avatarUrl;

  const displayName = isRestaurantPost
    ? post.authorRestaurant?.name
    : userDisplayName(post.author);
  const joinedCollaborators = useMemo(
    () =>
      (post.reviewParticipants ?? []).filter(
        (participant) =>
          participant.status === "JOINED" &&
          participant.userId !== post.authorId,
      ),
    [post.authorId, post.reviewParticipants],
  );
  const firstCollaborator = joinedCollaborators[0];
  const additionalCollaboratorCount = Math.max(
    0,
    joinedCollaborators.length - 1,
  );
  const sharedAuthorName =
    !isRestaurantPost && firstCollaborator && displayName
      ? additionalCollaboratorCount > 0
        ? tCollaboration("sharedAuthorsWithOthers", {
            author: displayName,
            collaborator: userDisplayName(firstCollaborator.user),
            count: additionalCollaboratorCount,
          })
        : tCollaboration("sharedAuthorsPair", {
            author: displayName,
            collaborator: userDisplayName(firstCollaborator.user),
          })
      : null;
  const collaborationUsers = useMemo(
    () => [
      ...(post.author ? [post.author] : []),
      ...joinedCollaborators.map((participant) => participant.user),
    ],
    [joinedCollaborators, post.author],
  );
  const joinedRatingParticipants = (post.reviewParticipants ?? []).filter(
    (participant) => participant.status === "JOINED",
  );
  const ratingCount = (
    key: "atmosphereRating" | "serviceRating" | "valueRating",
  ) =>
    joinedRatingParticipants.filter((participant) => participant[key] != null)
      .length;
  const overallRaterCount = Math.max(
    ratingCount("atmosphereRating"),
    ratingCount("serviceRating"),
    ratingCount("valueRating"),
  );
  const coverRatingPerspectives = joinedRatingParticipants.flatMap(
    (participant) => {
      const experienceRatings = [
        participant.atmosphereRating,
        participant.serviceRating,
        participant.valueRating,
      ].filter((rating): rating is number => rating != null);
      if (experienceRatings.length === 0) return [];
      return [
        {
          userId: participant.userId,
          user: participant.user,
          atmosphereRating: participant.atmosphereRating,
          serviceRating: participant.serviceRating,
          valueRating: participant.valueRating,
        },
      ];
    },
  );
  const selectedCoverRating =
    coverRatingPerspectives.find(
      (perspective) => perspective.userId === selectedCoverRatingId,
    ) ??
    coverRatingPerspectives.find(
      (perspective) =>
        perspective.userId === (preferredPerspectiveUserId ?? post.authorId),
    ) ??
    coverRatingPerspectives[0];
  const displayedCoverAtmosphere = selectedCoverRating
    ? selectedCoverRating.atmosphereRating
    : review?.atmosphereRating;
  const displayedCoverService = selectedCoverRating
    ? selectedCoverRating.serviceRating
    : review?.serviceRating;
  const displayedCoverValue = selectedCoverRating
    ? selectedCoverRating.valueRating
    : review?.valueRating;

  const userRestaurant = post.restaurant?.id
    ? (statusOverrides[post.restaurant.id] ?? post.restaurant.userSaves?.[0])
    : undefined;
  const isWantToTry = !!userRestaurant?.wantToTry;
  const isVisited = !!userRestaurant?.visited;
  const isFavorite = !!userRestaurant?.favorite;
  const savedListCount = post.restaurant
    ? (savedListCounts[post.restaurant.id] ?? post.restaurantSavedListCount ?? 0)
    : 0;

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

  function handleDoubleTapLike(x: number, y: number) {
    heartOverlayX.set(x);
    heartOverlayY.set(y);
    heartOverlayRotation.set(Math.random() * 30 - 15);
    heartOverlayOpacity.set(1);
    heartOverlayScale.set(0.4);
    heartOverlayScale.set(
      withSequence(withSpring(1.25), withSpring(1), withSpring(0)),
    );
    heartOverlayOpacity.set(
      withSequence(withSpring(1), withSpring(1), withSpring(0)),
    );

    if (displayedIsLiked) return;

    likeScale.set(1);
    likeScale.set(withSequence(withSpring(1.35), withSpring(1)));
    setOptimisticLike({
      isLiked: true,
      likesCount: displayedLikesCount + 1,
      baseIsLiked: post.isLiked,
      baseLikesCount: post.likesCount,
    });
    onToggleLike(post.id, false);
  }

  function handleLike() {
    if (!displayedIsLiked) {
      likeScale.set(1);
      likeScale.set(withSequence(withSpring(1.25), withSpring(1)));
    } else {
      likeScale.set(1);
    }

    setOptimisticLike({
      isLiked: !displayedIsLiked,
      likesCount: Math.max(0, displayedLikesCount + (displayedIsLiked ? -1 : 1)),
      baseIsLiked: post.isLiked,
      baseLikesCount: post.likesCount,
    });
    onToggleLike(post.id, displayedIsLiked);
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

  const bookmarkLabelKey = getPlaceStatusLabelKey(
    isWantToTry,
    isVisited,
    isFavorite,
  );
  function openAuthorProfile() {
    if (isRestaurantPost && post.authorRestaurant?.id) {
      router.push({
        pathname: "/restaurants/[id]",
        params: { id: post.authorRestaurant.id },
      });
      return;
    }

    if (!post.author?.id) return;
    router.push({
      pathname: "/(users)/[id]",
      params: { id: post.author.id },
    });
  }

  function openRestaurantProfile() {
    if (!post.restaurant?.id) return;
    router.push({
      pathname: "/restaurants/[id]",
      params: { id: post.restaurant.id },
    });
  }

  return (
    <View className="mb-6 bg-white pb-6 dark:bg-black">
      <View className="mb-3 flex-row items-center justify-between px-4">
        <View className="flex-1 flex-row items-center gap-3">
          {isRestaurantPost ? (
            <TouchableOpacity activeOpacity={0.8} onPress={openAuthorProfile}>
              <Avatar
                uri={displayAvatar}
                username={displayName ?? "User"}
                size={42}
                fallbackType="restaurant"
              />
            </TouchableOpacity>
          ) : firstCollaborator ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setCollaboratorsOpen(true)}
              style={{
                width: 52,
                height: 48,
              }}
            >
              <View style={{ position: "absolute", left: 0, bottom: 0 }}>
                <Avatar
                  uri={displayAvatar}
                  username={displayName}
                  userId={post.author?.id}
                  size={42}
                  showSnapIndicator={false}
                />
              </View>
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  padding: 2,
                  backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
                }}
              >
                {additionalCollaboratorCount === 0 ? (
                  <Avatar
                    uri={firstCollaborator.user.avatarUrl}
                    username={firstCollaborator.user.username}
                    userId={firstCollaborator.userId}
                    size={22}
                    showSnapIndicator={false}
                  />
                ) : (
                  <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-brand">
                    <Text className="text-[10px] font-bold text-white">
                      +{joinedCollaborators.length}
                    </Text>
                  </View>
                )}
              </View>
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

          <View className="flex-1">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={
                firstCollaborator
                  ? () => setCollaboratorsOpen(true)
                  : openAuthorProfile
              }
              className="self-start flex-row items-center"
            >
              <Text
                numberOfLines={1}
                className="min-w-0 flex-shrink font-bold text-black dark:text-white"
              >
                {isRestaurantPost
                  ? displayName
                  : sharedAuthorName ?? displayName}
              </Text>
              {isRestaurantPost ? <RestaurantBadge /> : null}
              {!isRestaurantPost && post.visibility !== "PUBLIC" ? (
                <View className="ml-1.5">
                  <PostVisibilityIcon
                    visibility={post.visibility}
                    color={actionColor}
                  />
                </View>
              ) : null}
            </TouchableOpacity>

            {!isRestaurantPost &&
            !firstCollaborator &&
            post.author?.displayName?.trim() ? (
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {usernameLabel(post.author.username)}
              </Text>
            ) : null}

            {!!post.restaurant && (
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={6}
                onPress={openRestaurantProfile}
                className="mt-0.5 self-start flex-row items-center"
              >
                <Text className="text-xs text-gray-500">
                  {post.restaurant.name}
                  {post.restaurant.city ? ` · ${post.restaurant.city}` : ""}
                </Text>
                <RestaurantBadge size={12} status={post.restaurant.status} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="ml-3 flex-row items-center gap-2">
          <PostAuthorFollowAction post={post} />
          <TouchableOpacity
            className="p-2"
            activeOpacity={0.8}
            onPress={() => onOpenPostOptions(post.id)}
          >
            <DotsThreeOutlineIcon size={28} color="#6B7280" weight="fill" />
          </TouchableOpacity>
        </View>
      </View>

      <ReviewCollaborationCard post={post} />

      <View className="relative">
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
            style={{
              shadowColor: "#0B0B0A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 4,
              elevation: 6,
            }}
          />
        </Animated.View>

        <FlatList
          horizontal
          pagingEnabled
          scrollEnabled={!isPinchingMedia}
          data={slides}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={reviewViewabilityConfig}
          renderItem={({ item }) => {
            const dishCoverFallbackUrl =
              item.type === "DISH" && !item.imageUrl
                ? review?.coverImageUrl
                : null;

            return (
              <View style={{ width }} className="h-96 bg-gray-100">
                {item.imageUrl ? (
                  <PinchZoomImage
                    uri={item.imageUrl}
                    thumbnailUrl={item.thumbnailUrl}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    onDoubleTap={handleDoubleTapLike}
                    onPinchStart={() => setIsPinchingMedia(true)}
                    onPinchEnd={() => setIsPinchingMedia(false)}
                  />
                ) : dishCoverFallbackUrl ? (
                  <View className="h-full w-full overflow-hidden bg-gray-900">
                    <ProgressiveImage
                      source={{ uri: dishCoverFallbackUrl }}
                      thumbnailUrl={review?.coverThumbnailUrl}
                      style={{
                        width: "108%",
                        height: "108%",
                        marginLeft: "-4%",
                        marginTop: "-4%",
                      }}
                      contentFit="cover"
                      blurRadius={20}
                    />
                    <View className="absolute inset-0 bg-black/25" />
                  </View>
                ) : (
                  <View className="h-full w-full items-center justify-center bg-gray-900">
                    <Text className="text-white">No image</Text>
                  </View>
                )}

                {item.type === "DISH" && item.perspectives.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 12,
                    zIndex: 30,
                    width: 132,
                    height: 64,
                  }}
                  contentContainerStyle={{
                    flexGrow: 1,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 8,
                    paddingLeft: 2,
                    paddingRight: 2,
                  }}
                >
                  {item.perspectives
                    .filter(
                      (perspective) =>
                        perspective.id !== item.selectedPerspectiveId,
                    )
                    .map((perspective) => (
                      <TouchableOpacity
                        key={perspective.id}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${
                          perspective.username
                            ? perspective.username
                            : "friend"
                        }'s dish photo`}
                        activeOpacity={0.82}
                        onPress={() =>
                          setSelectedPerspectiveIds((current) => ({
                            ...current,
                            [item.id]: perspective.id,
                          }))
                        }
                        className="h-12 w-12"
                        style={{
                          shadowColor: "#0B0B0A",
                          shadowOpacity: 0.3,
                          shadowRadius: 5,
                          shadowOffset: { width: 0, height: 2 },
                          elevation: 5,
                        }}
                      >
                        <View className="h-12 w-12 overflow-hidden rounded-[10px] border-2 border-[#FAF9F6] bg-gray-800">
                          {perspective.imageUrl ? (
                            <ProgressiveImage
                              source={{ uri: perspective.imageUrl }}
                              thumbnailUrl={perspective.thumbnailUrl}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                            />
                          ) : null}
                        </View>
                        <View className="absolute -left-1.5 -top-1.5">
                          <Avatar
                            uri={perspective.avatarUrl}
                            username={perspective.username}
                            userId={perspective.userId}
                            size={20}
                            showSnapIndicator={false}
                            style={{
                              borderWidth: 2,
                              borderColor: "#FAF9F6",
                            }}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
                ) : null}

                {item.type === "COVER" && coverRatingPerspectives.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 12,
                    zIndex: 30,
                    width: 132,
                    height: 64,
                  }}
                  contentContainerStyle={{
                    flexGrow: 1,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 8,
                    paddingHorizontal: 2,
                  }}
                >
                  {coverRatingPerspectives
                    .filter(
                      (perspective) =>
                        perspective.userId !== selectedCoverRating?.userId,
                    )
                    .map((perspective) => (
                      <TouchableOpacity
                        key={perspective.userId}
                        accessibilityRole="button"
                        accessibilityLabel={tCollaboration("ratingsBy", {
                          name: userDisplayName(perspective.user),
                        })}
                        activeOpacity={0.82}
                        onPress={() =>
                          setSelectedCoverRatingId(perspective.userId)
                        }
                        className="h-12 w-12 items-center justify-center overflow-hidden rounded-[10px] border-2 border-[#FAF9F6] bg-black/60"
                        style={{
                          shadowColor: "#0B0B0A",
                          shadowOpacity: 0.3,
                          shadowRadius: 5,
                          shadowOffset: { width: 0, height: 2 },
                          elevation: 5,
                        }}
                      >
                        {perspective.user.avatarUrl ? (
                          <ProgressiveImage
                            source={{ uri: perspective.user.avatarUrl }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                          />
                        ) : (
                          <UserIcon
                            size={26}
                            color="#FAF9F6"
                            weight="fill"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                </ScrollView>
                ) : null}

                {item.type === "COVER" && (
                <View
                  pointerEvents="none"
                  className="absolute inset-0 justify-end p-5"
                  style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
                >
                  <View className="flex-row items-center gap-2">
                    <StarIcon size={30} color="#F7D786" weight="fill" />
                    <Text className="text-3xl font-bold text-white">
                      {review?.overallRating ?? "-"}/10
                    </Text>
                  </View>
                  {selectedCoverRating && joinedCollaborators.length > 0 ? (
                    <Text className="mt-1 text-sm font-semibold text-white/80">
                      {tCollaboration("ratingsBy", {
                        name: userDisplayName(selectedCoverRating.user),
                      })}
                    </Text>
                  ) : overallRaterCount > 1 ? (
                    <Text className="mt-1 text-sm font-semibold text-white/80">
                      {tCollaboration("combinedRatings", {
                        count: overallRaterCount,
                      })}
                    </Text>
                  ) : null}

                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {displayedCoverAtmosphere != null && (
                      <View className="rounded-full bg-white/20 px-3 py-2">
                        <Text className="font-bold text-white">
                          {tCollaboration("atmosphere")} {displayedCoverAtmosphere}/10
                          {!selectedCoverRating && ratingCount("atmosphereRating") > 1
                            ? ` · ${ratingCount("atmosphereRating")}`
                            : ""}
                        </Text>
                      </View>
                    )}

                    {displayedCoverService != null && (
                      <View className="rounded-full bg-white/20 px-3 py-2">
                        <Text className="font-bold text-white">
                          {tCollaboration("service")} {displayedCoverService}/10
                          {!selectedCoverRating && ratingCount("serviceRating") > 1
                            ? ` · ${ratingCount("serviceRating")}`
                            : ""}
                        </Text>
                      </View>
                    )}

                    {displayedCoverValue != null && (
                      <View className="rounded-full bg-white/20 px-3 py-2">
                        <Text className="font-bold text-white">
                          {tCollaboration("valueShort")} {displayedCoverValue}/10
                          {!selectedCoverRating && ratingCount("valueRating") > 1
                            ? ` · ${ratingCount("valueRating")}`
                            : ""}
                        </Text>
                      </View>
                    )}

                    {totalPrice > 0 && (
                      <View className="rounded-full bg-white/20 px-3 py-2">
                        <Text className="font-bold text-white">
                          Total ₪{totalPrice}
                        </Text>
                      </View>
                    )}

                    {review?.recommendedFor ? (
                      <View className="rounded-full bg-white/20 px-3 py-2">
                        <Text className="font-bold text-white">
                          {tCreate(`visitOccasions.${review.recommendedFor}`)}
                        </Text>
                      </View>
                    ) : null}

                    {review?.visitDate ? (
                      <View className="rounded-full bg-white/20 px-3 py-2">
                        <Text className="font-bold text-white">
                          {new Intl.DateTimeFormat(i18n.language, {
                            dateStyle: "medium",
                          }).format(new Date(review.visitDate))}
                        </Text>
                      </View>
                    ) : null}

                    {(review?.experienceTags ?? []).map((tag) => (
                      <View
                        key={tag}
                        className="rounded-full bg-white/20 px-3 py-2"
                      >
                        <Text className="font-bold text-white">
                          {tCreate(`experienceTags.${tag}`)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                )}

                {item.type === "DISH" && (
                <View
                  className="absolute bottom-0 left-0 right-0 p-5"
                  style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
                >
                  <View className="flex-row items-end justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-2xl font-bold text-white">
                        {item.dishName}
                      </Text>

                      {item.isLinkedToMenu && item.menuItemId && (
                        <TouchableOpacity
                          className="mt-2 self-start rounded-full bg-white/20 px-3 py-1"
                          onPress={() =>
                            router.push({
                              pathname: "/menu-items/[id]",
                              params: { id: item.menuItemId as string },
                            })
                          }
                        >
                          <Text className="text-xs font-bold text-white">
                            ✓ Official menu item
                          </Text>
                        </TouchableOpacity>
                      )}

                      {item.rating != null && (
                        <View className="mt-1 flex-row items-center gap-1">
                          <StarIcon size={15} color="#F7D786" weight="fill" />
                          <Text className="font-bold text-white">
                            {Number.isInteger(item.rating)
                              ? item.rating
                              : item.rating.toFixed(1)}
                            /10
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.price != null && (
                      <Text className="text-xl font-bold text-white">
                        ₪{item.price}
                      </Text>
                    )}
                  </View>
                </View>
                )}
              </View>
            );
          }}
        />
      </View>

      {slides.length > 1 && (
        <View className="mt-3 flex-row justify-center gap-1">
          {indicatorSlides.map((slide) => (
            <ReviewPaginationDot
              key={slide.id}
              active={slide.id === activeSlide?.id}
              isDark={isDark}
            />
          ))}
        </View>
      )}

      <View className="px-4 pt-3">
        <View className="flex-row justify-between gap-5">
          <View className="flex-row items-center gap-5">
            <TouchableOpacity
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
              className="flex-col items-center gap-1"
            >
              <Animated.View style={likeAnimatedStyle}>
                <HeartIcon
                  weight={displayedIsLiked ? "fill" : "regular"}
                  color={displayedIsLiked ? "#FF3040" : actionColor}
                  size={28}
                />
              </Animated.View>

              {post.canViewLikes ? (
                <Text className="text-base text-black dark:text-white">
                  {displayedLikesCount}
                </Text>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={post.commentsDisabled}
              onPress={() => onOpenComments(post.id)}
              className="flex-col items-center gap-1"
              style={{ opacity: post.commentsDisabled ? 0.55 : 1 }}
            >
              <ChatCircleIcon weight="regular" color={actionColor} size={28} />
              <Text className="text-base text-black dark:text-white">
                {post.commentsDisabled
                  ? tCommon("commentsOff")
                  : post.commentsCount}
              </Text>
            </TouchableOpacity>

            {post.visibility === "PUBLIC" && (
              <TouchableOpacity
                onPress={() => onOpenSharePost(post.id)}
                className="items-center justify-center"
              >
                <ShareFatIcon weight="regular" color={actionColor} size={28} />
                <Text className="text-base text-black dark:text-white">
                  {post.sharesCount ?? 0}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity className="items-center" onPress={handleWantToTry}>
            <PlaceStatusBookmark
              wantToTry={isWantToTry}
              visited={isVisited}
              favorite={isFavorite}
              size={28}
              defaultColor={actionColor}
              savedListCount={savedListCount}
            />

            <Text className="mt-1 text-center text-xs font-bold text-black dark:text-white">
              {!isWantToTry && !isVisited && !isFavorite && savedListCount > 0
                ? tCommon("inList")
                : t(bookmarkLabelKey)}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-3">
          {!!activeSlide?.text && (
            <>
              <ExpandablePostCaption
                key={`${activeSlide.id}-${activeSlide.captionAuthorUsername}-${activeSlide.text}`}
                text={activeSlide.text}
                isRtl={activeTextIsRtl}
                authorName={activeSlide.captionAuthorUsername}
                onAuthorPress={
                  activeSlide.captionAuthorUserId
                    ? () =>
                        router.push({
                          pathname: "/(users)/[id]",
                          params: { id: activeSlide.captionAuthorUserId! },
                        })
                    : undefined
                }
              />
            </>
          )}
          <PostConnectionCard
            sourceType="REVIEW"
            linkedPosts={post.linkedPosts}
          />
          <PostDate
            createdAt={post.createdAt}
            hasContentAbove={
              !!activeSlide?.text || !!post.linkedPosts?.length
            }
            edited={!!activeSlide?.textEditedAt}
          />
        </View>
      </View>
      <PostLikesBottomSheet
        postId={post.id}
        open={likesOpen}
        onClose={() => setLikesOpen(false)}
      />
      <TaggedUsersBottomSheet
        open={collaboratorsOpen}
        users={collaborationUsers}
        title={tCollaboration("includedPeople")}
        displayNames
        showRelationshipActions
        onClose={() => setCollaboratorsOpen(false)}
      />
    </View>
  );
}
