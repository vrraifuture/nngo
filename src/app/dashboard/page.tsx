"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  PieChart,
} from "lucide-react";
import { createClient } from "../../supabase/client";

interface ReportGenerationProps {
  userRole: string;
}

interface Report {
  id: string;
  title: string;
  type: string;
  generated_at: string;
  status: string;
  size: string;
}

interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  status: string;
  budget_categories?: {
    name: string;
  };
}

interface FundData {
  id: string;
  donor_name: string;
  amount: number;
  received_date: string;
  status: string;
}

interface BudgetData {
  id: string;
  category_name: string;
  allocated_amount: number;
  spent_amount: number;
  period_start: string;
  period_end: string;
}

export default function ReportGeneration({ userRole }: ReportGenerationProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] =
    useState<string>("financial_summary");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current_month");

  const supabase = createClient();

  const reportTypes = [
    {
      value: "financial_summary",
      label: "Financial Summary",
      icon: DollarSign,
    },
    { value: "expense_report", label: "Expense Report", icon: TrendingUp },
    { value: "budget_variance", label: "Budget Variance", icon: BarChart3 },
    { value: "donor_report", label: "Donor Report", icon: Users },
    { value: "project_funding", label: "Project Funding", icon: PieChart },
  ];

  const periods = [
    { value: "current_month", label: "Current Month" },
    { value: "last_month", label: "Last Month" },
    { value: "current_quarter", label: "Current Quarter" },
    { value: "last_quarter", label: "Last Quarter" },
    { value: "current_year", label: "Current Year" },
    { value: "custom", label: "Custom Range" },
  ];

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      // Try to load from localStorage first (for client-side generated reports)
      const savedReports = localStorage.getItem("generated_reports");
      if (savedReports) {
        const parsedReports = JSON.parse(savedReports);
        setReports(parsedReports);
      }

      // Also try to fetch from database
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        const dbReports = data.map((report: any) => ({
          id: report.id,
          title: report.title,
          type: report.type,
          generated_at: report.generated_at,
          status: report.status || "completed",
          size: report.size || "N/A",
        }));

        // Merge with localStorage reports, avoiding duplicates
        const allReports = [...dbReports];
        if (savedReports) {
          const localReports = JSON.parse(savedReports);
          localReports.forEach((localReport: Report) => {
            if (!allReports.some((r) => r.id === localReport.id)) {
              allReports.push(localReport);
            }
          });
        }

        setReports(allReports);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  };

  const getDateRange = (period: string) => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (period) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "current_quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case "last_quarter":
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const quarterYear =
          lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
        startDate = new Date(quarterYear, adjustedQuarter * 3, 1);
        endDate = new Date(quarterYear, (adjustedQuarter + 1) * 3, 0);
        break;
      case "current_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  };

  const generateReport = async () => {
    if (!selectedReportType || !selectedPeriod) {
      alert("Please select both report type and period");
      return;
    }

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(selectedPeriod);
      const reportData = await fetchReportData(
        selectedReportType,
        startDate,
        endDate,
      );
      const htmlContent = generateReportHTML(
        selectedReportType,
        reportData,
        startDate,
        endDate,
      );

      // Create new report
      const newReport: Report = {
        id: `report_${Date.now()}`,
        title: `${reportTypes.find((t) => t.value === selectedReportType)?.label} - ${periods.find((p) => p.value === selectedPeriod)?.label}`,
        type: selectedReportType,
        generated_at: new Date().toISOString(),
        status: "completed",
        size: `${Math.round(htmlContent.length / 1024)}KB`,
      };

      // Save to localStorage
      const existingReports = JSON.parse(
        localStorage.getItem("generated_reports") || "[]",
      );
      const updatedReports = [newReport, ...existingReports].slice(0, 20); // Keep only latest 20
      localStorage.setItem("generated_reports", JSON.stringify(updatedReports));

      // Try to save to database
      try {
        await supabase.from("reports").insert({
          id: newReport.id,
          title: newReport.title,
          type: newReport.type,
          generated_at: newReport.generated_at,
          status: newReport.status,
          size: newReport.size,
        });
      } catch (dbError) {
        console.log("Database save failed, using localStorage only");
      }

      // Update local state
      setReports((prev) => [newReport, ...prev]);

      // Download the report
      downloadReport(newReport.title, htmlContent);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async (
    reportType: string,
    startDate: Date,
    endDate: Date,
  ) => {
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    switch (reportType) {
      case "expense_report":
        const { data: expenses } = await supabase
          .from("expenses")
          .select(
            `
            *,
            budget_categories (
              name
            )
          `,
          )
          .gte("expense_date", startDateStr)
          .lte("expense_date", endDateStr)
          .order("expense_date", { ascending: false });
        return { expenses: expenses || [] };

      case "donor_report":
        const { data: funds } = await supabase
          .from("fund_sources")
          .select("*")
          .gte("received_date", startDateStr)
          .lte("received_date", endDateStr)
          .order("received_date", { ascending: false });
        return { funds: funds || [] };

      case "budget_variance":
        const { data: budgets } = await supabase
          .from("budgets")
          .select("*")
          .gte("period_start", startDateStr)
          .lte("period_end", endDateStr);
        return { budgets: budgets || [] };

      default:
        // Financial summary - get all data
        const [expensesRes, fundsRes, budgetsRes] = await Promise.all([
          supabase
            .from("expenses")
            .select("*")
            .gte("expense_date", startDateStr)
            .lte("expense_date", endDateStr),
          supabase
            .from("fund_sources")
            .select("*")
            .gte("received_date", startDateStr)
            .lte("received_date", endDateStr),
          supabase.from("budgets").select("*"),
        ]);

        return {
          expenses: expensesRes.data || [],
          funds: fundsRes.data || [],
          budgets: budgetsRes.data || [],
        };
    }
  };

  const generateReportHTML = (
    reportType: string,
    data: any,
    startDate: Date,
    endDate: Date,
  ): string => {
    const formatDate = (date: Date) => date.toLocaleDateString();
    const formatCurrency = (amount: number) => `FRw ${amount.toLocaleString()}`;

    const baseHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTypes.find((t) => t.value === reportType)?.label}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4CAF50; padding-bottom: 20px; }
          .period { color: #666; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .summary { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .amount { font-weight: bold; color: #2563eb; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .status.approved { background-color: #dcfce7; color: #166534; }
          .status.pending { background-color: #fef3c7; color: #92400e; }
          .status.rejected { background-color: #fecaca; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportTypes.find((t) => t.value === reportType)?.label}</h1>
          <p class="period">Period: ${formatDate(startDate)} to ${formatDate(endDate)}</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
    `;

    let content = "";

    switch (reportType) {
      case "expense_report":
        const totalExpenses = data.expenses.reduce(
          (sum: number, exp: ExpenseData) => sum + exp.amount,
          0,
        );
        content = `
          <div class="summary">
            <h3>Summary</h3>
            <p>Total Expenses: <span class="amount">${formatCurrency(totalExpenses)}</span></p>
            <p>Number of Transactions: ${data.expenses.length}</p>
          </div>
          <h3>Expense Details</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.expenses
                .map(
                  (expense: ExpenseData) => `
                <tr>
                  <td>${new Date(expense.expense_date).toLocaleDateString()}</td>
                  <td>${expense.description}</td>
                  <td>${expense.budget_categories?.name || "Uncategorized"}</td>
                  <td class="amount">${formatCurrency(expense.amount)}</td>
                  <td><span class="status ${expense.status}">${expense.status}</span></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `;
        break;

      case "donor_report":
        const totalFunds = data.funds.reduce(
          (sum: number, fund: FundData) => sum + fund.amount,
          0,
        );
        content = `
          <div class="summary">
            <h3>Summary</h3>
            <p>Total Funds Received: <span class="amount">${formatCurrency(totalFunds)}</span></p>
            <p>Number of Donors: ${new Set(data.funds.map((f: FundData) => f.donor_name)).size}</p>
          </div>
          <h3>Fund Details</h3>
          <table>
            <thead>
              <tr>
                <th>Date Received</th>
                <th>Donor</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.funds
                .map(
                  (fund: FundData) => `
                <tr>
                  <td>${new Date(fund.received_date).toLocaleDateString()}</td>
                  <td>${fund.donor_name}</td>
                  <td class="amount">${formatCurrency(fund.amount)}</td>
                  <td><span class="status ${fund.status}">${fund.status}</span></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `;
        break;

      default:
        // Financial summary
        const totalExpenseAmount =
          data.expenses?.reduce(
            (sum: number, exp: ExpenseData) => sum + exp.amount,
            0,
          ) || 0;
        const totalFundAmount =
          data.funds?.reduce(
            (sum: number, fund: FundData) => sum + fund.amount,
            0,
          ) || 0;
        const remainingFunds = totalFundAmount - totalExpenseAmount;

        content = `
          <div class="summary">
            <h3>Financial Summary</h3>
            <p>Total Funds Received: <span class="amount">${formatCurrency(totalFundAmount)}</span></p>
            <p>Total Expenses: <span class="amount">${formatCurrency(totalExpenseAmount)}</span></p>
            <p>Remaining Funds: <span class="amount">${formatCurrency(remainingFunds)}</span></p>
          </div>
          
          <h3>Recent Transactions</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.expenses
                  ?.slice(0, 10)
                  .map(
                    (expense: ExpenseData) => `
                <tr>
                  <td>${new Date(expense.expense_date).toLocaleDateString()}</td>
                  <td>Expense</td>
                  <td>${expense.description}</td>
                  <td class="amount">-${formatCurrency(expense.amount)}</td>
                </tr>
              `,
                  )
                  .join("") || ""
              }
              ${
                data.funds
                  ?.slice(0, 5)
                  .map(
                    (fund: FundData) => `
                <tr>
                  <td>${new Date(fund.received_date).toLocaleDateString()}</td>
                  <td>Fund</td>
                  <td>From ${fund.donor_name}</td>
                  <td class="amount">+${formatCurrency(fund.amount)}</td>
                </tr>
              `,
                  )
                  .join("") || ""
              }
            </tbody>
          </table>
        `;
    }

    return (
      baseHTML +
      content +
      `
        </body>
      </html>
    `
    );
  };

  const downloadReport = (title: string, htmlContent: string) => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    // For existing reports, regenerate the content
    const { startDate, endDate } = getDateRange(selectedPeriod);
    const reportData = await fetchReportData(report.type, startDate, endDate);
    const htmlContent = generateReportHTML(
      report.type,
      reportData,
      startDate,
      endDate,
    );

    downloadReport(report.title, htmlContent);
  };

  return (
    <div className="space-y-6">
      {/* Report Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Generate New Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Report Type
              </label>
              <Select
                value={selectedReportType}
                onValueChange={setSelectedReportType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={loading || !selectedReportType || !selectedPeriod}
            className="w-full"
          >
            {loading ? (
              "Generating Report..."
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Generated Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reports generated yet</p>
              <p className="text-sm">
                Generate your first report using the form above
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {report.title}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.generated_at).toLocaleDateString()}
                      </span>
                      <Badge
                        variant={
                          report.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {report.status}
                      </Badge>
                      <span>{report.size}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(report.id)}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
