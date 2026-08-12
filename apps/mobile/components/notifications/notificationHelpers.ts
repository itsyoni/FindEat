import type { AppNotification } from '@findeat/types';
import type { Href } from 'expo-router';
import type { TFunction } from 'i18next';
import { userDisplayName } from '@/lib/userIdentity';

export function notificationText(item: AppNotification, t: TFunction) {
  const name = userDisplayName(item.actor) || t('someone');
  if (item.type === 'MESSAGE' && item.body) {
    return `${item.title || name}: ${item.body}`;
  }
  if (
    (item.type === 'POST_LIKE' || item.type === 'COMMENT_LIKE') &&
    (item.aggregationCount ?? 1) > 1
  ) {
    return t(`aggregatedTypes.${item.type}`, {
      name,
      count: (item.aggregationCount ?? 1) - 1,
    });
  }
  return t(`types.${item.type}`, { name, defaultValue: item.title || t('new') });
}

export function notificationHref(item: AppNotification): Href | null {
  if (item.type === 'RESTAURANT_DISPUTE') return '/settings/restaurant-disputes';
  if (item.type === 'MODERATION_ACTION' || item.type === 'APPEAL_DECISION') {
    return '/settings/moderation-actions';
  }
  if (item.type === 'PROFILE_TAG_UNLOCKED') return '/settings/profile-tags';
  if (item.type === 'FOLLOW_REQUEST') return '/settings/follow-requests';
  if (item.type === 'PLACE_LIST_INVITE') return '/saved-lists';
  if (item.placeListId) return `/saved-lists/${item.placeListId}`;
  if (item.conversationId) return `/chats/${item.conversationId}`;
  if (item.postId)
    return {
      pathname: '/(posts)/[id]',
      params: { id: item.postId, ...(item.commentId ? { commentId: item.commentId } : {}) },
    };
  if (item.restaurantId) return `/restaurants/${item.restaurantId}`;
  if (item.actorId) return { pathname: '/(users)/[id]', params: { id: item.actorId } };
  return null;
}

export function relativeNotificationTime(value: string, locale: string) {
  const elapsedSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );
  const isHebrew = locale.toLowerCase().startsWith('he');

  if (elapsedSeconds < 45) return isHebrew ? 'עכשיו' : 'now';

  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return isHebrew ? `לפני ${minutes} דק׳` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isHebrew ? `לפני ${hours} שע׳` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return isHebrew ? `לפני ${days} ימים` : `${days}d ago`;
}
