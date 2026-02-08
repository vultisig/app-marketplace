import { MemoryStorage, VaultBase, Vultisig } from "@vultisig/sdk";
import { Modal } from "antd";
import { hexlify, randomBytes } from "ethers";
import { jwtDecode } from "jwt-decode";
import Lottie from "lottie-react";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";
import { useTheme } from "styled-components";

import { setUnauthorizedHandler } from "@/api/client";
import { delAuthToken, getAuthToken, getFeeAppStatus } from "@/api/store";
import splashScreen from "@/assets/logo.json";
import { StatusModal } from "@/components/StatusModal";
import { AppContext, AppContextProps } from "@/context/App";
import { useQueries } from "@/hooks/useQueries";
import { getVaults, setVaults } from "@/storage/vaults";
import { Button } from "@/toolkits/Button";
import { Spin } from "@/toolkits/Spin";
import { Stack, VStack } from "@/toolkits/Stack";
import { chains } from "@/utils/chain";
import { feeAppId } from "@/utils/constants";
import * as extensionAPI from "@/utils/extension";
import { match } from "@/utils/functions";
import { Vault } from "@/utils/types";

type StateProps = Pick<AppContextProps, "feeApp" | "feeAppStatus" | "vault"> & {
  connectionStatus?: "connected" | "disconnected" | "connecting";
  isExtensionInstalled: boolean;
  isValidActiveVault: boolean;
  resharing?: boolean;
  signing?: boolean;
};

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StateProps>({
    isExtensionInstalled: true,
    isValidActiveVault: true,
  });
  const {
    connectionStatus,
    feeApp,
    feeAppStatus,
    isExtensionInstalled,
    isValidActiveVault,
    resharing,
    vault,
  } = state;
  const [modalAPI, modalHolder] = Modal.useModal();
  const { getAppData } = useQueries();
  const colors = useTheme();

  const checkExtensionAvailability = async () => {
    return extensionAPI.isAvailable().catch((error) => {
      setState((prev) => ({ ...prev, isExtensionInstalled: false }));

      throw error;
    });
  };

  const checkActiveVaultValidity = async () => {
    return extensionAPI
      .getVault()
      .then(({ publicKeyEcdsa }) => {
        if (publicKeyEcdsa !== vault?.publicKeys.ecdsa)
          throw new Error("Active vault does not match connected vault");

        return;
      })
      .catch((error) => {
        setState((prev) => ({ ...prev, isValidActiveVault: false }));

        throw error;
      });
  };

  const clear = () => {
    extensionAPI.disconnect().finally(() => {
      setState((prev) => ({ ...prev, vault: undefined }));
      setVaults([]);
    });
  };

  const connect = async () => {
    await checkExtensionAvailability();

    try {
      setState((prev) => ({ ...prev, connectionStatus: "connecting" }));

      const address = await extensionAPI.connect();
      const baseVault = await extensionAPI.getVault();
      const vault = await normalizeVault(baseVault);

      const message = JSON.stringify({
        address,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        message: "Sign into Vultisig Plugin Marketplace",
        nonce: hexlify(randomBytes(16)),
      });

      const signature = await extensionAPI.personalSign(address, message);

      const { accessToken, refreshToken } = await getAuthToken({
        chainCodeHex: vault.hexChainCode,
        publicKey: vault.publicKeys.ecdsa,
        signature,
        message,
      });

      setVaults([{ ...baseVault, accessToken, refreshToken }]);

      setState((prev) => ({ ...prev, connectionStatus: "connected", vault }));

      setTimeout(() => {
        setState((prev) => ({ ...prev, connectionStatus: undefined }));
      }, 2000);
    } catch {
      setState((prev) => ({ ...prev, connectionStatus: "disconnected" }));
    }
  };

  const disconnect = async () => {
    await checkExtensionAvailability();
    await checkActiveVaultValidity();

    modalAPI.confirm({
      title: "Are you sure you want to disconnect?",
      okText: "Yes",
      okType: "default",
      cancelText: "No",
      onOk() {
        const [vault] = getVaults();

        try {
          if (!vault?.accessToken) throw new Error("No access token found");

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

    await checkExtensionAvailability();
    await checkActiveVaultValidity();

    setState((prev) => ({ ...prev, signing: true }));

    const address = await vault.address(chains.Ethereum);
    const signature = await extensionAPI.personalSign(address, message, appId);

    setState((prev) => ({ ...prev, signing: false }));

    return signature;
  };

  const setVault = (vault: VaultBase) => {
    setState((prev) => ({ ...prev, vault }));
  };

  const startReshare = async (appId: string) => {
    if (!vault) throw new Error("No vault connected");

    await checkExtensionAvailability();
    await checkActiveVaultValidity();

    setState((prev) => ({ ...prev, resharing: true }));

    const isStarted = await extensionAPI.startReshare(appId, vault);

    setState((prev) => ({ ...prev, resharing: false }));

    return isStarted;
  };

  const updateFeeAppStatus = useCallback(async () => {
    if (!vault) return;

    const feeAppStatus = await getFeeAppStatus();

    setState((prev) => ({ ...prev, feeAppStatus }));
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
        setState((prev) => ({ ...prev, vault }));
      });
    }

    getAppData(feeAppId)
      .catch(() => undefined)
      .then((feeApp) => setState((prev) => ({ ...prev, feeApp })));
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

      <StatusModal
        onClose={() =>
          setState((prev) => ({ ...prev, isValidActiveVault: true }))
        }
        open={!isValidActiveVault}
      >
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          Active Vault Not Recognized
        </Stack>
        <Stack
          as="span"
          $style={{
            color: colors.textTertiary.toHex(),
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          Please verify your active vault in the Vultisig Extension
        </Stack>
      </StatusModal>

      <Modal
        centered={true}
        closable={false}
        footer={false}
        styles={{
          body: {
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            padding: 32,
          },
          container: { overflow: "hidden", padding: 0 },
          footer: { display: "none" },
        }}
        title={false}
        width={390}
        open={resharing}
      >
        <Spin />
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          Resharing in Progress
        </Stack>
      </Modal>

      <Modal
        centered={true}
        closable={connectionStatus !== "connecting"}
        footer={false}
        maskClosable={false}
        onCancel={() =>
          setState((prev) => ({ ...prev, connectionStatus: undefined }))
        }
        styles={{
          body: {
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 32,
          },
          container: { overflow: "hidden", padding: 0 },
          footer: { display: "none" },
        }}
        title={false}
        width={368}
        open={Boolean(connectionStatus)}
      >
        <VStack>
          <Lottie
            animationData={splashScreen}
            loop={connectionStatus === "connecting"}
          />
        </VStack>
        <VStack $style={{ alignItems: "center", gap: "4px" }}>
          <Stack
            as="span"
            $style={{ fontSize: "18px", fontWeight: "700", lineHeight: "24px" }}
          >
            Opening Vultisig...
          </Stack>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              fontSize: "14px",
              fontWeight: "500",
              lineHeight: "18px",
            }}
          >
            Confirm connection in the extension
          </Stack>
        </VStack>
        {connectionStatus &&
          match(connectionStatus, {
            connected: () => (
              <VStack
                $style={{
                  backgroundColor: colors.success.toHex(),
                  borderRadius: "44px",
                  height: "44px",
                  justifyContent: "center",
                  padding: "0 24px",
                }}
              >
                Connected
              </VStack>
            ),
            connecting: () => (
              <VStack
                $style={{
                  color: colors.textTertiary.toHex(),
                  height: "44px",
                  justifyContent: "center",
                }}
              >
                <Spin />
              </VStack>
            ),
            disconnected: () => <Button onClick={connect}>Retry</Button>,
          })}
      </Modal>

      {modalHolder}
    </AppContext.Provider>
  );
};
