import { useQueryClient } from "@tanstack/react-query";
import { Address, createPublicClient, erc20Abi, http } from "viem";

import { getApp } from "@/api/store";
import {
  getJupiterToken,
  getJupiterTokens,
  getOneInchToken,
  getOneInchTokens,
} from "@/api/third-party/crypto";
import {
  Chain,
  chains,
  EvmChain,
  evmChainInfo,
  evmChains,
} from "@/utils/chain";
import { Token } from "@/utils/types";

export const useQueries = () => {
  const queryClient = useQueryClient();

  const getAppData = async (id: string, refetch?: boolean) => {
    const queryKey = ["apps", id.toLowerCase()];

    if (refetch) await queryClient.refetchQueries({ queryKey });

    return await queryClient.fetchQuery({
      queryKey,
      queryFn: () => getApp(id),
      staleTime: Infinity,
    });
  };

  const getTokenData = async (chain: Chain, id: string, refetch?: boolean) => {
    const queryKey = ["tokens", chain.toLowerCase(), id.toLowerCase()];

    if (refetch) await queryClient.refetchQueries({ queryKey });

    return await queryClient.fetchQuery({
      queryKey,
      queryFn: async () => {
        if (chain in evmChains) {
          return await getOneInchToken(chain as EvmChain, id).catch(
            async () => {
              const client = createPublicClient({
                chain: evmChainInfo[chain as EvmChain],
                transport: http(),
              });

              const [decimals, name, ticker] = await Promise.all([
                client.readContract({
                  address: id as Address,
                  abi: erc20Abi,
                  functionName: "decimals",
                }),
                client.readContract({
                  address: id as Address,
                  abi: erc20Abi,
                  functionName: "name",
                }),
                client.readContract({
                  address: id as Address,
                  abi: erc20Abi,
                  functionName: "symbol",
                }),
              ]);

              const token: Token = {
                chain,
                decimals,
                id,
                logo: "",
                name,
                ticker,
              };

              return token;
            },
          );
        } else if (chain === chains.Solana) {
          return await getJupiterToken(id);
        } else {
          throw new Error();
        }
      },
      staleTime: Infinity,
    });
  };

  const getTokenList = async (chain: Chain, refetch?: boolean) => {
    const queryKey = ["tokens", chain.toLowerCase()];

    if (refetch) await queryClient.refetchQueries({ queryKey });

    return await queryClient.fetchQuery({
      queryKey,
      queryFn: async () => {
        if (chain === chains.Solana) {
          return await getJupiterTokens();
        } else if (chain in evmChains) {
          return await getOneInchTokens(chain as EvmChain);
        } else {
          throw new Error();
        }
      },
      staleTime: Infinity,
    });
  };

  return { getAppData, getTokenData, getTokenList };
};
