export const defaultPageSize = 12;

export const modalHash = {
  automation: "#automation",
  currency: "#currency",
  language: "#language",
  payment: "#payment",
  report: "#report",
  requirements: "#requirements",
  success: "#success",
  review: "#review",
} as const;

export const feeAppId: string = import.meta.env.VITE_FEE_APP_ID;
export const listingPaymentAppId: string = import.meta.env
  .VITE_LISTING_PAYMENT_APP_ID;
export const recurringSendsAppId: string = import.meta.env
  .VITE_RECURRING_SENDS_APP_ID;
export const recurringSwapsAppId: string = import.meta.env
  .VITE_RECURRING_SWAPS_APP_ID;
export const storeApiUrl: string = import.meta.env.VITE_APP_STORE_URL;
export const vultiApiUrl: string = import.meta.env.VITE_VULTISIG_SERVER;
