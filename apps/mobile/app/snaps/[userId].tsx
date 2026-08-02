import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { snapsQueryKey, useSnaps } from "@/hooks/useSnaps";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import type { SnapGroup } from "@findeat/types";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMarkSnapWatched } from "@/contexts/SnapIndicatorContext";

const SNAP_DURATION_MS = 5000;

export default function SnapViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { t } = useTranslation(["snaps", "common"]);
  const queryClient = useQueryClient();
  const markSnapWatched = useMarkSnapWatched();
  const snaps = useSnaps();
  const [progress] = useState(() => new Animated.Value(0));
  const [openedAt] = useState(() => Date.now());
  const [groupIndex, setGroupIndex] = useState<number | null>(null);
  const [snapIndex, setSnapIndex] = useState(0);
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const groups = useMemo(() => snaps.data ?? [], [snaps.data]);
  const currentGroup = groupIndex === null ? null : groups[groupIndex];
  const currentSnap = currentGroup?.snaps[snapIndex];
  const currentSnapId = currentSnap?.id;
  const currentSnapCount = currentGroup?.snaps.length ?? 0;

  useEffect(() => {
    if (!snaps.data || groupIndex !== null) return;
    const index = snaps.data.findIndex((group) => group.user.id === userId);
    const firstUnseen = snaps.data[index]?.snaps.findIndex(
      (snap) => !snap.viewedAt,
    );
    const timer = setTimeout(() => {
      setGroupIndex(index);
      setSnapIndex(firstUnseen != null && firstUnseen >= 0 ? firstUnseen : 0);
    }, 0);
    return () => clearTimeout(timer);
  }, [groupIndex, snaps.data, userId]);

  const advance = useCallback(() => {
    if (groupIndex === null || currentSnapCount === 0) return;
    if (snapIndex < currentSnapCount - 1) {
      setSnapIndex((current) => current + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((current) => (current ?? 0) + 1);
      setSnapIndex(0);
      return;
    }
    router.back();
  }, [currentSnapCount, groupIndex, groups.length, snapIndex]);

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
  }, [currentGroup, groupIndex, groups, snapIndex]);

  useEffect(() => {
    if (!currentSnapId) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: SNAP_DURATION_MS,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) advance();
    });
    return () => animation.stop();
  }, [advance, currentSnapId, playbackRevision, progress]);

  useEffect(() => {
    if (!currentSnap || currentSnap.viewedAt) return;
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
    markSnapWatched,
    queryClient,
  ]);

  function removeCurrentSnap() {
    if (!currentSnap) return;
    Alert.alert(t("snaps:deleteTitle"), t("snaps:deleteBody"), [
      { text: t("common:cancel"), style: "cancel" },
      {
        text: t("common:delete"),
        style: "destructive",
        onPress: () => {
          void api.snaps
            .remove(currentSnap.id)
            .then(async () => {
              await queryClient.invalidateQueries({ queryKey: snapsQueryKey });
              router.back();
            })
            .catch(() =>
              Alert.alert(t("common:error"), t("snaps:deleteError")),
            );
        },
      },
    ]);
  }

  if (!currentGroup || !currentSnap) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar hidden />
        {snaps.isPending ? (
          <ActivityIndicator color="#FFF" size="large" />
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
        source={{ uri: currentSnap.imageUrl }}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />

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
          <Avatar
            uri={currentGroup.user.avatarUrl}
            username={currentGroup.user.username}
            size={40}
          />
          <View className="ml-3 flex-1">
            <Text className="font-bold text-white">
              @{currentGroup.user.username}
            </Text>
            <Text className="text-xs text-white/70">{ageLabel}</Text>
          </View>
          {currentGroup.isOwn ? (
            <>
              <TouchableOpacity
                onPress={() => router.push("/create/snap")}
                className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/35"
              >
                <PlusIcon size={20} color="#FFF" weight="bold" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={removeCurrentSnap}
                className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/35"
              >
                <TrashIcon size={19} color="#FFF" weight="fill" />
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/35"
          >
            <XIcon size={22} color="#FFF" weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={styles.tapRow}>
          <Pressable
            onPress={goBack}
            style={styles.previousTapZone}
            accessibilityRole="button"
            accessibilityLabel="Previous snap"
          />
          <Pressable
            onPress={advance}
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
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrim: {
    backgroundColor: "rgba(0, 0, 0, 0.15)",
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
