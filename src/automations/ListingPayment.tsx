import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { base64Decode, base64Encode } from "@bufbuild/protobuf/wire";
import { Form, Input, Modal, Table, TableProps, Tabs } from "antd";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTheme } from "styled-components";
import { v4 as uuidv4 } from "uuid";
import { formatUnits } from "viem";

import {
  addAutomation,
  delAutomation,
  getAutomations,
  getRecipeSuggestion,
} from "@/api/store";
import { AutomationFormSidebar } from "@/automations/components/FormSidebar";
import { AutomationFormSuccess } from "@/automations/components/FormSuccess";
import { AutomationFormTitle } from "@/automations/components/FormTitle";
import { AutomationToken } from "@/automations/components/Token";
import { AutomationFormProps } from "@/automations/Default";
import { AssetProps } from "@/automations/widgets/Asset";
import { MiddleTruncate } from "@/components/MiddleTruncate";
import { StatusModal } from "@/components/StatusModal";
import { useAntd } from "@/hooks/useAntd";
import { useApp } from "@/hooks/useApp";
import { useDiscard } from "@/hooks/useDiscard";
import { useGoBack } from "@/hooks/useGoBack";
import { useQueries } from "@/hooks/useQueries";
import { CrossIcon } from "@/icons/CrossIcon";
import { TrashIcon } from "@/icons/TrashIcon";
import { PolicySchema } from "@/proto/policy_pb";
import { Rule } from "@/proto/rule_pb";
import { tableClassNames } from "@/styles";
import { Button } from "@/toolkits/Button";
import { Divider } from "@/toolkits/Divider";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { defaultPageSize, modalHash } from "@/utils/constants";
import {
  getConfiguration,
  getFeePolicies,
  policyToHexMessage,
  toNumberFormat,
} from "@/utils/functions";
import { AppAutomation } from "@/utils/types";

type CustomAppAutomation = AppAutomation & {
  configuration?: DataProps;
  name: string;
};

type DataProps = {
  asset: AssetProps;
  feeAmount: string;
  frequency: string;
  targetPluginId: string;
};

type OverviewProps = Pick<DataProps, "asset" | "feeAmount" | "targetPluginId">;

type StateProps = {
  automations: CustomAppAutomation[];
  balance: string;
  current: number;
  error?: { text: string; title: string };
  feeAmount: string;
  isActive: boolean;
  isAdded: boolean;
  loading: boolean;
  maxTxsPerWindow?: number;
  rateLimitWindow?: number;
  rules: Rule[];
  submitting: boolean;
  step: number;
  total: number;
};

