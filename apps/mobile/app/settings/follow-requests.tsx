import { Avatar, SkeletonList } from "@/components/common";
import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { FollowRequest } from "@findeat/types";
import { router } from "expo-router";
import { UserPlusIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FollowRequestsScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { refreshUser } = useAuth();
  const { rowStyle, textStyle } = useSettingsDirection();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    void api.users.followRequests().then(setRequests).finally(() => setLoading(false));
  }, []);

  async function resolve(requesterId: string, approve: boolean) {
    if (workingId) return;
    setWorkingId(requesterId);
    try {
      if (approve) await api.users.approveFollowRequest(requesterId);
      else await api.users.rejectFollowRequest(requesterId);
      setRequests((current) => current.filter((item) => item.requester.id !== requesterId));
      await refreshUser();
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <SettingsHeader title={t("followRequests")} />
      {loading ? <SkeletonList count={7} /> : requests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
            <UserPlusIcon size={35} color={isDark ? "#FAF9F6" : "#171717"} weight="fill" />
          </View>
          <Text weight="bold" className="mt-5 text-xl text-black dark:text-white">{t("noFollowRequests")}</Text>
          <Text className="mt-2 text-center text-gray-500" style={textStyle}>{t("noFollowRequestsSubtitle")}</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/(users)/[id]", params: { id: item.requester.id } })}
              className="flex-row items-center px-5 py-3"
              style={rowStyle}
            >
              <Avatar uri={item.requester.avatarUrl} username={item.requester.username} size={50} />
              <View className="min-w-0 flex-1" style={{ marginStart: 12 }}>
                <Text numberOfLines={1} weight="bold" className="text-black dark:text-white" style={textStyle}>{item.requester.username}</Text>
              </View>
              <TouchableOpacity disabled={!!workingId} onPress={(event) => { event.stopPropagation(); void resolve(item.requester.id, true); }} className="rounded-xl bg-black px-3.5 py-2.5 dark:bg-white">
                <Text weight="bold" className="text-xs text-white dark:text-black">{t("confirmRequest")}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!!workingId} onPress={(event) => { event.stopPropagation(); void resolve(item.requester.id, false); }} className="ml-2 rounded-xl bg-gray-200 px-3.5 py-2.5 dark:bg-gray-800">
                <Text weight="bold" className="text-xs text-black dark:text-white">{t("deleteRequest")}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
