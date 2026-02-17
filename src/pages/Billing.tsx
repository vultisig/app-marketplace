import { Table, TableProps, theme as antTheme } from "antd";
import dayjs from "dayjs";
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "styled-components";
import { formatUnits } from "viem";

import { getBillings, getMyApps, uninstallApp } from "@/api/store";
import { useAntd } from "@/hooks/useAntd";
import { useApp } from "@/hooks/useApp";
import { useCore } from "@/hooks/useCore";
import { useGoBack } from "@/hooks/useGoBack";
import { ChevronLeftIcon } from "@/icons/ChevronLeftIcon";
import { TrashIcon } from "@/icons/TrashIcon";
import { tableClassNames } from "@/styles";
import { Button } from "@/toolkits/Button";
import { Divider } from "@/toolkits/Divider";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { defaultPageSize, feeAppId, modalHash } from "@/utils/constants";
import { formatDateWithTimezone, toValueFormat } from "@/utils/functions";
import { routeTree } from "@/utils/routes";
import { App, Billing } from "@/utils/types";

type StateProps = {
  apps: App[];
  billings: Billing[];
  current: number;
  loading: boolean;
  total: number;
};

export const BillingPage = () => {
  const [state, setState] = useState<StateProps>({
    apps: [],
    billings: [],
    current: 1,
    loading: true,
    total: 0,
  });
  const { apps, billings, current, loading, total } = state;
  const { messageAPI, modalAPI } = useAntd();
  const { feeApp, feeAppStatus, updateFeeAppStatus } = useApp();
  const { baseValue, currency } = useCore();
  const goBack = useGoBack();
  const navigate = useNavigate();
  const colors = useTheme();
  const { token } = antTheme.useToken();

  const columns: TableProps<Billing>["columns"] = [
    {
      dataIndex: "pluginId",
      key: "pluginId",
      title: "Plugin Name",
      render: (_, { appName, pluginId }) => {
        const app = apps.find(({ id }) => id === pluginId);

        if (!app) return appName;

        return (
          <HStack $style={{ alignItems: "center", gap: "8px" }}>
            <Stack
              as="img"
              alt={app.title}
              src={app.logoUrl}
              $style={{ borderRadius: "8px", height: "36px", width: "36px" }}
            />
            <Stack as="span">{app.title}</Stack>
          </HStack>
        );
      },
    },
    {
      align: "center",
      dataIndex: "pricing",
      key: "pricing",
      title: "Price / Fee",
    },
    {
      align: "center",
      dataIndex: "startDate",
      key: "startDate",
      title: "Start Date",
      render: (_, { startDate }) => {
        if (!startDate) return "-";

        const parsedDate = formatDateWithTimezone(startDate);

        return (
          <VStack $style={{ gap: "4px" }}>
            <Stack as="span" $style={{ lineHeight: "18px" }}>
              {`${parsedDate.date} ${parsedDate.time}`}
            </Stack>
            <Stack
              as="span"
              $style={{
                color: colors.textTertiary.toHex(),
                fontSize: "12px",
                lineHeight: "12px",
              }}
            >
              {parsedDate.timezone}
            </Stack>
          </VStack>
        );
      },
    },
    {
      align: "center",
      dataIndex: "nextPayment",
      key: "nextPayment",
      title: "Next Payment",
      render: (_, { nextPayment }) => {
        if (!nextPayment) return "-";

        const parsedDate = formatDateWithTimezone(nextPayment);

        return (
          <VStack $style={{ gap: "4px" }}>
            <Stack as="span" $style={{ lineHeight: "18px" }}>
              {`${parsedDate.date} ${parsedDate.time}`}
            </Stack>
            <Stack
              as="span"
              $style={{
                color: colors.textTertiary.toHex(),
                fontSize: "12px",
                lineHeight: "12px",
              }}
            >
              {parsedDate.timezone}
            </Stack>
          </VStack>
        );
      },
    },
    {
      align: "center",
      dataIndex: "totalFees",
      key: "totalFees",
      title: "Total Fees",
      render: (_, { totalFees }) => {
        if (!totalFees) return "-";

        // TODO: Fetch fee token and decimals dynamically
        return toValueFormat(
          formatUnits(BigInt(Math.floor(Number(totalFees) * baseValue)), 6),
          currency,
        );
      },
    },
  ];

  const fetchBillings = (skip = 0) => {
    setState((prev) => ({ ...prev, loading: true }));

    getBillings({ skip })
      .then(({ billings, total }) => {
        setState((prev) => ({
          ...prev,
          billings,
          current: skip ? Math.floor(skip / defaultPageSize) + 1 : 1,
          loading: false,
          total,
        }));
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loading: false }));
      });
  };

  const handleUninstall = () => {
    if (!feeApp || !feeAppStatus) return;

    if (feeAppStatus.balance < 0) {
      modalAPI.error({
        content: (
          <VStack $style={{ color: colors.textTertiary.toHex(), gap: "12px" }}>
            <VStack
              $style={{
                backgroundColor: colors.bgTertiary.toHex(),
                borderRadius: "12px",
                gap: "4px",
                padding: "12px",
              }}
            >
              <Stack
                as="span"
                $style={{ fontSize: "12px", lineHeight: "18px" }}
              >
                Unpaid balance
              </Stack>
              <Stack
                as="span"
                $style={{
                  color: colors.textPrimary.toHex(),
                  fontSize: "20px",
                  fontWeight: "600",
                  lineHeight: "22px",
                }}
              >
                {toValueFormat(
                  formatUnits(
                    BigInt(Math.floor(feeAppStatus.balance * baseValue * -1)),
                    6,
                  ),
                  currency,
                )}
              </Stack>
            </VStack>
            <Stack as="span">
              {`Please settle your balance before uninstalling the ${feeApp.title} plugin — installed plugins that depend on billing will stop working until it is resolved.`}
            </Stack>
          </VStack>
        ),
        maskClosable: true,
        title: `Unable to uninstall ${feeApp.title} plugin`,
        width: token.screenSM,
      });
    } else {
      const paidApps = apps.filter(({ pricing }) => pricing.length > 0);

      if (paidApps.length > 0) {
        modalAPI.confirm({
          content: (
            <VStack
              $style={{ color: colors.textTertiary.toHex(), gap: "12px" }}
            >
              <Stack as="span">
                {`Uninstalling the ${feeApp.title} plugin will disable billing services required by the following installed plugins:`}
              </Stack>
              <VStack
                $style={{
                  backgroundColor: colors.bgTertiary.toHex(),
                  borderRadius: "12px",
                  gap: "8px",
                  padding: "12px",
                }}
              >
                {paidApps.map(({ id, logoUrl, title }) => (
                  <HStack
                    key={id}
                    $style={{ alignItems: "center", gap: "8px" }}
                  >
                    <Stack
                      as="img"
                      alt={title}
                      src={logoUrl}
                      $style={{
                        borderRadius: "6px",
                        height: "24px",
                        width: "24px",
                      }}
                    />
                    <Stack
                      as="span"
                      $style={{ color: colors.textPrimary.toHex() }}
                    >
                      {title}
                    </Stack>
                  </HStack>
                ))}
              </VStack>
              <Stack as="span">
                {`These plugins may stop working until the ${feeApp.title} plugin is reinstalled.`}
              </Stack>
            </VStack>
          ),
          cancelText: "Cancel",
          okText: "Uninstall Anyway",
          okType: "danger",
          onOk: uninstallFeeApp,
          title: `Uninstall ${feeApp.title} plugin?`,
          width: token.screenSM,
        });
      } else {
        modalAPI.confirm({
          cancelText: "No",
          okText: "Yes",
          okType: "danger",
          onOk: uninstallFeeApp,
          title: `Are you sure you want to uninstall ${feeApp.title} plugin?`,
        });
      }
    }
  };

  const uninstallFeeApp = () => {
    setState((prev) => ({ ...prev, loading: true }));

    uninstallApp(feeAppId)
      .then(() => {
        messageAPI.open({
          type: "success",
          content: "Plugin successfully uninstalled",
        });

        updateFeeAppStatus();
      })
      .catch(() => {
        messageAPI.open({
          type: "error",
          content: "Plugin uninstallation failed",
        });
      })
      .finally(() => {
        setState((prev) => ({ ...prev, loading: false }));
      });
  };

  useEffect(() => {
    // TODO: Update billings API to include app icon and remove getApps API call
    getMyApps({}).then(({ apps }) => {
      setState((prev) => ({ ...prev, apps }));
    });

    fetchBillings();
  }, []);

  if (!feeApp || !feeAppStatus) return <Spin centered />;

  return (
    <VStack $style={{ alignItems: "center", flexGrow: "1", padding: "24px 0" }}>
      <VStack
        $style={{
          gap: "24px",
          maxWidth: "1200px",
          padding: "0 16px",
          width: "100%",
        }}
      >
        <HStack
          as="span"
          $style={{
            alignItems: "center",
            border: `solid 1px ${colors.borderNormal.toHex()}`,
            borderRadius: "18px",
            cursor: "pointer",
            fontSize: "12px",
            gap: "4px",
            height: "36px",
            padding: "0 12px",
            width: "fit-content",
          }}
          $hover={{ color: colors.textTertiary.toHex() }}
          onClick={() => goBack(routeTree.root.path)}
        >
          <ChevronLeftIcon fontSize={16} />
          Go back
        </HStack>
        <HStack
          $style={{
            alignItems: "center",
            backgroundColor: colors.bgTertiary.toHex(),
            borderRadius: "32px",
            gap: "16px",
            padding: "16px",
          }}
        >
          <HStack
            $style={{
              alignItems: "center",
              backgroundColor: colors.bgPrimary.toHex(),
              border: `solid 1px ${colors.borderNormal.toHex()}`,
              borderRadius: "24px",
              flexGrow: "1",
              gap: "16px",
              justifyContent: "space-between",
              padding: "24px",
            }}
          >
            <HStack $style={{ alignItems: "center", gap: "16px" }}>
              <Stack
                as="img"
                alt={feeApp.title}
                src={feeApp.logoUrl}
                $style={{ borderRadius: "12px", height: "48px", width: "48px" }}
              />
              <Stack as="span" $style={{ fontSize: "18px" }}>
                {feeApp.title}
              </Stack>
            </HStack>
            {feeAppStatus.isInstalled === undefined ? (
              <Button disabled loading>
                Checking
              </Button>
            ) : feeAppStatus.isInstalled ? (
              <Button
                disabled={loading}
                icon={<TrashIcon />}
                loading={loading}
                kind="danger"
                onClick={handleUninstall}
              >
                Uninstall
              </Button>
            ) : (
              <Button
                onClick={() => navigate(modalHash.payment, { state: true })}
              >
                Get
                <Stack
                  as="span"
                  $style={{
                    backgroundColor: colors.textPrimary.toHex(),
                    borderRadius: "50%",
                    height: "2px",
                    width: "2px",
                  }}
                />
                Free
              </Button>
            )}
          </HStack>
          <HStack $style={{ justifyContent: "center" }}>
            {[
              { label: "Created by", value: "Vultisig" },
              { label: "Version", value: "2.1.0" },
              {
                label: "Installed on",
                value: dayjs(feeApp.updatedAt).format("YYYY-MM-DD"),
              },
            ].map(({ label, value }, index) => (
              <Fragment key={index}>
                {index > 0 && <Divider vertical />}
                <VStack
                  $style={{
                    alignItems: "center",
                    gap: "12px",
                    padding: "0 40px",
                  }}
                >
                  <Stack
                    as="span"
                    $style={{
                      color: colors.textTertiary.toHex(),
                      fontSize: "13px",
                    }}
                  >
                    {label}
                  </Stack>
                  <Stack
                    as="span"
                    $style={{
                      backgroundColor: colors.accentFour.toRgba(0.1),
                      borderRadius: "4px",
                      color: colors.accentFour.toHex(),
                      fontSize: "12px",
                      lineHeight: "20px",
                      padding: "0 8px",
                    }}
                  >
                    {value}
                  </Stack>
                </VStack>
              </Fragment>
            ))}
          </HStack>
        </HStack>
        <Divider light />
        <Stack
          as="span"
          $style={{ fontSize: "22px", gap: "8px", lineHeight: "24px" }}
        >
          Billing
        </Stack>
        <Table<Billing>
          classNames={tableClassNames}
          columns={columns}
          dataSource={billings}
          loading={loading}
          onRow={({ pluginId }) => ({
            onClick: () =>
              navigate(routeTree.feeTransactions.link(pluginId), {
                state: true,
              }),
            style: { cursor: "pointer" },
          })}
          pagination={{
            current,
            onChange: (page) => fetchBillings((page - 1) * defaultPageSize),
            pageSize: defaultPageSize,
            showSizeChanger: false,
            total,
          }}
          rowKey="pluginId"
        />
      </VStack>
    </VStack>
  );
};
