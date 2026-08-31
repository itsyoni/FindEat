import NotificationPopup from "@/components/notifications/NotificationPopup";
import { notificationHref } from "@/components/notifications/notificationHelpers";
import {
  notificationUnreadQueryKey,
  notificationsQueryKey,
} from "@/hooks/useNotifications";
import { API_URL, api } from "@/lib/api";
import { visitReminderRoute } from "@/lib/visitDetection/routing";
import type { AppNotification, NotificationsPage } from "@findeat/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { router, usePathname, useRootNavigationState } from "expo-router";
import Constants from "expo-constants";
import { SOCKET_CLIENT_METADATA } from "@/lib/socketMetadata";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const relationshipNotificationTypes = new Set<AppNotification["type"]>([
  "FOLLOW",
  "FOLLOW_BACK",
  "FRIEND",
]);

const LEGACY_BACKGROUND_NOTIFICATION_TEST = "BACKGROUND_NOTIFICATION_TEST";

function isLegacyBackgroundNotification(
  request: Notifications.NotificationRequest,
) {
  return request.content.data?.type === LEGACY_BACKGROUND_NOTIFICATION_TEST;
}

async function removeLegacyBackgroundNotifications() {
  const [scheduled, presented] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync(),
    Notifications.getPresentedNotificationsAsync(),
  ]);

  await Promise.all([
    ...scheduled
      .filter(isLegacyBackgroundNotification)
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier),
      ),
    ...presented
      .filter((notification) =>
        isLegacyBackgroundNotification(notification.request),
      )
      .map((notification) =>
        Notifications.dismissNotificationAsync(
          notification.request.identifier,
        ),
      ),
  ]);
}

type CachedPushToken = {
  token: string;
  refreshedAt: number;
};

type PushEnvironment = 'development' | 'preview' | 'production';

function currentPushEnvironment(): PushEnvironment {
  const variant = Constants.expoConfig?.extra?.appVariant;
  if (variant === 'development' || variant === 'preview' || variant === 'production') {
    return variant;
  }

  // Older installed binaries do not contain appVariant in their manifest.
  // Their native identifier still reliably distinguishes each FindEat app.
  const applicationId =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.bundleIdentifier
      : Constants.expoConfig?.android?.package;
  if (applicationId?.endsWith('.dev')) return 'development';
  if (applicationId?.endsWith('.preview')) return 'preview';
  return 'production';
}

function readCachedPushToken(value: string | null): CachedPushToken | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CachedPushToken>;
    return typeof parsed.token === "string" &&
      parsed.token.length > 0 &&
      typeof parsed.refreshedAt === "number"
      ? { token: parsed.token, refreshedAt: parsed.refreshedAt }
      : null;
  } catch {
    return null;
  }
}

function isSameNotification(
  current: AppNotification,
  incoming: AppNotification,
) {
  if (current.id === incoming.id) return true;

  return (
    !!current.actorId &&
    current.actorId === incoming.actorId &&
    relationshipNotificationTypes.has(current.type) &&
    relationshipNotificationTypes.has(incoming.type)
  );
}

