import { Chain as ViemChain, defineChain } from "viem";
import {
  arbitrum,
  avalanche,
  base,
  blast,
  bsc,
  cronos,
  mainnet,
  mantle,
  optimism,
  polygon,
  sei,
  zksync,
} from "viem/chains";

import { vultiApiUrl } from "@/utils/constants";
import { Token } from "@/utils/types";

const cosmosExplorerUrl = "https://www.mintscan.io" as const;
const hyperliquidExplorerUrl = "https://liquidscan.io" as const;

const cosmosChains = {
  Akash: "Akash",
  Cosmos: "Cosmos",
  Dydx: "Dydx",
  Kujira: "Kujira",
  MayaChain: "MayaChain",
  Noble: "Noble",
  Osmosis: "Osmosis",
  Terra: "Terra",
  TerraClassic: "TerraClassic",
  THORChain: "THORChain",
} as const;

export const ethL2Chains = {
  Arbitrum: "Arbitrum",
  Base: "Base",
  Blast: "Blast",
  Mantle: "Mantle",
  Optimism: "Optimism",
  Zksync: "Zksync",
} as const;

export const evmChains = {
  ...ethL2Chains,
  Avalanche: "Avalanche",
  BSC: "BSC",
  CronosChain: "CronosChain",
  Ethereum: "Ethereum",
  Hyperliquid: "Hyperliquid",
  Polygon: "Polygon",
  Sei: "Sei",
} as const;

const otherChains = {
  Cardano: "Cardano",
  Polkadot: "Polkadot",
  Ripple: "Ripple",
  Solana: "Solana",
  Sui: "Sui",
  Ton: "Ton",
  Tron: "Tron",
} as const;

const utxoChains = {
  Bitcoin: "Bitcoin",
  BitcoinCash: "Bitcoin-Cash",
  Litecoin: "Litecoin",
  Dogecoin: "Dogecoin",
  Dash: "Dash",
  Zcash: "Zcash",
} as const;

export const chains = {
  ...cosmosChains,
  ...evmChains,
  ...utxoChains,
  ...otherChains,
} as const;

const decimals: Record<Chain, number> = {
  [chains.Akash]: 6,
  [chains.Arbitrum]: 18,
  [chains.Avalanche]: 18,
  [chains.Base]: 18,
  [chains.Bitcoin]: 8,
  [chains.BitcoinCash]: 8,
  [chains.Blast]: 18,
  [chains.BSC]: 18,
  [chains.Cardano]: 6,
  [chains.Cosmos]: 6,
  [chains.CronosChain]: 18,
  [chains.Dash]: 8,
  [chains.Dogecoin]: 8,
  [chains.Dydx]: 18,
  [chains.Ethereum]: 18,
  [chains.Hyperliquid]: 18,
  [chains.Kujira]: 6,
  [chains.Litecoin]: 8,
  [chains.Mantle]: 18,
  [chains.MayaChain]: 10,
  [chains.Noble]: 6,
  [chains.Optimism]: 18,
  [chains.Osmosis]: 6,
  [chains.Polkadot]: 10,
  [chains.Polygon]: 18,
  [chains.Ripple]: 6,
  [chains.Solana]: 9,
  [chains.Sei]: 18,
  [chains.Sui]: 9,
  [chains.Terra]: 6,
  [chains.TerraClassic]: 6,
  [chains.THORChain]: 8,
  [chains.Ton]: 9,
  [chains.Tron]: 6,
  [chains.Zcash]: 8,
  [chains.Zksync]: 18,
};

