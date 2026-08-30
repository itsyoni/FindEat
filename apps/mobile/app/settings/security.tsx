import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsSection from '@/components/settings/SettingsSection';
import { AppAlert as Alert } from '@/lib/appAlert';
import { api } from '@/lib/api';
import { requestAppleAuth } from '@/lib/appleAuth';
import { isGoogleAuthConfigured, loadGoogleAuthModule, requestGoogleAuth } from '@/lib/googleAuth';
import { useAppTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { AppleLogoIcon, GoogleLogoIcon, KeyIcon, PauseCircleIcon, TrashIcon } from 'phosphor-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@findeat/utils';
import type { SocialAuthInput, SocialAuthProvider } from '@findeat/types';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SecuritySettingsScreen() {
  const { t } = useTranslation('settings');
  const { isDark } = useAppTheme();
  const { user, refreshUser } = useAuth();
  const [workingProvider, setWorkingProvider] = useState<SocialAuthProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');
  const hasPassword = user?.authMethods?.hasPassword !== false;
  const appleConnected = user?.authMethods?.providers.includes('APPLE') ?? false;
  const googleConnected = user?.authMethods?.providers.includes('GOOGLE') ?? false;
  const iconColor = isDark ? '#FAF9F6' : '#111';

  useEffect(() => {
    void loadGoogleAuthModule().catch(() => undefined);
    if (Platform.OS === 'ios') {
      void AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }
  }, []);

  async function linkProvider(provider: SocialAuthProvider) {
    if (workingProvider) return;
    if (provider === 'GOOGLE' && !isGoogleAuthConfigured()) {
      Alert.alert(t('providerLinkErrorTitle'), t('googleLinkNotConfigured'));
      return;
    }

    try {
      setWorkingProvider(provider);
      const payload: SocialAuthInput | null = provider === 'APPLE'
        ? await requestAppleAuth()
        : await requestGoogleAuth();
      if (!payload) return;
      await api.auth.linkProvider(payload);
      await refreshUser();
      Alert.alert(
        t('providerConnectedTitle'),
        t('providerConnectedBody', { provider: provider === 'APPLE' ? 'Apple' : 'Google' }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(
        t('providerLinkErrorTitle'),
        getErrorMessage(error, t('providerLinkError')),
      );
    } finally {
      setWorkingProvider(null);
    }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
    <SettingsHeader title={t('passwordSecurity')} />
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <SettingsSection title={t('loginSecurity')}>
        <SettingsRow icon={<KeyIcon size={22} color={iconColor} />} title={hasPassword ? t('resetPassword') : t('setPassword')} subtitle={hasPassword ? t('resetPasswordSubtitle') : t('setPasswordSubtitle')} onPress={() => router.push('/settings/reset-password')} />
        {appleConnected || appleAvailable ? (
          <SettingsRow
            icon={<AppleLogoIcon size={22} color={iconColor} weight="fill" />}
            title={appleConnected ? t('appleConnected') : t('connectApple')}
            subtitle={appleConnected ? t('appleConnectedSubtitle') : t('connectAppleSubtitle')}
            value={workingProvider === 'APPLE' ? t('connecting') : appleConnected ? t('connected') : undefined}
            valueEmphasis={appleConnected}
            disabled={appleConnected || workingProvider !== null}
            showChevron={!appleConnected}
            onPress={() => void linkProvider('APPLE')}
          />
        ) : null}
        <SettingsRow
          icon={<GoogleLogoIcon size={22} color={iconColor} weight="bold" />}
          title={googleConnected ? t('googleConnected') : t('connectGoogle')}
          subtitle={googleConnected ? t('googleConnectedSubtitle') : t('connectGoogleSubtitle')}
          value={workingProvider === 'GOOGLE' ? t('connecting') : googleConnected ? t('connected') : undefined}
          valueEmphasis={googleConnected}
          disabled={googleConnected || workingProvider !== null}
          showChevron={!googleConnected}
          onPress={() => void linkProvider('GOOGLE')}
        />
      </SettingsSection>
      <SettingsSection title={t('accountManagement')}>
        <SettingsRow icon={<PauseCircleIcon size={22} color={iconColor} weight="fill" />} title={t('deactivateAccount')} subtitle={t('deactivateAccountSubtitle')} onPress={() => router.push('/settings/deactivate-account')} />
        <SettingsRow destructive icon={<TrashIcon size={22} color="#EF4444" />} title={t('deleteAccount')} subtitle={t('deleteAccountSubtitle')} onPress={() => router.push('/settings/delete-account')} />
      </SettingsSection>
    </ScrollView>
  </SafeAreaView>;
}
