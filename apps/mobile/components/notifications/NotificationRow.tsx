import Avatar from '@/components/common/Avatar';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { AppNotification } from '@findeat/types';
import { useTranslation } from 'react-i18next';
import { GestureResponderEvent, Text, TouchableOpacity, View } from 'react-native';
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { ImagesSquareIcon } from 'phosphor-react-native';
import ContentVideo from '@/components/posts/content/ContentVideo';
import {
  notificationText,
  relativeNotificationTime,
} from './notificationHelpers';

type Props = {
  item: AppNotification;
  onPress: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionActive?: boolean;
  postPreview?: AppNotification['postPreview'];
  isPostAction?: boolean;
};

export default function NotificationRow({
  item,
  onPress,
  onAction,
  actionLabel,
  actionActive,
  postPreview,
  isPostAction,
}: Props) {
  const { t, i18n } = useTranslation('notifications');
  const { isDark } = useAppTheme();
  const fallbackType = !item.actor && item.restaurantId ? 'restaurant' : 'user';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      className="flex-row items-center px-5 py-3"
      style={{ backgroundColor: item.readAt ? 'transparent' : isDark ? '#172033' : '#F2F7FF' }}
    >
      <Avatar
        uri={item.actor?.avatarThumbnailUrl ?? item.actor?.avatarUrl}
        username={item.actor?.username}
        userId={item.actor?.id}
        fallbackType={fallbackType}
        size={48}
      />
      <View className="ml-3 flex-1">
        <Text className="text-[15px] text-black dark:text-white">
          {notificationText(item, t)}
        </Text>
        {item.body ? (
          <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>
            {item.body}
          </Text>
        ) : null}
        <Text className="mt-1 text-xs text-gray-400">
          {relativeNotificationTime(item.createdAt, i18n.language)}
        </Text>
      </View>

      {onAction && isPostAction ? (
        <TouchableOpacity
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            onAction();
          }}
          className="ml-3 h-17 w-13 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          {postPreview?.imageUrl ? (
            <ProgressiveImage
              source={{ uri: postPreview.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : postPreview?.videoUrl ? (
            <View pointerEvents="none" style={{ width: '100%', height: '100%' }}>
              <ContentVideo
                uri={postPreview.videoUrl}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                nativeControls={false}
                muted
                loop={false}
              />
            </View>
          ) : postPreview?.text ? (
            <View className="h-full w-full items-center justify-center bg-gray-900 px-1.5">
              <Text numberOfLines={3} className="text-center text-[8px] text-white">
                {postPreview.text}
              </Text>
            </View>
          ) : (
            <View className="h-full w-full items-center justify-center">
              <ImagesSquareIcon size={23} color="#9CA3AF" weight="fill" />
            </View>
          )}
          {postPreview?.type === 'REVIEW' && postPreview.rating != null ? (
            <View className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5">
              <Text className="text-[8px] font-bold text-white">
                ★ {postPreview.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : onAction && actionLabel ? (
        <TouchableOpacity
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            onAction();
          }}
          className={`ml-3 min-w-20 items-center rounded-xl px-3 py-2 ${
            actionActive
              ? 'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              : 'bg-black dark:bg-white'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              actionActive
                ? 'text-black dark:text-white'
                : 'text-white dark:text-black'
            }`}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : !item.readAt ? (
        <View className="ml-3 h-2.5 w-2.5 rounded-full bg-blue-500" />
      ) : null}
    </TouchableOpacity>
  );
}
