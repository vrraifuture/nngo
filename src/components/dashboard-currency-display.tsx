"use client";

import { useEffect } from "react";
import { getCurrencySymbol } from "@/utils/currency";

/**
 * Client-side component to update currency displays on the dashboard
 * This runs after the page loads to replace server-side currency symbols
 */
export default function DashboardCurrencyDisplay() {
  useEffect(() => {
    const updateCurrencyDisplays = () => {
      try {
        const currencySymbol = getCurrencySymbol();

        // Update all currency amount elements
        const currencyElements = document.querySelectorAll(".currency-amount");
        currencyElements.forEach((element) => {
          const htmlElement = element as HTMLElement;
          const amount = htmlElement.getAttribute("data-amount");
          if (amount) {
            const numericAmount = parseInt(amount, 10);
            htmlElement.textContent = `${currencySymbol}${numericAmount.toLocaleString()}`;
          }
        });

        // Update legacy currency symbol spans (fallback)
        const symbolElements = document.querySelectorAll(".currency-symbol");
        symbolElements.forEach((element) => {
          element.textContent = currencySymbol;
        });

        console.log("Dashboard currency displays updated to:", currencySymbol);
      } catch (error) {
        console.error("Error updating currency displays:", error);
      }
    };

    // Update immediately
    updateCurrencyDisplays();

    // Listen for currency update events
    const handleCurrencyUpdate = () => {
      updateCurrencyDisplays();
    };

    window.addEventListener("currencyUpdated", handleCurrencyUpdate);

    // Cleanup
    return () => {
      window.removeEventListener("currencyUpdated", handleCurrencyUpdate);
    };
  }, []);

  return null; // This component doesn't render anything
}
