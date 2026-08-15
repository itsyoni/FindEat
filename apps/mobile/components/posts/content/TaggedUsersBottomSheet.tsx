import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import type { UserRelationship, UserSummary } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import RelationshipActionButton from "@/components/profile/RelationshipActionButton";
import {
  getNextRelationshipAfterToggle,
  shouldRemoveFollowRelationship,
} from "@findeat/utils";

type Props = {
  open: boolean;
  users: UserSummary[];
  onClose: () => void;
  title?: string;
  displayNames?: boolean;
  showRelationshipActions?: boolean;
};

export default function TaggedUsersBottomSheet({
  open,
  users,
  onClose,
  title,
  displayNames = false,
  showRelationshipActions = false,
}: Props) {
  const { t } = useTranslation(["common", "notifications"]);
  const { user: currentUser } = useAuth();
  const [relationships, setRelationships] = useState<
    Record<string, UserRelationship>
  >({});
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !showRelationshipActions) return;
    let active = true;
    const targets = users.filter((user) => user.id !== currentUser?.id);
    void Promise.all(
      targets.map(async (user) => {
        const profile = await api.users.get(user.id);
        return [user.id, profile.relationship] as const;
      }),
    ).then((entries) => {
      if (active) setRelationships(Object.fromEntries(entries));
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentUser?.id, open, showRelationshipActions, users]);

  function relationshipLabel(relationship: UserRelationship = "NONE") {
    switch (relationship) {
      case "FRIENDS":
        return t("notifications:friends");
      case "FOLLOWING":
        return t("notifications:following");
      case "FOLLOWED_BY":
        return t("notifications:followBack");
      case "REQUESTED":
        return t("notifications:requested");
      default:
        return t("notifications:follow");
    }
  }

  async function toggleRelationship(userId: string) {
    if (updatingIds.has(userId)) return;
    const previous = relationships[userId] ?? "NONE";
    setUpdatingIds((current) => new Set(current).add(userId));
    setRelationships((current) => ({
      ...current,
      [userId]: getNextRelationshipAfterToggle(previous),
    }));
    try {
      const result = await api.users.toggleFollow(
        userId,
        shouldRemoveFollowRelationship(previous),
      );
      setRelationships((current) => ({
        ...current,
        [userId]: result.relationship,
      }));
    } catch {
      setRelationships((current) => ({ ...current, [userId]: previous }));
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
    }
  }

  function openProfile(userId: string) {
    onClose();
    router.push({
      pathname: "/(users)/[id]",
      params: { id: userId },
    });
  }

  return (
    <AppBottomSheet open={open} onClose={onClose} snapPoints={["55%", "85%"]}>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
      >
        <Text className="mb-4 text-xl font-bold text-[#171716] dark:text-[#F7F6F2]">
          {title ?? t("taggedPeople")}
        </Text>

        <View className="gap-1">
          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              activeOpacity={0.7}
              className="flex-row items-center rounded-2xl px-1 py-2.5"
              onPress={() => openProfile(user.id)}
            >
              <Avatar
                uri={user.avatarUrl}
                thumbnailUrl={user.avatarThumbnailUrl}
                username={user.username}
                userId={user.id}
                size={44}
                showSnapIndicator={false}
              />
              <View className="ml-3 min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="font-bold text-[#171716] dark:text-[#F7F6F2]"
                >
                  {displayNames
                    ? userDisplayName(user)
                    : usernameLabel(user.username)}
                </Text>
                {displayNames && user.displayName?.trim() ? (
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {usernameLabel(user.username)}
                  </Text>
                ) : null}
              </View>
              {showRelationshipActions && user.id !== currentUser?.id ? (
                <RelationshipActionButton
                  relationship={relationships[user.id] ?? "NONE"}
                  label={relationshipLabel(relationships[user.id])}
                  className="ml-3 min-w-24"
                  style={{ opacity: updatingIds.has(user.id) ? 0.55 : 1 }}
                  onPress={(event) => {
                    event.stopPropagation();
                    void toggleRelationship(user.id);
                  }}
                />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
}
