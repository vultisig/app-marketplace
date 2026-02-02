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

import { AutomationAmount } from "@/automations/components/Amount";
import { AutomationFormAmountInput } from "@/automations/components/FormAmountInput";
import { AutomationFormCheckboxDate } from "@/automations/components/FormCheckboxDate";
import { AutomationFormDatePicker } from "@/automations/components/FormDatePicker";
import { AutomationFormSidebar } from "@/automations/components/FormSidebar";
import { AutomationFormSuccess } from "@/automations/components/FormSuccess";
import { AutomationFormTitle } from "@/automations/components/FormTitle";
import { AutomationToken } from "@/automations/components/Token";
import { AutomationFormProps } from "@/automations/Default";
import { AssetProps, AssetWidget } from "@/automations/widgets/Asset";
import { StatusModal } from "@/components/StatusModal";
import { TokenImage } from "@/components/TokenImage";
import { useAntd } from "@/hooks/useAntd";
import { useCore } from "@/hooks/useCore";
import { useDiscard } from "@/hooks/useDiscard";
import { useGoBack } from "@/hooks/useGoBack";
import { useQueries } from "@/hooks/useQueries";
import { ChevronRightIcon } from "@/icons/ChevronRightIcon";
import { CrossIcon } from "@/icons/CrossIcon";
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
import { frequencies, Frequency } from "@/utils/frequencies";
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

type DataProps = {
  endDate: number;
  frequency: Frequency;
  from: AssetProps;
  fromAmount: string;
  name: string;
  startDate: number;
  to: AssetProps;
};

type StateProps = {
  automations: CustomAppAutomation[];
  current: number;
  error?: { text: string; title: string };
  isActive: boolean;
  isAdded: boolean;
  loading: boolean;
  submitting: boolean;
  step: number;
  total: number;
};

