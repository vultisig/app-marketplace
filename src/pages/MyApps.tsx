import { Empty } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "styled-components";

import { getMyApps } from "@/api/store";
import { ChevronRightIcon } from "@/icons/ChevronRightIcon";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { routeTree } from "@/utils/routes";
import { App } from "@/utils/types";

type StateProps = { loading: boolean; apps: App[] };

export const MyAppsPage = () => {
  const [state, setState] = useState<StateProps>({ loading: true, apps: [] });
  const { loading, apps } = state;
  const colors = useTheme();

  useEffect(() => {
    getMyApps({})
      .then(({ apps }) => {
        setState((prev) => ({ ...prev, loading: false, apps }));
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loading: false }));
      });
  }, []);

  return (
    <VStack $style={{ alignItems: "center", flexGrow: "1", padding: "48px 0" }}>
      <VStack
        $style={{
          gap: "32px",
          maxWidth: "768px",
          padding: "0 16px",
          width: "100%",
        }}
      >
        <HStack
          as="span"
          $style={{ fontSize: "22px", gap: "8px", lineHeight: "24px" }}
        >
          <Stack as="span">Installed Plugins</Stack>
          <Stack
            as="span"
            $style={{ color: colors.textTertiary.toHex() }}
          >{`(${apps.length})`}</Stack>
        </HStack>
        {loading ? (
          <Spin />
        ) : !apps.length ? (
          <Empty />
        ) : (
          <VStack $style={{ gap: "16px" }}>
            {apps.map((app) => (
              <HStack
                as={Link}
                key={app.id}
                state={true}
                to={routeTree.automations.link(app.id)}
                $style={{
                  alignItems: "center",
                  border: `1px solid ${colors.borderLight.toHex()}`,
                  borderRadius: "24px",
                  gap: "16px",
                  justifyContent: "space-between",
                  padding: "16px",
                }}
              >
                <HStack $style={{ alignItems: "center", gap: "16px" }}>
                  <Stack
                    as="img"
                    alt={app.title}
                    src={app.logoUrl}
                    $style={{
                      borderRadius: "12px",
                      display: "block",
                      height: "56px",
                      width: "56px",
                    }}
                  />
                  <VStack
                    $style={{
                      alignItems: "flex-start",
                      gap: "4px",
                      justifyContent: "center",
                    }}
                  >
                    <Stack $style={{ fontSize: "17px", lineHeight: "20px" }}>
                      {app.title}
                    </Stack>
                    <Stack
                      as="span"
                      $style={{
                        color: colors.textTertiary.toHex(),
                        lineHeight: "20px",
                      }}
                    >
                      {app.description}
                    </Stack>
                  </VStack>
                </HStack>
                <Stack
                  as={ChevronRightIcon}
                  $style={{ flex: "none", fontSize: "16px" }}
                />
              </HStack>
            ))}
          </VStack>
        )}
        <VStack $style={{ alignItems: "center" }}>
          <Stack
            as={Link}
            to={routeTree.root.path}
            $style={{
              borderColor: colors.accentFour.toHex(),
              borderStyle: "solid",
              borderWidth: "1px",
              borderRadius: "24px",
              lineHeight: "46px",
              padding: "0 24px",
            }}
            $hover={{ color: colors.accentFour.toHex() }}
          >
            Discover more plugins
          </Stack>
        </VStack>
      </VStack>
    </VStack>
  );
};
