import { create, JsonObject } from "@bufbuild/protobuf";
import { TimestampSchema } from "@bufbuild/protobuf/wkt";
import { v4 as uuidv4 } from "uuid";
import { formatUnits } from "viem";

import { BillingFrequency, FeePolicySchema, FeeType } from "@/proto/policy_pb";
import { Chain, chains, explorerBaseUrl } from "@/utils/chain";
import { Currency, currencySymbols } from "@/utils/currency";
import {
  App,
  AppAutomation,
  AppPricing,
  Configuration,
  CSSProperties,
  Definitions,
  FieldProps,
} from "@/utils/types";

const isArray = (arr: any): arr is any[] => {
  return Array.isArray(arr);
};

const isObject = (obj: any): obj is Record<string, any> => {
  return obj === Object(obj) && !isArray(obj) && typeof obj !== "function";
};

const toCamel = (value: string) => {
  return value.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace("-", "").replace("_", "");
  });
};

const toKebab = (value: string) => {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
};

const toSnake = (value: string) => {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const toTimestamp = (date: Date) => {
  const millis = date.getTime();

  return {
    nanos: (millis % 1000) * 1_000_000,
    seconds: BigInt(Math.floor(millis / 1000)),
  };
};

export const camelCaseToTitle = (input: string) => {
  if (!input) return input;

  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const cssPropertiesToString = (styles: CSSProperties) => {
  return Object.entries(styles)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${toKebab(key)}: ${value};`)
    .join("\n");
};

export const getConfiguration = (
  configuration: Configuration,
  values: JsonObject,
  definitions?: Definitions,
): JsonObject => {
  return Object.fromEntries(
    Object.entries(configuration.properties).flatMap(([key, field]) => {
      const value = values[key];

      if (value === undefined) return [];

      if (field.$ref) {
        const fieldRef = getFieldRef(field, definitions);

        if (!fieldRef) return [];

        return [
          [key, getConfiguration(fieldRef, value as JsonObject, definitions)],
        ];
      }

      return [[key, value]];
    }),
  );
};

export const getExplorerUrl = (
  chain: Chain,
  entity: "address" | "tx",
  value: string,
): string => {
  const baseUrl = explorerBaseUrl[chain];

  return match(entity, {
    address: () =>
      match(chain, {
        [chains.Akash]: () => `${baseUrl}/address/${value}`,
        [chains.Arbitrum]: () => `${baseUrl}/address/${value}`,
        [chains.Avalanche]: () => `${baseUrl}/address/${value}`,
        [chains.Base]: () => `${baseUrl}/address/${value}`,
        [chains.Bitcoin]: () => `${baseUrl}/address/${value}`,
        [chains.BitcoinCash]: () => `${baseUrl}/address/${value}`,
        [chains.Blast]: () => `${baseUrl}/address/${value}`,
        [chains.BSC]: () => `${baseUrl}/address/${value}`,
        [chains.Cardano]: () => `${baseUrl}/address/${value}`,
        [chains.Cosmos]: () => `${baseUrl}/address/${value}`,
        [chains.CronosChain]: () => `${baseUrl}/address/${value}`,
        [chains.Dash]: () => `${baseUrl}/address/${value}`,
        [chains.Dogecoin]: () => `${baseUrl}/address/${value}`,
        [chains.Dydx]: () => `${baseUrl}/address/${value}`,
        [chains.Ethereum]: () => `${baseUrl}/address/${value}`,
        [chains.Hyperliquid]: () => `${baseUrl}/address/${value}`,
        [chains.Kujira]: () => `${baseUrl}/address/${value}`,
        [chains.Litecoin]: () => `${baseUrl}/address/${value}`,
        [chains.Mantle]: () => `${baseUrl}/address/${value}`,
        [chains.MayaChain]: () => `${baseUrl}/address/${value}`,
        [chains.Noble]: () => `${baseUrl}/address/${value}`,
        [chains.Optimism]: () => `${baseUrl}/address/${value}`,
        [chains.Osmosis]: () => `${baseUrl}/address/${value}`,
        [chains.Polkadot]: () => `${baseUrl}/account/${value}`,
        [chains.Polygon]: () => `${baseUrl}/address/${value}`,
        [chains.Ripple]: () => `${baseUrl}/account/${value}`,
        [chains.Sei]: () => `${baseUrl}/address/${value}`,
        [chains.Solana]: () => `${baseUrl}/address/${value}`,
        [chains.Sui]: () => `${baseUrl}/address/${value}`,
        [chains.Terra]: () => `${baseUrl}/address/${value}`,
        [chains.TerraClassic]: () => `${baseUrl}/classic/address/${value}`,
        [chains.THORChain]: () => `${baseUrl}/address/${value}`,
        [chains.Ton]: () => `${baseUrl}/${value}`,
        [chains.Tron]: () => `${baseUrl}/address/${value}`,
        [chains.Zcash]: () => `${baseUrl}/address/${value}`,
        [chains.Zksync]: () => `${baseUrl}/address/${value}`,
      }),
    tx: () =>
      match(chain, {
        [chains.Akash]: () => `${baseUrl}/tx/${value}`,
        [chains.Arbitrum]: () => `${baseUrl}/tx/${value}`,
        [chains.Avalanche]: () => `${baseUrl}/tx/${value}`,
        [chains.Base]: () => `${baseUrl}/tx/${value}`,
        [chains.Bitcoin]: () => `${baseUrl}/tx/${value}`,
        [chains.BitcoinCash]: () => `${baseUrl}/transaction/${value}`,
        [chains.Blast]: () => `${baseUrl}/tx/${value}`,
        [chains.BSC]: () => `${baseUrl}/tx/${value}`,
        [chains.Cardano]: () => `${baseUrl}/transaction/${value}`,
        [chains.Cosmos]: () => `${baseUrl}/tx/${value}`,
        [chains.CronosChain]: () => `${baseUrl}/tx/${value}`,
        [chains.Dash]: () => `${baseUrl}/transaction/${value}`,
        [chains.Dogecoin]: () => `${baseUrl}/transaction/${value}`,
        [chains.Dydx]: () => `${baseUrl}/tx/${value}`,
        [chains.Ethereum]: () => `${baseUrl}/tx/${value}`,
        [chains.Hyperliquid]: () => `${baseUrl}/tx/${value}`,
        [chains.Kujira]: () => `${baseUrl}/tx/${value}`,
        [chains.Litecoin]: () => `${baseUrl}/transaction/${value}`,
        [chains.Mantle]: () => `${baseUrl}/tx/${value}`,
        [chains.MayaChain]: () => `${baseUrl}/tx/${value}`,
        [chains.Noble]: () => `${baseUrl}/tx/${value}`,
        [chains.Optimism]: () => `${baseUrl}/tx/${value}`,
        [chains.Osmosis]: () => `${baseUrl}/tx/${value}`,
        [chains.Polkadot]: () => `${baseUrl}/extrinsic/${value}`,
        [chains.Polygon]: () => `${baseUrl}/tx/${value}`,
        [chains.Ripple]: () => `${baseUrl}/transaction/${value}`,
        [chains.Sei]: () => `${baseUrl}/tx/${value}`,
        [chains.Solana]: () => `${baseUrl}/tx/${value}`,
        [chains.Sui]: () => `${baseUrl}/tx/${value}`,
        [chains.Terra]: () => `${baseUrl}/tx/${value}`,
        [chains.TerraClassic]: () => `${baseUrl}/tx/${value}`,
        [chains.THORChain]: () => `${baseUrl}/tx/${value}`,
        [chains.Ton]: () => `${baseUrl}/transaction/${value}`,
        [chains.Tron]: () => `${baseUrl}/transaction/${value}`,
        [chains.Zcash]: () => `${baseUrl}/tx/${value}`,
        [chains.Zksync]: () => `${baseUrl}/tx/${value}`,
      }),
  });
};

export const getFeePolicies = (pricing: AppPricing[]) => {
  return pricing.map((price) => {
    let frequency = BillingFrequency.BILLING_FREQUENCY_UNSPECIFIED;
    let type = FeeType.FEE_TYPE_UNSPECIFIED;

    switch (price.frequency) {
      case "daily":
        frequency = BillingFrequency.DAILY;
        break;
      case "weekly":
        frequency = BillingFrequency.WEEKLY;
        break;
      case "biweekly":
        frequency = BillingFrequency.BIWEEKLY;
        break;
      case "monthly":
        frequency = BillingFrequency.MONTHLY;
        break;
    }

    switch (price.type) {
      case "once":
        type = FeeType.ONCE;
        break;
      case "recurring":
        type = FeeType.RECURRING;
        break;
      case "per-tx":
        type = FeeType.TRANSACTION;
        break;
    }

    return create(FeePolicySchema, {
      amount: BigInt(price.amount),
      description: "",
      frequency,
      id: uuidv4(),
      startDate: create(TimestampSchema, toTimestamp(new Date())),
      type,
    });
  });
};

export const getFieldRef = (field: FieldProps, definitions?: Definitions) => {
  if (!definitions) return;

  const key = field.$ref?.replace("#/definitions/", "");

  if (!key || !definitions[key]) return;

  return definitions[key];
};

export const kebabCaseToTitle = (input: string) => {
  if (!input) return input;

  return input
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const match = <T extends string | number | symbol, V>(
  value: T,
  handlers: { [key in T]: () => V },
): V => {
  const handler = handlers[value];

  return handler();
};

export const normalizeApp = (app: App) => {
  const {
    avgRating = 0,
    faqs = [],
    features = [],
    images = [],
    installations = 0,
    logoUrl = "",
    pricing = [],
    ratesCount = 0,
    ratings = [],
    thumbnailUrl = "",
    ...rest
  } = app;

  const normalizedApp: App = {
    ...rest,
    avgRating,
    faqs,
    features,
    images,
    installations,
    logoUrl,
    pricing,
    ratings: ratings.sort((a, b) => b.rating - a.rating),
    ratesCount,
    thumbnailUrl,
  };

  return normalizedApp;
};

export const policyToHexMessage = ({
  pluginVersion,
  policyVersion,
  publicKey,
  recipe,
}: Pick<
  AppAutomation,
  "pluginVersion" | "policyVersion" | "publicKey" | "recipe"
>) => {
  const delimiter = "*#*";

  const fields = [recipe, publicKey, String(policyVersion), pluginVersion];

  for (const item of fields) {
    if (item.includes(delimiter)) {
      throw new Error("invalid policy signature");
    }
  }

  return fields.join(delimiter);
};

export const pricingText = ({
  baseValue,
  currency,
  amount,
  frequency,
  type,
}: Pick<AppPricing, "amount" | "frequency" | "type"> & {
  baseValue: number;
  currency: Currency;
}) => {
  const value = toValueFormat(
    formatUnits(BigInt(amount * baseValue), 6),
    currency,
    8,
  );

  switch (type) {
    case "once":
      return `${value} one time installation`;
    case "per-tx":
      return `${value} per transaction`;
    case "recurring":
      return `${value} ${frequency} recurring`;
    default:
      return "Unknown pricing type";
  }
};

export const scrollSelectDropdownToTop = (dropdownClassName: string) => {
  requestAnimationFrame(() => {
    const holder = document.querySelector(
      `.${dropdownClassName} .rc-virtual-list-holder`,
    ) as HTMLDivElement | null;

    holder?.scrollTo({ top: 0 });
  });
};

export const snakeCaseToTitle = (input: string) => {
  if (!input) return input;

  return input
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const toCamelCase = <T>(obj: T): T => {
  if (isObject(obj)) {
    const result: Record<string, unknown> = {};

    Object.keys(obj).forEach((key) => {
      const camelKey = toCamel(key);
      result[camelKey] = toCamelCase((obj as Record<string, unknown>)[key]);
    });

    return result as T;
  } else if (isArray(obj)) {
    return obj.map((item) => toCamelCase(item)) as T;
  }

  return obj;
};

// export const toKebabCase = <T>(obj: T): T => {
//   if (isObject(obj)) {
//     const result: Record<string, unknown> = {};

//     Object.keys(obj).forEach((key) => {
//       const kebabKey = toKebab(key);
//       result[kebabKey] = toKebabCase((obj as Record<string, unknown>)[key]);
//     });

//     return result as T;
//   } else if (isArray(obj)) {
//     return obj.map((item) => toKebabCase(item)) as T;
//   }

//   return obj;
// };

export const toNumberFormat = (value: number | string, decimal = 20) => {
  const str = String(value).trim();

  // If not a valid number string, return as-is
  if (!/^-?\d+(\.\d+)?$/.test(str)) return str;

  const [intPartRaw, decPartRaw = ""] = str.split(".");

  // Format integer part with commas
  const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Trim or pad decimals
  const decPart = decPartRaw.slice(0, decimal);

  return decPart.length > 0 ? `${intPart}.${decPart}` : intPart;
};

export const toSnakeCase = <T>(obj: T): T => {
  if (isObject(obj)) {
    const result: Record<string, unknown> = {};

    Object.keys(obj).forEach((key) => {
      const snakeKey = toSnake(key);
      result[snakeKey] = toSnakeCase((obj as Record<string, unknown>)[key]);
    });

    return result as T;
  } else if (isArray(obj)) {
    return obj.map((item) => toSnakeCase(item)) as T;
  }

  return obj;
};

export const toValueFormat = (
  value: number | string,
  currency: Currency,
  decimal = 2,
): string => {
  return `${currencySymbols[currency]}${toNumberFormat(value, decimal)}`;
};

export const tinyId = () => {
  return `id-${(Date.now() + Math.random()).toString(36).replace(".", "-")}`;
};
