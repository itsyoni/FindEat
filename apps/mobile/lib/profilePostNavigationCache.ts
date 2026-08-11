import type { Post, PostType } from "@findeat/types/post";

const profilePostNavigationCache = new Map<string, Post[]>();

function cacheKey(userId: string, type: PostType) {
  return `${userId}:${type}`;
}

export function cacheProfilePostsForNavigation(
  userId: string,
  type: PostType,
  posts: Post[],
) {
  profilePostNavigationCache.set(cacheKey(userId, type), posts);
}

export function getCachedProfilePosts(
  userId: string | undefined,
  type: PostType,
) {
  if (!userId) return null;
  return profilePostNavigationCache.get(cacheKey(userId, type)) ?? null;
}
