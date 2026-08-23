import type { NotificationsPage } from '@findeat/types';
import type { AxiosInstance } from 'axios';

export function createNotificationsApi(api: AxiosInstance) {
  return {
    async list(cursor?: string, limit = 20) {
      const { data } = await api.get<NotificationsPage>('/notifications', {
        params: { cursor, limit },
      });
      return data;
    },
    async unreadCount() {
      const { data } = await api.get<{ count: number }>(
        '/notifications/unread-count',
      );
      return data;
    },
    async markRead(id: string) {
      const { data } = await api.patch<{ ok: boolean }>(
        `/notifications/${id}/read`,
      );
      return data;
    },
    async markAllRead() {
      const { data } = await api.patch<{ ok: boolean }>(
        '/notifications/read-all',
      );
      return data;
    },
    async registerPushToken(payload: {
      token: string;
      platform: 'IOS' | 'ANDROID';
      deviceId?: string;
      environment?: 'development' | 'preview' | 'production';
    }) {
      const { data } = await api.post('/push-tokens', payload);
      return data;
    },
  };
}
