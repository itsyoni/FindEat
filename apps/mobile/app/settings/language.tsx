import { AppAlert as Alert } from "@/lib/appAlert";
import Text from '@/components/common/AppText';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { applyAppLanguage, isRtlLanguage, type AppLanguage } from '@/lib/appLanguage';
import { CheckIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const languages = [
  { code: 'en' as const, flag: '🇺🇸', label: 'English', nativeLabel: 'English' },
  { code: 'he' as const, flag: '🇮🇱', label: 'Hebrew', nativeLabel: 'עברית' },
  { code: 'ru' as const, flag: '🇷🇺', label: 'Russian', nativeLabel: 'Русский' },
];

export default function LanguageSettingsScreen() {
  const { t, i18n } = useTranslation('settings');
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [switchingTo, setSwitchingTo] = useState<AppLanguage | null>(null);
  const active: AppLanguage = i18n.language.startsWith('he')
    ? 'he'
    : i18n.language.startsWith('ru')
      ? 'ru'
      : 'en';
  const isRtl = active === 'he';
  const labelDirectionStyle = {
    alignSelf: 'stretch' as const,
    textAlign: 'auto' as const,
    writingDirection: isRtl ? ('rtl' as const) : ('ltr' as const),
  };

  function selectLanguage(language: AppLanguage) {
    if (language === active || switchingTo) return;
    if (isRtlLanguage(active) === isRtlLanguage(language)) {
      void changeLanguage(language);
      return;
    }
    Alert.alert(
      t('common:languageRestartTitle'),
      t('common:languageRestartDescription'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:restartAndChange'),
          onPress: () => void changeLanguage(language),
        },
      ],
    );
  }

  async function changeLanguage(language: AppLanguage) {
    try {
      setSwitchingTo(language);
      await api.users.updateMe({ language: language.toUpperCase() as 'EN' | 'HE' | 'RU' });
      await applyAppLanguage(language);
    } catch {
      setSwitchingTo(null);
      showToast(t('languageChangeError'), { kind: 'error' });
    }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
    <SettingsHeader title={t('chooseLanguage')} />
    <View className="pt-3">
      {languages.map((language) => (
        <TouchableOpacity
          disabled={!!switchingTo}
          key={language.code}
          onPress={() => selectLanguage(language.code)}
          className="flex-row items-center px-5 py-4"
          style={{ direction: isRtl ? 'rtl' : 'ltr' }}
        >
          <Text className="text-3xl" style={{ marginEnd: 16 }}>
            {language.flag}
          </Text>
          <View
            className="flex-1"
            style={{ alignItems: isRtl ? 'flex-end' : 'flex-start' }}
          >
            <Text
              className="text-base text-black dark:text-white"
              style={labelDirectionStyle}
            >
              {language.nativeLabel}
            </Text>
            {language.label !== language.nativeLabel ? (
              <Text
                className="mt-0.5 text-sm text-gray-500"
                style={labelDirectionStyle}
              >
                {language.label}
              </Text>
            ) : null}
          </View>
          {switchingTo === language.code ? <ActivityIndicator color="#3B82F6" /> : active === language.code ? <CheckIcon size={22} color="#3B82F6" weight="bold" /> : null}
        </TouchableOpacity>
      ))}
    </View>
  </SafeAreaView>;
}
