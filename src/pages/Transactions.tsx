import { Empty, Table, TableProps } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTheme } from "styled-components";

import { AutomationAmount } from "@/automations/components/Amount";
import { AutomationToken } from "@/automations/components/Token";
import { useGoBack } from "@/hooks/useGoBack";
import { ChevronLeftIcon } from "@/icons/ChevronLeftIcon";
import { EyeOpenIcon } from "@/icons/EyeOpenIcon";
import { Button } from "@/toolkits/Button";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { getApps, getTransactions } from "@/utils/api";
import { defaultPageSize } from "@/utils/constants";
import { camelCaseToTitle, getExplorerUrl } from "@/utils/functions";
import { routeTree } from "@/utils/routes";
import { App, Transaction } from "@/utils/types";

type StateProps = {
  apps: App[];
  current: number;
  loading: boolean;
  total: number;
  transactions: Transaction[];
};

export const TransactionsPage = () => {
  const [state, setState] = useState<StateProps>({
    apps: [],
    current: 1,
    loading: true,
    total: 0,
    transactions: [],
  });
  const { apps, current, loading, total, transactions } = state;
  const goBack = useGoBack();
  const colors = useTheme();

  const columns: TableProps<Transaction>["columns"] = [
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
      dataIndex: "tokenId",
      key: "tokenId",
      title: "Token",
      render: (_, { chain, tokenId }) => {
        return <AutomationToken chain={chain} id={tokenId} />;
      },
    },
    {
      align: "center",
      dataIndex: "amount",
      key: "amount",
      title: "Amount",
      render: (_, { amount, chain, tokenId }) => {
        if (!amount) return "-";

        return (
          <AutomationAmount amount={amount} chain={chain} tokenId={tokenId} />
        );
      },
    },
    {
      align: "center",
      dataIndex: "createdAt",
      key: "createdAt",
      title: "Created At",
      render: (_, { createdAt }) => (
        <VStack $style={{ gap: "4px" }}>
          <Stack as="span" $style={{ lineHeight: "18px" }}>
            {dayjs(createdAt).format("MMMM DD YYYY")}
          </Stack>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              fontSize: "12px",
              lineHeight: "12px",
            }}
          >
            {dayjs(createdAt).format("HH:mm:ss")}
          </Stack>
        </VStack>
      ),
    },
    {
      align: "center",
      dataIndex: "statusOnchain",
      key: "statusOnchain",
      title: "Status",
      render: (_, { statusOnchain }) => {
        if (!statusOnchain) return "-";

        const color =
          statusOnchain === "SUCCESS"
            ? colors.success
            : statusOnchain === "PENDING"
            ? colors.warning
            : colors.error;

        return (
          <HStack $style={{ justifyContent: "center" }}>
            <Stack
              as="span"
              $style={{
                backgroundColor: color.toRgba(0.1),
                borderRadius: "4px",
                color: color.toHex(),
                fontSize: "12px",
                lineHeight: "20px",
                padding: "0 8px",
              }}
            >
              {camelCaseToTitle(statusOnchain.toLowerCase())}
            </Stack>
          </HStack>
        );
      },
    },
    {
      align: "center",
      dataIndex: "txHash",
      key: "txHash",
      title: "",
      render: (_, { chain, txHash }) => {
        if (!txHash) return null;

        const explorerUrl = getExplorerUrl(chain, "tx", txHash);

        return (
          <Button
            href={explorerUrl}
            icon={<EyeOpenIcon />}
            kind="info"
            target="_blank"
            ghost
          />
        );
      },
    },
  ];

  const fetchTransactions = (skip = 0) => {
    setState((prevState) => ({ ...prevState, loading: true }));

    getTransactions({ skip })
      .then(({ transactions, total }) => {
        setState((prevState) => ({
          ...prevState,
          current: skip ? Math.floor(skip / defaultPageSize) + 1 : 1,
          loading: false,
          total,
          transactions,
        }));
      })
      .catch(() => {
        setState((prevState) => ({ ...prevState, loading: false }));
      });
  };

  useEffect(() => {
    getApps({}).then(({ apps }) => {
      setState((prevState) => ({ ...prevState, apps }));
    });

    fetchTransactions();
  }, []);

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
          Go Back
        </HStack>
        <Stack
          as="span"
          $style={{ fontSize: "22px", gap: "8px", lineHeight: "24px" }}
        >
          Transaction History
        </Stack>
        <Table<Transaction>
          columns={columns}
          dataSource={transactions}
          loading={loading}
          locale={{ emptyText: <Empty description="No Data" /> }}
          pagination={{
            current,
            onChange: (page) => fetchTransactions((page - 1) * defaultPageSize),
            pageSize: defaultPageSize,
            showSizeChanger: false,
            total,
          }}
          rowKey="id"
          size="small"
        />
      </VStack>
    </VStack>
  );
};
