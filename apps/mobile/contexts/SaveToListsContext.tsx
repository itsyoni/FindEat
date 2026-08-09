import AppBottomSheet from "@/components/common/AppBottomSheet";
import Text from "@/components/common/AppText";
import { updateRestaurantStatusInFeedCache } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { AppAlert as Alert } from "@/lib/appAlert";
import { useToast } from "@/contexts/ToastContext";
import type {
  PlaceListSummary,
  PlaceSaveStatus,
  UserRestaurant,
} from "@findeat/types";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookmarkSimpleIcon,
  CheckCircleIcon,
  CheckIcon,
  FolderSimpleIcon,
  HeartIcon,
  PlusIcon,
  TrashIcon,
} from "phosphor-react-native";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OpenSavedPlaceOptions = {
  restaurantId: string;
  currentStatus?: UserRestaurant | null;
  savedFromPostId?: string;
};

type SaveToListsContextValue = {
  openSaveToLists: (restaurantId: string) => void;
  openManageSavedPlace: (options: OpenSavedPlaceOptions) => void;
  quickSavePlace: (restaurantId: string, savedFromPostId?: string) => Promise<void>;
  savedListCounts: Readonly<Record<string, number>>;
  statusOverrides: Readonly<Record<string, UserRestaurant>>;
};

const SaveToListsContext = createContext<SaveToListsContextValue | null>(null);

export function getPlaceSaveStatus(
  status?: UserRestaurant | null,
): PlaceSaveStatus {
  if (status?.favorite) return "FAVORITE";
  if (status?.visited) return "VISITED";
  if (status?.wantToTry) return "WANT_TO_TRY";
  return "NONE";
}

function emptyStatus(restaurantId: string): UserRestaurant {
  return {
    id: `local-${restaurantId}`,
    wantToTry: false,
    visited: false,
    favorite: false,
  };
}

