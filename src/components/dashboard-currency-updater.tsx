"use client";

import { useEffect } from "react";
import { initializeCurrencyCache } from "@/utils/currency";

export default function DashboardCurrencyUpdater() {
  useEffect(() => {
    const initializeCurrency = async () => {
      try {
        console.log("DashboardCurrencyUpdater: Initializing currency cache...");
        await initializeCurrencyCache();
        console.log(
          "DashboardCurrencyUpdater: Currency cache initialized successfully",
        );
      } catch (error) {
        console.error(
          "DashboardCurrencyUpdater: Error initializing currency:",
          error,
        );
      }
    };

    // Initialize currency cache on mount
    initializeCurrency();

    // Listen for currency update events
    const handleCurrencyUpdate = (event: CustomEvent) => {
      console.log("DashboardCurrencyUpdater: Currency updated:", event.detail);
      // The currency cache is already updated by the utility function
      // Just log for debugging purposes
    };

    // Add event listener for currency updates
    window.addEventListener(
      "currencyUpdated",
      handleCurrencyUpdate as EventListener,
    );

    // Set up periodic refresh to catch currency changes from other tabs/windows
    const interval = setInterval(async () => {
      try {
        await initializeCurrencyCache();
      } catch (error) {
        console.error("Error refreshing currency cache:", error);
      }
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener(
        "currencyUpdated",
        handleCurrencyUpdate as EventListener,
      );
      clearInterval(interval);
    };
  }, []);

  return null; // This component doesn't render anything
}
