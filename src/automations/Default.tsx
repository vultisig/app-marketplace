import { create, fromBinary, JsonObject, toBinary } from "@bufbuild/protobuf";
import { base64Decode, base64Encode } from "@bufbuild/protobuf/wire";
import {
  Form,
  FormProps,
  Input,
  Modal,
  Select,
  Table,
  TableProps,
  Tabs,
} from "antd";
import { FC, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTheme } from "styled-components";
import { v4 as uuidv4 } from "uuid";

import {
  addAutomation,
  delAutomation,
  getAutomations,
  getRecipeSuggestion,
} from "@/api/store";
import { AutomationFormConfiguration } from "@/automations/components/FormConfiguration";
import { AutomationFormSidebar } from "@/automations/components/FormSidebar";
import { AutomationFormSuccess } from "@/automations/components/FormSuccess";
import { AutomationFormTitle } from "@/automations/components/FormTitle";
import { MiddleTruncate } from "@/components/MiddleTruncate";
import { useAntd } from "@/hooks/useAntd";
import { useApp } from "@/hooks/useApp";
import { useGoBack } from "@/hooks/useGoBack";
import { CrossIcon } from "@/icons/CrossIcon";
import { TrashIcon } from "@/icons/TrashIcon";
import {
  ConstraintSchema,
  ConstraintType,
  MagicConstant,
} from "@/proto/constraint_pb";
import { ParameterConstraintSchema } from "@/proto/parameter_constraint_pb";
import { Policy, PolicySchema } from "@/proto/policy_pb";
import { Effect, RuleSchema, TargetSchema, TargetType } from "@/proto/rule_pb";
import { Button } from "@/toolkits/Button";
import { Divider } from "@/toolkits/Divider";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { defaultPageSize, modalHash } from "@/utils/constants";
import {
  camelCaseToTitle,
  getConfiguration,
  getFeePolicies,
  policyToHexMessage,
  snakeCaseToTitle,
  toNumberFormat,
} from "@/utils/functions";
import { App, AppAutomation, RecipeSchema } from "@/utils/types";

type CustomAppAutomation = AppAutomation & { parsedRecipe: Policy };

type FormFieldType = { rules: JsonObject[] } & JsonObject;

export type AutomationFormProps = { app: App; schema: RecipeSchema };

type StateProps = {
  automations: CustomAppAutomation[];
  current: number;
  isActive: boolean;
  isAdded: boolean;
  loading: boolean;
  submitting: boolean;
  step: number;
  total: number;
};

