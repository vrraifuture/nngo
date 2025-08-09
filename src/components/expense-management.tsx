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
import { Plus, Edit, Trash2, Eye, FileText } from "lucide-react";
import { createClient } from "../../supabase/client";
import { createExpenseAction, updateExpenseStatusAction } from "@/app/actions";
import {
  canManageExpensesSync,
  canEditExpensesSync,
  canDeleteExpensesSync,
} from "@/utils/permissions";

interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  expense_date: string;
  category: string;
  category_id?: string;
  project_name?: string;
  project_id?: string;
  vendor_name?: string;
  payment_method?: string;
  receipt_url?: string;
  submitted_by?: string;
  notes?: string;
}

interface ExpenseManagementProps {
  userRole: string;
}

export default function ExpenseManagement({
  userRole = "admin",
}: ExpenseManagementProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [fundSources, setFundSources] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "USD",
    expense_date: new Date().toISOString().split("T")[0],
    category: "",
    project: "",
    fund_source: "",
    vendor_name: "",
    payment_method: "",
    notes: "",
  });

  const getDefaultCurrency = () => {
    try {
      const savedDefaultCurrency = localStorage.getItem("ngo_default_currency");
      if (savedDefaultCurrency) {
        const defaultCurrency = JSON.parse(savedDefaultCurrency);
        return {
          code: defaultCurrency.code,
          symbol: defaultCurrency.symbol || "$",
        };
      }
    } catch (error) {
      console.error("Error getting default currency:", error);
    }
    return { code: "USD", symbol: "$" };
  };
  const supabase = createClient();

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchProjects();
    fetchFundSources();
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = () => {
    try {
      const savedPaymentMethods = localStorage.getItem("ngo_payment_methods");
      if (savedPaymentMethods) {
        const methods = JSON.parse(savedPaymentMethods);
        setPaymentMethods(methods.filter((method: any) => method.is_active));
      } else {
        // Default payment methods if none saved
        const defaultMethods = [
          { id: "1", name: "Cash", type: "cash", is_active: true },
          {
            id: "2",
            name: "Bank Transfer",
            type: "bank_transfer",
            is_active: true,
          },
          {
            id: "3",
            name: "Credit Card",
            type: "credit_card",
            is_active: true,
          },
          { id: "4", name: "MOMO Pay", type: "mobile_money", is_active: true },
        ];
        setPaymentMethods(defaultMethods);
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      console.log("Fetching expenses...");

      // First, get all expenses with basic data
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (expensesError) {
        console.error("Error fetching expenses:", expensesError);
        // Don't set empty array immediately, try to show what we have
        alert("Error loading expenses: " + expensesError.message);
        setExpenses([]);
        return;
      }

      console.log("Raw expenses data:", expensesData);

      if (!expensesData || expensesData.length === 0) {
        console.log("No expenses found in database");
        setExpenses([]);
        return;
      }

      // Get categories and projects separately to avoid join issues
      const [categoriesData, projectsData, usersData] = await Promise.all([
        supabase.from("budget_categories").select("id, name"),
        supabase.from("projects").select("id, name"),
        supabase.from("users").select("id, full_name"),
      ]);

      // Create lookup maps
      const categoryMap = new Map();
      const projectMap = new Map();
      const userMap = new Map();

      if (categoriesData.data) {
        categoriesData.data.forEach((cat) => categoryMap.set(cat.id, cat.name));
      }
      if (projectsData.data) {
        projectsData.data.forEach((proj) => projectMap.set(proj.id, proj.name));
      }
      if (usersData.data) {
        usersData.data.forEach((user) => userMap.set(user.id, user.full_name));
      }

      // Format expenses with resolved names
      const formattedExpenses: Expense[] = expensesData.map((expense) => ({
        ...expense,
        category: expense.category_id
          ? categoryMap.get(expense.category_id) || "Uncategorized"
          : "Uncategorized",
        project_name: expense.project_id
          ? projectMap.get(expense.project_id) || "General"
          : "General",
        submitted_by: expense.submitted_by
          ? userMap.get(expense.submitted_by) || "Unknown User"
          : "Unknown User",
      }));

      console.log("Formatted expenses:", formattedExpenses);
      setExpenses(formattedExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      alert("Failed to load expenses. Please check the console for details.");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchFundSources = async () => {
    try {
      const { data, error } = await supabase
        .from("fund_sources")
        .select("id, name, amount, is_restricted")
        .in("status", ["received", "partially_used"])
        .order("name");

      if (error) throw error;
      setFundSources(data || []);
    } catch (error) {
      console.error("Error fetching fund sources:", error);
    }
  };

  const handleSubmitExpense = async (formData: FormData) => {
    try {
      // Create expense directly using supabase client
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You must be logged in to create expenses");
        return;
      }

      const title = formData.get("title")?.toString();
      const description = formData.get("description")?.toString();
      const amount = parseFloat(formData.get("amount")?.toString() || "0");
      const currency = formData.get("currency")?.toString() || "USD";
      const expense_date = formData.get("expense_date")?.toString();
      const category_id = formData.get("category_id")?.toString();
      const project_id = formData.get("project_id")?.toString();
      const fund_source_id = formData.get("fund_source_id")?.toString();
      const vendor_name = formData.get("vendor_name")?.toString();
      const payment_method = formData.get("payment_method")?.toString();
      const notes = formData.get("notes")?.toString();

      if (!title || !amount || !expense_date) {
        alert("Title, amount, and expense date are required");
        return;
      }

      const { error } = await supabase.from("expenses").insert({
        title,
        description: description || null,
        amount,
        currency,
        expense_date,
        category_id:
          category_id &&
          category_id.trim() !== "" &&
          category_id !== "no_category"
            ? category_id
            : null,
        project_id:
          project_id && project_id.trim() !== "" && project_id !== "no_project"
            ? project_id
            : null,
        fund_source_id:
          fund_source_id &&
          fund_source_id.trim() !== "" &&
          fund_source_id !== "no_fund"
            ? fund_source_id
            : null,
        vendor_name: vendor_name || null,
        payment_method: payment_method || null,
        notes: notes || null,
        submitted_by: user.id,
      });

      if (error) {
        console.error("Error creating expense:", error);
        alert("Failed to create expense. Please try again.");
        return;
      }

      // Close dialog and reset form
      setShowAddForm(false);
      setNewExpense({
        title: "",
        description: "",
        amount: "",
        currency: "USD",
        expense_date: new Date().toISOString().split("T")[0],
        category: "",
        project: "",
        fund_source: "",
        vendor_name: "",
        payment_method: "",
        notes: "",
      });

      // Show success message first
      alert("Expense added successfully!");

      // Add a small delay to ensure database consistency
      setTimeout(async () => {
        await fetchExpenses();
      }, 500);

      // Also trigger an immediate refresh
      await fetchExpenses();
    } catch (error) {
      console.error("Error submitting expense:", error);
      alert("Failed to submit expense. Please try again.");
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowEditForm(true);
  };

  const handleUpdateExpense = async (formData: FormData) => {
    try {
      if (!editingExpense) return;

      const title = formData.get("title")?.toString();
      const description = formData.get("description")?.toString();
      const amount = parseFloat(formData.get("amount")?.toString() || "0");
      const currency = formData.get("currency")?.toString() || "USD";
      const expense_date = formData.get("expense_date")?.toString();
      const category_id = formData.get("category_id")?.toString();
      const project_id = formData.get("project_id")?.toString();
      const vendor_name = formData.get("vendor_name")?.toString();
      const payment_method = formData.get("payment_method")?.toString();
      const notes = formData.get("notes")?.toString();

      if (!title || !amount || !expense_date) {
        alert("Title, amount, and expense date are required");
        return;
      }

      const { error } = await supabase
        .from("expenses")
        .update({
          title,
          description: description || null,
          amount,
          currency,
          expense_date,
          category_id:
            category_id &&
            category_id.trim() !== "" &&
            category_id !== "no_category"
              ? category_id
              : null,
          project_id:
            project_id &&
            project_id.trim() !== "" &&
            project_id !== "no_project"
              ? project_id
              : null,
          vendor_name: vendor_name || null,
          payment_method: payment_method || null,
          notes: notes || null,
        })
        .eq("id", editingExpense.id);

      if (error) {
        console.error("Error updating expense:", error);
        alert("Failed to update expense. Please try again.");
        return;
      }

      // Close dialog and reset form
      setShowEditForm(false);
      setEditingExpense(null);

      // Show success message first
      alert("Expense updated successfully!");

      // Add a small delay to ensure database consistency
      setTimeout(async () => {
        await fetchExpenses();
      }, 500);

      // Also trigger an immediate refresh
      await fetchExpenses();
    } catch (error) {
      console.error("Error updating expense:", error);
      alert("Failed to update expense. Please try again.");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this expense? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) {
        console.error("Error deleting expense:", error);
        alert("Failed to delete expense. Please try again.");
        return;
      }

      // Show success message first
      alert("Expense deleted successfully!");

      // Add a small delay to ensure database consistency
      setTimeout(async () => {
        await fetchExpenses();
      }, 500);

      // Also trigger an immediate refresh
      await fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Failed to delete expense. Please try again.");
    }
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getExpenseCount = () => {
    return expenses.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-gray-500">Loading expense data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {getDefaultCurrency().symbol}
              {getTotalExpenses().toLocaleString()}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {getExpenseCount()} total expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Average Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {getDefaultCurrency().symbol}
              {getExpenseCount() > 0
                ? (getTotalExpenses() / getExpenseCount()).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 2 },
                  )
                : "0"}
            </div>
            <p className="text-xs text-green-700 mt-1">per expense entry</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button
                  className="flex items-center gap-2"
                  disabled={!canManageExpensesSync()}
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Add a new expense to your records
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    await handleSubmitExpense(formData);
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Expense Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        defaultValue={newExpense.title}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        defaultValue={newExpense.amount}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={newExpense.description}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        name="currency"
                        defaultValue={getDefaultCurrency().code}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="RWF">RWF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expense_date">Expense Date *</Label>
                      <Input
                        id="expense_date"
                        name="expense_date"
                        type="date"
                        defaultValue={newExpense.expense_date}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category_id">Category</Label>
                      <Select
                        name="category_id"
                        defaultValue={
                          editingExpense?.category_id || "no_category"
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_category">
                            No Category
                          </SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="project_id">Project</Label>
                      <Select
                        name="project_id"
                        defaultValue={
                          editingExpense?.project_id || "no_project"
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_project">No Project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="fund_source_id">Fund Source</Label>
                      <Select name="fund_source_id" defaultValue="no_fund">
                        <SelectTrigger>
                          <SelectValue placeholder="Select fund source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_fund">
                            No Specific Fund
                          </SelectItem>
                          {fundSources.map((fund) => (
                            <SelectItem key={fund.id} value={fund.id}>
                              {fund.name} (
                              {fund.is_restricted
                                ? "Restricted"
                                : "Unrestricted"}
                              )
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendor_name">Vendor Name</Label>
                      <Input
                        id="vendor_name"
                        name="vendor_name"
                        defaultValue={newExpense.vendor_name}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select
                        name="payment_method"
                        defaultValue={
                          paymentMethods[0]?.name
                            .toLowerCase()
                            .replace(" ", "_") || "cash"
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem
                              key={method.id}
                              value={method.name
                                .toLowerCase()
                                .replace(" ", "_")}
                            >
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={newExpense.notes}
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add Expense</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {!canManageExpensesSync() && (
              <div className="text-sm text-gray-500">
                You don't have permission to add expenses. Contact your
                administrator.
                <div className="text-xs text-gray-400 mt-1">
                  Current role: {userRole} | Debug: Check console for permission
                  details
                </div>
              </div>
            )}

            {/* Debug information for admin users */}
            {userRole === "admin" && (
              <div className="text-xs text-blue-600 mt-2">
                Debug: Admin role detected. Permission check result:{" "}
                {canManageExpensesSync().toString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the expense details</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await handleUpdateExpense(formData);
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_title">Expense Title *</Label>
                <Input
                  id="edit_title"
                  name="title"
                  defaultValue={editingExpense?.title || ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_amount">Amount *</Label>
                <Input
                  id="edit_amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingExpense?.amount || ""}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                name="description"
                defaultValue={editingExpense?.description || ""}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_currency">Currency</Label>
                <Select
                  name="currency"
                  defaultValue={editingExpense?.currency || "USD"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="RWF">RWF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_expense_date">Expense Date *</Label>
                <Input
                  id="edit_expense_date"
                  name="expense_date"
                  type="date"
                  defaultValue={editingExpense?.expense_date || ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_category_id">Category</Label>
                <Select
                  name="category_id"
                  defaultValue={editingExpense?.category_id || "no_category"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_category">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_project_id">Project</Label>
                <Select
                  name="project_id"
                  defaultValue={editingExpense?.project_id || "no_project"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_project">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_vendor_name">Vendor Name</Label>
                <Input
                  id="edit_vendor_name"
                  name="vendor_name"
                  defaultValue={editingExpense?.vendor_name || ""}
                />
              </div>
              <div>
                <Label htmlFor="edit_payment_method">Payment Method</Label>
                <Select
                  name="payment_method"
                  defaultValue={editingExpense?.payment_method || "cash"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem
                        key={method.id}
                        value={method.name.toLowerCase().replace(" ", "_")}
                      >
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_notes">Additional Notes</Label>
              <Textarea
                id="edit_notes"
                name="notes"
                defaultValue={editingExpense?.notes || ""}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingExpense(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>{expenses.length} total expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Submitted By</TableHead>
                {(canEditExpensesSync() || canDeleteExpensesSync()) && (
                  <TableHead>Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{expense.title}</div>
                      {expense.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {expense.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {expense.currency === getDefaultCurrency().code
                      ? getDefaultCurrency().symbol
                      : expense.currency}
                    {expense.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{expense.vendor_name || "-"}</TableCell>
                  <TableCell>{expense.project_name || "-"}</TableCell>
                  <TableCell>{expense.submitted_by}</TableCell>
                  {(canEditExpensesSync() || canDeleteExpensesSync()) && (
                    <TableCell>
                      <div className="flex gap-1">
                        {canEditExpensesSync() && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {canDeleteExpensesSync() && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {expense.receipt_url && (
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        {!canEditExpensesSync() && !canDeleteExpensesSync() && (
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

          {expenses.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No expenses have been added yet. Click 'Add Expense' to create
              your first expense.
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                Loading expenses...
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
