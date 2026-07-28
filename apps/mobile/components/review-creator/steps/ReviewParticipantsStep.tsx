import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import SearchBar from "@/components/common/inputs/SearchBar";
import { SkeletonList, ThemedSafeAreaView } from "@/components/common";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getSuggestedFriends, searchFriends } from "@/services/search";
import type {
  ReviewInviteeDraft,
  SearchResultItem,
} from "@findeat/types";
import { CheckCircleIcon, UsersThreeIcon, XIcon } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

const MAX_INVITEES = 9;

type Props = {
  selected: ReviewInviteeDraft[];
  onChange: (participants: ReviewInviteeDraft[]) => void;
  onBack: () => void;
  onDone?: () => void;
  saving?: boolean;
};

function toInvitee(item: SearchResultItem): ReviewInviteeDraft {
  return {
    id: item.id,
    displayName: item.title,
    username: item.subtitle?.replace(/^@/, "") || item.title,
    avatarUrl: item.imageUrl,
  };
}

export default function ReviewParticipantsStep({
  selected,
  onChange,
  onBack,
  onDone,
  saving = false,
}: Props) {
  const { t } = useTranslation("create");
  const { isDark } = useAppTheme();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getSuggestedFriends()
      .then((friends) => {
        if (!cancelled) setSuggestions(friends);
      })
      .catch((error) => {
        console.error("Could not load review invite suggestions", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchFriends(value)
        .then((friends) => {
          if (!cancelled) setResults(friends);
        })
        .catch((error) => {
          console.error("Could not search review invitees", error);
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const visibleFriends = query.trim() ? results : suggestions;
  const selectedIds = useMemo(
    () => new Set(selected.map((participant) => participant.id)),
    [selected],
  );

  function toggle(item: SearchResultItem) {
    if (selectedIds.has(item.id)) {
      if (selected.find((participant) => participant.id === item.id)?.locked) {
        return;
      }
      onChange(selected.filter((participant) => participant.id !== item.id));
      return;
    }
    if (selected.length >= MAX_INVITEES) return;
    onChange([...selected, toInvitee(item)]);
  }

  const iconColor = isDark ? "#FFFFFF" : "#111827";

  return (
    <ThemedSafeAreaView edges={["top", "bottom"]}>
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-900">
        <TouchableOpacity
          onPress={onBack}
          className="h-11 w-11 items-center justify-center"
        >
          <DirectionalIcon
            direction="back"
            size={25}
            color={iconColor}
            weight="bold"
          />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-xl font-bold text-black dark:text-white">
            {t("reviewTogetherTitle")}
          </Text>
          <Text className="mt-0.5 text-sm text-gray-500">
            {t("reviewTogetherSelected", { count: selected.length })}
          </Text>
        </View>
        <TouchableOpacity
          disabled={saving}
          onPress={onDone ?? onBack}
          className={`px-2 py-3 ${saving ? "opacity-50" : ""}`}
        >
          <Text className="font-bold text-brand">
            {saving ? t("saving") : t("done")}
          </Text>
        </TouchableOpacity>
      </View>

      {selected.length > 0 && (
        <View className="border-b border-gray-100 py-3 dark:border-gray-900">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          >
            {selected.map((participant) => (
              <TouchableOpacity
                key={participant.id}
                disabled={participant.locked}
                onPress={() =>
                  onChange(
                    selected.filter((item) => item.id !== participant.id),
                  )
                }
                className="w-16 items-center"
              >
                <View>
                  <Avatar
                    uri={participant.avatarUrl}
                    username={participant.username}
                    size={52}
                  />
                  <View
                    className={`absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full ${
                      participant.locked ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {participant.locked ? (
                      <CheckCircleIcon size={12} color="#FFFFFF" weight="fill" />
                    ) : (
                      <XIcon size={11} color="#FFFFFF" weight="bold" />
                    )}
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  className="mt-2 text-center text-xs text-black dark:text-white"
                >
                  {participant.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t("searchFriendsToInvite")}
      />

      {loading || (!!query.trim() && searching) ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={visibleFriends}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          ListHeaderComponent={
            !query.trim() && visibleFriends.length > 0 ? (
              <View className="px-5 pb-2 pt-4">
                <Text className="text-lg font-bold text-black dark:text-white">
                  {t("suggestedFriends")}
                </Text>
                <Text className="mt-1 text-sm text-gray-500">
                  {t("reviewTogetherFriendsOnly")}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-10 pb-20">
              <UsersThreeIcon size={52} color="#9CA3AF" />
              <Text className="mt-4 text-center text-gray-500">
                {query.trim()
                  ? t("noFriendsFound")
                  : t("noSuggestedFriends")}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            const disabled = !isSelected && selected.length >= MAX_INVITEES;
            return (
              <TouchableOpacity
                disabled={disabled}
                onPress={() => toggle(item)}
                className={`flex-row items-center px-5 py-3 ${
                  disabled ? "opacity-40" : ""
                }`}
              >
                <Avatar
                  uri={item.imageUrl}
                  username={item.title}
                  size={50}
                />
                <View className="ml-4 flex-1">
                  <Text className="font-bold text-black dark:text-white">
                    {item.title}
                  </Text>
                  {!!item.subtitle && (
                    <Text className="mt-1 text-sm text-gray-500">
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                <CheckCircleIcon
                  size={26}
                  color={isSelected ? "#E0B84F" : "#D1D5DB"}
                  weight={isSelected ? "fill" : "regular"}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ThemedSafeAreaView>
  );
}
