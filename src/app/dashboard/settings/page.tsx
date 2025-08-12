"use client";

import { useState, useEffect } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  Settings,
  DollarSign,
  CreditCard,
  FolderOpen,
  Users,
  Tag,
  BookOpen,
  Edit,
  Lock,
  AlertCircle,
  Shield,
  UserCheck,
  Search,
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Grid3X3,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "../../../../supabase/client";

import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
  changeUserPasswordAction,
  getUsersAction,
  getUserRolesAction,
} from "@/app/actions";
import {
  getUserRoleSync,
  canManageSettingsSync,
  isAdminSync,
  hasPermissionSync,
  getUserRole,
  initializeDefaultPermissions,
  syncPermissionsToSessionCache,
} from "@/utils/permissions";
import PermissionManager from "@/components/permission-manager";
import DashboardCurrencyUpdater from "@/components/dashboard-currency-updater";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
  exchange_rate?: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  config?: any;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  budget?: number;
  total_budget?: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  // Current budget information
  planned_budget?: number;
  spent_amount?: number;
  remaining_budget?: number;
}

interface Donor {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  type: string;
  notes?: string;
  created_at?: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  description?: string;
  is_active: boolean;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  organization_id?: string;
  created_at?: string;
  user?: User;
}

interface UserInvitation {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  status: "pending" | "accepted" | "expired";
  invited_by: string;
  created_at: string;
  expires_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface RolePermission {
  role: string;
  permission_id: string;
  granted: boolean;
  granted_by?: string;
  granted_at?: string;
}

// Export the client component directly
export default function SettingsPage() {
  return <SettingsPageContent />;
}

// Client component for the main settings functionality
function SettingsPageContent() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(
    [],
  );
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [userRole, setUserRole] = useState<string>("viewer");
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasManageSettings, setHasManageSettings] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userInvitations, setUserInvitations] = useState<UserInvitation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [showRolePermissionDialog, setShowRolePermissionDialog] =
    useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] =
    useState<string>("");

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: "1", name: "Cash", type: "cash", is_active: true },
    {
      id: "2",
      name: "Bank Transfer",
      type: "bank_transfer",
      is_active: true,
    },
    { id: "3", name: "Credit Card", type: "credit_card", is_active: true },
    { id: "4", name: "MOMO Pay", type: "mobile_money", is_active: true },
  ]);

  // Dialog states
  const [showAddCurrencyDialog, setShowAddCurrencyDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [showAddDonorDialog, setShowAddDonorDialog] = useState(false);
  const [showEditDonorDialog, setShowEditDonorDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showEditAccountDialog, setShowEditAccountDialog] = useState(false);
  const [showAssignRoleDialog, setShowAssignRoleDialog] = useState(false);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showInviteUserDialog, setShowInviteUserDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] =
    useState(false);

  // Form states
  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    symbol: "",
    exchange_rate: "",
  });
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    name: "",
    type: "other",
  });
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "active",
    budget: "",
    start_date: "",
    end_date: "",
  });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newDonor, setNewDonor] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    type: "individual",
    notes: "",
  });
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
  });
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(
    null,
  );
  const [newAccount, setNewAccount] = useState({
    account_code: "",
    account_name: "",
    account_type: "asset",
    normal_balance: "debit",
    is_active: true,
    description: "",
  });
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(
    null,
  );
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("accountant");
  const [editingUserRole, setEditingUserRole] = useState<UserRole | null>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "accountant",
  });
  const [newInvitation, setNewInvitation] = useState({
    email: "",
    full_name: "",
    role: "accountant",
    message: "",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(
    null,
  );
  const [passwordChangeForm, setPasswordChangeForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  const supabase = createClient();

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup function to prevent memory leaks
      setLoading(false);
    };
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // First load user role and permissions
        await loadUserRole();
        await initializePermissions();

        // Then load other data
        await Promise.all([
          loadCurrencies(),
          loadPaymentMethods(),
          loadProjects(),
          loadDonors(),
          loadBudgetCategories(),
          loadChartOfAccounts(),
          loadUsers(),
          loadUserRoles(),
          loadUserInvitations(),
        ]);
        setLoading(false);
      } catch (error) {
        console.error("Error initializing settings data:", error);
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Initialize permissions system
  const initializePermissions = async () => {
    try {
      console.log("Initializing permissions system...");

      // Initialize default permissions if needed
      await initializeDefaultPermissions();

      // Sync permissions to session cache
      await syncPermissionsToSessionCache();

      // Update permission states
      const currentRole = getUserRoleSync();
      const adminStatus = isAdminSync();
      const manageSettingsStatus = canManageSettingsSync();

      console.log("Permission status:", {
        role: currentRole,
        isAdmin: adminStatus,
        canManageSettings: manageSettingsStatus,
      });

      setIsAdmin(adminStatus);
      setHasManageSettings(manageSettingsStatus);

      // Mark admin as verified if they are admin
      if (adminStatus) {
        sessionStorage.setItem("admin_verified", "true");
      }
    } catch (error) {
      console.error("Error initializing permissions:", error);
    }
  };

  // Load user role from database
  const loadUserRole = async () => {
    try {
      console.log("Loading user role...");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error:", authError);
        setUserRole("viewer"); // Default to viewer for security
        setRoleLoading(false);
        return;
      }

      if (!user) {
        console.log("No authenticated user found");
        setUserRole("viewer"); // Default to viewer for security
        setRoleLoading(false);
        return;
      }

      console.log("Authenticated user:", user.id, user.email);

      // Try to fetch user role from database
      const { data: userRoleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role from database:", error);
        console.log(
          "No role found in database - user should not access settings",
        );
        setUserRole("viewer"); // Default to viewer for security
      } else {
        console.log("User role found in database:", userRoleData);
        const role = userRoleData?.role || "viewer";
        setUserRole(role);

        // Update permission states based on role
        const adminStatus = role === "admin";
        const manageSettingsStatus =
          adminStatus || hasPermissionSync("manage_settings");

        setIsAdmin(adminStatus);
        setHasManageSettings(manageSettingsStatus);

        // Store role in session for sync functions
        sessionStorage.setItem("temp_user_role", role);

        if (adminStatus) {
          sessionStorage.setItem("admin_verified", "true");
        }
      }

      setRoleLoading(false);
    } catch (error) {
      console.error("Error loading user role:", error);
      setUserRole("viewer"); // Default fallback for security
      setRoleLoading(false);
    }
  };

  // Permission checking functions - now using the centralized permission system
  // SIMPLIFIED permission checks - ONLY admin can manage anything
  const canManageCurrencies = () => {
    const canManage = isAdmin; // ONLY admin can manage
    console.log(
      `canManageCurrencies: ${canManage} (role: ${userRole}, isAdmin: ${isAdmin})`,
    );
    return canManage;
  };

  const canManageProjects = () => {
    const canManage = isAdmin; // ONLY admin can manage
    console.log(
      `canManageProjects: ${canManage} (role: ${userRole}, isAdmin: ${isAdmin})`,
    );
    return canManage;
  };

  const canManageDonors = () => {
    const canManage = isAdmin; // ONLY admin can manage
    console.log(
      `canManageDonors: ${canManage} (role: ${userRole}, isAdmin: ${isAdmin})`,
    );
    return canManage;
  };

  const canManageBudgetCategories = () => {
    const canManage = isAdmin; // ONLY admin can manage
    console.log(
      `canManageBudgetCategories: ${canManage} (role: ${userRole}, isAdmin: ${isAdmin})`,
    );
    return canManage;
  };

  const canManageChartOfAccounts = () => {
    const canManage = isAdmin; // ONLY admin can manage
    console.log(
      `canManageChartOfAccounts: ${canManage} (role: ${userRole}, isAdmin: ${isAdmin})`,
    );
    return canManage;
  };

  const canManagePaymentMethods = () => {
    const canManage = isAdmin; // ONLY admin can manage
    console.log(
      `canManagePaymentMethods: ${canManage} (role: ${userRole}, isAdmin: ${isAdmin})`,
    );
    return canManage;
  };

  const canManageRoles = () => {
    const canManage = isAdmin; // ONLY admin can manage
    console.log(
      `canManageRoles: ${canManage} (role: ${userRole}, isAdmin: ${isAdmin})`,
    );
    return canManage;
  };

  const canManageUsers = () => {
    const canManage = isAdmin; // ONLY admin can manage
    console.log(
      `canManageUsers: ${canManage} (role: ${userRole}, isAdmin: ${isAdmin})`,
    );
    return canManage;
  };

  const canViewSection = (section: string) => {
    console.log(
      `Checking view permission for section: ${section}, userRole: ${userRole}, isAdmin: ${isAdmin}`,
    );

    // Admin can view all sections
    if (isAdmin) {
      console.log(`Admin can view all sections: ${section}`);
      return true;
    }

    switch (section) {
      case "currencies":
        const canViewCurrencies =
          hasPermissionSync("view_finances") ||
          hasPermissionSync("manage_currencies");
        console.log(`Can view currencies: ${canViewCurrencies}`);
        return canViewCurrencies;
      case "projects":
        const canViewProjects =
          hasPermissionSync("view_projects") ||
          hasPermissionSync("manage_projects");
        console.log(`Can view projects: ${canViewProjects}`);
        return canViewProjects;
      case "donors":
        const canViewDonors =
          hasPermissionSync("view_donors") ||
          hasPermissionSync("manage_donors");
        console.log(`Can view donors: ${canViewDonors}`);
        return canViewDonors;
      case "categories":
        const canViewCategories =
          hasPermissionSync("view_settings") ||
          hasPermissionSync("manage_categories");
        console.log(`Can view categories: ${canViewCategories}`);
        return canViewCategories;
      case "accounts":
        const canViewAccounts =
          hasPermissionSync("view_ledger") ||
          hasPermissionSync("manage_accounts");
        console.log(`Can view accounts: ${canViewAccounts}`);
        return canViewAccounts;
      case "payments":
        const canViewPayments =
          hasPermissionSync("view_settings") ||
          hasPermissionSync("manage_settings");
        console.log(`Can view payments: ${canViewPayments}`);
        return canViewPayments;
      case "roles":
        const canViewRoles =
          hasPermissionSync("manage_permissions") ||
          hasPermissionSync("manage_users");
        console.log(`Can view roles: ${canViewRoles}`);
        return canViewRoles;
      case "users":
        const canViewUsers =
          hasPermissionSync("view_users") || hasPermissionSync("manage_users");
        console.log(`Can view users: ${canViewUsers}`);
        return canViewUsers;
      case "permissions":
        const canViewPermissions =
          hasPermissionSync("manage_permissions") ||
          hasPermissionSync("manage_settings");
        console.log(`Can view permissions: ${canViewPermissions}`);
        return canViewPermissions;
      default:
        console.log(`Unknown section: ${section}`);
        return false;
    }
  };

  // Component for restricted access message
  const RestrictedAccessCard = ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <Card className="bg-red-50 border-red-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-red-500" />
          <CardTitle className="text-red-700">{title}</CardTitle>
        </div>
        <CardDescription className="text-red-600">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-red-600 bg-red-100 p-4 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <div className="text-sm">
            <p className="font-medium">Access Restricted</p>
            <p>
              You don't have the required permissions to access this section.
              Only administrators or users with specific permissions can manage
              these settings.
            </p>
            <p className="mt-2 text-xs">
              Current role:{" "}
              <span className="font-mono bg-red-200 px-1 rounded">
                {userRole}
              </span>{" "}
              | Admin: {isAdmin ? "Yes" : "No"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Check if user has access to settings at all - RESTRICTED for accountants
  const hasSettingsAccess = () => {
    // Only admin has full access to settings
    // Accountants can view some settings but cannot edit anything
    return (
      isAdmin ||
      (userRole === "accountant" && hasPermissionSync("view_settings"))
    );
  };

  // Get default currency from localStorage or system default
  const getDefaultCurrency = () => {
    try {
      const savedDefaultCurrency = localStorage.getItem("ngo_default_currency");
      if (savedDefaultCurrency) {
        const defaultCurrency = JSON.parse(savedDefaultCurrency);
        return defaultCurrency;
      }
    } catch (error) {
      console.error("Error getting default currency:", error);
    }
    return { code: "USD", symbol: "$", name: "US Dollar" }; // fallback
  };

  // Update default currency across the system
  const updateSystemCurrency = (currency: Currency) => {
    try {
      // Update in currencies list
      const updatedCurrencies = currencies.map((c) => ({
        ...c,
        is_default: c.id === currency.id,
      }));
      saveCurrencies(updatedCurrencies);

      // Update global currency reference
      if (typeof window !== "undefined") {
        window.defaultCurrency = {
          code: currency.code,
          symbol: currency.symbol,
          name: currency.name,
        };
      }

      console.log("System currency updated to:", currency);
    } catch (error) {
      console.error("Error updating system currency:", error);
    }
  };

  const loadCurrencies = async () => {
    try {
      // For now, we'll use local state. In a real app, you'd fetch from database
      const defaultCurrencies = [
        {
          id: "1",
          code: "USD",
          name: "US Dollar",
          symbol: "$",
          is_default: true,
        },
        {
          id: "2",
          code: "EUR",
          name: "Euro",
          symbol: "€",
          is_default: false,
        },
        {
          id: "3",
          code: "GBP",
          name: "British Pound",
          symbol: "£",
          is_default: false,
        },
        {
          id: "4",
          code: "RWF",
          name: "Rwandan Franc",
          symbol: "FRw",
          is_default: false,
        },
      ];

      // Load from localStorage if available
      if (typeof window !== "undefined") {
        const savedCurrencies = localStorage.getItem("ngo_currencies");
        if (savedCurrencies) {
          setCurrencies(JSON.parse(savedCurrencies));
        } else {
          setCurrencies(defaultCurrencies);
          localStorage.setItem(
            "ngo_currencies",
            JSON.stringify(defaultCurrencies),
          );
        }
      } else {
        setCurrencies(defaultCurrencies);
      }
    } catch (error) {
      console.error("Error loading currencies:", error);
      setCurrencies([]);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const defaultPaymentMethods = [
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

      // Load from localStorage if available
      if (typeof window !== "undefined") {
        const savedPaymentMethods = localStorage.getItem("ngo_payment_methods");
        if (savedPaymentMethods) {
          setPaymentMethods(JSON.parse(savedPaymentMethods));
        } else {
          setPaymentMethods(defaultPaymentMethods);
          localStorage.setItem(
            "ngo_payment_methods",
            JSON.stringify(defaultPaymentMethods),
          );
        }
      } else {
        setPaymentMethods(defaultPaymentMethods);
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
      setPaymentMethods([]);
    }
  };

  const saveCurrencies = (newCurrencies: Currency[]) => {
    try {
      setCurrencies(newCurrencies);
      if (typeof window !== "undefined") {
        localStorage.setItem("ngo_currencies", JSON.stringify(newCurrencies));

        // Also save the default currency separately for easy access
        const defaultCurrency = newCurrencies.find((c) => c.is_default);
        if (defaultCurrency) {
          localStorage.setItem(
            "ngo_default_currency",
            JSON.stringify(defaultCurrency),
          );
        }
      }
    } catch (error) {
      console.error("Error saving currencies:", error);
    }
  };

  const savePaymentMethods = (newPaymentMethods: PaymentMethod[]) => {
    try {
      setPaymentMethods(newPaymentMethods);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "ngo_payment_methods",
          JSON.stringify(newPaymentMethods),
        );
      }
    } catch (error) {
      console.error("Error saving payment methods:", error);
    }
  };

  const handleAddCurrency = () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) return;

    const currency: Currency = {
      id: Date.now().toString(),
      code: newCurrency.code.toUpperCase(),
      name: newCurrency.name,
      symbol: newCurrency.symbol,
      is_default: false,
      exchange_rate: parseFloat(newCurrency.exchange_rate) || 1,
    };

    const newCurrencies = [...currencies, currency];
    saveCurrencies(newCurrencies);
    setNewCurrency({ code: "", name: "", symbol: "", exchange_rate: "" });
    setShowAddCurrencyDialog(false);
  };

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.name) return;

    const paymentMethod: PaymentMethod = {
      id: Date.now().toString(),
      name: newPaymentMethod.name,
      type: newPaymentMethod.type,
      is_active: true,
    };

    const newPaymentMethods = [...paymentMethods, paymentMethod];
    savePaymentMethods(newPaymentMethods);
    setNewPaymentMethod({ name: "", type: "other" });
    setShowAddPaymentDialog(false);
  };

  const togglePaymentMethod = (id: string) => {
    const newPaymentMethods = paymentMethods.map((pm) =>
      pm.id === id ? { ...pm, is_active: !pm.is_active } : pm,
    );
    savePaymentMethods(newPaymentMethods);
  };

  const setDefaultCurrency = (id: string) => {
    const selectedCurrency = currencies.find((c) => c.id === id);
    if (!selectedCurrency) return;

    const newCurrencies = currencies.map((c) => ({
      ...c,
      is_default: c.id === id,
    }));
    saveCurrencies(newCurrencies);

    // Update system-wide currency
    updateSystemCurrency(selectedCurrency);

    alert(
      `Default currency changed to ${selectedCurrency.name} (${selectedCurrency.symbol}). This will be used throughout the system.`,
    );
  };

  const removeCurrency = (id: string) => {
    const newCurrencies = currencies.filter(
      (c) => c.id !== id && !c.is_default,
    );
    saveCurrencies(newCurrencies);
  };

  const removePaymentMethod = (id: string) => {
    const newPaymentMethods = paymentMethods.filter((pm) => pm.id !== id);
    savePaymentMethods(newPaymentMethods);
  };

  // Projects Management Functions
  const loadProjects = async () => {
    try {
      console.log("Loading projects with budget information...");

      // First, get all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.error("Error loading projects:", projectsError);
        setProjects([]);
        return;
      }

      if (!projectsData || projectsData.length === 0) {
        console.log("No projects found");
        setProjects([]);
        return;
      }

      console.log("Projects loaded:", projectsData.length);

      // Get all project IDs for batch queries
      const projectIds = projectsData.map((p) => p.id);

      // Fetch budget data for all projects
      const [budgetsResult, expensesResult] = await Promise.all([
        supabase
          .from("budgets")
          .select("project_id, planned_amount")
          .in("project_id", projectIds),
        supabase
          .from("expenses")
          .select("project_id, amount")
          .in("project_id", projectIds)
          .in("status", ["approved", "paid"]),
      ]);

      // Process budget data
      const budgetsByProject = new Map();
      if (budgetsResult.data) {
        budgetsResult.data.forEach((budget) => {
          if (budget.project_id) {
            const current = budgetsByProject.get(budget.project_id) || 0;
            budgetsByProject.set(
              budget.project_id,
              current + (budget.planned_amount || 0),
            );
          }
        });
      }

      // Process expense data
      const expensesByProject = new Map();
      if (expensesResult.data) {
        expensesResult.data.forEach((expense) => {
          if (expense.project_id) {
            const current = expensesByProject.get(expense.project_id) || 0;
            expensesByProject.set(
              expense.project_id,
              current + (expense.amount || 0),
            );
          }
        });
      }

      // Combine project data with budget information
      const projectsWithBudget = projectsData.map((project) => {
        // Use total_budget from projects table as the primary budget
        const projectBudget = project.total_budget || 0;
        // Also calculate planned budget from budgets table for comparison
        const plannedBudget = budgetsByProject.get(project.id) || 0;
        const spentAmount = expensesByProject.get(project.id) || 0;

        // Use project's total_budget if available, otherwise fall back to planned budget
        const effectiveBudget =
          projectBudget > 0 ? projectBudget : plannedBudget;
        const remainingBudget = effectiveBudget - spentAmount;

        return {
          ...project,
          planned_budget: effectiveBudget,
          spent_amount: spentAmount,
          remaining_budget: remainingBudget,
        };
      });

      console.log("Projects with budget data:", projectsWithBudget);
      setProjects(projectsWithBudget);
    } catch (error) {
      console.error("Error loading projects:", error);
      setProjects([]);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name.trim()) {
      alert("Please enter a project name.");
      return;
    }

    try {
      console.log("Adding new project:", newProject);

      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: newProject.name.trim(),
          description: newProject.description?.trim() || null,
          status: newProject.status,
          total_budget: parseFloat(newProject.budget) || null,
          start_date: newProject.start_date || null,
          end_date: newProject.end_date || null,
        })
        .select();

      if (error) {
        console.error("Error adding project:", error);
        alert("Failed to add project: " + error.message);
        return;
      }

      console.log("Project added successfully:", data);
      alert("Project added successfully!");

      await loadProjects();
      setNewProject({
        name: "",
        description: "",
        status: "active",
        budget: "",
        start_date: "",
        end_date: "",
      });
      setShowAddProjectDialog(false);
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Failed to add project. Please try again.");
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowEditProjectDialog(true);
  };

  const handleUpdateProject = async () => {
    if (!editingProject) {
      alert("No project selected for editing.");
      return;
    }

    if (!editingProject.name.trim()) {
      alert("Please enter a project name.");
      return;
    }

    try {
      console.log("Updating project:", editingProject);

      const { data, error } = await supabase
        .from("projects")
        .update({
          name: editingProject.name.trim(),
          description: editingProject.description?.trim() || null,
          status: editingProject.status,
          total_budget: editingProject.budget || null,
          start_date: editingProject.start_date || null,
          end_date: editingProject.end_date || null,
        })
        .eq("id", editingProject.id)
        .select();

      if (error) {
        console.error("Error updating project:", error);
        alert("Failed to update project: " + error.message);
        return;
      }

      console.log("Project updated successfully:", data);
      alert("Project updated successfully!");

      await loadProjects();
      setEditingProject(null);
      setShowEditProjectDialog(false);
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project. Please try again.");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) {
        console.error("Error deleting project:", error);
        console.error("Failed to delete project:", error);
        return;
      }

      await loadProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      console.error("Failed to delete project:", error);
    }
  };

  // Donors Management Functions
  const loadDonors = async () => {
    try {
      const { data, error } = await supabase
        .from("donors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading donors:", error);
        setDonors([]);
        return;
      }

      setDonors(data || []);
    } catch (error) {
      console.error("Error loading donors:", error);
      setDonors([]);
    }
  };

  const handleAddDonor = async () => {
    if (!newDonor.name) return;

    try {
      const { error } = await supabase.from("donors").insert({
        name: newDonor.name,
        contact_email: newDonor.contact_email || null,
        contact_phone: newDonor.contact_phone || null,
        address: newDonor.address || null,
        type: newDonor.type,
        notes: newDonor.notes || null,
      });

      if (error) {
        console.error("Error adding donor:", error);
        console.error("Failed to add donor:", error);
        return;
      }

      await loadDonors();
      setNewDonor({
        name: "",
        contact_email: "",
        contact_phone: "",
        address: "",
        type: "individual",
        notes: "",
      });
      setShowAddDonorDialog(false);
    } catch (error) {
      console.error("Error adding donor:", error);
      console.error("Failed to add donor:", error);
    }
  };

  const handleEditDonor = (donor: Donor) => {
    setEditingDonor(donor);
    setShowEditDonorDialog(true);
  };

  const handleUpdateDonor = async () => {
    if (!editingDonor) return;

    try {
      const { error } = await supabase
        .from("donors")
        .update({
          name: editingDonor.name,
          contact_email: editingDonor.contact_email || null,
          contact_phone: editingDonor.contact_phone || null,
          address: editingDonor.address || null,
          type: editingDonor.type,
          notes: editingDonor.notes || null,
        })
        .eq("id", editingDonor.id);

      if (error) {
        console.error("Error updating donor:", error);
        console.error("Failed to update donor:", error);
        return;
      }

      await loadDonors();
      setEditingDonor(null);
      setShowEditDonorDialog(false);
    } catch (error) {
      console.error("Error updating donor:", error);
      console.error("Failed to update donor:", error);
    }
  };

  const handleDeleteDonor = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this donor? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("donors").delete().eq("id", id);

      if (error) {
        console.error("Error deleting donor:", error);
        console.error("Failed to delete donor:", error);
        return;
      }

      await loadDonors();
    } catch (error) {
      console.error("Error deleting donor:", error);
      console.error("Failed to delete donor:", error);
    }
  };

  // Budget Categories Management Functions
  const loadBudgetCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading budget categories:", error);
        setBudgetCategories([]);
        return;
      }

      setBudgetCategories(data || []);
    } catch (error) {
      console.error("Error loading budget categories:", error);
      setBudgetCategories([]);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) return;

    try {
      const { error } = await supabase.from("budget_categories").insert({
        name: newCategory.name,
        description: newCategory.description || null,
      });

      if (error) {
        console.error("Error adding category:", error);
        console.error("Failed to add category:", error);
        return;
      }

      await loadBudgetCategories();
      setNewCategory({ name: "", description: "" });
      setShowAddCategoryDialog(false);
    } catch (error) {
      console.error("Error adding category:", error);
      console.error("Failed to add category:", error);
    }
  };

  const handleEditCategory = (category: BudgetCategory) => {
    setEditingCategory(category);
    setShowEditCategoryDialog(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const { error } = await supabase
        .from("budget_categories")
        .update({
          name: editingCategory.name,
          description: editingCategory.description || null,
        })
        .eq("id", editingCategory.id);

      if (error) {
        console.error("Error updating category:", error);
        console.error("Failed to update category:", error);
        return;
      }

      await loadBudgetCategories();
      setEditingCategory(null);
      setShowEditCategoryDialog(false);
    } catch (error) {
      console.error("Error updating category:", error);
      console.error("Failed to update category:", error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this category? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("budget_categories")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting category:", error);
        console.error("Failed to delete category:", error);
        return;
      }

      await loadBudgetCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      console.error("Failed to delete category:", error);
    }
  };

  // Chart of Accounts Management Functions
  const loadChartOfAccounts = async () => {
    try {
      console.log("Loading chart of accounts from database...");

      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .order("account_code", { ascending: true });

      if (error) {
        console.error("Error loading chart of accounts:", error);

        // If table doesn't exist or there's an error, create default accounts
        const defaultAccounts = [
          {
            account_code: "1000",
            account_name: "Cash",
            account_type: "asset",
            normal_balance: "debit",
            description: "Cash on hand and in bank",
            is_active: true,
          },
          {
            account_code: "1200",
            account_name: "Accounts Receivable",
            account_type: "asset",
            normal_balance: "debit",
            description: "Money owed to organization",
            is_active: true,
          },
          {
            account_code: "2000",
            account_name: "Accounts Payable",
            account_type: "liability",
            normal_balance: "credit",
            description: "Money owed by organization",
            is_active: true,
          },
          {
            account_code: "3000",
            account_name: "Net Assets",
            account_type: "equity",
            normal_balance: "credit",
            description: "Organization's net worth",
            is_active: true,
          },
          {
            account_code: "4000",
            account_name: "Donations Revenue",
            account_type: "revenue",
            normal_balance: "credit",
            description: "Income from donations",
            is_active: true,
          },
          {
            account_code: "5000",
            account_name: "Program Expenses",
            account_type: "expense",
            normal_balance: "debit",
            description: "Direct program costs",
            is_active: true,
          },
          {
            account_code: "5100",
            account_name: "Administrative Expenses",
            account_type: "expense",
            normal_balance: "debit",
            description: "Administrative costs",
            is_active: true,
          },
        ];

        // Try to insert default accounts
        console.log("Attempting to create default accounts...");
        const { error: insertError } = await supabase
          .from("chart_of_accounts")
          .insert(defaultAccounts);

        if (insertError) {
          console.error("Error creating default accounts:", insertError);
          setChartOfAccounts([]);
        } else {
          console.log("Default accounts created successfully");
          // Reload the accounts after creating defaults
          await loadChartOfAccounts();
        }
        return;
      }

      console.log("Chart of accounts loaded from database:", data);
      setChartOfAccounts(data || []);
    } catch (error) {
      console.error("Error loading chart of accounts:", error);
      setChartOfAccounts([]);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.account_code || !newAccount.account_name) return;

    try {
      console.log("Adding new account:", newAccount);

      const { error } = await supabase.from("chart_of_accounts").insert({
        account_code: newAccount.account_code,
        account_name: newAccount.account_name,
        account_type: newAccount.account_type,
        normal_balance: newAccount.normal_balance,
        description: newAccount.description || null,
        is_active: newAccount.is_active,
      });

      if (error) {
        console.error("Error adding account:", error);
        alert("Failed to add account: " + error.message);
        return;
      }

      console.log("Account added successfully");

      // Refresh the accounts list from database
      await loadChartOfAccounts();

      // Reset form and close dialog
      setNewAccount({
        account_code: "",
        account_name: "",
        account_type: "asset",
        normal_balance: "debit",
        is_active: true,
        description: "",
      });
      setShowAddAccountDialog(false);

      alert("Account added successfully!");
    } catch (error) {
      console.error("Error adding account:", error);
      alert("Failed to add account. Please try again.");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this account? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      console.log("Deleting account with id:", id);

      const { error } = await supabase
        .from("chart_of_accounts")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting account:", error);
        alert("Failed to delete account: " + error.message);
        return;
      }

      console.log("Account deleted successfully");

      // Refresh the accounts list from database
      await loadChartOfAccounts();

      alert("Account deleted successfully!");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please try again.");
    }
  };

  const handleEditAccount = (account: ChartOfAccount) => {
    setEditingAccount(account);
    setShowEditAccountDialog(true);
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    try {
      console.log("Updating account:", editingAccount);

      const { error } = await supabase
        .from("chart_of_accounts")
        .update({
          account_code: editingAccount.account_code,
          account_name: editingAccount.account_name,
          account_type: editingAccount.account_type,
          normal_balance: editingAccount.normal_balance,
          description: editingAccount.description || null,
          is_active: editingAccount.is_active,
        })
        .eq("id", editingAccount.id);

      if (error) {
        console.error("Error updating account:", error);
        alert("Failed to update account: " + error.message);
        return;
      }

      console.log("Account updated successfully");

      // Refresh the accounts list from database
      await loadChartOfAccounts();

      // Reset form and close dialog
      setEditingAccount(null);
      setShowEditAccountDialog(false);

      alert("Account updated successfully!");
    } catch (error) {
      console.error("Error updating account:", error);
      alert("Failed to update account. Please try again.");
    }
  };

  const toggleAccountStatus = async (id: string) => {
    try {
      console.log("Toggling account status for id:", id);

      // Find the current account to get its current status
      const currentAccount = chartOfAccounts.find((acc) => acc.id === id);
      if (!currentAccount) {
        alert("Account not found");
        return;
      }

      const { error } = await supabase
        .from("chart_of_accounts")
        .update({ is_active: !currentAccount.is_active })
        .eq("id", id);

      if (error) {
        console.error("Error updating account status:", error);
        alert("Failed to update account status: " + error.message);
        return;
      }

      console.log("Account status updated successfully");

      // Refresh the accounts list from database
      await loadChartOfAccounts();

      alert(
        `Account ${currentAccount.is_active ? "deactivated" : "activated"} successfully!`,
      );
    } catch (error) {
      console.error("Error updating account status:", error);
      alert("Failed to update account status. Please try again.");
    }
  };

  // Users and Roles Management Functions
  const loadUsers = async () => {
    try {
      console.log("Loading users using server action...");

      const result = await getUsersAction();

      if (!result.success) {
        console.error("Error loading users:", result.error);
        setUsers([]);
        return;
      }

      console.log("Users loaded successfully:", result.users);
      setUsers(result.users);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    }
  };

  const loadUserRoles = async () => {
    try {
      console.log("Loading user roles using server action...");

      const result = await getUserRolesAction();

      if (!result.success) {
        console.error("Error loading user roles:", result.error);
        setUserRoles([]);
        return;
      }

      console.log("User roles loaded successfully:", result.userRoles);
      setUserRoles(result.userRoles);

      // Load permissions after roles are loaded
      setTimeout(() => {
        loadRolePermissions();
      }, 100);
    } catch (error) {
      console.error("Error loading user roles:", error);
      setUserRoles([]);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUserId || !selectedRole) {
      alert("Please select a user and role");
      return;
    }

    try {
      console.log("Assigning role:", { selectedUserId, selectedRole });

      // Check if user already has a role
      const existingRole = userRoles.find(
        (ur) => ur.user_id === selectedUserId,
      );

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: selectedRole })
          .eq("user_id", selectedUserId);

        if (error) {
          console.error("Error updating user role:", error);
          alert("Failed to update user role: " + error.message);
          return;
        }

        console.log("User role updated successfully");
        alert("User role updated successfully!");
      } else {
        // Create new role assignment
        const { error } = await supabase.from("user_roles").insert({
          user_id: selectedUserId,
          role: selectedRole,
        });

        if (error) {
          console.error("Error assigning role:", error);
          alert("Failed to assign role: " + error.message);
          return;
        }

        console.log("Role assigned successfully");
        alert("Role assigned successfully!");
      }

      // Refresh data
      await loadUserRoles();

      // Reset form and close dialog
      setSelectedUserId("");
      setSelectedRole("accountant");
      setShowAssignRoleDialog(false);
    } catch (error) {
      console.error("Error assigning role:", error);
      alert("Failed to assign role. Please try again.");
    }
  };

  const handleEditUserRole = (userRole: UserRole) => {
    setEditingUserRole(userRole);
    setShowEditRoleDialog(true);
  };

  const handleUpdateUserRole = async () => {
    if (!editingUserRole) return;

    try {
      console.log("Updating user role:", editingUserRole);

      const { error } = await supabase
        .from("user_roles")
        .update({ role: editingUserRole.role })
        .eq("id", editingUserRole.id);

      if (error) {
        console.error("Error updating user role:", error);
        alert("Failed to update user role: " + error.message);
        return;
      }

      console.log("User role updated successfully");
      alert("User role updated successfully!");

      // Refresh data
      await loadUserRoles();

      // Reset form and close dialog
      setEditingUserRole(null);
      setShowEditRoleDialog(false);
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role. Please try again.");
    }
  };

  const handleRemoveUserRole = async (userRoleId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this user's role? This will revoke their access permissions.",
      )
    ) {
      return;
    }

    try {
      console.log("Removing user role with id:", userRoleId);

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", userRoleId);

      if (error) {
        console.error("Error removing user role:", error);
        alert("Failed to remove user role: " + error.message);
        return;
      }

      console.log("User role removed successfully");
      alert("User role removed successfully!");

      // Refresh data
      await loadUserRoles();
    } catch (error) {
      console.error("Error removing user role:", error);
      alert("Failed to remove user role. Please try again.");
    }
  };

  // User Invitations Management Functions
  const loadUserInvitations = async () => {
    try {
      console.log("Loading user invitations from localStorage...");

      // For demo purposes, we'll use localStorage to simulate invitations
      // In a real app, you'd fetch from a database table
      if (typeof window !== "undefined") {
        const savedInvitations = localStorage.getItem("ngo_user_invitations");
        if (savedInvitations) {
          setUserInvitations(JSON.parse(savedInvitations));
        } else {
          setUserInvitations([]);
        }
      }
    } catch (error) {
      console.error("Error loading user invitations:", error);
      setUserInvitations([]);
    }
  };

  const saveUserInvitations = (invitations: UserInvitation[]) => {
    try {
      setUserInvitations(invitations);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "ngo_user_invitations",
          JSON.stringify(invitations),
        );
      }
    } catch (error) {
      console.error("Error saving user invitations:", error);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      console.log("Creating new user with server action:", {
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
      });

      // Create FormData for server action
      const formData = new FormData();
      formData.append("email", newUser.email);
      formData.append("password", newUser.password);
      formData.append("full_name", newUser.full_name || "");
      formData.append("role", newUser.role);

      // Call server action
      const result = await createUserAction(formData);

      if (!result.success) {
        console.error("Error creating user:", result.error);
        alert("Failed to create user: " + result.error);
        return;
      }

      console.log("User creation result:", result);

      // Show appropriate message based on result
      if (result.roleAssignmentFailed) {
        alert(
          result.message +
            "\n\nThe user has been created but you'll need to assign their role manually.",
        );
      } else {
        alert(result.message || "User created successfully!");
      }

      // Reset form and close dialog first
      setNewUser({
        email: "",
        full_name: "",
        password: "",
        role: "accountant",
      });
      setShowAddUserDialog(false);

      // Immediately refresh data multiple times to ensure consistency
      try {
        console.log("Refreshing user data immediately...");

        // First refresh attempt
        await Promise.all([loadUsers(), loadUserRoles()]);

        // Wait a short moment and refresh again to ensure database consistency
        setTimeout(async () => {
          try {
            console.log("Second refresh attempt...");
            await Promise.all([loadUsers(), loadUserRoles()]);
            console.log(
              "User data refreshed successfully - user should now appear in list",
            );
          } catch (secondRefreshError) {
            console.error("Second refresh failed:", secondRefreshError);
          }
        }, 1000);

        // Third refresh after a longer delay to catch any delayed database updates
        setTimeout(async () => {
          try {
            console.log("Final refresh attempt...");
            await Promise.all([loadUsers(), loadUserRoles()]);
            console.log("Final refresh completed");
          } catch (finalRefreshError) {
            console.error("Final refresh failed:", finalRefreshError);
          }
        }, 3000);

        console.log("Initial data refresh completed");
      } catch (refreshError) {
        console.error("Error refreshing data:", refreshError);
        alert(
          "User created successfully, but there was an issue refreshing the list. The user should appear shortly or after refreshing the page.",
        );
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user. Please try again.");
    }
  };

  const handleInviteUser = async () => {
    if (!newInvitation.email) {
      alert("Please enter an email address");
      return;
    }

    try {
      console.log("Sending user invitation:", newInvitation);

      // Get current user for invited_by field
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      // Create invitation record
      const invitation: UserInvitation = {
        id: Date.now().toString(),
        email: newInvitation.email,
        full_name: newInvitation.full_name,
        role: newInvitation.role,
        status: "pending",
        invited_by: currentUser?.email || "admin",
        created_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 7 days
      };

      const newInvitations = [...userInvitations, invitation];
      saveUserInvitations(newInvitations);

      // In a real app, you would send an email invitation here
      // For demo purposes, we'll just show a success message
      alert(
        `Invitation sent to ${newInvitation.email}! They will receive an email with instructions to join.`,
      );

      console.log("Invitation created successfully");

      // Reset form and close dialog
      setNewInvitation({
        email: "",
        full_name: "",
        role: "accountant",
        message: "",
      });
      setShowInviteUserDialog(false);
    } catch (error) {
      console.error("Error sending invitation:", error);
      alert("Failed to send invitation. Please try again.");
    }
  };

  const handleCancelInvitation = (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    const updatedInvitations = userInvitations.filter(
      (inv) => inv.id !== invitationId,
    );
    saveUserInvitations(updatedInvitations);
    alert("Invitation cancelled successfully!");
  };

  const handleResendInvitation = (invitationId: string) => {
    const invitation = userInvitations.find((inv) => inv.id === invitationId);
    if (!invitation) return;

    // Update expiry date
    const updatedInvitations = userInvitations.map((inv) =>
      inv.id === invitationId
        ? {
            ...inv,
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          }
        : inv,
    );
    saveUserInvitations(updatedInvitations);

    alert(`Invitation resent to ${invitation.email}!`);
  };

  const handleEditUser = (user: User) => {
    const userRole = userRoles.find((ur) => ur.user_id === user.id);
    setEditingUser({
      ...user,
      role: userRole?.role || "accountant",
      new_password: "",
      confirm_password: "",
    } as any);
    setShowEditUserDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) {
      alert("No user selected for editing");
      return;
    }

    if (!editingUser.email) {
      alert("Email is required");
      return;
    }

    // Validate password fields if provided
    const newPassword = (editingUser as any).new_password;
    const confirmPassword = (editingUser as any).confirm_password;

    if (newPassword || confirmPassword) {
      if (!newPassword || !confirmPassword) {
        alert("Please fill in both password fields or leave both empty");
        return;
      }

      if (newPassword !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long");
        return;
      }
    }

    try {
      console.log("Updating user:", editingUser);

      // First update user profile and role
      const formData = new FormData();
      formData.append("user_id", editingUser.id);
      formData.append("email", editingUser.email);
      formData.append("full_name", editingUser.full_name || "");
      formData.append("role", (editingUser as any).role || "");

      // Call server action for user update
      const result = await updateUserAction(formData);

      if (!result.success) {
        console.error("Error updating user:", result.error);
        alert("Failed to update user: " + result.error);
        return;
      }

      console.log("User update result:", result);

      // If password was provided, update it separately
      let passwordUpdateResult = null;
      if (newPassword) {
        try {
          const passwordFormData = new FormData();
          passwordFormData.append("user_id", editingUser.id);
          passwordFormData.append("new_password", newPassword);
          passwordFormData.append("confirm_password", confirmPassword);

          passwordUpdateResult =
            await changeUserPasswordAction(passwordFormData);

          if (!passwordUpdateResult.success) {
            console.error(
              "Error updating password:",
              passwordUpdateResult.error,
            );
            alert(
              "User profile updated successfully, but password update failed: " +
                passwordUpdateResult.error,
            );
          }
        } catch (passwordError) {
          console.error("Error updating password:", passwordError);
          alert(
            "User profile updated successfully, but password update failed. Please try updating the password separately.",
          );
        }
      }

      // Show appropriate success message
      let successMessage = result.message || "User updated successfully!";

      if (result.roleUpdateFailed || result.roleAssignmentFailed) {
        successMessage +=
          "\n\nNote: You may need to update their role manually.";
      }

      if (passwordUpdateResult?.success) {
        successMessage += "\n\nPassword has also been updated successfully.";
      }

      alert(successMessage);

      // Reset form and close dialog
      setEditingUser(null);
      setShowEditUserDialog(false);

      // Refresh data
      try {
        console.log("Refreshing user data after update...");
        await Promise.all([loadUsers(), loadUserRoles()]);
        console.log("User data refreshed successfully after update");
      } catch (refreshError) {
        console.error("Error refreshing data after update:", refreshError);
        alert(
          "User updated successfully, but there was an issue refreshing the list. Please refresh the page to see the changes.",
        );
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user. Please try again.");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to delete the user "${user.full_name || user.email}"? This action cannot be undone and will permanently remove their account and all associated data.`,
      )
    ) {
      return;
    }

    try {
      console.log("Deleting user:", user);

      // Create FormData for server action
      const formData = new FormData();
      formData.append("user_id", user.id);

      // Call server action
      const result = await deleteUserAction(formData);

      if (!result.success) {
        console.error("Error deleting user:", result.error);
        alert("Failed to delete user: " + result.error);
        return;
      }

      console.log("User deletion result:", result);
      alert(result.message || "User deleted successfully!");

      // Refresh data
      try {
        console.log("Refreshing user data after deletion...");
        await Promise.all([loadUsers(), loadUserRoles()]);
        console.log("User data refreshed successfully after deletion");
      } catch (refreshError) {
        console.error("Error refreshing data after deletion:", refreshError);
        alert(
          "User deleted successfully, but there was an issue refreshing the list. Please refresh the page to see the changes.",
        );
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    }
  };

  const handleChangeUserPassword = (user: User) => {
    setChangingPasswordUser(user);
    setPasswordChangeForm({
      new_password: "",
      confirm_password: "",
    });
    setShowChangePasswordDialog(true);
  };

  const handleUpdateUserPassword = async () => {
    if (!changingPasswordUser) {
      alert("No user selected for password change");
      return;
    }

    if (
      !passwordChangeForm.new_password ||
      !passwordChangeForm.confirm_password
    ) {
      alert("Please fill in both password fields");
      return;
    }

    if (
      passwordChangeForm.new_password !== passwordChangeForm.confirm_password
    ) {
      alert("Passwords do not match");
      return;
    }

    if (passwordChangeForm.new_password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    try {
      console.log("Changing password for user:", changingPasswordUser);

      // Create FormData for server action
      const formData = new FormData();
      formData.append("user_id", changingPasswordUser.id);
      formData.append("new_password", passwordChangeForm.new_password);
      formData.append("confirm_password", passwordChangeForm.confirm_password);

      // Call server action
      const result = await changeUserPasswordAction(formData);

      if (!result.success) {
        console.error("Error changing user password:", result.error);
        alert("Failed to change password: " + result.error);
        return;
      }

      console.log("Password change result:", result);
      alert(result.message || "Password changed successfully!");

      // Reset form and close dialog
      setChangingPasswordUser(null);
      setPasswordChangeForm({
        new_password: "",
        confirm_password: "",
      });
      setShowChangePasswordDialog(false);
    } catch (error) {
      console.error("Error changing user password:", error);
      alert("Failed to change password. Please try again.");
    }
  };

  // Filter users and roles based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name &&
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const filteredUserRoles = userRoles.filter(
    (userRole) =>
      userRole.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (userRole.user?.full_name &&
        userRole.user.full_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      userRole.role.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredUserInvitations = userInvitations.filter(
    (invitation) =>
      invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invitation.full_name &&
        invitation.full_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      invitation.role.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Get available roles - SIMPLIFIED to only admin and accountant
  const availableRoles = [
    {
      value: "admin",
      label: "Administrator",
      description: "Full system access - can edit and delete everything",
    },
    {
      value: "accountant",
      label: "Accountant (Read-Only)",
      description: "View-only access - cannot edit or delete anything",
    },
  ];

  // Define available permissions
  const availablePermissions: Permission[] = [
    // Financial Management
    {
      id: "view_finances",
      name: "View Financial Data",
      description: "Access to view financial reports and data",
      category: "Financial",
    },
    {
      id: "manage_expenses",
      name: "Manage Expenses",
      description: "Create, edit, and approve expenses",
      category: "Financial",
    },
    {
      id: "edit_expenses",
      name: "Edit Expenses",
      description: "Edit existing expense records",
      category: "Financial",
    },
    {
      id: "delete_expenses",
      name: "Delete Expenses",
      description: "Delete expense records",
      category: "Financial",
    },
    {
      id: "manage_budgets",
      name: "Manage Budgets",
      description: "Create and modify budget allocations",
      category: "Financial",
    },
    {
      id: "edit_budgets",
      name: "Edit Budgets",
      description: "Edit existing budget allocations",
      category: "Financial",
    },
    {
      id: "delete_budgets",
      name: "Delete Budgets",
      description: "Delete budget allocations",
      category: "Financial",
    },
    {
      id: "manage_currencies",
      name: "Manage Currencies",
      description: "Add and configure currency settings",
      category: "Financial",
    },
    {
      id: "edit_currencies",
      name: "Edit Currencies",
      description: "Edit existing currency settings",
      category: "Financial",
    },
    {
      id: "delete_currencies",
      name: "Delete Currencies",
      description: "Delete currency configurations",
      category: "Financial",
    },
    {
      id: "view_ledger",
      name: "View General Ledger",
      description: "Access to general ledger entries",
      category: "Financial",
    },
    {
      id: "manage_ledger",
      name: "Manage General Ledger",
      description: "Create and edit ledger entries",
      category: "Financial",
    },
    {
      id: "edit_ledger",
      name: "Edit Ledger Entries",
      description: "Edit existing ledger entries",
      category: "Financial",
    },
    {
      id: "delete_ledger",
      name: "Delete Ledger Entries",
      description: "Delete ledger entries",
      category: "Financial",
    },

    // Project Management
    {
      id: "view_projects",
      name: "View Projects",
      description: "Access to view project information",
      category: "Projects",
    },
    {
      id: "manage_projects",
      name: "Manage Projects",
      description: "Create, edit, and delete projects",
      category: "Projects",
    },
    {
      id: "edit_projects",
      name: "Edit Projects",
      description: "Edit existing project information",
      category: "Projects",
    },
    {
      id: "delete_projects",
      name: "Delete Projects",
      description: "Delete project records",
      category: "Projects",
    },
    {
      id: "assign_project_budgets",
      name: "Assign Project Budgets",
      description: "Allocate budgets to projects",
      category: "Projects",
    },

    // Donor Management
    {
      id: "view_donors",
      name: "View Donors",
      description: "Access to donor information",
      category: "Donors",
    },
    {
      id: "manage_donors",
      name: "Manage Donors",
      description: "Add, edit, and manage donor records",
      category: "Donors",
    },
    {
      id: "edit_donors",
      name: "Edit Donors",
      description: "Edit existing donor information",
      category: "Donors",
    },
    {
      id: "delete_donors",
      name: "Delete Donors",
      description: "Delete donor records",
      category: "Donors",
    },
    {
      id: "view_donations",
      name: "View Donations",
      description: "Access to donation history and reports",
      category: "Donors",
    },

    // Reporting
    {
      id: "view_reports",
      name: "View Reports",
      description: "Access to generated reports",
      category: "Reports",
    },
    {
      id: "generate_reports",
      name: "Generate Reports",
      description: "Create and export reports",
      category: "Reports",
    },
    {
      id: "edit_reports",
      name: "Edit Reports",
      description: "Edit existing reports",
      category: "Reports",
    },
    {
      id: "delete_reports",
      name: "Delete Reports",
      description: "Delete generated reports",
      category: "Reports",
    },
    {
      id: "manage_report_templates",
      name: "Manage Report Templates",
      description: "Create and modify report templates",
      category: "Reports",
    },

    // User Management
    {
      id: "view_users",
      name: "View Users",
      description: "Access to user list and information",
      category: "Users",
    },
    {
      id: "manage_users",
      name: "Manage Users",
      description: "Create, edit, and delete user accounts",
      category: "Users",
    },
    {
      id: "edit_users",
      name: "Edit Users",
      description: "Edit existing user accounts",
      category: "Users",
    },
    {
      id: "delete_users",
      name: "Delete Users",
      description: "Delete user accounts",
      category: "Users",
    },
    {
      id: "assign_roles",
      name: "Assign Roles",
      description: "Assign and modify user roles",
      category: "Users",
    },
    {
      id: "manage_permissions",
      name: "Manage Permissions",
      description: "Grant and revoke specific permissions",
      category: "Users",
    },

    // System Settings
    {
      id: "view_settings",
      name: "View Settings",
      description: "Access to system settings",
      category: "System",
    },
    {
      id: "manage_settings",
      name: "Manage Settings",
      description: "Modify system configuration",
      category: "System",
    },
    {
      id: "edit_settings",
      name: "Edit Settings",
      description: "Edit system configuration",
      category: "System",
    },
    {
      id: "manage_categories",
      name: "Manage Categories",
      description: "Create and edit budget categories",
      category: "System",
    },
    {
      id: "edit_categories",
      name: "Edit Categories",
      description: "Edit existing budget categories",
      category: "System",
    },
    {
      id: "delete_categories",
      name: "Delete Categories",
      description: "Delete budget categories",
      category: "System",
    },
    {
      id: "manage_accounts",
      name: "Manage Chart of Accounts",
      description: "Modify chart of accounts",
      category: "System",
    },
    {
      id: "edit_accounts",
      name: "Edit Chart of Accounts",
      description: "Edit existing chart of accounts",
      category: "System",
    },
    {
      id: "delete_accounts",
      name: "Delete Chart of Accounts",
      description: "Delete chart of accounts entries",
      category: "System",
    },
  ];

  // Load role permissions
  const loadRolePermissions = async () => {
    try {
      // For now, we'll use localStorage to simulate database storage
      const savedPermissions = localStorage.getItem("ngo_role_permissions");
      if (savedPermissions) {
        setRolePermissions(JSON.parse(savedPermissions));
      } else {
        // Initialize with default permissions for each role
        const defaultPermissions: RolePermission[] = [];

        availableRoles.forEach((role) => {
          const roleDefaultPermissions = getRoleDefaultPermissions(role.value);
          roleDefaultPermissions.forEach((permissionId) => {
            defaultPermissions.push({
              role: role.value,
              permission_id: permissionId,
              granted: true,
              granted_by: "system",
              granted_at: new Date().toISOString(),
            });
          });
        });

        setRolePermissions(defaultPermissions);
        localStorage.setItem(
          "ngo_role_permissions",
          JSON.stringify(defaultPermissions),
        );
      }
    } catch (error) {
      console.error("Error loading role permissions:", error);
      setRolePermissions([]);
    }
  };

  // Get default permissions for a role - SIMPLIFIED
  const getRoleDefaultPermissions = (role: string): string[] => {
    switch (role) {
      case "admin":
        return availablePermissions.map((p) => p.id); // All permissions
      case "accountant":
        return [
          // ONLY view permissions for accountant - NO edit/delete/manage permissions
          "view_finances",
          "view_ledger",
          "view_projects",
          "view_donors",
          "view_donations",
          "view_reports",
          "view_users",
          "view_settings", // Can view some settings but cannot edit
        ];
      default:
        return [];
    }
  };

  // Save role permissions
  const saveRolePermissions = (permissions: RolePermission[]) => {
    setRolePermissions(permissions);
    localStorage.setItem("ngo_role_permissions", JSON.stringify(permissions));
  };

  // Toggle role permission
  const toggleRolePermission = async (role: string, permissionId: string) => {
    if (!canManageRoles()) {
      alert("You don't have permission to manage role permissions.");
      return;
    }

    const existingPermission = rolePermissions.find(
      (p) => p.role === role && p.permission_id === permissionId,
    );

    let updatedPermissions: RolePermission[];

    if (existingPermission) {
      // Toggle existing permission
      updatedPermissions = rolePermissions.map((p) =>
        p.role === role && p.permission_id === permissionId
          ? {
              ...p,
              granted: !p.granted,
              granted_at: new Date().toISOString(),
            }
          : p,
      );
    } else {
      // Add new permission
      const newPermission: RolePermission = {
        role: role,
        permission_id: permissionId,
        granted: true,
        granted_by: "admin",
        granted_at: new Date().toISOString(),
      };
      updatedPermissions = [...rolePermissions, newPermission];
    }

    saveRolePermissions(updatedPermissions);
  };

  // Check if role has specific permission
  const hasRolePermission = (role: string, permissionId: string): boolean => {
    const permission = rolePermissions.find(
      (p) => p.role === role && p.permission_id === permissionId,
    );
    return permission?.granted || false;
  };

  // Check if user has specific permission (based on their role)
  const hasUserPermission = (userId: string, permissionId: string): boolean => {
    const userRole = userRoles.find((ur) => ur.user_id === userId);
    if (!userRole) return false;
    return hasRolePermission(userRole.role, permissionId);
  };

  // Group permissions by category
  const permissionsByCategory = availablePermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  // Get users without roles for assignment
  const usersWithoutRoles = users.filter(
    (user) => !userRoles.some((ur) => ur.user_id === user.id),
  );

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <main className="w-full">
          <div className="container mx-auto px-4 py-8 flex items-center justify-center">
            <div className="text-gray-500">
              {roleLoading ? "Loading permissions..." : "Loading settings..."}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Check if user has any access to settings
  if (!hasSettingsAccess()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <main className="w-full">
          <div className="container mx-auto px-4 py-8">
            <RestrictedAccessCard
              title="Settings Access Denied"
              description="You don't have permission to access the settings page. Only administrators can access and modify settings. Accountants have read-only access to view certain information but cannot edit anything."
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <DashboardCurrencyUpdater />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header */}
          <header className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Settings className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">
                  Manage system settings, currencies, projects, donors, and
                  accounts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  isAdmin
                    ? "bg-red-100 text-red-800"
                    : hasManageSettings
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {isAdmin
                  ? "Administrator Access"
                  : hasManageSettings
                    ? "Settings Manager"
                    : "Limited Access"}
              </div>
              <div className="text-xs text-gray-500">Role: {userRole}</div>
              <div className="text-xs text-gray-500">
                Currency: {getDefaultCurrency().code} (
                {getDefaultCurrency().symbol})
              </div>
            </div>
          </header>

          {/* Debug Information */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-sm text-yellow-800">
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>
                  <strong>Current Role:</strong> {userRole}
                </p>
                <p>
                  <strong>Role Loading:</strong> {roleLoading ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Can Manage Currencies:</strong>{" "}
                  {canManageCurrencies() ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Can Manage Projects:</strong>{" "}
                  {canManageProjects() ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Can Manage Donors:</strong>{" "}
                  {canManageDonors() ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Can View Currencies Section:</strong>{" "}
                  {canViewSection("currencies") ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Can View Projects Section:</strong>{" "}
                  {canViewSection("projects") ? "Yes" : "No"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Currency Management */}
          {canViewSection("currencies") ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Currency Management
                    </CardTitle>
                    <CardDescription>
                      Manage supported currencies for your organization
                    </CardDescription>
                  </div>
                  {canManageCurrencies() && (
                    <Dialog
                      open={showAddCurrencyDialog}
                      onOpenChange={setShowAddCurrencyDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Currency
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Currency</DialogTitle>
                          <DialogDescription>
                            Add a new currency to your organization
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="currency_code">
                                Currency Code *
                              </Label>
                              <Input
                                id="currency_code"
                                value={newCurrency.code}
                                onChange={(e) =>
                                  setNewCurrency({
                                    ...newCurrency,
                                    code: e.target.value,
                                  })
                                }
                                placeholder="USD, EUR, RWF"
                                maxLength={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="currency_symbol">Symbol *</Label>
                              <Input
                                id="currency_symbol"
                                value={newCurrency.symbol}
                                onChange={(e) =>
                                  setNewCurrency({
                                    ...newCurrency,
                                    symbol: e.target.value,
                                  })
                                }
                                placeholder="$, €, FRw"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="currency_name">
                              Currency Name *
                            </Label>
                            <Input
                              id="currency_name"
                              value={newCurrency.name}
                              onChange={(e) =>
                                setNewCurrency({
                                  ...newCurrency,
                                  name: e.target.value,
                                })
                              }
                              placeholder="US Dollar, Euro, Rwandan Franc"
                            />
                          </div>
                          <div>
                            <Label htmlFor="exchange_rate">
                              Exchange Rate (to USD)
                            </Label>
                            <Input
                              id="exchange_rate"
                              type="number"
                              step="0.0001"
                              value={newCurrency.exchange_rate}
                              onChange={(e) =>
                                setNewCurrency({
                                  ...newCurrency,
                                  exchange_rate: e.target.value,
                                })
                              }
                              placeholder="1.0000"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddCurrencyDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddCurrency}>
                              Add Currency
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Exchange Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies.map((currency) => (
                      <TableRow key={currency.id}>
                        <TableCell className="font-medium">
                          {currency.code}
                        </TableCell>
                        <TableCell>{currency.name}</TableCell>
                        <TableCell>{currency.symbol}</TableCell>
                        <TableCell>
                          {currency.exchange_rate || "1.0000"}
                        </TableCell>
                        <TableCell>
                          {currency.is_default ? (
                            <Badge className="bg-green-100 text-green-800">
                              Default
                            </Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canManageCurrencies() ? (
                              <>
                                {!currency.is_default && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setDefaultCurrency(currency.id)
                                    }
                                    title="Set as system default currency"
                                  >
                                    Set Default
                                  </Button>
                                )}
                                {currency.is_default && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    System Default
                                  </Badge>
                                )}
                                {!currency.is_default && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeCurrency(currency.id)}
                                    className="text-red-600 hover:text-red-700"
                                    title="Remove currency"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">
                                View Only
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <RestrictedAccessCard
              title="Currency Management"
              description="Manage supported currencies for your organization"
            />
          )}

          {/* Projects Management */}
          {canViewSection("projects") ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Projects Management
                    </CardTitle>
                    <CardDescription>
                      Manage projects, their details, status, and budgets
                    </CardDescription>
                  </div>
                  {canManageProjects() && (
                    <Dialog
                      open={showAddProjectDialog}
                      onOpenChange={setShowAddProjectDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Project
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Add New Project</DialogTitle>
                          <DialogDescription>
                            Create a new project for your organization
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="project_name">Project Name *</Label>
                            <Input
                              id="project_name"
                              value={newProject.name}
                              onChange={(e) =>
                                setNewProject({
                                  ...newProject,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Enter project name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="project_description">
                              Description
                            </Label>
                            <Textarea
                              id="project_description"
                              value={newProject.description}
                              onChange={(e) =>
                                setNewProject({
                                  ...newProject,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Project description"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="project_status">Status</Label>
                              <Select
                                value={newProject.status}
                                onValueChange={(value) =>
                                  setNewProject({
                                    ...newProject,
                                    status: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="completed">
                                    Completed
                                  </SelectItem>
                                  <SelectItem value="on_hold">
                                    On Hold
                                  </SelectItem>
                                  <SelectItem value="cancelled">
                                    Cancelled
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="project_budget">Budget</Label>
                              <Input
                                id="project_budget"
                                type="number"
                                step="0.01"
                                value={newProject.budget}
                                onChange={(e) =>
                                  setNewProject({
                                    ...newProject,
                                    budget: e.target.value,
                                  })
                                }
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="project_start_date">
                                Start Date
                              </Label>
                              <Input
                                id="project_start_date"
                                type="date"
                                value={newProject.start_date}
                                onChange={(e) =>
                                  setNewProject({
                                    ...newProject,
                                    start_date: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="project_end_date">End Date</Label>
                              <Input
                                id="project_end_date"
                                type="date"
                                value={newProject.end_date}
                                onChange={(e) =>
                                  setNewProject({
                                    ...newProject,
                                    end_date: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddProjectDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddProject}>
                              Add Project
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Budget</TableHead>
                      <TableHead>Spent</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{project.name}</div>
                            {project.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              project.status === "active"
                                ? "bg-green-100 text-green-800"
                                : project.status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : project.status === "on_hold"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                            }
                          >
                            {project.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {project.planned_budget !== undefined
                              ? `${project.planned_budget.toLocaleString()}`
                              : "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {project.planned_budget !== undefined &&
                            project.planned_budget > 0
                              ? "Planned"
                              : "No budget set"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-red-600">
                            {project.spent_amount !== undefined
                              ? `${project.spent_amount.toLocaleString()}`
                              : "0"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Approved/Paid
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`text-sm ${
                              project.remaining_budget !== undefined &&
                              project.remaining_budget < 0
                                ? "text-red-600 font-semibold"
                                : project.remaining_budget !== undefined &&
                                    project.remaining_budget > 0
                                  ? "text-green-600"
                                  : "text-gray-500"
                            }`}
                          >
                            {project.remaining_budget !== undefined
                              ? `${project.remaining_budget.toLocaleString()}`
                              : "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {project.remaining_budget !== undefined &&
                            project.remaining_budget < 0
                              ? "Over budget"
                              : project.remaining_budget !== undefined &&
                                  project.remaining_budget > 0
                                ? "Available"
                                : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.start_date
                            ? new Date(project.start_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {project.end_date
                            ? new Date(project.end_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canManageProjects() ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditProject(project)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleDeleteProject(project.id)
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">
                                View Only
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {projects.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No projects found. Click "Add Project" to create your first
                    project.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <RestrictedAccessCard
              title="Projects Management"
              description="Manage projects, their details, status, and budgets"
            />
          )}

          {/* Edit Project Dialog */}
          <Dialog
            open={showEditProjectDialog}
            onOpenChange={setShowEditProjectDialog}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>Update project details</DialogDescription>
              </DialogHeader>
              {editingProject && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit_project_name">Project Name *</Label>
                    <Input
                      id="edit_project_name"
                      value={editingProject.name}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          name: e.target.value,
                        })
                      }
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_project_description">
                      Description
                    </Label>
                    <Textarea
                      id="edit_project_description"
                      value={editingProject.description || ""}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          description: e.target.value,
                        })
                      }
                      placeholder="Project description"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_project_status">Status</Label>
                      <Select
                        value={editingProject.status}
                        onValueChange={(value) =>
                          setEditingProject({
                            ...editingProject,
                            status: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit_project_budget">Budget</Label>
                      <Input
                        id="edit_project_budget"
                        type="number"
                        step="0.01"
                        value={editingProject.budget || ""}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            budget: parseFloat(e.target.value) || undefined,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_project_start_date">
                        Start Date
                      </Label>
                      <Input
                        id="edit_project_start_date"
                        type="date"
                        value={editingProject.start_date || ""}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_project_end_date">End Date</Label>
                      <Input
                        id="edit_project_end_date"
                        type="date"
                        value={editingProject.end_date || ""}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            end_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditProjectDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateProject}>
                      Update Project
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Donors Management */}
          {canViewSection("donors") ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Donors Management
                    </CardTitle>
                    <CardDescription>
                      Manage donor information, contact details, and types
                    </CardDescription>
                  </div>
                  {canManageDonors() && (
                    <Dialog
                      open={showAddDonorDialog}
                      onOpenChange={setShowAddDonorDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Donor
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Add New Donor</DialogTitle>
                          <DialogDescription>
                            Add a new donor to your organization
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="donor_name">Donor Name *</Label>
                              <Input
                                id="donor_name"
                                value={newDonor.name}
                                onChange={(e) =>
                                  setNewDonor({
                                    ...newDonor,
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Enter donor name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="donor_type">Type</Label>
                              <Select
                                value={newDonor.type}
                                onValueChange={(value) =>
                                  setNewDonor({ ...newDonor, type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="individual">
                                    Individual
                                  </SelectItem>
                                  <SelectItem value="organization">
                                    Organization
                                  </SelectItem>
                                  <SelectItem value="foundation">
                                    Foundation
                                  </SelectItem>
                                  <SelectItem value="government">
                                    Government
                                  </SelectItem>
                                  <SelectItem value="corporate">
                                    Corporate
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="donor_email">Contact Email</Label>
                              <Input
                                id="donor_email"
                                type="email"
                                value={newDonor.contact_email}
                                onChange={(e) =>
                                  setNewDonor({
                                    ...newDonor,
                                    contact_email: e.target.value,
                                  })
                                }
                                placeholder="donor@example.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="donor_phone">Contact Phone</Label>
                              <Input
                                id="donor_phone"
                                value={newDonor.contact_phone}
                                onChange={(e) =>
                                  setNewDonor({
                                    ...newDonor,
                                    contact_phone: e.target.value,
                                  })
                                }
                                placeholder="+1 (555) 123-4567"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="donor_address">Address</Label>
                            <Textarea
                              id="donor_address"
                              value={newDonor.address}
                              onChange={(e) =>
                                setNewDonor({
                                  ...newDonor,
                                  address: e.target.value,
                                })
                              }
                              placeholder="Full address"
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label htmlFor="donor_notes">Notes</Label>
                            <Textarea
                              id="donor_notes"
                              value={newDonor.notes}
                              onChange={(e) =>
                                setNewDonor({
                                  ...newDonor,
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Additional notes about the donor"
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddDonorDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddDonor}>Add Donor</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact Email</TableHead>
                      <TableHead>Contact Phone</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donors.map((donor) => (
                      <TableRow key={donor.id}>
                        <TableCell className="font-medium">
                          {donor.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {donor.type.replace("_", " ").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{donor.contact_email || "-"}</TableCell>
                        <TableCell>{donor.contact_phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canManageDonors() ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditDonor(donor)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteDonor(donor.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">
                                View Only
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {donors.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No donors found. Click "Add Donor" to create your first
                    donor record.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <RestrictedAccessCard
              title="Donors Management"
              description="Manage donor information, contact details, and types"
            />
          )}

          {/* Edit Donor Dialog */}
          <Dialog
            open={showEditDonorDialog}
            onOpenChange={setShowEditDonorDialog}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Donor</DialogTitle>
                <DialogDescription>Update donor information</DialogDescription>
              </DialogHeader>
              {editingDonor && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_donor_name">Donor Name *</Label>
                      <Input
                        id="edit_donor_name"
                        value={editingDonor.name}
                        onChange={(e) =>
                          setEditingDonor({
                            ...editingDonor,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter donor name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_donor_type">Type</Label>
                      <Select
                        value={editingDonor.type}
                        onValueChange={(value) =>
                          setEditingDonor({ ...editingDonor, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="organization">
                            Organization
                          </SelectItem>
                          <SelectItem value="foundation">Foundation</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="corporate">Corporate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_donor_email">Contact Email</Label>
                      <Input
                        id="edit_donor_email"
                        type="email"
                        value={editingDonor.contact_email || ""}
                        onChange={(e) =>
                          setEditingDonor({
                            ...editingDonor,
                            contact_email: e.target.value,
                          })
                        }
                        placeholder="donor@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_donor_phone">Contact Phone</Label>
                      <Input
                        id="edit_donor_phone"
                        value={editingDonor.contact_phone || ""}
                        onChange={(e) =>
                          setEditingDonor({
                            ...editingDonor,
                            contact_phone: e.target.value,
                          })
                        }
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit_donor_address">Address</Label>
                    <Textarea
                      id="edit_donor_address"
                      value={editingDonor.address || ""}
                      onChange={(e) =>
                        setEditingDonor({
                          ...editingDonor,
                          address: e.target.value,
                        })
                      }
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_donor_notes">Notes</Label>
                    <Textarea
                      id="edit_donor_notes"
                      value={editingDonor.notes || ""}
                      onChange={(e) =>
                        setEditingDonor({
                          ...editingDonor,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Additional notes about the donor"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditDonorDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateDonor}>Update Donor</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Budget Categories Management */}
          {canViewSection("categories") ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Budget Categories Management
                    </CardTitle>
                    <CardDescription>
                      Manage budget categories for expense classification
                    </CardDescription>
                  </div>
                  {canManageBudgetCategories() && (
                    <Dialog
                      open={showAddCategoryDialog}
                      onOpenChange={setShowAddCategoryDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Category
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Budget Category</DialogTitle>
                          <DialogDescription>
                            Create a new budget category for expense
                            classification
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="category_name">
                              Category Name *
                            </Label>
                            <Input
                              id="category_name"
                              value={newCategory.name}
                              onChange={(e) =>
                                setNewCategory({
                                  ...newCategory,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Enter category name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="category_description">
                              Description
                            </Label>
                            <Textarea
                              id="category_description"
                              value={newCategory.description}
                              onChange={(e) =>
                                setNewCategory({
                                  ...newCategory,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Category description"
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddCategoryDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddCategory}>
                              Add Category
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell>{category.description || "-"}</TableCell>
                        <TableCell>
                          {category.created_at
                            ? new Date(category.created_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canManageBudgetCategories() ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditCategory(category)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">
                                View Only
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {budgetCategories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No budget categories found. Click "Add Category" to create
                    your first category.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <RestrictedAccessCard
              title="Budget Categories Management"
              description="Manage budget categories for expense classification"
            />
          )}

          {/* Edit Category Dialog */}
          <Dialog
            open={showEditCategoryDialog}
            onOpenChange={setShowEditCategoryDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Budget Category</DialogTitle>
                <DialogDescription>
                  Update category information
                </DialogDescription>
              </DialogHeader>
              {editingCategory && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit_category_name">Category Name *</Label>
                    <Input
                      id="edit_category_name"
                      value={editingCategory.name}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          name: e.target.value,
                        })
                      }
                      placeholder="Enter category name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_category_description">
                      Description
                    </Label>
                    <Textarea
                      id="edit_category_description"
                      value={editingCategory.description || ""}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          description: e.target.value,
                        })
                      }
                      placeholder="Category description"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditCategoryDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateCategory}>
                      Update Category
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Chart of Accounts Management */}
          {canViewSection("accounts") ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Chart of Accounts Management
                    </CardTitle>
                    <CardDescription>
                      Manage account codes, names, types, and normal balance
                    </CardDescription>
                  </div>
                  {canManageChartOfAccounts() && (
                    <Dialog
                      open={showAddAccountDialog}
                      onOpenChange={setShowAddAccountDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Account</DialogTitle>
                          <DialogDescription>
                            Create a new account in the chart of accounts
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="account_code">Code *</Label>
                              <Input
                                id="account_code"
                                value={newAccount.account_code}
                                onChange={(e) =>
                                  setNewAccount({
                                    ...newAccount,
                                    account_code: e.target.value,
                                  })
                                }
                                placeholder="1000, 2000, etc."
                              />
                            </div>
                            <div>
                              <Label htmlFor="account_name">Name *</Label>
                              <Input
                                id="account_name"
                                value={newAccount.account_name}
                                onChange={(e) =>
                                  setNewAccount({
                                    ...newAccount,
                                    account_name: e.target.value,
                                  })
                                }
                                placeholder="Cash, Accounts Payable, etc."
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="account_type">Type</Label>
                              <Select
                                value={newAccount.account_type}
                                onValueChange={(value) =>
                                  setNewAccount({
                                    ...newAccount,
                                    account_type: value,
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
                                  <SelectItem value="revenue">
                                    Revenue
                                  </SelectItem>
                                  <SelectItem value="expense">
                                    Expense
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="normal_balance">
                                Normal Balance
                              </Label>
                              <Select
                                value={newAccount.normal_balance}
                                onValueChange={(value) =>
                                  setNewAccount({
                                    ...newAccount,
                                    normal_balance: value,
                                  })
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
                          </div>
                          <div>
                            <Label htmlFor="account_status">Status</Label>
                            <Select
                              value={
                                newAccount.is_active ? "active" : "inactive"
                              }
                              onValueChange={(value) =>
                                setNewAccount({
                                  ...newAccount,
                                  is_active: value === "active",
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                  Inactive
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="account_description">
                              Description (Optional)
                            </Label>
                            <Textarea
                              id="account_description"
                              value={newAccount.description}
                              onChange={(e) =>
                                setNewAccount({
                                  ...newAccount,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Account description"
                              rows={2}
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddAccountDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddAccount}>
                              Add Account
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Normal Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartOfAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.account_code}
                        </TableCell>
                        <TableCell>{account.account_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {account.account_type?.toUpperCase() || "UNKNOWN"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              account.normal_balance === "debit"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {account.normal_balance?.toUpperCase() || "UNKNOWN"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              account.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {account.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canManageChartOfAccounts() ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditAccount(account)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    toggleAccountStatus(account.id)
                                  }
                                >
                                  {account.is_active
                                    ? "Deactivate"
                                    : "Activate"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleDeleteAccount(account.id)
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">
                                View Only
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {chartOfAccounts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No accounts found. Click "Add Account" to create your first
                    account.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <RestrictedAccessCard
              title="Chart of Accounts Management"
              description="Manage account codes, names, types, and normal balance"
            />
          )}

          {/* Edit Account Dialog */}
          <Dialog
            open={showEditAccountDialog}
            onOpenChange={setShowEditAccountDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Account</DialogTitle>
                <DialogDescription>
                  Update account information
                </DialogDescription>
              </DialogHeader>
              {editingAccount && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_account_code">Code *</Label>
                      <Input
                        id="edit_account_code"
                        value={editingAccount.account_code}
                        onChange={(e) =>
                          setEditingAccount({
                            ...editingAccount,
                            account_code: e.target.value,
                          })
                        }
                        placeholder="1000, 2000, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_account_name">Name *</Label>
                      <Input
                        id="edit_account_name"
                        value={editingAccount.account_name}
                        onChange={(e) =>
                          setEditingAccount({
                            ...editingAccount,
                            account_name: e.target.value,
                          })
                        }
                        placeholder="Cash, Accounts Payable, etc."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_account_type">Type</Label>
                      <Select
                        value={editingAccount.account_type}
                        onValueChange={(value) =>
                          setEditingAccount({
                            ...editingAccount,
                            account_type: value,
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
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit_normal_balance">
                        Normal Balance
                      </Label>
                      <Select
                        value={editingAccount.normal_balance}
                        onValueChange={(value) =>
                          setEditingAccount({
                            ...editingAccount,
                            normal_balance: value,
                          })
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
                  </div>
                  <div>
                    <Label htmlFor="edit_account_status">Status</Label>
                    <Select
                      value={editingAccount.is_active ? "active" : "inactive"}
                      onValueChange={(value) =>
                        setEditingAccount({
                          ...editingAccount,
                          is_active: value === "active",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit_account_description">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="edit_account_description"
                      value={editingAccount.description || ""}
                      onChange={(e) =>
                        setEditingAccount({
                          ...editingAccount,
                          description: e.target.value,
                        })
                      }
                      placeholder="Account description"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditAccountDialog(false);
                        setEditingAccount(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateAccount}>
                      Update Account
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Payment Methods */}
          {canViewSection("payments") ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>
                      Manage available payment methods for expenses
                    </CardDescription>
                  </div>
                  {canManagePaymentMethods() && (
                    <Dialog
                      open={showAddPaymentDialog}
                      onOpenChange={setShowAddPaymentDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Payment Method
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Payment Method</DialogTitle>
                          <DialogDescription>
                            Add a new payment method for expense tracking
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="payment_name">
                              Payment Method Name *
                            </Label>
                            <Input
                              id="payment_name"
                              value={newPaymentMethod.name}
                              onChange={(e) =>
                                setNewPaymentMethod({
                                  ...newPaymentMethod,
                                  name: e.target.value,
                                })
                              }
                              placeholder="PayPal, Stripe, etc."
                            />
                          </div>
                          <div>
                            <Label htmlFor="payment_type">Type</Label>
                            <Select
                              value={newPaymentMethod.type}
                              onValueChange={(value) =>
                                setNewPaymentMethod({
                                  ...newPaymentMethod,
                                  type: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">
                                  Bank Transfer
                                </SelectItem>
                                <SelectItem value="credit_card">
                                  Credit Card
                                </SelectItem>
                                <SelectItem value="mobile_money">
                                  Mobile Money
                                </SelectItem>
                                <SelectItem value="digital_wallet">
                                  Digital Wallet
                                </SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddPaymentDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddPaymentMethod}>
                              Add Payment Method
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">
                          {method.name}
                        </TableCell>
                        <TableCell className="capitalize">
                          {method.type.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              method.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {method.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canManagePaymentMethods() ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => togglePaymentMethod(method.id)}
                                >
                                  {method.is_active ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removePaymentMethod(method.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">
                                View Only
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <RestrictedAccessCard
              title="Payment Methods"
              description="Manage available payment methods for expenses"
            />
          )}

          {/* User Management */}
          {canViewSection("users") ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      User Management
                    </CardTitle>
                    <CardDescription>
                      Add new users, send invitations, and manage user accounts
                    </CardDescription>
                  </div>
                  {canManageUsers() && (
                    <div className="flex gap-2">
                      <Dialog
                        open={showInviteUserDialog}
                        onOpenChange={setShowInviteUserDialog}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Mail className="h-4 w-4" />
                            Send Invitation
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Invite New User</DialogTitle>
                            <DialogDescription>
                              Send an email invitation to a new user to join
                              your organization
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="invite_email">
                                  Email Address *
                                </Label>
                                <Input
                                  id="invite_email"
                                  type="email"
                                  value={newInvitation.email}
                                  onChange={(e) =>
                                    setNewInvitation({
                                      ...newInvitation,
                                      email: e.target.value,
                                    })
                                  }
                                  placeholder="user@example.com"
                                />
                              </div>
                              <div>
                                <Label htmlFor="invite_full_name">
                                  Full Name
                                </Label>
                                <Input
                                  id="invite_full_name"
                                  value={newInvitation.full_name}
                                  onChange={(e) =>
                                    setNewInvitation({
                                      ...newInvitation,
                                      full_name: e.target.value,
                                    })
                                  }
                                  placeholder="John Doe"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="invite_role">Initial Role</Label>
                              <Select
                                value={newInvitation.role}
                                onValueChange={(value) =>
                                  setNewInvitation({
                                    ...newInvitation,
                                    role: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map((role) => (
                                    <SelectItem
                                      key={role.value}
                                      value={role.value}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {role.label}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {role.description}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="invite_message">
                                Personal Message (Optional)
                              </Label>
                              <Textarea
                                id="invite_message"
                                value={newInvitation.message}
                                onChange={(e) =>
                                  setNewInvitation({
                                    ...newInvitation,
                                    message: e.target.value,
                                  })
                                }
                                placeholder="Welcome to our organization! We're excited to have you join our team."
                                rows={3}
                              />
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h4 className="font-medium text-blue-900 mb-2">
                                Invitation Details:
                              </h4>
                              <div className="text-sm text-blue-800 space-y-1">
                                <p>
                                  • The user will receive an email with a secure
                                  invitation link
                                </p>
                                <p>• The invitation will expire in 7 days</p>
                                <p>
                                  • They will be assigned the{" "}
                                  {
                                    availableRoles.find(
                                      (r) => r.value === newInvitation.role,
                                    )?.label
                                  }{" "}
                                  role
                                </p>
                                <p>
                                  • You can resend or cancel the invitation at
                                  any time
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowInviteUserDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleInviteUser}>
                                Send Invitation
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={showAddUserDialog}
                        onOpenChange={setShowAddUserDialog}
                      >
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add User Directly
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>
                              Create a new user account directly in the system
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="user_email">
                                  Email Address *
                                </Label>
                                <Input
                                  id="user_email"
                                  type="email"
                                  value={newUser.email}
                                  onChange={(e) =>
                                    setNewUser({
                                      ...newUser,
                                      email: e.target.value,
                                    })
                                  }
                                  placeholder="user@example.com"
                                />
                              </div>
                              <div>
                                <Label htmlFor="user_full_name">
                                  Full Name
                                </Label>
                                <Input
                                  id="user_full_name"
                                  value={newUser.full_name}
                                  onChange={(e) =>
                                    setNewUser({
                                      ...newUser,
                                      full_name: e.target.value,
                                    })
                                  }
                                  placeholder="John Doe"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="user_password">
                                Temporary Password *
                              </Label>
                              <Input
                                id="user_password"
                                type="password"
                                value={newUser.password}
                                onChange={(e) =>
                                  setNewUser({
                                    ...newUser,
                                    password: e.target.value,
                                  })
                                }
                                placeholder="Enter a secure password"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                The user will be prompted to change this
                                password on first login
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="user_role">Initial Role</Label>
                              <Select
                                value={newUser.role}
                                onValueChange={(value) =>
                                  setNewUser({ ...newUser, role: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map((role) => (
                                    <SelectItem
                                      key={role.value}
                                      value={role.value}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {role.label}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {role.description}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg">
                              <h4 className="font-medium text-yellow-900 mb-2">
                                Important Notes:
                              </h4>
                              <div className="text-sm text-yellow-800 space-y-1">
                                <p>
                                  • The user will receive a confirmation email
                                </p>
                                <p>
                                  • They must verify their email before
                                  accessing the system
                                </p>
                                <p>
                                  • Consider using &quot;Send Invitation&quot;
                                  for better security
                                </p>
                                <p>
                                  • The temporary password should be shared
                                  securely
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddUserDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleAddUser}>
                                Create User
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users, invitations, or roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Pending Invitations */}
                {userInvitations.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Pending Invitations ({filteredUserInvitations.length})
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUserInvitations.map((invitation) => {
                          const isExpired =
                            new Date(invitation.expires_at) < new Date();
                          return (
                            <TableRow key={invitation.id}>
                              <TableCell className="font-medium">
                                {invitation.email}
                              </TableCell>
                              <TableCell>
                                {invitation.full_name || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {invitation.role
                                    .replace("_", " ")
                                    .toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    isExpired
                                      ? "bg-red-100 text-red-800"
                                      : invitation.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                  }
                                >
                                  {isExpired
                                    ? "Expired"
                                    : invitation.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(
                                  invitation.created_at,
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {new Date(
                                  invitation.expires_at,
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {canManageUsers() ? (
                                    <>
                                      {!isExpired && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleResendInvitation(
                                              invitation.id,
                                            )
                                          }
                                        >
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleCancelInvitation(invitation.id)
                                        }
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-500">
                                      View Only
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {filteredUserInvitations.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {searchTerm
                          ? "No invitations match your search."
                          : "No pending invitations."}
                      </div>
                    )}
                  </div>
                )}

                {/* Existing Users */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Registered Users ({filteredUsers.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const userRole = userRoles.find(
                          (ur) => ur.user_id === user.id,
                        );
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || "Not Set"}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              {userRole ? (
                                <Badge variant="outline">
                                  {userRole.role
                                    .replace("_", " ")
                                    .toUpperCase()}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No Role</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  userRole
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {userRole ? "Active" : "Pending Role"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {canManageUsers() ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditUser(user)}
                                      title="Edit User"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedUserId(user.id);
                                        setSelectedRole(
                                          userRole?.role || "accountant",
                                        );
                                        setShowAssignRoleDialog(true);
                                      }}
                                      title="Assign Role"
                                    >
                                      <UserCheck className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteUser(user)}
                                      className="text-red-600 hover:text-red-700"
                                      title="Delete User"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-500">
                                    View Only
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm
                        ? "No users match your search."
                        : "No users found in the system."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <RestrictedAccessCard
              title="User Management"
              description="Add new users, send invitations, and manage user accounts"
            />
          )}

          {/* Advanced Permission Management - Admin Only */}
          {canViewSection("permissions") ? (
            <PermissionManager userRole={userRole} />
          ) : (
            <RestrictedAccessCard
              title="Advanced Permission Management"
              description="Configure detailed permissions for each role and user. Only administrators can access this section."
            />
          )}

          {/* Role & Permission Management */}
          {canViewSection("roles") ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Role & Permission Management
                    </CardTitle>
                    <CardDescription>
                      Manage user roles and access permissions
                    </CardDescription>
                  </div>
                  {canManageRoles() && (
                    <Dialog
                      open={showAssignRoleDialog}
                      onOpenChange={setShowAssignRoleDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Assign Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Assign Role to User</DialogTitle>
                          <DialogDescription>
                            Select a user and assign them a role with specific
                            permissions
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="select_user">Select User *</Label>
                            <Select
                              value={selectedUserId}
                              onValueChange={setSelectedUserId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a user" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.full_name || user.email} ({user.email}
                                    )
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="select_role">Select Role *</Label>
                            <Select
                              value={selectedRole}
                              onValueChange={setSelectedRole}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles.map((role) => (
                                  <SelectItem
                                    key={role.value}
                                    value={role.value}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {role.label}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {role.description}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-2">
                              Role Permissions:
                            </h4>
                            <div className="text-sm text-blue-800 space-y-1">
                              {selectedRole === "admin" && (
                                <ul className="list-disc list-inside space-y-1">
                                  <li>Full system access and configuration</li>
                                  <li>
                                    Manage all users, roles, and permissions
                                  </li>
                                  <li>
                                    Access to all financial and project data
                                  </li>
                                  <li>System settings and integrations</li>
                                </ul>
                              )}
                              {selectedRole === "accountant" && (
                                <ul className="list-disc list-inside space-y-1">
                                  <li>
                                    Manage expenses, budgets, and financial
                                    records
                                  </li>
                                  <li>
                                    Access to chart of accounts and categories
                                  </li>
                                  <li>Generate financial reports</li>
                                  <li>View project and donor information</li>
                                </ul>
                              )}
                              {selectedRole === "project_manager" && (
                                <ul className="list-disc list-inside space-y-1">
                                  <li>Manage assigned projects and budgets</li>
                                  <li>View project expenses and reports</li>
                                  <li>
                                    Access to project-related financial data
                                  </li>
                                  <li>Limited system configuration access</li>
                                </ul>
                              )}
                              {selectedRole === "donor" && (
                                <ul className="list-disc list-inside space-y-1">
                                  <li>View donation impact and reports</li>
                                  <li>Access to funded project information</li>
                                  <li>Limited read-only access</li>
                                  <li>Personal donation history</li>
                                </ul>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAssignRoleDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAssignRole}>
                              Assign Role
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Current User Roles */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">
                    Current User Roles
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Assigned Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUserRoles.map((userRole) => (
                        <TableRow key={userRole.id}>
                          <TableCell className="font-medium">
                            {userRole.user?.full_name || "Unknown User"}
                          </TableCell>
                          <TableCell>{userRole.user?.email || "N/A"}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                userRole.role === "admin"
                                  ? "bg-red-100 text-red-800"
                                  : userRole.role === "accountant"
                                    ? "bg-blue-100 text-blue-800"
                                    : userRole.role === "project_manager"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-purple-100 text-purple-800"
                              }
                            >
                              {userRole.role.replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {userRole.created_at
                              ? new Date(
                                  userRole.created_at,
                                ).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {canManageRoles() ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditUserRole(userRole)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleRemoveUserRole(userRole.id)
                                    }
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  View Only
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredUserRoles.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm
                        ? "No user roles match your search."
                        : "No user roles assigned yet. Click 'Assign Role' to get started."}
                    </div>
                  )}
                </div>

                {/* Available Users */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    All Users ({filteredUsers.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const userRole = userRoles.find(
                          (ur) => ur.user_id === user.id,
                        );
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || "Not Set"}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              {userRole ? (
                                <Badge variant="outline">
                                  {userRole.role
                                    .replace("_", " ")
                                    .toUpperCase()}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No Role</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  userRole
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {userRole ? "Active" : "Pending Role"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm
                        ? "No users match your search."
                        : "No users found in the system."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <RestrictedAccessCard
              title="Role & Permission Management"
              description="Manage user roles and access permissions"
            />
          )}

          {/* Edit User Dialog */}
          <Dialog
            open={showEditUserDialog}
            onOpenChange={setShowEditUserDialog}
          >
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information and role
                </DialogDescription>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_user_email">Email Address *</Label>
                      <Input
                        id="edit_user_email"
                        type="email"
                        value={editingUser.email}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            email: e.target.value,
                          })
                        }
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_user_full_name">Full Name</Label>
                      <Input
                        id="edit_user_full_name"
                        value={editingUser.full_name || ""}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit_user_role">Role</Label>
                    <Select
                      value={(editingUser as any).role || "accountant"}
                      onValueChange={(value) =>
                        setEditingUser({
                          ...editingUser,
                          role: value,
                        } as any)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{role.label}</span>
                              <span className="text-xs text-gray-500">
                                {role.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Password Update Section */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Update Password (Optional)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_user_new_password">
                          New Password
                        </Label>
                        <Input
                          id="edit_user_new_password"
                          type="password"
                          value={(editingUser as any).new_password || ""}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              new_password: e.target.value,
                            } as any)
                          }
                          placeholder="Enter new password (optional)"
                          minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank to keep current password
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="edit_user_confirm_password">
                          Confirm New Password
                        </Label>
                        <Input
                          id="edit_user_confirm_password"
                          type="password"
                          value={(editingUser as any).confirm_password || ""}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              confirm_password: e.target.value,
                            } as any)
                          }
                          placeholder="Confirm new password"
                          minLength={6}
                        />
                      </div>
                    </div>
                    {(editingUser as any)?.new_password &&
                      (editingUser as any)?.confirm_password &&
                      (editingUser as any).new_password !==
                        (editingUser as any).confirm_password && (
                        <div className="bg-red-50 p-3 rounded-lg mt-2">
                          <p className="text-sm text-red-600">
                            Passwords do not match
                          </p>
                        </div>
                      )}
                    {(editingUser as any)?.new_password &&
                      (editingUser as any).new_password.length < 6 && (
                        <div className="bg-red-50 p-3 rounded-lg mt-2">
                          <p className="text-sm text-red-600">
                            Password must be at least 6 characters long
                          </p>
                        </div>
                      )}
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      User Information:
                    </h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>
                        <strong>User ID:</strong> {editingUser.id}
                      </p>
                      <p>
                        <strong>Created:</strong>{" "}
                        {editingUser.created_at
                          ? new Date(
                              editingUser.created_at,
                            ).toLocaleDateString()
                          : "Unknown"}
                      </p>
                      <p>
                        <strong>Current Role:</strong>{" "}
                        {userRoles.find((ur) => ur.user_id === editingUser.id)
                          ?.role || "No role assigned"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">
                      Important Notes:
                    </h4>
                    <div className="text-sm text-yellow-800 space-y-1">
                      <p>
                        • Changing the email will update the user's login
                        credentials
                      </p>
                      <p>• Role changes will take effect immediately</p>
                      <p>• The user will be notified of any email changes</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-white border-t mt-6 -mx-6 px-6 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditUserDialog(false);
                        setEditingUser(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateUser}>Update User</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Change User Password Dialog */}
          <Dialog
            open={showChangePasswordDialog}
            onOpenChange={setShowChangePasswordDialog}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Change User Password</DialogTitle>
                <DialogDescription>
                  Set a new password for the selected user
                </DialogDescription>
              </DialogHeader>
              {changingPasswordUser && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      User Information
                    </h4>
                    <p className="text-sm text-gray-600">
                      <strong>Name:</strong>{" "}
                      {changingPasswordUser.full_name || "Not Set"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Email:</strong> {changingPasswordUser.email}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="new_password">New Password *</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordChangeForm.new_password}
                      onChange={(e) =>
                        setPasswordChangeForm({
                          ...passwordChangeForm,
                          new_password: e.target.value,
                        })
                      }
                      placeholder="Enter new password"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="confirm_password">
                      Confirm New Password *
                    </Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordChangeForm.confirm_password}
                      onChange={(e) =>
                        setPasswordChangeForm({
                          ...passwordChangeForm,
                          confirm_password: e.target.value,
                        })
                      }
                      placeholder="Confirm new password"
                      minLength={6}
                    />
                  </div>
                  {passwordChangeForm.new_password &&
                    passwordChangeForm.confirm_password &&
                    passwordChangeForm.new_password !==
                      passwordChangeForm.confirm_password && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-sm text-red-600">
                          Passwords do not match
                        </p>
                      </div>
                    )}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">
                      Important Notes:
                    </h4>
                    <div className="text-sm text-yellow-800 space-y-1">
                      <p>
                        • The user will be able to sign in immediately with the
                        new password
                      </p>
                      <p>• The old password will no longer work</p>
                      <p>
                        • Consider sharing the new password securely with the
                        user
                      </p>
                      <p>
                        • The user should change this password on their next
                        login
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowChangePasswordDialog(false);
                        setChangingPasswordUser(null);
                        setPasswordChangeForm({
                          new_password: "",
                          confirm_password: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateUserPassword}
                      disabled={
                        !passwordChangeForm.new_password ||
                        !passwordChangeForm.confirm_password ||
                        passwordChangeForm.new_password !==
                          passwordChangeForm.confirm_password ||
                        passwordChangeForm.new_password.length < 6
                      }
                    >
                      Change Password
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Role Permission Management */}
          {canViewSection("roles") && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Grid3X3 className="h-5 w-5" />
                      Role Permission Management
                    </CardTitle>
                    <CardDescription>
                      Manage permissions for each role. Users inherit
                      permissions based on their assigned role.
                    </CardDescription>
                  </div>
                  {canManageRoles() && (
                    <Dialog
                      open={showRolePermissionDialog}
                      onOpenChange={setShowRolePermissionDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4" />
                          Manage Role Permissions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Role Permission Matrix</DialogTitle>
                          <DialogDescription>
                            Configure permissions for each role. Users will
                            automatically inherit permissions based on their
                            assigned role.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Role Selection */}
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-3">
                              Select Role to Configure
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {availableRoles.map((role) => (
                                <Button
                                  key={role.value}
                                  variant={
                                    selectedRoleForPermissions === role.value
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    setSelectedRoleForPermissions(role.value)
                                  }
                                  className="justify-start"
                                >
                                  {role.label}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Permission Matrix for Selected Role */}
                          {selectedRoleForPermissions && (
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-50 p-4 border-b">
                                <h3 className="font-semibold text-gray-900">
                                  Permissions for{" "}
                                  {
                                    availableRoles.find(
                                      (r) =>
                                        r.value === selectedRoleForPermissions,
                                    )?.label
                                  }
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Check the boxes to grant permissions to this
                                  role. All users with this role will inherit
                                  these permissions.
                                </p>
                              </div>

                              <div className="p-4">
                                {Object.entries(permissionsByCategory).map(
                                  ([category, permissions]) => (
                                    <div
                                      key={category}
                                      className="mb-6 last:mb-0"
                                    >
                                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                          {category}
                                        </span>
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {permissions.map((permission) => (
                                          <div
                                            key={permission.id}
                                            className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                                          >
                                            <Checkbox
                                              checked={hasRolePermission(
                                                selectedRoleForPermissions,
                                                permission.id,
                                              )}
                                              onCheckedChange={() =>
                                                toggleRolePermission(
                                                  selectedRoleForPermissions,
                                                  permission.id,
                                                )
                                              }
                                              className="mt-1"
                                            />
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900">
                                                {permission.name}
                                              </div>
                                              <div className="text-sm text-gray-600">
                                                {permission.description}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                          {!selectedRoleForPermissions && (
                            <div className="text-center py-8 text-gray-500">
                              Select a role above to configure its permissions
                            </div>
                          )}

                          {/* Quick Actions */}
                          {selectedRoleForPermissions && (
                            <div className="bg-yellow-50 p-4 rounded-lg">
                              <h4 className="font-medium text-yellow-900 mb-3">
                                Quick Actions for{" "}
                                {
                                  availableRoles.find(
                                    (r) =>
                                      r.value === selectedRoleForPermissions,
                                  )?.label
                                }
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Grant all permissions to selected role
                                    const allPermissions: RolePermission[] =
                                      rolePermissions.filter(
                                        (p) =>
                                          p.role !== selectedRoleForPermissions,
                                      );
                                    availablePermissions.forEach(
                                      (permission) => {
                                        allPermissions.push({
                                          role: selectedRoleForPermissions,
                                          permission_id: permission.id,
                                          granted: true,
                                          granted_by: "admin",
                                          granted_at: new Date().toISOString(),
                                        });
                                      },
                                    );
                                    saveRolePermissions(allPermissions);
                                  }}
                                >
                                  Grant All Permissions
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Reset to role defaults
                                    const otherRolePermissions =
                                      rolePermissions.filter(
                                        (p) =>
                                          p.role !== selectedRoleForPermissions,
                                      );
                                    const defaultPermissions =
                                      getRoleDefaultPermissions(
                                        selectedRoleForPermissions,
                                      );
                                    defaultPermissions.forEach(
                                      (permissionId) => {
                                        otherRolePermissions.push({
                                          role: selectedRoleForPermissions,
                                          permission_id: permissionId,
                                          granted: true,
                                          granted_by: "system",
                                          granted_at: new Date().toISOString(),
                                        });
                                      },
                                    );
                                    saveRolePermissions(otherRolePermissions);
                                  }}
                                >
                                  Reset to Defaults
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Revoke all permissions for selected role
                                    const otherRolePermissions =
                                      rolePermissions.filter(
                                        (p) =>
                                          p.role !== selectedRoleForPermissions,
                                      );
                                    saveRolePermissions(otherRolePermissions);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Revoke All Permissions
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowRolePermissionDialog(false);
                                setSelectedRoleForPermissions("");
                              }}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Permission Summary */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-900">
                          Available Roles
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">
                        {availableRoles.length}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Grid3X3 className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-900">
                          Total Permissions
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {availablePermissions.length}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-purple-900">
                          Permission Categories
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-purple-900">
                        {Object.keys(permissionsByCategory).length}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-900">
                          Active Role Permissions
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-orange-900">
                        {rolePermissions.filter((p) => p.granted).length}
                      </div>
                    </div>
                  </div>

                  {/* Role Permission Overview */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Role Permission Overview
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableRoles.map((role) => {
                        const rolePerms = rolePermissions.filter(
                          (p) => p.role === role.value && p.granted,
                        );
                        const usersWithRole = userRoles.filter(
                          (ur) => ur.role === role.value,
                        );
                        return (
                          <div
                            key={role.value}
                            className="bg-gray-50 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-gray-900">
                                {role.label}
                              </h5>
                              <Badge variant="outline">
                                {rolePerms.length} permissions
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {role.description}
                            </p>
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">
                                {usersWithRole.length}
                              </span>{" "}
                              users with this role
                            </div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRoleForPermissions(role.value);
                                  setShowRolePermissionDialog(true);
                                }}
                              >
                                Configure Permissions
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Permission Changes */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Recent Role Permission Changes
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {rolePermissions
                        .filter((p) => p.granted_at)
                        .sort(
                          (a, b) =>
                            new Date(b.granted_at!).getTime() -
                            new Date(a.granted_at!).getTime(),
                        )
                        .slice(0, 5)
                        .map((permission, index) => {
                          const role = availableRoles.find(
                            (r) => r.value === permission.role,
                          );
                          const permissionInfo = availablePermissions.find(
                            (p) => p.id === permission.permission_id,
                          );
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-2 h-2 rounded-full ${permission.granted ? "bg-green-500" : "bg-red-500"}`}
                                />
                                <div>
                                  <span className="font-medium text-gray-900">
                                    {role?.label || permission.role}
                                  </span>
                                  <span className="text-gray-600 mx-2">•</span>
                                  <span className="text-gray-700">
                                    {permissionInfo?.name ||
                                      permission.permission_id}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {permission.granted_at
                                  ? new Date(
                                      permission.granted_at,
                                    ).toLocaleDateString()
                                  : "Unknown"}
                              </div>
                            </div>
                          );
                        })}
                      {rolePermissions.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          No role permission changes recorded yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit User Role Dialog */}
          <Dialog
            open={showEditRoleDialog}
            onOpenChange={setShowEditRoleDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogDescription>
                  Update the user's role and permissions
                </DialogDescription>
              </DialogHeader>
              {editingUserRole && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      User Information
                    </h4>
                    <p className="text-sm text-gray-600">
                      <strong>Name:</strong>{" "}
                      {editingUserRole.user?.full_name || "Not Set"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Email:</strong>{" "}
                      {editingUserRole.user?.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="edit_user_role">Select New Role *</Label>
                    <Select
                      value={editingUserRole.role}
                      onValueChange={(value) =>
                        setEditingUserRole({
                          ...editingUserRole,
                          role: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{role.label}</span>
                              <span className="text-xs text-gray-500">
                                {role.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      New Role Permissions:
                    </h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      {editingUserRole.role === "admin" && (
                        <ul className="list-disc list-inside space-y-1">
                          <li>Full system access and configuration</li>
                          <li>Manage all users, roles, and permissions</li>
                          <li>Access to all financial and project data</li>
                          <li>System settings and integrations</li>
                        </ul>
                      )}
                      {editingUserRole.role === "accountant" && (
                        <ul className="list-disc list-inside space-y-1">
                          <li>
                            Manage expenses, budgets, and financial records
                          </li>
                          <li>Access to chart of accounts and categories</li>
                          <li>Generate financial reports</li>
                          <li>View project and donor information</li>
                        </ul>
                      )}
                      {editingUserRole.role === "project_manager" && (
                        <ul className="list-disc list-inside space-y-1">
                          <li>Manage assigned projects and budgets</li>
                          <li>View project expenses and reports</li>
                          <li>Access to project-related financial data</li>
                          <li>Limited system configuration access</li>
                        </ul>
                      )}
                      {editingUserRole.role === "donor" && (
                        <ul className="list-disc list-inside space-y-1">
                          <li>View donation impact and reports</li>
                          <li>Access to funded project information</li>
                          <li>Limited read-only access</li>
                          <li>Personal donation history</li>
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditRoleDialog(false);
                        setEditingUserRole(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateUserRole}>Update Role</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
