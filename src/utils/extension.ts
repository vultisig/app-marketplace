import { VaultBase } from "@vultisig/sdk";
import { randomBytes } from "crypto";

import { reshareVault } from "@/api/store";
import { vultiApiUrl } from "@/utils/constants";

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
  getVault: () => Promise<{
    hexChainCode: string;
    isFastVault: boolean;
    localPartyId: string;
    name: string;
    parties: string[];
    publicKeyEcdsa: string;
    publicKeyEddsa: string;
    uid: string;
  }>;
};

declare global {
  interface Window {
    vultisig: VultisigProvider;
  }
}

export const connect = async () => {
  await isAvailable();

  try {
    const [account] = await window.vultisig.ethereum.request<string[]>({
      method: "eth_requestAccounts",
      params: [{ preselectFastVault: true }],
    });

    return account;
  } catch {
    throw new Error("Connection failed");
  }
};

export const disconnect = async () => {
  await isAvailable();

  await window.vultisig.ethereum.request({
    method: "wallet_revokePermissions",
  });
};

export const getVault = async () => {
  await isAvailable();

  const vault = await window.vultisig.getVault();

  if (vault) {
    if (!vault.hexChainCode || !vault.publicKeyEcdsa)
      throw new Error("Missing required vault data");

    if (!vault.isFastVault)
      throw new Error("Only Fast Vaults can connect to the Plugin Marketplace");

    return vault;
  } else {
    throw new Error("Vault not found");
  }
};

export const isAvailable = async () => {
  if (!window.vultisig) throw new Error("Please install Vultisig Extension");

  return;
};

export const personalSign = async (
  address: string,
  message: string,
  type: "connect" | "policy",
  pluginId?: string,
) => {
  await isAvailable();

  const signature = await window.vultisig.plugin.request<
    string | { error?: string }
  >({
    method: "personal_sign",
    params: [message, address, type, ...(pluginId ? [pluginId] : [])],
  });

  if (typeof signature === "object" && signature?.error)
    throw new Error(signature.error);

  return signature as string;
};

export const startReshareSession = async (
  pluginId: string,
  vaultData: VaultBase["data"],
) => {
  await isAvailable();

  try {
    // fetch first party id that does not start with Server
    const extensionParty = vaultData.signers.find(
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
        params: [{ id: pluginId, dAppSessionId, encryptionKeyHex }],
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
      hexChainCode: vaultData.hexChainCode,
      hexEncryptionKey: encryptionKeyHex,
      localPartyId: vaultData.localPartyId,
      name: vaultData.name,
      oldParties: vaultData.signers as string[],
      pluginId, // Use the pluginId parameter passed to function
      publicKey: vaultData.publicKeys.ecdsa,
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
