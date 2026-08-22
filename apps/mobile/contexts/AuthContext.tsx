import { LANGUAGE_KEY } from "@/constants/storage";
import { api } from "@/lib/api";
import { applyAppLanguage, type AppLanguage } from "@/lib/appLanguage";
import type {
  AuthSession,
  SignupResult,
  SocialAuthInput,
  User,
} from "@findeat/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearStoredSession,
  getStoredRefreshToken,
  getStoredSession,
  setAuthSessionListeners,
  storeAuthSession,
  storeAuthTokens,
  storeSessionUser,
} from "@/lib/authSession";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  socialAuth: (payload: SocialAuthInput) => Promise<void>;
  reactivate: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    username: string,
    password: string,
  ) => Promise<SignupResult>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

function toAppLanguage(language?: User["language"]) {
  if (language === "HE") return "he";
  if (language === "RU") return "ru";
  return "en";
}

async function syncLanguage(user: User) {
  const appLanguage = toAppLanguage(user.language);
  await applyAppLanguage(appLanguage);
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function establishSession(session: AuthSession) {
    await storeAuthSession(session);
    await syncLanguage(session.user);

    queryClient.clear();

    setToken(session.accessToken);
    setUser(session.user);
  }

  const loadUser = useCallback(async () => {
    let cachedUser: User | null = null;
    try {
      const [savedSession, savedLanguage] = await Promise.all([
        getStoredSession(),
        AsyncStorage.getItem(LANGUAGE_KEY),
      ]);
      cachedUser = savedSession.user;

      if (savedLanguage === "en" || savedLanguage === "he" || savedLanguage === "ru") {
        await applyAppLanguage(savedLanguage);
      }

      if (!savedSession.accessToken && !savedSession.refreshToken) return;

      if (cachedUser) {
        setToken(savedSession.accessToken);
        setUser(cachedUser);
        // A cached signed-in session is enough to render the app. Validate it
        // in the background instead of holding the launch screen on a network
        // request (notably when the app is opened from a push notification).
        setIsLoading(false);
      }

      if (savedSession.accessToken && !savedSession.refreshToken) {
        const upgradedTokens = await api.auth.upgradeSession();
        await storeAuthTokens(upgradedTokens);
        setToken(upgradedTokens.accessToken);
      }

      const user = await api.auth.me();
      const currentSession = await getStoredSession();

      await syncLanguage(user);
      await storeSessionUser(user);

      setToken(currentSession.accessToken);
      setUser(user);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        await clearStoredSession();
        setToken(null);
        setUser(null);
      } else if (!cachedUser) {
        setToken(null);
        setUser(null);
      } else {
        console.warn(
          "[Startup] Session validation failed; using the cached session",
          isAxiosError(error) ? error.message : error,
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const session = await api.auth.login({
      email,
      password,
    });
    await establishSession(session);
  }

  async function socialAuth(payload: SocialAuthInput) {
    const session = await api.auth.socialAuth(payload);
    await establishSession(session);
  }

  async function reactivate(email: string, password: string) {
    const session = await api.auth.reactivateAccount({ email, password });
    await establishSession(session);
  }

  async function signup(
    email: string,
    username: string,
    password: string,
  ) {
    return api.auth.signup({
      email,
      username,
      password,
    });
  }

  async function verifyEmail(email: string, code: string) {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    const selectedLanguage: AppLanguage | null =
      savedLanguage === "en" || savedLanguage === "he" || savedLanguage === "ru"
        ? savedLanguage
        : null;
    const session = await api.auth.verifyEmail(email, code);
    await establishSession(session);
    if (!selectedLanguage) return;

    const serverLanguage = selectedLanguage.toUpperCase() as User["language"];
    if (session.user.language !== serverLanguage) {
      const updatedUser = await api.users.updateMe({ language: serverLanguage });
      await storeSessionUser(updatedUser);
      setUser(updatedUser);
    }
    await applyAppLanguage(selectedLanguage);
  }

  async function logout() {
    const refreshToken = await getStoredRefreshToken();
    try {
      if (refreshToken) await api.auth.logout(refreshToken);
    } catch (error) {
      console.error("Could not revoke refresh session", error);
    } finally {
      await clearStoredSession();
    }

    queryClient.clear();

    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const user = await api.auth.me();

    await syncLanguage(user);
    await storeSessionUser(user);

    setUser(user);
  }

  useEffect(
    () =>
      setAuthSessionListeners({
        onAccessToken: setToken,
        onSessionExpired: () => {
          queryClient.clear();
          setToken(null);
          setUser(null);
        },
      }),
    [queryClient],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadUser();
    });
    return () => cancelAnimationFrame(frame);
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        socialAuth,
        reactivate,
        signup,
        verifyEmail,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
