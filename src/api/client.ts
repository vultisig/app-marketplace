import axios, { AxiosRequestConfig } from "axios";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

import { getVaults, setVaults } from "@/storage/vaults";
import { storeApiUrl } from "@/utils/constants";
import { toCamelCase, toSnakeCase } from "@/utils/functions";
import { APIResponse, AuthToken } from "@/utils/types";

class TokenManager {
  private refreshPromise: Promise<AuthToken> | null = null;

  private isExpired(token: string): boolean {
    try {
      const { exp } = jwtDecode<{ exp: number }>(token);

      return exp < dayjs().unix();
    } catch {
      return true;
    }
  }

  async check(token: AuthToken): Promise<AuthToken | null> {
    const { accessToken, refreshToken } = token;

    const isAccessTokenExpired = this.isExpired(accessToken);

    if (isAccessTokenExpired) {
      const isRefreshTokenExpired = this.isExpired(refreshToken);

      if (isRefreshTokenExpired) return null;

      const newToken = await this.refresh(refreshToken).catch(() => null);

      return newToken;
    } else {
      return token;
    }
  }

  async refresh(refreshToken: string): Promise<AuthToken> {
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
    const vaults = getVaults();
    const [vault, ...rest] = vaults;

    if (!vault) return config;

    const { accessToken, refreshToken } = vault;

    const token = await tokenManager.check({ accessToken, refreshToken });

    if (!token) return config;

    setVaults([{ ...vault, ...token }, ...rest]);

    return {
      ...config,
      headers: config.headers.setAuthorization(`Bearer ${token.accessToken}`),
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
//TODO: remove this function after backend fully migrate to new APIResponse format
const getFlexible = async <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return await api.get<APIResponse<T> | T>(url, config).then(({ data }) => {
    // Try to detect if it's wrapped in APIResponse format
    if (
      data &&
      typeof data === "object" &&
      "data" in data &&
      "status" in data &&
      "timestamp" in data
    ) {
      // It's an APIResponse<T>, extract the data field
      return toCamelCase((data as APIResponse<T>).data);
    }
    // It's already in the direct format T
    return toCamelCase(data as T);
  });
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
  //TODO: remove getFlexible after backend fully migrate to new APIResponse format
  getFlexible,
  post,
  put,
  tokenManager,
};

export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};
