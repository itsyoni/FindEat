import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsSection from '@/components/settings/SettingsSection';
import { useAppTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { KeyIcon, PauseCircleIcon, TrashIcon } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SecuritySettingsScreen() {
  const { t } = useTranslation('settings');
  const { isDark } = useAppTheme();
  return <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
    <SettingsHeader title={t('passwordSecurity')} />
    <SettingsSection title={t('loginSecurity')}>
      <SettingsRow icon={<KeyIcon size={22} color={isDark ? '#FAF9F6' : '#111'} />} title={t('resetPassword')} subtitle={t('resetPasswordSubtitle')} onPress={() => router.push('/settings/reset-password')} />
    </SettingsSection>
    <SettingsSection title={t('accountManagement')}>
      <SettingsRow icon={<PauseCircleIcon size={22} color={isDark ? '#FAF9F6' : '#111'} weight="fill" />} title={t('deactivateAccount')} subtitle={t('deactivateAccountSubtitle')} onPress={() => router.push('/settings/deactivate-account')} />
      <SettingsRow destructive icon={<TrashIcon size={22} color="#EF4444" />} title={t('deleteAccount')} subtitle={t('deleteAccountSubtitle')} onPress={() => router.push('/settings/delete-account')} />
    </SettingsSection>
  </SafeAreaView>;
}
