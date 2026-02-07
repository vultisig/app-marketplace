import { Masonry } from "antd";
import { FC, useMemo } from "react";

import { Stack } from "@/toolkits/Stack";

export const AppImages: FC<{ images: string[] }> = ({ images }) => {
  const items = useMemo(
    () => images.map((src, i) => ({ key: String(i), data: src })),
    [images],
  );

  return (
    <Masonry
      columns={2}
      gutter={16}
      items={items}
      itemRender={(item) => (
        <Stack
          as="img"
          alt={`App image ${Number(item.key) + 1}`}
          src={item.data}
          $style={{ borderRadius: "16px", width: "100%" }}
        />
      )}
    />
  );
};
