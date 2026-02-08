export const storageKeys = {
  chain: "chain",
  currency: "currency",
  language: "language",
  onboarding: "hasFinishedOnboarding",
  theme: "theme",
  token: "token",
  vaults: "vaults",
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
