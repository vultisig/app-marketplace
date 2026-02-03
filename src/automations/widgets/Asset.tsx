import { Form, Input, Select, SelectProps } from "antd";
import { FC, useEffect, useState } from "react";
import { useTheme } from "styled-components";

import { TokenImage } from "@/components/TokenImage";
import { useCore } from "@/hooks/useCore";
import { useQueries } from "@/hooks/useQueries";
import { useWalletCore } from "@/hooks/useWalletCore";
import { Divider } from "@/toolkits/Divider";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { Chain, nativeTokens } from "@/utils/chain";
import {
  camelCaseToTitle,
  scrollSelectDropdownToTop,
  tinyId,
} from "@/utils/functions";
import { Token } from "@/utils/types";

export type AssetProps = {
  address: string;
  chain: Chain;
  decimals: number;
  token: string;
  symbol: string;
};

type AssetWidgetProps = {
  chains: Chain[];
  keys: string[];
  noStyle?: boolean;
  prefixKeys?: string[];
};

type StateProps = {
  loading?: boolean;
  tokens: Token[];
};

export const AssetWidget: FC<AssetWidgetProps> = ({
  chains,
  keys,
  noStyle = false,
  prefixKeys = [],
}) => {
  const [state, setState] = useState<StateProps>({ tokens: [] });
  const { loading, tokens } = state;
  const { vault } = useCore();
  const { getTokenData, getTokenList } = useQueries();
  const { isValidAddress } = useWalletCore();
  const colors = useTheme();
  const key = keys[keys.length - 1];
  const addressField = [...prefixKeys, ...keys, "address"];
  const chainField = [...prefixKeys, ...keys, "chain"];
  const decimalsField = [...prefixKeys, ...keys, "decimals"];
  const symbolField = [...prefixKeys, ...keys, "symbol"];
  const tokenField = [...prefixKeys, ...keys, "token"];
  const form = Form.useFormInstance();
  const chain = Form.useWatch<Chain>(chainField, form);
  const tokenSelectDropdownId = tinyId();

  const chainSelectProps: SelectProps<Chain, { label: string; value: string }> =
    {
      onChange: (chain) => {
        if (!vault) return;

        vault.address(chain).then((address) => {
          form.setFieldValue(addressField, address);
          form.setFieldValue(decimalsField, nativeTokens[chain].decimals);
          form.setFieldValue(symbolField, nativeTokens[chain].ticker);
          form.setFieldValue(tokenField, "");
        });
      },
      optionRender: ({ data: { label, value } }) => (
        <HStack
          $style={{ alignItems: "center", cursor: "pointer", gap: "8px" }}
        >
          <TokenImage
            src={`/tokens/${value.toLowerCase()}.svg`}
            alt={label}
            borderRadius="50%"
            height="24px"
            width="24px"
          />
          <Stack
            as="span"
            $style={{
              color: colors.textPrimary.toHex(),
              fontSize: "12px",
              lineHeight: "12px",
            }}
          >
            {label}
          </Stack>
        </HStack>
      ),
      options: chains.map((chain) => ({ value: chain, label: chain })),
      showSearch: true,
    };

  const tokenSelectProps: SelectProps<
    string,
    { label: string; logo: string; name: string; value: string }
  > = {
    allowClear: true,
    disabled: !chain,
    loading,
    classNames: { popup: { root: tokenSelectDropdownId } },
    notFoundContent: loading ? (
      <HStack $style={{ justifyContent: "center", padding: "12px" }}>
        <Spin />
      </HStack>
    ) : undefined,
    onChange: (token) => {
      const selectedToken =
        tokens.find(({ id }) => id === token) || nativeTokens[chain];

      form.setFieldValue(decimalsField, selectedToken.decimals);
      form.setFieldValue(symbolField, selectedToken.ticker);
      // Note: For Solana SPL tokens, we keep the wallet address (not ATA).
      // The backend metarule will derive the ATA automatically using DeriveATA(wallet, mint).
    },
    optionRender: ({ data: { label, logo, name } }) => (
      <HStack $style={{ alignItems: "center", cursor: "pointer", gap: "8px" }}>
        <TokenImage
          src={logo}
          alt={label}
          borderRadius="50%"
          height="24px"
          width="24px"
        />
        <VStack $style={{ gap: "4px" }}>
          <Stack
            as="span"
            $style={{
              color: colors.textPrimary.toHex(),
              fontSize: "12px",
              lineHeight: "12px",
            }}
          >
            {name}
          </Stack>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              fontSize: "12px",
              lineHeight: "12px",
            }}
          >
            {label}
          </Stack>
        </VStack>
      </HStack>
    ),
    options: [...(chain ? [nativeTokens[chain]] : []), ...tokens].map(
      (token) => ({
        label: token.ticker,
        logo: token.logo,
        name: token.name,
        value: token.id,
      }),
    ),
    showSearch: {
      filterOption: (input, option) => {
        if (!option) return false;

        const label = option.label.toLowerCase();
        const name = option.name.toLowerCase();
        const value = option.value.toLowerCase();
        const search = input.toLowerCase();

        return (
          label.includes(search) ||
          name.includes(search) ||
          value.includes(search)
        );
      },
      filterSort: (optionA, optionB, search) => {
        if (!search) return 0;

        const searchLower = search.searchValue.toLowerCase();
        const labelA = optionA.label.toLowerCase();
        const nameA = optionA.name.toLowerCase();
        const labelB = optionB.label.toLowerCase();
        const nameB = optionB.name.toLowerCase();

        // Priority 1: Exact match on label (ticker)
        const exactLabelA = labelA === searchLower;
        const exactLabelB = labelB === searchLower;

        if (exactLabelA && !exactLabelB) return -1;
        if (!exactLabelA && exactLabelB) return 1;
        if (exactLabelA && exactLabelB) return 0;

        // Priority 2: Exact match on name
        const exactNameA = nameA === searchLower;
        const exactNameB = nameB === searchLower;

        if (exactNameA && !exactNameB) return -1;
        if (!exactNameA && exactNameB) return 1;
        if (exactNameA && exactNameB) return 0;

        // Priority 3: Label starts with search (prioritize shorter)
        const labelStartsA = labelA.startsWith(searchLower);
        const labelStartsB = labelB.startsWith(searchLower);

        if (labelStartsA && !labelStartsB) return -1;
        if (!labelStartsA && labelStartsB) return 1;
        if (labelStartsA && labelStartsB) return labelA.length - labelB.length;

        // Priority 4: Name starts with search (prioritize shorter)
        const nameStartsA = nameA.startsWith(searchLower);
        const nameStartsB = nameB.startsWith(searchLower);

        if (nameStartsA && !nameStartsB) return -1;
        if (!nameStartsA && nameStartsB) return 1;
        if (nameStartsA && nameStartsB) return nameA.length - nameB.length;

        // Priority 5: Other tokens (contain search but don't start with it)
        // Sort alphabetically by label
        return labelA.localeCompare(labelB);
      },
      onSearch: (address) => {
        setTimeout(() => {
          scrollSelectDropdownToTop(tokenSelectDropdownId);
        }, 0);

        if (
          !chain ||
          !address ||
          !isValidAddress(chain, address) ||
          tokens.some(({ id }) => id === address)
        )
          return;

        setState((prev) => ({ ...prev, loading: true }));

        getTokenData(chain, address)
          .then((token) => {
            setState((prev) => ({
              ...prev,
              loading: false,
              tokens: [...prev.tokens, token],
            }));
          })
          .catch(() => {
            setState((prev) => ({ ...prev, loading: false }));
          });
      },
    },
  };

  useEffect(() => {
    if (chain) {
      setState((prev) => ({ ...prev, loading: true, tokens: [] }));

      getTokenList(chain)
        .catch(() => [])
        .then((tokens) => {
          setState((prev) => ({ ...prev, loading: false, tokens }));
        });
    } else {
      form.setFieldValue(addressField, undefined);
      form.setFieldValue(decimalsField, undefined);
      form.setFieldValue(symbolField, undefined);
      form.setFieldValue(tokenField, undefined);
    }
  }, [chain]);

  return (
    <VStack $style={{ gap: "16px", gridColumn: "1 / -1" }}>
      {!noStyle && <Divider text={camelCaseToTitle(key)} />}
      <Stack
        $style={{
          columnGap: "24px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
        }}
      >
        <Form.Item
          label="Chain"
          name={[...keys, "chain"]}
          rules={[{ required: true, message: "Please select a chain" }]}
        >
          <Select {...chainSelectProps} />
        </Form.Item>
        <Form.Item label="Token" name={[...keys, "token"]}>
          <Select {...tokenSelectProps} />
        </Form.Item>
        <Form.Item name={[...keys, "address"]} noStyle>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item name={[...keys, "decimals"]} noStyle>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item name={[...keys, "symbol"]} noStyle>
          <Input type="hidden" />
        </Form.Item>
      </Stack>
    </VStack>
  );
};
