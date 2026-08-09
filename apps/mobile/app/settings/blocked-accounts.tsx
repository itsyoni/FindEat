import { AppAlert as Alert } from "@/lib/appAlert";
import { Avatar, SkeletonList } from "@/components/common";
import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { BlockedUser } from "@findeat/types";
import { ProhibitIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSettingsDirection from "@/components/settings/useSettingsDirection";

export default function BlockedAccountsScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const { rowStyle, textStyle } = useSettingsDirection();

  useEffect(() => {
    let cancelled = false;

    void api.users
      .blockedUsers()
      .then((blockedUsers) => {
        if (!cancelled) setUsers(blockedUsers);
      })
      .catch((error) => console.error("Could not load blocked users", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function unblock(user: BlockedUser) {
    if (unblockingId) return;

    try {
      setUnblockingId(user.id);
      await api.users.unblock(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      console.error("Could not unblock user", error);
      Alert.alert(t("unblockError"));
    } finally {
      setUnblockingId(null);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SettingsHeader title={t("blockedAccounts")} />
      {loading ? <SkeletonList count={7} /> : users.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pb-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
            <ProhibitIcon
              size={34}
              color={isDark ? "#FAF9F6" : "#171717"}
              weight="bold"
            />
          </View>
          <Text className="mt-5 text-xl font-bold text-black dark:text-white">
            {t("noBlockedAccounts")}
          </Text>
          <Text className="mt-2 text-center text-gray-500">
            {t("noBlockedAccountsSubtitle")}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          {users.map((user) => (
            <View
              key={user.id}
              className="flex-row items-center border-b border-line px-5 py-4 dark:border-gray-800"
              style={rowStyle}
            >
              <Avatar
                uri={user.avatarUrl}
                username={user.username}
                size={50}
              />
              <View className="min-w-0 flex-1" style={{ marginStart: 12 }}>
                <Text
                  numberOfLines={1}
                  className="font-bold text-black dark:text-white"
                  style={textStyle}
                >
                  {user.username}
                </Text>
              </View>
              <TouchableOpacity
                disabled={unblockingId === user.id}
                onPress={() => void unblock(user)}
                className="rounded-xl border border-gray-300 px-4 py-2.5 dark:border-gray-700"
              >
                <Text className="font-bold text-black dark:text-white">
                  {t("unblock")}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
