import type {
  Comment,
  CommentContext,
  FeedPage,
  Post,
  PostType,
  PostVisibility,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

export function createPostsApi(api: AxiosInstance) {
  const commentsCache = new Map<
    string,
    { comments: Comment[]; expiresAt: number }
  >();
  const commentsCacheTtlMs = 5_000;

  return {
    async createContent(payload: {
      description: string;
      imageUrl?: string;
      restaurantId?: string;
      visibility?: PostVisibility;
      linkedPostId?: string;
    }) {
      const { data } = await api.post<Post>("/posts/content", payload);

      return data;
    },

    async createReview(payload: {
      restaurantId: string;
      visibility?: PostVisibility;
      coverImageUrl?: string;
      summary?: string;
      overallRating?: number;
      atmosphereRating?: number;
      serviceRating?: number;
      valueRating?: number;
      totalPrice?: number;
      linkedPostId?: string;
      participantIds?: string[];
      items: Array<{
        menuItemId?: string | null;
        customDishName?: string | null;
        customPrice?: number | null;
        imageUrl?: string | null;
        rating: number;
        text: string;
        order: number;
      }>;
    }) {
      const { data } = await api.post<Post>("/posts/review", payload);

      return data;
    },

    async all() {
      const { data } = await api.get<Post[]>("/posts");
      return data;
    },

    async mine() {
      const { data } = await api.get<Post[]>("/posts/me");
      return data;
    },

    async archived() {
      const { data } = await api.get<Post[]>("/posts/archived");
      return data;
    },

    async archive(id: string) {
      const { data } = await api.post<Post>(`/posts/${id}/archive`);
      return data;
    },

    async restore(id: string) {
      const { data } = await api.delete<Post>(`/posts/${id}/archive`);
      return data;
    },

    async createRestaurantPost(
      restaurantId: string,
      payload: {
        description: string;
        imageUrl?: string;
      },
    ) {
      const { data } = await api.post<Post>(
        `/posts/restaurants/${restaurantId}/posts`,
        payload,
      );

      return data;
    },

    async feed(
      type?: PostType,
      options?: {
        cursor?: string;
        limit?: number;
        latitude?: number;
        longitude?: number;
        radiusKm?: number;
      },
    ) {
      const { data } = await api.get<FeedPage>("/posts/feed", {
        params: {
          ...(type ? { type } : {}),
          ...(options?.cursor ? { cursor: options.cursor } : {}),
          ...(options?.limit ? { limit: options.limit } : {}),
          ...(options?.latitude !== undefined ? { latitude: options.latitude } : {}),
          ...(options?.longitude !== undefined ? { longitude: options.longitude } : {}),
          ...(options?.radiusKm ? { radiusKm: options.radiusKm } : {}),
        },
      });

      return data;
    },

    async get(id: string) {
      const { data } = await api.get<Post>(`/posts/${id}`);
      return data;
    },

    async updateReviewParticipants(id: string, participantIds: string[]) {
      const { data } = await api.put<Post>(`/posts/${id}/collaborators`, {
        participantIds,
      });
      return data;
    },

    async joinReview(id: string) {
      const { data } = await api.post<Post>(
        `/posts/${id}/collaboration/join`,
      );
      return data;
    },

    async declineReview(id: string) {
      const { data } = await api.post<{ ok: boolean }>(
        `/posts/${id}/collaboration/decline`,
      );
      return data;
    },

    async leaveReview(id: string) {
      const { data } = await api.delete<{ ok: boolean }>(
        `/posts/${id}/collaboration`,
      );
      return data;
    },

    async upsertReviewContribution(
      postId: string,
      itemId: string,
      payload: {
        rating?: number;
        text?: string;
        imageUrls?: string[];
      },
    ) {
      const { data } = await api.put<Post>(
        `/posts/${postId}/review/items/${itemId}/contribution`,
        payload,
      );
      return data;
    },

    async removeReviewContribution(postId: string, itemId: string) {
      const { data } = await api.delete<Post>(
        `/posts/${postId}/review/items/${itemId}/contribution`,
      );
      return data;
    },

    async addCollaborativeReviewDish(
      postId: string,
      payload: {
        menuItemId?: string;
        customDishName?: string;
        customPrice?: number;
        rating?: number;
        text?: string;
        imageUrls?: string[];
      },
    ) {
      const { data } = await api.post<{ post: Post; itemId: string }>(
        `/posts/${postId}/review/items`,
        payload,
      );
      return data;
    },

    async removeReviewDishMedia(postId: string, mediaId: string) {
      const { data } = await api.delete<Post>(
        `/posts/${postId}/review/media/${mediaId}`,
      );
      return data;
    },

    async setReviewDishPrimaryMedia(
      postId: string,
      itemId: string,
      mediaId: string,
    ) {
      const { data } = await api.patch<Post>(
        `/posts/${postId}/review/items/${itemId}/primary-media/${mediaId}`,
      );
      return data;
    },

    async reorderReviewDishes(postId: string, itemIds: string[]) {
      const { data } = await api.patch<Post>(
        `/posts/${postId}/review/items-order`,
        { itemIds },
      );
      return data;
    },

    async linkCandidates(restaurantId: string, type: PostType) {
      const { data } = await api.get<Post[]>("/posts/link-candidates", {
        params: { restaurantId, type },
      });
      return data;
    },

    async link(id: string, targetId: string) {
      const { data } = await api.post<Post>(
        `/posts/${id}/connections/${targetId}`,
      );
      return data;
    },

    async unlink(id: string, targetId: string) {
      const { data } = await api.delete<Post>(
        `/posts/${id}/connections/${targetId}`,
      );
      return data;
    },

    async updateContent(id: string, payload: { description: string }) {
      const { data } = await api.patch<Post>(`/posts/${id}/content`, payload);
      return data;
    },

    async updateReview(
      id: string,
      payload: {
        summary: string;
        items: Array<{ id: string; text: string }>;
        removedItemIds: string[];
      },
    ) {
      const { data } = await api.patch<Post>(`/posts/${id}/review`, payload);
      return data;
    },

    async like(id: string) {
      const { data } = await api.post<{
        ok: boolean;
        isLiked: boolean;
        likesCount: number;
      }>(`/posts/${id}/like`);
      return data;
    },

    async unlike(id: string) {
      const { data } = await api.delete<{
        ok: boolean;
        isLiked: boolean;
        likesCount: number;
      }>(`/posts/${id}/like`);
      return data;
    },

    async addComment(id: string, content: string, replyToId?: string) {
      const { data } = await api.post<Comment>(`/posts/${id}/comments`, {
        content,
        replyToId,
      });

      commentsCache.delete(id);

      return data;
    },

    async addAuthorNote(id: string, content: string) {
      const { data } = await api.post<Comment>(
        `/posts/${id}/comments/author-note`,
        { content },
      );
      commentsCache.delete(id);
      return data;
    },

    async updateAuthorNote(id: string, content: string) {
      const { data } = await api.patch<Comment>(
        `/posts/${id}/comments/author-note`,
        { content },
      );
      commentsCache.delete(id);
      return data;
    },

    async comments(id: string) {
      const cached = commentsCache.get(id);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.comments;
      }

      const { data } = await api.get<Comment[]>(`/posts/${id}/comments`);

      commentsCache.set(id, {
        comments: data,
        expiresAt: Date.now() + commentsCacheTtlMs,
      });

      return data;
    },

    async commentContext(id: string) {
      const { data } = await api.get<CommentContext>(
        `/posts/${id}/comments/context`,
      );
      return data;
    },

    async addPoll(id: string, title: string, options: string[]) {
      const { data } = await api.post<CommentContext>(
        `/posts/${id}/comments/poll`,
        { title, options },
      );
      return data;
    },

    async voteOnPoll(id: string, optionId: string) {
      const { data } = await api.post<CommentContext>(
        `/posts/${id}/comments/poll/options/${optionId}/vote`,
      );
      return data;
    },

    async likeComment(id: string, commentId: string) {
      const { data } = await api.post<{
        isLiked: boolean;
        likesCount: number;
        likedByAuthor: boolean;
      }>(`/posts/${id}/comments/${commentId}/like`);
      commentsCache.delete(id);
      return data;
    },

    async unlikeComment(id: string, commentId: string) {
      const { data } = await api.delete<{
        isLiked: boolean;
        likesCount: number;
        likedByAuthor: boolean;
      }>(`/posts/${id}/comments/${commentId}/like`);
      commentsCache.delete(id);
      return data;
    },

    async deleteComment(id: string, commentId: string) {
      const { data } = await api.delete<{
        ok: true;
        removedByPostAuthor: boolean;
        removedUserId: string;
      }>(`/posts/${id}/comments/${commentId}`);
      commentsCache.delete(id);
      return data;
    },

    async updateComment(id: string, commentId: string, content: string) {
      const { data } = await api.patch<Comment>(
        `/posts/${id}/comments/${commentId}`,
        { content },
      );
      commentsCache.delete(id);
      return data;
    },

    async pinComment(id: string, commentId: string) {
      const { data } = await api.post<{
        pinnedCommentId: string;
        pinnedAt: string;
      }>(`/posts/${id}/comments/${commentId}/pin`);
      commentsCache.delete(id);
      return data;
    },

    async unpinComment(id: string, commentId: string) {
      const { data } = await api.delete<{ pinnedCommentId: null }>(
        `/posts/${id}/comments/${commentId}/pin`,
      );
      commentsCache.delete(id);
      return data;
    },

    async toggleLike(id: string, isLiked: boolean) {
      return isLiked ? this.unlike(id) : this.like(id);
    },

    async delete(id: string) {
      const { data } = await api.delete(`/posts/${id}`);
      return data;
    },
  };
}
