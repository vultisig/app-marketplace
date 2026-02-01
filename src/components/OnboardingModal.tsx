import { Carousel, Modal } from "antd";
import { CarouselRef } from "antd/es/carousel";
import { useRef, useState } from "react";
import { useTheme } from "styled-components";

import { storageKeys } from "@/storage/constants";
import { getState } from "@/storage/state/get";
import { setState } from "@/storage/state/set";
import { Button } from "@/toolkits/Button";
import { HStack, Stack, VStack } from "@/toolkits/Stack";

export const OnboardingModal = () => {
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(
    getState(storageKeys.onboarding, false),
  );
  const carouselRef = useRef<CarouselRef>(null);
  const colors = useTheme();

  const slides = [
    {
      text: "Discover plugins and automations that work directly from your self-custodial vault. Available via the Vultisig Browser Extension.",
      title: "Welcome to the Vultisig Plugin Marketplace!",
    },
    {
      text: "Install plugins to automate recurring sends, swaps, and more. Your vault powers every plugin. You stay in full control.",
      title: "Automate Actions From Your Vault",
    },
    {
      text: "Plugins use your Fast Vault to sign actions securely. Setup takes seconds and keeps everything seedless and protected.",
      title: "You’ll need a Fast Vault to use plugins.",
    },
  ];

  const onFinish = () => {
    setFinished(true);
    setState(storageKeys.onboarding, true);
  };

  const goNext = () => {
    carouselRef.current?.next();
  };

  return (
    <Modal
      centered={true}
      closable={false}
      footer={false}
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 32,
        },
        container: { overflow: "hidden", padding: 0 },
        footer: { display: "none" },
        header: { display: "none" },
      }}
      width={390}
      open={!finished}
    >
      <Carousel
        beforeChange={(_, next) => setCurrent(next)}
        dots={false}
        infinite={false}
        ref={carouselRef}
      >
        {slides.map(({ text, title }, index) => (
          <div key={index}>
            <VStack key={index} $style={{ gap: "32px" }}>
              <Stack as="img" src={`/images/onboarding-0${index + 1}.jpg`} />
              <VStack
                $style={{
                  alignItems: "center",
                  gap: "12px",
                  padding: "0 24px",
                }}
              >
                <Stack
                  as="span"
                  $style={{
                    fontSize: "22px",
                    lineHeight: "24px",
                    textAlign: "center",
                  }}
                >
                  {title}
                </Stack>
                <Stack
                  as="span"
                  $style={{
                    color: colors.textTertiary.toHex(),
                    fontSize: "16px",
                    lineHeight: "20px",
                    textAlign: "center",
                  }}
                >
                  {text}
                </Stack>
              </VStack>
            </VStack>
          </div>
        ))}
      </Carousel>
      <HStack $style={{ gap: "6px", justifyContent: "center" }}>
        {slides.map((_, index) => (
          <Stack
            as="span"
            key={index}
            $style={{
              backgroundColor:
                current === index
                  ? colors.buttonPrimary.toHex()
                  : colors.borderNormal.toHex(),
              borderRadius: "50%",
              height: "8px",
              width: "8px",
            }}
          />
        ))}
      </HStack>
      <HStack $style={{ gap: "8px", justifyContent: "center" }}>
        {current === slides.length - 1 ? (
          <Stack as={Button} onClick={onFinish} $style={{ width: "142px" }}>
            Finish
          </Stack>
        ) : (
          <>
            <Stack
              as={Button}
              kind="secondary"
              onClick={onFinish}
              $style={{ width: "142px" }}
            >
              Skip
            </Stack>
            <Stack as={Button} onClick={goNext} $style={{ width: "142px" }}>
              Continue
            </Stack>
          </>
        )}
      </HStack>
    </Modal>
  );
};
