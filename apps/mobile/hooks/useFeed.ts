import { api } from "@/lib/api";
import type { FeedPage, FeedScope, Post, PostType } from "@findeat/types";
import type { UserRestaurant } from "@findeat/types";
import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";

const feedPageSize = 10;

export const feedQueryKey = (type: PostType) => ["feed", type] as const;

export const homeFeedQueryKey = (scope: FeedScope) =>
  ["feed", "home", scope] as const;

export function useHomeFeed(scope: FeedScope, enabled = true) {
  return useInfiniteQuery({
    queryKey: homeFeedQueryKey(scope),
    queryFn: ({ pageParam }) =>
      api.posts.feed("CONTENT", {
        scope,
        cursor: pageParam,
        limit: feedPageSize,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 2 * 60 * 1_000,
    gcTime: 30 * 60 * 1_000,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}

export function useFeed(type: PostType, enabled = true) {
  return useInfiniteQuery({
    queryKey: feedQueryKey(type),
    queryFn: ({ pageParam }) =>
      api.posts.feed(type, {
        cursor: pageParam,
        limit: feedPageSize,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 2 * 60 * 1_000,
    gcTime: 30 * 60 * 1_000,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}

export function useAreaFeed(
  type: PostType,
  area: {
    id: string;
    latitude: number;
    longitude: number;
    radiusKm?: number;
  } | null,
) {
  return useInfiniteQuery({
    queryKey: [
      "feed",
      "area",
      area?.id,
      type,
      area?.latitude,
      area?.longitude,
      area?.radiusKm ?? 25,
    ],
    queryFn: ({ pageParam }) =>
      api.posts.feed(type, {
        cursor: pageParam,
        limit: feedPageSize,
        latitude: area?.latitude,
        longitude: area?.longitude,
        radiusKm: area?.radiusKm ?? 25,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: area !== null,
    staleTime: 2 * 60 * 1_000,
    gcTime: 30 * 60 * 1_000,
  });
}

export function updatePostInFeedCache(
  queryClient: QueryClient,
  updatePost: (post: Post) => Post | null,
) {
  queryClient.setQueriesData<InfiniteData<FeedPage>>(
    { queryKey: ["feed"] },
    (current) => {
      if (!current) return current;

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.flatMap((post) => {
            const updated = updatePost(post);
            return updated ? [updated] : [];
          }),
        })),
      };
    },
  );
}

export function updateRestaurantStatusInFeedCache(
  queryClient: QueryClient,
  restaurantId: string,
  status: Partial<UserRestaurant>,
) {
  updatePostInFeedCache(queryClient, (post) => {
    if (post.restaurant?.id !== restaurantId) return post;

    const currentStatus = post.restaurant.userSaves?.[0];
    const nextStatus = {
      id: currentStatus?.id ?? "",
      wantToTry: currentStatus?.wantToTry ?? false,
      visited: currentStatus?.visited ?? false,
      favorite: currentStatus?.favorite ?? false,
      ...currentStatus,
      ...status,
    };
    const wasSaved = currentStatus?.wantToTry === true;
    const isSaved = nextStatus.wantToTry === true;

    return {
      ...post,
      restaurantSavesCount: Math.max(
        0,
        (post.restaurantSavesCount ?? 0) +
          (wasSaved === isSaved ? 0 : isSaved ? 1 : -1),
      ),
      restaurant: {
        ...post.restaurant,
        userSaves: [nextStatus],
      },
    };
  });
}

export function prependPostToFeedCache(
  queryClient: QueryClient,
  post: Post,
) {
  queryClient.setQueryData<InfiniteData<FeedPage>>(
    feedQueryKey(post.type),
    (current) => {
      if (!current) {
        return {
          pages: [{ items: [post], nextCursor: null }],
          pageParams: [undefined],
        };
      }

      const [firstPage, ...remainingPages] = current.pages;

      return {
        ...current,
        pages: [
          {
            ...firstPage,
            items: [post, ...firstPage.items.filter((item) => item.id !== post.id)],
          },
          ...remainingPages,
        ],
      };
    },
  );

  if (post.type === "CONTENT") {
    queryClient.setQueryData<InfiniteData<FeedPage>>(
      homeFeedQueryKey("FOLLOWING"),
      (current) => {
        if (!current) {
          return {
            pages: [{ items: [post], nextCursor: null }],
            pageParams: [undefined],
          };
        }
        const [firstPage, ...remainingPages] = current.pages;
        return {
          ...current,
          pages: [
            {
              ...firstPage,
              items: [
                post,
                ...firstPage.items.filter((item) => item.id !== post.id),
              ],
            },
            ...remainingPages,
          ],
        };
      },
    );
  }
}

export function removePostFromAppCache(
  queryClient: QueryClient,
  postId: string,
) {
  updatePostInFeedCache(queryClient, (post) =>
    post.id === postId ? null : post,
  );
  void queryClient.invalidateQueries({ queryKey: ["restaurant-posts"] });
  void queryClient.invalidateQueries({ queryKey: ["restaurant-post-feed"] });
}
