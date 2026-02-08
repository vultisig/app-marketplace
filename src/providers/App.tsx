import { MemoryStorage, VaultBase, Vultisig } from "@vultisig/sdk";
import { message as Message, Modal } from "antd";
import { hexlify, randomBytes } from "ethers";
import { jwtDecode } from "jwt-decode";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";
import { useTheme } from "styled-components";

import { setUnauthorizedHandler } from "@/api/client";
import { delAuthToken, getAuthToken, getFeeAppStatus } from "@/api/store";
import { StatusModal } from "@/components/StatusModal";
import { AppContext, AppContextProps } from "@/context/App";
import { useQueries } from "@/hooks/useQueries";
import { getVaults, setVaults } from "@/storage/vaults";
import { Stack } from "@/toolkits/Stack";
import { chains } from "@/utils/chain";
import { feeAppId } from "@/utils/constants";
import * as extension from "@/utils/extension";
import { Vault } from "@/utils/types";

type StateProps = Pick<AppContextProps, "feeApp" | "feeAppStatus" | "vault"> & {
  isExtensionInstalled: boolean;
};

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StateProps>({
    isExtensionInstalled: true,
  });
  const { feeApp, feeAppStatus, isExtensionInstalled, vault } = state;
  const [messageAPI, messageHolder] = Message.useMessage();
  const [modalAPI, modalHolder] = Modal.useModal();
  const { getAppData } = useQueries();
  const colors = useTheme();

  const checkExtensionAvailability = (onAvailable: () => void) => {
    extension
      .isAvailable()
      .then(onAvailable)
      .catch(() => {
        setState((prevState) => ({
          ...prevState,
          isExtensionInstalled: false,
        }));
      });
  };

  const clear = () => {
    extension.disconnect().finally(() => {
      setState((prevState) => ({ ...prevState, vault: undefined }));
      setVaults([]);
    });
  };

  const connect = useCallback(() => {
    checkExtensionAvailability(() => {
      extension
        .connect()
        .then((address) =>
          extension
            .getVault()
            .then((baseVault) =>
              normalizeVault(baseVault).then(async (vault) => {
                const message = JSON.stringify({
                  address,
                  expiresAt: new Date(
                    Date.now() + 15 * 60 * 1000,
                  ).toISOString(),
                  message: "Sign into Vultisig Plugin Marketplace",
                  nonce: hexlify(randomBytes(16)),
                });

                return extension
                  .personalSign(address, message)
                  .then((signature) =>
                    getAuthToken({
                      chainCodeHex: vault.hexChainCode,
                      publicKey: vault.publicKeys.ecdsa,
                      signature,
                      message,
                    })
                      .then(({ accessToken, refreshToken }) => {
                        setVaults([
                          { ...baseVault, accessToken, refreshToken },
                        ]);
                        setState((prevState) => ({ ...prevState, vault }));
                        messageAPI.success("Successfully authenticated!");
                      })
                      .catch(() => {
                        messageAPI.error("Authentication failed!");
                      }),
                  );
              }),
            )
            .catch((error: Error) => {
              messageAPI.error(error.message);
              clear();
            }),
        )
        .catch((error: Error) => messageAPI.error(error.message));
    });
  }, [clear, messageAPI]);

  const disconnect = () => {
    checkExtensionAvailability(() => {
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
    });
  };

  const normalizeVault = async ({
    hexChainCode,
    localPartyId,
    name,
    parties,
    publicKeyEcdsa,
    publicKeyEddsa,
    uid,
  }: Vault): Promise<VaultBase> => {
    const vultisig = new Vultisig({ storage: new MemoryStorage() });
    const now = Date.now();

    return vultisig.initialize().then(() =>
      vultisig.storage
        .set<VaultBase["data"]>(`vault:${uid}`, {
          chains: [],
          createdAt: now,
          currency: "",
          folderId: undefined,
          hexChainCode,
          id: uid,
          isBackedUp: false,
          isEncrypted: false,
          lastModified: now,
          lastValueUpdate: now,
          libType: "DKLS",
          localPartyId,
          name,
          order: 1,
          publicKeys: { ecdsa: publicKeyEcdsa, eddsa: publicKeyEddsa },
          signers: parties,
          tokens: {},
          type: "fast",
          vultFileContent: "",
        })
        .then(() => vultisig.listVaults().then(([vault]) => vault)),
    );
  };

  const personalSign = async (message: string, appId?: string) => {
    if (!vault) throw new Error("No vault connected");

    const address = await vault.address(chains.Ethereum);
    const signature = await extension.personalSign(address, message, appId);

    return signature;
  };

  const setVault = (vault: VaultBase) => {
    setState((prevState) => ({ ...prevState, vault }));
  };

  const startReshare = async (appId: string) => {
    if (!vault) throw new Error("No vault connected");

    const isStarted = await extension.startReshare(appId, vault);

    return isStarted;
  };

  const updateFeeAppStatus = useCallback(async () => {
    if (!vault) return;

    const feeAppStatus = await getFeeAppStatus();

    setState((prevState) => ({ ...prevState, feeAppStatus }));
  }, [vault]);

  useEffect(() => {
    setUnauthorizedHandler(clear);
  }, [clear]);

  useEffect(() => {
    updateFeeAppStatus();
  }, [updateFeeAppStatus]);

  useEffect(() => {
    const [vault] = getVaults();

    if (vault) {
      normalizeVault(vault).then((vault) => {
        setState((prevState) => ({ ...prevState, vault }));
      });
    }

    getAppData(feeAppId)
      .catch(() => undefined)
      .then((feeApp) => setState((prevState) => ({ ...prevState, feeApp })));
  }, []);

  return (
    <AppContext.Provider
      value={{
        connect,
        disconnect,
        feeApp,
        feeAppStatus,
        personalSign,
        setVault,
        startReshare,
        updateFeeAppStatus,
        vault,
      }}
    >
      {children}

      <StatusModal
        onClose={() =>
          setState((prev) => ({ ...prev, isExtensionInstalled: true }))
        }
        open={!isExtensionInstalled}
      >
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          Vultisig Extension Not Found
        </Stack>
        <Stack
          as="a"
          href="https://chromewebstore.google.com/detail/vultisig-extension/ggafhcdaplkhmmnlbfjpnnkepdfjaelb"
          target="_blank"
          rel="noopener noreferrer"
          $style={{
            color: colors.textTertiary.toHex(),
            lineHeight: "18px",
            textAlign: "center",
          }}
          $hover={{ color: colors.info.toHex() }}
        >
          Please install the Vultisig Extension from the Chrome Web Store
        </Stack>
      </StatusModal>

      {messageHolder}
      {modalHolder}
    </AppContext.Provider>
  );
};
