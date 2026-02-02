import axios, { AxiosRequestConfig } from "axios";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

import { getToken, setToken } from "@/storage/token";
import { getVaultId } from "@/storage/vaultId";
import { storeApiUrl } from "@/utils/constants";
import { toCamelCase, toSnakeCase } from "@/utils/functions";
import { APIResponse, AuthToken } from "@/utils/types";

class TokenManager {
  private refreshPromise: Promise<AuthToken> | null = null;

  async check(token: AuthToken): Promise<AuthToken> {
    const now = dayjs().unix();

    try {
      const { exp } = jwtDecode<{ exp: number }>(token.accessToken);

      if (exp < now) return this.refresh(token);

      return token;
    } catch {
      throw new Error("Invalid token");
    }
  }

  async refresh({ refreshToken }: AuthToken): Promise<AuthToken> {
    // If a refresh is already happening, wait for it
    if (this.refreshPromise) return this.refreshPromise;

    // Start a new refresh
    this.refreshPromise = axios
      .post<APIResponse<AuthToken>>(
        `${storeApiUrl}/auth/refresh`,
        toSnakeCase({ refreshToken }),
        { headers: { accept: "application/json" } },
      )
      .then((res) => toCamelCase(res.data.data))
      .finally(() => {
        // Reset so future refreshes can happen
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }
}

const api = axios.create({
  baseURL: storeApiUrl,
  headers: { "Content-Type": "application/json" },
});
const tokenManager = new TokenManager();
let onUnauthorized: (() => void) | null = null;

api.interceptors.request.use(
  async (config) => {
    const publicKey = getVaultId();

    if (!publicKey) return config;

    const token = getToken(publicKey);

    if (!token) return config;

    const newToken = await tokenManager.check(token).catch(() => null);

    if (!newToken) return config;

    setToken(publicKey, newToken);

    return {
      ...config,
      headers: config.headers.setAuthorization(`Bearer ${newToken}`),
    };
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401 && onUnauthorized) onUnauthorized();

      const message =
        error.response.data?.error?.message || "An error occurred";

      return Promise.reject(new Error(message));
    }

    if (error.request) {
      return Promise.reject(
        new Error("Network error - please check your connection"),
      );
    }

    return Promise.reject(error);
  },
);

const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return api
    .delete<APIResponse<T>>(url, config)
    .then(({ data }) => toCamelCase(data.data));
};

const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return await api
    .get<APIResponse<T>>(url, config)
    .then(({ data }) => toCamelCase(data.data));
};

const post = async <T>(
  url: string,
  data?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return api
    .post<APIResponse<T>>(url, data, config)
    .then(({ data }) => toCamelCase(data.data));
};

const put = async <T>(
  url: string,
  data?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return api
    .put<APIResponse<T>>(url, data, config)
    .then(({ data }) => toCamelCase(data.data));
};

export const apiClient = {
  del,
  get,
  post,
  put,
};

export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};
