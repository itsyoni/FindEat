import Tabs from "@/components/common/Tabs";
import PersonalProfileHeader from "@/components/profile/PersonalProfileHeader";
import ProfilePostGrid from "@/components/profile/ProfilePostGrid";
import ProfileStatisticsTeaser from "@/components/profile/ProfileStatisticsTeaser";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  dismissCreatorInsightsPromotion,
  isCreatorInsightsPromotionDismissed,
} from "@/lib/creatorInsightsPromotion";
import { PostType } from "@findeat/types/post";
import { filterPostsByType } from "@findeat/utils/posts";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const CREATOR_INSIGHTS_FOLLOWER_THRESHOLD = 1_000;

type PromotionState = {
  userId: string;
  dismissed: boolean;
};

export default function ProfileScreen() {
  const { t } = useTranslation(["common", "profile"]);
  const { isDark } = useAppTheme();
  const { profile, loading, refresh } = useMyProfile();
  const [activeFeed, setActiveFeed] = useState<PostType>("CONTENT");
  const [promotionState, setPromotionState] = useState<PromotionState | null>(null);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const posts = useMemo(
    () => filterPostsByType(profile?.posts, activeFeed),
    [profile?.posts, activeFeed],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    router.prefetch("/(profile)/content-feed");
    router.prefetch("/(profile)/reviews-feed");
  }, []);

  useEffect(() => {
    if (
      !profile?.id ||
      profile.followersCount < CREATOR_INSIGHTS_FOLLOWER_THRESHOLD
    ) {
      return;
    }

    let active = true;
    void isCreatorInsightsPromotionDismissed(profile.id)
      .then((dismissed) => {
        if (active) {
          setPromotionState({ userId: profile.id, dismissed });
        }
      })
      .catch((error) => {
        console.error("Could not read creator insights dismissal", error);
      });

    return () => {
      active = false;
    };
  }, [profile?.followersCount, profile?.id]);

  const showCreatorInsightsPromotion =
    profile !== null &&
    profile.followersCount >= CREATOR_INSIGHTS_FOLLOWER_THRESHOLD &&
    promotionState?.userId === profile.id &&
    !promotionState.dismissed;

  function dismissCreatorInsights() {
    if (!profile?.id) return;

    setPromotionState({ userId: profile.id, dismissed: true });
    void dismissCreatorInsightsPromotion(profile.id).catch((error) => {
      console.error("Could not persist creator insights dismissal", error);
    });
  }

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 110,
        backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
      }}
      scrollEventThrottle={16}
      onScroll={scrollHandler}
    >
      <PersonalProfileHeader profile={profile} loading={loading} scrollY={scrollY} />

      {!loading && showCreatorInsightsPromotion ? (
        <ProfileStatisticsTeaser onDismiss={dismissCreatorInsights} />
      ) : null}

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
        loading={loading}
        type={activeFeed}
        onCreatePost={() =>
          router.push(activeFeed === "CONTENT" ? "/create/content" : "/create/review")
        }
        onPressPost={(postId) => {
          router.push({
            pathname:
              activeFeed === "CONTENT"
                ? "/(profile)/content-feed"
                : "/(profile)/reviews-feed",
            params: { postId },
          });
        }}
      />
    </Animated.ScrollView>
  );
}
