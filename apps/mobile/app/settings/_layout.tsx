import { Stack } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Platform } from 'react-native';

export default function SettingsLayout() {
  const { isDark } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8',
        },
        animation: Platform.OS === 'android' ? 'none' : 'default',
        animationMatchesGesture: Platform.OS !== 'android',
      }}
    />
  );
}
