import { Modal, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "styled-components";

import { StatusModal } from "@/components/StatusModal";
import { useApp } from "@/hooks/useApp";
import { useGoBack } from "@/hooks/useGoBack";
import { CircleInfoIcon } from "@/icons/CircleInfoIcon";
import { CirclePlusIcon } from "@/icons/CirclePlusIcon";
import { ShieldCheckIcon } from "@/icons/ShieldCheckIcon";
import { Button } from "@/toolkits/Button";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { feeAppId, modalHash } from "@/utils/constants";

export const PaymentModal = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { feeApp, feeAppStatus, startReshare, updateFeeAppStatus } = useApp();
  const { hash } = useLocation();
  const goBack = useGoBack();
  const colors = useTheme();
  const open = hash === modalHash.payment;

  const permissions = [
    {
      id: "transaction_signing",
      label: "Access to transaction signing",
      description:
        "The plugin can initiate transactions to send assets in your Vault",
    },
    {
      id: "fee_deduction",
      label: "Fee deduction authorization",
      description: "The plugin can automatically deduct incurred fees.",
    },
    {
      id: "balance_visibility",
      label: "Vault balance visibility",
      description: "The plugin can view Vault balances",
    },
  ];

  const handleInstall = () => {
    if (loading) return;

    setLoading(true);

    startReshare(feeAppId)
      .then((isInstalled) => {
        if (isInstalled) updateFeeAppStatus();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  if (!feeApp || !feeAppStatus) return null;

  return (
    <>
      <StatusModal
        onClose={() => goBack()}
        open={open && feeAppStatus.isInstalled}
        success
      >
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          Installation Successful
        </Stack>
        <VStack $style={{ alignItems: "center", gap: "4px" }}>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              lineHeight: "18px",
            }}
          >
            {`${feeApp.title} plugin was successfully installed.`}
          </Stack>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              lineHeight: "18px",
            }}
          >
            You can now install other plugins.
          </Stack>
        </VStack>
      </StatusModal>

      <Modal
        centered={true}
        closable={false}
        footer={false}
        onCancel={() => goBack()}
        open={open && !feeAppStatus.isInstalled}
        styles={{
          body: { alignItems: "center", display: "flex", gap: 24 },
          container: { padding: 16 },
          footer: { display: "none" },
        }}
        title={false}
        width={768}
      >
        <VStack
          $style={{
            aspectRatio: 3 / 2,
            backgroundImage: `url(${feeApp.thumbnailUrl})`,
            backgroundPosition: "center center",
            backgroundSize: "cover",
            borderRadius: "12px",
            flex: "none",
            width: "346px",
          }}
        />
        <VStack $style={{ flexGrow: "1", gap: "24px" }}>
          {step === 1 && (
            <>
              <VStack $style={{ gap: "20px" }}>
                <HStack $style={{ alignItems: "center", gap: "12px" }}>
                  <Stack
                    as="img"
                    alt={feeApp.title}
                    src={feeApp.logoUrl}
                    $style={{ borderRadius: "12px", width: "56px" }}
                  />
                  <Stack
                    as="span"
                    $style={{ fontSize: "17px", lineHeight: "20px" }}
                  >
                    {feeApp.title}
                  </Stack>
                </HStack>
                <Stack
                  as="span"
                  $style={{
                    color: colors.textSecondary.toHex(),
                    fontSize: "14px",
                    lineHeight: "18px",
                  }}
                >
                  {feeApp.description}
                </Stack>
              </VStack>
              <HStack $style={{ justifyContent: "flex-start" }}>
                <Button
                  icon={<CirclePlusIcon fontSize={16} />}
                  onClick={() => setStep(2)}
                >
                  Add to Vault
                </Button>
              </HStack>
            </>
          )}
          {step === 2 && (
            <>
              <VStack $style={{ gap: "12px" }}>
                <Stack
                  as="span"
                  $style={{ fontSize: "17px", lineHeight: "20px" }}
                >
                  Allow plugin access to
                </Stack>
                <VStack
                  $style={{
                    backgroundColor: colors.bgTertiary.toHex(),
                    borderRadius: "24px",
                    gap: "12px",
                    padding: "24px",
                  }}
                >
                  {permissions.map(({ id, label, description }) => (
                    <HStack
                      key={id}
                      $style={{ alignItems: "center", gap: "8px" }}
                    >
                      <Stack
                        as={ShieldCheckIcon}
                        $style={{
                          color: colors.warning.toHex(),
                          flex: "none",
                          fontSize: "16px",
                        }}
                      />
                      <Stack
                        as="span"
                        $style={{
                          color: colors.textSecondary.toHex(),
                          lineHeight: "16px",
                        }}
                      >
                        {label}
                      </Stack>
                      <Tooltip title={description}>
                        <HStack
                          as="span"
                          $style={{
                            color: colors.textTertiary.toHex(),
                            cursor: "pointer",
                            fontSize: "16px",
                          }}
                        >
                          <CircleInfoIcon />
                        </HStack>
                      </Tooltip>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
              <HStack $style={{ justifyContent: "flex-start" }}>
                <Button
                  disabled={loading}
                  loading={loading}
                  onClick={handleInstall}
                >
                  Accept & install
                </Button>
              </HStack>
            </>
          )}
        </VStack>
      </Modal>
    </>
  );
};
