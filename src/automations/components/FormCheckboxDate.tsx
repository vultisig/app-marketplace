import { Checkbox, Form, FormItemProps, Input } from "antd";
import dayjs from "dayjs";
import { FC, useEffect } from "react";

import { VStack } from "@/toolkits/Stack";
import { Frequency } from "@/utils/frequencies";

export const AutomationFormCheckboxDate: FC<
  FormItemProps & { disabled?: boolean }
> = ({ disabled, name, ...rest }) => {
  const checkboxName = `${name}Status`;
  const form = Form.useFormInstance();
  const frequency = Form.useWatch<Frequency>("frequency", form);
  const isActive = Form.useWatch<boolean>(checkboxName, form);

  useEffect(() => {
    const now = dayjs().add(1, "minute").startOf("minute");

    if (isActive) {
      form.setFieldValue(name, now.utc().format());
    } else {
      switch (frequency) {
        case "hourly": {
          form.setFieldValue(
            name,
            now.add(1, "hour").startOf("hour").utc().format(),
          );
          break;
        }
        case "daily": {
          form.setFieldValue(
            name,
            now.add(1, "day").startOf("day").utc().format(),
          );
          break;
        }
        case "weekly": {
          form.setFieldValue(
            name,
            now.add(1, "week").startOf("week").utc().format(),
          );
          break;
        }
        case "bi-weekly": {
          form.setFieldValue(
            name,
            now.add(2, "week").startOf("week").utc().format(),
          );
          break;
        }
        case "monthly": {
          form.setFieldValue(
            name,
            now.add(1, "month").startOf("month").utc().format(),
          );
          break;
        }
        default: {
          form.setFieldValue(name, now.utc().format());
          break;
        }
      }
    }
  }, [form, isActive, name, frequency]);

  return (
    <VStack $style={{ gap: "16px", gridColumn: "1 / -1" }}>
      <Form.Item name={checkboxName} valuePropName="checked" {...rest}>
        <Checkbox disabled={disabled}>
          Start first Recurring Swap after setup
        </Checkbox>
      </Form.Item>
      <Form.Item name={name} {...rest} noStyle>
        <Input type="hidden" />
      </Form.Item>
    </VStack>
  );
};
