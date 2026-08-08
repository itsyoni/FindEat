import { useAuth } from "@/contexts/AuthContext";
import { useSnaps } from "@/hooks/useSnaps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";

export type SnapIndicatorStatus = "unseen" | "viewed";

type SnapIndicators = {
  userIds: ReadonlyMap<string, SnapIndicatorStatus>;
  usernames: ReadonlyMap<string, SnapIndicatorStatus>;
  avatarUrls: ReadonlyMap<string, SnapIndicatorStatus>;
};

type SnapIndicatorContextValue = {
  indicators: SnapIndicators;
  markSnapWatched: (snapId: string) => void;
  isSnapWatched: (snapId: string) => boolean;
};

type WatchedSnapState = {
  userId: string;
  ids: ReadonlySet<string>;
};

type SnapIdentity = {
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

const WATCHED_SNAPS_PREFIX = "findeat:watched-snaps:";
const MAX_WATCHED_SNAP_IDS = 1_000;
const EMPTY_WATCHED_SNAP_IDS: ReadonlySet<string> = new Set();
const SnapIndicatorContext = createContext<SnapIndicatorContextValue | null>(null);

function normalizedUsername(username?: string | null) {
  return username?.trim().toLocaleLowerCase() ?? "";
}

function findSnapIndicator(
  indicators: SnapIndicators | undefined,
  { userId, username, avatarUrl }: SnapIdentity,
) {
  if (!indicators) return null;
  if (userId) {
    const status = indicators.userIds.get(userId);
    if (status) return status;
  }

  const normalized = normalizedUsername(username);
  if (normalized) {
    const status = indicators.usernames.get(normalized);
    if (status) return status;
  }

  return avatarUrl ? (indicators.avatarUrls.get(avatarUrl) ?? null) : null;
}

export function SnapIndicatorProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const userId = user?.id;
  const snaps = useSnaps(!!user && !isLoading);
  const [watchedState, setWatchedState] = useState<WatchedSnapState | null>(null);
  const watchedIds = useMemo(
    () =>
      watchedState && watchedState.userId === userId
        ? watchedState.ids
        : EMPTY_WATCHED_SNAP_IDS,
    [userId, watchedState],
  );

  useEffect(() => {
    if (!userId) return;

    let active = true;
    void AsyncStorage.getItem(`${WATCHED_SNAPS_PREFIX}${userId}`)
      .then((stored) => {
        if (!active) return;
        const savedIds = stored ? (JSON.parse(stored) as unknown) : [];
        if (!Array.isArray(savedIds)) return;
        setWatchedState((current) => {
          const merged = new Set(
            savedIds.filter((id): id is string => typeof id === "string"),
          );
          if (current?.userId === userId) {
            current.ids.forEach((id) => merged.add(id));
          }
          return { userId, ids: merged };
        });
      })
      .catch((error) => {
        console.error("Could not load watched snaps", error);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void snaps.refetch();
      }
    });
    return () => subscription.remove();
  }, [snaps.refetch, userId]);

  const markSnapWatched = useCallback(
    (snapId: string) => {
      if (!userId) return;
      setWatchedState((current) => {
        const next = new Set(current?.userId === userId ? current.ids : []);
        next.delete(snapId);
        next.add(snapId);
        const boundedIds = Array.from(next).slice(-MAX_WATCHED_SNAP_IDS);
        void AsyncStorage.setItem(
          `${WATCHED_SNAPS_PREFIX}${userId}`,
          JSON.stringify(boundedIds),
        ).catch((error) => {
          console.error("Could not save watched snap", error);
        });
        return { userId, ids: new Set(boundedIds) };
      });
    },
    [userId],
  );

  const indicators = useMemo<SnapIndicators>(() => {
    const groups = snaps.data ?? [];
    const userIds = new Map<string, SnapIndicatorStatus>();
    const usernames = new Map<string, SnapIndicatorStatus>();
    const avatarUrls = new Map<string, SnapIndicatorStatus>();

    for (const group of groups) {
      const hasUnseenSnap = group.snaps.some(
        (snap) => !snap.viewedAt && !watchedIds.has(snap.id),
      );
      const status: SnapIndicatorStatus = hasUnseenSnap ? "unseen" : "viewed";
      userIds.set(group.user.id, status);

      const username = normalizedUsername(group.user.username);
      if (username) usernames.set(username, status);
      if (group.user.avatarUrl) avatarUrls.set(group.user.avatarUrl, status);
    }

    return {
      userIds,
      usernames,
      avatarUrls,
    };
  }, [snaps.data, watchedIds]);

  const isSnapWatched = useCallback(
    (snapId: string) => watchedIds.has(snapId),
    [watchedIds],
  );

  const value = useMemo(
    () => ({ indicators, markSnapWatched, isSnapWatched }),
    [indicators, isSnapWatched, markSnapWatched],
  );

  return (
    <SnapIndicatorContext.Provider value={value}>
      {children}
    </SnapIndicatorContext.Provider>
  );
}

export function useSnapIndicator({
  userId,
  username,
  avatarUrl,
  enabled = true,
}: {
  userId?: SnapIdentity["userId"];
  username?: SnapIdentity["username"];
  avatarUrl?: SnapIdentity["avatarUrl"];
  enabled?: boolean;
}) {
  const context = useContext(SnapIndicatorContext);
  if (!enabled) return null;
  return findSnapIndicator(context?.indicators, { userId, username, avatarUrl });
}

export function useHasActiveSnap(options: Parameters<typeof useSnapIndicator>[0]) {
  return useSnapIndicator(options) !== null;
}

export function useMarkSnapWatched() {
  const context = useContext(SnapIndicatorContext);
  return context?.markSnapWatched ?? (() => undefined);
}

export function useIsSnapWatched() {
  const context = useContext(SnapIndicatorContext);
  return context?.isSnapWatched ?? (() => false);
}

export function useSnapIndicatorLookup() {
  const context = useContext(SnapIndicatorContext);
  return useCallback(
    (identity: SnapIdentity) =>
      findSnapIndicator(context?.indicators, identity),
    [context?.indicators],
  );
}
