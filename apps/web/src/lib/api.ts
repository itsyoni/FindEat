import type {
  Chat,
  RestaurantConversation,
  RestaurantMessage,
  RestaurantNotificationsPage,
  RestaurantReview,
  MediaPurpose,
  MediaUploadTicket,
} from '@findeat/types'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const responseCache = new Map<string, Promise<unknown>>()
const MAX_CACHE_ENTRIES = 150

export function getAccessToken() {
  return localStorage.getItem('findeat-business-token')
}

export function invalidateRequestCache(pathPrefix?: string) {
  if (!pathPrefix) {
    responseCache.clear()
    return
  }
  for (const key of responseCache.keys()) {
    if (key.split(':', 2)[1]?.startsWith(pathPrefix)) {
      responseCache.delete(key)
    }
  }
}

export async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const method = (init?.method ?? 'GET').toUpperCase()
  const cacheable = method === 'GET' && init?.cache !== 'no-store'
  const refreshCache = method === 'GET' && init?.cache === 'reload'
  const cacheKey = `${token ?? 'anonymous'}:${path}`
  const existing = cacheable && !refreshCache
    ? responseCache.get(cacheKey)
    : undefined
  if (existing) return existing as Promise<T>

  const pending = (async () => {
    const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 401) responseCache.clear()
      throw new Error(body?.message || 'Something went wrong')
    }
    if (method !== 'GET' && method !== 'HEAD') responseCache.clear()
    return body as T
  })()

  if (cacheable) {
    responseCache.set(cacheKey, pending)
    if (responseCache.size > MAX_CACHE_ENTRIES) {
      responseCache.delete(responseCache.keys().next().value as string)
    }
    pending.catch(() => responseCache.delete(cacheKey))
  }

  return pending
}

export async function uploadImage(
  file: File,
  purpose: MediaPurpose = 'other',
): Promise<string> {
  const contentType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(contentType)) {
    throw new Error('Please choose a JPG, PNG, WebP, HEIC, or HEIF image')
  }
  if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
    throw new Error('Image must be smaller than 20 MB')
  }

  const ticket = await request<MediaUploadTicket>('/media/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      contentType,
      size: file.size,
      fileName: file.name,
      purpose,
    }),
  })
  const response = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: ticket.headers,
    body: file,
  })
  if (!response.ok) throw new Error('Could not upload image. Please try again.')
  return ticket.imageUrl
}

export async function uploadSound(file: File): Promise<string> {
  const contentType = file.type === 'audio/x-m4a' ? 'audio/mp4' : file.type
  if (!['audio/mpeg', 'audio/mp4', 'audio/wav'].includes(contentType)) {
    throw new Error('Please choose an MP3, M4A, or WAV file')
  }
  if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
    throw new Error('Sound must be smaller than 50 MB')
  }
  const ticket = await request<MediaUploadTicket>('/media/upload-url', {
    method: 'POST',
    body: JSON.stringify({ contentType, size: file.size, fileName: file.name, purpose: 'sound' }),
  })
  const response = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file })
  if (!response.ok) throw new Error('Could not upload sound. Please try again.')
  return ticket.mediaUrl ?? ticket.imageUrl
}

export async function loadRestaurantReviews(
  restaurantId: string,
  refresh = false,
): Promise<RestaurantReview[]> {
  const init = refresh ? { cache: 'reload' as const } : undefined
  try {
    const reviews = await request<RestaurantReview[]>(
      `/restaurants/${restaurantId}/business/reviews`,
      init,
    )
    return reviews.map((review) => ({ ...review, items: review.items ?? [] }))
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (!message.includes('cannot get') && !message.includes('not found')) throw error
    const fallback = await request<{ items: RestaurantReview[] }>(
      `/restaurants/${restaurantId}/posts?section=REVIEWS&limit=30`,
      init,
    )
    return fallback.items.map((review) => ({
      ...review,
      items: review.items ?? [],
      createdAt: review.createdAt ?? '',
    }))
  }
}

export async function fetchRestaurantConversations(
  restaurantId: string,
  currentUserId: string,
  refresh = false,
): Promise<RestaurantConversation[]> {
  const init = refresh ? { cache: 'reload' as const } : undefined
  const fetchFromChatList = async () => {
    const chats = await request<Chat[]>('/chats', init)
    return chats
      .filter((chat) => chat.type === 'RESTAURANT' && chat.restaurantId === restaurantId)
      .map((chat) => ({
        id: chat.id,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: chat.unreadCount,
        customer: chat.participants.find((participant) => participant.userId !== currentUserId)?.user ?? null,
      }))
  }

  try {
    const conversations = await request<RestaurantConversation[]>(
      `/chats/restaurants/${restaurantId}/conversations`,
      init,
    )
    return conversations.length > 0 ? conversations : fetchFromChatList()
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('cannot get') || message.includes('not found')) return fetchFromChatList()
    throw error
  }
}

export async function fetchRestaurantMessages(
  restaurantId: string,
  conversationId: string,
  refresh = false,
): Promise<RestaurantMessage[]> {
  const init = refresh ? { cache: 'reload' as const } : undefined
  try {
    const messages = await request<RestaurantMessage[]>(
      `/chats/restaurants/${restaurantId}/conversations/${conversationId}/messages`,
      init,
    )
    return messages.length > 0
      ? messages
      : request<RestaurantMessage[]>(`/chats/${conversationId}/messages`, init)
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('cannot get') || message.includes('not found')) {
      return request<RestaurantMessage[]>(`/chats/${conversationId}/messages`, init)
    }
    throw error
  }
}

export async function sendRestaurantReply(
  restaurantId: string,
  conversationId: string,
  content: string,
): Promise<RestaurantMessage> {
  return request<RestaurantMessage>(
    `/chats/restaurants/${restaurantId}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
  )
}

export async function fetchRestaurantNotifications(
  restaurantId: string,
  refresh = false,
): Promise<RestaurantNotificationsPage> {
  const init = refresh ? { cache: 'reload' as const } : undefined
  try {
    return await request<RestaurantNotificationsPage>(
      `/notifications/restaurants/${restaurantId}?limit=40`,
      init,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('cannot get') || message.includes('not found')) {
      return { items: [], nextCursor: null, unreadCount: 0 }
    }
    throw error
  }
}
