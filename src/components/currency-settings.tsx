"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertCircle } from "lucide-react";
import {
  getAllCurrencies,
  getDefaultCurrency,
  setDefaultCurrency,
  Currency,
  initializeCurrencyCache,
} from "@/utils/currency";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CurrencySettingsProps {
  onCurrencyChange?: (currency: Currency) => void;
}

export default function CurrencySettings({
  onCurrencyChange,
}: CurrencySettingsProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currentCurrency, setCurrentCurrency] = useState<Currency | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      setLoading(true);

      // Load all currencies and current default
      const [allCurrencies, defaultCurrency] = await Promise.all([
        getAllCurrencies(),
        getDefaultCurrency(),
      ]);

      setCurrencies(allCurrencies);
      setCurrentCurrency(defaultCurrency);
      setSelectedCurrency(defaultCurrency.code);

      console.log("Loaded currencies:", allCurrencies);
      console.log("Current default currency:", defaultCurrency);
    } catch (error) {
      console.error("Error loading currencies:", error);
      setMessage({
        type: "error",
        text: "Failed to load currency settings. Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrency = async () => {
    if (!selectedCurrency || selectedCurrency === currentCurrency?.code) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const success = await setDefaultCurrency(selectedCurrency);

      if (success) {
        // Find the new currency details
        const newCurrency = currencies.find((c) => c.code === selectedCurrency);
        if (newCurrency) {
          setCurrentCurrency(newCurrency);

          // Trigger callback if provided
          if (onCurrencyChange) {
            onCurrencyChange(newCurrency);
          }

          // Reinitialize cache to ensure consistency
          await initializeCurrencyCache();

          setMessage({
            type: "success",
            text: `Successfully updated default currency to ${newCurrency.name} (${newCurrency.code})`,
          });

          // Refresh the page after a short delay to ensure all components update
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } else {
        setMessage({
          type: "error",
          text: "Failed to update currency. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error saving currency:", error);
      setMessage({
        type: "error",
        text: "An error occurred while updating the currency.",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>
            Configure the default currency for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">
              Loading currency settings...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Currency Settings</CardTitle>
        <CardDescription>
          Configure the default currency for your organization. This will be
          used throughout the system for all financial displays.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Currency Display */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">
            Current Default Currency
          </h4>
          {currentCurrency ? (
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {currentCurrency.code}
              </Badge>
              <span className="font-medium text-blue-900">
                {currentCurrency.name}
              </span>
              <span className="text-blue-700">
                Symbol: {currentCurrency.symbol}
              </span>
            </div>
          ) : (
            <span className="text-blue-700">No currency set</span>
          )}
        </div>

        {/* Currency Selection */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Default Currency
            </label>
            <Select
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {currency.code}
                      </Badge>
                      <span>{currency.name}</span>
                      <span className="text-gray-500">({currency.symbol})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {selectedCurrency && selectedCurrency !== currentCurrency?.code && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-medium text-green-900 mb-1">Preview</h5>
              <p className="text-sm text-green-800">
                All amounts will be displayed as:{" "}
                <span className="font-medium">
                  {currencies.find((c) => c.code === selectedCurrency)?.symbol}{" "}
                  1,000
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Messages */}
        {message && (
          <Alert
            className={
              message.type === "error"
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }
          >
            {message.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription
              className={
                message.type === "error" ? "text-red-800" : "text-green-800"
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {message && (
            <Button variant="outline" onClick={clearMessage} disabled={saving}>
              Clear Message
            </Button>
          )}
          <Button
            onClick={handleSaveCurrency}
            disabled={
              saving ||
              !selectedCurrency ||
              selectedCurrency === currentCurrency?.code
            }
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        {/* Important Note */}
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h5 className="font-medium text-yellow-900 mb-1">Important Note</h5>
          <p className="text-sm text-yellow-800">
            Changing the default currency will affect all financial displays
            throughout the system. The page will refresh automatically after
            saving to ensure all components are updated.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
