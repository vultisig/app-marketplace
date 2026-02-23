import { MemoryStorage, VaultBase, Vultisig } from "@vultisig/sdk";
import { Modal } from "antd";
import { hexlify, randomBytes } from "ethers";
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
  connectError?: string;
  connectStatus?: "connected" | "connecting" | "retrying" | "signing";
  disconnectStatus?: "confirm" | "pending" | "success";
  installing?: boolean;
  isExtensionInstalled: boolean;
  isValidActiveVault: boolean;
  loaded?: boolean;
  signing?: boolean;
};

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StateProps>({
    isExtensionInstalled: true,
    isValidActiveVault: true,
  });
  const {
    connectError,
    connectStatus,
    disconnectStatus,
    feeApp,
    feeAppStatus,
    installing,
    isExtensionInstalled,
    isValidActiveVault,
    loaded,
    signing,
    vault,
  } = state;
  const { getAppData } = useQueries();
  const colors = useTheme();

  const checkExtensionAvailability = async () => {
    try {
      await extensionAPI.isAvailable();
    } catch (error) {
      setState((prev) => ({ ...prev, isExtensionInstalled: false }));

      throw error;
    }
  };

  const checkActiveVaultValidity = async () => {
    if (!vault) throw new Error("No vault connected");

    try {
      const { publicKeyEcdsa } = await extensionAPI.getVault();

      if (publicKeyEcdsa !== vault.publicKeys.ecdsa)
        throw new Error("Active vault does not match connected vault");

      setState((prev) => ({ ...prev, isValidActiveVault: true }));
    } catch (error) {
      setState((prev) => ({ ...prev, isValidActiveVault: false }));

      await extensionAPI.disconnect();
      await extensionAPI.connect();
      await checkActiveVaultValidity();

      throw error;
    }
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
      setState((prev) => ({
        ...prev,
        connectError: undefined,
        connectStatus: "connecting",
      }));

      const address = await extensionAPI.connect();
      const baseVault = await extensionAPI.getVault();
      const vault = await normalizeVault(baseVault);

      const derivedAddress = await vault.address(chains.Ethereum);

      if (address.toLowerCase() !== derivedAddress.toLowerCase()) {
        await extensionAPI.disconnect().catch(() => {});

        throw new Error(
          "Seed-phrase imported vaults are not supported. Please use a TSS vault to connect to the marketplace.",
        );
      }

      setState((prev) => ({
        ...prev,
        connectError: undefined,
        connectStatus: "signing",
      }));

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

      setState((prev) => ({ ...prev, connectStatus: "connected", vault }));

      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          connectStatus: undefined,
          connectError: undefined,
        }));
      }, 2000);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        connectError: (error as Error).message,
        connectStatus: "retrying",
      }));
    }
  };

  const disconnect = async () => {
    setState((prev) => ({ ...prev, disconnectStatus: "pending" }));

    const [vault] = getVaults();

    if (vault) await delAuthToken(vault.refreshToken).catch(() => {});

    await extensionAPI.disconnect().catch(() => {});

    setState((prev) => ({ ...prev, disconnectStatus: "success" }));

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        disconnectStatus: undefined,
        vault: undefined,
      }));

      setVaults([]);
    }, 1000);
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

    try {
      setState((prev) => ({ ...prev, signing: true }));

      const address = await vault.address(chains.Ethereum);
      const signature = await extensionAPI.personalSign(
        address,
        message,
        appId,
      );

      setState((prev) => ({ ...prev, signing: false }));

      return signature;
    } catch (error) {
      setState((prev) => ({ ...prev, signing: false }));

      throw error;
    }
  };

  const startReshare = async (appId: string) => {
    if (!vault) throw new Error("No vault connected");

    await checkExtensionAvailability();
    await checkActiveVaultValidity();

    try {
      setState((prev) => ({ ...prev, installing: true }));

      const isStarted = await extensionAPI.startReshare(appId, vault);

      setState((prev) => ({ ...prev, installing: false }));

      return isStarted;
    } catch (error) {
      setState((prev) => ({ ...prev, installing: false }));

      throw error;
    }
  };

  const updateFeeAppStatus = useCallback(async () => {
    if (!vault) return;

    const feeAppStatus = await getFeeAppStatus();

    setState((prev) => ({ ...prev, feeAppStatus }));
  }, [vault]);

  useEffect(() => {
    updateFeeAppStatus();
  }, [updateFeeAppStatus]);

  useEffect(() => {
    const [vault] = getVaults();

    if (vault) {
      normalizeVault(vault).then((vault) => {
        setState((prev) => ({ ...prev, loaded: true, vault }));
      });
    } else {
      setState((prev) => ({ ...prev, loaded: true }));
    }

    setUnauthorizedHandler(clear);

    getAppData(feeAppId)
      .catch(() => undefined)
      .then((feeApp) => setState((prev) => ({ ...prev, feeApp })));
  }, []);

  return (
    <AppContext.Provider
      value={{
        connect,
        disconnect: () =>
          setState((prev) => ({ ...prev, disconnectStatus: "confirm" })),
        feeApp,
        feeAppStatus,
        personalSign,
        setVault: (vault) => setState((prev) => ({ ...prev, vault })),
        startReshare,
        updateFeeAppStatus,
        vault,
      }}
    >
      {loaded && children}

      <StatusModal
        onClose={() =>
          setState((prev) => ({ ...prev, isExtensionInstalled: true }))
        }
        open={!isExtensionInstalled}
      >
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          Vultisig Extension Not Installed
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
          {`Please switch to ${vault?.name} vault in Vultisig`}
        </Stack>
        <VStack $style={{ marginTop: "16px" }}>
          <Button
            kind="danger"
            onClick={() =>
              disconnect().finally(() =>
                setState((prev) => ({ ...prev, isValidActiveVault: true })),
              )
            }
          >
            Disconnect
          </Button>
        </VStack>
      </StatusModal>

      <Modal
        centered={true}
        closable={false}
        footer="Installing Plugin..."
        styles={{
          body: {
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          },
          container: { display: "flex", flexDirection: "column", gap: 12 },
          footer: {
            fontSize: 22,
            lineHeight: "24px",
            marginTop: 0,
            textAlign: "center",
          },
        }}
        title={false}
        width={480}
        open={installing}
        zIndex={1002}
      >
        <Lottie animationData={splashScreen} />
      </Modal>

      <Modal
        centered={true}
        closable={false}
        footer="Confirming Transaction..."
        styles={{
          body: {
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          },
          container: { display: "flex", flexDirection: "column", gap: 12 },
          footer: {
            fontSize: 22,
            lineHeight: "24px",
            marginTop: 0,
            textAlign: "center",
          },
        }}
        title={false}
        width={480}
        open={signing}
        zIndex={1002}
      >
        <Lottie animationData={splashScreen} />
      </Modal>

      <Modal
        centered={true}
        closable={connectStatus !== "connecting" && connectStatus !== "signing"}
        footer={
          connectStatus &&
          match(connectStatus, {
            connected: () => (
              <Stack
                as="span"
                $style={{ color: colors.success.toHex(), lineHeight: "44px" }}
              >
                Connected
              </Stack>
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
            retrying: () => <Button onClick={connect}>Retry</Button>,
            signing: () => (
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
          })
        }
        maskClosable={false}
        onCancel={() =>
          setState((prev) => ({ ...prev, connectStatus: undefined }))
        }
        styles={{
          body: {
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          },
          container: { display: "flex", flexDirection: "column", gap: 24 },
          footer: { display: "flex", justifyContent: "center", marginTop: 0 },
        }}
        title={false}
        width={480}
        open={Boolean(connectStatus)}
        zIndex={1002}
      >
        <VStack>
          <Lottie
            animationData={splashScreen}
            loop={connectStatus === "connecting" || connectStatus === "signing"}
          />
        </VStack>
        <VStack $style={{ alignItems: "center", gap: "4px" }}>
          <Stack
            as="span"
            $style={{ fontSize: "18px", fontWeight: "700", lineHeight: "24px" }}
          >
            Connecting to Vultisig Extension
          </Stack>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              fontSize: "14px",
              fontWeight: "500",
              lineHeight: "18px",
              textAlign: "center",
            }}
          >
            {connectError ||
              (connectStatus &&
                match(connectStatus, {
                  connected: () => "Connection established",
                  connecting: () => "Waiting for approval...",
                  retrying: () => "Connection failed. Please try again",
                  signing: () => "Approve the request in Vultisig Extension",
                }))}
          </Stack>
        </VStack>
      </Modal>

      <Modal
        centered={true}
        closable={disconnectStatus !== "pending"}
        footer={
          disconnectStatus &&
          match(disconnectStatus, {
            confirm: () => (
              <Stack $style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <Button kind="secondary" onClick={() =>
                  setState((prev) => ({ ...prev, disconnectStatus: undefined }))
                }>
                  Cancel
                </Button>
                <Button kind="warning" onClick={disconnect}>
                  Sign Out
                </Button>
              </Stack>
            ),
            pending: () => (
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
            success: () => (
              <Stack
                as="span"
                $style={{ color: colors.success.toHex(), lineHeight: "44px" }}
              >
                Signed Out
              </Stack>
            ),
          })
        }
        maskClosable={false}
        onCancel={() =>
          setState((prev) => ({ ...prev, disconnectStatus: undefined }))
        }
        styles={{
          body: {
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          },
          container: { display: "flex", flexDirection: "column", gap: 24 },
          footer: { display: "flex", justifyContent: "center", marginTop: 0 },
        }}
        width={480}
        open={Boolean(disconnectStatus)}
        zIndex={1002}
      >
        <Lottie animationData={splashScreen} loop={false} />
        <Stack
          as="span"
          $style={{ fontSize: "18px", fontWeight: "700", lineHeight: "24px" }}
        >
          Sign Out
        </Stack>
        <Stack
          as="span"
          $style={{
            color: colors.textTertiary.toHex(),
            fontSize: "14px",
            fontWeight: "500",
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          You will be signed out of Vultisig Plugin Marketplace
        </Stack>
      </Modal>
    </AppContext.Provider>
  );
};
