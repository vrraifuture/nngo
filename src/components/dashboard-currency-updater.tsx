"use client";

import { useEffect, useState } from "react";
import { getCurrenciesAction } from "@/app/actions";

export default function DashboardCurrencyUpdater() {
  const [defaultCurrency, setDefaultCurrency] = useState<any>(null);

  useEffect(() => {
    const loadDefaultCurrency = async () => {
      try {
        console.log("DashboardCurrencyUpdater: Loading default currency...");
        const result = await getCurrenciesAction();
        if (result.success) {
          console.log(
            "DashboardCurrencyUpdater: Currencies loaded:",
            result.currencies,
          );
          const defaultCurr = result.currencies.find((c: any) => c.is_default);
          if (defaultCurr) {
            console.log(
              "DashboardCurrencyUpdater: Default currency found:",
              defaultCurr,
            );
            setDefaultCurrency(defaultCurr);
            updateCurrencySymbols(defaultCurr.symbol);

            // Store in global context for components that need it
            if (typeof window !== "undefined") {
              window.defaultCurrency = {
                code: defaultCurr.code,
                symbol: defaultCurr.symbol,
                name: defaultCurr.name,
              };

              // Dispatch custom event to notify other components
              window.dispatchEvent(
                new CustomEvent("currencyUpdated", {
                  detail: {
                    code: defaultCurr.code,
                    symbol: defaultCurr.symbol,
                    name: defaultCurr.name,
                  },
                }),
              );

              console.log(
                "DashboardCurrencyUpdater: Global currency updated and event dispatched",
              );
            }
          } else {
            console.log(
              "DashboardCurrencyUpdater: No default currency found in database",
            );
          }
        } else {
          console.error(
            "DashboardCurrencyUpdater: Failed to load currencies:",
            result.error,
          );
        }
      } catch (error) {
        console.error(
          "DashboardCurrencyUpdater: Error loading default currency:",
          error,
        );
      }
    };

    const updateCurrencySymbols = (symbol: string) => {
      try {
        // Update all currency symbols on the page
        const currencyElements = document.querySelectorAll(".currency-symbol");
        currencyElements.forEach((element) => {
          element.textContent = symbol;
        });
      } catch (error) {
        console.error("Error updating currency symbols:", error);
      }
    };

    // Load default currency on mount
    loadDefaultCurrency();

    // Set up periodic refresh to catch currency changes
    const interval = setInterval(loadDefaultCurrency, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  return null; // This component doesn't render anything
}
