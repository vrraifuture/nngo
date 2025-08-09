import DashboardNavbar from "@/components/dashboard-navbar";
import FundTrackingPanel from "@/components/fund-tracking-panel";
import BudgetComparisonChart from "@/components/budget-comparison-chart";
import ExpenseManagement from "@/components/expense-management";
import ReportGeneration from "@/components/report-generation";
import GeneralLedger from "@/components/general-ledger";
import DashboardCurrencyUpdater from "@/components/dashboard-currency-updater";
import PermissionInitializer from "@/components/permission-initializer";
import FinancialIntegrationHelper from "@/components/financial-integration-helper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  FileText,
  Users,
  AlertCircle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";

// Helper function to get default currency (server-side compatible)
function getDefaultCurrencySymbol() {
  // Since we can't access localStorage on server-side, we'll use a default
  // The client-side components will handle the actual currency from localStorage
  return "$";
}

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get user role from database (no default to admin)
  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  // If no role found, create a default viewer role (but only once per user)
  let role = userRole?.role;
  if (!role || roleError) {
    console.log("No role found for user, checking if user already exists");

    // Get organization ID
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (org) {
      // Check if this user already has any role record (to prevent duplicates)
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("organization_id", org.id)
        .single();

      if (existingRole) {
        // User already has a role, use it
        role = existingRole.role;
        console.log("Found existing role for user:", role);
      } else {
        // Create viewer role for new user (only if no role exists)
        const { error: createRoleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: user.id,
            organization_id: org.id,
            role: "viewer",
          });

        if (!createRoleError) {
          role = "viewer";
          console.log("Created viewer role for new user");
        } else {
          console.error("Failed to create role for user:", createRoleError);
          role = "viewer"; // Fallback
        }
      }
    } else {
      role = "viewer"; // Fallback if no organization
    }
  }

  console.log(`Dashboard loaded for user ${user.email} with role: ${role}`);

  // Get dashboard statistics
  const { data: totalFunds } = await supabase
    .from("fund_sources")
    .select("amount")
    .in("status", ["received", "partially_used"]);

  const { data: activeProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("status", "active");

  // Get monthly expense data - real data only
  let monthlyExpensesAmount = 0;
  let approvedExpensesAmount = 0;
  let paidExpensesAmount = 0;
  let rejectedExpensesAmount = 0;

  try {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    // Get monthly expenses with proper date filtering
    const { data: monthlyExpenses, error: monthlyError } = await supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", firstDayOfMonth.toISOString().split("T")[0])
      .lte("expense_date", lastDayOfMonth.toISOString().split("T")[0]);

    if (!monthlyError && monthlyExpenses) {
      monthlyExpensesAmount = monthlyExpenses.reduce(
        (sum, expense) => sum + (expense.amount || 0),
        0,
      );
    }

    // Get all expenses for status calculations
    const { data: allExpenses, error: expenseError } = await supabase
      .from("expenses")
      .select("amount, status");

    if (!expenseError && allExpenses) {
      approvedExpensesAmount = allExpenses
        .filter((e) => e.status === "approved")
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);

      paidExpensesAmount = allExpenses
        .filter((e) => e.status === "paid")
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);

      rejectedExpensesAmount = allExpenses
        .filter((e) => e.status === "rejected")
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);
    }
  } catch (error) {
    console.error("Error fetching expenses:", error);
    // Keep values at 0 - no fallback mock data
  }

  // Get reports data - count actual financial activities as reports
  let reportsThisMonth = 0;
  try {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    console.log("Calculating reports for period:", {
      start: firstDayOfMonth.toISOString(),
      end: lastDayOfMonth.toISOString(),
    });

    // Count actual financial activities as "reports generated"
    const [budgetCount, expenseCount, fundCount, journalCount] =
      await Promise.all([
        // Budgets created this month
        supabase
          .from("budgets")
          .select("id", { count: "exact" })
          .gte("created_at", firstDayOfMonth.toISOString())
          .lte("created_at", lastDayOfMonth.toISOString()),

        // Expenses submitted this month
        supabase
          .from("expenses")
          .select("id", { count: "exact" })
          .gte("created_at", firstDayOfMonth.toISOString())
          .lte("created_at", lastDayOfMonth.toISOString()),

        // Fund sources added this month
        supabase
          .from("fund_sources")
          .select("id", { count: "exact" })
          .gte("created_at", firstDayOfMonth.toISOString())
          .lte("created_at", lastDayOfMonth.toISOString()),

        // Journal entries created this month (financial transactions)
        supabase
          .from("journal_entries")
          .select("id", { count: "exact" })
          .gte("transaction_date", firstDayOfMonth.toISOString().split("T")[0])
          .lte("transaction_date", lastDayOfMonth.toISOString().split("T")[0]),
      ]);

    // Calculate total reports (each activity counts as a report)
    const budgetReports = budgetCount.data?.length || 0;
    const expenseReports = expenseCount.data?.length || 0;
    const fundReports = fundCount.data?.length || 0;
    const journalReports = Math.floor((journalCount.data?.length || 0) / 2); // Journal entries come in pairs

    reportsThisMonth =
      budgetReports + expenseReports + fundReports + journalReports;

    console.log("Reports calculation:", {
      budgetReports,
      expenseReports,
      fundReports,
      journalReports,
      total: reportsThisMonth,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    // Fallback: count basic activities
    try {
      const { data: basicCount } = await supabase
        .from("expenses")
        .select("id")
        .gte(
          "created_at",
          new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1,
          ).toISOString(),
        );
      reportsThisMonth = basicCount?.length || 0;
    } catch (fallbackError) {
      console.error("Fallback reports count failed:", fallbackError);
      reportsThisMonth = 0;
    }
  }

  const totalFundsAmount =
    totalFunds?.reduce((sum, fund) => sum + (fund.amount || 0), 0) || 0;
  const activeProjectsCount = activeProjects?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardCurrencyUpdater />
      <PermissionInitializer userRole={role} />
      <FinancialIntegrationHelper />
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  NGO Fund Management Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Welcome back, {user.email}</p>
              </div>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
                {role} Access
              </div>
            </div>
          </header>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Funds
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  <span className="currency-symbol">
                    {getDefaultCurrencySymbol()}
                  </span>
                  {totalFundsAmount.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Available for allocation
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Projects
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {activeProjectsCount}
                </div>
                <p className="text-xs text-gray-500 mt-1">Currently running</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Monthly Expenses
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  <span className="currency-symbol">
                    {getDefaultCurrencySymbol()}
                  </span>
                  {monthlyExpensesAmount.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">This month's total</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Reports Generated
                </CardTitle>
                <FileText className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {reportsThisMonth}
                </div>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Tabs */}
          <Tabs defaultValue="funds" className="w-full">
            <TabsList className="w-full bg-white overflow-x-auto flex md:grid md:grid-cols-5 gap-1 p-1">
              <TabsTrigger
                value="funds"
                className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-green-100 data-[state=active]:text-green-800 text-xs sm:text-sm px-2 sm:px-4 py-2"
              >
                Fund Tracking
              </TabsTrigger>
              <TabsTrigger
                value="budget"
                className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 text-xs sm:text-sm px-2 sm:px-4 py-2"
              >
                Budget vs Actual
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800 text-xs sm:text-sm px-2 sm:px-4 py-2"
              >
                Expense Management
              </TabsTrigger>
              <TabsTrigger
                value="ledger"
                className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-teal-100 data-[state=active]:text-teal-800 text-xs sm:text-sm px-2 sm:px-4 py-2"
              >
                General Ledger
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800 text-xs sm:text-sm px-2 sm:px-4 py-2"
              >
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="funds" className="mt-6">
              <FundTrackingPanel userRole={role} />
            </TabsContent>

            <TabsContent value="budget" className="mt-6">
              <BudgetComparisonChart userRole={role} />
            </TabsContent>

            <TabsContent value="expenses" className="mt-6">
              <ExpenseManagement userRole={role} />
            </TabsContent>

            <TabsContent value="ledger" className="mt-6">
              <GeneralLedger userRole={role} />
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
              <ReportGeneration userRole={role} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
