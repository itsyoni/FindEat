import {
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  USER_SESSION_KEY,
} from "@/constants/storage";
import type { AuthSession, AuthTokens, User } from "@findeat/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";

type SessionListeners = {
  onAccessToken?: (accessToken: string) => void;
  onSessionExpired?: () => void;
};

let listeners: SessionListeners = {};
let refreshPromise: Promise<string | null> | null = null;

export function setAuthSessionListeners(nextListeners: SessionListeners) {
  listeners = nextListeners;
  return () => {
    if (listeners === nextListeners) listeners = {};
  };
}

export async function storeAuthSession(session: AuthSession) {
  await Promise.all([
    storeAuthTokens(session),
    AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session.user)),
  ]);
}

export async function storeAuthTokens(tokens: AuthTokens) {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function storeSessionUser(user: User) {
  await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
}

export async function getStoredSession() {
  const [accessToken, refreshToken, serializedUser] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.getItem(USER_SESSION_KEY),
  ]);
  let user: User | null = null;
  if (serializedUser) {
    try {
      user = JSON.parse(serializedUser) as User;
    } catch {
      await AsyncStorage.removeItem(USER_SESSION_KEY);
    }
  }
  return { accessToken, refreshToken, user };
}

export async function getStoredRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearStoredSession() {
  await Promise.all([
    AsyncStorage.multiRemove([TOKEN_KEY, USER_SESSION_KEY]),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export function refreshStoredSession(apiUrl: string) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getStoredRefreshToken();
    if (!refreshToken) return null;

    try {
      const { data } = await axios.post<AuthTokens>(`${apiUrl}/auth/refresh`, {
        refreshToken,
      });
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, data.accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken),
      ]);
      listeners.onAccessToken?.(data.accessToken);
      return data.accessToken;
    } catch (error) {
      if (
        isAxiosError(error) &&
        (error.response?.status === 400 || error.response?.status === 401)
      ) {
        await clearStoredSession();
        listeners.onSessionExpired?.();
        return null;
      }
      throw error;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
