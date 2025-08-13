import { createClient } from "../../supabase/client";

// Currency interface
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  is_default: boolean;
}

// Cache for currency data
let currencyCache: Currency | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Default fallback currency (RWF)
const DEFAULT_CURRENCY: Currency = {
  code: "RWF",
  symbol: "FRw",
  name: "Rwandan Franc",
  is_default: true,
};

/**
 * Get the default currency from Supabase (async version)
 */
export async function getDefaultCurrency(): Promise<Currency> {
  try {
    // Check cache first
    const now = Date.now();
    if (currencyCache && now - cacheTimestamp < CACHE_DURATION) {
      return currencyCache;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("currencies")
      .select("*")
      .eq("is_default", true)
      .single();

    if (error || !data) {
      console.warn("No default currency found in database, using RWF fallback");
      currencyCache = DEFAULT_CURRENCY;
      cacheTimestamp = now;
      return DEFAULT_CURRENCY;
    }

    const currency: Currency = {
      code: data.code,
      symbol: data.symbol,
      name: data.name,
      is_default: data.is_default,
    };

    // Update cache
    currencyCache = currency;
    cacheTimestamp = now;

    return currency;
  } catch (error) {
    console.error("Error fetching default currency:", error);
    return DEFAULT_CURRENCY;
  }
}

/**
 * Get the default currency synchronously from cache or localStorage
 */
export function getDefaultCurrencySync(): Currency {
  try {
    // Check memory cache first
    const now = Date.now();
    if (currencyCache && now - cacheTimestamp < CACHE_DURATION) {
      return currencyCache;
    }

    // Try localStorage as fallback
    const savedCurrency = localStorage.getItem("ngo_default_currency");
    if (savedCurrency) {
      const parsed = JSON.parse(savedCurrency);
      const currency: Currency = {
        code: parsed.code || "RWF",
        symbol: parsed.symbol || "RWF",
        name: parsed.name || "Rwandan Franc",
        is_default: true,
      };

      // Update cache
      currencyCache = currency;
      cacheTimestamp = now;

      return currency;
    }

    // Return default RWF if nothing found
    currencyCache = DEFAULT_CURRENCY;
    cacheTimestamp = now;
    return DEFAULT_CURRENCY;
  } catch (error) {
    console.error("Error getting currency from cache:", error);
    return DEFAULT_CURRENCY;
  }
}

/**
 * Get just the currency symbol (most common use case)
 */
export function getCurrencySymbol(): string {
  return getDefaultCurrencySync().symbol;
}

/**
 * Get just the currency code
 */
export function getCurrencyCode(): string {
  return getDefaultCurrencySync().code;
}

/**
 * Format an amount with the default currency
 */
export function formatCurrency(
  amount: number,
  showCode: boolean = false,
): string {
  const currency = getDefaultCurrencySync();
  const formattedAmount = amount.toLocaleString();

  if (showCode) {
    return `${currency.symbol} ${formattedAmount} ${currency.code}`;
  }

  return `${currency.symbol} ${formattedAmount}`;
}

/**
 * Format currency for display in tables/lists
 */
export function formatCurrencyCompact(amount: number): string {
  const currency = getDefaultCurrencySync();
  return `${currency.symbol}${amount.toLocaleString()}`;
}

/**
 * Update the currency cache (call this when currency changes)
 */
export function updateCurrencyCache(currency: Currency): void {
  currencyCache = currency;
  cacheTimestamp = Date.now();

  // Also update localStorage for persistence
  try {
    localStorage.setItem("ngo_default_currency", JSON.stringify(currency));

    // Dispatch event to notify other components
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("currencyUpdated", {
          detail: currency,
        }),
      );
    }
  } catch (error) {
    console.error("Error updating currency cache:", error);
  }
}

/**
 * Clear the currency cache (useful for testing or when switching organizations)
 */
export function clearCurrencyCache(): void {
  currencyCache = null;
  cacheTimestamp = 0;

  try {
    localStorage.removeItem("ngo_default_currency");
  } catch (error) {
    console.error("Error clearing currency cache:", error);
  }
}

/**
 * Initialize currency cache from database
 */
export async function initializeCurrencyCache(): Promise<void> {
  try {
    const currency = await getDefaultCurrency();
    updateCurrencyCache(currency);
    console.log("Currency cache initialized:", currency);
  } catch (error) {
    console.error("Error initializing currency cache:", error);
  }
}

/**
 * Get all available currencies
 */
export async function getAllCurrencies(): Promise<Currency[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("currencies")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching currencies:", error);
      return [DEFAULT_CURRENCY];
    }

    return (
      data?.map((item: any) => ({
        code: item.code,
        symbol: item.symbol,
        name: item.name,
        is_default: item.is_default,
      })) || [DEFAULT_CURRENCY]
    );
  } catch (error) {
    console.error("Error fetching all currencies:", error);
    return [DEFAULT_CURRENCY];
  }
}

/**
 * Set a currency as the default
 */
export async function setDefaultCurrency(
  currencyCode: string,
): Promise<boolean> {
  try {
    const supabase = createClient();

    // First, unset all currencies as default
    await supabase
      .from("currencies")
      .update({ is_default: false })
      .neq("code", "dummy"); // Update all rows

    // Then set the selected currency as default
    const { data, error } = await supabase
      .from("currencies")
      .update({ is_default: true })
      .eq("code", currencyCode)
      .select()
      .single();

    if (error) {
      console.error("Error setting default currency:", error);
      return false;
    }

    // Update cache with new default currency
    if (data) {
      const currency: Currency = {
        code: data.code,
        symbol: data.symbol,
        name: data.name,
        is_default: data.is_default,
      };
      updateCurrencyCache(currency);
    }

    return true;
  } catch (error) {
    console.error("Error setting default currency:", error);
    return false;
  }
}

// Global type declaration for window object
declare global {
  interface Window {
    defaultCurrency?: Currency;
  }
}
