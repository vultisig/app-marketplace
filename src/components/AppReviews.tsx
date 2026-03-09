import { Form, FormProps, Input, Modal } from "antd";
import dayjs from "dayjs";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "styled-components";

import { addReview, getReviews } from "@/api/store";
import { MiddleTruncate } from "@/components/MiddleTruncate";
import { useApp } from "@/hooks/useApp";
import { useGoBack } from "@/hooks/useGoBack";
import { StarIcon } from "@/icons/StarIcon";
import { Button } from "@/toolkits/Button";
import { Divider } from "@/toolkits/Divider";
import { Rate } from "@/toolkits/Rate";
import { Spin } from "@/toolkits/Spin";
import { HStack, Stack, VStack } from "@/toolkits/Stack";
import { chains } from "@/utils/chain";
import { modalHash } from "@/utils/constants";
import { App, Review, ReviewForm } from "@/utils/types";

type StateProps = {
  loaded?: boolean;
  loading?: boolean;
  reviews: Review[];
  submitting?: boolean;
  totalCount: number;
};

export const AppReviews: FC<{ app: App; onReload: () => void }> = ({
  app,
  onReload,
}) => {
  const [state, setState] = useState<StateProps>({
    reviews: [],
    totalCount: 0,
  });
  const { loaded, loading, reviews, submitting, totalCount } = state;
  const { avgRating, id: appId, ratesCount, ratings } = app;
  const { connect, vault } = useApp();
  const { hash } = useLocation();
  const [form] = Form.useForm<ReviewForm>();
  const goBack = useGoBack();
  const colors = useTheme();

  const visible = useMemo(() => hash === modalHash.review, [hash]);

  const fetchReviews = useCallback(
    (skip: number) => {
      setState((prev) => ({ ...prev, loading: true }));

      getReviews({ appId, skip })
        .then(({ reviews, totalCount }) => {
          setState((prev) => ({
            ...prev,
            loaded: true,
            loading: false,
            reviews: !skip ? reviews : [...prev.reviews, ...reviews],
            totalCount,
          }));
        })
        .catch(() => {
          setState((prev) => ({ ...prev, loaded: true, loading: false }));
        });
    },
    [appId],
  );

  const onFinishSuccess: FormProps<ReviewForm>["onFinish"] = async (values) => {
    if (!vault) return;

    const address = await vault.address(chains.Ethereum);

    setState((prev) => ({ ...prev, submitting: true }));

    addReview(appId, { ...values, address })
      .then(() => {
        setState((prev) => ({ ...prev, submitting: false }));

        form.resetFields();

        fetchReviews(0);

        goBack();

        onReload();
      })
      .catch(() => {
        setState((prev) => ({ ...prev, submitting: false }));
      });
  };

  useEffect(() => fetchReviews(0), [appId, fetchReviews]);

  return (
    <>
      <VStack id="reviews" $style={{ gap: "32px" }}>
        <VStack $style={{ gap: "12px" }}>
          <Stack as="span" $style={{ fontSize: "18px", lineHeight: "28px" }}>
            Reviews
          </Stack>
          <HStack
            $style={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <HStack $style={{ alignItems: "center", gap: "12px" }}>
              <Stack
                as="span"
                $style={{ fontSize: "60px", lineHeight: "72px" }}
              >
                {avgRating}
              </Stack>
              <VStack $style={{ gap: "4px" }}>
                <Rate count={5} value={avgRating} allowHalf disabled />
                <Stack
                  as="span"
                  $style={{ fontSize: "16px", lineHeight: "24px" }}
                >
                  {`${ratesCount} Reviews`}
                </Stack>
              </VStack>
            </HStack>
            {!vault ? (
              <Button onClick={connect}>Connect</Button>
            ) : (
              <Button href={modalHash.review}>Write Review</Button>
            )}
          </HStack>
          <HStack $style={{ gap: "24px" }}>
            <VStack $style={{ flex: "none", gap: "12px" }}>
              {ratings.map(({ rating }) => (
                <HStack
                  key={rating}
                  $style={{
                    color: colors.warning.toHex(),
                    fontSize: "16px",
                    gap: "2px",
                    justifyContent: "flex-end",
                  }}
                >
                  {Array.from({ length: rating }, (_, i) => (
                    <StarIcon key={i} fill="currentColor" />
                  ))}
                </HStack>
              ))}
            </VStack>
            <VStack $style={{ flexGrow: "1", gap: "12px" }}>
              {ratings.map((item) => (
                <Stack
                  key={item.rating}
                  $before={{
                    backgroundColor: colors.warning.toHex(),
                    borderRadius: "4px",
                    height: "100%",
                    position: "absolute",
                    width: `${
                      ratesCount ? (item.count * 100) / ratesCount : 0
                    }%`,
                  }}
                  $style={{
                    backgroundColor: colors.bgTertiary.toHex(),
                    borderRadius: "4px",
                    height: "8px",
                    margin: "4px 0",
                    overflow: "hidden",
                    position: "relative",
                  }}
                />
              ))}
            </VStack>
            <VStack $style={{ flex: "none", gap: "12px" }}>
              {ratings.map(({ count, rating }) => (
                <Stack
                  as="span"
                  key={rating}
                  $style={{ fontSize: "14px", lineHeight: "16px" }}
                >
                  {count}
                </Stack>
              ))}
            </VStack>
          </HStack>
        </VStack>

        {loaded ? (
          reviews.length > 0 && (
            <>
              <Divider light />
              {reviews.map(({ address, comment, createdAt, id, rating }) => (
                <VStack
                  key={id}
                  $style={{
                    backgroundColor: colors.bgTertiary.toHex(),
                    borderRadius: "12px",
                    gap: "12px",
                    height: "100%",
                    padding: "16px",
                  }}
                >
                  <HStack
                    $style={{ gap: "12px", justifyContent: "space-between" }}
                  >
                    <HStack $style={{ alignItems: "center", gap: "8px" }}>
                      <MiddleTruncate
                        $style={{
                          color: colors.textTertiary.toHex(),
                          fontSize: "14px",
                          lineHeight: "20px",
                          width: "110px",
                        }}
                      >
                        {address}
                      </MiddleTruncate>
                      <Stack
                        as="span"
                        $style={{
                          color: colors.textTertiary.toHex(),
                          fontSize: "14px",
                          lineHeight: "20px",
                        }}
                      >
                        |
                      </Stack>
                      <Stack
                        as="span"
                        $style={{
                          color: colors.textTertiary.toHex(),
                          fontSize: "14px",
                          lineHeight: "20px",
                        }}
                      >
                        {dayjs(createdAt).format("DD MMMM YYYY")}
                      </Stack>
                    </HStack>
                    <Rate count={5} value={rating} disabled />
                  </HStack>
                  <Stack
                    $style={{
                      color: colors.textSecondary.toHex(),
                      fontSize: "14px",
                      lineHeight: "20px",
                    }}
                  >
                    {comment}
                  </Stack>
                </VStack>
              ))}
              {totalCount > reviews.length && (
                <HStack $style={{ justifyContent: "center" }}>
                  <Button
                    disabled={loading}
                    loading={loading}
                    onClick={() => fetchReviews(reviews.length)}
                  >
                    Load More
                  </Button>
                </HStack>
              )}
            </>
          )
        ) : (
          <Spin centered />
        )}
      </VStack>
      <Modal
        centered={true}
        footer={
          <Button loading={submitting} onClick={form.submit}>
            Post Review
          </Button>
        }
        maskClosable={false}
        onCancel={() => goBack()}
        open={visible}
        styles={{
          body: {
            backgroundColor: colors.bgTertiary.toHex(),
            borderRadius: 12,
            padding: 24,
          },
          container: { display: "flex", flexDirection: "column", gap: "20px" },
          footer: { display: "flex", justifyContent: "center", margin: 0 },
          header: { margin: 0 },
        }}
        title="Write Review"
        width={768}
      >
        <Form
          autoComplete="off"
          form={form}
          layout="vertical"
          onFinish={onFinishSuccess}
        >
          <VStack $style={{ gap: "16px" }}>
            <VStack $style={{ alignItems: "flex-start", gap: "8px" }}>
              <Stack
                as="span"
                $style={{ fontSize: "12px", lineHeight: "16px" }}
              >
                Rating
              </Stack>
              <Stack
                $style={{
                  backgroundColor: colors.bgPrimary.toHex(),
                  borderRadius: "16px",
                  padding: "6px 12px 4px",
                }}
              >
                <Form.Item<ReviewForm>
                  name="rating"
                  rules={[{ required: true }]}
                  noStyle
                >
                  <Rate count={5} />
                </Form.Item>
              </Stack>
            </VStack>
            <VStack $style={{ gap: "8px" }}>
              <Stack
                as="span"
                $style={{
                  fontSize: "12px",
                  lineHeight: "16px",
                }}
              >
                Write Review
              </Stack>
              <Form.Item<ReviewForm>
                name="comment"
                rules={[{ required: true }]}
                noStyle
              >
                <Input.TextArea
                  rows={4}
                  placeholder="How do you feel about this plugin?"
                />
              </Form.Item>
            </VStack>
          </VStack>
        </Form>
      </Modal>
    </>
  );
};
