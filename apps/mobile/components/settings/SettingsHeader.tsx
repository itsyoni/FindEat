import Text from '@/components/common/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import DirectionalIcon from '@/components/common/icons/DirectionalIcon';
import useSettingsDirection from '@/components/settings/useSettingsDirection';
import { useTranslation } from 'react-i18next';

export default function SettingsHeader({ title }: { title: string }) {
  const { isDark } = useAppTheme();
  const { t } = useTranslation('settings');
  const { rowStyle, textStyle } = useSettingsDirection();

  return (
    <View
      className="min-h-14 flex-row items-center border-b border-line bg-surface px-4 py-2 dark:border-gray-800 dark:bg-black"
      style={rowStyle}
    >
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => router.back()} hitSlop={12} className="min-h-11 min-w-11 items-center justify-center p-2">
        <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? '#FAF9F6' : '#171717'} />
      </TouchableOpacity>
      <Text
        weight="bold"
        className="flex-1 text-xl text-ink dark:text-white"
        style={[textStyle, { marginStart: 8 }]}
      >
        {title}
      </Text>
    </View>
  );
}
