import { Anchor, Collapse, Tooltip } from "antd";
import dayjs from "dayjs";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTheme } from "styled-components";

import { getRecipeSpecification, isAppInstalled } from "@/api/store";
import { AppImages } from "@/components/AppImages";
import { RecurringSendsImages } from "@/components/appImages/RecurringSends";
import { RecurringSwapsImages } from "@/components/appImages/RecurringSwaps";
import { AppReviews } from "@/components/AppReviews";
import { FreeTrialBanner } from "@/components/FreeTrialBanner";
import { StatusModal } from "@/components/StatusModal";
import { useAntd } from "@/hooks/useAntd";
import { useCore } from "@/hooks/useCore";
import { useGoBack } from "@/hooks/useGoBack";
import { useQueries } from "@/hooks/useQueries";
import { ChevronLeftIcon } from "@/icons/ChevronLeftIcon";
import { CircleArrowDownIcon } from "@/icons/CircleArrowDownIcon";
import { CircleCheckIcon } from "@/icons/CircleCheckIcon";
import { CircleInfoIcon } from "@/icons/CircleInfoIcon";
import { ShieldCheckIcon } from "@/icons/ShieldCheckIcon";
import { StarIcon } from "@/icons/StarIcon";
import { SubscriptionTickIcon } from "@/icons/SubscriptionTickIcon";
import { Button } from "@/toolkits/Button";
import { Divider } from "@/toolkits/Divider";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import {
  feeAppId,
  modalHash,
  recurringSendsAppId,
  recurringSwapsAppId,
} from "@/utils/constants";
import { startReshareSession } from "@/utils/extension";
import {
  pricingText,
  snakeCaseToTitle,
  toNumberFormat,
} from "@/utils/functions";
import { routeTree } from "@/utils/routes";
import { App, RecipeSchema } from "@/utils/types";

type StateProps = {
  app?: App;
  isInstalled?: boolean;
  loading?: boolean;
  schema?: RecipeSchema;
};

