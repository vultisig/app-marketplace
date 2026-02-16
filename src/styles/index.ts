import { createStaticStyles } from "antd-style";

export const tableClassNames = createStaticStyles(({ css, cssVar }) => ({
  body: {
    cell: css`
      border-color: ${cssVar.colorBorder};
      border-top-style: solid;
      border-top-width: 1px;

      &:first-child {
        border-end-start-radius: ${cssVar.borderRadius};
        border-left-style: solid;
        border-start-start-radius: ${cssVar.borderRadius};
        border-left-width: 1px;
      }

      &:last-child {
        border-end-end-radius: ${cssVar.borderRadius};
        border-right-style: solid;
        border-right-width: 1px;
        border-start-end-radius: ${cssVar.borderRadius};
      }
    `,
  },
  header: {
    cell: css`
      border: none !important;

      &:first-child {
        border-end-start-radius: ${cssVar.borderRadius};
      }

      &:last-child {
        border-end-end-radius: ${cssVar.borderRadius};
      }
    `,
  },
  content: css`
    overflow: hidden;

    table {
      border-spacing: 0 12px;
      margin: -12px 0;
    }
  `,
}));