export function SaveToListsProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation("common");
  const isRtl = i18n.dir() === "rtl";
  const rtlTextStyle = isRtl
    ? ({ textAlign: "right", writingDirection: "rtl" } as const)
    : undefined;
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [savedFromPostId, setSavedFromPostId] = useState<string | undefined>();
  const [initialStatus, setInitialStatus] = useState<PlaceSaveStatus>("NONE");
  const [selectedStatus, setSelectedStatus] = useState<PlaceSaveStatus>("NONE");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, UserRestaurant>>({});
  const statusOverridesRef = useRef<Record<string, UserRestaurant>>({});
  const [savedListCounts, setSavedListCounts] = useState<Record<string, number>>({});
  const [lists, setLists] = useState<PlaceListSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState("");

  const close = useCallback(() => {
    setRestaurantId(null);
    setSavedFromPostId(undefined);
    setShowCreate(false);
    setNewListName("");
  }, []);

  const commitStatus = useCallback(
    (id: string, status: UserRestaurant) => {
      statusOverridesRef.current = {
        ...statusOverridesRef.current,
        [id]: status,
      };
      setStatusOverrides((current) => ({ ...current, [id]: status }));
      updateRestaurantStatusInFeedCache(queryClient, id, status);
      void queryClient.invalidateQueries({ queryKey: ["saved-post-attributions"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-restaurants"] });
    },
    [queryClient],
  );

  const openManageSavedPlace = useCallback(
    (options: OpenSavedPlaceOptions) => {
      const knownStatus =
        statusOverridesRef.current[options.restaurantId] ??
        options.currentStatus ??
        null;
      const knownPlaceStatus = getPlaceSaveStatus(knownStatus);
      setRestaurantId(options.restaurantId);
      setSavedFromPostId(options.savedFromPostId);
      setInitialStatus(knownPlaceStatus);
      setSelectedStatus(knownPlaceStatus);
      setLoading(true);
      setShowCreate(false);
      setNewListName("");

      void Promise.all([
        api.placeLists.forRestaurant(options.restaurantId),
        knownStatus
          ? Promise.resolve(knownStatus)
          : api.restaurants.get(options.restaurantId).then(
              (restaurant) => restaurant.userRestaurant ?? emptyStatus(options.restaurantId),
            ),
      ])
        .then(([result, resolvedStatus]) => {
          const latestStatus =
            statusOverridesRef.current[options.restaurantId] ?? resolvedStatus;
          setLists(result.lists);
          setSelectedIds(new Set(result.selectedListIds));
          setSavedListCounts((current) => ({
            ...current,
            [options.restaurantId]: result.selectedListIds.length,
          }));
          setInitialStatus(getPlaceSaveStatus(latestStatus));
          setSelectedStatus(getPlaceSaveStatus(latestStatus));
        })
        .catch(() => {
          Alert.alert(t("savedPlaceLoadError"));
          close();
        })
        .finally(() => setLoading(false));
    },
    [close, t],
  );

  const openSaveToLists = useCallback(
    (id: string) => openManageSavedPlace({ restaurantId: id }),
    [openManageSavedPlace],
  );

  const quickSavePlace = useCallback(
    async (id: string, sourcePostId?: string) => {
      const previous = statusOverridesRef.current[id];
      const optimistic = {
        ...(previous ?? emptyStatus(id)),
        wantToTry: true,
        visited: false,
        favorite: false,
      };
      commitStatus(id, optimistic);
      showToast(t("placeSavedQuickly"), {
        duration: 4200,
        actionLabel: t("addToList"),
        onAction: () =>
          openManageSavedPlace({
            restaurantId: id,
            currentStatus: optimistic,
            savedFromPostId: sourcePostId,
          }),
      });

      try {
        const saved = await api.restaurants.setSaveStatus(
          id,
          "WANT_TO_TRY",
          sourcePostId,
        );
        commitStatus(id, saved);
      } catch {
        commitStatus(id, previous ?? emptyStatus(id));
        Alert.alert(t("savedPlaceUpdateError"));
      }
    },
    [commitStatus, openManageSavedPlace, showToast, t],
  );

  const toggleList = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const chooseStatus = useCallback(
    (status: PlaceSaveStatus) => {
      if (status === "FAVORITE") {
        if (initialStatus !== "VISITED" && initialStatus !== "FAVORITE") {
          return;
        }
        setSelectedStatus((current) =>
          current === "FAVORITE" ? "VISITED" : "FAVORITE",
        );
        return;
      }
      if (
        status === "WANT_TO_TRY" &&
        (selectedStatus === "VISITED" || selectedStatus === "FAVORITE")
      ) {
        Alert.alert(t("changeVisitedToWantTitle"), t("changeVisitedToWantBody"), [
          { text: t("cancel"), style: "cancel" },
          { text: t("changeStatus"), onPress: () => setSelectedStatus(status) },
        ]);
        return;
      }
      setSelectedStatus(status);
    },
    [initialStatus, selectedStatus, t],
  );

  const createList = useCallback(async () => {
    const name = newListName.trim();
    if (!name || !restaurantId || creating) return;
    try {
      setCreating(true);
      const list = await api.placeLists.create({ name, restaurantId });
      setLists((current) => [list, ...current]);
      setSelectedIds((current) => new Set(current).add(list.id));
      setNewListName("");
      setShowCreate(false);
      showToast(t("listCreated"));
    } catch {
      Alert.alert(t("listCreateError"));
    } finally {
      setCreating(false);
    }
  }, [creating, newListName, restaurantId, showToast, t]);

  const save = useCallback(async () => {
    if (!restaurantId || saving) return;
    try {
      setSaving(true);
      const savedRestaurantId = restaurantId;
      const offerReview =
        (selectedStatus === "VISITED" || selectedStatus === "FAVORITE") &&
        initialStatus !== "VISITED" &&
        initialStatus !== "FAVORITE";
      const status = await api.restaurants.setSaveStatus(
        restaurantId,
        selectedStatus,
        savedFromPostId,
        selectedStatus === "NONE" && selectedIds.size === 0,
      );
      commitStatus(restaurantId, status);
      setInitialStatus(getPlaceSaveStatus(status));
      setSelectedStatus(getPlaceSaveStatus(status));
      const listResult = await api.placeLists.setRestaurantLists(
        restaurantId,
        Array.from(selectedIds),
      );
      setSavedListCounts((current) => ({
        ...current,
        [restaurantId]: listResult.selectedListIds.length,
      }));
      showToast(t("savedPlaceUpdated"));
      close();
      if (offerReview) {
        requestAnimationFrame(() => {
          Alert.alert(t("visitedReviewPromptTitle"), t("visitedReviewPromptBody"), [
            { text: t("notNow"), style: "cancel" },
            {
              text: t("createReview"),
              onPress: () =>
                router.push({
                  pathname: "/create/review",
                  params: { restaurantId: savedRestaurantId },
                }),
            },
          ]);
        });
      }
    } catch {
      if (
        selectedStatus === "WANT_TO_TRY" &&
        (initialStatus === "VISITED" || initialStatus === "FAVORITE")
      ) {
        Alert.alert(
          t("cannotRemoveSavedPlaceTitle"),
          t("cannotRemoveSavedPlaceBody"),
        );
      } else {
        Alert.alert(t("savedPlaceUpdateError"));
      }
    } finally {
      setSaving(false);
    }
  }, [close, commitStatus, initialStatus, restaurantId, savedFromPostId, saving, selectedIds, selectedStatus, showToast, t]);

  const removeSavedPlace = useCallback(
    (removeFromLists: boolean) => {
      if (!restaurantId || saving) return;
      void (async () => {
        try {
          setSaving(true);
          const status = await api.restaurants.setSaveStatus(
            restaurantId,
            "NONE",
            undefined,
            removeFromLists,
          );
          let remainingListCount = selectedIds.size;
          if (removeFromLists) {
            const listResult = await api.placeLists.setRestaurantLists(restaurantId, []);
            remainingListCount = listResult.selectedListIds.length;
          }
          commitStatus(restaurantId, status);
          setSavedListCounts((current) => ({
            ...current,
            [restaurantId]: remainingListCount,
          }));
          showToast(t("savedPlaceRemoved"));
          close();
        } catch {
          Alert.alert(t("cannotRemoveSavedPlaceTitle"), t("cannotRemoveSavedPlaceBody"));
        } finally {
          setSaving(false);
        }
      })();
    },
    [close, commitStatus, restaurantId, saving, selectedIds.size, showToast, t],
  );

  const confirmRemove = useCallback(() => {
    if (selectedIds.size > 0) {
      Alert.alert(t("removeSavedPlaceTitle"), t("removeSavedPlaceWithListsBody"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("keepInLists"), onPress: () => removeSavedPlace(false) },
        { text: t("removeEverywhere"), style: "destructive", onPress: () => removeSavedPlace(true) },
      ]);
      return;
    }
    Alert.alert(t("removeSavedPlaceTitle"), t("removeSavedPlaceBody"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("remove"), style: "destructive", onPress: () => removeSavedPlace(false) },
    ]);
  }, [removeSavedPlace, selectedIds.size, t]);

  const value = useMemo(
    () => ({
      openSaveToLists,
      openManageSavedPlace,
      quickSavePlace,
      savedListCounts,
      statusOverrides,
    }),
    [openManageSavedPlace, openSaveToLists, quickSavePlace, savedListCounts, statusOverrides],
  );

  const statusOptions = [
    { value: "WANT_TO_TRY" as const, label: t("wantToTry"), color: "#D1A928", Icon: BookmarkSimpleIcon },
    { value: "VISITED" as const, label: t("visited"), color: "#22C55E", Icon: CheckCircleIcon },
    { value: "FAVORITE" as const, label: t("favorite"), color: "#EF4444", Icon: HeartIcon },
  ];

  return (
    <SaveToListsContext.Provider value={value}>
      {children}
      <AppBottomSheet open={!!restaurantId} snapPoints={["84%"]} onClose={close}>
        <View className="flex-1 px-5 pt-1">
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <BookmarkSimpleIcon size={22} color="#D97706" weight="fill" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xl font-bold text-black dark:text-white">{t("manageSavedPlace")}</Text>
              <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t("manageSavedPlaceHint")}</Text>
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center"><ActivityIndicator color="#D97706" /></View>
          ) : (
            <BottomSheetScrollView
              style={{ marginTop: 24 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 18 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">{t("placeStatus")}</Text>
              <View className="flex-row gap-2">
                {statusOptions.map(({ value: status, label, color, Icon }) => {
                  const selected =
                    selectedStatus === status ||
                    (status === "VISITED" && selectedStatus === "FAVORITE");
                  const disabled =
                    (status === "FAVORITE" &&
                      initialStatus !== "VISITED" &&
                      initialStatus !== "FAVORITE") ||
                    (status === "WANT_TO_TRY" &&
                      (initialStatus === "VISITED" ||
                        initialStatus === "FAVORITE"));
                  return (
                    <TouchableOpacity
                      key={status}
                      disabled={disabled}
                      onPress={() => chooseStatus(status)}
                      className="flex-1 items-center rounded-2xl border px-2 py-3"
                      style={{
                        borderColor: selected
                          ? color
                          : disabled
                            ? "#E5E7EB"
                            : "#D1D5DB",
                        backgroundColor: selected ? `${color}18` : "transparent",
                        opacity: disabled ? 0.42 : 1,
                      }}
                    >
                      <Icon size={23} color={selected ? color : "#6B7280"} weight={selected ? "fill" : "regular"} />
                      <Text numberOfLines={1} className="mt-1.5 text-xs font-bold text-black dark:text-white">{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {initialStatus !== "VISITED" && initialStatus !== "FAVORITE" ? (
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("favoriteRequiresVisitHint")}
                </Text>
              ) : null}

              <View className="mb-2 mt-6 flex-row items-center">
                <FolderSimpleIcon size={18} color="#8B5CF6" weight="fill" />
                <Text className="ml-2 text-sm font-bold uppercase tracking-wide text-gray-500">{t("lists")}</Text>
              </View>
              {lists.map((list) => {
                const selected = selectedIds.has(list.id);
                return (
                  <TouchableOpacity
                    key={list.id}
                    disabled={!list.canEdit}
                    onPress={() => toggleList(list.id)}
                    className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                    style={{
                      opacity: list.canEdit ? 1 : 0.65,
                      flexDirection: isRtl ? "row-reverse" : "row",
                    }}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/60">
                      <FolderSimpleIcon size={21} color="#8B5CF6" weight={selected ? "fill" : "regular"} />
                    </View>
                    <View
                      className="min-w-0 flex-1"
                      style={isRtl ? { marginRight: 12 } : { marginLeft: 12 }}
                    >
                      <Text style={rtlTextStyle} numberOfLines={1} className="font-bold text-black dark:text-white">{list.name}</Text>
                      <Text style={rtlTextStyle} className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {list.canEdit ? t("placesCount", { count: list.itemCount }) : t("sharedListViewOnly")}
                      </Text>
                    </View>
                    <View className={`h-7 w-7 items-center justify-center rounded-full border ${selected ? "border-violet-500 bg-violet-500" : "border-gray-300 dark:border-gray-600"}`}>
                      {selected ? <CheckIcon size={15} color="#FAF9F6" weight="bold" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {showCreate ? (
                <View className="rounded-2xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900 dark:bg-violet-950/30">
                  <BottomSheetTextInput
                    autoFocus
                    value={newListName}
                    onChangeText={setNewListName}
                    placeholder={t("listNamePlaceholder")}
                    placeholderTextColor="#9CA3AF"
                    maxLength={80}
                    returnKeyType="done"
                    onSubmitEditing={() => void createList()}
                    className="rounded-xl bg-white px-4 py-3 text-base text-black dark:bg-gray-900 dark:text-white"
                  />
                  <View className="mt-3 flex-row justify-end gap-2">
                    <TouchableOpacity onPress={() => { setShowCreate(false); setNewListName(""); }} className="rounded-full px-4 py-2.5">
                      <Text className="font-bold text-gray-600 dark:text-gray-300">{t("cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={!newListName.trim() || creating} onPress={() => void createList()} className="rounded-full bg-violet-500 px-5 py-2.5" style={{ opacity: !newListName.trim() || creating ? 0.45 : 1 }}>
                      <Text className="font-bold text-white">{creating ? t("saving") : t("create")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowCreate(true)} className="flex-row items-center justify-center rounded-2xl border border-dashed border-violet-300 p-4 dark:border-violet-800">
                  <PlusIcon size={18} color="#8B5CF6" weight="bold" />
                  <Text className="ml-2 font-bold text-violet-700 dark:text-violet-300">{t("createNewList")}</Text>
                </TouchableOpacity>
              )}

              {initialStatus !== "NONE" ? (
                <TouchableOpacity onPress={confirmRemove} className="mt-5 flex-row items-center justify-center py-3">
                  <TrashIcon size={18} color="#EF4444" weight="bold" />
                  <Text className="ml-2 font-bold text-red-500">{t("removeSavedPlace")}</Text>
                </TouchableOpacity>
              ) : null}
            </BottomSheetScrollView>
          )}

          <TouchableOpacity
            disabled={loading || saving}
            onPress={() => void save()}
            className="mt-3 items-center rounded-2xl bg-black py-4 dark:bg-white"
            style={{ marginBottom: Math.max(insets.bottom, 8), opacity: loading || saving ? 0.5 : 1 }}
          >
            <Text className="font-bold text-white dark:text-black">{saving ? t("saving") : t("done")}</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>
    </SaveToListsContext.Provider>
  );
}

export function useSaveToLists() {
  const context = useContext(SaveToListsContext);
  if (!context) throw new Error("useSaveToLists must be used inside SaveToListsProvider");
  return context;
}
