import { createContext } from "react";

import { setCurrency } from "@/storage/currency";
import { setTheme } from "@/storage/theme";
import { Currency } from "@/utils/currency";
import { Theme } from "@/utils/theme";

export type CoreContextProps = {
  baseValue: number;
  currency: Currency;
  setCurrency: typeof setCurrency;
  setTheme: typeof setTheme;
  theme: Theme;
};

export const CoreContext = createContext<CoreContextProps | undefined>(
  undefined,
);
