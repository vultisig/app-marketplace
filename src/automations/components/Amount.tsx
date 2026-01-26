import { FC, useEffect, useState } from "react";
import { formatUnits } from "viem";

import { useQueries } from "@/hooks/useQueries";
import { Spin } from "@/toolkits/Spin";
import { Chain, nativeTokens } from "@/utils/chain";
import { toNumberFormat } from "@/utils/functions";
import { Token } from "@/utils/types";

export const AutomationAmount: FC<{
  amount: string;
  tokenId: string;
  chain: Chain;
}> = ({ amount, chain, tokenId }) => {
  const [token, setToken] = useState<Token | undefined>(undefined);
  const { getTokenData } = useQueries();

  useEffect(() => {
    let cancelled = false;

    if (tokenId) {
      getTokenData(chain, tokenId)
        .catch(() => undefined)
        .then((token) => {
          if (!cancelled) setToken(token);
        });
    } else {
      setToken(nativeTokens[chain]);
    }

    return () => {
      cancelled = true;
    };
  }, [chain, tokenId]);

  if (!token) return <Spin size="small" />;

  return toNumberFormat(formatUnits(BigInt(amount), token.decimals));
};