export const AutomationForm: FC<AutomationFormProps> = ({ app, schema }) => {
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
    isActive,
    isAdded,
    loading,
    step,
    submitting,
    total,
  } = state;
  const {
    configuration,
    pluginName,
    pluginVersion,
    requirements,
    supportedResources,
  } = schema;
  const { messageAPI, modalAPI } = useAntd();
  const { personalSign, vault } = useApp();
  const { hash } = useLocation();
  const { id: appId = "" } = useParams();
  const [form] = Form.useForm<FormFieldType>();
  const goBack = useGoBack();
  const colors = useTheme();
  const supportedChains = requirements?.supportedChains || [];
  const visible = hash === modalHash.automation;

  const columns: TableProps<CustomAppAutomation>["columns"] = [
    Table.EXPAND_COLUMN,
    {
      dataIndex: "parsedRecipe",
      key: "name",
      render: ({ name }: Policy) => name,
      title: "Name",
    },
    {
      align: "center",
      dataIndex: "parsedRecipe",
      key: "maxTxsPerWindow",
      render: ({ maxTxsPerWindow }: Policy) =>
        maxTxsPerWindow ? toNumberFormat(maxTxsPerWindow) : "-",
      title: "Max Transactions",
    },
    {
      align: "center",
      dataIndex: "parsedRecipe",
      key: "rateLimitWindow",
      render: ({ rateLimitWindow }: Policy) =>
        rateLimitWindow ? toNumberFormat(rateLimitWindow) : "-",
      title: "Rate Limit",
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
                const parsedRecipe = fromBinary(PolicySchema, decoded);

                return { ...automation, parsedRecipe };
              } catch {
                return {
                  ...automation,
                  parsedRecipe: create(PolicySchema, {}),
                };
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

  const steps = useMemo(() => {
    return [...(configuration ? ["Configuration"] : []), "Rules"];
  }, [configuration]);

  const handleBack = () => {
    if (step > 1) {
      setState((prev) => ({ ...prev, step: prev.step - 1 }));
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

  const handleSign = (values: JsonObject, rules: JsonObject[]) => {
    if (!vault) return;

    setState((prev) => ({ ...prev, submitting: true }));

    const jsonData = create(PolicySchema, {
      author: "",
      configuration: configuration
        ? getConfiguration(configuration, values, configuration.definitions)
        : undefined,
      description: "",
      feePolicies: getFeePolicies(app.pricing),
      id: appId,
      name: pluginName,
      rules: rules
        .filter(
          ({ resource }) =>
            supportedResources.findIndex(
              ({ resourcePath }) => resourcePath?.full === resource,
            ) >= 0,
        )
        .map(({ description = "", resource, target, ...params }) => {
          const {
            parameterCapabilities,
            resourcePath,
            target: targetType,
          } = supportedResources.find(
            ({ resourcePath }) => resourcePath?.full === resource,
          )!;

          return create(RuleSchema, {
            constraints: {},
            description: description as string,
            effect: Effect.ALLOW,
            id: "",
            parameterConstraints: parameterCapabilities.map(
              ({ parameterName, required, supportedTypes }) =>
                create(ParameterConstraintSchema, {
                  constraint: create(ConstraintSchema, {
                    denominatedIn:
                      resourcePath?.chainId?.toLowerCase() === "ethereum"
                        ? "wei"
                        : "",
                    period: "",
                    required,
                    type: supportedTypes,
                    value: {
                      case: "fixedValue",
                      value: params[parameterName] as string,
                    },
                  }),
                  parameterName,
                }),
            ),
            resource: resource as string,
            target: create(TargetSchema, {
              targetType,
              target:
                targetType === TargetType.ADDRESS
                  ? { case: "address", value: target as string }
                  : targetType === TargetType.MAGIC_CONSTANT
                    ? {
                        case: "magicConstant",
                        value: MagicConstant.VULTISIG_TREASURY,
                      }
                    : { case: undefined, value: undefined },
            }),
          });
        }),
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
            setState((prev) => ({ ...prev, isAdded: true }));

            fetchAutomations(0, isActive);
          })
          .catch((error: Error) => {
            messageAPI.error(error.message);
          })
          .finally(() => {
            setState((prev) => ({ ...prev, submitting: false }));
          });
      })
      .catch(() => {
        setState((prev) => ({ ...prev, submitting: false }));
      });
  };

  const handleSuggest = (values: JsonObject) => {
    if (!configuration) return;

    setState((prev) => ({ ...prev, submitting: true }));

    const configurationData = getConfiguration(
      configuration,
      values,
      configuration.definitions,
    );

    getRecipeSuggestion(appId, configurationData).then(({ rules = [] }) => {
      const formRules = rules.map(
        ({ parameterConstraints, resource, target }) => {
          const params: JsonObject = { resource };

          if (target?.target?.value) {
            params.target = target.target.value as string;
          }

          parameterConstraints.forEach(({ constraint, parameterName }) => {
            if (constraint?.value?.value) {
              params[parameterName] = constraint.value.value as string;
            }
          });

          return params;
        },
      );

      if (formRules.length > 0) {
        form.setFieldValue("rules", formRules);

        setTimeout(() => {
          setState((prev) => ({ ...prev, step: steps.length }));

          handleSign(values, formRules);
        }, 0);
      } else {
        setState((prev) => ({
          ...prev,
          submitting: false,
          step: steps.length,
        }));
      }
    });
  };

  const onFinishSuccess: FormProps<FormFieldType>["onFinish"] = ({
    rules = [],
    ...values
  }) => {
    if (steps.length === step) {
      handleSign(values, rules);
    } else if (steps.length - 1 === step) {
      handleSuggest(values);
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
          expandable={{
            expandedRowRender: (
              { parsedRecipe: { description, rules } },
              index,
            ) => {
              return (
                <VStack key={index} $style={{ gap: "8px" }}>
                  {description && (
                    <>
                      <VStack>
                        <Stack
                          as="span"
                          $style={{
                            fontSize: "12px",
                            lineHeight: "18px",
                          }}
                        >
                          Description
                        </Stack>
                        <Stack
                          as="span"
                          $style={{
                            fontSize: "12px",
                            lineHeight: "18px",
                          }}
                        >
                          {description}
                        </Stack>
                      </VStack>
                      <Divider light />
                    </>
                  )}
                  {rules.map(
                    ({ description, parameterConstraints, target }, index) => (
                      <Fragment key={index}>
                        {index > 0 && <Divider light />}
                        <Stack
                          $style={{
                            display: "grid",
                            gap: "8px",
                            gridTemplateColumns: "repeat(3, 1fr)",
                          }}
                          $media={{
                            xl: {
                              $style: {
                                gridTemplateColumns: "repeat(2, 1fr)",
                              },
                            },
                          }}
                        >
                          {parameterConstraints.map(
                            ({ constraint, parameterName }) => (
                              <VStack key={parameterName}>
                                {constraint?.value.case ? (
                                  <HStack
                                    $style={{
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <Stack
                                      as="span"
                                      $style={{
                                        fontSize: "12px",
                                        lineHeight: "18px",
                                      }}
                                    >
                                      {snakeCaseToTitle(parameterName)}
                                    </Stack>
                                    <Stack
                                      as="span"
                                      $style={{
                                        fontSize: "10px",
                                        lineHeight: "18px",
                                      }}
                                    >{`(${camelCaseToTitle(
                                      constraint.value.case,
                                    )})`}</Stack>
                                  </HStack>
                                ) : (
                                  <Stack
                                    as="span"
                                    $style={{
                                      fontSize: "12px",
                                      lineHeight: "18px",
                                    }}
                                  >
                                    {snakeCaseToTitle(parameterName)}
                                  </Stack>
                                )}
                                {typeof constraint?.value.value === "string" &&
                                constraint.value.value.startsWith("0x") ? (
                                  <MiddleTruncate
                                    $style={{
                                      fontSize: "12px",
                                      lineHeight: "18px",
                                    }}
                                  >
                                    {constraint.value.value}
                                  </MiddleTruncate>
                                ) : (
                                  <Stack
                                    as="span"
                                    $style={{
                                      fontSize: "12px",
                                      lineHeight: "18px",
                                    }}
                                  >
                                    {constraint?.value.value || "-"}
                                  </Stack>
                                )}
                              </VStack>
                            ),
                          )}
                          {target ? (
                            <VStack>
                              {target.target.case ? (
                                <HStack
                                  $style={{
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <Stack
                                    as="span"
                                    $style={{
                                      fontSize: "12px",
                                      lineHeight: "18px",
                                    }}
                                  >
                                    Target
                                  </Stack>
                                  <Stack
                                    as="span"
                                    $style={{
                                      fontSize: "10px",
                                      lineHeight: "18px",
                                    }}
                                  >{`(${camelCaseToTitle(
                                    target.target.case,
                                  )})`}</Stack>
                                </HStack>
                              ) : (
                                <Stack
                                  as="span"
                                  $style={{
                                    fontSize: "12px",
                                    lineHeight: "18px",
                                  }}
                                >
                                  Target
                                </Stack>
                              )}
                              {typeof target.target.value === "string" &&
                              target.target.value.startsWith("0x") ? (
                                <MiddleTruncate
                                  $style={{
                                    fontSize: "12px",
                                    lineHeight: "18px",
                                  }}
                                >
                                  {target.target.value}
                                </MiddleTruncate>
                              ) : (
                                <Stack
                                  as="span"
                                  $style={{
                                    fontSize: "12px",
                                    lineHeight: "18px",
                                  }}
                                >
                                  {target.target.value || "-"}
                                </Stack>
                              )}
                            </VStack>
                          ) : (
                            <></>
                          )}
                        </Stack>
                        {description && (
                          <VStack>
                            <Stack
                              as="span"
                              $style={{
                                fontSize: "12px",
                                lineHeight: "18px",
                              }}
                            >
                              Description
                            </Stack>
                            <Stack
                              as="span"
                              $style={{
                                fontSize: "12px",
                                lineHeight: "18px",
                              }}
                            >
                              {description}
                            </Stack>
                          </VStack>
                        )}
                      </Fragment>
                    ),
                  )}
                </VStack>
              );
            },
          }}
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
              <Button loading={submitting} onClick={() => form.submit()}>
                {configuration ? (step > 1 ? "Submit" : "Continue") : "Submit"}
              </Button>
            </HStack>
          </>
        }
        maskClosable={false}
        onCancel={handleBack}
        open={visible && !isAdded}
        styles={{
          body: { display: "flex", gap: 32 },
          footer: { display: "flex", gap: 65, marginTop: 24 },
          header: { marginBottom: 32 },
        }}
        title={
          <AutomationFormTitle app={app} step={step} onBack={handleBack} />
        }
        width={992}
      >
        <AutomationFormSidebar step={step} steps={steps} />
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
          <Form
            autoComplete="off"
            form={form}
            layout="vertical"
            onFinish={onFinishSuccess}
          >
            {configuration && (
              <Stack
                $style={{
                  columnGap: "24px",
                  display: step === steps.length - 1 ? "grid" : "none",
                  gridTemplateColumns: "repeat(2, 1fr)",
                }}
              >
                <AutomationFormConfiguration
                  chains={supportedChains}
                  configuration={configuration}
                  definitions={configuration.definitions}
                />
              </Stack>
            )}
            <Stack
              $style={{ display: step === steps.length ? "block" : "none" }}
            >
              <Form.List
                name="rules"
                rules={[
                  {
                    validator: async (_, rules) => {
                      if (
                        step === steps.length &&
                        (!rules || rules.length < 1)
                      ) {
                        return Promise.reject(
                          new Error("Please enter at least one rule"),
                        );
                      }
                    },
                  },
                ]}
              >
                {(fields, { add, remove }, { errors }) => (
                  <VStack $style={{ gap: "24px" }}>
                    {fields.map(({ key, name, ...restField }) => (
                      <Fragment key={`${name}-${key}`}>
                        <VStack>
                          <Stack
                            $style={{
                              columnGap: "16px",
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                            }}
                          >
                            <Form.Item
                              name={[name, "resource"]}
                              label="Supported Resource"
                              rules={[{ required: step === steps.length }]}
                              {...restField}
                            >
                              <Select
                                options={supportedResources.map((resource) => ({
                                  label: resource.resourcePath?.full,
                                  value: resource.resourcePath?.full,
                                }))}
                              />
                            </Form.Item>
                            <Form.Item<FormFieldType>
                              shouldUpdate={(prev, current) =>
                                prev.rules[name]?.resource !==
                                current.rules[name]?.resource
                              }
                              noStyle
                            >
                              {({ getFieldsValue }) => {
                                const { rules = [] } = getFieldsValue();
                                const { resource } = rules[name] || {};
                                const supportedResource =
                                  supportedResources.find(
                                    ({ resourcePath }) =>
                                      resourcePath?.full === resource,
                                  );

                                if (!supportedResource) return null;

                                return (
                                  <>
                                    {supportedResource.parameterCapabilities
                                      .filter(
                                        ({ supportedTypes }) =>
                                          supportedTypes !== ConstraintType.ANY,
                                      )
                                      .map(({ parameterName, required }) => (
                                        <Form.Item
                                          key={parameterName}
                                          label={snakeCaseToTitle(
                                            parameterName,
                                          )}
                                          name={[name, parameterName]}
                                          rules={[
                                            {
                                              required:
                                                step === steps.length &&
                                                required,
                                            },
                                          ]}
                                        >
                                          <Input />
                                        </Form.Item>
                                      ))}
                                    {supportedResource.target ===
                                      TargetType.ADDRESS && (
                                      <Form.Item
                                        label="Target"
                                        name={[name, "target"]}
                                        rules={[
                                          { required: step === steps.length },
                                        ]}
                                      >
                                        <Input />
                                      </Form.Item>
                                    )}
                                    <Stack
                                      as={Form.Item}
                                      name={[name, "description"]}
                                      label="Description"
                                      $style={{ gridColumn: "1 / -1" }}
                                    >
                                      <Input.TextArea />
                                    </Stack>
                                  </>
                                );
                              }}
                            </Form.Item>
                          </Stack>
                          <Stack
                            $style={{
                              alignItems: "center",
                              display: "flex",
                              flexDirection: "row-reverse",
                              justifyContent: "space-between",
                            }}
                          >
                            {fields.length > 1 && (
                              <Button
                                icon={<TrashIcon fontSize={16} />}
                                kind="danger"
                                onClick={() => remove(name)}
                                ghost
                              />
                            )}
                            <Form.Item<FormFieldType>
                              shouldUpdate={(prev, current) =>
                                prev.rules[name]?.resource !==
                                current.rules[name]?.resource
                              }
                              noStyle
                            >
                              {({ getFieldsValue }) => {
                                const { rules = [] } = getFieldsValue();
                                const { resource } = rules[name] || {};
                                const supportedResource =
                                  supportedResources.find(
                                    ({ resourcePath }) =>
                                      resourcePath?.full === resource,
                                  );

                                if (!supportedResource) return null;

                                return supportedResource.resourcePath ? (
                                  <HStack $style={{ gap: "8px" }}>
                                    {[
                                      ...(supportedResource.resourcePath.chainId
                                        ? [
                                            `Chain: ${camelCaseToTitle(
                                              supportedResource.resourcePath
                                                .chainId,
                                            )}`,
                                          ]
                                        : []),
                                      ...(supportedResource.resourcePath
                                        .protocolId
                                        ? [
                                            `Protocol: ${camelCaseToTitle(
                                              supportedResource.resourcePath
                                                .protocolId,
                                            )}`,
                                          ]
                                        : []),
                                      ...(supportedResource.resourcePath
                                        .functionId
                                        ? [
                                            `Function: ${camelCaseToTitle(
                                              supportedResource.resourcePath
                                                .functionId,
                                            )}`,
                                          ]
                                        : []),
                                    ].map((item, index) => (
                                      <Stack
                                        as="span"
                                        key={index}
                                        $style={{
                                          backgroundColor:
                                            colors.bgSecondary.toHex(),
                                          borderRadius: "6px",
                                          color: colors.textPrimary.toHex(),
                                          display: "inline-flex",
                                          fontSize: "12px",
                                          lineHeight: "24px",
                                          padding: "0 8px",
                                        }}
                                      >
                                        {item}
                                      </Stack>
                                    ))}
                                  </HStack>
                                ) : (
                                  <></>
                                );
                              }}
                            </Form.Item>
                          </Stack>
                        </VStack>
                        <Divider light />
                      </Fragment>
                    ))}
                    <VStack>
                      {errors.length > 0 && (
                        <Stack as={Form.Item} $style={{ margin: "0" }}>
                          <Form.ErrorList errors={errors} />
                        </Stack>
                      )}
                      <Button onClick={() => add({})} kind="secondary">
                        Add Rule
                      </Button>
                    </VStack>
                  </VStack>
                )}
              </Form.List>
            </Stack>
          </Form>
        </VStack>
      </Modal>
    </>
  );
};