const tickers: Record<Chain, string> = {
  [chains.Akash]: "AKT",
  [chains.Arbitrum]: "ARB",
  [chains.Avalanche]: "AVAX",
  [chains.Base]: "BASE",
  [chains.Bitcoin]: "BTC",
  [chains.BitcoinCash]: "BCH",
  [chains.Blast]: "BLAST",
  [chains.BSC]: "BNB",
  [chains.Cardano]: "ADA",
  [chains.Cosmos]: "ATOM",
  [chains.CronosChain]: "CRO",
  [chains.Dash]: "DASH",
  [chains.Dogecoin]: "DOGE",
  [chains.Dydx]: "DYDX",
  [chains.Ethereum]: "ETH",
  [chains.Hyperliquid]: "HYPE",
  [chains.Kujira]: "KUJI",
  [chains.Litecoin]: "LTC",
  [chains.Mantle]: "MNT",
  [chains.MayaChain]: "CACAO",
  [chains.Noble]: "USDC",
  [chains.Optimism]: "OP",
  [chains.Osmosis]: "OSMO",
  [chains.Polkadot]: "DOT",
  [chains.Polygon]: "POL",
  [chains.Ripple]: "XRP",
  [chains.Solana]: "SOL",
  [chains.Sei]: "SEI",
  [chains.Sui]: "SUI",
  [chains.Terra]: "LUNA",
  [chains.TerraClassic]: "LUNC",
  [chains.THORChain]: "RUNE",
  [chains.Ton]: "TON",
  [chains.Tron]: "TRX",
  [chains.Zcash]: "ZEC",
  [chains.Zksync]: "ZK",
};

const evmRpcUrls: Record<EvmChain, string> = {
  [evmChains.Arbitrum]: `${vultiApiUrl}/arb/`,
  [evmChains.Avalanche]: `${vultiApiUrl}/avax/`,
  [evmChains.Base]: `${vultiApiUrl}/base/`,
  [evmChains.Blast]: `${vultiApiUrl}/blast/`,
  [evmChains.CronosChain]: "https://cronos-evm-rpc.publicnode.com",
  [evmChains.BSC]: `${vultiApiUrl}/bsc/`,
  [evmChains.Ethereum]: `${vultiApiUrl}/eth/`,
  [evmChains.Hyperliquid]: `${vultiApiUrl}/hyperevm/`,
  [evmChains.Mantle]: `${vultiApiUrl}/mantle/`,
  [evmChains.Optimism]: `${vultiApiUrl}/opt/`,
  [evmChains.Polygon]: `${vultiApiUrl}/polygon/`,
  [evmChains.Sei]: `https://evm-rpc.sei-apis.com`,
  [evmChains.Zksync]: `${vultiApiUrl}/zksync/`,
};

const coinGeckoOverrides: Partial<Record<Chain, string>> = {
  [chains.Arbitrum]: "arbitrum-one",
  [chains.Avalanche]: "avalanche-2",
  [chains.BSC]: "binance-smart-chain",
  [chains.CronosChain]: "cronos",
  [chains.MayaChain]: "cacao",
  [chains.Optimism]: "optimistic-ethereum",
  [chains.Polygon]: "polygon-pos",
  [chains.Sei]: "sei-network",
};

export const coinGeckoNetwork = Object.fromEntries(
  Object.values(chains).map((chain) => [
    chain,
    coinGeckoOverrides[chain] ?? chain.toLowerCase(),
  ]),
) as Record<Chain, string>;

export const evmChainInfo: Record<EvmChain, ViemChain> = {
  [evmChains.Arbitrum]: {
    ...arbitrum,
    rpcUrls: { default: { http: [evmRpcUrls.Arbitrum] } },
  },
  [evmChains.Avalanche]: {
    ...avalanche,
    rpcUrls: { default: { http: [evmRpcUrls.Avalanche] } },
  },
  [evmChains.Base]: {
    ...base,
    rpcUrls: { default: { http: [evmRpcUrls.Base] } },
  },
  [evmChains.Blast]: {
    ...blast,
    rpcUrls: { default: { http: [evmRpcUrls.Blast] } },
  },
  [evmChains.BSC]: { ...bsc, rpcUrls: { default: { http: [evmRpcUrls.BSC] } } },
  [evmChains.CronosChain]: {
    ...cronos,
    rpcUrls: { default: { http: [evmRpcUrls.CronosChain] } },
  },
  [evmChains.Ethereum]: {
    ...mainnet,
    rpcUrls: { default: { http: [evmRpcUrls.Ethereum] } },
  },
  [evmChains.Hyperliquid]: defineChain({
    id: 999,
    name: "Hyperliquid",
    network: "hyperliquid",
    nativeCurrency: {
      name: "Hyperliquid",
      symbol: tickers.Hyperliquid,
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [evmRpcUrls.Hyperliquid] },
      public: { http: [evmRpcUrls.Hyperliquid] },
    },
    blockExplorers: {
      default: { name: "LiquidScan", url: hyperliquidExplorerUrl },
    },
  }),
  [evmChains.Mantle]: {
    ...mantle,
    rpcUrls: { default: { http: [evmRpcUrls.Mantle] } },
  },
  [evmChains.Optimism]: {
    ...optimism,
    rpcUrls: { default: { http: [evmRpcUrls.Optimism] } },
  },
  [evmChains.Polygon]: {
    ...polygon,
    rpcUrls: { default: { http: [evmRpcUrls.Polygon] } },
  },
  [evmChains.Sei]: { ...sei, rpcUrls: { default: { http: [evmRpcUrls.Sei] } } },
  [evmChains.Zksync]: {
    ...zksync,
    rpcUrls: { default: { http: [evmRpcUrls.Zksync] } },
  },
};

