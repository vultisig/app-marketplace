import { Form, FormItemProps, Input, InputNumber, Select } from "antd";
import { FC } from "react";

import { AutomationFormDatePicker } from "@/automations/components/FormDatePicker";
import { AssetWidget } from "@/automations/widgets/Asset";
import { Divider } from "@/toolkits/Divider";
import { Stack, VStack } from "@/toolkits/Stack";
import { Chain } from "@/utils/chain";
import { camelCaseToTitle, getFieldRef } from "@/utils/functions";
import { Configuration, Definitions, FieldProps } from "@/utils/types";

type AutomationFormConfigurationProps = {
  chains: Chain[];
  configuration: Configuration;
  definitions?: Definitions;
  parentKey?: string[];
};

export const AutomationFormConfiguration: FC<
  AutomationFormConfigurationProps
> = ({ chains, configuration, definitions, parentKey = [] }) => {
  const { properties, required } = configuration;

  return Object.entries(properties).map(([key, field]) => {
    const keys = [...parentKey, key];
    const fieldRef = getFieldRef(field, definitions);

    if (fieldRef) {
      switch (field.$ref) {
        case "#/definitions/asset": {
          return (
            <AssetWidget
              chains={chains}
              definition={fieldRef}
              key={key}
              keys={keys}
            />
          );
        }
        default: {
          return (
            <VStack key={key} $style={{ gap: "16px", gridColumn: "1 / -1" }}>
              <Divider text={camelCaseToTitle(key)} />
              <Stack
                $style={{
                  columnGap: "24px",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                }}
              >
                <AutomationFormConfiguration
                  chains={chains}
                  configuration={fieldRef}
                  definitions={definitions}
                  parentKey={keys}
                />
              </Stack>
            </VStack>
          );
        }
      }
    }

    return (
      <DynamicFormItem
        key={key}
        label={camelCaseToTitle(key)}
        name={keys}
        rules={[{ required: required.includes(key) }]}
        tooltip={properties[key]?.description}
        {...field}
      />
    );
  });
};

const DynamicFormItem: FC<FieldProps & FormItemProps> = ({
  default: defaultValue,
  enum: enumerable,
  format,
  readOnly,
  type,
  ...rest
}) => {
  if (readOnly && defaultValue !== undefined) {
    return (
      <Form.Item {...rest} initialValue={defaultValue}>
        <Input disabled />
      </Form.Item>
    );
  }

  switch (type) {
    case "int": {
      return (
        <Form.Item {...rest}>
          <InputNumber />
        </Form.Item>
      );
    }
    default: {
      if (enumerable) {
        return (
          <Form.Item {...rest}>
            <Select
              options={enumerable.map((value) => ({
                label: camelCaseToTitle(value),
                value,
              }))}
            />
          </Form.Item>
        );
      } else {
        switch (format) {
          case "date-time": {
            return <AutomationFormDatePicker {...rest} />;
          }
          default: {
            return (
              <Form.Item {...rest}>
                <Input />
              </Form.Item>
            );
          }
        }
      }
    }
  }
};
