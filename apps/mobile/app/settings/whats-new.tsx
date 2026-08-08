import Text from '@/components/common/AppText';
import { Skeleton, SkeletonPulse } from '@/components/common';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import type { ProductUpdate } from '@findeat/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewToken } from 'react-native';
import { FlatList, Switch, View } from 'react-native';
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SafeAreaView } from 'react-native-safe-area-context';
import { SparkleIcon } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import useSettingsDirection from '@/components/settings/useSettingsDirection';

export default function WhatsNewScreen() {
  const { t } = useTranslation('settings');
  const { isDark } = useAppTheme();
  const { user, refreshUser } = useAuth();
  const [updates, setUpdates] = useState<ProductUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingPopupPreference, setPendingPopupPreference] = useState<boolean | null>(null);
  const [savingPreference, setSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  const popupsEnabled =
    pendingPopupPreference ?? (user?.showWhatsNewPopups !== false);
  const background = isDark ? '#0B0B0A' : '#FBFAF8';
  const { rowStyle, textStyle } = useSettingsDirection();
  const recordedIds = useRef(new Set<string>());
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<ProductUpdate>[] }) => {
    for (const token of viewableItems) {
      const update = token.item;
      if (!token.isViewable || update.isSeen || recordedIds.current.has(update.id)) continue;
      recordedIds.current.add(update.id);
      void api.productUpdates.markSeen(update.id).catch(() => recordedIds.current.delete(update.id));
    }
  }, []);

  async function changePopupPreference(enabled: boolean) {
    if (savingPreference) return;
    setPendingPopupPreference(enabled);
    setSavingPreference(true);
    setPreferenceError('');
    try {
      await api.users.updateMe({ showWhatsNewPopups: enabled });
      await refreshUser();
    } catch {
      setPreferenceError(t('whatsNewPopupPreferenceError'));
    } finally {
      setPendingPopupPreference(null);
      setSavingPreference(false);
    }
  }

  async function refresh() {
    try {
      setUpdates(await api.productUpdates.list());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.productUpdates.list()
      .then((next) => { if (active) setUpdates(next); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <SettingsHeader title={t('whatsNew')} />
      <View className="mx-4 mt-4 rounded-3xl border border-line bg-white px-5 py-4 dark:border-gray-800 dark:bg-[#111]">
        <View className="flex-row items-center" style={rowStyle}>
          <View className="min-w-0 flex-1" style={{ paddingEnd: 16 }}>
            <Text weight="bold" className="text-base text-black dark:text-white" style={textStyle}>
              {t('whatsNewPopups')}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400" style={textStyle}>
              {t('whatsNewPopupsSubtitle')}
            </Text>
          </View>
          <Switch
            value={popupsEnabled}
            disabled={savingPreference}
            onValueChange={(enabled) => void changePopupPreference(enabled)}
            trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#F4B942' }}
            thumbColor="#FAF9F6"
          />
        </View>
        {preferenceError ? (
          <Text className="mt-3 text-sm text-red-500" style={textStyle}>{preferenceError}</Text>
        ) : null}
      </View>
      {loading ? (
        <SkeletonPulse style={{ padding: 16 }}>
          {[0, 1, 2].map((item) => (
            <View key={item} className="mb-4 overflow-hidden rounded-3xl border border-line bg-white dark:border-gray-800 dark:bg-[#111]">
              <Skeleton height={190} radius={0} />
              <View className="gap-3 p-5">
                <Skeleton width="34%" height={11} radius={5} />
                <Skeleton width="70%" height={23} radius={8} />
                <Skeleton width="100%" height={12} radius={6} />
                <Skeleton width="86%" height={12} radius={6} />
                <Skeleton width="28%" height={10} radius={5} />
              </View>
            </View>
          ))}
        </SkeletonPulse>
      ) : (
        <FlatList
          data={updates}
          keyExtractor={(update) => update.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 48, flexGrow: 1 }}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void refresh(); }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 400 }}
          ListEmptyComponent={(
            <View className="mt-20 items-center px-8">
              <SparkleIcon size={46} color="#F4B942" weight="duotone" />
              <Text weight="bold" className="mt-4 text-xl text-black dark:text-white" style={textStyle}>{t('noProductUpdates')}</Text>
              <Text className="mt-2 text-center text-gray-500">{t('noProductUpdatesSubtitle')}</Text>
            </View>
          )}
          renderItem={({ item: update }) => (
            <View className="mb-4 overflow-hidden rounded-3xl border border-line bg-white dark:border-gray-800 dark:bg-[#111]">
              {update.imageUrl ? <ProgressiveImage source={{ uri: update.imageUrl }} className="h-48 w-full" resizeMode="cover" /> : null}
              <View className="p-5">
                <View className="flex-row items-center" style={rowStyle}>
                  <SparkleIcon size={17} color="#F4B942" weight="fill" />
                  <Text weight="bold" className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400" style={[textStyle, { marginStart: 8 }]}>{t('whatsNew')}</Text>
                  {update.versionLabel ? <Text className="ml-auto text-xs text-gray-400">{update.versionLabel}</Text> : null}
                </View>
                <Text weight="bold" className="mt-3 text-2xl text-black dark:text-white" style={textStyle}>{update.title}</Text>
                <Text className="mt-3 text-base leading-6 text-gray-600 dark:text-gray-300" style={textStyle}>{update.body}</Text>
                <Text className="mt-4 text-xs text-gray-400" style={textStyle}>{new Date(update.publishedAt ?? update.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
