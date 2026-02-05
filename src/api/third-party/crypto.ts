import { thirdPartyClient } from "@/api/third-party/client";
import {
  Chain,
  chains,
  coinGeckoNetwork,
  ethL2Chains,
  EvmChain,
  evmChainInfo,
  evmChains,
} from "@/utils/chain";
import { vultiApiUrl } from "@/utils/constants";
import { Currency } from "@/utils/currency";
import { JupiterToken, OneInchToken, Token } from "@/utils/types";

export const getBaseValue = async (currency: Currency): Promise<number> => {
  if (currency === "usd") return 1;

  const modifiedCurrency = currency.toUpperCase();

  try {
    const { data } = await thirdPartyClient.get<{
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

export const getJupiterToken = async (id: string): Promise<Token> => {
  const [jupiterToken] = await thirdPartyClient.get<JupiterToken[]>(
    `${vultiApiUrl}/jup/tokens/v2/search?query=${id}`,
  );

  if (!jupiterToken) throw new Error("Token not found");

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
  const jupiterTokens = await thirdPartyClient.get<JupiterToken[]>(
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

export const getOneInchToken = async (
  chain: EvmChain,
  id: string,
): Promise<Token> => {
  const tokens = await thirdPartyClient.get<OneInchToken[]>(
    `${vultiApiUrl}/1inch/token/v1.2/${evmChainInfo[chain].id}/search?query=${id}`,
  );

  const token = tokens.find(
    (token) => token.address.toLowerCase() === id.toLowerCase(),
  );

  if (!token) throw new Error("Token not found");

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
  const { tokens } = await thirdPartyClient.get<{
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

    const data = await thirdPartyClient.get<{
      [contractAddress: string]: { usd: number };
    }>(url);
    const [item] = Object.values(data);

    return item?.usd || 0;
  } catch {
    return 0;
  }
};
