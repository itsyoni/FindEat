import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import KeyboardAwareFormScrollView from '@/components/common/layout/KeyboardAwareFormScrollView';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordSettingsScreen() {
  const { t } = useTranslation('settings');
  const { isDark } = useAppTheme();
  const { user } = useAuth();
  return <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
    <SettingsHeader title={t('resetPassword')} />
    <KeyboardAwareFormScrollView bottomOffset={28}>
      <View className="p-6">
        <ForgotPasswordForm initialEmail={user?.email ?? ''} useBottomSheetInput={false} onBack={() => router.back()} />
      </View>
    </KeyboardAwareFormScrollView>
  </SafeAreaView>;
}
