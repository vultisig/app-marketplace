import { Masonry } from "antd";
import { FC, useMemo } from "react";

import { Stack } from "@/toolkits/Stack";
import type { PluginImage } from "@/utils/types";

export const AppImages: FC<{ images: PluginImage[] }> = ({ images }) => {
  const items = useMemo(
    () =>
      [...images]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((image) => ({ key: image.id, data: image.url })),
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
          alt="App image"
          src={item.data}
          $style={{ borderRadius: "16px", width: "100%" }}
        />
      )}
    />
  );
};