export const AppPage = () => {
  const [state, setState] = useState<StateProps>({});
  const { app, isInstalled, loading, schema } = state;
  const { messageAPI } = useAntd();
  const { baseValue, connect, currency, feeAppStatus, vault } = useCore();
  const { hash } = useLocation();
  const { id = "" } = useParams();
  const { getAppData } = useQueries();
  const goBack = useGoBack();
  const navigate = useNavigate();
  const colors = useTheme();
  const isFree = app && !app.pricing.length;
  const isFeeAppInstalled =
    feeAppStatus?.isInstalled || feeAppStatus?.isTrialActive;
  const permissions = schema?.permissions || [];

  const checkStatus = useCallback(async () => {
    if (isFree === undefined || isFeeAppInstalled === undefined) return;

    let isInstalled = false;

    if (isFree || isFeeAppInstalled) isInstalled = await isAppInstalled(id);

    setState((prevState) => ({ ...prevState, isInstalled }));
  }, [id, isFeeAppInstalled, isFree]);

  const fetchApp = useCallback(async () => {
    getAppData(id, true)
      .then((app) => {
        if (schema) {
          setState((prevState) => ({ ...prevState, app }));
        } else {
          getRecipeSpecification(app.id)
            .catch(() => undefined)
            .then((schema) => {
              setState((prevState) => ({ ...prevState, app, schema }));
            });
        }
      })
      .catch(() => goBack(routeTree.root.path));
  }, [id, schema]);

  const handleInstall = async () => {
    if (loading || !vault) return;

    setState((prevState) => ({ ...prevState, loading: true }));

    const isInstalled = await startReshareSession(id, vault.data);
    if (isInstalled) {
      setState((prevState) => ({
        ...prevState,
        isInstalled: true,
        loading: false,
      }));

      navigate(modalHash.success);
    } else {
      setState((prevState) => ({ ...prevState, loading: false }));

      messageAPI.open({
        type: "error",
        content: "Plugin installation failed",
      });
    }
  };

  useEffect(() => {
    if (!vault) {
      setState((prevState) => ({ ...prevState, isInstalled: undefined }));
    } else {
      checkStatus();
    }
  }, [checkStatus, vault]);

  useEffect(() => {
    if (id === feeAppId) {
      goBack(routeTree.root.path);
      return;
    }

    fetchApp();
  }, [id]);

  if (!app) return <Spin centered />;

  return (
    <>
      <VStack $style={{ alignItems: "center", flexGrow: "1" }}>
        <VStack
          $style={{
            gap: "32px",
            maxWidth: "1200px",
            padding: "0 16px",
            width: "100%",
          }}
          $media={{ xl: { $style: { flexDirection: "row" } } }}
        >
          <VStack
            $style={{ gap: "32px", overflow: "hidden", paddingTop: "24px" }}
            $media={{
              xl: { $style: { flexGrow: "1", paddingBottom: "24px" } },
            }}
          >
            <VStack $style={{ gap: "24px" }}>
              <FreeTrialBanner />
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
            </VStack>
            <VStack
              $style={{
                backgroundColor: colors.bgTertiary.toHex(),
                borderRadius: "32px",
                gap: "16px",
                padding: "16px",
              }}
            >
              <VStack
                $style={{
                  backgroundColor: colors.bgPrimary.toHex(),
                  border: `solid 1px ${colors.borderNormal.toHex()}`,
                  borderRadius: "24px",
                  gap: "16px",
                  padding: "24px",
                }}
              >
                <HStack
                  $style={{
                    alignItems: "center",
                    gap: "16px",
                    justifyContent: "space-between",
                  }}
                >
                  <HStack $style={{ alignItems: "center", gap: "16px" }}>
                    <Stack
                      as="img"
                      alt={app.title}
                      src={app.logoUrl}
                      $style={{
                        borderRadius: "16px",
                        height: "72px",
                        width: "72px",
                      }}
                    />
                    <VStack $style={{ gap: "8px", justifyContent: "center" }}>
                      <Stack
                        as="span"
                        $style={{ fontSize: "22px", lineHeight: "24px" }}
                      >
                        {app.title}
                      </Stack>
                      <HStack $style={{ alignItems: "center", gap: "8px" }}>
                        <HStack $style={{ alignItems: "center", gap: "2px" }}>
                          <Stack
                            as={CircleArrowDownIcon}
                            $style={{
                              color: colors.textTertiary.toHex(),
                              fontSize: "16px",
                            }}
                          />
                          <Stack
                            as="span"
                            $style={{
                              color: colors.textTertiary.toHex(),
                              lineHeight: "20px",
                            }}
                          >
                            {toNumberFormat(app.installations)}
                          </Stack>
                        </HStack>
                        <Stack
                          $style={{
                            backgroundColor: colors.borderLight.toHex(),
                            height: "3px",
                            width: "3px",
                          }}
                        />
                        <HStack $style={{ alignItems: "center", gap: "2px" }}>
                          <Stack
                            as={StarIcon}
                            $style={{
                              color: colors.warning.toHex(),
                              fill: colors.warning.toHex(),
                              fontSize: "16px",
                            }}
                          />
                          <Stack
                            as="span"
                            $style={{
                              color: colors.textTertiary.toHex(),
                              lineHeight: "20px",
                            }}
                          >
                            {app.ratesCount
                              ? `${app.avgRating}/5 (${app.ratesCount})`
                              : "No Rating yet"}
                          </Stack>
                        </HStack>
                      </HStack>
                    </VStack>
                  </HStack>
                  <VStack
                    $style={{
                      alignItems: "center",
                      color: colors.textTertiary.toHex(),
                      gap: "12px",
                    }}
                  >
                    {!vault ? (
                      <Button onClick={connect}>Connect</Button>
                    ) : isInstalled === undefined ||
                      isFeeAppInstalled === undefined ? (
                      <Button disabled loading>
                        Checking
                      </Button>
                    ) : !isFree && !isFeeAppInstalled ? (
                      // TODO: Replace hard‑coded "Get · Free" with dynamic pricing
                      <Button href={modalHash.payment} loading={loading}>
                        Get
                        <Stack
                          as="span"
                          $style={{
                            backgroundColor: "currentColor",
                            borderRadius: "50%",
                            height: "2px",
                            width: "2px",
                          }}
                        />
                        Free
                      </Button>
                    ) : isInstalled ? (
                      <Button
                        disabled={loading || !schema}
                        href={routeTree.automations.link(id)}
                        state={true}
                      >
                        Automations
                      </Button>
                    ) : (
                      <Button loading={loading} onClick={handleInstall}>
                        Get
                        <Stack
                          as="span"
                          $style={{
                            backgroundColor: "currentColor",
                            borderRadius: "50%",
                            height: "2px",
                            width: "2px",
                          }}
                        />
                        Free
                      </Button>
                    )}
                    <VStack
                      as="span"
                      $style={{
                        alignItems: "center",
                        color: colors.textSecondary.toHex(),
                        flexGrow: "1",
                        fontSize: "12px",
                      }}
                    >
                      {isFree ? (
                        <Stack as="span">This plugin is free</Stack>
                      ) : (
                        app.pricing.map(
                          ({ amount, frequency, type }, index) => (
                            <Stack as="span" key={index}>
                              {pricingText({
                                amount,
                                baseValue,
                                currency,
                                frequency,
                                type,
                              })}
                            </Stack>
                          ),
                        )
                      )}
                    </VStack>
                  </VStack>
                </HStack>
              </VStack>
              <HStack $style={{ justifyContent: "center", gap: "56px" }}>
                {[
                  {
                    href: `${routeTree.root.path}?categoryId=${app.categoryId}`,
                    label: "Category",
                    value: snakeCaseToTitle(app.categoryId),
                  },
                  { label: "Created By", value: "Vultisig" },
                  { label: "Version", value: "2.1.0" },
                  {
                    label: "Last Update",
                    value: dayjs(app.updatedAt).format("YYYY-MM-DD"),
                  },
                ].map(({ href, label, value }, index) => (
                  <Fragment key={index}>
                    {index > 0 && <Divider vertical />}
                    <VStack $style={{ alignItems: "center", gap: "12px" }}>
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
                        as={href ? Link : "span"}
                        $style={{
                          backgroundColor: colors.accentFour.toRgba(0.1),
                          borderRadius: "4px",
                          color: colors.accentFour.toHex(),
                          fontSize: "12px",
                          lineHeight: "20px",
                          padding: "0 8px",
                          ...(href ? { cursor: "pointer" } : {}),
                        }}
                        {...(href
                          ? {
                              to: href,
                              $hover: {
                                backgroundColor: colors.accentFour.toRgba(0.2),
                              },
                            }
                          : {})}
                      >
                        {value}
                      </Stack>
                    </VStack>
                  </Fragment>
                ))}
              </HStack>
            </VStack>
            <Stack
              as={Anchor}
              direction="horizontal"
              items={[
                { key: "#overview", label: "Overview" },
                { key: "#features", label: "Features" },
                { key: "#faq", label: "FAQ" },
                { key: "#informations", label: "Usage Info" },
                { key: "#reviews", label: "Reviews & Ratings" },
              ].map(({ key, label }) => ({
                key,
                href: key,
                title: (
                  <HStack
                    as="span"
                    $style={{
                      display: "block",
                      fontSize: "14px",
                      lineHeight: "52px",
                      padding: "0 16px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </HStack>
                ),
              }))}
              offsetTop={77}
              targetOffset={158}
              $style={{ backgroundColor: colors.bgPrimary.toHex() }}
            />
            <Stack id="overview">{app.description}</Stack>
            {app.images.length > 0 ? (
              <AppImages images={app.images} />
            ) : (
              <>
                {app.id === recurringSendsAppId && <RecurringSendsImages />}
                {app.id === recurringSwapsAppId && <RecurringSwapsImages />}
              </>
            )}
            <Divider light />
            <VStack id="features" $style={{ gap: "24px" }}>
              <Stack
                as="span"
                $style={{ fontSize: "18px", lineHeight: "28px" }}
              >
                Features
              </Stack>
              <VStack $style={{ gap: "8px" }}>
                {app.features.map((item, index) => (
                  <Fragment key={index}>
                    {index > 0 && <Divider light />}
                    <HStack $style={{ alignItems: "center", gap: "8px" }}>
                      <Stack
                        as={CircleCheckIcon}
                        $style={{
                          color: colors.success.toHex(),
                          fontSize: "24px",
                        }}
                      />
                      <Stack as="span" $style={{ fontSize: "14px" }}>
                        {item}
                      </Stack>
                    </HStack>
                  </Fragment>
                ))}
              </VStack>
            </VStack>
            <Divider light />
            {app.faqs.length > 0 && (
              <>
                <VStack id="faq" $style={{ gap: "24px" }}>
                  <Stack
                    as="span"
                    $style={{ fontSize: "18px", lineHeight: "28px" }}
                  >
                    FAQ
                  </Stack>
                  <VStack $style={{ gap: "16px" }}>
                    {app.faqs.map(({ answer, question }, index) => (
                      <Fragment key={index}>
                        {index > 0 && <Divider light />}
                        <Collapse
                          bordered={false}
                          items={[
                            {
                              key: "1",
                              label: question,
                              children: (
                                <Stack
                                  dangerouslySetInnerHTML={{ __html: answer }}
                                />
                              ),
                            },
                          ]}
                          expandIconPlacement="end"
                          ghost
                        />
                      </Fragment>
                    ))}
                  </VStack>
                </VStack>
                <Divider light />
              </>
            )}
            <VStack id="informations" $style={{ gap: "24px" }}>
              <Stack
                as="span"
                $style={{ fontSize: "18px", lineHeight: "28px" }}
              >
                Usage Info
              </Stack>
              <VStack $style={{ gap: "16px" }}>
                {[
                  {
                    label: "Fee Structure",
                    value: (
                      <>
                        {isFree
                          ? "This plugin is free"
                          : app.pricing.map(
                              ({ amount, frequency, type }, index) => (
                                <Stack as="span" key={index}>
                                  {pricingText({
                                    amount,
                                    baseValue,
                                    currency,
                                    frequency,
                                    type,
                                  })}
                                </Stack>
                              ),
                            )}
                      </>
                    ),
                  },
                  { label: "Downloads", value: app?.installations || 0 },
                  { label: "Support", value: "24/7" },
                ].map(({ label, value }, index) => (
                  <HStack
                    key={index}
                    $style={{ justifyContent: "space-between" }}
                  >
                    <Stack
                      $style={{
                        color: colors.textTertiary.toHex(),
                        fontSize: "13px",
                        lineHeight: "18px",
                      }}
                    >
                      {label}
                    </Stack>
                    <VStack
                      $style={{
                        alignItems: "flex-end",
                        fontSize: "14px",
                        lineHeight: "18px",
                      }}
                    >
                      {value}
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </VStack>
            <Divider light />
            <AppReviews app={app} onReload={fetchApp} />
          </VStack>
          {(!!permissions.length || app.audited) && (
            <>
              <Stack
                as="span"
                $style={{
                  backgroundColor: colors.borderLight.toHex(),
                  height: "1px",
                }}
                $media={{ xl: { $style: { height: "auto", width: "1px" } } }}
              />
              <VStack
                $style={{ paddingBottom: "24px" }}
                $media={{
                  xl: {
                    $style: {
                      flex: "none",
                      paddingTop: "84px",
                      width: "322px",
                    },
                  },
                }}
              >
                <VStack
                  $style={{ gap: "20px" }}
                  $media={{
                    xl: { $style: { position: "sticky", top: "136px" } },
                  }}
                >
                  {permissions.length > 0 && (
                    <VStack
                      $style={{
                        border: `solid 1px ${colors.borderNormal.toHex()}`,
                        borderRadius: "24px",
                        gap: "12px",
                        padding: "32px",
                      }}
                    >
                      <Stack
                        as="span"
                        $style={{ fontSize: "16px", lineHeight: "24px" }}
                      >
                        Plugin Permissions
                      </Stack>
                      {permissions.map(({ id, label, description }) => (
                        <HStack
                          key={id}
                          $style={{ alignItems: "center", gap: "8px" }}
                        >
                          <Stack
                            as={ShieldCheckIcon}
                            $style={{
                              color: colors.warning.toHex(),
                              flex: "none",
                              fontSize: "16px",
                            }}
                          />
                          <Stack
                            as="span"
                            $style={{
                              color: colors.textSecondary.toHex(),
                              lineHeight: "16px",
                            }}
                          >
                            {label}
                          </Stack>
                          <Tooltip title={description}>
                            <HStack
                              as="span"
                              $style={{
                                color: colors.textTertiary.toHex(),
                                cursor: "pointer",
                                fontSize: "16px",
                              }}
                            >
                              <CircleInfoIcon />
                            </HStack>
                          </Tooltip>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                  {app.audited && (
                    <VStack
                      $style={{
                        border: `solid 1px ${colors.borderNormal.toHex()}`,
                        borderRadius: "24px",
                        gap: "12px",
                        padding: "32px",
                      }}
                    >
                      <Stack
                        as="span"
                        $style={{ fontSize: "16px", lineHeight: "24px" }}
                      >
                        Audit
                      </Stack>
                      <HStack $style={{ gap: "8px" }}>
                        <Stack
                          as={SubscriptionTickIcon}
                          $style={{
                            color: colors.success.toHex(),
                            flex: "none",
                            fontSize: "16px",
                          }}
                        />
                        <Stack
                          as="span"
                          $style={{
                            color: colors.textSecondary.toHex(),
                            lineHeight: "16px",
                          }}
                        >
                          Fully audited
                        </Stack>
                      </HStack>
                    </VStack>
                  )}
                </VStack>
              </VStack>
            </>
          )}
        </VStack>
      </VStack>

      <StatusModal
        onClose={() => goBack()}
        open={hash === modalHash.success && isInstalled}
        success
      >
        <Stack as="span" $style={{ fontSize: "22px", lineHeight: "24px" }}>
          Installation Successful
        </Stack>
        <VStack $style={{ alignItems: "center", gap: "4px" }}>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              lineHeight: "18px",
            }}
          >
            {`${app.title} plugin was successfully installed.`}
          </Stack>
          <Stack
            as="span"
            $style={{
              color: colors.textTertiary.toHex(),
              lineHeight: "18px",
            }}
          >
            You can now create plugin automations.
          </Stack>
        </VStack>
        <HStack $style={{ gap: "12px", marginTop: "12px" }}>
          <Button
            onClick={() => {
              goBack();

              navigate(routeTree.automations.link(id), { state: true });
            }}
          >
            Create Automation
          </Button>
          <Button
            onClick={() => {
              goBack();

              navigate(routeTree.myApps.path, { state: true });
            }}
            kind="secondary"
          >
            My plugins
          </Button>
        </HStack>
      </StatusModal>
    </>
  );
};
