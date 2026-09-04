import { Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsSection from "@/components/settings/SettingsSection";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import {
  BellIcon,
  CameraIcon,
  ImageSquareIcon,
  MapPinIcon,
} from "phosphor-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import useSettingsDirection from "@/components/settings/useSettingsDirection";

type PermissionKey = "camera" | "photos" | "location" | "notifications";
type PermissionState = {
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
  limited?: boolean;
};

const emptyPermissions: Record<PermissionKey, PermissionState> = {
  camera: { status: "undetermined", canAskAgain: true },
  photos: { status: "undetermined", canAskAgain: true },
  location: { status: "undetermined", canAskAgain: true },
  notifications: { status: "undetermined", canAskAgain: true },
};

export default function PermissionsSettingsScreen() {
  const { t } = useTranslation("settings");
  const { isDark } = useAppTheme();
  const [permissions, setPermissions] = useState(emptyPermissions);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<PermissionKey | null>(null);
  const color = isDark ? "#FAF9F6" : "#171717";
  const { textStyle } = useSettingsDirection();

  const loadPermissions = useCallback(async () => {
    try {
      const [camera, photos, location, notifications] = await Promise.all([
        Camera.getCameraPermissionsAsync(),
        Platform.OS === "android"
          ? Promise.resolve(null)
          : ImagePicker.getMediaLibraryPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
        Notifications.getPermissionsAsync(),
      ]);
      setPermissions({
        camera: { status: camera.status, canAskAgain: camera.canAskAgain },
        photos: photos
          ? {
              status: photos.status,
              canAskAgain: photos.canAskAgain,
              limited: photos.accessPrivileges === "limited",
            }
          : { status: "granted", canAskAgain: false },
        location: { status: location.status, canAskAgain: location.canAskAgain },
        notifications: {
          status: notifications.status,
          canAskAgain: notifications.canAskAgain,
        },
      });
    } catch (error) {
      console.error("Could not read device permissions", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadPermissions(); }, [loadPermissions]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void loadPermissions();
    });
    return () => subscription.remove();
  }, [loadPermissions]);

  async function managePermission(key: PermissionKey) {
    const current = permissions[key];
    if (current.status === "granted" || current.limited || !current.canAskAgain) {
      await Linking.openSettings();
      return;
    }

    setWorking(key);
    try {
      if (key === "camera") await Camera.requestCameraPermissionsAsync();
      if (key === "photos" && Platform.OS === "ios") {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (key === "location") await Location.requestForegroundPermissionsAsync();
      if (key === "notifications") await Notifications.requestPermissionsAsync();
      await loadPermissions();
    } finally {
      setWorking(null);
    }
  }

  const rows: { key: PermissionKey; icon: ReactNode }[] = [
    { key: "camera", icon: <CameraIcon size={23} color={color} weight="duotone" /> },
    { key: "photos", icon: <ImageSquareIcon size={23} color={color} weight="duotone" /> },
    { key: "location", icon: <MapPinIcon size={23} color={color} weight="duotone" /> },
    { key: "notifications", icon: <BellIcon size={23} color={color} weight="duotone" /> },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <SettingsHeader title={t("appPermissions")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 44 }}>
        <Text className="px-5 pt-4 leading-5 text-gray-500" style={textStyle}>{t("appPermissionsIntro")}</Text>
        <SettingsSection title={t("devicePermissions")}>
          {rows.map((row) => (
            <PermissionRow
              key={row.key}
              icon={row.icon}
              title={t(`permission.${row.key}.title`)}
              subtitle={t(`permission.${row.key}.subtitle`)}
              permission={permissions[row.key]}
              loading={loading}
              working={working === row.key}
              onPress={() => void managePermission(row.key)}
            />
          ))}
        </SettingsSection>
        <Text className="px-5 pt-5 text-sm leading-5 text-gray-500" style={textStyle}>{t("permissionsSystemHint")}</Text>
        <TouchableOpacity onPress={() => void Linking.openSettings()} className="mx-5 mt-4 items-center rounded-2xl bg-ink py-3.5 dark:bg-white">
          <Text weight="bold" className="text-white dark:text-black">{t("openDeviceSettings")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionRow({
  icon,
  title,
  subtitle,
  permission,
  loading,
  working,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  permission: PermissionState;
  loading: boolean;
  working: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation("settings");
  const { rowStyle, textStyle, isRtl } = useSettingsDirection();
  const status = permission.limited
    ? "limited"
    : permission.status === "granted"
      ? "allowed"
      : permission.status === "denied"
        ? "denied"
        : "notRequested";
  const canRequest = permission.status !== "granted" && !permission.limited && permission.canAskAgain;
  const statusBackgroundClass = status === "allowed"
    ? "bg-green-100 dark:bg-green-950"
    : status === "limited"
      ? "bg-amber-100 dark:bg-amber-950"
      : status === "denied"
        ? "bg-red-100 dark:bg-red-950"
        : "bg-gray-100 dark:bg-gray-900";
  const statusTextClass = status === "allowed"
    ? "text-green-700 dark:text-green-300"
    : status === "limited"
      ? "text-amber-700 dark:text-amber-300"
      : status === "denied"
        ? "text-red-600 dark:text-red-300"
        : "text-gray-600 dark:text-gray-300";

  return (
    <View className="flex-row items-center border-b border-line px-5 py-4 last:border-b-0 dark:border-gray-800" style={rowStyle}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-soft dark:bg-gray-900" style={{ marginEnd: 16 }}>{icon}</View>
      <View className="min-w-0 flex-1" style={{ paddingEnd: 12 }}>
        <Text className="text-base text-ink dark:text-white" style={textStyle}>{title}</Text>
        <Text className="mt-0.5 text-sm leading-5 text-gray-500" style={textStyle}>{subtitle}</Text>
        {loading ? (
          <SkeletonPulse style={{ marginTop: 8 }}><Skeleton width={76} height={22} radius={11} /></SkeletonPulse>
        ) : (
          <View className={`mt-2 rounded-full px-2.5 py-1 ${statusBackgroundClass}`} style={{ alignSelf: isRtl ? "flex-end" : "flex-start" }}>
            <Text weight="bold" className={`text-xs ${statusTextClass}`}>{t(`permissionStatus.${status}`)}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity disabled={loading || working} onPress={onPress} className="rounded-xl bg-soft px-3 py-2.5 dark:bg-gray-900">
        <Text weight="bold" className="text-sm text-ink dark:text-white">{working ? t("pleaseWait") : t(canRequest ? "allowPermission" : "managePermission")}</Text>
      </TouchableOpacity>
    </View>
  );
}
