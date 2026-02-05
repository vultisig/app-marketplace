import { Empty } from "antd";
import { debounce } from "lodash-es";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "styled-components";

import { getApps, getCategories } from "@/api/store";
import { AppItem } from "@/components/AppItem";
import { FreeTrialBanner } from "@/components/FreeTrialBanner";
import { useFilterParams } from "@/hooks/useFilterParams";
import { Divider } from "@/toolkits/Divider";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { App, AppFilters, Category } from "@/utils/types";

type StateProps = {
  categories: Category[];
  loading: boolean;
  apps: App[];
};

export const MainPage = () => {
  const [state, setState] = useState<StateProps>({
    categories: [],
    loading: true,
    apps: [],
  });
  const { categories, loading, apps } = state;
  const { filters, setFilters } = useFilterParams<AppFilters>();
  const colors = useTheme();
  const [newApp] = apps;

  const fetchApps = useCallback((skip: number, filters: AppFilters) => {
    setState((prevState) => ({ ...prevState, loading: true }));

    getApps({ ...filters, skip }).then(({ apps }) => {
      setState((prevState) => ({ ...prevState, loading: false, apps }));
    });
  }, []);

  const debouncedFetchApps = useMemo(
    () => debounce(fetchApps, 500),
    [fetchApps]
  );

  useEffect(
    () => debouncedFetchApps(0, filters),
    [debouncedFetchApps, filters]
  );

  useEffect(() => {
    getCategories()
      .catch(() => [])
      .then((categories) => {
        setState((prevState) => ({ ...prevState, categories }));
      });
  }, []);

  return (
    <VStack $style={{ alignItems: "center", flexGrow: "1" }}>
      <VStack
        $style={{
          gap: "48px",
          maxWidth: "1200px",
          padding: "16px",
          width: "100%",
        }}
      >
        <VStack $style={{ gap: "16px" }}>
          <FreeTrialBanner />
          <Stack
            $style={{
              backgroundImage: "url(/images/mainbanner.jpg)",
              backgroundPosition: "center center",
              backgroundSize: "cover",
              borderRadius: "16px",
              height: "336px",
            }}
          />
        </VStack>
        <VStack $style={{ flexGrow: "1", gap: "32px" }}>
          <VStack $style={{ gap: "24px" }}>
            <Stack as="span" $style={{ fontSize: "40px", lineHeight: "42px" }}>
              Discover Plugins
            </Stack>
            <Divider light />
            <HStack $style={{ flexGrow: "1", gap: "12px" }}>
              {categories.map(({ id, name }) => {
                const isActive =
                  (!id && !filters.categoryId) || id === filters.categoryId;

                return (
                  <VStack
                    as="span"
                    key={id}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        categoryId: isActive ? "" : id,
                      })
                    }
                    $hover={{
                      backgroundColor: colors.bgTertiary.toHex(),
                      color: colors.buttonText.toHex(),
                    }}
                    $style={{
                      alignItems: "center",
                      backgroundColor: isActive
                        ? colors.bgTertiary.toHex()
                        : colors.bgSecondary.toHex(),
                      border: `solid 1px ${colors.borderNormal.toHex()}`,
                      borderRadius: "8px",
                      color: colors.textPrimary.toHex(),
                      cursor: "pointer",
                      fontSize: "12px",
                      gap: "8px",
                      justifyContent: "center",
                      height: "40px",
                      padding: "0 24px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {name}
                  </VStack>
                );
              })}
            </HStack>
          </VStack>

          {loading ? (
            <Spin centered />
          ) : apps.length ? (
            <>
              {!!newApp && (
                <VStack $style={{ flexDirection: "column", gap: "16px" }}>
                  <Stack
                    as="span"
                    $style={{ fontSize: "17px", lineHeight: "20px" }}
                  >
                    New
                  </Stack>
                  <AppItem {...newApp} horizontal />
                </VStack>
              )}
              <VStack $style={{ flexDirection: "column", gap: "16px" }}>
                <Stack
                  as="span"
                  $style={{ fontSize: "17px", lineHeight: "20px" }}
                >
                  All Plugins
                </Stack>
                <Stack
                  $style={{
                    display: "grid",
                    gap: "32px",
                    gridTemplateColumns: "repeat(2, 1fr)",
                  }}
                  $media={{
                    xl: { $style: { gridTemplateColumns: "repeat(3, 1fr)" } },
                  }}
                >
                  {apps.map((app) => (
                    <AppItem key={app.id} {...app} />
                  ))}
                </Stack>
              </VStack>
            </>
          ) : (
            <Empty />
          )}
        </VStack>
      </VStack>
    </VStack>
  );
};
