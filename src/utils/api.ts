import { fromJson, JsonObject } from "@bufbuild/protobuf";
import axios, { AxiosRequestConfig } from "axios";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

import {
  PolicySuggest,
  PolicySuggestJson,
  PolicySuggestSchema,
} from "@/proto/policy_pb";
import { getToken, setToken } from "@/storage/token";
import { getVaultId } from "@/storage/vaultId";
import {
  Chain,
  chains,
  coinGeckoNetwork,
  ethL2Chains,
  EvmChain,
  evmChainInfo,
  evmChains,
} from "@/utils/chain";
import {
  defaultPageSize,
  feeAppId,
  recurringSwapsAppId,
  storeApiUrl,
  vultiApiUrl,
} from "@/utils/constants";
import { Currency } from "@/utils/currency";
import { normalizeApp, toCamelCase } from "@/utils/functions";
import { toSnakeCase } from "@/utils/functions";
import { faqs } from "@/utils/mockData";
import {
  APIResponse,
  App,
  AppAutomation,
  AppFilters,
  AuthToken,
  Billing,
  Category,
  FeeAppStatus,
  FeeTransaction,
  JupiterToken,
  ListFilters,
  OneInchToken,
  RecipeSchema,
  ReportForm,
  ReshareForm,
  Review,
  ReviewForm,
  Token,
  Transaction,
} from "@/utils/types";

class TokenManager {
  private refreshPromise: Promise<AuthToken> | null = null;

  async check(token: AuthToken): Promise<AuthToken> {
    const now = dayjs().unix();

    try {
      const { exp } = jwtDecode<{ exp: number }>(token.accessToken);

      if (exp < now) return this.refresh(token);

      return token;
    } catch {
      throw new Error();
    }
  }

  async refresh({ refreshToken }: AuthToken): Promise<AuthToken> {
    // If a refresh is already happening, wait for it
    if (this.refreshPromise) return this.refreshPromise;

    // Start a new refresh
    this.refreshPromise = axios
      .post<APIResponse<AuthToken>>(
        `${storeApiUrl}/auth/refresh`,
        toSnakeCase({ refreshToken }),
        { headers: { accept: "application/json" } },
      )
      .then((res) => toCamelCase(res.data.data))
      .finally(() => {
        // Reset so future refreshes can happen
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }
}

const api = axios.create({ headers: { "Content-Type": "application/json" } });
const tokenManager = new TokenManager();
let onUnauthorized: (() => void) | null = null;

api.interceptors.request.use(
  async (config) => {
    if (config.url?.startsWith(storeApiUrl)) {
      const publicKey = getVaultId();
      const token = getToken(publicKey);

      if (token) {
        const newToken = await tokenManager.check(token).catch(() => null);

        if (!newToken) return config;

        setToken(publicKey, newToken);

        return {
          ...config,
          headers: config.headers.setAuthorization(
            `Bearer ${newToken.accessToken}`,
          ),
        };
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) onUnauthorized();

    return Promise.reject(
      new Error(error.response?.data?.error?.message || error.message),
    );
  },
);

const externalGet = async <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return await api.get<T>(url, config).then(({ data }) => toCamelCase(data));
};

const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return api
    .delete<APIResponse<T>>(url, config)
    .then(({ data }) => toCamelCase(data.data));
};

const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return await api
    .get<APIResponse<T>>(url, config)
    .then(({ data }) => toCamelCase(data.data));
};

const post = async <T>(
  url: string,
  data?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return api
    .post<APIResponse<T>>(url, data, config)
    .then(({ data }) => toCamelCase(data.data));
};

// const put = async <T>(
//   url: string,
//   data?: any,
//   config?: AxiosRequestConfig
// ): Promise<T> => {
//   return api
//     .put<APIResponse<T>>(url, data, config)
//     .then(({ data }) => toCamelCase(data.data));
// };

export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

export const addAutomation = async (data: AppAutomation): Promise<void> => {
  return post<void>(`${storeApiUrl}/plugin/policy`, toSnakeCase(data));
};

export const addReview = async (
  appId: string,
  data: ReviewForm,
): Promise<void> => {
  return post<void>(
    `${storeApiUrl}/plugins/${appId}/reviews`,
    toSnakeCase(data),
  );
};

export const appReport = async (
  appId: string,
  data: ReportForm,
): Promise<void> => {
  return post<void>(
    `${storeApiUrl}/plugins/${appId}/report`,
    toSnakeCase(data),
  );
};

export const delAuthToken = async (tokenId: string): Promise<void> => {
  return del(`${storeApiUrl}/auth/tokens/${tokenId}`);
};

export const delAutomation = async (
  id: string,
  signature: string,
): Promise<void> => {
  return del<void>(`${storeApiUrl}/plugin/policy/${id}`, {
    data: { signature },
  });
};

export const getAuthToken = async (data: {
  chainCodeHex: string;
  message: string;
  publicKey: string;
  signature: string;
}): Promise<AuthToken> => {
  return post<AuthToken>(`${storeApiUrl}/auth`, toSnakeCase(data));
};

