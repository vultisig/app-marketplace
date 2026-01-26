import { Form, FormProps, Input, Modal } from "antd";
import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTheme } from "styled-components";

import { useGoBack } from "@/hooks/useGoBack";
import { Button } from "@/toolkits/Button";
import { appReport } from "@/utils/api";
import { modalHash } from "@/utils/constants";
import { ReportForm } from "@/utils/types";

export const AppReportModal = () => {
  const [submitting, setSubmitting] = useState(false);
  const { hash } = useLocation();
  const { id: appId = "" } = useParams();
  const [form] = Form.useForm<ReportForm>();
  const goBack = useGoBack();
  const colors = useTheme();

  const onFinishSuccess: FormProps<ReportForm>["onFinish"] = (values) => {
    if (!submitting) {
      setSubmitting(true);

      appReport(appId, values)
        .then(() => {
          form.resetFields();

          goBack();
        })
        .finally(() => {
          setSubmitting(false);
        });
    }
  };

  return (
    <Modal
      centered={true}
      footer={
        <Button loading={submitting} onClick={form.submit}>
          Post Report
        </Button>
      }
      maskClosable={false}
      onCancel={() => goBack()}
      open={hash === modalHash.report}
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
      title="Write Report"
      width={768}
    >
      <Form
        autoComplete="off"
        form={form}
        layout="vertical"
        onFinish={onFinishSuccess}
      >
        <Form.Item<ReportForm>
          name="reason"
          rules={[{ required: true }]}
          noStyle
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
