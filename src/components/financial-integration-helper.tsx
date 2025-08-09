"use client";

import { useEffect } from "react";
import { createClient } from "../../supabase/client";

/**
 * This component handles automatic financial integration between components:
 * 1. Creates journal entries when expenses are approved
 * 2. Updates fund source balances when expenses are paid
 * 3. Creates fund allocations when needed
 * 4. Maintains accounting equation balance
 */
export default function FinancialIntegrationHelper() {
  const supabase = createClient();

  useEffect(() => {
    // Set up real-time listeners for financial transactions
    const expenseChannel = supabase
      .channel("expense-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "expenses",
          filter: "status=eq.approved",
        },
        async (payload) => {
          await handleExpenseApproval(payload.new);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "expenses",
          filter: "status=eq.paid",
        },
        async (payload) => {
          await handleExpensePayment(payload.new);
        },
      )
      .subscribe();

    const fundChannel = supabase
      .channel("fund-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fund_sources",
        },
        async (payload) => {
          await handleFundReceived(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expenseChannel);
      supabase.removeChannel(fundChannel);
    };
  }, []);

  const handleExpenseApproval = async (expense: any) => {
    try {
      console.log("Creating journal entry for approved expense:", expense.id);

      // Get category information for proper account coding
      const { data: category } = await supabase
        .from("budget_categories")
        .select("name")
        .eq("id", expense.category_id)
        .single();

      const accountCode = getExpenseAccountCode(category?.name || "General");
      const transactionId = `EXP-${expense.id}`;

      // Create journal entries for the expense
      const journalEntries = [
        {
          transaction_id: transactionId,
          account_code: accountCode,
          account_name: `${category?.name || "General"} Expenses`,
          debit_amount: expense.amount,
          credit_amount: 0,
          description: `Expense: ${expense.title}`,
          transaction_date: expense.expense_date,
          source_type: "expense",
          source_id: expense.id,
          reference_number: `EXP-${expense.id}`,
        },
        {
          transaction_id: transactionId,
          account_code: "2000", // Accounts Payable
          account_name: "Accounts Payable",
          debit_amount: 0,
          credit_amount: expense.amount,
          description: `Expense payable: ${expense.title}`,
          transaction_date: expense.expense_date,
          source_type: "expense",
          source_id: expense.id,
          reference_number: `EXP-${expense.id}`,
        },
      ];

      const { error } = await supabase
        .from("journal_entries")
        .insert(journalEntries);

      if (error) {
        console.error("Error creating journal entries:", error);
      } else {
        console.log(
          "Journal entries created successfully for expense:",
          expense.id,
        );
      }
    } catch (error) {
      console.error("Error in handleExpenseApproval:", error);
    }
  };

  const handleExpensePayment = async (expense: any) => {
    try {
      console.log("Processing payment for expense:", expense.id);

      const transactionId = `PAY-${expense.id}`;

      // Create journal entries for the payment
      const journalEntries = [
        {
          transaction_id: transactionId,
          account_code: "2000", // Accounts Payable
          account_name: "Accounts Payable",
          debit_amount: expense.amount,
          credit_amount: 0,
          description: `Payment for: ${expense.title}`,
          transaction_date: new Date().toISOString().split("T")[0],
          source_type: "payment",
          source_id: expense.id,
          reference_number: `PAY-${expense.id}`,
        },
        {
          transaction_id: transactionId,
          account_code: getCashAccountCode(expense.fund_source_id),
          account_name: "Cash - General Fund",
          debit_amount: 0,
          credit_amount: expense.amount,
          description: `Cash payment for: ${expense.title}`,
          transaction_date: new Date().toISOString().split("T")[0],
          source_type: "payment",
          source_id: expense.id,
          reference_number: `PAY-${expense.id}`,
        },
      ];

      const { error } = await supabase
        .from("journal_entries")
        .insert(journalEntries);

      if (error) {
        console.error("Error creating payment journal entries:", error);
      }

      // Update fund source balance if linked
      if (expense.fund_source_id) {
        await updateFundSourceBalance(expense.fund_source_id, -expense.amount);
      }
    } catch (error) {
      console.error("Error in handleExpensePayment:", error);
    }
  };

  const handleFundReceived = async (fund: any) => {
    try {
      console.log("Creating journal entry for received fund:", fund.id);

      const transactionId = `FUND-${fund.id}`;
      const cashAccount = fund.is_restricted ? "1010" : "1000"; // Restricted vs Unrestricted cash
      const revenueAccount = fund.is_restricted ? "4100" : "4000"; // Restricted vs Unrestricted revenue

      // Create journal entries for fund receipt
      const journalEntries = [
        {
          transaction_id: transactionId,
          account_code: cashAccount,
          account_name: fund.is_restricted
            ? "Cash - Restricted Fund"
            : "Cash - General Fund",
          debit_amount: fund.amount,
          credit_amount: 0,
          description: `Fund received: ${fund.name}`,
          transaction_date:
            fund.received_date || new Date().toISOString().split("T")[0],
          source_type: "fund_receipt",
          source_id: fund.id,
          reference_number: `FUND-${fund.id}`,
        },
        {
          transaction_id: transactionId,
          account_code: revenueAccount,
          account_name: fund.is_restricted
            ? "Donations - Restricted"
            : "Donations - Unrestricted",
          debit_amount: 0,
          credit_amount: fund.amount,
          description: `Revenue from: ${fund.name}`,
          transaction_date:
            fund.received_date || new Date().toISOString().split("T")[0],
          source_type: "fund_receipt",
          source_id: fund.id,
          reference_number: `FUND-${fund.id}`,
        },
      ];

      const { error } = await supabase
        .from("journal_entries")
        .insert(journalEntries);

      if (error) {
        console.error("Error creating fund receipt journal entries:", error);
      } else {
        console.log("Journal entries created successfully for fund:", fund.id);
      }
    } catch (error) {
      console.error("Error in handleFundReceived:", error);
    }
  };

  const updateFundSourceBalance = async (
    fundSourceId: string,
    amount: number,
  ) => {
    try {
      // Get current fund source
      const { data: fund, error: fetchError } = await supabase
        .from("fund_sources")
        .select("amount, status")
        .eq("id", fundSourceId)
        .single();

      if (fetchError || !fund) {
        console.error("Error fetching fund source:", fetchError);
        return;
      }

      const newAmount = fund.amount + amount; // amount will be negative for expenses
      let newStatus = fund.status;

      // Update status based on remaining amount
      if (newAmount <= 0) {
        newStatus = "fully_used";
      } else if (newAmount < fund.amount) {
        newStatus = "partially_used";
      }

      const { error: updateError } = await supabase
        .from("fund_sources")
        .update({
          amount: Math.max(0, newAmount),
          status: newStatus,
        })
        .eq("id", fundSourceId);

      if (updateError) {
        console.error("Error updating fund source balance:", updateError);
      } else {
        console.log(`Fund source ${fundSourceId} balance updated by ${amount}`);
      }
    } catch (error) {
      console.error("Error in updateFundSourceBalance:", error);
    }
  };

  const getExpenseAccountCode = (categoryName: string): string => {
    const category = categoryName.toLowerCase();
    if (category.includes("program")) return "5000";
    if (category.includes("personnel") || category.includes("staff"))
      return "5100";
    if (category.includes("admin")) return "5200";
    if (category.includes("fundraising")) return "5300";
    if (category.includes("travel")) return "5400";
    if (category.includes("equipment") || category.includes("supplies"))
      return "5500";
    if (category.includes("professional") || category.includes("services"))
      return "5600";
    return "5000"; // Default to program expenses
  };

  const getCashAccountCode = (fundSourceId?: string): string => {
    // In a real implementation, you'd check if the fund source is restricted
    // For now, default to general fund cash account
    return "1000"; // Cash - General Fund
  };

  // This component doesn't render anything - it just handles background integration
  return null;
}
