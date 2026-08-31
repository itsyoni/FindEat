import Constants from "expo-constants";
import { Platform } from "react-native";

export const SOCKET_CLIENT_METADATA = {
  platform: Platform.OS,
  appVersion: Constants.expoConfig?.version ?? "unknown",
} as const;
