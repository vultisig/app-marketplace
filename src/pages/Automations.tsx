import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "styled-components";

import { AutomationForm } from "@/automations/Default";
import { RecurringSendsForm } from "@/automations/RecurringSends";
import { RecurringSwapsForm } from "@/automations/RecurringSwaps";
import { AppReportModal } from "@/components/AppReportModal";
import { useAntd } from "@/hooks/useAntd";
import { useGoBack } from "@/hooks/useGoBack";
import { useQueries } from "@/hooks/useQueries";
import { TriangleExclamationIcon } from "@/icons/TriangleExclamationIcon";
import { ChevronLeftIcon } from "@/icons/ChevronLeftIcon";
import { CirclePlusIcon } from "@/icons/CirclePlusIcon";
import { TrashIcon } from "@/icons/TrashIcon";
import { Button } from "@/toolkits/Button";
import { Divider } from "@/toolkits/Divider";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { getRecipeSpecification, uninstallApp } from "@/utils/api";
import {
  modalHash,
  recurringSendsAppId,
  recurringSwapsAppId,
} from "@/utils/constants";
import { routeTree } from "@/utils/routes";
import { App, RecipeSchema } from "@/utils/types";
import { Dropdown, MenuProps } from "antd";
import { DotGridVerticalIcon } from "@/icons/DotGridVerticalIcon";

type StateProps = {
  app?: App;
  loading?: boolean;
  schema?: RecipeSchema;
};

export const AutomationsPage = () => {
  const [state, setState] = useState<StateProps>({});
  const { app, loading, schema } = state;
  const { messageAPI, modalAPI } = useAntd();
  const { id = "" } = useParams();
  const { getAppData } = useQueries();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const colors = useTheme();

  const items: MenuProps["items"] = [
    {
      icon: <TriangleExclamationIcon stroke={colors.error.toHex()} />,
      key: "1",
      label: (
        <HStack as="span" $style={{ color: colors.error.toHex() }}>
          Report Plugin
        </HStack>
      ),
      onClick: () => {
        navigate(modalHash.report, { state: true });
      },
    },
  ];

  const handleUninstall = () => {
    modalAPI.confirm({
      title: "Are you sure you want to uninstall this app?",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        setState((prev) => ({ ...prev, loading: true }));

        uninstallApp(id)
          .then(() => {
            messageAPI.open({
              type: "success",
              content: "App successfully uninstalled",
            });

            navigate(routeTree.myApps.path, { replace: true });
          })
          .catch(() => {
            messageAPI.open({
              type: "error",
              content: "App uninstallation failed",
            });

            setState((prev) => ({ ...prev, loading: false }));
          });
      },
    });
  };

  useEffect(() => {
    Promise.all([getAppData(id), getRecipeSpecification(id)])
      .then(([app, schema]) => setState((prev) => ({ ...prev, app, schema })))
      .catch(() => goBack(routeTree.root.path));
  }, [id]);

  if (!app || !schema) return <Spin centered />;

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
            onClick={() => goBack()}
          >
            <ChevronLeftIcon fontSize={16} />
            Go back
          </HStack>
          <HStack $style={{ gap: "32px", justifyContent: "space-between" }}>
            <HStack $style={{ alignItems: "center", gap: "12px" }}>
              <Stack
                as="img"
                alt={app.title}
                src={app.logoUrl}
                $style={{ borderRadius: "12px", height: "32px", width: "32px" }}
              />
              <Stack as="span" $style={{ fontSize: "22px" }}>
                {app.title}
              </Stack>
            </HStack>
            <Dropdown menu={{ items }} placement="bottomRight">
              <HStack
                as="span"
                $style={{
                  backgroundColor: colors.bgTertiary.toHex(),
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "12px",
                }}
              >
                <DotGridVerticalIcon />
              </HStack>
            </Dropdown>
          </HStack>
          <Divider light />
          <VStack $style={{ alignItems: "flex-start", gap: "16px" }}>
            <Stack
              as="span"
              $style={{ color: colors.textTertiary.toHex(), fontSize: "12px" }}
            >
              Quick actions
            </Stack>
            <HStack $style={{ gap: "16px" }}>
              <Button
                disabled={loading}
                href={modalHash.automation}
                icon={<CirclePlusIcon />}
                loading={loading}
                state={true}
              >
                Add Automation
              </Button>
              <Button
                disabled={loading}
                icon={<TrashIcon />}
                loading={loading}
                kind="danger"
                onClick={handleUninstall}
              >
                Uninstall App
              </Button>
            </HStack>
          </VStack>

          {id === recurringSwapsAppId ? (
            <RecurringSwapsForm app={app} schema={schema} />
          ) : id === recurringSendsAppId ? (
            <RecurringSendsForm app={app} schema={schema} />
          ) : (
            <AutomationForm app={app} schema={schema} />
          )}
        </VStack>
      </VStack>

      <AppReportModal />
    </>
  );
};