export const getApp = async (id: string): Promise<App> => {
  const app = await get<App>(`${storeApiUrl}/plugins/${id}`);

  const faq = faqs[id];

  if (faq) return normalizeApp({ ...app, faqs: faq });

  return normalizeApp(app);
};

export const getApps = async ({
  categoryId,
  skip,
  sort = "-created_at",
  take = defaultPageSize,
  term,
}: ListFilters & AppFilters): Promise<{ apps: App[]; totalCount: number }> => {
  try {
    const { plugins, totalCount } = await get<{
      plugins: App[];
      totalCount: number;
    }>(`${storeApiUrl}/plugins`, {
      params: toSnakeCase({ categoryId, skip, sort, take, term }),
    });

    if (!totalCount) return { apps: [], totalCount: 0 };

    return {
      apps: plugins.filter(({ id }) => id !== feeAppId).map(normalizeApp),
      totalCount,
    };
  } catch {
    return { apps: [], totalCount: 0 };
  }
};

export const getBaseValue = async (currency: Currency): Promise<number> => {
  if (currency === "usd") return 1;

  const modifiedCurrency = currency.toUpperCase();

  try {
    const { data } = await externalGet<{
      data: {
        [id: string]: { quote: { [currency: string]: { price: number } } };
      };
    }>(
      `${vultiApiUrl}/cmc/v2/cryptocurrency/quotes/latest?id=825&skip_invalid=true&aux=is_active&convert=${currency}`,
    );

    const quote = data?.[825]?.quote?.[modifiedCurrency];

    return quote?.price ?? 0;
  } catch {
    return 0;
  }
};

