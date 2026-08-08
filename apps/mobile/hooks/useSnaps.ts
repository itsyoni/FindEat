import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const snapsQueryKey = ["snaps"] as const;

export function useSnaps(enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: snapsQueryKey,
    queryFn: () => api.snaps.feed(),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const expirations =
      query.data?.flatMap((group) =>
        group.snaps.map((snap) => new Date(snap.expiresAt).getTime()),
      ) ?? [];
    if (expirations.length === 0) return;

    const nextExpiration = Math.min(...expirations);
    const timer = setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: snapsQueryKey }),
      Math.max(0, nextExpiration - Date.now() + 50),
    );
    return () => clearTimeout(timer);
  }, [query.data, queryClient]);

  return query;
}
