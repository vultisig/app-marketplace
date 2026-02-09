import type * as CSS from "csstype";

import {
  PluginRequirements,
  RecipeSchema as ProtoRecipeSchema,
} from "@/proto/recipe_specification_pb";
import { Chain } from "@/utils/chain";

export type APIResponse<T> = {
  status: number;
  data: T;
  timestamp: string;
  version: string;
};

export type PluginImage = {
  id: string;
  url: string;
  sort_order: number;
};

export type App = {
  audited: boolean;
  avgRating: number;
  categoryId: string;
  createdAt: string;
  description: string;
  faqs: { answer: string; question: string }[];
  features: string[];
  id: string;
  images: PluginImage[];
  installations: number;
  logoUrl: string;
  pricing: AppPricing[];
  ratesCount: number;
  ratings: { count: number; rating: number }[];
  serverEndpoint: string;
  thumbnailUrl: string;
  title: string;
  updatedAt: string;
};

export type AppFilters = {
  categoryId?: string;
  sort?: string;
  term?: string;
};

export type AppAutomation = {
  active: boolean;
  id: string;
  pluginVersion: string;
  pluginId: string;
  policyVersion: number;
  publicKey: string;
  recipe: string;
  signature?: string;
};

export type AppPricing = {
  amount: number;
  asset: string;
  createdAt: string;
  frequency: string;
  id: string;
  metric: string;
  pluginId: string;
  type: "once" | "recurring" | "per-tx";
  updatedAt: string;
};

export type AuthToken = {
  accessToken: string;
  refreshToken: string;
};

export type Billing = {
  appName: string;
  nextPayment?: string;
  pluginId: string;
  pricing: string;
  startDate: string;
  totalFees: string;
};

export type Category = {
  id: string;
  name: string;
};

export type Configuration = {
  properties: Record<string, FieldProps>;
  required: string[];
};

export type CSSProperties = CSS.Properties<string>;

export type Definitions = Record<string, Configuration>;

export type FeeAppStatus = {
  balance: number;
  fees: string[];
  isInstalled: boolean;
  isTrialActive: boolean;
  publicKey: string;
  trialRemaining: number;
  unpaidAmount: number;
};

export type FeeTransaction = {
  amount: string;
  appName: string;
  createdAt: string;
  feeAsset: {
    addr: string;
    decimals: number;
    network: string;
    symbol: string;
  };
  id: string;
  pluginId: string;
  policyId: string;
  publicKey: string;
  status: "PENDING";
  transactionType: string;
};

export type FieldProps = {
  description?: string;
  enum?: string[];
  format?: string;
  type?: string;
  $ref?: Widget;
};

export type OneInchToken = {
  address: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  name: string;
};

export type JupiterToken = {
  id: string;
  symbol: string;
  decimals: number;
  icon?: string;
  name: string;
};

export type ListFilters = {
  skip?: number;
  take?: number;
};

export type RecipeSchema = Omit<
  ProtoRecipeSchema,
  "configuration" | "requirements"
> & {
  configuration?: Configuration & { definitions?: Definitions };
  requirements?: Omit<PluginRequirements, "supportedChains"> & {
    supportedChains: Chain[];
  };
};

export type ReportForm = {
  reason: string;
  details?: string;
};

export type ReshareForm = {
  email: string;
  hexChainCode: string;
  hexEncryptionKey: string;
  localPartyId: string;
  name: string;
  oldParties: string[];
  pluginId: string;
  publicKey: string;
  sessionId: string;
};

export type Review = {
  address: string;
  comment: string;
  createdAt: string;
  id: string;
  pluginId: string;
  rating: number;
};

export type ReviewForm = {
  address: string;
  comment: string;
  rating: number;
};

export type Token = {
  chain: Chain;
  decimals: number;
  id: string;
  logo: string;
  name: string;
  ticker: string;
};

export type Transaction = {
  amount: string;
  appName: string;
  broadcastedAt: string;
  chain: Chain;
  createdAt: string;
  id: string;
  pluginId: string;
  policyId: string;
  publicKey: string;
  status: "PROPOSED" | "SIGNED" | "VERIFIED";
  statusOnchain: "FAIL" | "PENDING" | "SUCCESS";
  toPublicKey: string;
  tokenId: string;
  txHash: string;
  updatedAt: string;
};

export type Vault = {
  hexChainCode: string;
  isFastVault: boolean;
  localPartyId: string;
  name: string;
  parties: string[];
  publicKeyEcdsa: string;
  publicKeyEddsa: string;
  uid: string;
};

type Widget = "#/definitions/asset";
