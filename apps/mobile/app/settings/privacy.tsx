import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsRow from "@/components/settings/SettingsRow";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { EyeIcon, LockKeyIcon, ProhibitIcon, UsersThreeIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router, useFocusEffect } from "expo-router";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import { AppAlert as Alert } from "@/lib/appAlert";

export default function PrivacySettingsScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const { user, refreshUser } = useAuth();
  const [enabled, setEnabled] = useState(user?.showActivityStatus ?? true);
  const [saving, setSaving] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(user?.isPrivate ?? false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const color = isDark ? "#FAF9F6" : "#111";
  const { rowStyle, textStyle } = useSettingsDirection();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void api.users.followRequests().then((requests) => {
        if (active) setRequestCount(requests.length);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  async function changeActivityStatus(nextEnabled: boolean) {
    if (saving) return;

    const previousEnabled = enabled;
    setEnabled(nextEnabled);
    setSaving(true);

    try {
      await api.users.updateMe({ showActivityStatus: nextEnabled });
      await refreshUser();
    } catch (error) {
      setEnabled(previousEnabled);
      console.error("Could not update activity status privacy", error);
    } finally {
      setSaving(false);
    }
  }

  async function savePrivacy(nextPrivate: boolean) {
    if (savingPrivacy) return;
    const previous = privateAccount;
    setPrivateAccount(nextPrivate);
    setSavingPrivacy(true);
    try {
      await api.users.changePrivacy(nextPrivate);
      await refreshUser();
    } catch (error) {
      setPrivateAccount(previous);
      console.error("Could not update account privacy", error);
    } finally {
      setSavingPrivacy(false);
    }
  }

  function changePrivacy(nextPrivate: boolean) {
    if (nextPrivate) {
      void savePrivacy(true);
      return;
    }
    Alert.alert(t("publicAccountTitle"), t("publicAccountDescription"), [
      { text: t("common:cancel"), style: "cancel" },
      { text: t("switchToPublic"), onPress: () => void savePrivacy(false) },
    ]);
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <SettingsHeader title={t("privacy")} />
      <SettingsSection title={t("accountPrivacy")}>
        <View className="flex-row items-center px-5 py-4" style={rowStyle}>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900" style={{ marginEnd: 16 }}>
            <LockKeyIcon size={22} color={color} weight="fill" />
          </View>
          <View className="flex-1" style={{ marginEnd: 12 }}>
            <Text className="text-base text-black dark:text-white" style={textStyle}>{t("privateAccount")}</Text>
            <Text className="mt-0.5 text-sm text-gray-500" style={textStyle}>{t("privateAccountSubtitle")}</Text>
          </View>
          {savingPrivacy ? <ActivityIndicator color={color} /> : (
            <Switch value={privateAccount} onValueChange={changePrivacy} trackColor={{ false: "#A09D97", true: "#FF5B35" }} thumbColor={privateAccount ? "#111111" : "#F4F3F4"} />
          )}
        </View>
        <SettingsRow
          icon={<UsersThreeIcon size={22} color={color} weight="fill" />}
          title={t("followRequests")}
          subtitle={t("followRequestsSubtitle", { count: requestCount })}
          onPress={() => router.push("/settings/follow-requests")}
        />
      </SettingsSection>
      <SettingsSection title={t("activityStatus")}>
        <View className="flex-row items-center px-5 py-4" style={rowStyle}>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900" style={{ marginEnd: 16 }}>
            <EyeIcon size={22} color={color} />
          </View>

          <View className="flex-1" style={{ marginEnd: 12 }}>
            <Text className="text-base text-black dark:text-white" style={textStyle}>
              {t("showActivityStatus")}
            </Text>
            <Text className="mt-0.5 text-sm text-gray-500" style={textStyle}>
              {t("showActivityStatusSubtitle")}
            </Text>
          </View>

          {saving ? (
            <ActivityIndicator color={color} />
          ) : (
            <Switch
              value={enabled}
              onValueChange={(value) => void changeActivityStatus(value)}
              trackColor={{ false: "#A09D97", true: "#FF5B35" }}
              thumbColor={enabled ? "#111111" : "#F4F3F4"}
            />
          )}
        </View>

        <Text className="px-5 pb-4 text-sm leading-5 text-gray-500" style={textStyle}>
          {t("activityStatusReciprocalHint")}
        </Text>
      </SettingsSection>

      <SettingsSection title={t("connectionsPrivacy")}>
        <SettingsRow
          icon={<ProhibitIcon size={22} color={color} weight="bold" />}
          title={t("blockedAccounts")}
          subtitle={t("blockedAccountsSubtitle")}
          onPress={() => router.push("/settings/blocked-accounts")}
        />
      </SettingsSection>
    </SafeAreaView>
  );
}
