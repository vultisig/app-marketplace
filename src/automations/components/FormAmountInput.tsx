import { Form, FormItemProps } from "antd";
import { FC, useEffect, useState } from "react";
import { useTheme } from "styled-components";
import { formatUnits } from "viem";

import { AssetProps } from "@/automations/widgets/Asset";
import { useCore } from "@/hooks/useCore";
import { InputDigits } from "@/toolkits/InputDigits";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { getPrice } from "@/utils/api";
import { toNumberFormat } from "@/utils/functions";

export const AutomationFormAmountInput: FC<
  FormItemProps & { asset?: AssetProps; disabled?: boolean }
> = ({ asset, disabled, name, ...rest }) => {
  const [balance, setBalance] = useState<string>("");
  const [price, setPrice] = useState<number>(0);
  const { vault } = useCore();
  const colors = useTheme();
  const form = Form.useFormInstance();
  const amount = Form.useWatch(name, form);

  useEffect(() => {
    if (!asset?.chain || !vault) return;

    vault.balance(asset.chain, asset.token).then(({ amount }) => {
      setBalance(toNumberFormat(formatUnits(BigInt(amount), asset.decimals)));
    });
  }, [asset, vault]);

  useEffect(() => {
    if (!asset?.chain) return;

    getPrice(asset.chain,asset.token).then((price) => {
      setPrice(price);
    });
  }, [asset]);

  const usdValue = amount && price ? (Number(amount) * price).toFixed(2) : null;

  return (
    <VStack>
      <Form.Item {...rest} name={name}>
        <InputDigits
          disabled={disabled}
          suffix={
            <Stack
              as="span"
              $style={{
                color: colors.textTertiary.toHex(),
                fontSize: "13px",
              }}
            >
              {usdValue ? `($${toNumberFormat(usdValue)})` : ""}
            </Stack>
          }
        />
      </Form.Item>
      <HStack $style={{ justifyContent: "space-between", marginTop: "-6px" }}>
        <Stack
          as="span"
          $style={{ color: colors.textTertiary.toHex(), fontSize: "13px" }}
        >
          Balance:
        </Stack>
        <Stack
          as="span"
          $style={{ color: colors.textTertiary.toHex(), fontSize: "13px" }}
        >
          {balance} {asset?.symbol}
        </Stack>
      </HStack>
    </VStack>
  );
};
