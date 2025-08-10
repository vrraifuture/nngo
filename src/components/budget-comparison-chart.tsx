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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { createClient } from "../../supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createBudgetAction } from "@/app/actions";
import {
  canManageBudgetsSync,
  canEditBudgetsSync,
  canDeleteBudgetsSync,
} from "@/utils/permissions";

interface Project {
  id: string;
  name: string;
}

interface BudgetData {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

interface BudgetComparisonChartProps {
  userRole: string;
}

export default function BudgetComparisonChart({
  userRole = "admin",
}: BudgetComparisonChartProps) {
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("current_year");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddBudgetDialog, setShowAddBudgetDialog] = useState(false);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [showEditBudgetDialog, setShowEditBudgetDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
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

  useEffect(() => {
    fetchBudgetData();
    fetchProjects();
    fetchCategories();
    fetchBudgets();
  }, [selectedProject, selectedTimeframe]);

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

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select(
          `
          *,
          budget_categories(name),
          projects(name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      setBudgets([]);
    }
  };

  const handleEditBudget = (budget: any) => {
    setEditingBudget(budget);
    setShowEditBudgetDialog(true);
  };

  const handleUpdateBudget = async (formData: FormData) => {
    try {
      if (!editingBudget) return;

      const name = formData.get("name")?.toString();
      const planned_amount = parseFloat(
        formData.get("planned_amount")?.toString() || "0",
      );
      const currency = formData.get("currency")?.toString() || "USD";
      const category_id = formData.get("category_id")?.toString();
      const project_id = formData.get("project_id")?.toString();
      const period_start = formData.get("period_start")?.toString();
      const period_end = formData.get("period_end")?.toString();
      const notes = formData.get("notes")?.toString();

      if (!name || !planned_amount) {
        alert("Budget name and planned amount are required");
        return;
      }

      const { error } = await supabase
        .from("budgets")
        .update({
          name,
          planned_amount,
          currency,
          category_id: category_id || null,
          project_id: project_id || null,
          period_start: period_start || null,
          period_end: period_end || null,
          notes: notes || null,
        })
        .eq("id", editingBudget.id);

      if (error) {
        console.error("Error updating budget:", error);
        alert("Failed to update budget. Please try again.");
        return;
      }

      setShowEditBudgetDialog(false);
      setEditingBudget(null);
      alert("Budget updated successfully!");
      await fetchBudgets();
      await fetchBudgetData();
    } catch (error) {
      console.error("Error updating budget:", error);
      alert("Failed to update budget. Please try again.");
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this budget? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (error) {
        console.error("Error deleting budget:", error);
        alert("Failed to delete budget. Please try again.");
        return;
      }

      alert("Budget deleted successfully!");
      await fetchBudgets();
      await fetchBudgetData();
    } catch (error) {
      console.error("Error deleting budget:", error);
      alert("Failed to delete budget. Please try again.");
    }
  };

  const fetchBudgetData = async () => {
    try {
      console.log("Fetching budget data...");

      // Try to fetch from database
      let budgetQuery = supabase.from("budgets").select(`
          *,
          budget_categories(name)
        `);

      // Apply project filter if selected
      if (selectedProject !== "all") {
        budgetQuery = budgetQuery.eq("project_id", selectedProject);
      }

      const { data: budgets, error: budgetError } = await budgetQuery;

      if (budgetError) {
        console.error("Budget fetch error:", budgetError);
        // Use fallback sample data for demonstration
        const sampleData: BudgetData[] = [
          {
            category: "Program Expenses",
            planned: 50000,
            actual: 45000,
            variance: -5000,
            variancePercent: -10,
          },
          {
            category: "Administrative",
            planned: 25000,
            actual: 28000,
            variance: 3000,
            variancePercent: 12,
          },
          {
            category: "Personnel",
            planned: 80000,
            actual: 75000,
            variance: -5000,
            variancePercent: -6.25,
          },
        ];
        setBudgetData(sampleData);
        setLoading(false);
        return;
      }

      // Fetch expenses with a simpler query to avoid join issues
      let expenseQuery = supabase
        .from("expenses")
        .select("amount, category_id, project_id, status")
        .in("status", ["approved", "paid", "pending"]); // Include more statuses

      // Apply project filter if selected
      if (selectedProject !== "all") {
        expenseQuery = expenseQuery.eq("project_id", selectedProject);
      }

      const { data: expenses, error: expenseError } = await expenseQuery;

      if (expenseError) {
        console.error("Expense fetch error:", expenseError);
      }

      console.log("Budget data:", budgets);
      console.log("Expense data:", expenses);

      // Also fetch categories separately for mapping
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("budget_categories")
        .select("id, name");

      if (categoriesError) {
        console.error("Categories fetch error:", categoriesError);
      }

      console.log("Categories data:", categoriesData);

      // Group budgets by category
      const budgetsByCategory = new Map();

      // Process budgets
      if (budgets && budgets.length > 0) {
        budgets.forEach((budget: any) => {
          let categoryName = "Uncategorized";

          // Safely extract category name with proper type checking
          if (budget.budget_categories) {
            if (Array.isArray(budget.budget_categories)) {
              categoryName =
                budget.budget_categories[0]?.name || "Uncategorized";
            } else if (
              typeof budget.budget_categories === "object" &&
              budget.budget_categories.name
            ) {
              categoryName = budget.budget_categories.name;
            }
          }

          if (!budgetsByCategory.has(categoryName)) {
            budgetsByCategory.set(categoryName, { planned: 0, actual: 0 });
          }
          const current = budgetsByCategory.get(categoryName);
          budgetsByCategory.set(categoryName, {
            ...current,
            planned: current.planned + (budget.planned_amount || 0),
          });
        });
      }

      // Process expenses to calculate actual amounts by category
      if (expenses && expenses.length > 0 && categoriesData) {
        // Create category lookup map
        const categoryLookup = new Map();
        categoriesData.forEach((cat: any) => {
          categoryLookup.set(cat.id, cat.name);
        });

        expenses.forEach((expense: any) => {
          let categoryName = "Uncategorized";

          // Get category name from lookup map using category_id
          if (expense.category_id && categoryLookup.has(expense.category_id)) {
            categoryName = categoryLookup.get(expense.category_id);
          }

          console.log(
            `Processing expense: ${expense.amount} for category: ${categoryName}`,
          );

          // If category doesn't exist in budgets, create it
          if (!budgetsByCategory.has(categoryName)) {
            budgetsByCategory.set(categoryName, { planned: 0, actual: 0 });
          }

          const current = budgetsByCategory.get(categoryName);
          budgetsByCategory.set(categoryName, {
            ...current,
            actual: current.actual + (expense.amount || 0),
          });
        });
      }

      console.log(
        "Final budgetsByCategory map:",
        Array.from(budgetsByCategory.entries()),
      );

      // If no data from database, use sample data
      if (budgetsByCategory.size === 0) {
        const sampleData: BudgetData[] = [
          {
            category: "Program Expenses",
            planned: 50000,
            actual: 45000,
            variance: -5000,
            variancePercent: -10,
          },
          {
            category: "Administrative",
            planned: 25000,
            actual: 28000,
            variance: 3000,
            variancePercent: 12,
          },
          {
            category: "Personnel",
            planned: 80000,
            actual: 75000,
            variance: -5000,
            variancePercent: -6.25,
          },
        ];
        setBudgetData(sampleData);
        setLoading(false);
        return;
      }

      // Convert to array format
      const formattedData: BudgetData[] = Array.from(
        budgetsByCategory.entries(),
      ).map(([category, data]) => {
        const variance = data.actual - data.planned;
        const variancePercent =
          data.planned > 0 ? (variance / data.planned) * 100 : 0;
        return {
          category,
          planned: data.planned,
          actual: data.actual,
          variance,
          variancePercent,
        };
      });

      console.log("Final formatted data:", formattedData);
      setBudgetData(formattedData);
    } catch (error) {
      console.error("Error fetching budget data:", error);
      // Use fallback sample data
      const sampleData: BudgetData[] = [
        {
          category: "Program Expenses",
          planned: 50000,
          actual: 45000,
          variance: -5000,
          variancePercent: -10,
        },
        {
          category: "Administrative",
          planned: 25000,
          actual: 28000,
          variance: 3000,
          variancePercent: 12,
        },
        {
          category: "Personnel",
          planned: 80000,
          actual: 75000,
          variance: -5000,
          variancePercent: -6.25,
        },
      ];
      setBudgetData(sampleData);
    } finally {
      setLoading(false);
    }
  };

  const getTotalPlanned = () =>
    budgetData.reduce((sum, item) => sum + item.planned, 0);
  const getTotalActual = () =>
    budgetData.reduce((sum, item) => sum + item.actual, 0);
  const getTotalVariance = () =>
    budgetData.reduce((sum, item) => sum + item.variance, 0);
  const getTotalVariancePercent = () => {
    const totalPlanned = getTotalPlanned();
    return totalPlanned > 0 ? (getTotalVariance() / totalPlanned) * 100 : 0;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-red-600";
    if (variance < 0) return "text-green-600";
    return "text-gray-600";
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (variance < 0)
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    return null;
  };

  const exportData = () => {
    const csvContent = [
      ["Category", "Planned", "Actual", "Variance", "Variance %"],
      ...budgetData.map((item) => [
        item.category,
        item.planned.toString(),
        item.actual.toString(),
        item.variance.toString(),
        item.variancePercent.toFixed(1) + "%",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget-comparison.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      alert("Please select an Excel file to import.");
      return;
    }

    setImportLoading(true);

    try {
      // Dynamically import xlsx library
      const XLSX = await import("xlsx");

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Get the first worksheet
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as any[][];

          if (jsonData.length < 2) {
            alert(
              "Excel file must contain at least a header row and one data row.",
            );
            setImportLoading(false);
            return;
          }

          // Expected format: [Budget Name, Category, Project, Planned Amount, Currency, Period Start, Period End, Notes]
          const headers = jsonData[0];
          const expectedHeaders = [
            "Budget Name",
            "Category",
            "Project",
            "Planned Amount",
            "Currency",
            "Period Start",
            "Period End",
            "Notes",
          ];

          // Validate headers (flexible matching)
          const hasRequiredHeaders = ["Budget Name", "Planned Amount"].every(
            (required) =>
              headers.some(
                (header: string) =>
                  header &&
                  header.toLowerCase().includes(required.toLowerCase()),
              ),
          );

          if (!hasRequiredHeaders) {
            alert(
              `Excel file must contain at least 'Budget Name' and 'Planned Amount' columns.\n\nExpected format:\n${expectedHeaders.join(", ")}`,
            );
            setImportLoading(false);
            return;
          }

          // Find column indices
          const getColumnIndex = (searchTerm: string) => {
            return headers.findIndex(
              (header: string) =>
                header &&
                header.toLowerCase().includes(searchTerm.toLowerCase()),
            );
          };

          const nameIndex =
            getColumnIndex("budget name") || getColumnIndex("name");
          const categoryIndex = getColumnIndex("category");
          const projectIndex = getColumnIndex("project");
          const amountIndex =
            getColumnIndex("planned amount") || getColumnIndex("amount");
          const currencyIndex = getColumnIndex("currency");
          const startDateIndex =
            getColumnIndex("period start") || getColumnIndex("start");
          const endDateIndex =
            getColumnIndex("period end") || getColumnIndex("end");
          const notesIndex = getColumnIndex("notes");

          // Process data rows
          const budgetsToImport = [];
          const errors = [];

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];

            if (!row[nameIndex] || !row[amountIndex]) {
              errors.push(
                `Row ${i + 1}: Missing budget name or planned amount`,
              );
              continue;
            }

            const plannedAmount = parseFloat(row[amountIndex]);
            if (isNaN(plannedAmount) || plannedAmount <= 0) {
              errors.push(`Row ${i + 1}: Invalid planned amount`);
              continue;
            }

            // Find category ID if category name is provided
            let categoryId = null;
            if (categoryIndex >= 0 && row[categoryIndex]) {
              const category = categories.find(
                (cat) =>
                  cat.name.toLowerCase() === row[categoryIndex].toLowerCase(),
              );
              categoryId = category?.id || null;
            }

            // Find project ID if project name is provided
            let projectId = null;
            if (projectIndex >= 0 && row[projectIndex]) {
              const project = projects.find(
                (proj) =>
                  proj.name.toLowerCase() === row[projectIndex].toLowerCase(),
              );
              projectId = project?.id || null;
            }

            budgetsToImport.push({
              name: row[nameIndex],
              planned_amount: plannedAmount,
              currency:
                currencyIndex >= 0 && row[currencyIndex]
                  ? row[currencyIndex]
                  : "USD",
              category_id: categoryId,
              project_id: projectId,
              period_start:
                startDateIndex >= 0 && row[startDateIndex]
                  ? new Date(row[startDateIndex]).toISOString().split("T")[0]
                  : null,
              period_end:
                endDateIndex >= 0 && row[endDateIndex]
                  ? new Date(row[endDateIndex]).toISOString().split("T")[0]
                  : null,
              notes:
                notesIndex >= 0 && row[notesIndex] ? row[notesIndex] : null,
            });
          }

          if (errors.length > 0) {
            alert(
              `Import completed with errors:\n${errors.join("\n")}\n\n${budgetsToImport.length} budgets will be imported.`,
            );
          }

          if (budgetsToImport.length === 0) {
            alert("No valid budget data found to import.");
            setImportLoading(false);
            return;
          }

          // Import budgets to database
          const { error } = await supabase
            .from("budgets")
            .insert(budgetsToImport);

          if (error) {
            console.error("Error importing budgets:", error);
            alert(`Failed to import budgets: ${error.message}`);
          } else {
            alert(`Successfully imported ${budgetsToImport.length} budgets!`);
            await fetchBudgets();
            await fetchBudgetData();
            setShowImportDialog(false);
            setImportFile(null);
          }
        } catch (parseError) {
          console.error("Error parsing Excel file:", parseError);
          alert(
            "Error parsing Excel file. Please ensure it's a valid Excel file with the correct format.",
          );
        } finally {
          setImportLoading(false);
        }
      };

      reader.onerror = () => {
        alert("Error reading file. Please try again.");
        setImportLoading(false);
      };

      reader.readAsArrayBuffer(importFile);
    } catch (error) {
      console.error("Error importing Excel file:", error);
      alert("Error importing Excel file. Please try again.");
      setImportLoading(false);
    }
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      [
        "Budget Name",
        "Category",
        "Project",
        "Planned Amount",
        "Currency",
        "Period Start",
        "Period End",
        "Notes",
      ],
      [
        "Sample Program Budget",
        "Program Expenses",
        "Education Project",
        "50000",
        "USD",
        "2024-01-01",
        "2024-12-31",
        "Annual program budget",
      ],
      [
        "Administrative Budget",
        "Administrative",
        "",
        "25000",
        "USD",
        "2024-01-01",
        "2024-12-31",
        "General admin expenses",
      ],
      [
        "Personnel Budget",
        "Personnel",
        "Education Project",
        "80000",
        "USD",
        "2024-01-01",
        "2024-12-31",
        "Staff salaries and benefits",
      ],
    ];

    const csvContent = templateData.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget-import-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const COLORS = [
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#6B7280",
  ];

  const pieData = budgetData
    .filter((item) => item.actual > 0) // Only show categories with actual spending
    .map((item) => ({
      name: item.category,
      value: item.actual,
      planned: item.planned,
      percentage: ((item.actual / getTotalActual()) * 100).toFixed(1),
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-gray-500">Loading budget data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Total Planned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {getDefaultCurrency()}
              {getTotalPlanned().toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Total Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {getDefaultCurrency()}
              {getTotalActual().toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              Total Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getVarianceColor(getTotalVariance())}`}
            >
              {getDefaultCurrency()}
              {Math.abs(getTotalVariance()).toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {getVarianceIcon(getTotalVariance())}
              <span
                className={`text-xs ${getVarianceColor(getTotalVariance())}`}
              >
                {getTotalVariancePercent().toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">
              Budget Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {((getTotalActual() / getTotalPlanned()) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-orange-700 mt-1">
              of planned budget used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Analysis Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Project:</label>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Timeframe:</label>
                <Select
                  value={selectedTimeframe}
                  onValueChange={setSelectedTimeframe}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_year">Current Year</SelectItem>
                    <SelectItem value="last_quarter">Last Quarter</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">View:</label>
                <Select
                  value={chartType}
                  onValueChange={(value: "bar" | "pie") => setChartType(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={exportData} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>

              {canManageBudgetsSync() && (
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
                        Import Excel
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileSpreadsheet className="h-5 w-5" />
                          Import Budget Data from Excel
                        </DialogTitle>
                        <DialogDescription>
                          Upload an Excel file to import multiple budget entries
                          at once.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="excel-file">Select Excel File</Label>
                          <Input
                            id="excel-file"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) =>
                              setImportFile(e.target.files?.[0] || null)
                            }
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Supported formats: .xlsx, .xls, .csv
                          </p>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">
                            Expected Format:
                          </h4>
                          <p className="text-xs text-blue-800 mb-2">
                            Your Excel file should have these columns:
                          </p>
                          <ul className="text-xs text-blue-700 space-y-1">
                            <li>
                              • <strong>Budget Name</strong> (required)
                            </li>
                            <li>
                              • <strong>Category</strong> (optional)
                            </li>
                            <li>
                              • <strong>Project</strong> (optional)
                            </li>
                            <li>
                              • <strong>Planned Amount</strong> (required)
                            </li>
                            <li>
                              • <strong>Currency</strong> (optional, defaults to
                              USD)
                            </li>
                            <li>
                              • <strong>Period Start</strong> (optional,
                              YYYY-MM-DD)
                            </li>
                            <li>
                              • <strong>Period End</strong> (optional,
                              YYYY-MM-DD)
                            </li>
                            <li>
                              • <strong>Notes</strong> (optional)
                            </li>
                          </ul>
                        </div>

                        <div className="flex justify-between items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={downloadExcelTemplate}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download Template
                          </Button>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowImportDialog(false);
                              setImportFile(null);
                            }}
                            disabled={importLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleImportExcel}
                            disabled={!importFile || importLoading}
                          >
                            {importLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                Importing...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3 mr-2" />
                                Import
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={showAddBudgetDialog}
                    onOpenChange={setShowAddBudgetDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Budget
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Budget</DialogTitle>
                        <DialogDescription>
                          Create a new budget plan for tracking expenses
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        action={createBudgetAction}
                        className="space-y-4"
                        onSubmit={() => {
                          setTimeout(async () => {
                            await fetchBudgets();
                            await fetchBudgetData();
                            setShowAddBudgetDialog(false);
                          }, 1000);
                        }}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="budget_name">Budget Name *</Label>
                            <Input
                              id="budget_name"
                              name="name"
                              placeholder="Enter budget name"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="planned_amount">
                              Planned Amount *
                            </Label>
                            <Input
                              id="planned_amount"
                              name="planned_amount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="budget_currency">Currency</Label>
                            <Select
                              name="currency"
                              defaultValue={
                                getDefaultCurrency().replace(/[^A-Z]/g, "") ||
                                "USD"
                              }
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
                            <Label htmlFor="budget_category_id">Category</Label>
                            <Select name="category_id">
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem
                                    key={category.id}
                                    value={category.id}
                                  >
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="budget_project_id">Project</Label>
                            <Select name="project_id">
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                              <SelectContent>
                                {projects.map((project) => (
                                  <SelectItem
                                    key={project.id}
                                    value={project.id}
                                  >
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="period_start">Period Start</Label>
                            <Input
                              id="period_start"
                              name="period_start"
                              type="date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="period_end">Period End</Label>
                            <Input
                              id="period_end"
                              name="period_end"
                              type="date"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="budget_notes">Notes</Label>
                          <Textarea
                            id="budget_notes"
                            name="notes"
                            placeholder="Additional notes about this budget..."
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddBudgetDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Create Budget</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Budget Dialog */}
      <Dialog
        open={showEditBudgetDialog}
        onOpenChange={setShowEditBudgetDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>Update the budget details</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await handleUpdateBudget(formData);
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_budget_name">Budget Name *</Label>
                <Input
                  id="edit_budget_name"
                  name="name"
                  defaultValue={editingBudget?.name || ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_planned_amount">Planned Amount *</Label>
                <Input
                  id="edit_planned_amount"
                  name="planned_amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingBudget?.planned_amount || ""}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_budget_currency">Currency</Label>
                <Select
                  name="currency"
                  defaultValue={editingBudget?.currency || "USD"}
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
                <Label htmlFor="edit_budget_category_id">Category</Label>
                <Select
                  name="category_id"
                  defaultValue={editingBudget?.category_id || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_budget_project_id">Project</Label>
                <Select
                  name="project_id"
                  defaultValue={editingBudget?.project_id || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_period_start">Period Start</Label>
                <Input
                  id="edit_period_start"
                  name="period_start"
                  type="date"
                  defaultValue={editingBudget?.period_start || ""}
                />
              </div>
              <div>
                <Label htmlFor="edit_period_end">Period End</Label>
                <Input
                  id="edit_period_end"
                  name="period_end"
                  type="date"
                  defaultValue={editingBudget?.period_end || ""}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_budget_notes">Notes</Label>
              <Textarea
                id="edit_budget_notes"
                name="notes"
                defaultValue={editingBudget?.notes || ""}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditBudgetDialog(false);
                  setEditingBudget(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Budget</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Budgets Management */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Manage individual budget entries</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Planned Amount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium">{budget.name}</TableCell>
                  <TableCell>{budget.budget_categories?.name || "-"}</TableCell>
                  <TableCell>{budget.projects?.name || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {budget.currency ===
                    getDefaultCurrency().replace(/[^A-Z]/g, "")
                      ? getDefaultCurrency()
                      : budget.currency}
                    {budget.planned_amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {budget.period_start && budget.period_end
                      ? `${new Date(budget.period_start).toLocaleDateString()} - ${new Date(budget.period_end).toLocaleDateString()}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {canEditBudgetsSync() && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleEditBudget(budget)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {canDeleteBudgetsSync() && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteBudget(budget.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      {!canEditBudgetsSync() && !canDeleteBudgetsSync() && (
                        <span className="text-sm text-gray-500">View Only</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {budgets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No budgets have been created yet. Click 'Add Budget' to create
              your first budget.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual Comparison</CardTitle>
          <CardDescription>
            Visual comparison of planned budget against actual expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {chartType === "bar" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={budgetData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      `${getDefaultCurrency()}${(value / 1000).toFixed(0)}k`
                    }
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${getDefaultCurrency()}${value.toLocaleString()}`,
                      name === "planned" ? "Planned" : "Actual",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="planned" fill="#3B82F6" name="Planned" />
                  <Bar dataKey="actual" fill="#10B981" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) =>
                      pieData.length > 0 ? `${name}: ${percentage}%` : ""
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${getDefaultCurrency()}${value.toLocaleString()}`,
                      "Actual Spent",
                    ]}
                    labelFormatter={(label) => `Category: ${label}`}
                  />
                  {pieData.length === 0 && (
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-gray-500"
                    >
                      No data available for pie chart
                    </text>
                  )}
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Variance Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Variance Analysis
          </CardTitle>
          <CardDescription>
            Detailed breakdown of budget variances by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Category</th>
                  <th className="text-right p-2 font-medium">Planned</th>
                  <th className="text-right p-2 font-medium">Actual</th>
                  <th className="text-right p-2 font-medium">Variance</th>
                  <th className="text-right p-2 font-medium">Variance %</th>
                  <th className="text-center p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {budgetData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{item.category}</td>
                    <td className="p-2 text-right">
                      {getDefaultCurrency()}
                      {item.planned.toLocaleString()}
                    </td>
                    <td className="p-2 text-right">
                      {getDefaultCurrency()}
                      {item.actual.toLocaleString()}
                    </td>
                    <td
                      className={`p-2 text-right font-semibold ${getVarianceColor(item.variance)}`}
                    >
                      {getDefaultCurrency()}
                      {Math.abs(item.variance).toLocaleString()}
                    </td>
                    <td
                      className={`p-2 text-right font-semibold ${getVarianceColor(item.variance)}`}
                    >
                      {item.variancePercent.toFixed(1)}%
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center">
                        {getVarianceIcon(item.variance)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
