import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { LinkedPost, PostType } from "@findeat/types";
import { router } from "expo-router";
import {
  CaretDownIcon,
  CaretUpIcon,
  NotePencilIcon,
  PlayIcon,
  SparkleIcon,
  StarIcon,
} from "phosphor-react-native";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = {
  sourceType: PostType;
  linkedPosts?: LinkedPost[];
  tone?: "surface" | "overlay";
  fallbackImageUrl?: string | null;
};

function ConnectedPreviewImage({
  candidates,
  className,
  blurRadius,
  fallback,
}: {
  candidates: (string | null | undefined)[];
  className: string;
  blurRadius?: number;
  fallback?: ReactNode;
}) {
  const imageUrls = candidates
    .map((candidate) => candidate?.trim())
    .filter(
      (candidate, index, values): candidate is string =>
        Boolean(candidate) && values.indexOf(candidate) === index,
    );
  const candidateKey = imageUrls.join("|");
  const [failedCandidate, setFailedCandidate] = useState({
    key: candidateKey,
    index: 0,
  });
  const candidateIndex =
    failedCandidate.key === candidateKey ? failedCandidate.index : 0;

  const imageUrl = imageUrls[candidateIndex];
  if (!imageUrl) return fallback ?? null;

  return (
    <ProgressiveImage
      key={imageUrl}
      source={{ uri: imageUrl }}
      className={className}
      style={{ width: "100%", height: "100%" }}
      resizeMode="cover"
      blurRadius={blurRadius}
      onError={() =>
        setFailedCandidate({ key: candidateKey, index: candidateIndex + 1 })
      }
    />
  );
}