export const explorerBaseUrl: Record<Chain, string> = {
  [chains.Akash]: `${cosmosExplorerUrl}/akash`,
  [chains.Arbitrum]: "https://arbiscan.io",
  [chains.Avalanche]: "https://snowtrace.io",
  [chains.Base]: "https://basescan.org",
  [chains.Bitcoin]: "https://mempool.space",
  [chains.BitcoinCash]: "https://blockchair.com/bitcoin-cash",
  [chains.Blast]: "https://blastscan.io",
  [chains.BSC]: "https://bscscan.com",
  [chains.Cardano]: "https://cardanoscan.io",
  [chains.Cosmos]: `${cosmosExplorerUrl}/cosmos`,
  [chains.CronosChain]: "https://cronoscan.com",
  [chains.Dash]: "https://blockchair.com/dash",
  [chains.Dogecoin]: "https://blockchair.com/dogecoin",
  [chains.Dydx]: `${cosmosExplorerUrl}/dydx`,
  [chains.Ethereum]: "https://etherscan.io",
  [chains.Hyperliquid]: hyperliquidExplorerUrl,
  [chains.Kujira]: "https://finder.kujira.network/kaiyo-1",
  [chains.Litecoin]: "https://blockchair.com/litecoin",
  [chains.Mantle]: "https://explorer.mantle.xyz",
  [chains.MayaChain]: "https://www.explorer.mayachain.info",
  [chains.Noble]: `${cosmosExplorerUrl}/noble`,
  [chains.Optimism]: "https://optimistic.etherscan.io",
  [chains.Osmosis]: `${cosmosExplorerUrl}/osmosis`,
  [chains.Polkadot]: "https://assethub-polkadot.subscan.io",
  [chains.Polygon]: "https://polygonscan.com",
  [chains.Ripple]: "https://xrpscan.com",
  [chains.Sei]: "https://seiscan.io",
  [chains.Solana]: "https://solscan.io",
  [chains.Sui]: "https://suiscan.xyz/mainnet",
  [chains.Terra]: `${cosmosExplorerUrl}/terra`,
  [chains.TerraClassic]: "https://finder.terra.money/classic",
  [chains.THORChain]: "https://thorchain.net",
  [chains.Ton]: "https://tonviewer.com",
  [chains.Tron]: "https://tronscan.org/#",
  [chains.Zcash]: "https://blockexplorer.one/zcash/mainnet",
  [chains.Zksync]: "https://explorer.zksync.io",
};

export const nativeTokens = Object.values(chains).reduce(
  (acc, chain) => {
    const isEvm = chain in ethL2Chains;

    acc[chain] = isEvm
      ? {
          chain: chains.Ethereum,
          decimals: decimals[chains.Ethereum],
          id: "",
          logo: `/tokens/${chains.Ethereum.toLowerCase()}.svg`,
          name: chains.Ethereum,
          ticker: tickers[chains.Ethereum],
        }
      : {
          chain,
          decimals: decimals[chain],
          id: "",
          logo: `/tokens/${chain.toLowerCase()}.svg`,
          name: chain,
          ticker: tickers[chain],
        };
    return acc;
  },
  {} as Record<Chain, Token>,
);

export type Chain = (typeof chains)[keyof typeof chains];
export type EvmChain = (typeof evmChains)[keyof typeof evmChains];
