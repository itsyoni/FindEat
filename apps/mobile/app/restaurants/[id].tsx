import { AppAlert as Alert } from "@/lib/appAlert";
import { Skeleton, SkeletonList, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import Tabs from "@/components/common/Tabs";
import RestaurantHeader from "@/components/restaurants/RestaurantHeader";
import RestaurantMenuSection from "@/components/restaurants/RestaurantMenuSection";
import RestaurantPostsSection from "@/components/restaurants/RestaurantPostsSection";
import { RestaurantCompatibilitySummary } from "@/components/restaurants/FoodCompatibility";
import ProfileActionsBottomSheet from "@/components/profile/ProfileActionsBottomSheet";
import ReportBottomSheet from "@/components/moderation/ReportBottomSheet";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useRestaurantPosts } from "@/hooks/useRestaurantPosts";
import { api } from "@/lib/api";
import type { RestaurantPostSection } from "@findeat/types";
import { getErrorMessage } from "@findeat/utils";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useSaveToLists } from "@/contexts/SaveToListsContext";
import RestaurantAboutBottomSheet from "@/components/restaurants/RestaurantAboutBottomSheet";
import PlaceStatusBookmark, { getPlaceStatusLabelKey } from "@/components/restaurants/PlaceStatusBookmark";

type RestaurantTab = RestaurantPostSection | "MENU";

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(["restaurants", "common"]);
  const { isDark } = useAppTheme();
  const {
    openManageSavedPlace,
    savedListCounts,
    statusOverrides,
  } = useSaveToLists();
  const { restaurant, setRestaurant, loading } = useRestaurant(id);
  const [activeTab, setActiveTab] = useState<RestaurantTab>("OFFICIAL");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const postSection: RestaurantPostSection =
    activeTab === "MENU" ? "OFFICIAL" : activeTab;
  const sectionPosts = useRestaurantPosts(
    id,
    postSection,
    activeTab !== "MENU",
  );
  const visiblePosts = useMemo(() => {
    const paginatedPosts =
      sectionPosts.data?.pages.flatMap((page) => page.items) ?? [];

    if (paginatedPosts.length > 0) {
      return paginatedPosts;
    }

    return (
      restaurant?.posts.filter((post) => {
        if (activeTab === "REVIEWS") return post.type === "REVIEW";
        if (activeTab === "OFFICIAL") {
          return (
            post.type === "CONTENT" &&
            post.authorRestaurantId === restaurant.id
          );
        }
        if (activeTab === "COMMUNITY") {
          return post.type === "CONTENT" && !post.authorRestaurantId;
        }
        return false;
      }) ?? []
    );
  }, [activeTab, restaurant, sectionPosts.data]);

  async function toggleFollow() {
    if (!restaurant) return;

    const wasFollowing = restaurant.isFollowing;

    setRestaurant((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: !wasFollowing,
            followersCount: prev.followersCount + (wasFollowing ? -1 : 1),
          }
        : prev,
    );

    try {
      if (wasFollowing) {
        await api.restaurants.unfollow(restaurant.id);
      } else {
        await api.restaurants.follow(restaurant.id);
      }
    } catch {
      setRestaurant((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: wasFollowing,
              followersCount: prev.followersCount + (wasFollowing ? 1 : -1),
            }
          : prev,
      );
    }
  }

  async function claimRestaurant() {
    if (!restaurant) return;

    try {
      await api.restaurants.startClaim(restaurant.id);
      setOptionsOpen(false);

      setRestaurant((prev) =>
        prev
          ? {
              ...prev,
              status: "PENDING",
            }
          : prev,
      );

      Alert.alert(
        t("restaurants:requestSent"),
        t("restaurants:requestSentBody"),
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        t("common:error"),
        getErrorMessage(error, t("restaurants:claimError")),
      );
    }
  }

  function openCreateFlow(pathname: "/create/review" | "/create/content") {
    if (!restaurant) return;
    setOptionsOpen(false);
    requestAnimationFrame(() => {
      router.push({ pathname, params: { restaurantId: restaurant.id } });
    });
  }

  const featuredItems = useMemo(() => {
    if (!restaurant) return [];

    return restaurant.menus
      .flatMap((menu) => menu.items)
      .filter((item) => item.isFeatured);
  }, [restaurant]);

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
        contentContainerStyle={{ backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
      >
        <RestaurantHeader restaurant={null} loading scrollY={scrollY} onToggleFollow={() => undefined} onOpenOptions={() => undefined} />
        <SkeletonPulse>
          <View className="flex-row gap-3 bg-surface px-5 pb-5 dark:bg-black">
            {[0, 1, 2].map((item) => <Skeleton key={item} width="31%" height={62} radius={12} />)}
          </View>
        </SkeletonPulse>
        <Tabs activeTab="OFFICIAL" onChange={() => undefined} tabs={[{ label: t("restaurants:official"), value: "OFFICIAL" }, { label: t("restaurants:community"), value: "COMMUNITY" }, { label: t("common:reviews"), value: "REVIEWS" }, { label: t("restaurants:menu"), value: "MENU" }]} />
        <SkeletonList variant="grid" count={9} />
      </ScrollView>
    );
  }

  if (!restaurant) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-black">
        <Text className="text-black dark:text-white">
          {t("restaurants:notFound")}
        </Text>
      </View>
    );
  }

  const placeStatus = statusOverrides[restaurant.id] ?? restaurant.userRestaurant;
  const isPlaceSaved = !!(
    placeStatus?.wantToTry ||
    placeStatus?.visited ||
    placeStatus?.favorite
  );
  const savedListCount =
    savedListCounts[restaurant.id] ?? restaurant.savedListCount ?? 0;
  const statusLabel = getPlaceStatusLabelKey(
    !!placeStatus?.wantToTry,
    !!placeStatus?.visited,
    !!placeStatus?.favorite,
  );
  const openSavedPlaceManager = () =>
    openManageSavedPlace({
      restaurantId: restaurant.id,
      currentStatus: placeStatus,
    });

  return (
    <>
      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
        contentContainerStyle={{ backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
      <RestaurantHeader
        restaurant={restaurant}
        scrollY={scrollY}
        onToggleFollow={toggleFollow}
        onOpenOptions={() => setOptionsOpen(true)}
      />

      <View className="bg-surface px-5 pb-5 dark:bg-black">
        <View>
          <TouchableOpacity
            onPress={openSavedPlaceManager}
            className={`w-full flex-row items-center justify-center rounded-xl px-4 py-3 ${isPlaceSaved || savedListCount > 0 ? "bg-amber-500" : "bg-gray-100 dark:bg-gray-800"}`}
          >
            <PlaceStatusBookmark
              wantToTry={!!placeStatus?.wantToTry}
              visited={!!placeStatus?.visited}
              favorite={!!placeStatus?.favorite}
              size={22}
              defaultColor={isPlaceSaved || savedListCount > 0 ? "#FAF9F6" : "#6B7280"}
              savedListCount={savedListCount}
            />
            <Text
              numberOfLines={1}
              className={`ml-2 text-center font-bold ${isPlaceSaved || savedListCount > 0 ? "text-white" : "text-black dark:text-white"}`}
            >
              {!isPlaceSaved && savedListCount > 0
                ? t("common:inList")
                : t(`restaurants:${statusLabel}`)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <RestaurantCompatibilitySummary compatibility={restaurant.compatibility} />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { label: t("restaurants:official"), value: "OFFICIAL" },
          { label: t("restaurants:community"), value: "COMMUNITY" },
          { label: t("common:reviews"), value: "REVIEWS" },
          { label: t("restaurants:menu"), value: "MENU" },
        ]}
      />

      <View
        className="px-6 pb-10"
        style={{ backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
      >
        {activeTab !== "MENU" && (
          <RestaurantPostsSection
            posts={visiblePosts}
            loading={sectionPosts.isPending && visiblePosts.length === 0}
            loadingMore={sectionPosts.isFetchingNextPage}
            hasMore={sectionPosts.hasNextPage}
            onLoadMore={() => void sectionPosts.fetchNextPage()}
            onPressPost={(postId) =>
              router.push({
                pathname: "/restaurants/post-feed",
                params: {
                  restaurantId: restaurant.id,
                  section: activeTab,
                  postId,
                },
              })
            }
            emptyText={
              activeTab === "OFFICIAL"
                ? restaurant.status === "CLAIMED"
                  ? t("restaurants:noOfficialClaimed")
                  : t("restaurants:noOfficialUnclaimed")
                : activeTab === "COMMUNITY"
                  ? t("restaurants:noCommunity")
                  : t("restaurants:noReviews")
            }
          />
        )}

        {activeTab === "MENU" && (
          <RestaurantMenuSection
            restaurant={restaurant}
            featuredItems={featuredItems}
          />
        )}
      </View>
      </Animated.ScrollView>

      <ProfileActionsBottomSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        type="RESTAURANT"
        canClaim={restaurant.status !== "CLAIMED"}
        onClaim={() => void claimRestaurant()}
        onCreateReview={() => openCreateFlow("/create/review")}
        onCreateContent={() => openCreateFlow("/create/content")}
        onAbout={() => {
          setOptionsOpen(false);
          setAboutOpen(true);
        }}
        onReport={() => {
          setOptionsOpen(false);
          setTimeout(() => setReportOpen(true), 250);
        }}
      />
      <RestaurantAboutBottomSheet
        restaurant={restaurant}
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
      <ReportBottomSheet
        open={reportOpen}
        targetType="RESTAURANT"
        targetId={restaurant.id}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
