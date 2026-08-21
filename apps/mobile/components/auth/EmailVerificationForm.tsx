import { AppAlert as Alert } from "@/lib/appAlert";
import Text from '@/components/common/AppText';
import { TextInput } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getErrorMessage } from '@findeat/utils';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import AuthFormHeader from './AuthFormHeader';

type Props = {
  email: string;
  onBack: () => void;
  useBottomSheetInput?: boolean;
};

export default function EmailVerificationForm({
  email,
  onBack,
  useBottomSheetInput = true,
}: Props) {
  const { t } = useTranslation('auth');
  const { verifyEmail } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setLoading(true);
      await verifyEmail(email, code);
    } catch (error) {
      Alert.alert(t('verificationFailed'), getErrorMessage(error, t('invalidCode')));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await api.auth.resendVerification(email);
      Alert.alert(t('codeSent'), t('checkInbox'));
    } catch (error) {
      Alert.alert(t('common:error'), getErrorMessage(error, t('resendFailed')));
    }
  }

  return (
    <View>
      <AuthFormHeader title={t('verifyEmail')} subtitle={t('verificationSent', { email })} />
      <TextInput
        useBottomSheetInput={useBottomSheetInput}
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        className="border border-[#D8D3CA] bg-[#F1EEE8] text-center text-2xl tracking-[8px] dark:border-gray-600 dark:bg-gray-800"
      />
      <TouchableOpacity disabled={loading || code.length !== 6} onPress={() => void submit()} className="mt-4 rounded-2xl bg-[#212121] py-4 disabled:opacity-40 dark:bg-white">
        <Text weight="bold" className="text-center text-white dark:text-black">{loading ? t('verifying') : t('verify')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => void resend()} className="mt-5"><Text weight="bold" className="text-center text-[#212121] dark:text-white">{t('resendCode')}</Text></TouchableOpacity>
      <TouchableOpacity onPress={onBack} className="mt-4"><Text className="text-center text-gray-500">{t('backToLogin')}</Text></TouchableOpacity>
    </View>
  );
}
