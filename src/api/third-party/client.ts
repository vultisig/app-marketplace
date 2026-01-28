import axios, { AxiosRequestConfig } from "axios";

import { toCamelCase } from "@/utils/functions";

const api = axios.create({ headers: { "Content-Type": "application/json" } });

const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return api.delete<T>(url, config).then(({ data }) => toCamelCase(data));
};

const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return await api.get<T>(url, config).then(({ data }) => toCamelCase(data));
};

const post = async <T>(
  url: string,
  data?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return api.post<T>(url, data, config).then(({ data }) => toCamelCase(data));
};

const put = async <T>(
  url: string,
  data?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return api.put<T>(url, data, config).then(({ data }) => toCamelCase(data));
};

export const thirdPartyClient = {
  del,
  get,
  post,
  put,
};
