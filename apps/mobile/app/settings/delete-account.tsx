import Text from '@/components/common/AppText';
import AppButton from '@/components/common/buttons/AppButton';
import TextInput from '@/components/common/inputs/AppTextInput';
import KeyboardAwareFormScrollView from '@/components/common/layout/KeyboardAwareFormScrollView';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { getErrorMessage } from '@findeat/utils';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WarningCircleIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import useSettingsDirection from '@/components/settings/useSettingsDirection';
import { requestAppleAuth } from '@/lib/appleAuth';

export default function DeleteAccountScreen() {
  const { t } = useTranslation('settings');
  const { isDark } = useAppTheme();
  const { logout, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const useApple = user?.authMethods?.providers.includes('APPLE') ?? false;
  const canDelete = (useApple || password.length > 0) && confirmation === 'DELETE' && !deleting;
  const { rowStyle, textStyle } = useSettingsDirection();

  async function deleteAccount() {
    if (!canDelete) return;
    setDeleting(true);
    setError('');
    try {
      const credential = useApple
        ? await requestAppleAuth()
        : { password };
      await api.auth.deleteAccount(credential, confirmation);
      await logout();
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('deleteAccountError')));
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
      <SettingsHeader title={t('deleteAccount')} />
      <KeyboardAwareFormScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        bottomOffset={28}
      >
          <View className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
            <Text weight="bold" className="text-lg text-amber-900 dark:text-amber-200" style={textStyle}>
              {t('preferDeactivationTitle')}
            </Text>
            <Text className="mb-4 mt-1 leading-5 text-amber-800 dark:text-amber-300" style={textStyle}>
              {t('preferDeactivationBody')}
            </Text>
            <AppButton
              title={t('deactivateInstead')}
              variant="outline"
              onPress={() => router.replace('/settings/deactivate-account')}
            />
          </View>

          <View className="items-center rounded-3xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <WarningCircleIcon size={34} color="#EF4444" weight="fill" />
            </View>
            <Text weight="bold" className="mt-4 text-center text-2xl text-red-600 dark:text-red-400">
              {t('deleteAccountWarningTitle')}
            </Text>
            <Text className="mt-2 text-center leading-5 text-red-700 dark:text-red-300">
              {t('deleteAccountWarningBody')}
            </Text>
          </View>

          <View className="mt-6 rounded-3xl border border-line bg-white p-5 dark:border-gray-800 dark:bg-[#111]">
            <Text weight="bold" className="text-lg text-black dark:text-white" style={textStyle}>{t('whatWillBeDeleted')}</Text>
            {['deletePostsReviews', 'deleteSocialData', 'deleteProfileMedia', 'deleteRestaurantAccess'].map((key) => (
              <View key={key} className="mt-3 flex-row items-start" style={rowStyle}>
                <Text className="text-red-500" style={{ marginEnd: 8 }}>•</Text>
                <Text className="flex-1 leading-5 text-gray-600 dark:text-gray-300" style={textStyle}>{t(key)}</Text>
              </View>
            ))}
          </View>

          {useApple ? (
            <Text className="mt-7 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('appleDeleteConfirmation')}
            </Text>
          ) : (
            <>
              <Text weight="bold" className="mb-2 mt-7 text-black dark:text-white" style={textStyle}>{t('currentPassword')}</Text>
              <TextInput isPassword value={password} onChangeText={setPassword} placeholder={t('currentPasswordPlaceholder')} autoCapitalize="none" />
            </>
          )}

          <Text weight="bold" className="mb-2 mt-5 text-black dark:text-white" style={textStyle}>{t('confirmAccountDeletion')}</Text>
          <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400" style={textStyle}>
            {t('typeDeleteToConfirm')}
          </Text>
          <TextInput
            value={confirmation}
            onChangeText={(value) => setConfirmation(value.toUpperCase())}
            placeholder="DELETE"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {error ? (
            <View className="mt-4 rounded-2xl bg-red-50 p-4 dark:bg-red-950/30">
              <Text className="text-red-600 dark:text-red-400" style={textStyle}>{error}</Text>
            </View>
          ) : null}

          <AppButton
            title={deleting ? t('deletingAccount') : useApple ? t('continueWithAppleToDelete') : t('deleteAccountPermanently')}
            variant="danger"
            loading={deleting}
            disabled={!canDelete}
            onPress={() => void deleteAccount()}
            className="mt-6"
          />
          <Text className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('deleteAccountFinalNotice')}
          </Text>
      </KeyboardAwareFormScrollView>
    </SafeAreaView>
  );
}
