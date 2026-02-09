import { FC, ReactNode, useEffect, useState } from "react";

import { getBaseValue } from "@/api/third-party/crypto";
import { CoreContext, CoreContextProps } from "@/context/Core";
import { storageKeys } from "@/storage/constants";
import {
  getCurrency,
  setCurrency as setCurrencyStorage,
} from "@/storage/currency";
import { useLocalStorageWatcher } from "@/storage/hooks/useLocalStorageWatcher";
import { getTheme, setTheme as setThemeStorage } from "@/storage/theme";
import { Currency } from "@/utils/currency";
import { Theme } from "@/utils/theme";

type StateProps = Pick<CoreContextProps, "baseValue" | "currency" | "theme">;

export const CoreProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StateProps>({
    baseValue: 1,
    currency: getCurrency(),
    theme: getTheme(),
  });
  const { baseValue, currency, theme } = state;

  const setCurrency = (currency: Currency, fromStorage?: boolean) => {
    if (!fromStorage) setCurrencyStorage(currency);

    setState((prev) => ({ ...prev, currency }));
  };

  const setTheme = (theme: Theme, fromStorage?: boolean) => {
    if (!fromStorage) setThemeStorage(theme);

    setState((prev) => ({ ...prev, theme }));
  };

  useLocalStorageWatcher(storageKeys.currency, () => {
    setCurrency(getCurrency(), true);
  });

  useLocalStorageWatcher(storageKeys.theme, () => {
    setTheme(getTheme(), true);
  });

  useEffect(() => {
    getBaseValue(currency).then((baseValue) =>
      setState((prev) => ({ ...prev, baseValue })),
    );
  }, [currency]);

  return (
    <CoreContext.Provider
      value={{
        baseValue,
        currency,
        setCurrency,
        setTheme,
        theme,
      }}
    >
      {children}
    </CoreContext.Provider>
  );
};
