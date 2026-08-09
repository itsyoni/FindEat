import Avatar from '@/components/common/Avatar';
import Text from '@/components/common/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { AppNotification } from '@findeat/types';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SlideInUp,
  SlideOutUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { notificationText } from './notificationHelpers';

type Props = { item: AppNotification; onPress: () => void; onDismiss: () => void };

export default function NotificationPopup({ item, onPress, onDismiss }: Props) {
  const { t } = useTranslation('notifications');
  const { isDark } = useAppTheme();
  const fallbackType = !item.actor && item.restaurantId ? 'restaurant' : 'user';
  const translateY = useSharedValue(0);
  const swipeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.get() }],
    };
  });
  const dismissGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      translateY.set(Math.min(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY < -34 || event.velocityY < -450) {
        translateY.set(
          withTiming(-160, { duration: 150 }, (finished) => {
            if (finished) runOnJS(onDismiss)();
          }),
        );
        return;
      }
      translateY.set(withSpring(0, { damping: 18, stiffness: 240 }));
    });

  return (
    <GestureDetector gesture={dismissGesture}>
      <Animated.View
        entering={SlideInUp.duration(220)}
        exiting={SlideOutUp.duration(180)}
        className="absolute left-4 right-4 top-3 z-50 overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700"
        style={[
          { backgroundColor: isDark ? '#171717' : '#FAF9F6' },
          swipeStyle,
        ]}
      >
        <Pressable onPress={onPress} className="flex-row items-center p-4">
          <Avatar
            uri={item.actor?.avatarUrl ?? item.actor?.avatarThumbnailUrl}
            username={item.actor?.username}
            userId={item.actor?.id}
            fallbackType={fallbackType}
            size={44}
          />
          <View className="ml-3 flex-1">
            <Text className="text-xs font-semibold uppercase text-gray-400">{t('new')}</Text>
            <Text className="text-[15px] text-black dark:text-white" numberOfLines={2}>
              {notificationText(item, t)}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
