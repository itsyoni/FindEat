import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

export const myProfileQueryKey = ["profile", "me"] as const;

export function useMyProfile() {
  const query = useQuery({
    queryKey: myProfileQueryKey,
    queryFn: () => api.users.me(),
    staleTime: 2 * 60 * 1_000,
    gcTime: 30 * 60 * 1_000,
    refetchOnMount: false,
  });
  const { refetch } = query;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    profile: query.data ?? null,
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    refresh,
  };
}
