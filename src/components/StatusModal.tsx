import { Modal } from "antd";
import { FC, ReactNode } from "react";

import { Stack } from "@/toolkits/Stack";

type StatusModalProps = {
  children?: ReactNode;
  onClose: () => void;
  open?: boolean;
  success?: boolean;
};

export const StatusModal: FC<StatusModalProps> = ({
  children,
  onClose,
  success,
  open,
}) => (
  <Modal
    centered={true}
    closable={false}
    footer={false}
    onCancel={onClose}
    styles={{
      body: {
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 32,
      },
      container: { overflow: "hidden", padding: 0 },
      footer: { display: "none" },
      header: { margin: 0 },
    }}
    title={
      <Stack
        as="img"
        src={`/images/${success ? "success" : "failure"}-banner.jpg`}
        $style={{ display: "block", width: "100%" }}
      />
    }
    width={390}
    open={open}
    zIndex={1001}
  >
    {children}
  </Modal>
);
