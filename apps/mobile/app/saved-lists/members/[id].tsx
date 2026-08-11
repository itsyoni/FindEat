import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";
import { AppAlert as Alert } from "@/lib/appAlert";
import type {
  PlaceListDetail,
  PlaceListMember,
  PlaceListMemberRole,
  PlaceListSentInvitation,
  UserSearchResult,
} from "@findeat/types";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { HourglassIcon, MagnifyingGlassIcon, UserPlusIcon, UsersThreeIcon, XIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SavedListMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [list, setList] = useState<PlaceListDetail | null>(null);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [sentInvitations, setSentInvitations] = useState<PlaceListSentInvitation[]>([]);
  const [query, setQuery] = useState("");
  const [inviteRole, setInviteRole] = useState<PlaceListMemberRole>("EDITOR");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const value = await api.placeLists.get(id);
      setList(value);
      if (value.canInvite) {
        const [friends, invitations] = await Promise.all([
          api.users.suggestedFriends(),
          api.placeLists.sentInvitations(value.id),
        ]);
        setSuggestions(friends);
        setSentInvitations(invitations);
      }
    } catch {
      showToast(t("listLoadError"), { kind: "error" });
    }
  }, [id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function search(text: string) {
    setQuery(text);
    if (!list?.canInvite) return;
    try {
      setSuggestions(
        text.trim()
          ? await api.users.searchFriends(text.trim())
          : await api.users.suggestedFriends(),
      );
    } catch {
      setSuggestions([]);
    }
  }

  async function invite(user: UserSearchResult) {
    if (!list || workingId) return;
    setWorkingId(user.id);
    try {
      await api.placeLists.invite(list.id, user.id, inviteRole);
      setSuggestions((current) => current.filter((item) => item.id !== user.id));
      setSentInvitations(await api.placeLists.sentInvitations(list.id));
      showToast(t("listInviteSent"));
    } catch {
      showToast(t("listInviteError"), { kind: "error" });
    } finally {
      setWorkingId(null);
    }
  }

  async function changeInvitationRole(
    invitation: PlaceListSentInvitation,
    role: PlaceListMemberRole,
  ) {
    if (!list || invitation.role === role || workingId) return;
    setWorkingId(invitation.id);
    try {
      setSentInvitations(
        await api.placeLists.updateInvitation(list.id, invitation.id, role),
      );
      showToast(t("listInvitationRoleUpdated"));
    } catch {
      showToast(t("listInvitationManageError"), { kind: "error" });
    } finally {
      setWorkingId(null);
    }
  }

  function confirmRevokeInvitation(invitation: PlaceListSentInvitation) {
    if (!list) return;
    Alert.alert(
      t("revokeListInvitation"),
      t("revokeListInvitationDescription", {
        name: invitation.invitee.username,
      }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("revoke"),
          style: "destructive",
          onPress: () => void revokeInvitation(invitation),
        },
      ],
    );
  }

  async function revokeInvitation(invitation: PlaceListSentInvitation) {
    if (!list || workingId) return;
    setWorkingId(invitation.id);
    try {
      setSentInvitations(
        await api.placeLists.revokeInvitation(list.id, invitation.id),
      );
      showToast(t("listInvitationRevoked"));
    } catch {
      showToast(t("listInvitationManageError"), { kind: "error" });
    } finally {
      setWorkingId(null);
    }
  }

  function manageMember(member: PlaceListMember) {
    if (!list || list.accessRole !== "OWNER" || member.role === "OWNER") return;
    Alert.alert(
      member.username,
      t("manageListMember"),
      [
        {
          text: t("makeEditor"),
          onPress: () => void changeRole(member, "EDITOR"),
        },
        {
          text: t("makeViewer"),
          onPress: () => void changeRole(member, "VIEWER"),
        },
        {
          text: t("removeMember"),
          style: "destructive",
          onPress: () => void removeMember(member),
        },
        { text: t("cancel"), style: "cancel" },
      ],
    );
  }

  async function changeRole(member: PlaceListMember, role: PlaceListMemberRole) {
    if (!list) return;
    try {
      setList(await api.placeLists.updateMember(list.id, member.id, role));
      showToast(t("listMemberUpdated"));
    } catch {
      showToast(t("listMemberUpdateError"), { kind: "error" });
    }
  }

  async function removeMember(member: PlaceListMember) {
    if (!list) return;
    try {
      setList(await api.placeLists.removeMember(list.id, member.id));
      showToast(t("listMemberRemoved"));
    } catch {
      showToast(t("listMemberUpdateError"), { kind: "error" });
    }
  }

  const memberIds = new Set(list?.members.map((member) => member.id) ?? []);
  const availableSuggestions = suggestions.filter(
    (user) =>
      !memberIds.has(user.id) &&
      !sentInvitations.some((invitation) => invitation.invitee.id === user.id),
  );

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}
    >
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center">
          <DirectionalIcon direction="back" variant="arrow" size={24} color={isDark ? "#FAF9F6" : "#171717"} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black dark:text-white">
          {t("listMembers")}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <FlatList
        data={list?.members ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            disabled={list?.accessRole !== "OWNER" || item.role === "OWNER"}
            onPress={() => manageMember(item)}
            className="mb-2 flex-row items-center rounded-2xl bg-white p-3 dark:bg-gray-900"
          >
            <Avatar uri={item.avatarUrl} username={item.username} size={46} />
            <View className="ml-3 min-w-0 flex-1">
              <Text numberOfLines={1} className="font-bold text-black dark:text-white">
                {item.username}
              </Text>
              <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500">
              </Text>
            </View>
            <View className="rounded-full bg-amber-50 px-3 py-1.5 dark:bg-amber-950/40">
              <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {t(`listRoles.${item.role}`)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View>
            <View className="mb-4 flex-row items-center">
              <UsersThreeIcon size={22} color="#D97706" weight="fill" />
              <Text className="ml-2 text-lg font-bold text-black dark:text-white">
                {t("sharedWithPeople", { count: list?.memberCount ?? 0 })}
              </Text>
            </View>
            {list?.canInvite ? (
              <View className="mb-6 rounded-[22px] bg-white p-4 dark:bg-gray-900">
                <Text className="font-bold text-black dark:text-white">{t("inviteFriends")}</Text>
                <View className="mt-3 flex-row items-center rounded-2xl bg-gray-100 px-3 dark:bg-gray-800">
                  <MagnifyingGlassIcon size={19} color="#9CA3AF" />
                  <TextInput
                    value={query}
                    onChangeText={(text) => void search(text)}
                    placeholder={t("searchFriends")}
                    placeholderTextColor="#9CA3AF"
                    className="ml-2 min-h-12 flex-1 text-black dark:text-white"
                  />
                </View>
                <View className="mt-3 flex-row gap-2">
                  {(["EDITOR", "VIEWER"] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      onPress={() => setInviteRole(role)}
                      className={`rounded-full px-3 py-2 ${inviteRole === role ? "bg-amber-500" : "bg-gray-100 dark:bg-gray-800"}`}
                    >
                      <Text className={`text-xs font-bold ${inviteRole === role ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
                        {t(`listRoles.${role}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {availableSuggestions.slice(0, 6).map((user) => (
                  <View key={user.id} className="mt-3 flex-row items-center">
                    <Avatar uri={user.avatarUrl} username={user.username} size={40} />
                    <View className="ml-3 min-w-0 flex-1">
                      <Text numberOfLines={1} className="font-bold text-black dark:text-white">
                        {userDisplayName(user)}
                      </Text>
                      {user.displayName?.trim() ? (
                        <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {usernameLabel(user.username)}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      disabled={workingId !== null}
                      onPress={() => void invite(user)}
                      className="h-9 flex-row items-center rounded-xl bg-amber-500 px-3"
                    >
                      {workingId === user.id ? (
                        <ActivityIndicator size="small" color="#FAF9F6" />
                      ) : (
                        <>
                          <UserPlusIcon size={16} color="#FAF9F6" weight="bold" />
                          <Text className="ml-1.5 text-xs font-bold text-white">{t("invite")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
            {list?.canInvite && sentInvitations.length > 0 ? (
              <View className="mb-6">
                <View className="mb-2 flex-row items-center">
                  <HourglassIcon size={17} color="#D97706" weight="fill" />
                  <Text className="ml-2 text-sm font-bold text-gray-500">
                    {t("pendingSentInvitations")}
                  </Text>
                </View>
                {sentInvitations.map((invitation) => (
                  <View
                    key={invitation.id}
                    className="mb-2 rounded-2xl bg-white p-3 dark:bg-gray-900"
                  >
                    <View className="flex-row items-center">
                      <Avatar
                        uri={invitation.invitee.avatarUrl}
                        username={invitation.invitee.username}
                        size={42}
                      />
                      <View className="ml-3 min-w-0 flex-1">
                        <Text numberOfLines={1} className="font-bold text-black dark:text-white">
                          {invitation.invitee.username}
                        </Text>
                        <Text numberOfLines={1} className="text-xs text-gray-500">
                          {t("invitationPending")}
                        </Text>
                      </View>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("revokeListInvitation")}
                        disabled={workingId !== null}
                        hitSlop={8}
                        onPress={() => confirmRevokeInvitation(invitation)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30"
                      >
                        {workingId === invitation.id ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <XIcon size={17} color="#DC2626" weight="bold" />
                        )}
                      </TouchableOpacity>
                    </View>
                    <View className="mt-3 flex-row gap-2 pl-[54px]">
                      {(["EDITOR", "VIEWER"] as const).map((role) => (
                        <TouchableOpacity
                          key={role}
                          disabled={workingId !== null}
                          onPress={() => void changeInvitationRole(invitation, role)}
                          className={`rounded-full px-3 py-2 ${invitation.role === role ? "bg-amber-500" : "bg-gray-100 dark:bg-gray-800"}`}
                        >
                          <Text className={`text-xs font-bold ${invitation.role === role ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
                            {t(`listRoles.${role}`)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            <Text className="mb-2 text-sm font-bold text-gray-500">{t("currentMembers")}</Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-10">
            <UsersThreeIcon size={34} color="#9CA3AF" weight="duotone" />
          </View>
        }
      />
    </SafeAreaView>
  );
}
