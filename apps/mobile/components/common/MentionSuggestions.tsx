import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { UserSummary } from "@findeat/types";
import { useEffect, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";

type Props = {
  value: string;
  onChange: (value: string) => void;
  candidates?: UserSummary[];
};

function mentionQuery(value: string) {
  return /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]*)$/.exec(value)?.[1] ?? null;
}

function insertMention(value: string, username: string) {
  return value.replace(
    /(^|[^A-Za-z0-9_])@[A-Za-z0-9_]*$/,
    (_match, prefix: string) => `${prefix}@${username} `,
  );
}

export default function MentionSuggestions({ value, onChange, candidates }: Props) {
  const { user } = useAuth();
  const query = mentionQuery(value);
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);

  useEffect(() => {
    if (query === null || candidates) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void api.users
        .search(query)
        .then((results) => {
          if (!cancelled) setSearchResults(results);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidates, query]);

  const results = useMemo(() => {
    const source = candidates ?? searchResults;
    const normalizedQuery = query?.toLowerCase() ?? "";
    return source
      .filter((candidate) => candidate.id !== user?.id)
      .filter(
        (candidate) =>
          candidate.username.toLowerCase().includes(normalizedQuery) ||
          candidate.displayName?.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 5);
  }, [candidates, query, searchResults, user?.id]);

  if (query === null || !results.length) return null;

  return (
    <View className="mb-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {results.map((candidate) => (
        <TouchableOpacity
          key={candidate.id}
          onPress={() => onChange(insertMention(value, candidate.username))}
          className="flex-row items-center border-b border-gray-100 px-3 py-2.5 last:border-b-0 dark:border-gray-800"
        >
          <Avatar uri={candidate.avatarUrl} username={candidate.username} size={34} />
          <View className="ml-2 min-w-0 flex-1">
            <Text numberOfLines={1} weight="bold" className="text-sm text-black dark:text-white">
              {candidate.username}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
