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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Download,
  Upload,
  Filter,
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit,
  Trash2,
} from "lucide-react";
import { createClient } from "../../supabase/client";
import {
  canManageLedgerSync,
  canEditLedgerSync,
  canDeleteLedgerSync,
  canManageSettingsSync,
} from "@/utils/permissions";

interface LedgerEntry {
  id: string;
  account_code: string;
  account_name: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  reference_number?: string;
  created_by?: string;
  created_at: string;
}

interface AccountType {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  normal_balance: "debit" | "credit";
}

interface GeneralLedgerProps {
  userRole: string;
}

export default function GeneralLedger({
  userRole = "admin",
}: GeneralLedgerProps) {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBatchAddDialog, setShowBatchAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showAddAccountTypeDialog, setShowAddAccountTypeDialog] =
    useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
    total: number;
  } | null>(null);
  const [customAccountTypes, setCustomAccountTypes] = useState<any[]>([]);
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [chartOfAccounts, setChartOfAccounts] = useState<AccountType[]>([]);
  const [newEntry, setNewEntry] = useState({
    account_code: "",
    account_name: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    debit: "",
    credit: "",
    reference_number: "",
  });
  const [batchEntries, setBatchEntries] = useState<
    {
      id: string;
      account_code: string;
      account_name: string;
      description: string;
      debit: string;
      credit: string;
      reference_number: string;
    }[]
  >([]);
  const [batchDate, setBatchDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isBalanced, setIsBalanced] = useState(false);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: "",
    name: "",
    type: "asset" as "asset" | "liability" | "equity" | "revenue" | "expense",
    normal_balance: "debit" as "debit" | "credit",
  });
  const [newAccountType, setNewAccountType] = useState({
    name: "",
    category: "asset" as
      | "asset"
      | "liability"
      | "equity"
      | "revenue"
      | "expense",
    normal_balance: "debit" as "debit" | "credit",
    description: "",
  });

  const supabase = createClient();

  // Get default currency
  const getDefaultCurrency = () => {
    try {
      const savedDefaultCurrency = localStorage.getItem("ngo_default_currency");
      if (savedDefaultCurrency) {
        const defaultCurrency = JSON.parse(savedDefaultCurrency);
        return defaultCurrency.symbol || "$";
      }
    } catch (error) {
      console.error("Error getting default currency:", error);
    }
    return "$"; // fallback
  };

  // Initialize chart of accounts
  const initializeChartOfAccounts = () => {
    const defaultAccounts: AccountType[] = [
      // Assets
      {
        code: "1000",
        name: "Cash - General Fund",
        type: "asset",
        normal_balance: "debit",
      },
      {
        code: "1010",
        name: "Cash - Restricted Fund",
        type: "asset",
        normal_balance: "debit",
      },
      {
        code: "1100",
        name: "Accounts Receivable",
        type: "asset",
        normal_balance: "debit",
      },
      {
        code: "1200",
        name: "Grants Receivable",
        type: "asset",
        normal_balance: "debit",
      },
      {
        code: "1500",
        name: "Equipment",
        type: "asset",
        normal_balance: "debit",
      },
      {
        code: "1600",
        name: "Accumulated Depreciation",
        type: "asset",
        normal_balance: "credit",
      },

      // Liabilities
      {
        code: "2000",
        name: "Accounts Payable",
        type: "liability",
        normal_balance: "credit",
      },
      {
        code: "2100",
        name: "Accrued Expenses",
        type: "liability",
        normal_balance: "credit",
      },
      {
        code: "2200",
        name: "Deferred Revenue",
        type: "liability",
        normal_balance: "credit",
      },

      // Net Assets/Equity
      {
        code: "3000",
        name: "Net Assets - Unrestricted",
        type: "equity",
        normal_balance: "credit",
      },
      {
        code: "3100",
        name: "Net Assets - Temporarily Restricted",
        type: "equity",
        normal_balance: "credit",
      },
      {
        code: "3200",
        name: "Net Assets - Permanently Restricted",
        type: "equity",
        normal_balance: "credit",
      },

      // Revenue
      {
        code: "4000",
        name: "Donations - Unrestricted",
        type: "revenue",
        normal_balance: "credit",
      },
      {
        code: "4100",
        name: "Donations - Restricted",
        type: "revenue",
        normal_balance: "credit",
      },
      {
        code: "4200",
        name: "Grant Revenue",
        type: "revenue",
        normal_balance: "credit",
      },
      {
        code: "4300",
        name: "Program Service Revenue",
        type: "revenue",
        normal_balance: "credit",
      },
      {
        code: "4400",
        name: "Investment Income",
        type: "revenue",
        normal_balance: "credit",
      },

      // Expenses
      {
        code: "5000",
        name: "Program Expenses",
        type: "expense",
        normal_balance: "debit",
      },
      {
        code: "5100",
        name: "Personnel Expenses",
        type: "expense",
        normal_balance: "debit",
      },
      {
        code: "5200",
        name: "Administrative Expenses",
        type: "expense",
        normal_balance: "debit",
      },
      {
        code: "5300",
        name: "Fundraising Expenses",
        type: "expense",
        normal_balance: "debit",
      },
      {
        code: "5400",
        name: "Travel & Transportation",
        type: "expense",
        normal_balance: "debit",
      },
      {
        code: "5500",
        name: "Equipment & Supplies",
        type: "expense",
        normal_balance: "debit",
      },
      {
        code: "5600",
        name: "Professional Services",
        type: "expense",
        normal_balance: "debit",
      },
    ];

    // Load from localStorage if available
    const savedAccounts = localStorage.getItem("ngo_chart_of_accounts");
    if (savedAccounts) {
      setChartOfAccounts(JSON.parse(savedAccounts));
    } else {
      setChartOfAccounts(defaultAccounts);
      localStorage.setItem(
        "ngo_chart_of_accounts",
        JSON.stringify(defaultAccounts),
      );
    }
  };

  useEffect(() => {
    initializeChartOfAccounts();
    fetchLedgerEntries();
    loadCustomAccountTypes();
  }, []);

  const fetchLedgerEntries = async () => {
    try {
      // For now, we'll use localStorage to simulate database storage
      const savedEntries = localStorage.getItem("ngo_ledger_entries");
      if (savedEntries) {
        setLedgerEntries(JSON.parse(savedEntries));
      } else {
        // Initialize with some sample data
        const sampleEntries: LedgerEntry[] = [
          {
            id: "1",
            account_code: "1000",
            account_name: "Cash - General Fund",
            date: "2024-01-15",
            description: "Initial donation received",
            debit: 10000,
            credit: 0,
            reference_number: "DON-001",
            created_by: "Admin",
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            account_code: "4000",
            account_name: "Donations - Unrestricted",
            date: "2024-01-15",
            description: "Initial donation received",
            debit: 0,
            credit: 10000,
            reference_number: "DON-001",
            created_by: "Admin",
            created_at: new Date().toISOString(),
          },
          {
            id: "3",
            account_code: "5000",
            account_name: "Program Expenses",
            date: "2024-01-20",
            description: "Educational materials purchase",
            debit: 2500,
            credit: 0,
            reference_number: "EXP-001",
            created_by: "Admin",
            created_at: new Date().toISOString(),
          },
          {
            id: "4",
            account_code: "1000",
            account_name: "Cash - General Fund",
            date: "2024-01-20",
            description: "Educational materials purchase",
            debit: 0,
            credit: 2500,
            reference_number: "EXP-001",
            created_by: "Admin",
            created_at: new Date().toISOString(),
          },
        ];
        setLedgerEntries(sampleEntries);
        localStorage.setItem(
          "ngo_ledger_entries",
          JSON.stringify(sampleEntries),
        );
      }
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const saveLedgerEntries = (entries: LedgerEntry[]) => {
    setLedgerEntries(entries);
    localStorage.setItem("ngo_ledger_entries", JSON.stringify(entries));
  };

  const saveChartOfAccounts = (accounts: AccountType[]) => {
    setChartOfAccounts(accounts);
    localStorage.setItem("ngo_chart_of_accounts", JSON.stringify(accounts));
  };

  const loadCustomAccountTypes = () => {
    try {
      const savedTypes = localStorage.getItem("ngo_custom_account_types");
      if (savedTypes) {
        setCustomAccountTypes(JSON.parse(savedTypes));
      }
    } catch (error) {
      console.error("Error loading custom account types:", error);
    }
  };

  const saveCustomAccountTypes = (types: any[]) => {
    setCustomAccountTypes(types);
    localStorage.setItem("ngo_custom_account_types", JSON.stringify(types));
  };

  const handleAddAccountType = () => {
    if (!newAccountType.name.trim()) {
      alert("Please enter a type name.");
      return;
    }

    const customType = {
      id: Date.now().toString(),
      name: newAccountType.name,
      category: newAccountType.category,
      normal_balance: newAccountType.normal_balance,
      description: newAccountType.description,
      is_custom: true,
    };

    const updatedTypes = [...customAccountTypes, customType];
    saveCustomAccountTypes(updatedTypes);

    // Reset form and close dialog
    setNewAccountType({
      name: "",
      category: "asset",
      normal_balance: "debit",
      description: "",
    });
    setShowAddAccountTypeDialog(false);

    alert(
      `Custom account type "${customType.name}" has been added successfully!`,
    );
  };

  const handleAddAccount = () => {
    // Check permissions using the permission system - only admin can add accounts
    if (!canManageSettingsSync()) {
      alert(
        "You don't have permission to add new accounts. Only administrators can modify the chart of accounts.",
      );
      return;
    }

    if (!newAccount.code || !newAccount.name) {
      alert("Please fill in account code and name.");
      return;
    }

    // Check if account code already exists
    if (chartOfAccounts.find((acc) => acc.code === newAccount.code)) {
      alert("Account code already exists. Please use a different code.");
      return;
    }

    const account: AccountType = {
      code: newAccount.code,
      name: newAccount.name,
      type: newAccount.type,
      normal_balance: newAccount.normal_balance,
    };

    const newAccounts = [...chartOfAccounts, account].sort((a, b) =>
      a.code.localeCompare(b.code),
    );
    saveChartOfAccounts(newAccounts);

    // Reset form
    setNewAccount({
      code: "",
      name: "",
      type: "asset",
      normal_balance: "debit",
    });
    setShowAddAccountDialog(false);
  };

  // Calculate batch totals
  const getBatchTotalDebits = () => {
    return batchEntries.reduce(
      (sum, entry) => sum + (parseFloat(entry.debit) || 0),
      0,
    );
  };

  const getBatchTotalCredits = () => {
    return batchEntries.reduce(
      (sum, entry) => sum + (parseFloat(entry.credit) || 0),
      0,
    );
  };

  // Check if batch is balanced
  const checkBatchBalance = () => {
    const totalDebits = getBatchTotalDebits();
    const totalCredits = getBatchTotalCredits();
    const balanced = Math.abs(totalDebits - totalCredits) < 0.01;
    setIsBalanced(balanced);
    return balanced;
  };

  // Add new entry to batch
  const addToBatch = () => {
    const newBatchEntry = {
      id: Date.now().toString(),
      account_code: "",
      account_name: "",
      description: "",
      debit: "",
      credit: "",
      reference_number: "",
    };
    setBatchEntries([...batchEntries, newBatchEntry]);
  };

  // Remove entry from batch
  const removeFromBatch = (id: string) => {
    const updatedEntries = batchEntries.filter((entry) => entry.id !== id);
    setBatchEntries(updatedEntries);
    // Recalculate balance after removal
    setTimeout(() => checkBatchBalance(), 100);
  };

  // Update batch entry
  const updateBatchEntry = (id: string, field: string, value: string) => {
    const updatedEntries = batchEntries.map((entry) => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };

        // If updating account code, also update account name
        if (field === "account_code") {
          const selectedAccount = chartOfAccounts.find(
            (acc) => acc.code === value,
          );
          updated.account_name = selectedAccount?.name || "";
        }

        // Ensure only debit OR credit is filled
        if (field === "debit" && value) {
          updated.credit = "";
        } else if (field === "credit" && value) {
          updated.debit = "";
        }

        return updated;
      }
      return entry;
    });
    setBatchEntries(updatedEntries);

    // Recalculate balance after update
    setTimeout(() => checkBatchBalance(), 100);
  };

  // Submit batch entries
  const handleSubmitBatch = () => {
    // Check permissions using the permission system
    if (!canManageLedgerSync()) {
      alert("You don't have permission to add ledger entries.");
      return;
    }

    // Validate entries
    if (batchEntries.length === 0) {
      alert("Please add at least one entry to the batch.");
      return;
    }

    // Check if all entries are valid
    const invalidEntries = batchEntries.filter(
      (entry) =>
        !entry.account_code ||
        !entry.description ||
        (!entry.debit && !entry.credit) ||
        (parseFloat(entry.debit || "0") === 0 &&
          parseFloat(entry.credit || "0") === 0),
    );

    if (invalidEntries.length > 0) {
      alert(
        `Please complete all required fields for all entries. ${invalidEntries.length} entries are incomplete.`,
      );
      return;
    }

    // Check balance unless force submit is enabled
    const balanced = checkBatchBalance();
    if (!balanced && !forceSubmit) {
      const totalDebits = getBatchTotalDebits();
      const totalCredits = getBatchTotalCredits();
      const difference = Math.abs(totalDebits - totalCredits);

      const confirmMessage = `The batch is not balanced!\n\nTotal Debits: ${getDefaultCurrency()}${totalDebits.toLocaleString()}\nTotal Credits: ${getDefaultCurrency()}${totalCredits.toLocaleString()}\nDifference: ${getDefaultCurrency()}${difference.toLocaleString()}\n\nPlease check the "Force Submit" checkbox to proceed with unbalanced entries, or adjust the amounts to balance the entries.`;

      alert(confirmMessage);
      return;
    }

    // Convert batch entries to ledger entries
    const newLedgerEntries = batchEntries.map((entry) => {
      const selectedAccount = chartOfAccounts.find(
        (acc) => acc.code === entry.account_code,
      );

      return {
        id: `batch_${Date.now()}_${entry.id}`,
        account_code: entry.account_code,
        account_name: selectedAccount?.name || entry.account_name,
        date: batchDate,
        description: entry.description,
        debit: parseFloat(entry.debit) || 0,
        credit: parseFloat(entry.credit) || 0,
        reference_number: entry.reference_number || undefined,
        created_by: "Current User",
        created_at: new Date().toISOString(),
      };
    });

    // Add to ledger
    const updatedEntries = [...ledgerEntries, ...newLedgerEntries];
    saveLedgerEntries(updatedEntries);

    // Reset batch
    setBatchEntries([]);
    setBatchDate(new Date().toISOString().split("T")[0]);
    setIsBalanced(false);
    setForceSubmit(false);
    setShowBatchAddDialog(false);

    alert(
      `Successfully added ${newLedgerEntries.length} entries to the general ledger!`,
    );
  };

  const handleAddEntry = () => {
    // Check permissions using the permission system
    if (!canManageLedgerSync()) {
      alert("You don't have permission to add ledger entries.");
      return;
    }

    if (
      !newEntry.account_code ||
      !newEntry.description ||
      (!newEntry.debit && !newEntry.credit)
    ) {
      return;
    }

    const debitAmount = parseFloat(newEntry.debit) || 0;
    const creditAmount = parseFloat(newEntry.credit) || 0;

    // Ensure only one of debit or credit is filled
    if (debitAmount > 0 && creditAmount > 0) {
      alert("Please enter either a debit OR credit amount, not both.");
      return;
    }

    const selectedAccount = chartOfAccounts.find(
      (acc) => acc.code === newEntry.account_code,
    );

    const entry: LedgerEntry = {
      id: Date.now().toString(),
      account_code: newEntry.account_code,
      account_name: selectedAccount?.name || newEntry.account_name,
      date: newEntry.date,
      description: newEntry.description,
      debit: debitAmount,
      credit: creditAmount,
      reference_number: newEntry.reference_number || undefined,
      created_by: "Current User",
      created_at: new Date().toISOString(),
    };

    const newEntries = [...ledgerEntries, entry];
    saveLedgerEntries(newEntries);

    // Reset form
    setNewEntry({
      account_code: "",
      account_name: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      debit: "",
      credit: "",
      reference_number: "",
    });
    setShowAddDialog(false);
  };

  const handleEditEntry = (entry: LedgerEntry) => {
    // Check permissions using the permission system
    if (!canEditLedgerSync()) {
      alert("You don't have permission to edit ledger entries.");
      return;
    }
    setEditingEntry(entry);
    setShowEditDialog(true);
  };

  const handleUpdateEntry = () => {
    // Check permissions using the permission system
    if (!canEditLedgerSync()) {
      alert("You don't have permission to edit ledger entries.");
      return;
    }

    if (!editingEntry) return;

    const updatedEntries = ledgerEntries.map((entry) =>
      entry.id === editingEntry.id ? editingEntry : entry,
    );
    saveLedgerEntries(updatedEntries);
    setShowEditDialog(false);
    setEditingEntry(null);
    alert("Ledger entry updated successfully!");
  };

  const handleDeleteEntry = (entryId: string) => {
    // Check permissions using the permission system
    if (!canDeleteLedgerSync()) {
      alert("You don't have permission to delete ledger entries.");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this ledger entry? This action cannot be undone.",
      )
    ) {
      return;
    }

    const updatedEntries = ledgerEntries.filter(
      (entry) => entry.id !== entryId,
    );
    saveLedgerEntries(updatedEntries);
    alert("Ledger entry deleted successfully!");
  };

  const getFilteredEntries = () => {
    let filtered = ledgerEntries;

    if (filterAccount !== "all") {
      filtered = filtered.filter(
        (entry) => entry.account_code === filterAccount,
      );
    }

    if (filterDateFrom) {
      filtered = filtered.filter((entry) => entry.date >= filterDateFrom);
    }

    if (filterDateTo) {
      filtered = filtered.filter((entry) => entry.date <= filterDateTo);
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  const getTotalDebits = () => {
    return getFilteredEntries().reduce((sum, entry) => sum + entry.debit, 0);
  };

  const getTotalCredits = () => {
    return getFilteredEntries().reduce((sum, entry) => sum + entry.credit, 0);
  };

  const getAccountBalance = (accountCode: string) => {
    const accountEntries = ledgerEntries.filter(
      (entry) => entry.account_code === accountCode,
    );
    const totalDebits = accountEntries.reduce(
      (sum, entry) => sum + entry.debit,
      0,
    );
    const totalCredits = accountEntries.reduce(
      (sum, entry) => sum + entry.credit,
      0,
    );
    return totalDebits - totalCredits;
  };

  const exportToCSV = () => {
    const csvContent = [
      [
        "Date",
        "Account Code",
        "Account Name",
        "Description",
        "Reference",
        "Debit",
        "Credit",
      ],
      ...getFilteredEntries().map((entry) => [
        entry.date,
        entry.account_code,
        entry.account_name,
        entry.description,
        entry.reference_number || "",
        entry.debit.toString(),
        entry.credit.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "general-ledger.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadImportTemplate = () => {
    // Create a CSV template with headers and sample data
    const templateContent = [
      [
        "Date",
        "Account Code",
        "Account Name",
        "Description",
        "Reference",
        "Debit",
        "Credit",
      ],
      // Sample entries to show the format
      [
        "2024-01-15",
        "1000",
        "Cash - General Fund",
        "Initial donation received",
        "DON-001",
        "10000",
        "0",
      ],
      [
        "2024-01-15",
        "4000",
        "Donations - Unrestricted",
        "Initial donation received",
        "DON-001",
        "0",
        "10000",
      ],
      [
        "2024-01-20",
        "5000",
        "Program Expenses",
        "Educational materials purchase",
        "EXP-001",
        "2500",
        "0",
      ],
      [
        "2024-01-20",
        "1000",
        "Cash - General Fund",
        "Educational materials purchase",
        "EXP-001",
        "0",
        "2500",
      ],
      // Empty rows for user to fill in
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([templateContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ledger-import-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText: string): string[][] => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    return lines.map((line) => {
      const result = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const validateImportRow = (
    row: string[],
    rowIndex: number,
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check if row has minimum required columns
    if (row.length < 6) {
      errors.push(
        `Row ${rowIndex + 1}: Missing required columns. Expected at least 6 columns.`,
      );
      return { isValid: false, errors };
    }

    const [
      date,
      accountCode,
      accountName,
      description,
      reference,
      debit,
      credit,
    ] = row;

    // Validate date
    if (!date || !date.trim()) {
      errors.push(`Row ${rowIndex + 1}: Date is required.`);
    } else {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        errors.push(
          `Row ${rowIndex + 1}: Invalid date format. Use YYYY-MM-DD.`,
        );
      }
    }

    // Validate account code
    if (!accountCode || !accountCode.trim()) {
      errors.push(`Row ${rowIndex + 1}: Account code is required.`);
    } else {
      const accountExists = chartOfAccounts.find(
        (acc) => acc.code === accountCode.trim(),
      );
      if (!accountExists) {
        errors.push(
          `Row ${rowIndex + 1}: Account code '${accountCode}' does not exist in chart of accounts.`,
        );
      }
    }

    // Validate description
    if (!description || !description.trim()) {
      errors.push(`Row ${rowIndex + 1}: Description is required.`);
    }

    // Validate debit/credit amounts
    const debitAmount = parseFloat(debit) || 0;
    const creditAmount = parseFloat(credit) || 0;

    if (debitAmount < 0 || creditAmount < 0) {
      errors.push(
        `Row ${rowIndex + 1}: Debit and credit amounts cannot be negative.`,
      );
    }

    if (debitAmount > 0 && creditAmount > 0) {
      errors.push(
        `Row ${rowIndex + 1}: Cannot have both debit and credit amounts. Use only one.`,
      );
    }

    if (debitAmount === 0 && creditAmount === 0) {
      errors.push(
        `Row ${rowIndex + 1}: Must have either a debit or credit amount.`,
      );
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleImportCSV = async () => {
    // Check permissions using the permission system
    if (!canManageLedgerSync()) {
      alert("You don't have permission to import ledger entries.");
      return;
    }

    if (!importFile) {
      alert("Please select a CSV file to import.");
      return;
    }

    try {
      const fileContent = await importFile.text();
      const rows = parseCSV(fileContent);

      if (rows.length === 0) {
        alert("The CSV file appears to be empty.");
        return;
      }

      // Skip header row if it exists
      const dataRows = rows[0][0].toLowerCase().includes("date")
        ? rows.slice(1)
        : rows;

      if (dataRows.length === 0) {
        alert("No data rows found in the CSV file.");
        return;
      }

      const validEntries: LedgerEntry[] = [];
      const allErrors: string[] = [];

      // Validate each row
      dataRows.forEach((row, index) => {
        const { isValid, errors } = validateImportRow(row, index);

        if (isValid) {
          const [
            date,
            accountCode,
            accountName,
            description,
            reference,
            debit,
            credit,
          ] = row;
          const selectedAccount = chartOfAccounts.find(
            (acc) => acc.code === accountCode.trim(),
          );

          const entry: LedgerEntry = {
            id: `import_${Date.now()}_${index}`,
            account_code: accountCode.trim(),
            account_name: selectedAccount?.name || accountName.trim(),
            date: date.trim(),
            description: description.trim(),
            debit: parseFloat(debit) || 0,
            credit: parseFloat(credit) || 0,
            reference_number: reference?.trim() || undefined,
            created_by: "Imported",
            created_at: new Date().toISOString(),
          };

          validEntries.push(entry);
        } else {
          allErrors.push(...errors);
        }
      });

      // Import valid entries
      if (validEntries.length > 0) {
        const updatedEntries = [...ledgerEntries, ...validEntries];
        saveLedgerEntries(updatedEntries);
      }

      // Set import results
      setImportResults({
        success: validEntries.length,
        errors: allErrors,
        total: dataRows.length,
      });

      // Clear the file input
      setImportFile(null);
    } catch (error) {
      console.error("Error importing CSV:", error);
      alert(
        "Failed to import CSV file. Please check the file format and try again.",
      );
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (
        file.type !== "text/csv" &&
        !file.name.toLowerCase().endsWith(".csv")
      ) {
        alert("Please select a CSV file.");
        return;
      }
      setImportFile(file);
      setImportResults(null);
    }
  };

  const getAccountTypeColor = (accountCode: string) => {
    const account = chartOfAccounts.find((acc) => acc.code === accountCode);
    if (!account) return "bg-gray-100 text-gray-800";

    switch (account.type) {
      case "asset":
        return "bg-green-100 text-green-800";
      case "liability":
        return "bg-red-100 text-red-800";
      case "equity":
        return "bg-blue-100 text-blue-800";
      case "revenue":
        return "bg-purple-100 text-purple-800";
      case "expense":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-gray-500">Loading general ledger...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Debits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {getDefaultCurrency()}
              {getTotalDebits().toLocaleString()}
            </div>
            <p className="text-xs text-green-700 mt-1">
              {getFilteredEntries().filter((e) => e.debit > 0).length} debit
              entries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {getDefaultCurrency()}
              {getTotalCredits().toLocaleString()}
            </div>
            <p className="text-xs text-red-700 mt-1">
              {getFilteredEntries().filter((e) => e.credit > 0).length} credit
              entries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Balance Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                Math.abs(getTotalDebits() - getTotalCredits()) < 0.01
                  ? "text-green-900"
                  : "text-red-900"
              }`}
            >
              {getDefaultCurrency()}
              {Math.abs(getTotalDebits() - getTotalCredits()).toLocaleString()}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {Math.abs(getTotalDebits() - getTotalCredits()) < 0.01
                ? "Books are balanced"
                : "Difference detected"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            General Ledger Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Account:</label>
                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="all">All Accounts</SelectItem>
                    {chartOfAccounts.map((account) => (
                      <SelectItem key={account.code} value={account.code}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">From:</label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">To:</label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>

              {canManageLedgerSync() && (
                <>
                  <Dialog
                    open={showImportDialog}
                    onOpenChange={setShowImportDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import CSV
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Import Ledger Entries</DialogTitle>
                        <DialogDescription>
                          Import ledger entries from a CSV file. The CSV should
                          have columns: Date, Account Code, Account Name,
                          Description, Reference, Debit, Credit.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pr-2">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-gray-800 mb-1">
                              Step 1: Download Template
                            </h4>
                            <p className="text-sm text-gray-600">
                              Download the CSV template with sample data and
                              format
                            </p>
                          </div>
                          <Button
                            onClick={downloadImportTemplate}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download Template
                          </Button>
                        </div>

                        <div className="border-t pt-4">
                          <h4 className="font-medium text-gray-800 mb-2">
                            Step 2: Upload Your File
                          </h4>
                          <Label htmlFor="csv-file">Select CSV File</Label>
                          <Input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="mt-1"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            CSV format: Date, Account Code, Account Name,
                            Description, Reference, Debit, Credit
                          </p>
                        </div>

                        {importFile && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">
                              Selected file: {importFile.name}
                            </p>
                            <p className="text-xs text-blue-600">
                              Size: {(importFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        )}

                        {importResults && (
                          <div className="space-y-3">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <h4 className="font-medium text-green-800 mb-2">
                                Import Results
                              </h4>
                              <p className="text-sm text-green-700">
                                Successfully imported: {importResults.success}{" "}
                                out of {importResults.total} entries
                              </p>
                            </div>

                            {importResults.errors.length > 0 && (
                              <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-h-40 overflow-y-auto">
                                <h4 className="font-medium text-red-800 mb-2">
                                  Errors ({importResults.errors.length})
                                </h4>
                                <ul className="text-sm text-red-700 space-y-1">
                                  {importResults.errors.map((error, index) => (
                                    <li
                                      key={index}
                                      className="list-disc list-inside"
                                    >
                                      {error}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-800 mb-2">
                            CSV Format Requirements:
                          </h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>
                              • Date: YYYY-MM-DD format (e.g., 2024-01-15)
                            </li>
                            <li>
                              • Account Code: Must exist in your chart of
                              accounts
                            </li>
                            <li>• Description: Required for each entry</li>
                            <li>
                              • Debit/Credit: Use only one per row, not both
                            </li>
                            <li>• Reference: Optional reference number</li>
                          </ul>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowImportDialog(false);
                              setImportFile(null);
                              setImportResults(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleImportCSV}
                            disabled={!importFile}
                          >
                            Import Entries
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={showBatchAddDialog}
                    onOpenChange={setShowBatchAddDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2 mr-2">
                        <Plus className="h-4 w-4" />
                        Add Multiple Entries
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Multiple Ledger Entries</DialogTitle>
                        <DialogDescription>
                          Create multiple journal entries at once. Ensure debits
                          equal credits for balanced books.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* Batch Controls */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div>
                              <Label htmlFor="batch_date">
                                Transaction Date *
                              </Label>
                              <Input
                                id="batch_date"
                                type="date"
                                value={batchDate}
                                onChange={(e) => setBatchDate(e.target.value)}
                                className="w-40"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={addToBatch}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Entry
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              Entries: {batchEntries.length}
                            </div>
                            <div
                              className={`text-sm font-medium ${
                                isBalanced ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {isBalanced ? "✓ Balanced" : "⚠ Not Balanced"}
                            </div>
                          </div>
                        </div>

                        {/* Balance Summary */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-sm text-green-600 font-medium">
                              Total Debits
                            </div>
                            <div className="text-xl font-bold text-green-800">
                              {getDefaultCurrency()}
                              {getBatchTotalDebits().toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-red-50 p-4 rounded-lg">
                            <div className="text-sm text-red-600 font-medium">
                              Total Credits
                            </div>
                            <div className="text-xl font-bold text-red-800">
                              {getDefaultCurrency()}
                              {getBatchTotalCredits().toLocaleString()}
                            </div>
                          </div>
                          <div
                            className={`p-4 rounded-lg ${
                              Math.abs(
                                getBatchTotalDebits() - getBatchTotalCredits(),
                              ) < 0.01
                                ? "bg-green-50"
                                : "bg-yellow-50"
                            }`}
                          >
                            <div
                              className={`text-sm font-medium ${
                                Math.abs(
                                  getBatchTotalDebits() -
                                    getBatchTotalCredits(),
                                ) < 0.01
                                  ? "text-green-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              Difference
                            </div>
                            <div
                              className={`text-xl font-bold ${
                                Math.abs(
                                  getBatchTotalDebits() -
                                    getBatchTotalCredits(),
                                ) < 0.01
                                  ? "text-green-800"
                                  : "text-yellow-800"
                              }`}
                            >
                              {getDefaultCurrency()}
                              {Math.abs(
                                getBatchTotalDebits() - getBatchTotalCredits(),
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Batch Entries */}
                        <div className="space-y-4">
                          {batchEntries.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                              <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p>
                                No entries added yet. Click "Add Entry" to
                                start.
                              </p>
                            </div>
                          ) : (
                            batchEntries.map((entry, index) => (
                              <div
                                key={entry.id}
                                className="border rounded-lg p-4 bg-white"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-gray-900">
                                    Entry #{index + 1}
                                  </h4>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeFromBatch(entry.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Account *</Label>
                                    <Select
                                      value={entry.account_code}
                                      onValueChange={(value) =>
                                        updateBatchEntry(
                                          entry.id,
                                          "account_code",
                                          value,
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[200px] overflow-y-auto">
                                        {chartOfAccounts.map((account) => (
                                          <SelectItem
                                            key={account.code}
                                            value={account.code}
                                          >
                                            {account.code} - {account.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Description *</Label>
                                    <Input
                                      value={entry.description}
                                      onChange={(e) =>
                                        updateBatchEntry(
                                          entry.id,
                                          "description",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter description"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-4 mt-4">
                                  <div>
                                    <Label>Debit Amount</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={entry.debit}
                                      onChange={(e) =>
                                        updateBatchEntry(
                                          entry.id,
                                          "debit",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div className="flex items-center justify-center pt-6">
                                    <div className="text-sm text-gray-500 font-medium">
                                      OR
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Credit Amount</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={entry.credit}
                                      onChange={(e) =>
                                        updateBatchEntry(
                                          entry.id,
                                          "credit",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div>
                                    <Label>Reference</Label>
                                    <Input
                                      value={entry.reference_number}
                                      onChange={(e) =>
                                        updateBatchEntry(
                                          entry.id,
                                          "reference_number",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Optional"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Force Submit Option */}
                        {!isBalanced && batchEntries.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id="force_submit"
                                checked={forceSubmit}
                                onChange={(e) =>
                                  setForceSubmit(e.target.checked)
                                }
                                className="rounded"
                              />
                              <Label
                                htmlFor="force_submit"
                                className="text-yellow-800 font-medium"
                              >
                                Force Submit Unbalanced Entries
                              </Label>
                            </div>
                            <p className="text-sm text-yellow-700 mt-2">
                              ⚠ Warning: This will allow you to submit entries
                              where debits do not equal credits. This may cause
                              accounting discrepancies. Only use this if you
                              understand the implications.
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setBatchEntries([]);
                              setBatchDate(
                                new Date().toISOString().split("T")[0],
                              );
                              setIsBalanced(false);
                              setForceSubmit(false);
                              setShowBatchAddDialog(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSubmitBatch}
                            disabled={
                              batchEntries.length === 0 ||
                              (!isBalanced && !forceSubmit)
                            }
                            className={`${!isBalanced && !forceSubmit ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            Submit {batchEntries.length} Entries
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Single Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Ledger Entry</DialogTitle>
                        <DialogDescription>
                          Create a new general ledger entry. Remember: Debits =
                          Credits for balanced books.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="account_code">Account *</Label>
                            <div className="flex gap-2">
                              <Select
                                value={newEntry.account_code}
                                onValueChange={(value) => {
                                  const selectedAccount = chartOfAccounts.find(
                                    (acc) => acc.code === value,
                                  );
                                  setNewEntry({
                                    ...newEntry,
                                    account_code: value,
                                    account_name: selectedAccount?.name || "",
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] overflow-y-auto">
                                  {chartOfAccounts.map((account) => (
                                    <SelectItem
                                      key={account.code}
                                      value={account.code}
                                    >
                                      {account.code} - {account.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setShowAddAccountDialog(true)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="date">Date *</Label>
                            <Input
                              id="date"
                              type="date"
                              value={newEntry.date}
                              onChange={(e) =>
                                setNewEntry({
                                  ...newEntry,
                                  date: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Description *</Label>
                          <Textarea
                            id="description"
                            value={newEntry.description}
                            onChange={(e) =>
                              setNewEntry({
                                ...newEntry,
                                description: e.target.value,
                              })
                            }
                            placeholder="Enter transaction description"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="debit">Debit Amount</Label>
                            <Input
                              id="debit"
                              type="number"
                              step="0.01"
                              value={newEntry.debit}
                              onChange={(e) =>
                                setNewEntry({
                                  ...newEntry,
                                  debit: e.target.value,
                                  credit: "",
                                })
                              }
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex items-center justify-center pt-6">
                            <div className="text-sm text-gray-500 font-medium">
                              OR
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="credit">Credit Amount</Label>
                            <Input
                              id="credit"
                              type="number"
                              step="0.01"
                              value={newEntry.credit}
                              onChange={(e) =>
                                setNewEntry({
                                  ...newEntry,
                                  credit: e.target.value,
                                  debit: "",
                                })
                              }
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="reference_number">
                            Reference Number
                          </Label>
                          <Input
                            id="reference_number"
                            value={newEntry.reference_number}
                            onChange={(e) =>
                              setNewEntry({
                                ...newEntry,
                                reference_number: e.target.value,
                              })
                            }
                            placeholder="Optional reference number"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleAddEntry}>Add Entry</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Entry Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Ledger Entry</DialogTitle>
            <DialogDescription>
              Update the ledger entry details. Remember: Debits = Credits for
              balanced books.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_account_code">Account *</Label>
                <Select
                  value={editingEntry?.account_code || ""}
                  onValueChange={(value) => {
                    if (!editingEntry) return;
                    const selectedAccount = chartOfAccounts.find(
                      (acc) => acc.code === value,
                    );
                    setEditingEntry({
                      ...editingEntry,
                      account_code: value,
                      account_name: selectedAccount?.name || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {chartOfAccounts.map((account) => (
                      <SelectItem key={account.code} value={account.code}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_date">Date *</Label>
                <Input
                  id="edit_date"
                  type="date"
                  value={editingEntry?.date || ""}
                  onChange={(e) => {
                    if (!editingEntry) return;
                    setEditingEntry({ ...editingEntry, date: e.target.value });
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description *</Label>
              <Textarea
                id="edit_description"
                value={editingEntry?.description || ""}
                onChange={(e) => {
                  if (!editingEntry) return;
                  setEditingEntry({
                    ...editingEntry,
                    description: e.target.value,
                  });
                }}
                placeholder="Enter transaction description"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_debit">Debit Amount</Label>
                <Input
                  id="edit_debit"
                  type="number"
                  step="0.01"
                  value={editingEntry?.debit || ""}
                  onChange={(e) => {
                    if (!editingEntry) return;
                    setEditingEntry({
                      ...editingEntry,
                      debit: parseFloat(e.target.value) || 0,
                      credit: 0,
                    });
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-center justify-center pt-6">
                <div className="text-sm text-gray-500 font-medium">OR</div>
              </div>
              <div>
                <Label htmlFor="edit_credit">Credit Amount</Label>
                <Input
                  id="edit_credit"
                  type="number"
                  step="0.01"
                  value={editingEntry?.credit || ""}
                  onChange={(e) => {
                    if (!editingEntry) return;
                    setEditingEntry({
                      ...editingEntry,
                      credit: parseFloat(e.target.value) || 0,
                      debit: 0,
                    });
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_reference_number">Reference Number</Label>
              <Input
                id="edit_reference_number"
                value={editingEntry?.reference_number || ""}
                onChange={(e) => {
                  if (!editingEntry) return;
                  setEditingEntry({
                    ...editingEntry,
                    reference_number: e.target.value,
                  });
                }}
                placeholder="Optional reference number"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingEntry(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateEntry}>Update Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account for the chart of accounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_code_new">Account Code *</Label>
                <Input
                  id="account_code_new"
                  value={newAccount.code}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, code: e.target.value })
                  }
                  placeholder="e.g., 1700"
                  required
                />
              </div>
              <div>
                <Label htmlFor="account_type">Account Type *</Label>
                <div className="flex gap-2">
                  <Select
                    value={newAccount.type}
                    onValueChange={(
                      value:
                        | "asset"
                        | "liability"
                        | "equity"
                        | "revenue"
                        | "expense",
                    ) =>
                      setNewAccount({
                        ...newAccount,
                        type: value,
                        normal_balance:
                          value === "asset" || value === "expense"
                            ? "debit"
                            : "credit",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      {customAccountTypes.map((customType) => (
                        <SelectItem
                          key={customType.id}
                          value={customType.category}
                        >
                          {customType.name} ({customType.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog
                    open={showAddAccountTypeDialog}
                    onOpenChange={setShowAddAccountTypeDialog}
                  >
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Custom Account Type</DialogTitle>
                        <DialogDescription>
                          Create a custom account type for your organization
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="custom_type_name">Type Name *</Label>
                          <Input
                            id="custom_type_name"
                            value={newAccountType.name}
                            onChange={(e) =>
                              setNewAccountType({
                                ...newAccountType,
                                name: e.target.value,
                              })
                            }
                            placeholder="e.g., Fixed Assets, Current Liabilities"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="custom_type_category">
                            Base Category *
                          </Label>
                          <Select
                            value={newAccountType.category}
                            onValueChange={(
                              value:
                                | "asset"
                                | "liability"
                                | "equity"
                                | "revenue"
                                | "expense",
                            ) =>
                              setNewAccountType({
                                ...newAccountType,
                                category: value,
                                normal_balance:
                                  value === "asset" || value === "expense"
                                    ? "debit"
                                    : "credit",
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asset">Asset</SelectItem>
                              <SelectItem value="liability">
                                Liability
                              </SelectItem>
                              <SelectItem value="equity">Equity</SelectItem>
                              <SelectItem value="revenue">Revenue</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                              {customAccountTypes.map((customType) => (
                                <SelectItem
                                  key={customType.id}
                                  value={customType.category}
                                >
                                  {customType.name} ({customType.category})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="custom_type_description">
                            Description
                          </Label>
                          <Textarea
                            id="custom_type_description"
                            value={newAccountType.description}
                            onChange={(e) =>
                              setNewAccountType({
                                ...newAccountType,
                                description: e.target.value,
                              })
                            }
                            placeholder="Brief description of this account type"
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowAddAccountTypeDialog(false);
                              setNewAccountType({
                                name: "",
                                category: "asset",
                                normal_balance: "debit",
                                description: "",
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleAddAccountType}>
                            Add Type
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="account_name_new">Account Name *</Label>
              <Input
                id="account_name_new"
                value={newAccount.name}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, name: e.target.value })
                }
                placeholder="Enter account name"
                required
              />
            </div>

            <div>
              <Label htmlFor="normal_balance">Normal Balance</Label>
              <Select
                value={newAccount.normal_balance}
                onValueChange={(value: "debit" | "credit") =>
                  setNewAccount({ ...newAccount, normal_balance: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddAccountDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddAccount}>Add Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ledger Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>General Ledger Entries</CardTitle>
          <CardDescription>
            Complete record of all financial transactions (
            {getFilteredEntries().length} entries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                {(canEditLedgerSync() || canDeleteLedgerSync()) && (
                  <TableHead>Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredEntries().map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {new Date(entry.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getAccountTypeColor(entry.account_code)}>
                      {entry.account_code}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.account_name}
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>{entry.reference_number || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {entry.debit > 0
                      ? `${getDefaultCurrency()}${entry.debit.toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {entry.credit > 0
                      ? `${getDefaultCurrency()}${entry.credit.toLocaleString()}`
                      : "-"}
                  </TableCell>
                  {(canEditLedgerSync() || canDeleteLedgerSync()) && (
                    <TableCell>
                      <div className="flex gap-1">
                        {canEditLedgerSync() && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => handleEditEntry(entry)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {canDeleteLedgerSync() && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {!canEditLedgerSync() && !canDeleteLedgerSync() && (
                          <span className="text-sm text-gray-500">
                            View Only
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {getFilteredEntries().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No ledger entries found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
