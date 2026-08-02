import Avatar from '@/components/common/Avatar';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { AppNotification } from '@findeat/types';
import { BellIcon, XIcon } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { notificationText } from './notificationHelpers';

type Props = { item: AppNotification; onPress: () => void; onDismiss: () => void };

export default function NotificationPopup({ item, onPress, onDismiss }: Props) {
  const { t } = useTranslation('notifications');
  const { isDark } = useAppTheme();

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutUp.duration(180)}
      className="absolute left-4 right-4 top-3 z-50 overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700"
      style={{ backgroundColor: isDark ? '#171717' : '#FFF' }}
    >
      <Pressable onPress={onPress} className="flex-row items-center p-4">
        {item.actor?.avatarUrl ? (
          <Avatar
            uri={item.actor.avatarUrl}
            username={item.actor.username}
            userId={item.actor.id}
            size={44}
          />
        ) : (
          <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <BellIcon size={22} color={isDark ? '#FFF' : '#FF5B35'} />
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="text-xs font-semibold uppercase text-gray-400">{t('new')}</Text>
          <Text className="text-[15px] text-black dark:text-white" numberOfLines={2}>
            {notificationText(item, t)}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={12} className="p-1">
          <XIcon size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}
