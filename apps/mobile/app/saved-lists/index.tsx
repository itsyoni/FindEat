import { EmptyState, Skeleton, SkeletonPulse } from "@/components/common";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import SearchBar from "@/components/common/inputs/SearchBar";
import PlaceListCard from "@/components/lists/PlaceListCard";
import Avatar from "@/components/common/Avatar";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import type { PlaceListInvitation, PlaceListSummary } from "@findeat/types";
import { router, useFocusEffect } from "expo-router";
import { FolderSimpleIcon, PlusIcon, UserPlusIcon } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SavedListsScreen() {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [lists, setLists] = useState<PlaceListSummary[]>([]);
  const [invitations, setInvitations] = useState<PlaceListInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResponse, setSearchResponse] = useState<{
    query: string;
    lists: PlaceListSummary[];
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextLists, nextInvitations] = await Promise.all([
        api.placeLists.mine(),
        api.placeLists.invitations(),
      ]);
      setLists(nextLists);
      setInvitations(nextInvitations);
    } catch {
      showToast(t("listsLoadError"), { kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const search = query.trim();
    if (!search) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void api.placeLists
        .mine(search)
        .then((results) => {
          if (!cancelled) setSearchResponse({ query: search, lists: results });
        })
        .catch(() => {
          if (!cancelled) setSearchResponse({ query: search, lists: [] });
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const visibleLists = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return lists;
    if (searchResponse?.query.toLocaleLowerCase() === search) {
      return searchResponse.lists;
    }
    return lists.filter((list) =>
      list.name.toLocaleLowerCase().includes(search),
    );
  }, [lists, query, searchResponse]);

  async function respondToInvitation(
    invitation: PlaceListInvitation,
    accept: boolean,
  ) {
    try {
      await api.placeLists.respondToInvitation(invitation.id, accept);
      setInvitations((current) =>
        current.filter((item) => item.id !== invitation.id),
      );
      if (accept) await load();
      showToast(t(accept ? "listInvitationAccepted" : "listInvitationDeclined"));
    } catch {
      showToast(t("listInvitationError"), { kind: "error" });
    }
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          hitSlop={12}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center"
        >
          <DirectionalIcon
            direction="back"
            variant="arrow"
            size={24}
            color={isDark ? "#FAF9F6" : "#171717"}
          />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("myLists")}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t("searchListsAndRestaurants")}
        rightAccessory={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("createNewList")}
            onPress={() => router.push("/saved-lists/create")}
            className="h-full aspect-square items-center justify-center rounded-2xl bg-brand"
          >
            <PlusIcon size={23} color="#FAF9F6" weight="bold" />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <SkeletonPulse>
          <View className="flex-row flex-wrap justify-between px-5 pt-4">
            {[0, 1, 2, 3].map((item) => (
              <View key={item} className="mb-5 w-[48%]">
                <Skeleton height={160} radius={22} />
                <Skeleton width="75%" height={17} radius={6} style={{ marginTop: 10 }} />
                <Skeleton width="40%" height={13} radius={6} style={{ marginTop: 7 }} />
              </View>
            ))}
          </View>
        </SkeletonPulse>
      ) : (
        <FlatList
          data={visibleLists}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 28,
          }}
          renderItem={({ item }) => (
            <PlaceListCard
              list={item}
              onPress={() =>
                router.push({
                  pathname: "/saved-lists/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          ListHeaderComponent={
            invitations.length && !query.trim() ? (
              <View className="mb-4">
                <View className="mb-2 flex-row items-center">
                  <UserPlusIcon size={19} color="#D97706" weight="fill" />
                  <Text className="ml-2 text-lg font-bold text-black dark:text-white">
                    {t("listInvitations")}
                  </Text>
                </View>
                {invitations.map((invitation) => (
                  <View
                    key={invitation.id}
                    className="mb-2 flex-row items-center rounded-2xl border border-amber-100 bg-white p-3 dark:border-amber-950 dark:bg-gray-900"
                  >
                    <Avatar
                      uri={invitation.invitedBy.avatarUrl}
                      username={invitation.invitedBy.username}
                      size={42}
                    />
                    <View className="ml-3 min-w-0 flex-1">
                      <Text numberOfLines={1} className="font-bold text-black dark:text-white">
                        {invitation.list.name}
                      </Text>
                      <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500">
                        {t("listInvitedBy", {
                          name: invitation.invitedBy.username,
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => void respondToInvitation(invitation, false)}
                      className="rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-800"
                    >
                      <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        {t("decline")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void respondToInvitation(invitation, true)}
                      className="ml-2 rounded-xl bg-amber-500 px-3 py-2"
                    >
                      <Text className="text-xs font-bold text-white">{t("accept")}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            query.trim() && searchResponse?.query !== query.trim() ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#D97706" />
              </View>
            ) : (
              <EmptyState
                icon={FolderSimpleIcon}
                title={t(query.trim() ? "noListSearchResults" : "noLists")}
                description={t(
                  query.trim()
                    ? "noListSearchResultsHint"
                    : "noListsHint",
                )}
              />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
