import { Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import useSettingsDirection from "@/components/settings/useSettingsDirection";
import ProfileTagDetailsBottomSheet from "@/components/profile/ProfileTagDetailsBottomSheet";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { ProfileTagCollection, ProfileTagKey } from "@findeat/types";
import { useFocusEffect } from "expo-router";
import { CheckCircleIcon, LockKeyIcon, TagIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileTagsScreen() {
  const { t } = useTranslation(["settings", "profile"]);
  const { isDark } = useAppTheme();
  const { rowStyle, textStyle } = useSettingsDirection();
  const [collection, setCollection] = useState<ProfileTagCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ProfileTagKey | "NONE" | null>(null);
  const [detailsKey, setDetailsKey] = useState<ProfileTagKey | null>(null);
  const unlockedTags = collection?.items.filter((item) => item.unlockedAt) ?? [];
  const lockedTags = collection?.items.filter((item) => !item.unlockedAt) ?? [];
  const detailsItem = collection?.items.find((item) => item.key === detailsKey);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void api.profileTags
        .mine()
        .then((result) => {
          if (!active) return;
          setCollection(result);
          void api.profileTags.markSeen();
        })
        .catch((error) => console.error("Could not load profile tags", error))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function choose(key: ProfileTagKey | null) {
    if (saving) return;
    setSaving(key ?? "NONE");
    try {
      await api.profileTags.select(key);
      setCollection((current) =>
        current
          ? {
              ...current,
              selectedKey: key,
              items: current.items.map((item) => ({
                ...item,
                isSelected: item.key === key,
              })),
            }
          : current,
      );
    } catch (error) {
      console.error("Could not select profile tag", error);
    } finally {
      setSaving(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <SettingsHeader title={t("settings:profileTagCollection")} />
      {loading ? (
        <SkeletonPulse>
          <View className="gap-3 px-5 pt-5">
            <Skeleton width="100%" height={110} radius={24} />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} width="100%" height={108} radius={22} />
            ))}
          </View>
        </SkeletonPulse>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <View className="rounded-[24px] bg-amber-100 p-5 dark:bg-amber-950" style={rowStyle}>
            <View className="flex-row items-center" style={rowStyle}>
              <TagIcon size={26} color="#D97706" weight="fill" />
              <Text className="flex-1 text-lg font-black text-amber-950 dark:text-amber-100" style={[textStyle, { marginStart: 12 }]}>
                {t("settings:profileTagCollectionIntroTitle")}
              </Text>
            </View>
            <Text className="mt-2 text-sm leading-5 text-amber-900/70 dark:text-amber-200/70" style={textStyle}>
              {t("settings:profileTagCollectionIntro")}
            </Text>
            {collection?.selectedKey ? (
              <TouchableOpacity
                className="mt-4 self-start rounded-full bg-white px-4 py-2 dark:bg-black"
                onPress={() => void choose(null)}
                disabled={saving !== null}
              >
                <Text className="text-xs font-bold text-black dark:text-white">
                  {t("settings:hideProfileTag")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mt-5">
            {unlockedTags.length > 0 ? (
              <Text className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500" style={textStyle}>
                {t("settings:unlockedProfileTags")}
              </Text>
            ) : null}
            <View className="gap-3">
            {unlockedTags.map((item) => {
              const unlocked = Boolean(item.unlockedAt);
              const progress = Math.min(100, (item.progress / item.threshold) * 100);
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={unlocked ? 0.7 : 1}
                  disabled={!unlocked || saving !== null}
                  onPress={() => setDetailsKey(item.key)}
                  className={`overflow-hidden rounded-[22px] border p-4 ${
                    item.isSelected
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  }`}
                  style={rowStyle}
                >
                  <View className="flex-row items-start" style={rowStyle}>
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      {unlocked ? (
                        <TagIcon size={22} color="#D97706" weight="fill" />
                      ) : (
                        <LockKeyIcon size={20} color="#9CA3AF" weight="fill" />
                      )}
                    </View>
                    <View className="flex-1" style={{ marginStart: 12 }}>
                      <View className="flex-row items-center" style={rowStyle}>
                        <Text className="flex-1 text-base font-black text-black dark:text-white" style={textStyle}>
                          {t(`profile:profileTags.${item.key}.name`)}
                        </Text>
                        {item.isNew ? (
                          <Text className="rounded-full bg-blue-500 px-2 py-1 text-[10px] font-black text-white">
                            {t("settings:newTag")}
                          </Text>
                        ) : item.isSelected ? (
                          <CheckCircleIcon size={21} color="#D97706" weight="fill" />
                        ) : null}
                      </View>
                      <Text className="mt-1 text-sm leading-5 text-gray-500" style={textStyle}>
                        {t(`profile:profileTags.${item.key}.description`, {
                          count: item.threshold,
                        })}
                      </Text>
                    </View>
                  </View>
                  {!unlocked ? (
                    <View className="mt-3">
                      <View className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <View className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} />
                      </View>
                      <Text className="mt-1.5 text-right text-xs font-bold text-gray-400">
                        {item.progress}/{item.threshold}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
            </View>

            <View className={unlockedTags.length > 0 ? "mt-7" : ""}>
              <Text className="text-sm font-black uppercase tracking-wider text-gray-500" style={textStyle}>
                {t("settings:lockedProfileTags")}
              </Text>
              <Text className="mt-1 text-sm text-gray-400" style={textStyle}>
                {t("settings:lockedProfileTagsSubtitle")}
              </Text>
            </View>

            <View className="mt-3 gap-3">
            {lockedTags.map((item) => {
              const progress = Math.min(100, (item.progress / item.threshold) * 100);
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.72}
                  onPress={() => setDetailsKey(item.key)}
                  className="overflow-hidden rounded-[22px] border border-gray-200 bg-gray-100/70 p-4 opacity-60 dark:border-gray-800 dark:bg-gray-950"
                  style={rowStyle}
                  accessibilityHint={t("settings:openTagDetails")}
                >
                  <View className="flex-row items-start" style={rowStyle}>
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                      <LockKeyIcon size={20} color="#9CA3AF" weight="fill" />
                    </View>
                    <View className="flex-1" style={{ marginStart: 12 }}>
                      <Text className="text-base font-black text-gray-500 dark:text-gray-400" style={textStyle}>
                        {t(`profile:profileTags.${item.key}.name`)}
                      </Text>
                      <Text className="mt-1 text-sm leading-5 text-gray-400" style={textStyle}>
                        {t(`profile:profileTags.${item.key}.description`, {
                          count: item.threshold,
                        })}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3">
                    <View className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      <View className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} />
                    </View>
                    <Text className="mt-1.5 text-right text-xs font-bold text-gray-400">
                      {item.progress}/{item.threshold}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            </View>
          </View>
          <ProfileTagDetailsBottomSheet
            tag={detailsKey}
            onClose={() => setDetailsKey(null)}
            progress={detailsItem?.progress}
            threshold={detailsItem?.threshold}
            unlocked={Boolean(detailsItem?.unlockedAt)}
            selected={detailsItem?.isSelected}
            selecting={saving === detailsKey}
            onSelect={detailsItem?.unlockedAt ? () => void choose(detailsItem.key) : undefined}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
