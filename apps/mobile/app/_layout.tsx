import "@/i18n";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useFonts } from "expo-font";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import {
  configureReanimatedLogger,
  ReducedMotionConfig,
  ReduceMotion,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./../global.css";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useAppTheme } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PortalHost } from "@gorhom/portal";
import { LoadingScreen } from "@/components/common";
import WhatsNewModal from "@/components/updates/WhatsNewModal";
import { ToastProvider } from "@/contexts/ToastContext";
import { AppAlertProvider } from "@/contexts/AppAlertContext";
import {
  AccessibilityProvider,
  useAccessibilityPreferences,
} from "@/contexts/AccessibilityContext";
import { SaveToListsProvider } from "@/contexts/SaveToListsContext";
import { KeyboardProvider } from "react-native-keyboard-controller";
import PresenceConnection from "@/components/presence/PresenceConnection";
import { PostUploadProvider } from "@/contexts/PostUploadContext";
import { SnapIndicatorProvider } from "@/contexts/SnapIndicatorContext";

// The reduced-motion override intentionally emits a warning whenever it
// mounts. Keep genuine Reanimated errors visible without noisy dev notices.
configureReanimatedLogger({ level: ReanimatedLogLevel.error, strict: true });

if (__DEV__) {
  // Native navigation animations can finish after Fast Refresh has already
  // detached its JS listener. This is a React Native reload-only warning.
  LogBox.ignoreLogs([
    "Sending `onAnimatedValueUpdate` with no listeners registered.",
  ]);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 30 * 60_000,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CabinetThin: require("../assets/fonts/CabinetGrotesk/CabinetGrotesk-Thin.otf"),
    CabinetExtraLight: require("../assets/fonts/CabinetGrotesk/CabinetGrotesk-Extralight.otf"),
    CabinetLight: require("../assets/fonts/CabinetGrotesk/CabinetGrotesk-Light.otf"),
    CabinetRegular: require("../assets/fonts/CabinetGrotesk/CabinetGrotesk-Regular.otf"),
    CabinetMedium: require("../assets/fonts/CabinetGrotesk/CabinetGrotesk-Medium.otf"),
    CabinetBold: require("../assets/fonts/CabinetGrotesk/CabinetGrotesk-Bold.otf"),
    CabinetExtraBold: require("../assets/fonts/CabinetGrotesk/CabinetGrotesk-Extrabold.otf"),
    CabinetBlack: require("../assets/fonts/CabinetGrotesk/CabinetGrotesk-Black.otf"),
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AccessibilityProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <AppAlertProvider>
                <QueryClientProvider client={queryClient}>
                  <AuthProvider>
                    <SnapIndicatorProvider>
                      <ToastProvider>
                        <PostUploadProvider>
                          <NotificationProvider>
                            <BottomSheetModalProvider>
                              <AccessibilityMotionConfig />
                              <SaveToListsProvider>
                                <RootNavigator />
                              </SaveToListsProvider>
                              <PortalHost name="pinch-zoom" />
                            </BottomSheetModalProvider>
                          </NotificationProvider>
                        </PostUploadProvider>
                      </ToastProvider>
                    </SnapIndicatorProvider>
                  </AuthProvider>
                </QueryClientProvider>
              </AppAlertProvider>
            </SafeAreaProvider>
          </ThemeProvider>
        </AccessibilityProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function AccessibilityMotionConfig() {
  const { reduceMotion } = useAccessibilityPreferences();
  return (
    <ReducedMotionConfig
      mode={reduceMotion ? ReduceMotion.Always : ReduceMotion.Never}
    />
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { isDark } = useAppTheme();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === "(auth)";

    if (!user && !inAuthScreen) {
      router.replace("/(auth)");
    }

    if (user && inAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) return <LoadingScreen variant="feed" />;

  return (
    <>
      <Stack initialRouteName={user ? "(tabs)" : "(auth)"}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(users)" options={{ headerShown: false }} />
        <Stack.Screen name="(profile)" options={{ headerShown: false }} />
        <Stack.Screen name="(posts)/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="posts/edit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="posts/connections/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="posts/contribute/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="posts/collaborators/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="create/content" options={{ headerShown: false }} />
        <Stack.Screen name="create/review" options={{ headerShown: false }} />
        <Stack.Screen name="create/snap" options={{ headerShown: false }} />
        <Stack.Screen name="snaps/[userId]" options={{ headerShown: false }} />
        <Stack.Screen name="business/index" />
        <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
        <Stack.Screen name="saved/index" options={{ headerShown: false }} />
        <Stack.Screen name="saved-lists/index" options={{ headerShown: false }} />
        <Stack.Screen name="saved-lists/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="saved-lists/edit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="saved-lists/members/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="saved-lists/location-search" options={{ headerShown: false }} />
        <Stack.Screen name="saved-lists/discover/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen
          name="chats/[id]"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: isDark ? "#080808" : "#FBFAF8",
            },
          }}
        />
        <Stack.Screen name="chats/info/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chats/starred/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chats/archived" options={{ headerShown: false }} />
        <Stack.Screen name="chats/search/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="restaurants/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="restaurants/post-feed" options={{ headerShown: false }} />
        <Stack.Screen name="menu-items/[id]" options={{ headerShown: false }} />
      </Stack>

      <StatusBar style={isDark ? "light" : "dark"} />
      {user ? <PresenceConnection /> : null}
      {user ? <WhatsNewModal /> : null}
    </>
  );
}
