import { MemoryStorage, VaultBase, Vultisig } from "@vultisig/sdk";
import { message as Message, Modal } from "antd";
import { hexlify, randomBytes } from "ethers";
import { jwtDecode } from "jwt-decode";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";
import { useTheme } from "styled-components";

import { setUnauthorizedHandler } from "@/api/client";
import {
  delAuthToken,
  getAuthToken,
  getFeeAppStatus,
  reshareVault,
} from "@/api/store";
import { StatusModal } from "@/components/StatusModal";
import { AppContext, AppContextProps } from "@/context/App";
import { useQueries } from "@/hooks/useQueries";
import { getVaults, setVaults } from "@/storage/vaults";
import { Stack } from "@/toolkits/Stack";
import { chains } from "@/utils/chain";
import { feeAppId, vultiApiUrl } from "@/utils/constants";
import { Vault } from "@/utils/types";

type VultisigProviderItem = {
  request: <T>(params: { method: string; params?: unknown[] }) => Promise<T>;
};

type VultisigProvider = {
  ethereum: VultisigProviderItem;
  bitcoin: VultisigProviderItem;
  solana: VultisigProviderItem;
  ripple: VultisigProviderItem;
  zcash: VultisigProviderItem;
  plugin: VultisigProviderItem;
  getVault: () => Promise<Vault>;
};

declare global {
  interface Window {
    vultisig: VultisigProvider;
  }
}

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
    if (window.vultisig) {
      onAvailable();
    } else {
      setState((prevState) => ({ ...prevState, isExtensionInstalled: false }));
    }
  };

  const clear = () => {
    disconnectFromExtension().finally(() => {
      setState((prevState) => ({ ...prevState, vault: undefined }));
      setVaults([]);
    });
  };

  const connect = useCallback(() => {
    checkExtensionAvailability(() => {
      connectToExtension()
        .then(() =>
          getVault()
            .then((baseVault) =>
              normalizeVault(baseVault).then(async (vault) =>
                vault.address(chains.Ethereum).then((address) => {
                  const message = JSON.stringify({
                    address,
                    expiresAt: new Date(
                      Date.now() + 15 * 60 * 1000,
                    ).toISOString(),
                    message: "Sign into Vultisig Plugin Marketplace",
                    nonce: hexlify(randomBytes(16)),
                  });

                  personalSign(message).then((signature) =>
                    getAuthToken({
                      chainCodeHex: baseVault.hexChainCode,
                      publicKey: baseVault.publicKeyEcdsa,
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
              ),
            )
            .catch((error: Error) => {
              messageAPI.error(error.message);
              clear();
            }),
        )
        .catch((error: Error) => messageAPI.error(error.message));
    });
  }, [clear, messageAPI]);

  const connectToExtension = async () => {
    try {
      await window.vultisig.ethereum.request<string[]>({
        method: "eth_requestAccounts",
        params: [{ preselectFastVault: true }],
      });

      return;
    } catch {
      throw new Error("Connection failed");
    }
  };

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

  const disconnectFromExtension = async () => {
    await window.vultisig.ethereum.request({
      method: "wallet_revokePermissions",
    });
  };

  const getVault = async () => {
    const vault = await window.vultisig.getVault();

    if (vault) {
      if (!vault.hexChainCode || !vault.publicKeyEcdsa)
        throw new Error("Missing required vault data");

      if (!vault.isFastVault)
        throw new Error(
          "Only Fast Vaults can connect to the Plugin Marketplace",
        );

      return vault;
    } else {
      throw new Error("Vault not found");
    }
  };

  const normalizeVault = async (vault: Vault): Promise<VaultBase> => {
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

    const signature = await window.vultisig.plugin.request<
      string | { error?: string }
    >({
      method: "personal_sign",
      params: [message, address, ...(appId ? ["policy", appId] : ["connect"])],
    });

    if (typeof signature === "object" && signature?.error)
      throw new Error(signature.error);

    return signature as string;
  };

  const setVault = (vault: VaultBase) => {
    setState((prevState) => ({ ...prevState, vault }));
  };

  const startReshare = async (appId: string) => {
    if (!vault) throw new Error("No vault connected");

    const { hexChainCode, localPartyId, name, publicKeys, signers } =
      vault.data;

    try {
      // fetch first party id that does not start with Server
      const extensionParty = signers.find(
        (party) => !party.toLocaleLowerCase().startsWith("server"),
      );

      if (!extensionParty)
        throw new Error("Extension party not found in vault");

      // Step 1: Generate dAppSessionId and encryptionKeyHex
      const dAppSessionId = crypto.randomUUID();
      const encryptionKeyHex = hexlify(randomBytes(32));

      // Create empty session first
      await fetch(`${vultiApiUrl}/router/${dAppSessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([extensionParty]),
      });

      let extensionResult: boolean | undefined = undefined;

      const extensionPromise = window.vultisig.plugin
        .request<{ success: boolean }>({
          method: "reshare_sign",
          params: [{ id: appId, dAppSessionId, encryptionKeyHex }],
        })
        .then(({ success }) => {
          extensionResult = success;

          return { type: "extension" as const, success };
        })
        .catch(() => {
          extensionResult = false;

          return { type: "extension" as const, success: false };
        });

      // Poll the router endpoint until peers are available
      const pollForPeers = async () => {
        const maxAttempts = 100; // 100 attempts
        const pollInterval = 200; // 200 ms

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (extensionResult !== undefined && !extensionResult) {
            return { type: "peers" as const, hasPeers: false };
          }

          try {
            const response = await fetch(
              `${vultiApiUrl}/router/${dAppSessionId}`,
            );

            const peers: string[] = await response.json();

            if (peers.length > 1) {
              return { type: "peers" as const, hasPeers: true };
            }
          } catch (error) {
            console.error("Error polling for peers:", error);
          }

          // Wait before next attempt
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        return { type: "peers" as const, hasPeers: false };
      };

      const raceResult = await Promise.race([extensionPromise, pollForPeers()]);

      // If extension finished first and failed, stop everything
      if (raceResult.type === "extension" && !raceResult.success) {
        throw new Error("User cancelled or extension failed to start reshare");
      }

      // If polling finished first but no peers joined, stop
      if (raceResult.type === "peers" && !raceResult.hasPeers) {
        throw new Error("Timeout: peers did not join the reshare session");
      }

      await reshareVault({
        email: "", // Not provided by extension, using empty string
        hexChainCode,
        hexEncryptionKey: encryptionKeyHex,
        localPartyId,
        name,
        oldParties: signers as string[],
        pluginId: appId, // Use the pluginId parameter passed to function
        publicKey: publicKeys.ecdsa,
        sessionId: dAppSessionId,
      });

      // Example response: vultisig://vultisig.com?type=NewVault&tssType=Reshare&jsonData=...

      // Transform the payload to match backend ReshareRequest structure
      // Step 4: Wait for extension to complete (it was waiting for verifier)
      const { success } = await extensionPromise;

      return success;
    } catch {
      return false;
    }
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
