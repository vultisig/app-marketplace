import { Table, TableProps } from "antd";
import dayjs from "dayjs";
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "styled-components";

import { getApps, getBillings } from "@/api/store";
import { useCore } from "@/hooks/useCore";
import { useGoBack } from "@/hooks/useGoBack";
import { ChevronLeftIcon } from "@/icons/ChevronLeftIcon";
import { Button } from "@/toolkits/Button";
import { Divider } from "@/toolkits/Divider";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { defaultPageSize, modalHash } from "@/utils/constants";
import { toValueFormat } from "@/utils/functions";
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
  const { baseValue, currency, feeApp, feeAppStatus } = useCore();
  const goBack = useGoBack();
  const navigate = useNavigate();
  const colors = useTheme();

  const columns: TableProps<Billing>["columns"] = [
    {
      dataIndex: "pluginId",
      key: "pluginId",
      title: "App Name",
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
      render: (_, { startDate }) => (
        <VStack $style={{ gap: "4px" }}>
          <Stack as="span" $style={{ lineHeight: "18px" }}>
            {dayjs(startDate).format("MMMM DD YYYY")}
          </Stack>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              fontSize: "12px",
              lineHeight: "12px",
            }}
          >
            {dayjs(startDate).format("HH:mm:ss")}
          </Stack>
        </VStack>
      ),
    },
    {
      align: "center",
      dataIndex: "nextPayment",
      key: "nextPayment",
      title: "Next Payment",
      render: (_, { nextPayment }) => {
        if (!nextPayment) return "-";

        return (
          <VStack $style={{ gap: "4px" }}>
            <Stack as="span" $style={{ lineHeight: "18px" }}>
              {dayjs(nextPayment).format("MMMM DD YYYY")}
            </Stack>
            <Stack
              as="span"
              $style={{
                color: colors.textTertiary.toHex(),
                fontSize: "12px",
                lineHeight: "12px",
              }}
            >
              {dayjs(nextPayment).format("HH:mm:ss")}
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

        const amount = Number(totalFees);
        // TODO: Fetch fee token and decimals dynamically
        const decimals = 1e-6;

        return toValueFormat(amount * decimals * baseValue, currency);
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

  useEffect(() => {
    getApps({}).then(({ apps }) => {
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
            ) : (
              !feeAppStatus.isInstalled && (
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
              )
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
          size="small"
        />
      </VStack>
    </VStack>
  );
};
