import type { Currency } from "@/utils/currency";

declare global {
  interface Window {
    defaultCurrency?: Currency;
  }
}

export {};