function mergeNotification(
  current: InfiniteData<NotificationsPage> | undefined,
  incoming: AppNotification,
): InfiniteData<NotificationsPage> {
  if (!current) {
    return {
      pages: [{ items: [incoming], nextCursor: null }],
      pageParams: [undefined],
    };
  }

  const pages = current.pages.map((page) => ({
    ...page,
    items: page.items.filter((item) => !isSameNotification(item, incoming)),
  }));

  const firstPage = pages[0] ?? { items: [], nextCursor: null };
  pages[0] = {
    ...firstPage,
    items: [incoming, ...firstPage.items],
  };

  return { ...current, pages };
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    const isLocalReminder =
      notificationType === "RESTAURANT_VISIT_REMINDER" ||
      notificationType === "TRIP_PLAN_REMINDER";
    return {
      shouldPlaySound: isLocalReminder,
      shouldSetBadge: true,
      shouldShowBanner: isLocalReminder,
      shouldShowList: isLocalReminder,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

async function hydrateNotificationActor(item: AppNotification) {
  if (item.actor?.avatarThumbnailUrl || item.actor?.avatarUrl || !item.actorId) {
    return item;
  }

  try {
    const actor = await api.users.get(item.actorId);
    return {
      ...item,
      actor: {
        ...item.actor,
        id: actor.id,
        username: actor.username,
        displayName: actor.displayName,
        avatarUrl: actor.avatarUrl,
        avatarThumbnailUrl: actor.avatarThumbnailUrl,
      },
    };
  } catch {
    return item;
  }
}

function openPushData(data?: Record<string, unknown>) {
  if (!data) return;
  const visitRoute = visitReminderRoute(data);
  const conversationId = stringPushValue(data.conversationId);
  const postId = stringPushValue(data.postId);
  const commentId = stringPushValue(data.commentId);
  const restaurantId = stringPushValue(data.restaurantId);
  const placeListId = stringPushValue(data.placeListId);
  const type = stringPushValue(data.type);
  const actorId = stringPushValue(data.actorId);

  if (visitRoute) router.push(visitRoute);
  else if (type === "PROFILE_TAG_UNLOCKED") router.push("/settings/profile-tags");
  else if (type === "CREATOR_LEVEL_UP") router.push("/settings/creator-levels");
  else if (type === "RESTAURANT_MENU_PUBLISHED" && postId)
    router.push({ pathname: "/posts/match-dishes/[id]", params: { id: postId } });
  else if (conversationId) router.push(`/chats/${conversationId}`);
  else if (postId)
    router.push({
      pathname: "/(posts)/[id]",
      params: { id: postId, ...(commentId ? { commentId } : {}) },
    });
  else if (restaurantId) router.push(`/restaurants/${restaurantId}`);
  else if (type === "PLACE_LIST_INVITE") router.push("/saved-lists");
  else if (type === "TRIP_PLAN_REMINDER" && placeListId)
    router.push({ pathname: "/saved-lists/plan/[id]", params: { id: placeListId } });
  else if (placeListId) router.push(`/saved-lists/${placeListId}`);
  else if (actorId)
    router.push({ pathname: "/(users)/[id]", params: { id: actorId } });
}

function stringPushValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isLoading: authIsLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const insets = useSafeAreaInsets();
  const [popup, setPopup] = useState<AppNotification | null>(null);
  const [pendingPushData, setPendingPushData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const notificationsScreenOpen = useRef(false);
  const pathnameRef = useRef(pathname);
  const lastHandledResponseIdRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const identifier = response.notification.request.identifier;
      if (lastHandledResponseIdRef.current === identifier) return;
      lastHandledResponseIdRef.current = identifier;
      setPendingPushData(response.notification.request.content.data ?? null);
    };

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        handleResponse(response);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch((error) =>
        console.warn("Could not restore notification response", error),
      );

    return () => responseSubscription.remove();
  }, []);

  useEffect(() => {
    if (authIsLoading) return;

    if (!userId) {
      setPendingPushData(null);
      return;
    }

    if (!rootNavigationState?.key || !pendingPushData) return;
    openPushData(pendingPushData);
    setPendingPushData(null);
  }, [authIsLoading, pendingPushData, rootNavigationState?.key, userId]);

  useEffect(() => {
    if (!popup) return;
    const dismissTimer = setTimeout(() => setPopup(null), 3_000);
    return () => clearTimeout(dismissTimer);
  }, [popup]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void removeLegacyBackgroundNotifications().catch((error) =>
      console.warn("Could not clear the retired notification test", error),
    );
  }, []);

  useEffect(() => {
    notificationsScreenOpen.current = pathname.startsWith("/notifications");

    if (notificationsScreenOpen.current) {
      setPopup(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = io(`${API_URL}/notifications`, {
      auth: { token, ...SOCKET_CLIENT_METADATA },
    });

    socket.on("notification", async (incoming: AppNotification) => {
      const item = await hydrateNotificationActor(incoming);
      // Message events are intentionally not merged into the activity feed,
      // but they still need an independent in-app popup. This keeps foreground
      // chat alerts working even if the external push provider is unavailable.
      if (item.type === "MESSAGE") {
        if (
          item.conversationId &&
          pathnameRef.current === `/chats/${item.conversationId}`
        ) {
          setPopup(null);
          return;
        }

        setPopup(item);
        return;
      }

      const current = queryClient.getQueryData<InfiniteData<NotificationsPage>>(
        notificationsQueryKey,
      );
      const replaced = current?.pages
        .flatMap((page) => page.items)
        .find((existing) => isSameNotification(existing, item));

      const notificationsOpen = notificationsScreenOpen.current;
      const visibleItem = notificationsOpen
        ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
        : item;

      queryClient.setQueryData<InfiniteData<NotificationsPage>>(
        notificationsQueryKey,
        (cached) => mergeNotification(cached, visibleItem),
      );

      if (notificationsOpen) {
        queryClient.setQueryData(notificationUnreadQueryKey, { count: 0 });
        void api.notifications
          .markRead(item.id)
          .then(() => {
            queryClient.setQueryData(notificationUnreadQueryKey, { count: 0 });
          })
          .catch((error) =>
            console.warn("mark live notification read failed", error),
          );
        setPopup(null);
        return;
      }

      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      queryClient.setQueryData<{ count: number }>(
        notificationUnreadQueryKey,
        (unread) => ({
          count: (unread?.count ?? 0) + (replaced && !replaced.readAt ? 0 : 1),
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: notificationUnreadQueryKey,
      });

      if (
        item.type === "MESSAGE_MENTION" &&
        item.conversationId &&
        pathnameRef.current === `/chats/${item.conversationId}`
      ) {
        setPopup(null);
        return;
      }

      // Friend-post alerts are push-only. While FindEat is open the feed/cache
      // still updates above, but we do not interrupt the user with a banner.
      if (item.type === "FRIEND_POST") {
        setPopup(null);
        return;
      }

      setPopup(item);
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, token, user]);

  useEffect(() => {
    if (!userId || !Device.isDevice || Platform.OS === "web") return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let registrationInFlight = false;
    let lastRegisteredToken: string | null = null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (typeof projectId !== "string") return;
    const pushEnvironment = currentPushEnvironment();
    const cacheKey = `findeat_expo_push_token:${userId}:${Platform.OS}:${projectId}:${pushEnvironment}`;

    async function registerPushToken(
      attempt = 0,
      forceRefresh = false,
      forceBackendSync = false,
    ): Promise<void> {
      if (registrationInFlight || cancelled) return;
      registrationInFlight = true;

      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("findeat-alerts", {
            name: "FindEat alerts",
            description: "Messages and activity from FindEat",
            importance: Notifications.AndroidImportance.MAX,
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            enableVibrate: true,
            vibrationPattern: [0, 250, 180, 250],
            enableLights: true,
            lightColor: "#FFB326",
            showBadge: true,
          });
        }

        const current = await Notifications.getPermissionsAsync();
        const permission =
          current.status === "granted"
            ? current
            : await Notifications.requestPermissionsAsync();
        if (permission.status !== "granted" || cancelled) return;

        const cached = forceRefresh
          ? null
          : readCachedPushToken(await AsyncStorage.getItem(cacheKey));
        let pushToken: string;

        try {
          pushToken = (await Notifications.getExpoPushTokenAsync({ projectId }))
            .data;
        } catch (error) {
          console.error("❌ Failed to get Expo Push Token:", error);
          // A temporary Expo/network failure must not prevent an already known
          // device from being re-associated with the currently signed-in user.
          // Keep retrying below so a rotated token replaces this fallback.
          if (
            cached?.token &&
            (forceBackendSync || cached.token !== lastRegisteredToken)
          ) {
            await api.notifications.registerPushToken({
              token: cached.token,
              platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
              deviceId: Device.modelId || undefined,
              environment: pushEnvironment,
            });
            lastRegisteredToken = cached.token;
          }
          throw error;
        }
        if (cancelled) return;
        if (forceBackendSync || pushToken !== lastRegisteredToken) {
          await api.notifications.registerPushToken({
            token: pushToken,
            platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
            deviceId: Device.modelId || undefined,
            environment: pushEnvironment,
          });
        }
        lastRegisteredToken = pushToken;
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            token: pushToken,
            refreshedAt: Date.now(),
          } satisfies CachedPushToken),
        );
      } catch (error) {
        if (cancelled) return;
        if (attempt < 3) {
          const delays = [2_000, 5_000, 15_000];
          retryTimer = setTimeout(
            () =>
              void registerPushToken(
                attempt + 1,
                forceRefresh,
                forceBackendSync,
              ),
            delays[attempt],
          );
          return;
        }
        console.warn(
          "Push notification registration failed after retries",
          error,
        );
      } finally {
        registrationInFlight = false;
      }
    }

    void registerPushToken();

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const content = notification.request.content;
        const data = content.data ?? {};
        const conversationId = stringPushValue(data.conversationId);

        // Activity notifications already arrive through the live notification
        // socket. Native foreground handling is only needed for chat messages.
        if (data.type !== "MESSAGE" || !conversationId) return;
        if (pathnameRef.current === `/chats/${conversationId}`) return;

        const senderName =
          stringPushValue(data.senderName) || content.title || "New message";
        const actorId = stringPushValue(data.actorId);
        const senderAvatarUrl =
          stringPushValue(data.senderAvatarUrl) ||
          stringPushValue(data.actorAvatarUrl);
        const item = await hydrateNotificationActor({
          id: notification.request.identifier,
          recipientId: userId,
          actorId,
          type: "MESSAGE",
          title: senderName,
          body: content.body,
          conversationId,
          restaurantId: stringPushValue(data.restaurantId),
          actor: {
            id: "",
            username: senderName,
            displayName: senderName,
            avatarUrl: senderAvatarUrl,
          },
          createdAt: new Date().toISOString(),
        });
        setPopup(item);
      },
    );
    const pushTokenSubscription = Notifications.addPushTokenListener(() => {
      void AsyncStorage.removeItem(cacheKey).then(() => {
        retryTimer = setTimeout(
          () => void registerPushToken(0, true, true),
          250,
        );
      });
    });
    let previousAppState = AppState.currentState;
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        const returnedToForeground =
          nextAppState === "active" && previousAppState !== "active";
        previousAppState = nextAppState;

        if (returnedToForeground) {
          void registerPushToken(0, false, true);
        }
      },
    );
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      receivedSubscription.remove();
      pushTokenSubscription.remove();
      appStateSubscription.remove();
    };
  }, [userId]);

  function openNotification(item: AppNotification) {
    setPopup(null);
    const href = notificationHref(item);
    if (href) router.push(href);

    // Message pushes are intentionally not stored in the activity feed. For
    // stored notifications, navigation must never wait on this network call.
    if (item.type === "MESSAGE") return;
    void api.notifications
      .markRead(item.id)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
        void queryClient.invalidateQueries({
          queryKey: notificationUnreadQueryKey,
        });
      })
      .catch((error) => console.warn("mark notification read failed", error));
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: insets.top, left: 0, right: 0 }}
      >
        {popup ? (
          <NotificationPopup
            key={popup.id}
            item={popup}
            onDismiss={() => setPopup(null)}
            onPress={() => openNotification(popup)}
          />
        ) : null}
      </View>
    </View>
  );
}
