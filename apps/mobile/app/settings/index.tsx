import { AppAlert as Alert } from "@/lib/appAlert";
import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsSection from '@/components/settings/SettingsSection';
import Text from '@/components/common/AppText';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { ArchiveIcon, BellIcon, BookmarkSimpleIcon, ChartLineUpIcon, DeviceMobileIcon, FileTextIcon, ForkKnifeIcon, HeadsetIcon, LockKeyIcon, MoonIcon, PersonArmsSpreadIcon, ShieldCheckIcon, SignOutIcon, SparkleIcon, TagIcon, TrophyIcon } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { t } = useTranslation(['settings', 'common', 'profile']);
  const { isDark } = useAppTheme();
  const { logout } = useAuth();
  const [hasNewProfileTags, setHasNewProfileTags] = useState(false);
  const color = isDark ? '#FAF9F6' : '#111';

  useFocusEffect(useCallback(() => {
    let active = true;
    void api.profileTags.status()
      .then((status) => {
        if (active) setHasNewProfileTags(status.hasUnseen);
      })
      .catch((error) => console.error('Could not load profile tag status', error));
    return () => { active = false; };
  }, []));

  function confirmLogout() {
    Alert.alert(t('common:logout'), t('profile:logoutConfirmation'), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('common:logout'), style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
      <SettingsHeader title={t('settings:title')} />
      <ScrollView>
        <SettingsSection title={t('settings:yourAccount')}>
          <SettingsRow icon={<LockKeyIcon size={23} color={color} />} title={t('settings:passwordSecurity')} subtitle={t('settings:passwordSecuritySubtitle')} onPress={() => router.push('/settings/security')} />
          <SettingsRow icon={<ArchiveIcon size={23} color={color} weight="fill" />} title={t('settings:archivedPosts')} subtitle={t('settings:archivedPostsSubtitle')} onPress={() => router.push('/settings/archived-posts')} />
          <SettingsRow icon={<BookmarkSimpleIcon size={23} color="#D1A928" weight="fill" />} title={t('settings:savedPosts')} subtitle={t('settings:savedPostsSubtitle')} onPress={() => router.push({ pathname: '/saved', params: { tab: 'posts' } })} />
          <SettingsRow icon={<ForkKnifeIcon size={23} color="#E11D48" weight="fill" />} title={t('settings:favoriteDishes')} subtitle={t('settings:favoriteDishesSubtitle')} onPress={() => router.push('/settings/favorite-dishes')} />
          <SettingsRow icon={<ChartLineUpIcon size={23} color={color} weight="bold" />} title={t('profile:creatorInsights')} subtitle={t('profile:creatorInsightsSubtitle')} onPress={() => router.push('/(profile)/statistics')} />
          <SettingsRow icon={<TrophyIcon size={23} color="#D97706" weight="fill" />} title={t('settings:creatorLevels')} subtitle={t('settings:creatorLevelsSubtitle')} onPress={() => router.push('/settings/creator-levels')} />
          <SettingsRow icon={<TagIcon size={23} color="#D97706" weight="fill" />} title={t('settings:profileTagCollection')} subtitle={t('settings:profileTagCollectionSubtitle')} value={hasNewProfileTags ? t('settings:newTag') : undefined} valueEmphasis={hasNewProfileTags} onPress={() => router.push('/settings/profile-tags')} />
        </SettingsSection>
        <SettingsSection title={t('settings:howYouUseFindEat')}>
          <SettingsRow icon={<BellIcon size={23} color={color} />} title={t('settings:notifications')} subtitle={t('settings:notificationsSubtitle')} onPress={() => router.push('/settings/notifications')} />
          <SettingsRow icon={<DeviceMobileIcon size={23} color={color} />} title={t('settings:appPermissions')} subtitle={t('settings:appPermissionsSubtitle')} onPress={() => router.push('/settings/permissions')} />
          <SettingsRow icon={<PersonArmsSpreadIcon size={23} color={color} weight="fill" />} title={t('settings:accessibility')} subtitle={t('settings:accessibilitySubtitle')} onPress={() => router.push('/settings/accessibility')} />
          <SettingsRow icon={<ShieldCheckIcon size={23} color={color} />} title={t('settings:privacy')} subtitle={t('settings:privacySubtitle')} onPress={() => router.push('/settings/privacy')} />
          <SettingsRow icon={<MoonIcon size={23} color={color} />} title={t('settings:appearanceLanguage')} subtitle={t('settings:appearanceLanguageSubtitle')} onPress={() => router.push('/settings/appearance')} />
        </SettingsSection>
        <SettingsSection title={t('settings:helpSupportSection')}>
          <SettingsRow icon={<HeadsetIcon size={23} color={color} />} title={t('settings:helpSupport')} subtitle={t('settings:helpSupportSubtitle')} onPress={() => router.push('/settings/help-support')} />
          <SettingsRow icon={<SparkleIcon size={23} color={color} />} title={t('settings:whatsNew')} subtitle={t('settings:whatsNewSubtitle')} onPress={() => router.push('/settings/whats-new')} />
          <SettingsRow icon={<FileTextIcon size={23} color={color} />} title={t('settings:termsOfService')} subtitle={t('settings:termsOfServiceSubtitle')} onPress={() => router.push('/settings/terms-of-service')} />
          <SettingsRow icon={<ShieldCheckIcon size={23} color={color} weight="fill" />} title={t('settings:privacyPolicy')} subtitle={t('settings:privacyPolicySubtitle')} onPress={() => router.push('/settings/privacy-policy')} />
        </SettingsSection>
        <SettingsSection title={t('settings:login')}>
          <SettingsRow destructive icon={<SignOutIcon size={23} color="#EF4444" />} title={t('common:logout')} onPress={confirmLogout} />
        </SettingsSection>
        <Text className="pb-8 pt-2 text-center text-xs text-gray-400">
          {t('settings:appVersion', { version: Constants.expoConfig?.version ?? '—' })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