export const ListingPaymentForm: FC<AutomationFormProps> = ({
  app,
  schema,
}) => {
  const [state, setState] = useState<StateProps>({
    automations: [],
    balance: "",
    current: 1,
    feeAmount: "",
    isActive: true,
    isAdded: false,
    loading: false,
    rules: [],
    submitting: false,
    step: 1,
    total: 0,
  });
  const {
    automations,
    balance,
    current,
    error,
    feeAmount,
    isActive,
    isAdded,
    loading,
    maxTxsPerWindow,
    rateLimitWindow,
    rules,
    step,
    submitting,
    total,
  } = state;
  const { configuration, pluginVersion, requirements } = schema;
  const supportedChains = requirements?.supportedChains || [];
  const { messageAPI, modalAPI } = useAntd();
  const { personalSign, vault } = useApp();
  const { discard, discardHolder } = useDiscard();
  const { hash } = useLocation();
  const { id: appId = "" } = useParams();
  const [form] = Form.useForm<DataProps>();
  const values = Form.useWatch([], form);
  const goBack = useGoBack();
  const colors = useTheme();
  const visible = hash === modalHash.automation;
  const { getTokenData } = useQueries();
  const getTokenDataRef = useRef(getTokenData);
  getTokenDataRef.current = getTokenData;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const columns: TableProps<CustomAppAutomation>["columns"] = [
    {
      dataIndex: "name",
      key: "name",
      title: "Name",
      render: (value) => value || "-",
    },
    {
      align: "center",
      dataIndex: "configuration",
      key: "targetPluginId",
      render: (cfg: DataProps) =>
        cfg?.targetPluginId ? (
          <MiddleTruncate>{cfg.targetPluginId}</MiddleTruncate>
        ) : (
          "-"
        ),
      title: "Target Plugin",
    },
    {
      align: "center",
      dataIndex: "configuration",
      key: "asset",
      render: (cfg: DataProps) =>
        cfg?.asset ? (
          <AutomationToken chain={cfg.asset.chain} id={cfg.asset.token} />
        ) : (
          "-"
        ),
      title: "Asset",
    },
    {
      align: "center",
      dataIndex: "id",
      key: "action",
      render: (_, { id, signature }) => {
        if (!signature) return null;

        return (
          <HStack $style={{ justifyContent: "center" }}>
            <Button
              icon={<TrashIcon fontSize={16} />}
              kind="danger"
              onClick={() => handleDelete(id, signature)}
              ghost
            />
          </HStack>
        );
      },
      title: "",
      width: 40,
    },
  ];

  const fetchAutomations = useCallback(
    (skip: number, active: boolean) => {
      setState((prev) => ({ ...prev, loading: true }));

      getAutomations({ active, appId, skip })
        .then(({ automations, total }) => {
          setState((prev) => ({
            ...prev,
            automations: automations.map((automation) => {
              try {
                const decoded = base64Decode(automation.recipe);
                const { configuration, name } = fromBinary(
                  PolicySchema,
                  decoded,
                );

                if (!configuration) return { ...automation, name };

                return {
                  ...automation,
                  configuration: configuration as DataProps,
                  name,
                };
              } catch {
                return { ...automation, name: "" };
              }
            }),
            current: skip ? Math.floor(skip / defaultPageSize) + 1 : 1,
            loading: false,
            total,
          }));
        })
        .catch(() => {
          setState((prev) => ({ ...prev, loading: false }));
        });
    },
    [appId],
  );

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: prev.step - 1 }));
  };

  const handleCancel = () => {
    if (step === 2) {
      discard(() => goBack());
    } else {
      goBack();
    }
  };

  const handleDelete = (id: string, signature: string) => {
    if (signature) {
      modalAPI.confirm({
        title: "Are you sure you want to delete this Automation?",
        okText: "Yes",
        okType: "danger",
        cancelText: "No",
        onOk() {
          setState((prev) => ({ ...prev, loading: true }));

          delAutomation(id, signature)
            .then(() => {
              messageAPI.success("Automation successfully deleted");

              fetchAutomations(0, isActive);
            })
            .catch(() => {
              messageAPI.error("Automation deletion failed");

              setState((prev) => ({ ...prev, loading: false }));
            });
        },
      });
    } else {
      messageAPI.error("Automation deletion failed");
    }
  };

  const handleStep = () => {
    if (!configuration || !vault) return;

    if (step === 1) {
      form
        .validateFields()
        .then(async () => {
          if (!feeAmount || rules.length === 0) {
            setState((prev) => ({
              ...prev,
              error: {
                text: "Fee information not loaded yet. Please wait and try again.",
                title: "Listing Payment Failed",
              },
            }));
            return;
          }

          setState((prev) => ({ ...prev, step: 2 }));
        })
        .catch(() => {});
    } else {
      setState((prev) => ({ ...prev, submitting: true }));

      const configurationData = getConfiguration(
        configuration,
        form.getFieldsValue(),
        configuration.definitions,
      );

      const jsonData = create(PolicySchema, {
        author: "",
        configuration: configurationData,
        description: "",
        feePolicies: getFeePolicies(app.pricing),
        id: appId,
        maxTxsPerWindow,
        name: "Listing Payment",
        rateLimitWindow,
        rules,
        version: pluginVersion,
      });

      const binary = toBinary(PolicySchema, jsonData);

      const recipe = base64Encode(binary);

      const policy: AppAutomation = {
        active: true,
        id: uuidv4(),
        pluginId: appId,
        pluginVersion: String(pluginVersion),
        policyVersion: 0,
        publicKey: vault.publicKeys.ecdsa,
        recipe,
      };

      const message = policyToHexMessage(policy);

      personalSign(message, appId)
        .then((signature) => {
          addAutomation({ ...policy, signature })
            .then(() => {
              setState((prev) => ({
                ...prev,
                isAdded: true,
                submitting: false,
              }));
              fetchAutomations(0, isActive);
            })
            .catch((apiError: Error) => {
              setState((prev) => ({ ...prev, submitting: false }));

              messageAPI.error(apiError.message);
            });
        })
        .catch(() => {
          setState((prev) => ({ ...prev, submitting: false }));
        });
    }
  };

  useEffect(() => {
    if (!visible) return;

    form.resetFields();

    setState((prev) => ({
      ...prev,
      balance: "",
      feeAmount: "",
      isAdded: false,
      rules: [],
      step: 1,
      submitting: false,
    }));

    if (!configuration || !vault) return;

    const chain = supportedChains[0] || "Ethereum";
    const tokenAddress =
      configuration.definitions?.asset?.properties?.token?.enum?.[0] || "";
    const schemaFeeAmount = String(
      configuration.properties?.feeAmount?.default || "",
    );

    Promise.all([
      vault.address(chain),
      getTokenDataRef.current(chain, tokenAddress).catch(() => null),
      vault.balance(chain, tokenAddress),
    ]).then(([addr, tokenData, balanceResult]) => {
      const decimals = tokenData?.decimals ?? 18;
      const symbol = tokenData?.ticker ?? "VULT";

      form.setFieldsValue({
        asset: {
          chain,
          token: tokenAddress,
          address: addr,
          decimals,
          symbol,
        },
        feeAmount: schemaFeeAmount,
        frequency: "one-time",
      });

      setState((prev) => ({
        ...prev,
        balance: toNumberFormat(
          formatUnits(BigInt(balanceResult.amount), decimals),
        ),
        feeAmount: schemaFeeAmount,
      }));
    });
  }, [configuration, form, supportedChains, vault, visible]);

  useEffect(() => {
    if (!configuration || !visible) return;

    const asset = values?.asset;
    const targetPluginId = values?.targetPluginId;

    if (!asset?.address || !targetPluginId) return;

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const configurationData = getConfiguration(
        configuration,
        form.getFieldsValue(),
        configuration.definitions,
      );

      getRecipeSuggestion(appId, configurationData)
        .then(
          ({
            maxTxsPerWindow: suggestMaxTxs,
            rateLimitWindow: suggestRateLimit,
            rules: suggestRules = [],
          }) => {
            const amountConstraint = suggestRules[0]?.parameterConstraints.find(
              (pc) => pc.parameterName === "amount",
            );
            const extractedFee =
              amountConstraint?.constraint?.value.case === "fixedValue"
                ? amountConstraint.constraint.value.value
                : "";

            setState((prev) => ({
              ...prev,
              feeAmount: extractedFee,
              maxTxsPerWindow: suggestMaxTxs,
              rateLimitWindow: suggestRateLimit,
              rules: suggestRules,
            }));
          },
        )
        .catch(() => {
          setState((prev) => ({
            ...prev,
            error: {
              text: "Failed to get listing payment configuration. Please try again.",
              title: "Listing Payment Failed",
            },
          }));
        });
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [
    appId,
    configuration,
    form,
    values?.asset,
    values?.targetPluginId,
    visible,
  ]);

  useEffect(() => {
    const asset = values?.asset;

    if (!asset?.chain || !vault) return;

    vault.balance(asset.chain, asset.token).then(({ amount }) => {
      setState((prev) => ({
        ...prev,
        balance: toNumberFormat(formatUnits(BigInt(amount), asset.decimals)),
      }));
    });
  }, [values?.asset, vault]);

  useEffect(() => {
    fetchAutomations(0, isActive);
  }, [fetchAutomations, isActive]);

  return (
    <>
      <VStack>
        <Tabs
          activeKey={isActive ? "1" : "0"}
          items={[
            { key: "1", label: "Upcoming" },
            { key: "0", label: "History" },
          ]}
          onChange={(tabKey) =>
            setState((prev) => ({ ...prev, isActive: tabKey === "1" }))
          }
        />

        <Table
          classNames={tableClassNames}
          columns={columns}
          dataSource={automations}
          loading={loading}
          pagination={{
            current,
            onChange: (page) =>
              fetchAutomations((page - 1) * defaultPageSize, isActive),
            pageSize: defaultPageSize,
            showSizeChanger: false,
            total,
          }}
          rowKey="id"
        />
      </VStack>

      <AutomationFormSuccess open={visible && isAdded} />

      <Modal
        centered={true}
        closeIcon={<CrossIcon />}
        footer={
          <>
            <Stack $style={{ flex: "none", width: "218px" }} />
            <HStack $style={{ flexGrow: 1, justifyContent: "center" }}>
              <Button loading={submitting} onClick={handleStep}>
                {step > 1 ? "Submit" : "Continue"}
              </Button>
            </HStack>
          </>
        }
        maskClosable={false}
        onCancel={handleCancel}
        open={visible && !isAdded}
        styles={{
          body: { display: "flex", gap: 32 },
          footer: { display: "flex", gap: 65, marginTop: 24 },
          header: { marginBottom: 32 },
        }}
        title={
          <AutomationFormTitle app={app} onBack={handleBack} step={step} />
        }
        width={992}
      >
        <AutomationFormSidebar
          steps={["Configuration", "Overview"]}
          step={step}
        />
        <Divider light vertical />
        <VStack
          $style={{
            justifyContent: "center",
            backgroundColor: colors.bgTertiary.toHex(),
            borderRadius: "24px",
            flexGrow: 1,
            padding: "32px",
          }}
        >
          <Form autoComplete="off" form={form} layout="vertical">
            <Form.Item name={["asset", "chain"]} noStyle>
              <Input type="hidden" />
            </Form.Item>
            <Form.Item name={["asset", "token"]} noStyle>
              <Input type="hidden" />
            </Form.Item>
            <Form.Item name={["asset", "address"]} noStyle>
              <Input type="hidden" />
            </Form.Item>
            <Form.Item name={["asset", "decimals"]} noStyle>
              <Input type="hidden" />
            </Form.Item>
            <Form.Item name={["asset", "symbol"]} noStyle>
              <Input type="hidden" />
            </Form.Item>
            <Form.Item name="feeAmount" noStyle>
              <Input type="hidden" />
            </Form.Item>
            <Form.Item name="frequency" noStyle>
              <Input type="hidden" />
            </Form.Item>

            <VStack
              $style={{
                display: step === 1 ? "flex" : "none",
                gap: "16px",
              }}
            >
              <Form.Item
                label="Target Plugin ID"
                name="targetPluginId"
                rules={[{ required: true }]}
              >
                <Input placeholder="Enter the plugin ID" />
              </Form.Item>

              <VStack $style={{ gap: "8px" }}>
                <HStack $style={{ justifyContent: "space-between" }}>
                  <Stack
                    as="span"
                    $style={{
                      color: colors.textTertiary.toHex(),
                      fontSize: "13px",
                    }}
                  >
                    Chain:
                  </Stack>
                  <Stack
                    as="span"
                    $style={{
                      color: colors.textTertiary.toHex(),
                      fontSize: "13px",
                    }}
                  >
                    {values?.asset?.chain || "Loading..."}
                  </Stack>
                </HStack>
                <HStack $style={{ justifyContent: "space-between" }}>
                  <Stack
                    as="span"
                    $style={{
                      color: colors.textTertiary.toHex(),
                      fontSize: "13px",
                    }}
                  >
                    Token:
                  </Stack>
                  {values?.asset?.symbol ? (
                    <AutomationToken
                      chain={values.asset.chain}
                      id={values.asset.token}
                    />
                  ) : (
                    <Stack
                      as="span"
                      $style={{
                        color: colors.textTertiary.toHex(),
                        fontSize: "13px",
                      }}
                    >
                      Loading...
                    </Stack>
                  )}
                </HStack>
                <HStack $style={{ justifyContent: "space-between" }}>
                  <Stack
                    as="span"
                    $style={{
                      color: colors.textTertiary.toHex(),
                      fontSize: "13px",
                    }}
                  >
                    Listing Fee:
                  </Stack>
                  <Stack
                    as="span"
                    $style={{
                      color: colors.textTertiary.toHex(),
                      fontSize: "13px",
                    }}
                  >
                    {feeAmount && values?.asset?.decimals
                      ? `${toNumberFormat(formatUnits(BigInt(feeAmount), values.asset.decimals))} ${values.asset.symbol}`
                      : "Loading..."}
                  </Stack>
                </HStack>
                <HStack $style={{ justifyContent: "space-between" }}>
                  <Stack
                    as="span"
                    $style={{
                      color: colors.textTertiary.toHex(),
                      fontSize: "13px",
                    }}
                  >
                    Balance:
                  </Stack>
                  <Stack
                    as="span"
                    $style={{
                      color: colors.textTertiary.toHex(),
                      fontSize: "13px",
                    }}
                  >
                    {balance
                      ? `${balance} ${values?.asset?.symbol}`
                      : "Loading..."}
                  </Stack>
                </HStack>
              </VStack>
            </VStack>
            {step === 2 && (
              <Overview
                asset={values?.asset}
                feeAmount={feeAmount}
                targetPluginId={values?.targetPluginId}
              />
            )}
          </Form>
        </VStack>
      </Modal>

      <StatusModal
        onClose={() => setState((prev) => ({ ...prev, error: undefined }))}
        open={visible && Boolean(error)}
      >
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          {error?.title}
        </Stack>
        <Stack
          as="span"
          $style={{
            color: colors.textTertiary.toHex(),
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          {error?.text}
        </Stack>
      </StatusModal>

      {discardHolder}
    </>
  );
};

const Overview: FC<OverviewProps> = ({
  asset,
  feeAmount,
  targetPluginId = "",
}) => {
  const colors = useTheme();

  const formattedAmount =
    feeAmount && asset?.decimals
      ? toNumberFormat(formatUnits(BigInt(feeAmount), asset.decimals))
      : feeAmount;

  return (
    <VStack $style={{ gap: "16px" }}>
      <HStack
        $style={{
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack as="span">Target Plugin</Stack>
        <MiddleTruncate
          $style={{
            color: colors.textTertiary.toHex(),
            maxWidth: "300px",
          }}
        >
          {targetPluginId}
        </MiddleTruncate>
      </HStack>
      <Divider />
      {!!asset && (
        <>
          <HStack
            $style={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack as="span">Payment Asset</Stack>
            <AutomationToken chain={asset.chain} id={asset.token} />
          </HStack>
          <Divider />
          <HStack
            $style={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack as="span">Amount</Stack>
            <Stack as="span" $style={{ color: colors.textTertiary.toHex() }}>
              {formattedAmount} {asset.symbol}
            </Stack>
          </HStack>
        </>
      )}
    </VStack>
  );
};