export const RecurringSwapsForm: FC<AutomationFormProps> = ({
  app,
  schema,
}) => {
  const [state, setState] = useState<StateProps>({
    automations: [],
    current: 1,
    isActive: true,
    isAdded: false,
    loading: false,
    submitting: false,
    step: 1,
    total: 0,
  });
  const {
    automations,
    current,
    error,
    isActive,
    isAdded,
    loading,
    step,
    submitting,
    total,
  } = state;
  const { id, pricing } = app;
  const {
    configuration,
    configurationExample,
    pluginId,
    pluginVersion,
    requirements,
  } = schema;
  const { messageAPI, modalAPI } = useAntd();
  const { address = "" } = useCore();
  const { discard, discardHolder } = useDiscard();
  const { hash } = useLocation();
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
      key: "from",
      render: ({ from }: DataProps) => (
        <AutomationToken chain={from.chain} id={from.token} />
      ),
      title: "From",
    },
    {
      align: "center",
      dataIndex: "configuration",
      key: "to",
      render: ({ to }: DataProps) => (
        <AutomationToken chain={to.chain} id={to.token} />
      ),
      title: "To",
    },
    {
      align: "center",
      dataIndex: "configuration",
      key: "amount",
      render: ({ from, fromAmount }: DataProps) => {
        return (
          <AutomationAmount
            amount={fromAmount}
            chain={from.chain}
            tokenId={from.token}
          />
        );
      },
      title: "Amount",
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
    if (step === 3) {
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
    if (!configuration) return;

    if (step === 1) {
      form.resetFields();

      setState((prev) => ({ ...prev, step: 2 }));
    } else {
      form
        .validateFields()
        .then((values) => {
          if (step === 2) {
            setState((prev) => ({ ...prev, step: 3 }));
          } else {
            setState((prev) => ({ ...prev, submitting: true }));

            const configurationData = getConfiguration(
              configuration,
              cloneDeep({
                ...values,
                fromAmount: parseUnits(
                  Number(values.fromAmount).toFixed(values.from.decimals),
                  values.from.decimals,
                ).toString(),
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
                    setState((prev) => ({ ...prev, submitting: false }));

                    messageAPI.error("Failed to sign automation");
                  });
              })
              .catch(() => {
                setState((prev) => ({
                  ...prev,
                  error: {
                    text: "The selected token pair isn’t supported by this plugin. Try choosing another pair.",
                    title: "Failed to Find Swap Route",
                  },
                  submitting: false,
                }));
              });
          }
        })
        .catch(() => {});
    }
  };

  const handleTemplate = (data: DataProps) => {
    form.resetFields();
    form.setFieldsValue(data);

    setState((prev) => ({ ...prev, step: 2 }));
  };

  useEffect(() => {
    if (!visible) return;

    form.resetFields();

    setState((prev) => ({
      ...prev,
      isAdded: false,
      step: 1,
      submitting: false,
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
              <Button loading={submitting} onClick={handleStep}>
                {step > 2
                  ? "Submit"
                  : step > 1
                    ? "Continue"
                    : "Create your own automations"}
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
          steps={["Templates", "Automations", "Overview"]}
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
            <Stack
              $style={{
                columnGap: "24px",
                display: step === 1 ? "grid" : "none",
                gridTemplateColumns: "repeat(2, 1fr)",
              }}
            >
              {configurationExample?.length ? (
                configurationExample.map((example, index) => (
                  <Template
                    key={index}
                    setValues={handleTemplate}
                    values={example as DataProps}
                  />
                ))
              ) : (
                <Empty description="No templates available" />
              )}
            </Stack>
            <Stack
              $style={{
                columnGap: "24px",
                display: step === 2 ? "grid" : "none",
                gridTemplateColumns: "repeat(2, 1fr)",
              }}
            >
              <AutomationFormDatePicker label="End Date" name="endDate" />
              <Form.Item
                label="Frequency"
                name="frequency"
                rules={[{ required: true }]}
              >
                <Select
                  options={frequencies.map((value) => ({
                    label: kebabCaseToTitle(value),
                    value,
                  }))}
                />
              </Form.Item>
              <AutomationFormCheckboxDate name="startDate" />
              <AssetWidget chains={supportedChains} keys={["from"]} />
              <AutomationFormAmountInput
                asset={values?.from}
                label="Amount"
                name="fromAmount"
                rules={[{ required: true }]}
              />
              <AssetWidget chains={supportedChains} keys={["to"]} />
            </Stack>
            {step === 3 && <Overview {...values} />}
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
  endDate,
  frequency = "",
  from,
  fromAmount = 0,
  startDate,
  to,
}) => {
  const colors = useTheme();

  return (
    <VStack $style={{ gap: "16px" }}>
      <HStack
        $style={{
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack as="span">Name</Stack>
        <Form.Item name="name" noStyle>
          <Stack
            as={Input}
            placeholder="Automation Name"
            size="small"
            $style={{ height: "34px", width: "140px" }}
          />
        </Form.Item>
      </HStack>
      <Divider />
      {!!startDate && (
        <>
          <HStack
            $style={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack as="span">Start Date</Stack>
            <Stack as="span">
              {dayjs(startDate).format("YYYY-MM-DD HH:mm")}
            </Stack>
          </HStack>
          <Divider />
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
            <Stack as="span">End Date</Stack>
            <Stack as="span">{dayjs(endDate).format("YYYY-MM-DD HH:mm")}</Stack>
          </HStack>
          <Divider />
        </>
      )}
      <HStack
        $style={{
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack as="span">Frequency</Stack>
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
      <Divider />
      {!!from && (
        <>
          <HStack
            $style={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack as="span">From</Stack>
            <AutomationToken chain={from.chain} id={from.token} />
          </HStack>
          <Divider />
        </>
      )}
      <HStack
        $style={{
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack as="span">Amount</Stack>
        <Stack as="span">{toNumberFormat(fromAmount)}</Stack>
      </HStack>
      <Divider />
      {!!to && (
        <HStack
          $style={{
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack as="span">To</Stack>
          <AutomationToken chain={to.chain} id={to.token} />
        </HStack>
      )}
    </VStack>
  );
};

const Template: FC<{
  values: DataProps;
  setValues: (data: DataProps) => void;
}> = ({ values, setValues }) => {
  const [data, setData] = useState(values);
  const { frequency, from, fromAmount, to } = data;
  const colors = useTheme();

  return (
    <VStack
      $style={{
        backgroundColor: colors.bgSecondary.toHex(),
        borderRadius: "12px",
        gap: "12px",
        padding: "12px",
      }}
    >
      <HStack $style={{ gap: "12px", position: "relative" }}>
        <TemplateItem
          asset={from}
          setAsset={(asset) => setData((prev) => ({ ...prev, from: asset }))}
        />
        <TemplateItem
          asset={to}
          setAsset={(asset) => setData((prev) => ({ ...prev, to: asset }))}
        />
        <VStack
          $style={{
            backgroundColor: colors.bgSecondary.toHex(),
            borderColor: colors.borderLight.toHex(),
            borderRadius: "50%",
            borderStyle: "solid",
            borderWidth: "1px",
            fontSize: "12px",
            left: "50%",
            position: "absolute",
            top: "50%",
            transform: "translate(-50%, -50%)",
            padding: "8px",
          }}
          $before={{
            backgroundColor: colors.bgSecondary.toHex(),
            inset: "-2px 0",
            left: "50%",
            position: "absolute",
            transform: "translateX(-50%)",
            width: "12px",
            zIndex: -1,
          }}
        >
          <VStack
            as={ChevronRightIcon}
            $style={{
              backgroundColor: colors.bgSecondary.toHex(),
              borderRadius: "50%",
              color: colors.buttonDisabledText.toHex(),
              fontSize: "24px",
              padding: "4px",
            }}
          />
        </VStack>
      </HStack>
      <VStack
        $style={{
          borderColor: colors.borderLight.toHex(),
          borderRadius: "16px",
          borderStyle: "solid",
          borderWidth: "1px",
        }}
      >
        <HStack $style={{ justifyContent: "space-between", padding: "12px" }}>
          <Stack as="span" $style={{ fontSize: "12px" }}>
            Frequency
          </Stack>
          <Stack as="span" $style={{ fontSize: "12px" }}>
            {kebabCaseToTitle(frequency)}
          </Stack>
        </HStack>
        <Divider light />
        <HStack $style={{ justifyContent: "space-between", padding: "12px" }}>
          <Stack as="span" $style={{ fontSize: "12px" }}>
            Amount
          </Stack>
          <Stack as="span" $style={{ fontSize: "12px" }}>
            {toNumberFormat(fromAmount)}
          </Stack>
        </HStack>
      </VStack>
      <VStack
        as="span"
        onClick={() => setValues(data)}
        $style={{
          alignItems: "center",
          backgroundColor: colors.buttonPrimary.toHex(),
          borderRadius: "20px",
          color: colors.buttonText.toHex(),
          cursor: "pointer",
          flexGrow: "1",
          fontSize: "12px",
          height: "40px",
          justifyContent: "center",
        }}
        $hover={{ backgroundColor: colors.buttonPrimaryHover.toHex() }}
      >
        Get Started
      </VStack>
    </VStack>
  );
};

const TemplateItem: FC<{
  asset: AssetProps;
  setAsset: (asset: AssetProps) => void;
}> = ({ asset, setAsset }) => {
  const [token, setToken] = useState<Token | undefined>(undefined);
  const { vault } = useCore();
  const { getTokenData } = useQueries();
  const colors = useTheme();

  useEffect(() => {
    if (!vault) return;

    vault.address(asset.chain).then((address) => {
      if (asset.token) {
        getTokenData(asset.chain, asset.token)
          .then((token) => {
            setAsset({ ...asset, address, decimals: token.decimals });
            setToken(token);
          })
          .catch(() => {
            //Todo: handle error
          });
      } else {
        const token = nativeTokens[asset.chain];
        setAsset({ ...asset, address, decimals: token.decimals });
        setToken(token);
      }
    });
  }, [asset.chain, asset.token, vault]);

  return (
    <VStack
      $style={{
        alignItems: "center",
        backgroundColor: colors.bgTertiary.toHex(),
        borderColor: colors.borderLight.toHex(),
        borderRadius: "16px",
        borderStyle: "solid",
        borderWidth: "1px",
        gap: "8px",
        justifyContent: "center",
        height: "88px",
        width: "100%",
      }}
    >
      {token ? (
        <>
          <Stack $style={{ position: "relative" }}>
            <TokenImage
              alt={token.ticker}
              borderRadius="50%"
              height="30px"
              src={token.logo}
              width="30px"
            />
            {(!!token.id || token.chain !== asset.chain) && (
              <Stack
                $style={{ bottom: "-4px", position: "absolute", right: "-4px" }}
              >
                <TokenImage
                  alt={asset.chain}
                  borderRadius="50%"
                  height="16px"
                  src={`/tokens/${asset.chain.toLowerCase()}.svg`}
                  width="16px"
                />
              </Stack>
            )}
          </Stack>
          <Stack as="span">{token.ticker}</Stack>
        </>
      ) : (
        <Spin />
      )}
    </VStack>
  );
};
