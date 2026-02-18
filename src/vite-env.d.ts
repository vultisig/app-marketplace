/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_STORE_URL: string;
  readonly VITE_FEE_APP_ID: string;
  readonly VITE_LISTING_PAYMENT_APP_ID: string;
  readonly VITE_RECURRING_SENDS_APP_ID: string;
  readonly VITE_RECURRING_SWAPS_APP_ID: string;
  readonly VITE_VULTISIG_SERVER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
