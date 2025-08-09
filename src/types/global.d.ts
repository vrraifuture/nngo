declare global {
  interface Window {
    defaultCurrency?: {
      code: string;
      symbol: string;
      name: string;
    };
  }
}

export {};
