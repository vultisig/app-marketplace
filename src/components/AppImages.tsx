import { FC, useMemo } from "react";

import { HStack, Stack, VStack } from "@/toolkits/Stack";

export const AppImages: FC<{ images: string[] }> = ({ images }) => {
  const left = useMemo(() => images.filter((_, i) => i % 2 === 0), [images]);
  const right = useMemo(() => images.filter((_, i) => i % 2 === 1), [images]);

  return (
    <HStack $style={{ gap: "16px" }}>
      <VStack $style={{ gap: "16px", overflow: "hidden" }}>
        {left.map((src, i) => (
          <Stack
            as="img"
            key={i}
            alt={`App image ${i * 2 + 1}`}
            src={src}
            style={{ borderRadius: "16px" }}
          />
        ))}
      </VStack>
      <VStack $style={{ gap: "16px", overflow: "hidden" }}>
        {right.map((src, i) => (
          <Stack
            as="img"
            key={i}
            alt={`App image ${i * 2 + 2}`}
            src={src}
            style={{ borderRadius: "16px" }}
          />
        ))}
      </VStack>
    </HStack>
  );
};
