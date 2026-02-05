import { MemoryStorage, VaultBase, Vultisig } from "@vultisig/sdk";
import { message as Message, Modal } from "antd";
import { hexlify, randomBytes } from "ethers";
import { jwtDecode } from "jwt-decode";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";

import { setUnauthorizedHandler } from "@/api/client";
import { delAuthToken, getAuthToken, getFeeAppStatus } from "@/api/store";
import { getBaseValue } from "@/api/third-party/crypto";
import { CoreContext, CoreContextProps } from "@/context/Core";
import { useQueries } from "@/hooks/useQueries";
import { storageKeys } from "@/storage/constants";
import {
  getCurrency,
  setCurrency as setCurrencyStorage,
} from "@/storage/currency";
import { useLocalStorageWatcher } from "@/storage/hooks/useLocalStorageWatcher";
import { getTheme, setTheme as setThemeStorage } from "@/storage/theme";
import { getVaults, setVaults } from "@/storage/vaults";
import { feeAppId } from "@/utils/constants";
import { Currency } from "@/utils/currency";
import {
  connect as connectToExtension,
  disconnect as disconnectFromExtension,
  getVault,
  personalSign,
} from "@/utils/extension";
import { Theme } from "@/utils/theme";
import { Vault } from "@/utils/types";

type StateProps = Pick<
  CoreContextProps,
  | "address"
  | "baseValue"
  | "currency"
  | "feeApp"
  | "feeAppStatus"
  | "theme"
  | "vault"
>;

export const CoreProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StateProps>({
    baseValue: 1,
    currency: getCurrency(),
    theme: getTheme(),
  });
  const { address, baseValue, currency, feeApp, feeAppStatus, theme, vault } =
    state;
  const [messageAPI, messageHolder] = Message.useMessage();
  const [modalAPI, modalHolder] = Modal.useModal();
  const { getAppData } = useQueries();

  const clear = useCallback(() => {
    disconnectFromExtension().finally(() => {
      setVaults([]);
      setState((prevState) => ({
        ...prevState,
        address: undefined,
        vault: undefined,
      }));
    });
  }, []);

  const connect = useCallback(() => {
    const [vault] = getVaults();

    if (vault) {
      initVault(vault).then((sdkVault) => {
        setState((prevState) => ({
          ...prevState,
          address,
          vault: sdkVault,
        }));
      });
    } else {
      connectToExtension()
        .then((address: string) =>
          getVault()
            .then(async (vault) => {
              return initVault(vault).then((sdkVault) => {
                const nonce = hexlify(randomBytes(16));
                const expiryTime = new Date(
                  Date.now() + 15 * 60 * 1000,
                ).toISOString();

                const message = JSON.stringify({
                  message: "Sign into Vultisig Plugin Marketplace",
                  nonce: nonce,
                  expiresAt: expiryTime,
                  address,
                });

                personalSign(address, message, "connect").then((signature) =>
                  getAuthToken({
                    chainCodeHex: vault.hexChainCode,
                    publicKey: vault.publicKeyEcdsa,
                    signature,
                    message,
                  })
                    .then(({ accessToken, refreshToken }) => {
                      setVaults([{ ...vault, accessToken, refreshToken }]);

                      setState((prevState) => ({
                        ...prevState,
                        address,
                        vault: sdkVault,
                      }));

                      messageAPI.success("Successfully authenticated!");
                    })
                    .catch(() => {
                      messageAPI.error("Authentication failed!");
                    }),
                );
              });
            })
            .catch((error: Error) => {
              messageAPI.error(error.message);
              clear();
            }),
        )
        .catch((error: Error) => messageAPI.error(error.message));
    }
  }, [clear, messageAPI]);

  const disconnect = () => {
    modalAPI.confirm({
      title: "Are you sure you want to disconnect?",
      okText: "Yes",
      okType: "default",
      cancelText: "No",
      onOk() {
        const [vault] = getVaults();

        try {
          const { token_id } = jwtDecode<{ token_id: string }>(
            vault?.accessToken,
          );

          delAuthToken(token_id).finally(clear);
        } catch {
          clear();
        }
      },
    });
  };

  const initVault = async (vault: Vault): Promise<VaultBase> => {
    const vultisig = new Vultisig({ storage: new MemoryStorage() });
    const {
      hexChainCode,
      localPartyId,
      name,
      parties,
      publicKeyEcdsa,
      publicKeyEddsa,
      uid,
    } = vault;

    return vultisig.initialize().then(() =>
      vultisig.storage
        .set<VaultBase["data"]>(`vault:${uid}`, {
          publicKeys: { ecdsa: publicKeyEcdsa, eddsa: publicKeyEddsa },
          hexChainCode,
          signers: parties,
          localPartyId,
          createdAt: Date.now(),
          libType: "DKLS",
          isEncrypted: false,
          type: "fast",
          id: uid,
          name,
          isBackedUp: false,
          order: 1,
          folderId: undefined,
          lastModified: Date.now(),
          currency: "",
          chains: [],
          tokens: {},
          lastValueUpdate: undefined,
          vultFileContent: "",
        })
        .then(() => vultisig.listVaults().then(([vault]) => vault)),
    );
  };

  const setCurrency = (currency: Currency, fromStorage?: boolean) => {
    if (!fromStorage) setCurrencyStorage(currency);

    setState((prevState) => ({ ...prevState, currency }));
  };

  const setTheme = (theme: Theme, fromStorage?: boolean) => {
    if (!fromStorage) setThemeStorage(theme);

    setState((prevState) => ({ ...prevState, theme }));
  };

  const updateFeeAppStatus = useCallback(async () => {
    if (!vault) return;

    const feeAppStatus = await getFeeAppStatus();

    setState((prevState) => ({ ...prevState, feeAppStatus }));
  }, [vault]);

  useLocalStorageWatcher(storageKeys.currency, () => {
    setCurrency(getCurrency(), true);
  });

  useLocalStorageWatcher(storageKeys.theme, () => {
    setTheme(getTheme(), true);
  });

  useEffect(() => {
    setUnauthorizedHandler(clear);
  }, [clear]);

  useEffect(() => {
    updateFeeAppStatus();
  }, [updateFeeAppStatus]);

  useEffect(() => {
    getBaseValue(currency).then((baseValue) =>
      setState((prevState) => ({ ...prevState, baseValue })),
    );
  }, [currency]);

  useEffect(() => {
    getAppData(feeAppId)
      .catch(() => undefined)
      .then((feeApp) => setState((prevState) => ({ ...prevState, feeApp })));
  }, []);

  return (
    <CoreContext.Provider
      value={{
        address,
        baseValue,
        connect,
        currency,
        disconnect,
        feeApp,
        feeAppStatus,
        setCurrency,
        setTheme,
        theme,
        updateFeeAppStatus,
        vault,
      }}
    >
      {children}
      {messageHolder}
      {modalHolder}
    </CoreContext.Provider>
  );
};
