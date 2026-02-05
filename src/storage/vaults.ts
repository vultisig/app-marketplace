import { storageKeys } from "@/storage/constants";
import { getState } from "@/storage/state/get";
import { setState } from "@/storage/state/set";
import { AuthToken, Vault } from "@/utils/types";

export const getVaults = () => {
  const vaults: (Vault & AuthToken)[] = [];

  return getState(storageKeys.vaults, vaults);
};

export const setVaults = (vaults: (Vault & AuthToken)[]) => {
  setState(storageKeys.vaults, vaults);
};
