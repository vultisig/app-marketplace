import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { base64Decode, base64Encode } from "@bufbuild/protobuf/wire";
import {
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Table,
  TableProps,
  Tabs,
} from "antd";
import dayjs from "dayjs";
import { cloneDeep } from "lodash-es";
import { FC, useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTheme } from "styled-components";
import { v4 as uuidv4 } from "uuid";
import { parseUnits } from "viem";

import { AutomationFormAddressInput } from "@/automations/components/FormAddressInput";
import { AutomationFormAmountInput } from "@/automations/components/FormAmountInput";
import { AutomationFormCheckboxDate } from "@/automations/components/FormCheckboxDate";
import { AutomationFormDatePicker } from "@/automations/components/FormDatePicker";
import { AutomationFormSidebar } from "@/automations/components/FormSidebar";
import { AutomationFormSuccess } from "@/automations/components/FormSuccess";
import { AutomationFormTitle } from "@/automations/components/FormTitle";
import { AutomationToken } from "@/automations/components/Token";
import { AutomationFormProps } from "@/automations/Default";
import { AssetProps, AssetWidget } from "@/automations/widgets/Asset";
import { MiddleTruncate } from "@/components/MiddleTruncate";
import { StatusModal } from "@/components/StatusModal";
import { TokenImage } from "@/components/TokenImage";
import { useAntd } from "@/hooks/useAntd";
import { useCore } from "@/hooks/useCore";
import { useDiscard } from "@/hooks/useDiscard";
import { useGoBack } from "@/hooks/useGoBack";
import { useQueries } from "@/hooks/useQueries";
import { CrossIcon } from "@/icons/CrossIcon";
import { PencilLineIcon } from "@/icons/PencilLineIcon";
import { TrashIcon } from "@/icons/TrashIcon";
import { PolicySchema } from "@/proto/policy_pb";
import { getVaultId } from "@/storage/vaultId";
import { Button } from "@/toolkits/Button";
import { Divider } from "@/toolkits/Divider";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import {
  addAutomation,
  delAutomation,
  getAutomations,
  getRecipeSuggestion,
} from "@/utils/api";
import { nativeTokens } from "@/utils/chain";
import { defaultPageSize, modalHash } from "@/utils/constants";
import { personalSign } from "@/utils/extension";
import { frequencies } from "@/utils/frequencies";
import {
  getConfiguration,
  getFeePolicies,
  kebabCaseToTitle,
  policyToHexMessage,
  toNumberFormat,
} from "@/utils/functions";
import { AppAutomation, Token } from "@/utils/types";

type CustomAppAutomation = AppAutomation & {
  configuration?: DataProps;
  name: string;
};

type RecipientProps = {
  alias: string;
  amount: string;
  toAddress: string;
};

type DataProps = {
  asset: AssetProps;
  endDate: number;
  frequency: string;
  recipient: RecipientProps;
  recipients: RecipientProps[];
  name: string;
  startDate: number;
};

type StateProps = {
  automations: CustomAppAutomation[];
  current: number;
  error?: { text: string; title: string };
  isActive: boolean;
  isAdded: boolean;
  loading: boolean;
  recipients: RecipientProps[];
  submitting: boolean;
  step: number;
  total: number;
};

