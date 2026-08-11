import type {
  Comment,
  CommentContext,
  FeedPage,
  FeedScope,
  Post,
  PostType,
  PostVisibility,
  UserSummary,
} from "@findeat/types";
import type { AxiosInstance } from "axios";

function canonicalMediaDimension(value: number, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? Math.max(1, Math.round(numericValue))
    : fallback;
}

export function createPostsApi(api: AxiosInstance) {
  const commentsCache = new Map<
    string,
    { comments: Comment[]; expiresAt: number }
  >();
  const commentsCacheTtlMs = 5_000;

  return {
    async createContent(payload: {
      caption: string;
      imageUrl?: string;
      restaurantId?: string;
      visibility?: PostVisibility;
      linkedPostId?: string;
      taggedUserIds?: string[];
      media?: Array<{
        type: "IMAGE" | "VIDEO";
        imageUrl?: string;
        videoUrl?: string;
        width: number;
        height: number;
        durationMs?: number;
      }>;
    }) {
      const canonicalPayload = {
        ...payload,
        media: payload.media?.map((item) => ({
          type: String(item.type).trim().toUpperCase(),
          ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
          ...(item.videoUrl ? { videoUrl: item.videoUrl } : {}),
          width: canonicalMediaDimension(item.width, 4),
          height: canonicalMediaDimension(item.height, 5),
          ...(item.durationMs == null
            ? {}
            : { durationMs: Math.ceil(item.durationMs) }),
        })),
      };
      for (const [index, item] of (canonicalPayload.media ?? []).entries()) {
        let invalidField: string | null = null;
        if (item.type !== "IMAGE" && item.type !== "VIDEO") invalidField = "type";
        else if (!Number.isSafeInteger(item.width) || item.width < 1) invalidField = "width";
        else if (!Number.isSafeInteger(item.height) || item.height < 1) invalidField = "height";
        else if (item.type === "IMAGE" && !item.imageUrl) invalidField = "image URL";
        else if (item.type === "VIDEO" && !item.videoUrl) invalidField = "video URL";
        else if (
          item.type === "VIDEO" &&
          (!Number.isSafeInteger(item.durationMs) ||
            (item.durationMs ?? 0) < 1 ||
            (item.durationMs ?? 0) > 10_000)
        ) {
          invalidField = "duration";
        }
        if (invalidField) {
          throw new Error(
            `Could not prepare media item ${index + 1}: invalid ${invalidField}.`,
          );
        }
      }
      const { data } = await api.post<Post>(
        "/posts/content",
        canonicalPayload,
        { headers: { "Content-Type": "application/json" } },
      );
      return data;
    },

    async createReview(payload: {
      clientRequestId?: string;
      restaurantId: string;
      visibility?: PostVisibility;
      coverImageUrl?: string;
      summary?: string;
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
        rating?: number;
        text?: string;
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

    async updateInteractionPrivacy(
      id: string,
      payload: { hideLikeCount?: boolean; commentsDisabled?: boolean },
    ) {
      const { data } = await api.patch<Post>(`/posts/${id}/privacy`, payload);
      return data;
    },

    async createRestaurantPost(
      restaurantId: string,
      payload: {
        caption: string;
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
        scope?: FeedScope;
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
          ...(options?.scope ? { scope: options.scope } : {}),
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

    async updateTags(id: string, taggedUserIds: string[]) {
      const { data } = await api.patch<Post>(`/posts/${id}/tags`, {
        taggedUserIds,
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

    async requestToJoinReview(id: string) {
      const { data } = await api.post<{ ok: boolean }>(
        `/posts/${id}/collaboration/request`,
      );
      return data;
    },

    async approveReviewJoinRequest(id: string, requesterId: string) {
      const { data } = await api.post<Post>(
        `/posts/${id}/collaboration/requests/${requesterId}/approve`,
      );
      return data;
    },

    async declineReviewJoinRequest(id: string, requesterId: string) {
      const { data } = await api.post<{ ok: boolean }>(
        `/posts/${id}/collaboration/requests/${requesterId}/decline`,
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

    async upsertReviewExperienceRatings(
      postId: string,
      payload: {
        atmosphereRating?: number | null;
        serviceRating?: number | null;
        valueRating?: number | null;
      },
    ) {
      const { data } = await api.put<Post>(
        `/posts/${postId}/review/ratings`,
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

    async updateContent(id: string, payload: { caption: string }) {
      const { data } = await api.patch<Post>(`/posts/${id}/content`, payload);
      return data;
    },

    async updateReview(
      id: string,
      payload: {
        coverImageUrl?: string;
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

    async likes(id: string, cursor?: string) {
      const { data } = await api.get<{
        items: UserSummary[];
        nextCursor: string | null;
      }>(`/posts/${id}/likes`, {
        params: { cursor, limit: 30 },
      });
      return data;
    },

    async addComment(id: string, content: string, replyToId?: string, gifUrl?: string) {
      const { data } = await api.post<Comment>(`/posts/${id}/comments`, {
        content,
        replyToId,
        gifUrl,
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
