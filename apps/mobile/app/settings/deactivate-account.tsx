import Text from '@/components/common/AppText';
import AppButton from '@/components/common/buttons/AppButton';
import TextInput from '@/components/common/inputs/AppTextInput';
import KeyboardAwareFormScrollView from '@/components/common/layout/KeyboardAwareFormScrollView';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { getErrorMessage } from '@findeat/utils';
import { PauseCircleIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSettingsDirection from '@/components/settings/useSettingsDirection';

export default function DeactivateAccountScreen() {
  const { t } = useTranslation('settings');
  const { isDark } = useAppTheme();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState('');
  const { rowStyle, textStyle } = useSettingsDirection();

  async function deactivateAccount() {
    if (!password || deactivating) return;
    setDeactivating(true);
    setError('');

    try {
      await api.auth.deactivateAccount(password);
      await logout();
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('deactivateAccountError')));
      setDeactivating(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FBFAF8' }}>
      <SettingsHeader title={t('deactivateAccount')} />
      <KeyboardAwareFormScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        bottomOffset={28}
      >
          <View className="items-center rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <PauseCircleIcon size={34} color="#D97706" weight="fill" />
            </View>
            <Text weight="bold" className="mt-4 text-center text-2xl text-amber-800 dark:text-amber-300">
              {t('takeABreak')}
            </Text>
            <Text className="mt-2 text-center leading-5 text-amber-800 dark:text-amber-200">
              {t('deactivateAccountBody')}
            </Text>
          </View>

          <View className="mt-6 rounded-3xl border border-line bg-white p-5 dark:border-gray-800 dark:bg-[#111]">
            <Text weight="bold" className="text-lg text-black dark:text-white" style={textStyle}>
              {t('whileDeactivated')}
            </Text>
            {['deactivateHidden', 'deactivateKeepsData', 'deactivateReturn'].map((key) => (
              <View key={key} className="mt-3 flex-row items-start" style={rowStyle}>
                <Text className="text-amber-600" style={{ marginEnd: 8 }}>•</Text>
                <Text className="flex-1 leading-5 text-gray-600 dark:text-gray-300" style={textStyle}>
                  {t(key)}
                </Text>
              </View>
            ))}
          </View>

          <Text weight="bold" className="mb-2 mt-7 text-black dark:text-white" style={textStyle}>
            {t('currentPassword')}
          </Text>
          <TextInput
            isPassword
            value={password}
            onChangeText={setPassword}
            placeholder={t('currentPasswordPlaceholder')}
            autoCapitalize="none"
          />

          {error ? (
            <View className="mt-4 rounded-2xl bg-red-50 p-4 dark:bg-red-950/30">
              <Text className="text-red-600 dark:text-red-400" style={textStyle}>{error}</Text>
            </View>
          ) : null}

          <AppButton
            title={deactivating ? t('deactivatingAccount') : t('deactivateAccountAction')}
            loading={deactivating}
            disabled={!password || deactivating}
            onPress={() => void deactivateAccount()}
            className="mt-6"
          />
      </KeyboardAwareFormScrollView>
    </SafeAreaView>
  );
}
