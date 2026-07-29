import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { useSnaps } from "@/hooks/useSnaps";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { PlusIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, TouchableOpacity, View } from "react-native";

type Props = {
  overlay?: boolean;
};

export default function SnapsTray({ overlay = false }: Props) {
  const { t } = useTranslation("snaps");
  const { user } = useAuth();
  const snaps = useSnaps(!!user);
  const groups = snaps.data ?? [];
  const ownGroup = groups.find((group) => group.isOwn);
  const otherGroups = groups.filter((group) => !group.isOwn);

  function openGroup(userId: string) {
    router.push({
      pathname: "/snaps/[userId]",
      params: { userId },
    });
  }

  return (
    <View className={overlay ? "pb-1 pt-1" : "border-b border-gray-100 pb-3 pt-1 dark:border-gray-900"}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 14 }}
      >
        <View className="w-[70px] items-center">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t(ownGroup ? "viewYourSnaps" : "addSnap")}
            onPress={() =>
              ownGroup ? openGroup(ownGroup.user.id) : router.push("/create/snap")
            }
          >
            <View className="rounded-full border-2 border-gray-300 p-[3px] dark:border-gray-700">
              <Avatar
                uri={user?.avatarUrl}
                username={user?.username}
                size={58}
              />
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("addSnap")}
              onPress={() => router.push("/create/snap")}
              className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand dark:border-black"
            >
              <PlusIcon size={16} color="#FFF" weight="bold" />
            </TouchableOpacity>
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            className={`mt-2 text-center text-xs ${overlay ? "font-bold text-white" : "text-gray-700 dark:text-gray-300"}`}
            style={
              overlay
                ? {
                    textShadowColor: "rgba(0,0,0,0.9)",
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
            className="w-[70px] items-center"
          >
            {group.hasUnseen ? (
              <LinearGradient
                colors={["#F59E0B", "#EF4444", "#A855F7"]}
                className="rounded-full p-[3px]"
              >
                <View className="rounded-full bg-white p-[2px] dark:bg-black">
                  <Avatar
                    uri={group.user.avatarUrl}
                    username={group.user.username}
                    size={56}
                  />
                </View>
              </LinearGradient>
            ) : (
              <View className="rounded-full border-2 border-gray-300 p-[3px] dark:border-gray-700">
                <Avatar
                  uri={group.user.avatarUrl}
                  username={group.user.username}
                  size={58}
                />
              </View>
            )}
            <Text
              numberOfLines={1}
              className={`mt-2 w-full text-center text-xs ${overlay ? "font-bold text-white" : "text-gray-700 dark:text-gray-300"}`}
              style={
                overlay
                  ? {
                      textShadowColor: "rgba(0,0,0,0.9)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4,
                    }
                  : undefined
              }
            >
              {group.user.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
