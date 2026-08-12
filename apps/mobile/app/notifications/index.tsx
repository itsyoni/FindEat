import NotificationRow from '@/components/notifications/NotificationRow';
import Text from '@/components/common/AppText';
import { SkeletonList } from '@/components/common';
import { notificationHref } from '@/components/notifications/notificationHelpers';
import { useAppTheme } from '@/contexts/ThemeContext';
import {
  notificationUnreadQueryKey,
  notificationsQueryKey,
  useNotifications,
} from '@/hooks/useNotifications';
import { api } from '@/lib/api';
import type {
  AppNotification,
  NotificationsPage,
  UserRelationship,
} from '@findeat/types';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BellIcon } from 'phosphor-react-native';
import DirectionalIcon from '@/components/common/icons/DirectionalIcon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getNextRelationshipAfterToggle,
  isFollowingRelationship,
  shouldRemoveFollowRelationship,
} from '@findeat/utils';
import { useAuth } from '@/contexts/AuthContext';

type NotificationAction = {
  label?: string;
  active: boolean;
  isPost: boolean;
  preview?: AppNotification['postPreview'];
  run: () => void;
  disabled?: boolean;
  secondaryLabel?: string;
  runSecondary?: () => void;
};

export default function NotificationsScreen() {
  const { t } = useTranslation('notifications');
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [relationshipOverrides, setRelationshipOverrides] = useState<
    Record<string, UserRelationship>
  >({});
  const [joinedReviewIds, setJoinedReviewIds] = useState<Set<string>>(
    () => new Set(),
  );
  const hasUnreadRef = useRef(false);
  const notifications = useNotifications();
  const items = useMemo(
    () => notifications.data?.pages.flatMap((page) => page.items) ?? [],
    [notifications.data],
  );

  const hasUnread = items.some((item) => !item.readAt);

  useEffect(() => {
    hasUnreadRef.current = hasUnread;
  }, [hasUnread]);

  useEffect(() => {
    return () => {
      if (!hasUnreadRef.current) return;

      void api.notifications.markAllRead().catch((error) =>
        console.error('mark notifications read failed', error),
      );
      queryClient.setQueryData(notificationUnreadQueryKey, { count: 0 });
      queryClient.setQueriesData(
        { queryKey: notificationsQueryKey, exact: true },
        (current: InfiniteData<NotificationsPage> | undefined) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) => ({
                    ...item,
                    readAt: item.readAt ?? new Date().toISOString(),
                  })),
                })),
              }
            : current,
      );
    };
  }, [queryClient]);

  function openActor(item: AppNotification) {
    if (item.type === 'PLACE_LIST_INVITE' || item.placeListId) {
      const href = notificationHref(item);
      if (href) router.push(href);
      return;
    }
    if (item.actorId) {
      router.push({ pathname: '/(users)/[id]', params: { id: item.actorId } });
      return;
    }

    const href = notificationHref(item);
    if (href) router.push(href);
  }

  async function toggleFollow(item: AppNotification) {
    if (!item.actorId) return;

    const current =
      relationshipOverrides[item.actorId] ?? item.actorRelationship ?? 'NONE';
    const wasFollowing = shouldRemoveFollowRelationship(current);
    const optimisticRelationship = getNextRelationshipAfterToggle(current);
    setRelationshipOverrides((values) => ({
      ...values,
      [item.actorId!]: optimisticRelationship,
    }));

    try {
      const result = await api.users.toggleFollow(item.actorId, wasFollowing);
      setRelationshipOverrides((values) => ({
        ...values,
        [item.actorId!]: result.relationship,
      }));
    } catch (error) {
      console.error('notification follow action failed', error);
      setRelationshipOverrides((values) => ({
        ...values,
        [item.actorId!]: current,
      }));
    }
  }

  function notificationAction(item: AppNotification): NotificationAction | null {
    if (item.type === 'REVIEW_INVITE' && item.postId) {
      const postId = item.postId;
      const joined =
        item.reviewInvitationStatus === 'JOINED' || joinedReviewIds.has(postId);
      return {
        label: t(joined ? 'joinedReview' : 'joinReview'),
        active: joined,
        disabled: joined,
        isPost: false,
        preview: undefined,
        run: () => {
          if (joined) return;
          void api.posts.joinReview(postId).then(async () => {
            setJoinedReviewIds((current) => new Set(current).add(postId));
            await notifications.refetch();
            router.push({
              pathname: '/posts/contribute/[id]',
              params: { id: postId },
            });
          });
        },
      };
    }

    if (item.type === 'REVIEW_JOIN_REQUEST' && item.postId && item.actorId) {
      const postId = item.postId;
      const requesterId = item.actorId;
      return {
        label: t('approve'),
        secondaryLabel: t('decline'),
        active: false,
        isPost: false,
        preview: undefined,
        run: () => {
          void api.posts
            .approveReviewJoinRequest(postId, requesterId)
            .then(async () => {
              await Promise.all([
                notifications.refetch(),
                queryClient.invalidateQueries({ queryKey: ['feed'] }),
              ]);
            })
            .catch((error) =>
              console.error('review join request approval failed', error),
            );
        },
        runSecondary: () => {
          void api.posts
            .declineReviewJoinRequest(postId, requesterId)
            .then(() => notifications.refetch())
            .catch((error) =>
              console.error('review join request decline failed', error),
            );
        },
      };
    }

    if (item.type === 'FOLLOW_REQUEST' && item.actorId) {
      return {
        label: t('confirm'),
        active: false,
        isPost: false,
        preview: undefined,
        run: () => {
          void api.users.approveFollowRequest(item.actorId!).then(async () => {
            await Promise.all([notifications.refetch(), refreshUser()]);
          });
        },
      };
    }

    const isFollowNotification = ['FOLLOW', 'FOLLOW_BACK', 'FRIEND', 'FOLLOW_REQUEST_ACCEPTED'].includes(item.type);

    if (isFollowNotification && item.actorId) {
      const relationship =
        relationshipOverrides[item.actorId] ?? item.actorRelationship ?? 'NONE';
      const following = isFollowingRelationship(relationship);
      return {
        label:
          relationship === 'FRIENDS'
            ? t('friends')
            : relationship === 'FOLLOWING'
              ? t('following')
              : relationship === 'FOLLOWED_BY'
                ? t('followBack')
                : relationship === 'REQUESTED'
                  ? t('requested')
                : t('follow'),
        active: following,
        isPost: false,
        preview: undefined,
        run: () => void toggleFollow(item),
      };
    }

    if (item.postId) {
      return {
        label: undefined,
        active: true,
        isPost: true,
        preview: item.postPreview,
        run: () =>
          router.push({
            pathname: '/(posts)/[id]',
            params: {
              id: item.postId!,
              ...(item.commentId ? { commentId: item.commentId } : {}),
            },
          }),
      };
    }

    if (item.type === 'MESSAGE_MENTION' && item.conversationId) {
      return {
        label: t('openChat'),
        active: false,
        isPost: false,
        preview: undefined,
        run: () => router.push(`/chats/${item.conversationId}`),
      };
    }

    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0B0A' : '#FBFAF8' }}>
      <View className="h-14 flex-row items-center border-b border-line bg-surface px-4 dark:border-gray-800 dark:bg-black">
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} className="p-2">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? '#FAF9F6' : '#171717'} />
        </TouchableOpacity>
        <Text className="ml-2 flex-1 text-xl font-bold text-black dark:text-white">{t('title')}</Text>
      </View>

      {notifications.isPending ? (
        <SkeletonList variant="notifications" count={7} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const action = notificationAction(item);

            return (
              <NotificationRow
                item={item}
                onPress={() => openActor(item)}
                onAction={action?.run}
                actionLabel={action?.label}
                actionActive={action?.active}
                actionDisabled={action?.disabled}
                secondaryActionLabel={action?.secondaryLabel}
                onSecondaryAction={action?.runSecondary}
                isPostAction={action?.isPost}
                postPreview={action?.preview}
              />
            );
          }}
          onEndReached={() => {
            if (notifications.hasNextPage && !notifications.isFetchingNextPage) {
              void notifications.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          refreshing={notifications.isRefetching && !notifications.isFetchingNextPage}
          onRefresh={() => void notifications.refetch()}
          ListFooterComponent={notifications.isFetchingNextPage ? <ActivityIndicator className="my-5" /> : null}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-10 pt-40">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                <BellIcon size={30} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-black dark:text-white">{t('emptyTitle')}</Text>
              <Text className="mt-1 text-center text-gray-500">{t('emptyBody')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
