import AppBottomSheet from "@/components/common/AppBottomSheet";
import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import type { UserSummary } from "@findeat/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";

type Props = {
  open: boolean;
  users: UserSummary[];
  onClose: () => void;
  title?: string;
  displayNames?: boolean;
};

export default function TaggedUsersBottomSheet({
  open,
  users,
  onClose,
  title,
  displayNames = false,
}: Props) {
  const { t } = useTranslation("common");

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
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
}
