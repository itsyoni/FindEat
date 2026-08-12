import { api } from "@/lib/api";
import type { Comment, CommentContext, PostPoll } from "@findeat/types";
import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_PINNED_COMMENTS = 3;
export const COMMENT_PIN_LIMIT_ERROR = "COMMENT_PIN_LIMIT";

export function useComments(postId?: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [rankingLikesByCommentId, setRankingLikesByCommentId] = useState(
    () => new Map<string, number>(),
  );
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [canCreateAuthorNote, setCanCreateAuthorNote] = useState(false);
  const [isPostAuthor, setIsPostAuthor] = useState(false);
  const [canCreatePoll, setCanCreatePoll] = useState(false);
  const [poll, setPoll] = useState<PostPoll | null>(null);

  const requestIdRef = useRef(0);
  const likingIdsRef = useRef(new Set<string>());
  const pinningRef = useRef(false);
  const votingRef = useRef(false);

  const applyCommentContext = useCallback((context: CommentContext) => {
    setCanCreateAuthorNote(context.canCreateAuthorNote);
    setIsPostAuthor(context.isPostAuthor);
    setCanCreatePoll(context.canCreatePoll);
    setPoll(context.poll);
  }, []);

  const refresh = useCallback(async () => {
    if (!postId) return;

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      const [nextComments, context] = await Promise.all([
        api.posts.comments(postId),
        api.posts.commentContext(postId),
      ]);

      if (requestId !== requestIdRef.current) return;

      setComments(nextComments);
      setRankingLikesByCommentId(
        new Map(nextComments.map((comment) => [comment.id, comment.likesCount])),
      );
      applyCommentContext(context);
      setLoadedPostId(postId);
    } catch (error) {
      console.error("Failed to load comments", error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [applyCommentContext, postId]);

  const addComment = useCallback(
    async (content: string, replyToId?: string, gifUrl?: string): Promise<void> => {
      const trimmedContent = content.trim();

      if (!postId || (!trimmedContent && !gifUrl)) return;

      try {
        setSubmitting(true);

        const newComment = await api.posts.addComment(
          postId,
          trimmedContent,
          replyToId,
          gifUrl,
        );

        setComments((previousComments) => [
          ...previousComments,
          {
            ...newComment,
            gifUrl: newComment.gifUrl ?? gifUrl ?? null,
          },
        ]);
        setRankingLikesByCommentId((current) => {
          const next = new Map(current);
          next.set(newComment.id, newComment.likesCount);
          return next;
        });

        setLoadedPostId(postId);
      } catch (error) {
        console.error("Failed to add comment", error);
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [postId],
  );

  const addAuthorNote = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();
      if (!postId || !trimmedContent || !canCreateAuthorNote) return;

      try {
        setSubmitting(true);
        const note = await api.posts.addAuthorNote(postId, trimmedContent);
        setComments((current) => [note, ...current]);
        setCanCreateAuthorNote(false);
        setLoadedPostId(postId);
      } catch (error) {
        await refresh();
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [canCreateAuthorNote, postId, refresh],
  );

  const addPoll = useCallback(
    async (title: string, options: string[]) => {
      if (!postId || !canCreatePoll) return;
      const context = await api.posts.addPoll(postId, title, options);
      applyCommentContext(context);
    },
    [applyCommentContext, canCreatePoll, postId],
  );

  const updateAuthorNote = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();
      if (!postId || !trimmedContent || !isPostAuthor) return;

      try {
        setSubmitting(true);
        const note = await api.posts.updateAuthorNote(postId, trimmedContent);
        setComments((current) =>
          current.map((comment) => (comment.id === note.id ? note : comment)),
        );
        setLoadedPostId(postId);
      } catch (error) {
        await refresh();
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [isPostAuthor, postId, refresh],
  );

  const voteOnPoll = useCallback(
    async (optionId: string) => {
      if (!postId || votingRef.current) return;
      votingRef.current = true;
      try {
        const context = await api.posts.voteOnPoll(postId, optionId);
        applyCommentContext(context);
      } finally {
        votingRef.current = false;
      }
    },
    [applyCommentContext, postId],
  );

  useEffect(() => {
    if (!postId) return;

    let cancelled = false;
    const currentPostId = postId;
    const requestId = ++requestIdRef.current;

    async function fetchComments() {
      try {
        const [nextComments, context] = await Promise.all([
          api.posts.comments(currentPostId),
          api.posts.commentContext(currentPostId),
        ]);

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setComments(nextComments);
        setRankingLikesByCommentId(
          new Map(nextComments.map((comment) => [comment.id, comment.likesCount])),
        );
        applyCommentContext(context);
        setLoadedPostId(currentPostId);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load comments", error);
        }
      }
    }

    void fetchComments();

    return () => {
      cancelled = true;
    };
  }, [applyCommentContext, postId]);

  const toggleCommentLike = useCallback(
    async (comment: Comment) => {
      if (!postId || likingIdsRef.current.has(comment.id)) return;
      likingIdsRef.current.add(comment.id);
      const nextIsLiked = !comment.isLiked;
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                isLiked: nextIsLiked,
                likesCount: Math.max(0, item.likesCount + (nextIsLiked ? 1 : -1)),
              }
            : item,
        ),
      );
      try {
        const result = nextIsLiked
          ? await api.posts.likeComment(postId, comment.id)
          : await api.posts.unlikeComment(postId, comment.id);
        setComments((current) =>
          current.map((item) =>
            item.id === comment.id ? { ...item, ...result } : item,
          ),
        );
      } catch (error) {
        setComments((current) =>
          current.map((item) => item.id === comment.id ? comment : item),
        );
        throw error;
      } finally {
        likingIdsRef.current.delete(comment.id);
      }
    },
    [postId],
  );

  const deleteComment = useCallback(
    async (comment: Comment) => {
      if (!postId) return null;
      const result = await api.posts.deleteComment(postId, comment.id);
      setComments((current) =>
        current.filter(
          (item) => item.id !== comment.id && item.parentId !== comment.id,
        ),
      );
      if (comment.isAuthorNote) setCanCreateAuthorNote(true);
      return result;
    },
    [postId],
  );

  const updateComment = useCallback(
    async (comment: Comment, content: string) => {
      const trimmedContent = content.trim();
      if (!postId || !trimmedContent || !comment.canDelete) return;

      const updatedComment = await api.posts.updateComment(
        postId,
        comment.id,
        trimmedContent,
      );
      setComments((current) =>
        current.map((item) =>
          item.id === updatedComment.id ? updatedComment : item,
        ),
      );
      setLoadedPostId(postId);
    },
    [postId],
  );

  const togglePinnedComment = useCallback(
    async (comment: Comment) => {
      if (!postId || !comment.canPin || pinningRef.current) return;
      const wasPinned = comment.isPinned;

      if (
        !wasPinned &&
        comments.filter((item) => !item.parentId && item.isPinned).length >=
          MAX_PINNED_COMMENTS
      ) {
        throw new Error(COMMENT_PIN_LIMIT_ERROR);
      }

      pinningRef.current = true;
      const optimisticPinnedAt = new Date().toISOString();
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                isPinned: !wasPinned,
                pinnedAt: wasPinned ? null : optimisticPinnedAt,
              }
            : item,
        ),
      );
      try {
        if (wasPinned) {
          await api.posts.unpinComment(postId, comment.id);
        } else {
          const result = await api.posts.pinComment(postId, comment.id);
          setComments((current) =>
            current.map((item) =>
              item.id === comment.id
                ? { ...item, pinnedAt: result.pinnedAt }
                : item,
            ),
          );
        }
      } catch (error) {
        setComments((current) =>
          current.map((item) =>
            item.id === comment.id ? comment : item,
          ),
        );
        await refresh();
        throw error;
      } finally {
        pinningRef.current = false;
      }
    },
    [comments, postId, refresh],
  );

  const visibleComments = postId && loadedPostId === postId ? comments : [];

  return {
    comments: visibleComments,
    rankingLikesByCommentId:
      postId && loadedPostId === postId
        ? rankingLikesByCommentId
        : new Map<string, number>(),
    loading,
    submitting,
    canCreateAuthorNote:
      !!postId && loadedPostId === postId && canCreateAuthorNote,
    isPostAuthor: !!postId && loadedPostId === postId && isPostAuthor,
    canCreatePoll: !!postId && loadedPostId === postId && canCreatePoll,
    poll: postId && loadedPostId === postId ? poll : null,
    refresh,
    addComment,
    addAuthorNote,
    updateAuthorNote,
    addPoll,
    voteOnPoll,
    toggleCommentLike,
    deleteComment,
    updateComment,
    togglePinnedComment,
  };
}