export const getPrice = async (
  chain: Chain,
  contract?: string,
): Promise<number> => {
  try {
    // If chain is an ETH L2 and contract is empty, query for Ethereum
    if (chain in ethL2Chains && !contract) chain = chains.Ethereum;

    let platform = coinGeckoNetwork[chain];
    let url = "";

    if (contract) {
      url = `${vultiApiUrl}/coingeicko/api/v3/simple/token_price/${platform}?contract_addresses=${contract}&vs_currencies=usd`;
    } else {
      if (chain === chains.BSC) {
        platform = "binancecoin";
      } else if (chain === chains.Polygon) {
        platform = "polygon-ecosystem-token";
      }

      url = `${vultiApiUrl}/coingeicko/api/v3/simple/price?ids=${platform}&vs_currencies=usd`;
    }

    const data = await externalGet<{ [addr: string]: { usd: number } }>(url);
    const [item] = Object.values(data);

    return item?.usd || 0;
  } catch {
    return 0;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  return get<Category[]>(`${storeApiUrl}/categories`).then((categories) => [
    { id: "", name: "All" },
    ...categories,
  ]);
};

export const getFeeAppStatus = async (): Promise<FeeAppStatus> => {
  const status = await externalGet<FeeAppStatus>(`${storeApiUrl}/fee/status`);
  const isInstalled = await isAppInstalled(feeAppId);
  return { ...status, isInstalled };
};

export const getFeeTransactions = async ({
  appId,
  skip,
  take = defaultPageSize,
}: ListFilters & { appId: string }): Promise<{
  total: number;
  transactions: FeeTransaction[];
}> => {
  try {
    const { history: transactions, totalCount: total } = await get<{
      history: FeeTransaction[];
      totalCount: number;
    }>(`${storeApiUrl}/fee/plugins/${appId}/transactions`, {
      params: toSnakeCase({ skip, take }),
    });

    if (!total) return { total: 0, transactions: [] };

    return { total, transactions };
  } catch {
    return { total: 0, transactions: [] };
  }
};

export const getBillings = async ({
  skip,
  take = defaultPageSize,
}: ListFilters): Promise<{ billings: Billing[]; total: number }> => {
  try {
    const { plugins: billings, totalCount: total } = await get<{
      plugins: Billing[];
      totalCount: number;
    }>(`${storeApiUrl}/fee/plugins`, {
      params: toSnakeCase({ skip, take }),
    });

    if (!total) return { billings: [], total: 0 };

    return { billings, total };
  } catch {
    return { billings: [], total: 0 };
  }
};

export const getMyApps = async ({
  skip,
  take = defaultPageSize,
}: ListFilters): Promise<{ apps: App[]; totalCount: number }> => {
  try {
    const { plugins, totalCount } = await get<{
      plugins: App[];
      totalCount: number;
    }>(`${storeApiUrl}/plugins/installed`, {
      params: toSnakeCase({ skip, take }),
    });

    if (!totalCount) return { apps: [], totalCount: 0 };

    return {
      apps: plugins.filter(({ id }) => id !== feeAppId).map(normalizeApp),
      totalCount,
    };
  } catch {
    return { apps: [], totalCount: 0 };
  }
};

export const getOneInchToken = async (
  chain: EvmChain,
  id: string,
): Promise<Token> => {
  const tokens = await externalGet<OneInchToken[]>(
    `${vultiApiUrl}/1inch/token/v1.2/${evmChainInfo[chain].id}/search?query=${id}`,
  );

  const token = tokens.find(
    (token) => token.address.toLowerCase() === id.toLowerCase(),
  );

  if (!token) throw new Error();

  return {
    chain,
    decimals: token.decimals,
    id: token.address,
    logo: token.logoURI || "",
    name: token.name,
    ticker: token.symbol,
  };
};

export const getOneInchTokens = async (chain: EvmChain): Promise<Token[]> => {
  const { tokens } = await externalGet<{
    tokens: Record<string, OneInchToken>;
  }>(`${vultiApiUrl}/1inch/swap/v6.0/${evmChainInfo[chain].id}/tokens`);

  const tokenList = Object.values(tokens).map((token) => ({
    chain,
    decimals: token.decimals,
    id: token.address,
    logo: token.logoURI || "",
    name: token.name,
    ticker: token.symbol,
  }));

  // Add VULT token for Ethereum chain
  if (chain === evmChains.Ethereum) {
    tokenList.push({
      chain,
      decimals: 18,
      id: "0xb788144df611029c60b859df47e79b7726c4deba",
      logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/33502.png",
      name: "Vultisig Token",
      ticker: "VULT",
    });
  }

  return tokenList;
};

export const getAutomations = async ({
  active,
  appId,
  skip = 0,
  take = defaultPageSize,
}: ListFilters & { active: boolean; appId: string }): Promise<{
  automations: AppAutomation[];
  total: number;
}> => {
  try {
    const { policies: automations, totalCount: total } = await get<{
      policies: AppAutomation[];
      totalCount: number;
    }>(`${storeApiUrl}/plugin/policies/${appId}`, {
      params: toSnakeCase({ active, skip, take }),
    });

    if (!total) return { automations: [], total: 0 };

    return { automations, total };
  } catch {
    return { automations: [], total: 0 };
  }
};

export const getRecipeSpecification = async (
  appId: string,
): Promise<RecipeSchema> => {
  const { configurationExample, ...rest } = await get<RecipeSchema>(
    `${storeApiUrl}/plugins/${appId}/recipe-specification`,
  );

  if (appId !== recurringSwapsAppId) return rest as RecipeSchema;

  return { configurationExample, ...rest };
};

export const getRecipeSuggestion = async (
  appId: string,
  configuration: JsonObject,
): Promise<PolicySuggest> => {
  const suggest = await post<PolicySuggestJson>(
    `${storeApiUrl}/plugins/${appId}/recipe-specification/suggest`,
    { configuration },
  );

  return fromJson(PolicySuggestSchema, suggest);
};

export const getReviews = async ({
  appId,
  skip,
  take = defaultPageSize,
}: ListFilters & { appId: string }): Promise<{
  reviews: Review[];
  totalCount: number;
}> => {
  try {
    const { reviews, totalCount } = await get<{
      reviews: Review[];
      totalCount: number;
    }>(`${storeApiUrl}/plugins/${appId}/reviews`, {
      params: toSnakeCase({ skip, take }),
    });

    if (!totalCount) return { reviews: [], totalCount: 0 };

    return { reviews, totalCount };
  } catch {
    return { reviews: [], totalCount: 0 };
  }
};

export const getTransactions = async ({
  skip,
  take = defaultPageSize,
}: ListFilters): Promise<{ total: number; transactions: Transaction[] }> => {
  try {
    const { history: transactions, totalCount: total } = await get<{
      history: Transaction[];
      totalCount: number;
    }>(`${storeApiUrl}/plugin/transactions`, {
      params: toSnakeCase({ skip, take }),
    });

    if (!total) return { total: 0, transactions: [] };

    return { total, transactions };
  } catch {
    return { total: 0, transactions: [] };
  }
};

export const getJupiterToken = async (id: string): Promise<Token> => {
  const [jupiterToken] = await externalGet<JupiterToken[]>(
    `${vultiApiUrl}/jup/tokens/v2/search?query=${id}`,
  );

  if (!jupiterToken) throw new Error();

  return {
    chain: chains.Solana,
    decimals: jupiterToken.decimals,
    id: jupiterToken.id,
    logo: jupiterToken.icon || "",
    name: jupiterToken.name,
    ticker: jupiterToken.symbol,
  };
};

export const getJupiterTokens = async (): Promise<Token[]> => {
  const jupiterTokens = await externalGet<JupiterToken[]>(
    `${vultiApiUrl}/jup/tokens/v2/tag?query=verified`,
  );

  return jupiterTokens.map((token) => ({
    chain: chains.Solana,
    decimals: token.decimals,
    id: token.id,
    logo: token.icon || "",
    name: token.name,
    ticker: token.symbol,
  }));
};

export const isAppInstalled = async (id: string): Promise<boolean> => {
  return get(`${storeApiUrl}/vault/exist/${id}/${getVaultId()}`)
    .then(() => true)
    .catch(() => false);
};

export const reshareVault = async (data: ReshareForm): Promise<void> => {
  return post<void>(`${storeApiUrl}/vault/reshare`, toSnakeCase(data));
};

export const uninstallApp = async (appId: string): Promise<void> => {
  return del<void>(`${storeApiUrl}/plugin/${appId}`);
};