export default function PostConnectionCard({
  sourceType,
  linkedPosts = [],
  tone = "surface",
  fallbackImageUrl,
}: Props) {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [expandedContentHeight, setExpandedContentHeight] = useState(0);
  const revealHeight = useSharedValue(0);
  const revealOpacity = useSharedValue(0);
  const targets = linkedPosts.filter((post) => post.type !== sourceType);
  const target = targets[0];

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    revealHeight.set(
      withTiming(expanded ? expandedContentHeight : 0, {
        duration: 300,
        easing,
      }),
    );
    revealOpacity.set(
      withTiming(expanded ? 1 : 0, {
        duration: 220,
        easing,
      }),
    );
  }, [expanded, expandedContentHeight, revealHeight, revealOpacity]);

  const revealStyle = useAnimatedStyle(() => ({
    height: revealHeight.value,
    opacity: revealOpacity.value,
  }));

  if (!target) return null;

  const opensReview = target.type === "REVIEW";
  const teaserImages = opensReview
    ? [
        ...(target.reviewPost?.previewImageUrls ?? []),
        target.reviewPost?.previewImageUrl,
        target.reviewPost?.coverImageUrl,
        fallbackImageUrl,
      ]
    : [target.contentPost?.imageUrl];
  const overlay = tone === "overlay";
  const foreground = overlay ? "#FAF9F6" : isDark ? "#FAF9F6" : "#171717";
  const muted = overlay ? "#FFFFFFB8" : isDark ? "#A3A3A3" : "#706C66";
  const containerClass = overlay
    ? "border-[#F7D786]/45 bg-black/55"
    : "border-[#E8D39A] bg-[#FFF9E9] dark:border-[#5A4820] dark:bg-[#1B170D]";

  function openPost(id: string) {
    router.push({ pathname: "/(posts)/[id]", params: { id } });
  }

  function renderConnectedPost(post: LinkedPost, index?: number) {
    const review = post.type === "REVIEW";
    const imageCandidates = review
      ? [
          ...(post.reviewPost?.previewImageUrls ?? []),
          post.reviewPost?.previewImageUrl,
          post.reviewPost?.coverImageUrl,
          fallbackImageUrl,
        ]
      : [post.contentPost?.imageUrl];

    return (
      <TouchableOpacity
        key={post.id}
        activeOpacity={0.82}
        onPress={() => openPost(post.id)}
        className={targets.length > 1 ? "w-28" : "flex-row items-center"}
      >
        <View
          className={`${targets.length > 1 ? "h-24 w-28" : "h-14 w-14"} items-center justify-center overflow-hidden rounded-xl bg-black/10 dark:bg-white/10`}
        >
          <ConnectedPreviewImage
            candidates={imageCandidates}
            className="h-full w-full"
            fallback={
              review ? (
                <NotePencilIcon size={24} color={foreground} weight="fill" />
              ) : (
                <PlayIcon size={24} color={foreground} weight="fill" />
              )
            }
          />
          {!review && post.contentPost?.videoUrl ? (
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <PlayIcon size={19} color="#FAF9F6" weight="fill" />
            </View>
          ) : null}
        </View>

        <View className={targets.length > 1 ? "mt-2" : "ml-3 flex-1"}>
          <Text
            numberOfLines={1}
            className={
              overlay
                ? "font-bold text-white"
                : "font-bold text-black dark:text-white"
            }
          >
            {targets.length > 1
              ? t("connectedPostNumber", { number: (index ?? 0) + 1 })
              : t(review ? "readConnectedReview" : "viewConnectedPost")}
          </Text>
          {targets.length === 1 ? (
            <Text numberOfLines={1} className="mt-0.5 text-xs" style={{ color: muted }}>
              {review && post.reviewPost?.overallRating != null
                ? t("connectedReviewRating", {
                    rating: post.reviewPost.overallRating,
                  })
                : t("sameExperience")}
            </Text>
          ) : null}
        </View>

        {targets.length === 1 ? (
          <DirectionalIcon
            direction="forward"
            size={18}
            color={muted}
            weight="bold"
          />
        ) : null}
      </TouchableOpacity>
    );
  }

  if (overlay && sourceType === "CONTENT" && opensReview) {
    const rating = target.reviewPost?.overallRating;
    const summary = target.reviewPost?.summary?.trim();

    return (
      <TouchableOpacity
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={t("readConnectedReview")}
        onPress={() => openPost(target.id)}
        className="mt-3 flex-row items-center rounded-2xl border border-white/15 bg-black/55 p-2.5"
      >
        <View className="h-16 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/10">
          <ConnectedPreviewImage
            candidates={teaserImages}
            className="h-full w-full"
            fallback={
              <NotePencilIcon size={25} color="#FFFFFFCC" weight="fill" />
            }
          />

          {rating != null ? (
            <View className="absolute bottom-1 left-1 right-1 flex-row items-center justify-center rounded-full bg-black/75 px-1.5 py-0.5">
              <StarIcon size={10} color="#F7D786" weight="fill" />
              <Text className="ml-0.5 text-[10px] font-bold text-white">
                {rating}/10
              </Text>
            </View>
          ) : null}
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-[#F7D786]">
            {t("writtenReview")}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 font-bold text-white">
            {t("readConnectedReview")}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-xs leading-4 text-white/70">
            {summary || t("sameExperience")}
          </Text>
        </View>

        {targets.length > 1 ? (
          <View className="ml-2 rounded-full bg-white/10 px-2 py-1">
            <Text className="text-xs font-bold text-white">
              +{targets.length - 1}
            </Text>
          </View>
        ) : null}

        <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <DirectionalIcon
            direction="forward"
            size={17}
            color="#FFFFFFCC"
            weight="bold"
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      className={`mt-3 overflow-hidden rounded-2xl border ${containerClass}`}
    >
      <TouchableOpacity
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        className="flex-row items-center p-2.5"
      >
        <View className="relative h-12 w-12">
          <View className="absolute bottom-0 right-0 h-10 w-10 rotate-6 overflow-hidden rounded-xl bg-black/15 dark:bg-white/10">
            <ConnectedPreviewImage
              candidates={teaserImages}
              blurRadius={1.5}
              className="h-full w-full opacity-75"
            />
          </View>
          <View className="absolute left-0 top-0 h-9 w-9 items-center justify-center rounded-xl bg-[#F7D786] shadow-sm">
            <SparkleIcon size={19} color="#171717" weight="fill" />
          </View>
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-[#D0A62E]">
            {t("experienceTeaserEyebrow")}
          </Text>
          <Text
            numberOfLines={2}
            className={
              overlay
                ? "mt-0.5 text-sm font-bold leading-4 text-white"
                : "mt-0.5 text-sm font-bold leading-4 text-black dark:text-white"
            }
          >
            {t(opensReview ? "reviewTeaserTitle" : "contentTeaserTitle", {
              count: targets.length,
            })}
          </Text>
          <Text
            className="mt-1 text-[11px] font-bold text-[#D0A62E]"
            style={{ opacity: expanded ? 0 : 1 }}
          >
            {t("tapToReveal")}
          </Text>
        </View>

        <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
          {expanded ? (
            <CaretUpIcon size={17} color={foreground} weight="bold" />
          ) : (
            <CaretDownIcon size={17} color={foreground} weight="bold" />
          )}
        </View>
      </TouchableOpacity>

      <Animated.View
        pointerEvents={expanded ? "auto" : "none"}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
        style={revealStyle}
        className="overflow-hidden"
      >
        <View
          collapsable={false}
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (Math.abs(nextHeight - expandedContentHeight) > 0.5) {
              setExpandedContentHeight(nextHeight);
            }
          }}
          className="border-t border-black/10 px-3 pb-3 pt-3 dark:border-white/10"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
          }}
        >
          {targets.length === 1 ? (
            renderConnectedPost(target)
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 12 }}
            >
              {targets.map((post, index) => renderConnectedPost(post, index))}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
