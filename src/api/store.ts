import { fromJson, JsonObject } from "@bufbuild/protobuf";
import { jwtDecode } from "jwt-decode";

import { apiClient } from "@/api/client";
import { mockFAQs } from "@/data/mockData";
import {
  PolicySuggest,
  PolicySuggestJson,
  PolicySuggestSchema,
} from "@/proto/policy_pb";
import { getVaults } from "@/storage/vaults";
import {
  defaultPageSize,
  feeAppId,
  hiddenAppIds,
  recurringSwapsAppId,
} from "@/utils/constants";
import { normalizeApp } from "@/utils/functions";
import { toSnakeCase } from "@/utils/functions";
import {
  App,
  AppAutomation,
  AppFilters,
  AuthToken,
  Billing,
  Category,
  FeeAppStatus,
  FeeTransaction,
  ListFilters,
  RecipeSchema,
  ReportForm,
  ReshareForm,
  Review,
  ReviewForm,
  Transaction,
} from "@/utils/types";

export const addAutomation = async (data: AppAutomation): Promise<void> => {
  return apiClient.post<void>("/plugin/policy", toSnakeCase(data));
};

export const addReview = async (
  appId: string,
  data: ReviewForm,
): Promise<void> => {
  return apiClient.post<void>(`/plugins/${appId}/reviews`, toSnakeCase(data));
};

export const appReport = async (
  appId: string,
  data: ReportForm,
): Promise<void> => {
  return apiClient.post<void>(`/plugins/${appId}/report`, toSnakeCase(data));
};

export const delAuthToken = async (refreshToken: string): Promise<void> => {
  const { token_id } = jwtDecode<{ token_id: string }>(refreshToken);

  return apiClient.del(`/auth/tokens/${token_id}`);
};

export const delAutomation = async (
  id: string,
  signature: string,
): Promise<void> => {
  return apiClient.del<void>(`/plugin/policy/${id}`, {
    data: { signature },
  });
};

export const getAuthToken = async (data: {
  chainCodeHex: string;
  message: string;
  publicKey: string;
  signature: string;
}): Promise<AuthToken> => {
  return apiClient.post<AuthToken>("/auth", toSnakeCase(data));
};

export const getApp = async (id: string): Promise<App> => {
  const app = await apiClient.get<App>(`/plugins/${id}`);

  const faq = mockFAQs[id];

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
    const { plugins, totalCount } = await apiClient.get<{
      plugins: App[];
      totalCount: number;
    }>("/plugins", {
      params: toSnakeCase({ categoryId, skip, sort, take, term }),
    });

    if (!totalCount) return { apps: [], totalCount: 0 };

    // Todo: Remove feeAppId/listingPaymentAppId filter when filtering is handled server-side
    const apps = plugins
      .filter(({ id }) => !hiddenAppIds.has(id))
      .map(normalizeApp);

    return { apps, totalCount };
  } catch {
    return { apps: [], totalCount: 0 };
  }
};

export const getCategories = async (): Promise<Category[]> => {
  return apiClient
    .get<Category[]>("/categories")
    .then((categories) => [{ id: "", name: "All" }, ...categories]);
};

export const getFeeAppStatus = async (): Promise<FeeAppStatus> => {
  const status = await apiClient.getFlexible<FeeAppStatus>("/fee/status");
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
    const { history: transactions, totalCount: total } = await apiClient.get<{
      history: FeeTransaction[];
      totalCount: number;
    }>(`/fee/plugins/${appId}/transactions`, { params: { skip, take } });

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
    const { plugins: billings, totalCount: total } = await apiClient.get<{
      plugins: Billing[];
      totalCount: number;
    }>("/fee/plugins", { params: { skip, take } });
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
    const { plugins, totalCount } = await apiClient.get<{
      plugins: App[];
      totalCount: number;
    }>("/plugins/installed", { params: { skip, take } });

    if (!totalCount) return { apps: [], totalCount: 0 };

    // Todo: Remove feeAppId/listingPaymentAppId filter when filtering is handled server-side
    const apps = plugins
      .filter(({ id }) => !hiddenAppIds.has(id))
      .map(normalizeApp);

    return { apps, totalCount };
  } catch {
    return { apps: [], totalCount: 0 };
  }
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
    const { policies: automations, totalCount: total } = await apiClient.get<{
      policies: AppAutomation[];
      totalCount: number;
    }>(`/plugin/policies/${appId}`, {
      params: { active, skip, take },
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
  const { configurationExample, ...rest } = await apiClient.get<RecipeSchema>(
    `/plugins/${appId}/recipe-specification`,
  );

  if (appId !== recurringSwapsAppId) return rest as RecipeSchema;

  return { configurationExample, ...rest };
};

export const getRecipeSuggestion = async (
  appId: string,
  configuration: JsonObject,
): Promise<PolicySuggest> => {
  const suggest = await apiClient.post<PolicySuggestJson>(
    `/plugins/${appId}/recipe-specification/suggest`,
    { configuration },
  );

  return fromJson(PolicySuggestSchema, suggest);
};

export const getReviews = async ({
  appId,
  skip,
  sort = "-created_at",
  take = defaultPageSize,
}: ListFilters & { appId: string; sort?: string }): Promise<{
  reviews: Review[];
  totalCount: number;
}> => {
  try {
    const { reviews, totalCount } = await apiClient.get<{
      reviews: Review[];
      totalCount: number;
    }>(`/plugins/${appId}/reviews`, { params: { skip, sort, take } });
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
    const { history: transactions, totalCount: total } = await apiClient.get<{
      history: Transaction[];
      totalCount: number;
    }>(`/plugin/transactions`, { params: { skip, take } });

    if (!total) return { total: 0, transactions: [] };

    return { total, transactions };
  } catch {
    return { total: 0, transactions: [] };
  }
};

export const isAppInstalled = async (id: string): Promise<boolean> => {
  try {
    const [vault] = getVaults();

    if (!vault) return false;

    await apiClient.get(`/vault/exist/${id}/${vault.publicKeyEcdsa}`);

    return true;
  } catch {
    return false;
  }
};

export const reshareVault = async (data: ReshareForm): Promise<void> => {
  return apiClient.post<void>("/vault/reshare", toSnakeCase(data));
};

export const uninstallApp = async (appId: string): Promise<void> => {
  return apiClient.del<void>(`/plugin/${appId}`);
};
