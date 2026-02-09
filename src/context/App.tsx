import { VaultBase } from "@vultisig/sdk";
import { createContext } from "react";

import { App, FeeAppStatus } from "@/utils/types";

export type AppContextProps = {
  connect: () => void;
  disconnect: () => void;
  feeApp?: App;
  feeAppStatus?: FeeAppStatus;
  personalSign: (message: string, appId?: string) => Promise<string>;
  setVault: (vault: VaultBase) => void;
  startReshare: (appId: string) => Promise<boolean>;
  updateFeeAppStatus: () => void;
  vault?: VaultBase;
};

export const AppContext = createContext<AppContextProps | undefined>(undefined);
