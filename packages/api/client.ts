import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

type GetToken = () => string | null | Promise<string | null>;
type RefreshAccessToken = () => Promise<string | null>;
type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _findeatAuthRetry?: boolean;
};

export function createApiClient(
  baseURL: string,
  getToken?: GetToken,
  refreshAccessToken?: RefreshAccessToken,
) {
  const api = axios.create({ baseURL });

  const originalGet = api.get.bind(api);
  const pendingGets = new Map<string, ReturnType<typeof originalGet>>();

  api.get = ((url: string, config?: Parameters<typeof originalGet>[1]) => {
    const params = config?.params
      ? JSON.stringify(
          Object.entries(config.params as Record<string, unknown>).sort(
            ([left], [right]) => left.localeCompare(right),
          ),
        )
      : "";
    const key = `${url}?${params}`;
    const pending = pendingGets.get(key);

    if (pending) return pending;

    const request = originalGet(url, config).finally(() => {
      pendingGets.delete(key);
    });

    pendingGets.set(key, request);
    return request;
  }) as typeof api.get;

  api.interceptors.request.use(async (config) => {
    const token = getToken ? await getToken() : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  api.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._findeatAuthRetry ||
      !refreshAccessToken
    ) {
      throw error;
    }

    config._findeatAuthRetry = true;
    const accessToken = await refreshAccessToken();
    if (!accessToken) throw error;

    config.headers.Authorization = `Bearer ${accessToken}`;
    return api.request(config);
  });

  return api;
}
