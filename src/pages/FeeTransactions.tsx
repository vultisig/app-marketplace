import { Empty, Table, TableProps } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTheme } from "styled-components";

import { useCore } from "@/hooks/useCore";
import { useGoBack } from "@/hooks/useGoBack";
import { useQueries } from "@/hooks/useQueries";
import { ChevronLeftIcon } from "@/icons/ChevronLeftIcon";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { getFeeTransactions } from "@/utils/api";
import { defaultPageSize } from "@/utils/constants";
import {
  camelCaseToTitle,
  snakeCaseToTitle,
  toValueFormat,
} from "@/utils/functions";
import { routeTree } from "@/utils/routes";
import { App, FeeTransaction } from "@/utils/types";

type StateProps = {
  app?: App;
  current: number;
  loading: boolean;
  total: number;
  transactions: FeeTransaction[];
};

export const FeeTransactionsPage = () => {
  const [state, setState] = useState<StateProps>({
    current: 1,
    loading: true,
    total: 0,
    transactions: [],
  });
  const { app, current, loading, total, transactions } = state;
  const { baseValue, currency } = useCore();
  const { id: appId = "" } = useParams();
  const { getAppData } = useQueries();
  const goBack = useGoBack();
  const colors = useTheme();

  const columns: TableProps<FeeTransaction>["columns"] = [
    {
      dataIndex: "createdAt",
      key: "createdAt",
      title: "Date",
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
      dataIndex: "transactionType",
      key: "transactionType",
      title: "Type",
      render: (_, { transactionType }) => snakeCaseToTitle(transactionType),
    },
    {
      align: "center",
      dataIndex: "status",
      key: "status",
      title: "Status",
      render: (_, { status }) =>
        status ? camelCaseToTitle(status.toLowerCase()) : "-",
    },
    {
      align: "center",
      dataIndex: "amount",
      key: "amount",
      title: "Amount",
      render: (_, { amount }) => {
        if (!amount) return "-";
        
        return toValueFormat(Number(amount) * baseValue, currency);
      },
    },
  ];

  const fetchTransactions = useCallback(
    (skip = 0) => {
      setState((prevState) => ({ ...prevState, loading: true }));

      getFeeTransactions({ appId, skip })
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
    },
    [appId]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    getAppData(appId)
      .then((app) => {
        setState((prev) => ({ ...prev, app }));
      })
      .catch(() => goBack(routeTree.root.path));
  }, [appId]);

  if (!app) return <Spin centered />;

  return (
    <>
      <VStack
        $style={{ alignItems: "center", flexGrow: "1", padding: "24px 0" }}
      >
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
            onClick={() => goBack(routeTree.billing.path)}
          >
            <ChevronLeftIcon fontSize={16} />
            Billing
          </HStack>
          <HStack $style={{ alignItems: "center", gap: "12px" }}>
            <Stack
              as="img"
              alt={app.title}
              src={app.logoUrl}
              $style={{ borderRadius: "12px", height: "32px", width: "32px" }}
            />
            <Stack as="span" $style={{ fontSize: "22px" }}>
              {`${app.title} Billing`}
            </Stack>
          </HStack>
          <Table<FeeTransaction>
            columns={columns}
            dataSource={transactions}
            loading={loading}
            locale={{ emptyText: <Empty description="No Data" /> }}
            pagination={{
              current,
              onChange: (page) =>
                fetchTransactions((page - 1) * defaultPageSize),
              pageSize: defaultPageSize,
              showSizeChanger: false,
              total,
            }}
            rowKey="id"
            size="small"
          />
        </VStack>
      </VStack>
    </>
  );
};
