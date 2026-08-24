import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { useSnaps } from "@/hooks/useSnaps";
import { router } from "expo-router";
import { PlusIcon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useSnapIndicatorLookup } from "@/contexts/SnapIndicatorContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { userDisplayName } from "@/lib/userIdentity";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  overlay?: boolean;
  hideDivider?: boolean;
};

export default function SnapsTray({
  overlay = false,
  hideDivider = false,
}: Props) {
  const { t } = useTranslation("snaps");
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const snaps = useSnaps(!!user);
  const snapIndicatorFor = useSnapIndicatorLookup();
  const groups = snaps.data ?? [];
  const ownGroup = groups.find((group) => group.isOwn);
  const ownSnapIndicator = ownGroup
    ? snapIndicatorFor({ userId: ownGroup.user.id })
    : null;
  const watchedRingColor = isDark ? "#4B5563" : "#9CA3AF";
  const otherGroups = groups
    .filter((group) => !group.isOwn)
    .sort((first, second) => {
      const firstUnseen =
        snapIndicatorFor({ userId: first.user.id }) === "unseen";
      const secondUnseen =
        snapIndicatorFor({ userId: second.user.id }) === "unseen";
      if (firstUnseen !== secondUnseen) return firstUnseen ? -1 : 1;
      const firstLatest = new Date(
        first.snaps[first.snaps.length - 1]?.createdAt ?? 0,
      ).getTime();
      const secondLatest = new Date(
        second.snaps[second.snaps.length - 1]?.createdAt ?? 0,
      ).getTime();
      return secondLatest - firstLatest;
    });

  function openGroup(userId: string) {
    router.push({
      pathname: "/snaps/[userId]",
      params: { userId },
    });
  }

  function openSnapCamera() {
    router.push("/create/snap");
  }

  const ownAvatarUrl =
    user?.avatarUrl ||
    user?.avatarThumbnailUrl ||
    ownGroup?.user.avatarUrl ||
    ownGroup?.user.avatarThumbnailUrl;

  function SnapRing({
    children,
    status,
  }: {
    children: ReactNode;
    status: "unseen" | "viewed" | "empty";
  }) {
    const ringColor =
      status === "viewed"
        ? watchedRingColor
        : isDark
          ? "#374151"
          : "#D1D5DB";
    const ringColors =
      status === "unseen"
        ? (["#FFD447", "#FF9F1C", "#FF5B35"] as const)
        : ([ringColor, ringColor] as const);
    return (
      <LinearGradient
        colors={ringColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 66,
          height: 66,
          borderRadius: 33,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
          }}
        >
          {children}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View
      className={`pb-1 pt-1 ${
        !overlay && !hideDivider
          ? "border-b border-gray-100 dark:border-gray-900"
          : ""
      }`}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 14 }}
      >
        <View className="w-17.5 items-center">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t(ownGroup ? "viewYourSnaps" : "addSnap")}
            onPress={() =>
              ownGroup ? openGroup(ownGroup.user.id) : openSnapCamera()
            }
          >
            {ownGroup ? (
              <SnapRing status={ownSnapIndicator ?? "viewed"}>
                <Avatar
                  uri={ownAvatarUrl}
                  username={user?.username}
                  size={56}
                  showSnapIndicator={false}
                />
              </SnapRing>
            ) : (
              <SnapRing status="empty">
                <Avatar
                  uri={ownAvatarUrl}
                  username={user?.username}
                  size={56}
                  showSnapIndicator={false}
                />
              </SnapRing>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("addSnap")}
              onPress={openSnapCamera}
              className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand dark:border-black"
            >
              <PlusIcon size={16} color="#FAF9F6" weight="bold" />
            </TouchableOpacity>
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            className={`mt-2 text-center text-xs ${overlay ? "font-bold" : "text-gray-700 dark:text-gray-300"}`}
            style={
              overlay
                ? {
                    color: isDark ? "#FAF9F6" : "#171717",
                    textShadowColor: isDark
                      ? "rgba(0,0,0,0.9)"
                      : "rgba(255,255,255,0.9)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }
                : undefined
            }
          >
            {t("yourSnap")}
          </Text>
        </View>

        {otherGroups.map((group) => (
          <TouchableOpacity
            key={group.user.id}
            accessibilityRole="button"
            accessibilityLabel={t("viewUserSnaps", {
              username: group.user.username,
            })}
            onPress={() => openGroup(group.user.id)}
            className="w-17.5 items-center"
          >
            {snapIndicatorFor({ userId: group.user.id }) === "unseen" ? (
              <SnapRing status="unseen">
                <Avatar
                  uri={group.user.avatarUrl || group.user.avatarThumbnailUrl}
                  username={group.user.username}
                  size={56}
                  showSnapIndicator={false}
                />
              </SnapRing>
            ) : (
              <SnapRing status="viewed">
                <Avatar
                  uri={group.user.avatarUrl || group.user.avatarThumbnailUrl}
                  username={group.user.username}
                  size={56}
                  showSnapIndicator={false}
                />
              </SnapRing>
            )}
            <Text
              numberOfLines={1}
              className={`mt-2 w-full text-center text-xs ${overlay ? "font-bold" : "text-gray-700 dark:text-gray-300"}`}
              style={
                overlay
                  ? {
                      color: isDark ? "#FAF9F6" : "#171717",
                      textShadowColor: isDark
                        ? "rgba(0,0,0,0.9)"
                        : "rgba(255,255,255,0.9)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4,
                    }
                  : undefined
              }
            >
              {userDisplayName(group.user)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
