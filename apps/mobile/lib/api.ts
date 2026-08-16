import AsyncStorage from "@react-native-async-storage/async-storage";
import { createApiClient, createApiFromClient } from "@findeat/api";
import { TOKEN_KEY } from "@/constants/storage";
import { refreshStoredSession } from "@/lib/authSession";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is missing. Configure it in the EAS environment.",
  );
}

export { API_URL };

export const apiClient = createApiClient(
  API_URL,
  () => AsyncStorage.getItem(TOKEN_KEY),
  () => refreshStoredSession(API_URL),
);

// A stalled mobile connection must not hold session restoration—and therefore
// the launch screen—forever. Upload transfers use their own request clients.
apiClient.defaults.timeout = 20_000;

export const api = createApiFromClient(apiClient);
