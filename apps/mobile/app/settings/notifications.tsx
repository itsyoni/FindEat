import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsSection from '@/components/settings/SettingsSection';
import { useAppTheme } from '@/contexts/ThemeContext';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { BellIcon, ListBulletsIcon, SlidersHorizontalIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation('settings');
  const { isDark } = useAppTheme();
  const [permission, setPermission] = useState<Notifications.PermissionStatus>();
  const color = isDark ? '#FAF9F6' : '#111';

  useFocusEffect(useCallback(() => {
    void Notifications.getPermissionsAsync().then((result) => setPermission(result.status));
  }, []));

  const permissionLabel = permission === 'granted' ? t('enabled') : permission === 'denied' ? t('disabled') : t('notSet');
  return <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
    <SettingsHeader title={t('notifications')} />
    <SettingsSection title={t('notificationControls')}>
      <SettingsRow icon={<BellIcon size={22} color={color} />} title={t('pushNotifications')} subtitle={t('pushNotificationsSubtitle')} value={permissionLabel} onPress={() => void Linking.openSettings()} />
      <SettingsRow icon={<SlidersHorizontalIcon size={22} color={color} />} title={t('deviceSettings')} subtitle={t('deviceSettingsSubtitle')} onPress={() => void Linking.openSettings()} />
      <SettingsRow icon={<ListBulletsIcon size={22} color={color} />} title={t('notificationHistory')} onPress={() => router.push('/notifications')} />
    </SettingsSection>
  </SafeAreaView>;
}
