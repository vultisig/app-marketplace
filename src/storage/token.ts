import { storageKeys } from "@/storage/constants";
import { getState } from "@/storage/state/get";
import { setState } from "@/storage/state/set";
import { AuthToken } from "@/utils/types";

const initialTokens: Record<string, AuthToken> = {};

const getTokens = () => {
  return getState(storageKeys.token, initialTokens);
};

export const delToken = (key: string) => {
  const tokens = getTokens();
  delete tokens[key];
  setState(storageKeys.token, tokens);
};

export const getToken = (key: string) => {
  const tokens = getTokens();
  return tokens[key];
};

export const setToken = (key: string, token: AuthToken) => {
  const tokens = getTokens();
  tokens[key] = token;
  setState(storageKeys.token, tokens);
};
