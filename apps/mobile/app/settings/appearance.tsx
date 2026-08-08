import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsSection from '@/components/settings/SettingsSection';
import { useAppTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { MoonIcon, TranslateIcon } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppearanceSettingsScreen() {
  const { t, i18n } = useTranslation('settings');
  const { isDark, preference } = useAppTheme();
  const color = isDark ? '#FAF9F6' : '#111';
  const themeLabel = preference === 'dark' ? t('darkTheme') : preference === 'light' ? t('lightTheme') : t('systemTheme');

  return <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
    <SettingsHeader title={t('appearanceLanguage')} />
    <SettingsSection title={t('preferences')}>
      <SettingsRow icon={<TranslateIcon size={22} color={color} />} title={t('language')} value={i18n.language.startsWith('he') ? t('hebrew') : t('english')} onPress={() => router.push('/settings/language')} />
      <SettingsRow icon={<MoonIcon size={22} color={color} />} title={t('theme')} value={themeLabel} onPress={() => router.push('/settings/theme')} />
    </SettingsSection>
  </SafeAreaView>;
}