export const RecurringSendsForm: FC<AutomationFormProps> = ({
  app,
  schema,
}) => {
  const [state, setState] = useState<StateProps>({
    automations: [],
    current: 1,
    isActive: true,
    isAdded: false,
    loading: false,
    recipients: [],
    step: 1,
    submitting: false,
    total: 0,
  });
  const {
    automations,
    current,
    error,
    isActive,
    isAdded,
    loading,
    recipients,
    step,
    submitting,
    total,
  } = state;
  const { id, pricing } = app;
  const { configuration, pluginId, pluginVersion, requirements } = schema;
  const { messageAPI, modalAPI } = useAntd();
  const { address = "" } = useCore();
  const { hash } = useLocation();
  const { discard, discardHolder } = useDiscard();
  const { id: appId = "" } = useParams();
  const [form] = Form.useForm<DataProps>();
  const values = Form.useWatch([], form);
  const goBack = useGoBack();
  const colors = useTheme();
  const supportedChains = requirements?.supportedChains || [];
  const visible = hash === modalHash.automation;

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
      key: "startDate",
      render: ({ startDate }: DataProps) => {
        const date = dayjs(startDate);

        return (
          <VStack $style={{ gap: "2px" }}>
            <Stack as="span" $style={{ lineHeight: "14px" }}>
              {date.format("YYYY-MM-DD")}
            </Stack>
            <Stack
              as="span"
              $style={{
                color: colors.textTertiary.toHex(),
                fontSize: "12px",
                lineHeight: "12px",
              }}
            >
              {date.format("HH:mm:ss")}
            </Stack>
          </VStack>
        );
      },
      title: "Start Date",
    },
    {
      align: "center",
      dataIndex: "configuration",
      key: "endDate",
      render: ({ endDate }: DataProps) => {
        if (!endDate) return "-";

        const date = dayjs(endDate);

        return (
          <VStack $style={{ gap: "2px" }}>
            <Stack as="span" $style={{ lineHeight: "14px" }}>
              {date.format("YYYY-MM-DD")}
            </Stack>
            <Stack
              as="span"
              $style={{
                color: colors.textTertiary.toHex(),
                fontSize: "12px",
                lineHeight: "12px",
              }}
            >
              {date.format("HH:mm:ss")}
            </Stack>
          </VStack>
        );
      },
      title: "End Date",
    },
    {
      align: "center",
      dataIndex: "configuration",
      key: "frequency",
      render: ({ frequency }: DataProps) => kebabCaseToTitle(frequency),
      title: "Frequency",
    },
    {
      align: "center",
      dataIndex: "configuration",
      key: "asset",
      render: ({ asset }: DataProps) => (
        <AutomationToken chain={asset.chain} id={asset.token} />
      ),
      title: "Asset",
    },
    {
      align: "center",
      dataIndex: "configuration",
      hidden: true,
      key: "completion",
      render: ({ endDate, frequency, startDate }: DataProps) => {
        let percent = 0;

        if (startDate) {
          const now = dayjs().unix();
          const start = dayjs(startDate).unix();

          if (frequency === "one-time") {
            if (now > start) percent = 100;
          } else if (endDate) {
            const end = dayjs(endDate).unix();

            if (now > end) {
              percent = 100;
            } else if (now > start) {
              let step = 60;

              switch (frequency) {
                case "hourly":
                  step = 60 * 60;
                  break;
                case "daily":
                  step = 60 * 60 * 24;
                  break;
                case "weekly":
                  step = 60 * 60 * 24 * 7;
                  break;
                case "bi-weekly":
                  step = 60 * 60 * 24 * 14;
                  break;
                case "monthly":
                  step = 60 * 60 * 24 * 30;
                  break;
                default:
                  break;
              }

              const totalSteps = Math.floor((end - start) / step);
              const completedSteps = Math.floor((now - start) / step);

              percent =
                completedSteps && totalSteps
                  ? Math.floor((completedSteps / totalSteps) * 100)
                  : 0;
            }
          }
        }

        return (
          <Progress
            percent={percent}
            percentPosition={{ align: "center" }}
            size="small"
          />
        );
      },
      title: "Completion",
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

  const addRecipient = () => {
    form
      .validateFields([
        ["recipient", "alias"],
        ["recipient", "toAddress"],
        ["recipient", "amount"],
      ])
      .then(({ recipient }) => {
        setState((prev) => ({
          ...prev,
          recipients: [...prev.recipients, recipient],
        }));

        form.setFieldValue("recipient", {
          alias: "",
          amount: "",
          toAddress: "",
        });
      })
      .catch(() => {});
  };

  const delRecipient = (index: number) => {
    setState((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  };

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
    if (step === 4) {
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

  const handleStep = (values: DataProps) => {
    if (!configuration) return;

    if (step === 4) {
      setState((prev) => ({ ...prev, submitting: true }));

      const configurationData = getConfiguration(
        configuration,
        cloneDeep({
          ...values,
          recipients: recipients.map((recipient) => ({
            ...recipient,
            amount: parseUnits(
              Number(recipient.amount).toFixed(values.asset.decimals),
              values.asset.decimals,
            ).toString(),
          })),
        }),
        configuration.definitions,
      );

      getRecipeSuggestion(id, configurationData)
        .then(({ maxTxsPerWindow, rateLimitWindow, rules = [] }) => {
          const jsonData = create(PolicySchema, {
            author: "",
            configuration: configurationData,
            description: "",
            feePolicies: getFeePolicies(pricing),
            id: pluginId,
            maxTxsPerWindow,
            name: values.name || "",
            rateLimitWindow,
            rules,
            version: pluginVersion,
          });

          const binary = toBinary(PolicySchema, jsonData);

          const recipe = base64Encode(binary);

          const policy: AppAutomation = {
            active: true,
            id: uuidv4(),
            pluginId: id,
            pluginVersion: String(pluginVersion),
            policyVersion: 0,
            publicKey: getVaultId(),
            recipe,
          };

          const message = policyToHexMessage(policy);

          personalSign(address, message, "policy", id)
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
                .catch((error: Error) => {
                  setState((prev) => ({ ...prev, submitting: false }));

                  messageAPI.error(error.message);
                });
            })
            .catch(() => {
              messageAPI.error("Failed to sign automation");

              setState((prev) => ({ ...prev, submitting: false }));
            });
        })
        .catch(() => {
          setState((prev) => ({
            ...prev,
            error: {
              text: "The selected token isn't supported by this plugin. Try choosing another token.",
              title: "Unsupported Token",
            },
            submitting: false,
          }));
        });
    } else {
      setState((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  useEffect(() => {
    if (!visible) return;

    form.resetFields();

    setState((prev) => ({
      ...prev,
      isAdded: false,
      submitting: false,
      step: 1,
      recipients: [],
    }));
  }, [form, visible]);

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
          size="small"
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
              <Button
                disabled={step === 2 && !recipients.length}
                loading={submitting}
                onClick={() => form.submit()}
              >
                {step > 3 ? "Submit" : "Continue"}
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
          steps={[
            "Select Asset",
            "Add recipients",
            "Set up frequency",
            "Overview",
          ]}
          step={step}
        />
        <Divider light vertical />
        <VStack
          $style={{
            backgroundColor: colors.bgTertiary.toHex(),
            borderRadius: "24px",
            flexGrow: 1,
            gap: "24px",
            padding: "32px",
          }}
        >
          <Form
            autoComplete="off"
            form={form}
            layout="vertical"
            onFinish={handleStep}
            onFinishFailed={({ values }) => {
              if (step === 2 && recipients.length > 0) handleStep(values);
            }}
          >
            <Stack $style={{ display: step === 1 ? "block" : "none" }}>
              <AssetWidget chains={supportedChains} keys={["asset"]} noStyle />
            </Stack>
            <Stack
              $style={{
                display: step === 2 ? "flex" : "none",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              {values?.asset && recipients.length ? (
                <Stack
                  $style={{
                    display: "grid",
                    gap: "16px",
                    gridTemplateColumns: "repeat(3, 1fr)",
                  }}
                >
                  {recipients.map((recipient, index) => (
                    <RecipientItem
                      asset={values.asset}
                      key={index}
                      onRemove={() => delRecipient(index)}
                      recipient={recipient}
                    />
                  ))}
                </Stack>
              ) : (
                <Empty description="No recipients added yet." />
              )}
              <Divider />
              <VStack>
                <Stack
                  $style={{
                    columnGap: "16px",
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                  }}
                >
                  <Form.Item
                    label="Alias / Name"
                    name={["recipient", "alias"]}
                    rules={[
                      {
                        required: step === 2,
                        message: "Please enter an alias",
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <AutomationFormAddressInput
                    chain={values?.asset?.chain}
                    label="To Address"
                    name={["recipient", "toAddress"]}
                    rules={[
                      {
                        required: step === 2,
                        message: "Please enter a recipient address",
                      },
                    ]}
                  />
                </Stack>
                <AutomationFormAmountInput
                  asset={values?.asset}
                  label="Amount"
                  name={["recipient", "amount"]}
                  rules={[
                    { required: step === 2, message: "Please enter an amount" },
                  ]}
                />
              </VStack>
              <Stack
                $style={{
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Button onClick={addRecipient}>Add Recipient</Button>
              </Stack>
            </Stack>
            <Stack
              $style={{
                columnGap: "24px",
                display: step === 3 ? "grid" : "none",
                gridTemplateColumns: "repeat(2, 1fr)",
              }}
            >
              <AutomationFormDatePicker label="End Date" name="endDate" />
              <Form.Item
                label="Frequency"
                name="frequency"
                rules={[{ required: step > 2 }]}
              >
                <Select
                  options={frequencies.map((value) => ({
                    label: kebabCaseToTitle(value),
                    value,
                  }))}
                />
              </Form.Item>
              <AutomationFormCheckboxDate name="startDate" />
            </Stack>
            {step === 4 && <Overview {...{ ...values, recipients }} />}
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

const Overview: FC<DataProps> = ({
  asset,
  endDate,
  frequency,
  recipients,
  startDate,
}) => {
  const colors = useTheme();

  return (
    <VStack $style={{ gap: "16px" }}>
      <VStack
        $style={{
          backgroundColor: colors.bgPrimary.toHex(),
          borderRadius: "24px",
          flexGrow: 1,
          gap: "16px",
          padding: "32px",
        }}
      >
        <HStack
          $style={{
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack as="span" $style={{ color: colors.textTertiary.toHex() }}>
            Name
          </Stack>
          <Form.Item name="name" noStyle>
            <Stack
              as={Input}
              placeholder="Automation Name"
              size="small"
              $style={{ height: "34px", width: "140px" }}
            />
          </Form.Item>
        </HStack>
        <Divider light />
        {!!startDate && (
          <>
            <HStack
              $style={{
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack as="span" $style={{ color: colors.textTertiary.toHex() }}>
                Start Date
              </Stack>
              <Stack as="span">
                {dayjs(startDate).format("YYYY-MM-DD HH:mm")}
              </Stack>
            </HStack>
            <Divider light />
          </>
        )}
        {!!endDate && (
          <>
            <HStack
              $style={{
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack as="span" $style={{ color: colors.textTertiary.toHex() }}>
                End Date
              </Stack>
              <Stack as="span">
                {dayjs(endDate).format("YYYY-MM-DD HH:mm")}
              </Stack>
            </HStack>
            <Divider light />
          </>
        )}
        <HStack
          $style={{
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack as="span" $style={{ color: colors.textTertiary.toHex() }}>
            Frequency
          </Stack>
          <Stack
            as="span"
            $style={{
              backgroundColor: colors.accentFour.toRgba(0.1),
              borderRadius: "4px",
              color: colors.accentFour.toHex(),
              lineHeight: "20px",
              padding: "0 8px",
            }}
          >
            {kebabCaseToTitle(frequency)}
          </Stack>
        </HStack>
        <Divider light />
        <HStack
          $style={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Stack as="span" $style={{ color: colors.textTertiary.toHex() }}>
            Asset
          </Stack>
          <AutomationToken chain={asset.chain} id={asset.token} />
        </HStack>
      </VStack>
      <Divider />
      <Stack
        $style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(3, 1fr)",
        }}
      >
        {recipients.map((recipient, index) => (
          <RecipientItem asset={asset} key={index} recipient={recipient} />
        ))}
      </Stack>
    </VStack>
  );
};

const RecipientItem: FC<{
  asset: AssetProps;
  onEdit?: () => void;
  onRemove?: () => void;
  recipient: RecipientProps;
}> = ({ asset, onEdit, onRemove, recipient }) => {
  const [{ id, logo = "", ticker }, setToken] = useState<Partial<Token>>({});
  const { chain, token } = asset;
  const { alias, amount, toAddress } = recipient;
  const { getTokenData } = useQueries();
  const colors = useTheme();

  useEffect(() => {
    let cancelled = false;

    if (token) {
      getTokenData(chain, token)
        .then((token) => {
          if (!cancelled) setToken(token);
        })
        .catch(() => {});
    } else {
      setToken(nativeTokens[chain]);
    }

    return () => {
      cancelled = true;
    };
  }, [chain, token]);

  return (
    <HStack
      $style={{
        alignItems: "center",
        backgroundColor: colors.bgPrimary.toHex(),
        borderColor: colors.borderLight.toHex(),
        borderRadius: "16px",
        borderStyle: "solid",
        borderWidth: "1px",
        fontSize: "12px",
        gap: "8px",
        lineHeight: "16px",
        overflow: "hidden",
        padding: "12px 16px",
        position: "relative",
      }}
    >
      <VStack $style={{ flexGrow: "1", gap: "4px", overflow: "hidden" }}>
        <VStack>
          <Stack
            as="span"
            $style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {alias}
          </Stack>
          <MiddleTruncate
            $style={{ color: colors.textTertiary.toHex() }}
          >{`(${toAddress})`}</MiddleTruncate>
        </VStack>
        {ticker ? (
          <>
            <HStack $style={{ alignItems: "center", gap: "8px" }}>
              <Stack $style={{ position: "relative" }}>
                <TokenImage
                  alt={ticker}
                  borderRadius="50%"
                  height="16px"
                  src={logo}
                  width="16px"
                />
                {!!id && (
                  <Stack
                    $style={{
                      bottom: "-2px",
                      position: "absolute",
                      right: "-2px",
                    }}
                  >
                    <TokenImage
                      alt={chain}
                      borderRadius="50%"
                      height="10px"
                      src={`/tokens/${chain.toLowerCase()}.svg`}
                      width="10px"
                    />
                  </Stack>
                )}
              </Stack>
              <Stack as="span">{toNumberFormat(amount)}</Stack>
              <Stack as="span" $style={{ color: colors.textTertiary.toHex() }}>
                {ticker}
              </Stack>
            </HStack>
          </>
        ) : (
          <HStack as={Spin} size="small" />
        )}
      </VStack>
      {(onEdit || onRemove) && (
        <VStack $style={{ flex: "none", gap: "12px" }}>
          {onEdit && (
            <Button
              icon={<PencilLineIcon />}
              kind="info"
              onClick={onEdit}
              ghost
            />
          )}
          {onRemove && (
            <Button
              icon={<TrashIcon />}
              kind="danger"
              onClick={onRemove}
              ghost
            />
          )}
        </VStack>
      )}
    </HStack>
  );
};
