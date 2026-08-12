import SearchBar from "@/components/common/inputs/SearchBar";
import { SkeletonList } from "@/components/common";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  TouchableOpacity,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import Text from "../common/AppText";
import { useTranslation } from "react-i18next";

type Props<T> = {
  data?: T[];
  idleData?: T[];
  searchRequest?: (query: string) => Promise<T[]>;
  onCancel: () => void;
  onSelect: (item: T) => void;
  searchFn?: (query: string, item: T) => boolean;
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  placeholder?: string;
  emptyText?: string;
  headerContent?: ReactNode;
  idleHeaderContent?: ReactNode;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
};

export default function SearchResultsView<T>({
  data,
  idleData = [],
  searchRequest,
  onCancel,
  onSelect,
  searchFn,
  keyExtractor,
  renderItem,
  placeholder,
  emptyText,
  headerContent,
  idleHeaderContent,
  initialQuery = "",
  onQueryChange,
}: Props<T>) {
  const { t } = useTranslation("common");
  const [query, setQuery] = useState(initialQuery);
  const [remoteResults, setRemoteResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const isRemoteSearch = !!searchRequest;

  useEffect(() => {
    if (!isRemoteSearch) return;

    const q = query.trim();

    if (!q) return;

    let active = true;
    const timeout = setTimeout(async () => {
      try {
        if (active) setLoading(true);
        const results = await searchRequest(q);
        if (active) setRemoteResults(results);
      } catch (error) {
        console.error("search failed", error);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, searchRequest, isRemoteSearch]);

  const localResults = useMemo(() => {
    if (isRemoteSearch) return [];
    if (!query.trim()) return [];
    if (!data || !searchFn) return [];

    return data.filter((item) => searchFn(query, item));
  }, [query, data, searchFn, isRemoteSearch]);

  const results = query.trim()
    ? isRemoteSearch
      ? remoteResults
      : localResults
    : idleData;

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(120)}
        className="flex-row items-center"
      >
        <Animated.View layout={LinearTransition.springify()} className="flex-1">
          <SearchBar
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              onQueryChange?.(text);
              if (!text.trim()) {
                setRemoteResults([]);
                setLoading(false);
              }
            }}
            placeholder={placeholder ?? t("search")}
            autoFocus
            rightAccessory={
              <TouchableOpacity className="px-2" onPress={onCancel}>
                <Text className="font-semibold text-black dark:text-white">
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
            }
          />
        </Animated.View>
      </Animated.View>

      {headerContent}
      {!query.trim() ? idleHeaderContent : null}

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.trim() ? (
              <Text className="mt-8 text-center text-gray-500">
                {emptyText ?? t("noResultsFound")}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSelect(item)}>
              {renderItem(item)}
            </TouchableOpacity>
          )}
        />
      )}
    </>
  );
}
