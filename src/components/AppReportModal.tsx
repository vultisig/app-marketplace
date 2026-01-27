import { Form, FormProps, Input, Modal, Select, SelectProps } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTheme } from "styled-components";

import { StatusModal } from "@/components/StatusModal";
import { useGoBack } from "@/hooks/useGoBack";
import { Button } from "@/toolkits/Button";
import { Stack, VStack } from "@/toolkits/Stack";
import { appReport } from "@/utils/api";
import { modalHash } from "@/utils/constants";
import { ReportForm } from "@/utils/types";

type StateProps = {
  message?: string;
  open?: boolean;
  status?: "failure" | "success";
  submitting?: boolean;
};

export const AppReportModal = () => {
  const [state, setState] = useState<StateProps>({});
  const { message, open, status, submitting } = state;
  const { hash } = useLocation();
  const { id: appId = "" } = useParams();
  const [form] = Form.useForm<ReportForm>();
  const goBack = useGoBack();
  const colors = useTheme();

  const reasons: SelectProps["options"] = [
    {
      label: "Suspicious behavior or possible scam",
      value: "1",
    },
    {
      label: "Plugin does not work as described",
      value: "2",
    },
    {
      label: "Outdated or inaccurate documentation",
      value: "3",
    },
    {
      label: "Spam or deceptive marketing",
      value: "4",
    },
    {
      label: "Other",
      value: "5",
    },
  ];

  const onFinishSuccess: FormProps<ReportForm>["onFinish"] = (values) => {
    if (!submitting) {
      setState((prev) => ({ ...prev, submitting: true }));

      const reason = `${reasons.find((r) => r.value === values.reason)?.label}${values.details ? `\n${values.details}` : ""}`;

      appReport(appId, { reason })
        .then(() => {
          setState((prev) => ({
            ...prev,
            message: "We’ll review this and follow up if needed.",
            status: "success",
            submitting: false,
          }));
        })
        .catch((error: Error) => {
          setState((prev) => ({
            ...prev,
            message: error.message,
            status: "failure",
            submitting: false,
          }));
        })
        .finally(() => {
          form.resetFields();
        });
    }
  };

  useEffect(() => {
    if (hash === modalHash.report) {
      setState((prev) => ({ ...prev, open: true }));
    } else {
      setState({});
    }
  }, [hash]);

  return (
    <>
      <StatusModal
        onClose={() => goBack()}
        open={open && status === "success"}
        success
      >
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          Report submitted
        </Stack>
        <Stack
          as="span"
          $style={{
            color: colors.textTertiary.toHex(),
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          {message}
        </Stack>
      </StatusModal>

      <StatusModal onClose={() => goBack()} open={open && status === "failure"}>
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          Report failed
        </Stack>
        <Stack
          as="span"
          $style={{
            color: colors.textTertiary.toHex(),
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          {message}
        </Stack>
      </StatusModal>

      <Modal
        centered={true}
        footer={
          <Button loading={submitting} onClick={form.submit}>
            Submit Report
          </Button>
        }
        maskClosable={false}
        onCancel={() => goBack()}
        open={open && !status}
        styles={{
          body: {
            backgroundColor: colors.bgTertiary.toHex(),
            borderRadius: 12,
            padding: 24,
          },
          container: { display: "flex", flexDirection: "column", gap: "20px" },
          footer: { display: "flex", justifyContent: "center", margin: 0 },
          header: { margin: 0 },
        }}
        title={
          <VStack>
            <Stack as="span">Report Plugin</Stack>
            <Stack
              as="span"
              $style={{
                color: colors.textTertiary.toHex(),
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              Tell us what’s wrong with this plugin. Our team will review it.
            </Stack>
          </VStack>
        }
        width={768}
      >
        <Form
          autoComplete="off"
          form={form}
          layout="vertical"
          onFinish={onFinishSuccess}
        >
          <VStack $style={{ gap: "16px" }}>
            <VStack $style={{ gap: "8px" }}>
              <Stack
                as="span"
                $style={{
                  fontSize: "12px",
                  lineHeight: "16px",
                }}
              >
                Reason
              </Stack>
              <Form.Item<ReportForm>
                label="Reason"
                name="reason"
                rules={[{ required: true }]}
                noStyle
              >
                <Select options={reasons} />
              </Form.Item>
            </VStack>
            <VStack $style={{ gap: "8px" }}>
              <Stack
                as="span"
                $style={{
                  fontSize: "12px",
                  lineHeight: "16px",
                }}
              >
                Details
              </Stack>
              <Form.Item<ReportForm> label="Details" name="details" noStyle>
                <Input.TextArea
                  rows={4}
                  placeholder="Add any context (steps, expected vs actual, error message)"
                />
              </Form.Item>
            </VStack>
          </VStack>
        </Form>
      </Modal>
    </>
  );
};
