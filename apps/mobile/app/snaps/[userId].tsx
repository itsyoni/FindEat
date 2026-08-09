import Avatar from "@/components/common/Avatar";
import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import ReportBottomSheet from "@/components/moderation/ReportBottomSheet";
import { snapsQueryKey, useSnaps } from "@/hooks/useSnaps";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import type { SnapGroup } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DotsThreeIcon,
  MapPinIcon,
  PaperPlaneTiltIcon,
  XIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  ActivityIndicator,
  AppState,
  Keyboard,
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useToast } from "@/contexts/ToastContext";
import {
  useIsSnapWatched,
  useMarkSnapWatched,
} from "@/contexts/SnapIndicatorContext";

const SNAP_DURATION_MS = 5000;

export default function SnapViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { t } = useTranslation(["snaps", "common"]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const markSnapWatched = useMarkSnapWatched();
  const isSnapWatched = useIsSnapWatched();
  const [isFocused, setIsFocused] = useState(true);
  const snaps = useSnaps();
  const [progress] = useState(() => new Animated.Value(0));
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressRef = useRef(0);
  const pausedRef = useRef(false);
  const heldRef = useRef(false);
  const gestureActionsRef = useRef<{
    pause: () => void;
    resume: () => void;
    nextGroup: () => void;
    previousGroup: () => void;
  }>({
    pause: () => undefined,
    resume: () => undefined,
    nextGroup: () => undefined,
    previousGroup: () => undefined,
  });
  const [openedAt] = useState(() => Date.now());
  const [groupIndex, setGroupIndex] = useState<number | null>(null);
  const [snapIndex, setSnapIndex] = useState(0);
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const [loadedSnapId, setLoadedSnapId] = useState<string | null>(null);
  const [failedSnapId, setFailedSnapId] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const latestGroups = useMemo(() => snaps.data ?? [], [snaps.data]);
  const groups = useMemo(() => {
    if (groupOrder.length === 0) return latestGroups;
    const byUserId = new Map(
      latestGroups.map((group) => [group.user.id, group] as const),
    );
    const ordered = groupOrder
      .map((id) => byUserId.get(id))
      .filter((group): group is SnapGroup => !!group);
    const knownIds = new Set(groupOrder);
    for (const group of latestGroups) {
      if (!knownIds.has(group.user.id)) ordered.push(group);
    }
    return ordered;
  }, [groupOrder, latestGroups]);
  const currentGroup = groupIndex === null ? null : groups[groupIndex];
  const currentSnap = currentGroup?.snaps[snapIndex];
  const currentSnapId = currentSnap?.id;
  const currentSnapCount = currentGroup?.snaps.length ?? 0;

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const firstUnseenIndex = useCallback(
    (group: SnapGroup) => {
      const index = group.snaps.findIndex(
        (snap) => !snap.viewedAt && !isSnapWatched(snap.id),
      );
      return index >= 0 ? index : 0;
    },
    [isSnapWatched],
  );

  useEffect(() => {
    if (!snaps.data || groupIndex !== null) return;
    const index = snaps.data.findIndex((group) => group.user.id === userId);
    const targetGroup = snaps.data[index];
    const timer = setTimeout(() => {
      setGroupOrder(snaps.data.map((group) => group.user.id));
      setGroupIndex(index);
      setSnapIndex(targetGroup ? firstUnseenIndex(targetGroup) : 0);
    }, 0);
    return () => clearTimeout(timer);
  }, [firstUnseenIndex, groupIndex, setGroupOrder, snaps.data, userId]);

  const advance = useCallback(() => {
    if (groupIndex === null || currentSnapCount === 0) return;
    if (snapIndex < currentSnapCount - 1) {
      setSnapIndex((current) => current + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      const nextGroupIndex = groupIndex + 1;
      setGroupIndex(nextGroupIndex);
      setSnapIndex(firstUnseenIndex(groups[nextGroupIndex]));
      return;
    }
    router.back();
  }, [
    currentSnapCount,
    firstUnseenIndex,
    groupIndex,
    groups,
    setGroupIndex,
    setSnapIndex,
    snapIndex,
  ]);

  const goBack = useCallback(() => {
    if (groupIndex === null || !currentGroup) return;
    if (snapIndex > 0) {
      setSnapIndex((current) => current - 1);
      return;
    }
    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setSnapIndex(Math.max(previousGroup.snaps.length - 1, 0));
      return;
    }
    setPlaybackRevision((current) => current + 1);
  }, [
    currentGroup,
    groupIndex,
    groups,
    setGroupIndex,
    setPlaybackRevision,
    setSnapIndex,
    snapIndex,
  ]);

  const moveToNextGroup = useCallback(() => {
    if (groupIndex === null) return;
    if (groupIndex >= groups.length - 1) {
      router.back();
      return;
    }
    const nextGroupIndex = groupIndex + 1;
    setGroupIndex(nextGroupIndex);
    setSnapIndex(firstUnseenIndex(groups[nextGroupIndex]));
  }, [firstUnseenIndex, groupIndex, groups, setGroupIndex, setSnapIndex]);

  const moveToPreviousGroup = useCallback(() => {
    if (groupIndex === null || groupIndex <= 0) return;
    const previousGroupIndex = groupIndex - 1;
    setGroupIndex(previousGroupIndex);
    setSnapIndex(Math.max(groups[previousGroupIndex].snaps.length - 1, 0));
  }, [groupIndex, groups, setGroupIndex, setSnapIndex]);

  const pausePlayback = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    animationRef.current?.stop();
    progress.stopAnimation((value) => {
      progressRef.current = value;
    });
  }, [progress]);

  const resumePlayback = useCallback(() => {
    if (
      !pausedRef.current ||
      !isFocused ||
      !currentSnapId ||
      loadedSnapId !== currentSnapId
    )
      return;
    pausedRef.current = false;
    const fromValue = progressRef.current;
    progress.setValue(fromValue);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(1, SNAP_DURATION_MS * (1 - fromValue)),
      useNativeDriver: false,
    });
    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished && !pausedRef.current) advance();
    });
  }, [advance, currentSnapId, isFocused, loadedSnapId, progress]);

  useEffect(() => {
    if (!currentSnapId || !isFocused || loadedSnapId !== currentSnapId) return;
    animationRef.current?.stop();
    pausedRef.current = false;
    progressRef.current = 0;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: SNAP_DURATION_MS,
      useNativeDriver: false,
    });
    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished && !pausedRef.current) advance();
    });
    return () => {
      animation.stop();
      animationRef.current = null;
    };
  }, [
    advance,
    currentSnapId,
    isFocused,
    loadedSnapId,
    playbackRevision,
    progress,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") resumePlayback();
      else pausePlayback();
    });
    return () => subscription.remove();
  }, [pausePlayback, resumePlayback]);

  useEffect(() => {
    if (isFocused) resumePlayback();
    else pausePlayback();
  }, [isFocused, pausePlayback, resumePlayback]);

  useEffect(() => {
    if (groupIndex === null || !currentGroup) return;
    const nextSnap =
      currentGroup.snaps[snapIndex + 1] ?? groups[groupIndex + 1]?.snaps[0];
    if (nextSnap?.imageUrl) void Image.prefetch(nextSnap.imageUrl);
  }, [currentGroup, groupIndex, groups, snapIndex]);

  useEffect(() => {
    gestureActionsRef.current = {
      pause: pausePlayback,
      resume: resumePlayback,
      nextGroup: moveToNextGroup,
      previousGroup: moveToPreviousGroup,
    };
  }, [
    moveToNextGroup,
    moveToPreviousGroup,
    pausePlayback,
    resumePlayback,
  ]);

  // The responder callbacks read this ref only after a native touch event.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 14 || Math.abs(gesture.dy) > 14,
      onPanResponderGrant: () => gestureActionsRef.current.pause(),
      onPanResponderRelease: (_, gesture) => {
        const horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
        if (horizontal && gesture.dx < -60) {
          gestureActionsRef.current.nextGroup();
          return;
        }
        if (horizontal && gesture.dx > 60) {
          gestureActionsRef.current.previousGroup();
          return;
        }
        gestureActionsRef.current.resume();
      },
      onPanResponderTerminate: () => gestureActionsRef.current.resume(),
    }),
  );

  const handleTap = useCallback((action: () => void) => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    action();
  }, []);

  useEffect(() => {
    if (
      !currentSnap ||
      currentSnap.viewedAt ||
      loadedSnapId !== currentSnap.id
    )
      return;
    markSnapWatched(currentSnap.id);
    const viewedAt = new Date().toISOString();
    queryClient.setQueryData<SnapGroup[]>(snapsQueryKey, (current) =>
      current?.map((group) => ({
        ...group,
        snaps: group.snaps.map((snap) =>
          snap.id === currentSnap.id ? { ...snap, viewedAt } : snap,
        ),
        hasUnseen:
          group.user.id === currentGroup?.user.id
            ? group.snaps.some(
                (snap) => snap.id !== currentSnap.id && !snap.viewedAt,
              )
            : group.hasUnseen,
      })),
    );
    if (currentGroup?.isOwn) return;
    void api.snaps.markViewed(currentSnap.id).catch((error) => {
      console.error("Could not mark snap viewed", error);
      void queryClient.invalidateQueries({ queryKey: snapsQueryKey });
    });
  }, [
    currentGroup?.isOwn,
    currentGroup?.user.id,
    currentSnap,
    loadedSnapId,
    markSnapWatched,
    queryClient,
  ]);

  function removeCurrentSnap() {
    if (!currentSnap) return;
    pausePlayback();
    Alert.alert(t("snaps:deleteTitle"), t("snaps:deleteBody"), [
      { text: t("common:cancel"), style: "cancel", onPress: resumePlayback },
      {
        text: t("common:delete"),
        style: "destructive",
        onPress: () => {
          void api.snaps
            .remove(currentSnap.id)
            .then(() => {
              const deletedIndex = snapIndex;
              const previousCount = currentGroup?.snaps.length ?? 0;
              queryClient.setQueryData<SnapGroup[]>(snapsQueryKey, (current) =>
                current
                  ?.map((group) => ({
                    ...group,
                    snaps: group.snaps.filter(
                      (snap) => snap.id !== currentSnap.id,
                    ),
                  }))
                  .filter((group) => group.snaps.length > 0),
              );
              void queryClient.invalidateQueries({ queryKey: snapsQueryKey });
              if (previousCount <= 1) {
                router.back();
              } else if (deletedIndex >= previousCount - 1) {
                setSnapIndex(Math.max(0, deletedIndex - 1));
              }
            })
            .catch(() => {
              Alert.alert(t("common:error"), t("snaps:deleteError"));
              resumePlayback();
            });
        },
      },
    ]);
  }

  async function sendSnapComment() {
    const cleanComment = comment.trim();
    if (
      !cleanComment ||
      sendingComment ||
      currentGroup?.isOwn ||
      !currentSnap
    ) {
      return;
    }

    try {
      setSendingComment(true);
      pausePlayback();
      await api.chats.sendSnapReply(
        currentGroup.user.id,
        currentSnap.id,
        cleanComment,
      );
      setComment("");
      Keyboard.dismiss();
      showToast(t("snaps:replySent"));
    } catch {
      showToast(t("snaps:replyError"), { kind: "error" });
    } finally {
      setSendingComment(false);
      resumePlayback();
    }
  }

  function handleSnapOption() {
    setOptionsOpen(false);
    setTimeout(() => {
      pausePlayback();
      if (currentGroup?.isOwn) removeCurrentSnap();
      else setReportOpen(true);
    }, 220);
  }

  if (!currentGroup || !currentSnap) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar hidden />
        {snaps.isPending ? (
          <ActivityIndicator color="#FAF9F6" size="large" />
        ) : (
          <>
            <Text className="text-white">{t("snaps:noActiveSnaps")}</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-5 rounded-full bg-white px-5 py-3"
            >
              <Text className="font-bold text-black">{t("common:close")}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  const ageMinutes = Math.max(
    1,
    Math.floor((openedAt - new Date(currentSnap.createdAt).getTime()) / 60000),
  );
  const ageLabel =
    ageMinutes < 60
      ? t("snaps:minutesAgo", { count: ageMinutes })
      : t("snaps:hoursAgo", { count: Math.floor(ageMinutes / 60) });

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />
      <Image
        key={currentSnap.id}
        source={{ uri: currentSnap.imageUrl }}
        contentFit="cover"
        onLoad={() => {
          setFailedSnapId(null);
          setLoadedSnapId(currentSnap.id);
        }}
        onError={() => setFailedSnapId(currentSnap.id)}
        style={StyleSheet.absoluteFill}
      />
      {loadedSnapId !== currentSnap.id && failedSnapId !== currentSnap.id ? (
        <ActivityIndicator
          pointerEvents="none"
          color="#FAF9F6"
          size="large"
          style={styles.mediaLoader}
        />
      ) : null}
      {failedSnapId === currentSnap.id ? (
        <Text
          pointerEvents="none"
          className="absolute self-center text-center text-white/80"
          style={styles.mediaError}
        >
          {t("snaps:mediaError")}
        </Text>
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />

      <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.safeArea}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View className="flex-row gap-1.5 px-3 pt-1">
          {currentGroup.snaps.map((snap, index) => (
            <View
              key={snap.id}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/35"
            >
              {index < snapIndex ? (
                <View className="h-full w-full bg-white" />
              ) : index === snapIndex ? (
                <Animated.View
                  className="h-full bg-white"
                  style={{
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  }}
                />
              ) : null}
            </View>
          ))}
        </View>

        <View className="mt-3 flex-row items-center px-4">
          <TouchableOpacity
            activeOpacity={0.8}
            className="min-w-0 flex-1 flex-row items-center"
            onPress={() =>
              router.push({
                pathname: "/(users)/[id]",
                params: { id: currentGroup.user.id },
              })
            }
          >
            <Avatar
              uri={
                currentGroup.user.avatarUrl ??
                currentGroup.user.avatarThumbnailUrl
              }
              username={currentGroup.user.username}
              size={40}
              showSnapIndicator={false}
            />
            <View className="ml-3 min-w-0 flex-1">
              <Text numberOfLines={1} className="font-bold text-white">
                @{currentGroup.user.username}
              </Text>
              <Text className="text-xs text-white/70">{ageLabel}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              pausePlayback();
              setOptionsOpen(true);
            }}
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/35"
          >
            <DotsThreeIcon size={23} color="#FAF9F6" weight="bold" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/35"
          >
            <XIcon size={22} color="#FAF9F6" weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={styles.tapRow} {...panResponder.panHandlers}>
          <Pressable
            onPress={() => handleTap(goBack)}
            onPressIn={() => {
              heldRef.current = false;
              pausePlayback();
            }}
            onPressOut={resumePlayback}
            onLongPress={() => {
              heldRef.current = true;
            }}
            delayLongPress={180}
            style={styles.previousTapZone}
            accessibilityRole="button"
            accessibilityLabel="Previous snap"
          />
          <Pressable
            onPress={() => handleTap(advance)}
            onPressIn={() => {
              heldRef.current = false;
              pausePlayback();
            }}
            onPressOut={resumePlayback}
            onLongPress={() => {
              heldRef.current = true;
            }}
            delayLongPress={180}
            style={styles.nextTapZone}
            accessibilityRole="button"
            accessibilityLabel="Next snap"
          />
        </View>

        <View className="px-5 pb-3">
          {currentSnap.caption ? (
            <Text className="mb-3 text-base leading-6 text-white">
              {currentSnap.caption}
            </Text>
          ) : null}
          {currentSnap.restaurant ? (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/restaurants/[id]",
                  params: { id: currentSnap.restaurant!.id },
                })
              }
              className="self-start flex-row items-center rounded-full bg-black/55 px-4 py-3"
            >
              <MapPinIcon size={18} color="#F7D786" weight="fill" />
              <Text className="ml-2 font-bold text-white">
                {currentSnap.restaurant.name}
              </Text>
            </TouchableOpacity>
          ) : null}
          {!currentGroup.isOwn ? (
            <View className="mt-3 flex-row items-end gap-2">
              <TextInput
                value={comment}
                onChangeText={setComment}
                onFocus={pausePlayback}
                onBlur={resumePlayback}
                placeholder={t("snaps:replyPlaceholder")}
                placeholderTextColor="#D1D5DB"
                maxLength={500}
                multiline={false}
                className="h-11 flex-1 rounded-3xl border border-white/35 bg-black/40 px-4 text-white"
                style={{
                  paddingVertical: 0,
                  fontFamily: "CabinetRegular",
                  includeFontPadding: false,
                  textAlignVertical: "center",
                }}
              />
              <TouchableOpacity
                disabled={!comment.trim() || sendingComment}
                onPress={() => void sendSnapComment()}
                className="h-11 w-11 items-center justify-center rounded-full bg-white"
                style={{
                  opacity: !comment.trim() || sendingComment ? 0.45 : 1,
                }}
              >
                {sendingComment ? (
                  <ActivityIndicator size="small" color="#171717" />
                ) : (
                  <PaperPlaneTiltIcon
                    size={20}
                    color="#171717"
                    weight="fill"
                  />
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
      </KeyboardAvoidingView>
      <AppBottomSheet
        open={optionsOpen}
        onClose={() => {
          setOptionsOpen(false);
          resumePlayback();
        }}
        snapPoints={["30%"]}
      >
        <BottomSheetView className="flex-1 px-4 pb-5 pt-2">
          <Text className="mb-4 text-center text-xl font-bold text-black dark:text-white">
            {t("snaps:snapOptions")}
          </Text>
          <TouchableOpacity
            onPress={handleSnapOption}
            className={`items-center rounded-2xl py-4 ${
              currentGroup.isOwn
                ? "bg-red-500"
                : "border border-red-100 bg-red-50 dark:border-red-950 dark:bg-red-950/30"
            }`}
          >
            <Text
              className={`font-bold ${
                currentGroup.isOwn ? "text-white" : "text-red-500"
              }`}
            >
              {t(currentGroup.isOwn ? "common:delete" : "snaps:reportSnap")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setOptionsOpen(false);
              resumePlayback();
            }}
            className="mt-3 items-center rounded-2xl bg-gray-100 py-4 dark:bg-gray-800"
          >
            <Text className="font-bold text-black dark:text-white">
              {t("common:cancel")}
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </AppBottomSheet>
      <ReportBottomSheet
        open={reportOpen}
        targetType="SNAP"
        targetId={currentSnap.id}
        onClose={() => {
          setReportOpen(false);
          resumePlayback();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0B0A",
  },
  scrim: {
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  mediaLoader: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
  },
  mediaError: {
    top: "48%",
    paddingHorizontal: 32,
  },
  safeArea: {
    flex: 1,
  },
  tapRow: {
    flex: 1,
    flexDirection: "row",
  },
  previousTapZone: {
    width: "35%",
    height: "100%",
  },
  nextTapZone: {
    flex: 1,
    height: "100%",
  },
});
