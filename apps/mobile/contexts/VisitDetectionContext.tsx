import Text from "@/components/common/AppText";
import { AppAlert as Alert } from "@/lib/appAlert";
import { useAuth } from "@/contexts/AuthContext";
import {
  recordVisitDetectionSession,
  shouldIntroduceVisitDetection,
} from "@/lib/visitDetection/engagement";
import {
  disableVisitDetection,
  enableVisitDetection,
  processForegroundVisitLocation,
  refreshVisitGeofences,
  suspendVisitDetection,
} from "@/lib/visitDetection/manager";
import {
  defaultVisitDetectionPreferences,
  getVisitDetectionPreferences,
  saveVisitDetectionPreferences,
  setActiveVisitDetectionUser,
} from "@/lib/visitDetection/storage";
import type { VisitDetectionPreferences } from "@findeat/types";
import * as Location from "expo-location";
import { usePathname } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Modal, TouchableOpacity, View } from "react-native";
import { MapPinIcon, ShieldCheckIcon, XIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";

type VisitDetectionContextValue = {
  preferences: VisitDetectionPreferences;
  loading: boolean;
  enabling: boolean;
  showDisclosure: () => void;
  disable: () => Promise<void>;
  refresh: () => Promise<void>;
};

const VisitDetectionContext = createContext<VisitDetectionContextValue | null>(
  null,
);

export function useVisitDetection() {
  const value = useContext(VisitDetectionContext);
  if (!value) throw new Error("VisitDetectionProvider is missing");
  return value;
}

export function VisitDetectionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation("visitDetection");
  const pathname = usePathname();
  const [preferences, setPreferences] = useState(
    defaultVisitDetectionPreferences,
  );
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [prompt, setPrompt] = useState<"intro" | "disclosure" | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const enablingRef = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setPreferences(defaultVisitDetectionPreferences);
      setLoading(false);
      return;
    }
    const stored = await getVisitDetectionPreferences(user.id);
    setPreferences(stored);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    void recordVisitDetectionSession(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !user.createdAt || loading || preferences.enabled) return;
    if (pathname.startsWith("/create") || pathname.startsWith("/settings")) return;
    let active = true;
    const timer = setTimeout(() => {
      void shouldIntroduceVisitDetection(user.id, user.createdAt).then(
        (eligible) => {
          if (active && eligible) setPrompt("intro");
        },
      );
    }, 1_500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loading, pathname, preferences.enabled, user?.createdAt, user?.id]);

  useEffect(() => {
    if (!user?.id || !preferences.enabled) return;
    void setActiveVisitDetectionUser(user.id, i18n.language);
    void refreshVisitGeofences(user.id).then(setPreferences).catch((error) =>
      console.warn("Could not refresh visit detection", error),
    );
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshVisitGeofences(user.id)
          .then(setPreferences)
          .catch((error) =>
            console.warn("Could not refresh visit detection", error),
          );
      }
    });
    return () => appState.remove();
  }, [i18n.language, preferences.enabled, user?.id]);

  useEffect(() => {
    if (!user?.id || !preferences.enabled || preferences.mode !== "FOREGROUND") {
      return;
    }
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 75,
        timeInterval: 60_000,
      },
      (location) => {
        void processForegroundVisitLocation(user.id, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      },
    ).then((result) => {
      if (cancelled) result.remove();
      else subscription = result;
    }).catch((error) =>
      console.warn("Could not start foreground visit detection", error),
    );
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [preferences.enabled, preferences.mode, user?.id]);

  useEffect(() => {
    const previousUserId = lastUserIdRef.current;
    if (previousUserId && previousUserId !== user?.id) {
      void suspendVisitDetection(previousUserId);
    }
    lastUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const enable = useCallback(async () => {
    if (!user?.id || enablingRef.current) return;
    enablingRef.current = true;
    setEnabling(true);
    try {
      const next = await enableVisitDetection(user.id, i18n.language);
      setPreferences(next);
      setPrompt(null);
    } catch (error) {
      console.warn("Could not enable visit detection", error);
      Alert.alert(t("permissionErrorTitle"), t("permissionErrorBody"));
    } finally {
      enablingRef.current = false;
      setEnabling(false);
    }
  }, [i18n.language, t, user?.id]);

  const dismissIntro = useCallback(async () => {
    if (!user?.id) return;
    const next = {
      ...preferences,
      promptSeen: true,
      promptDismissedAt: Date.now(),
    };
    setPreferences(next);
    setPrompt(null);
    await saveVisitDetectionPreferences(user.id, next);
  }, [preferences, user?.id]);

  const closePrompt = useCallback(() => {
    if (prompt === "intro") void dismissIntro();
    else setPrompt(null);
  }, [dismissIntro, prompt]);

  const disable = useCallback(async () => {
    if (!user?.id) return;
    setPreferences(await disableVisitDetection(user.id));
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setPreferences(await refreshVisitGeofences(user.id, true));
  }, [user?.id]);

  const value = useMemo(
    () => ({
      preferences,
      loading,
      enabling,
      showDisclosure: () => setPrompt("disclosure"),
      disable,
      refresh,
    }),
    [disable, enabling, loading, preferences, refresh],
  );

  return (
    <VisitDetectionContext.Provider value={value}>
      {children}
      <Modal
        visible={prompt !== null}
        transparent
        animationType="fade"
        onRequestClose={closePrompt}
      >
        <View className="flex-1 justify-end bg-[#171717]/45 px-4 pb-5">
          <View className="rounded-[28px] bg-[#FBFAF8] p-5 dark:bg-[#171719]">
            <TouchableOpacity
              onPress={closePrompt}
              className="absolute right-4 top-4 z-10 h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <XIcon size={18} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#FFF0E6] dark:bg-[#3A211C]">
              {prompt === "disclosure" ? (
                <ShieldCheckIcon size={30} color="#FF5B35" weight="duotone" />
              ) : (
                <MapPinIcon size={30} color="#FF5B35" weight="fill" />
              )}
            </View>
            <Text className="pr-10 text-2xl font-bold text-[#171717] dark:text-[#F5F2EC]">
              {t(prompt === "disclosure" ? "disclosureTitle" : "introTitle")}
            </Text>
            <Text className="mt-2 text-base leading-6 text-gray-600 dark:text-gray-300">
              {t(prompt === "disclosure" ? "disclosureBody" : "introBody")}
            </Text>
            {prompt === "disclosure" ? (
              <View className="mt-4 rounded-2xl bg-gray-100 p-4 dark:bg-gray-800">
                <Text className="text-sm leading-5 text-gray-600 dark:text-gray-300">
                  {t("privacyPromise")}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              disabled={enabling}
              onPress={() =>
                prompt === "intro" ? setPrompt("disclosure") : void enable()
              }
              className="mt-5 items-center rounded-2xl bg-[#171717] py-4 dark:bg-[#F5F2EC]"
            >
              <Text className="font-bold text-[#F5F2EC] dark:text-[#171717]">
                {enabling ? t("enabling") : t("enable")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={enabling}
              onPress={() =>
                prompt === "intro" ? void dismissIntro() : setPrompt(null)
              }
              className="mt-2 items-center py-3"
            >
              <Text className="font-bold text-gray-500">
                {t(prompt === "intro" ? "maybeLater" : "cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </VisitDetectionContext.Provider>
  );
}
