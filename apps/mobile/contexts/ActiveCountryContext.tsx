import Text from "@/components/common/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { ActiveCountry } from "@findeat/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";

type ActiveCountryContextValue = {
  activeCountry: ActiveCountry | null;
  isReady: boolean;
  setActiveCountry: (country: ActiveCountry) => Promise<void>;
  refreshDetectedCountry: () => Promise<void>;
};

type TravelPrompt = { detected: ActiveCountry; current: ActiveCountry };

const ActiveCountryContext = createContext<ActiveCountryContextValue | null>(null);
const DECLINE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `findeat.active-country.v1.${userId}`;
}

function declineKey(userId: string, countryCode: string) {
  return `findeat.active-country.declined.${userId}.${countryCode}`;
}

export function ActiveCountryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const [activeCountry, setStoredCountry] = useState<ActiveCountry | null>(null);
  const [travelPrompt, setTravelPrompt] = useState<TravelPrompt | null>(null);
  const [isReady, setIsReady] = useState(false);

  const setActiveCountry = useCallback(
    async (country: ActiveCountry) => {
      if (!user) return;
      const normalized = { ...country, code: country.code.toUpperCase() };
      setStoredCountry(normalized);
      setTravelPrompt(null);
      await AsyncStorage.setItem(storageKey(user.id), JSON.stringify(normalized));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["restaurant-search"] }),
        queryClient.invalidateQueries({ queryKey: ["map-restaurants"] }),
      ]);
    },
    [queryClient, user],
  );

  const refreshDetectedCountry = useCallback(async () => {
    if (!user) return;
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) return;
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 })) ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }));
    const result = (
      await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    )[0];
    const code = result?.isoCountryCode?.toUpperCase();
    if (!code) return;
    const detected: ActiveCountry = {
      code,
      name: result.country?.trim() || code,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    if (!activeCountry) {
      await setActiveCountry(detected);
      return;
    }
    if (activeCountry.code === code) return;
    const declinedAt = Number(
      await AsyncStorage.getItem(declineKey(user.id, code)),
    );
    if (Number.isFinite(declinedAt) && Date.now() - declinedAt < DECLINE_COOLDOWN_MS) {
      return;
    }
    setTravelPrompt({ current: activeCountry, detected });
  }, [activeCountry, setActiveCountry, user]);

  useEffect(() => {
    let cancelled = false;
    setIsReady(false);
    if (!user) {
      setStoredCountry(null);
      setTravelPrompt(null);
      setIsReady(true);
      return;
    }
    AsyncStorage.getItem(storageKey(user.id))
      .then((value) => {
        if (cancelled) return;
        if (value) setStoredCountry(JSON.parse(value) as ActiveCountry);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!isReady || !user) return;
    void refreshDetectedCountry().catch(() => undefined);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshDetectedCountry().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [isReady, refreshDetectedCountry, user]);

  const value = useMemo(
    () => ({ activeCountry, isReady, setActiveCountry, refreshDetectedCountry }),
    [activeCountry, isReady, refreshDetectedCountry, setActiveCountry],
  );

  return (
    <ActiveCountryContext.Provider value={value}>
      {children}
      {travelPrompt ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            style={[
              styles.prompt,
              { backgroundColor: isDark ? "#22211F" : "#F4F1EB" },
            ]}
          >
            <Text style={[styles.title, { color: isDark ? "#F6F3ED" : "#171614" }]}> 
              Switch discovery to {travelPrompt.detected.name}?
            </Text>
            <Text style={{ color: isDark ? "#BEB9B0" : "#68635D" }}>
              Your lists, trips, chats, and profile will stay unchanged.
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  if (user) {
                    void AsyncStorage.setItem(
                      declineKey(user.id, travelPrompt.detected.code),
                      String(Date.now()),
                    );
                  }
                  setTravelPrompt(null);
                }}
                style={styles.secondary}
              >
                <Text style={{ color: isDark ? "#F6F3ED" : "#171614" }}>
                  Keep {travelPrompt.current.name}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void setActiveCountry(travelPrompt.detected)}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>Switch</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ActiveCountryContext.Provider>
  );
}

export function useActiveCountry() {
  const value = useContext(ActiveCountryContext);
  if (!value) throw new Error("ActiveCountryProvider is missing");
  return value;
}

const styles = StyleSheet.create({
  prompt: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  secondary: { paddingHorizontal: 12, paddingVertical: 10 },
  primary: {
    borderRadius: 12,
    backgroundColor: "#F2A900",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryText: { color: "#17130A", fontWeight: "700" },
});
