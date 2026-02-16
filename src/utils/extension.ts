import { VaultBase } from "@vultisig/sdk";
import { randomBytes } from "crypto";

import { reshareVault } from "@/api/store";
import { vultiApiUrl } from "@/utils/constants";
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

export const connect = async () => {
  const [account] = await window.vultisig.ethereum.request<string[]>({
    method: "eth_requestAccounts",
    params: [{ preselectFastVault: true }],
  });

  return account;
};

export const disconnect = async () => {
  await window.vultisig.ethereum.request({
    method: "wallet_revokePermissions",
  });
};

export const getVault = async () => {
  try {
    const vault = await window.vultisig.getVault();

    if (!vault) throw new Error("No vault found");

    if (!vault.hexChainCode || !vault.publicKeyEcdsa)
      throw new Error("Missing required vault data");

    if (!vault.isFastVault)
      throw new Error(
        "Your vault type isn't supported. Please use a Fast Vault",
      );

    return vault;
  } catch (error) {
    await disconnect();

    throw error;
  }
};

export const isAvailable = async () => {
  if (!window.vultisig) throw new Error("Please install Vultisig Extension");

  return;
};

export const personalSign = async (
  address: string,
  message: string,
  appId?: string,
) => {
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

export const startReshare = async (appId: string, vault: VaultBase) => {
  // fetch first party id that does not start with Server
  const extensionParty = vault.data.signers.find(
    (party) => !party.toLocaleLowerCase().startsWith("server"),
  );

  if (!extensionParty) throw new Error("Extension party not found in vault");

  // Step 1: Generate dAppSessionId and encryptionKeyHex
  const dAppSessionId = crypto.randomUUID();
  const encryptionKeyHex = randomBytes(32).toString("hex");

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
        const response = await fetch(`${vultiApiUrl}/router/${dAppSessionId}`);

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

  return true; // TODO: Remove for testing

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
    hexChainCode: vault.data.hexChainCode,
    hexEncryptionKey: encryptionKeyHex,
    localPartyId: vault.data.localPartyId,
    name: vault.data.name,
    oldParties: vault.data.signers as string[],
    pluginId: appId, // Use the pluginId parameter passed to function
    publicKey: vault.data.publicKeys.ecdsa,
    sessionId: dAppSessionId,
  });

  // Example response: vultisig://vultisig.com?type=NewVault&tssType=Reshare&jsonData=...

  // Transform the payload to match backend ReshareRequest structure
  // Step 4: Wait for extension to complete (it was waiting for verifier)
  const { success } = await extensionPromise;

  return success;
};
