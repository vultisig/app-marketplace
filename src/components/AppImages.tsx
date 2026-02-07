import { Masonry } from "antd";
import { FC, useMemo } from "react";

export const AppImages: FC<{ images: string[] }> = ({ images }) => {
  const items = useMemo(
    () => images.map((src, i) => ({ key: String(i), data: src })),
    [images]
  );

  return (
    <Masonry
      columns={2}
      gutter={16}
      items={items}
      itemRender={(item) => (
        <img
          src={item.data}
          alt={`App image ${Number(item.key) + 1}`}
          style={{ borderRadius: 16, width: "100%" }}
        />
      )}
    />
  );
};
