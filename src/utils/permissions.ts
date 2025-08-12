// Permission utility functions for role-based access control
import { createClient } from "../../supabase/client";

// Server-side permission system - no localStorage dependency
let permissionsCache: any[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds for faster updates

// Define super admin users - these users should always have admin access
const SUPER_ADMIN_EMAILS = [
  "abdousentore@gmail.com",
  // Add more super admin emails here as needed
];

// Check if a user email should have super admin privileges
export const isSuperAdminEmail = (email: string): boolean => {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
};

// Get current user's email from Supabase auth
const getCurrentUserEmail = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email || null;
  } catch (error) {
    console.error("Error getting current user email:", error);
    return null;
  }
};

// Get current user's ID from Supabase auth
const getCurrentUserId = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// Get organization ID (for now, use the first organization)
const getOrganizationId = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  try {
    const supabase = createClient();
    const { data: organizations, error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (error) {
      console.error("Error getting organization:", error);
      return null;
    }

    return organizations?.id || null;
  } catch (error) {
    console.error("Error getting organization:", error);
    return null;
  }
};

// Get user's role from database with super admin check
export const getUserRole = async (): Promise<string> => {
  if (typeof window === "undefined") return "admin"; // Server-side fallback

  try {
    const userId = await getCurrentUserId();
    const userEmail = await getCurrentUserEmail();
    const orgId = await getOrganizationId();

    // Check if user is a super admin first
    if (userEmail && isSuperAdminEmail(userEmail)) {
      console.log(`Super admin detected: ${userEmail} - ensuring admin role`);

      // Ensure super admin has admin role in database
      if (userId && orgId) {
        await ensureSuperAdminRole(userId, orgId);
      }

      return "admin";
    }

    if (!userId || !orgId) {
      console.warn("No user or organization found, defaulting to viewer");
      return "viewer";
    }

    const supabase = createClient();

    // First, get all roles for this user to handle duplicates
    const { data: userRoles, error } = await supabase
      .from("user_roles")
      .select("id, role, created_at")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting user role:", error);
      return "viewer"; // Fallback to viewer for security
    }

    if (!userRoles || userRoles.length === 0) {
      console.warn("No role found for user, defaulting to viewer");
      return "viewer";
    }

    // If there are multiple roles (duplicates), clean them up
    if (userRoles.length > 1) {
      console.warn(
        `Found ${userRoles.length} duplicate roles for user, cleaning up...`,
      );

      // Keep the most recent role
      const mostRecentRole = userRoles[0];
      const duplicateIds = userRoles.slice(1).map((role) => role.id);

      // Delete duplicate entries
      if (duplicateIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .in("id", duplicateIds);

        if (deleteError) {
          console.error("Error cleaning up duplicate roles:", deleteError);
        } else {
          console.log(
            `Cleaned up ${duplicateIds.length} duplicate role entries`,
          );
        }
      }

      return mostRecentRole.role || "viewer";
    }

    return userRoles[0].role || "viewer";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "viewer";
  }
};

// Ensure super admin users have admin role in database
const ensureSuperAdminRole = async (
  userId: string,
  orgId: string,
): Promise<void> => {
  try {
    const supabase = createClient();

    // Check if user already has admin role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .single();

    if (existingRole?.role === "admin") {
      console.log("Super admin already has admin role in database");
      return;
    }

    // Delete any existing non-admin roles
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", orgId);

    // Insert admin role
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      organization_id: orgId,
      role: "admin",
    });

    if (error) {
      console.error("Error ensuring super admin role:", error);
    } else {
      console.log("Super admin role ensured in database");
    }
  } catch (error) {
    console.error("Error in ensureSuperAdminRole:", error);
  }
};

// Synchronous version that uses cache only - no localStorage
export const getUserRoleSync = (): string => {
  if (typeof window === "undefined") return "admin"; // Server-side default to admin

  // Check if current user is a super admin by email (if available in localStorage)
  try {
    const userEmail = localStorage.getItem("ngo_current_user_email");
    if (userEmail && isSuperAdminEmail(userEmail)) {
      console.log(
        `Super admin detected in sync: ${userEmail} - returning admin role`,
      );
      return "admin";
    }
  } catch (error) {
    console.error("Error checking super admin in sync:", error);
  }

  // Use cached role if available and recent
  const now = Date.now();
  if (cacheTimestamp > 0 && now - cacheTimestamp < CACHE_DURATION) {
    const cachedRole = sessionStorage.getItem("temp_user_role");
    if (cachedRole && cachedRole !== "null" && cachedRole !== "undefined") {
      return cachedRole;
    }
  }

  // Check if we have a stored role from the database query
  const storedRole = sessionStorage.getItem("temp_user_role");
  if (storedRole && storedRole !== "null" && storedRole !== "undefined") {
    return storedRole;
  }

  // Check localStorage as fallback
  try {
    const localRole = localStorage.getItem("ngo_current_user_role");
    if (localRole && localRole !== "null" && localRole !== "undefined") {
      console.log(`Using localStorage role fallback: ${localRole}`);
      return localRole;
    }
  } catch (error) {
    console.error("Error accessing localStorage:", error);
  }

  // Check admin verification flag as final fallback
  try {
    const adminVerified =
      sessionStorage.getItem("admin_verified") ||
      localStorage.getItem("admin_verified");
    if (adminVerified === "true") {
      console.log("Admin verification flag found - returning admin role");
      return "admin";
    }
  } catch (error) {
    console.error("Error checking admin verification:", error);
  }

  // Default to viewer for security (changed from admin)
  console.log("No role found, defaulting to viewer for security");
  return "viewer";
};

// Set user's role in database - server-side only
export const setUserRole = async (role: string): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const userId = await getCurrentUserId();
    const orgId = await getOrganizationId();

    if (!userId || !orgId) {
      console.error("Cannot set user role: missing user or organization");
      return;
    }

    const supabase = createClient();

    // First, get all existing roles to clean up duplicates
    const { data: existingRoles } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", orgId);

    // Delete any existing roles for this user/org to prevent duplicates
    if (existingRoles && existingRoles.length > 0) {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("organization_id", orgId);

      if (deleteError) {
        console.error("Error deleting existing roles:", deleteError);
        return;
      }

      console.log(`Cleaned up ${existingRoles.length} existing role entries`);
    }

    // Then insert the new role
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      organization_id: orgId,
      role: role,
    });

    if (error) {
      console.error("Error setting user role:", error);
      return;
    }

    // Update both session and localStorage for better persistence
    const previousRole = getUserRoleSync();
    sessionStorage.setItem("temp_user_role", role);
    localStorage.setItem("ngo_current_user_role", role);

    // Set admin verification flag if role is admin
    if (role === "admin") {
      sessionStorage.setItem("admin_verified", "true");
      console.log("Admin role verified and cached");
    } else {
      sessionStorage.removeItem("admin_verified");
    }

    // Clear permissions cache to force refresh
    permissionsCache = [];
    cacheTimestamp = 0;

    // Dispatch events to notify components
    window.dispatchEvent(
      new CustomEvent("roleChanged", {
        detail: { previousRole, newRole: role },
      }),
    );

    window.dispatchEvent(
      new CustomEvent("permissionsChanged", {
        detail: { action: "roleChange", role },
      }),
    );

    console.log(`User role updated from ${previousRole} to ${role}`);
  } catch (error) {
    console.error("Error setting user role:", error);
  }
};

// Get role permissions from database
export const getRolePermissions = async (): Promise<any[]> => {
  if (typeof window === "undefined") return [];

  try {
    // Check cache first
    const now = Date.now();
    if (permissionsCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
      return Array.isArray(permissionsCache) ? permissionsCache : [];
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      console.error("Cannot get permissions: missing organization");
      return [];
    }

    const supabase = createClient();
    const { data: permissions, error } = await supabase
      .from("role_permissions")
      .select(
        `
        role,
        permission_id,
        granted,
        permissions!inner(
          name,
          description,
          category
        )
      `,
      )
      .eq("organization_id", orgId);

    if (error) {
      console.error("Error getting role permissions:", error);
      return [];
    }

    // Ensure we always have an array
    const permissionsArray = Array.isArray(permissions) ? permissions : [];

    // Update cache
    permissionsCache = permissionsArray;
    cacheTimestamp = now;

    return permissionsArray;
  } catch (error) {
    console.error("Error getting role permissions:", error);
    return [];
  }
};

// Synchronous version that uses cache only - no localStorage
export const getRolePermissionsSync = (): any[] => {
  if (typeof window === "undefined") return [];

  // Return cached permissions if available and recent
  const now = Date.now();
  if (permissionsCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
    return Array.isArray(permissionsCache) ? permissionsCache : [];
  }

  // No localStorage fallback - return empty array to force async load
  return [];
};

// Check if current user has a specific permission
export const hasPermission = async (permissionId: string): Promise<boolean> => {
  try {
    const userRole = await getUserRole();
    const rolePermissions = await getRolePermissions();

    // If no permissions are loaded, try to initialize them
    if (rolePermissions.length === 0) {
      console.warn("No permissions found, initializing default permissions...");
      await initializeDefaultPermissions();
      // Get permissions again after initialization
      const newPermissions = await getRolePermissions();
      const permission = newPermissions.find(
        (p: any) =>
          p.role === userRole && p.permission_id === permissionId && p.granted,
      );
      return !!permission;
    }

    // For admin role, check database permissions first
    if (userRole === "admin") {
      const adminPermission = rolePermissions.find(
        (p: any) => p.role === "admin" && p.permission_id === permissionId,
      );
      // Use database value if it exists, otherwise default to true for admin
      return adminPermission ? adminPermission.granted : true;
    }

    // Check if the user's role has the specific permission
    const permission = rolePermissions.find(
      (p: any) =>
        p.role === userRole && p.permission_id === permissionId && p.granted,
    );

    return !!permission;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
};

// Synchronous version for immediate checks
export const hasPermissionSync = (permissionId: string): boolean => {
  try {
    const userRole = getUserRoleSync();
    const rolePermissions = getRolePermissionsSync();

    console.log(`Permission check: ${permissionId} for role: ${userRole}`);
    console.log(`Permissions loaded: ${rolePermissions.length}`);

    // Special handling for admin users
    if (userRole === "admin") {
      // If permissions are loaded, check database permissions first
      if (rolePermissions.length > 0) {
        const adminPermission = rolePermissions.find(
          (p: any) => p.role === "admin" && p.permission_id === permissionId,
        );
        // Use database value if it exists, otherwise default to true for admin
        const result = adminPermission ? adminPermission.granted : true;
        console.log(`Admin permission result from database: ${result}`);
        return result;
      }

      // If no permissions are loaded yet, allow admin access by default
      // This prevents admin lockout during permission initialization
      console.log(
        "Admin user with no permissions loaded - allowing access (admin fallback)",
      );
      return true;
    }

    // For non-admin users, require permissions to be loaded
    if (rolePermissions.length === 0) {
      console.warn(
        `No permissions found for role: ${userRole} - denying access`,
      );
      return false;
    }

    // Check if the user's role has the specific permission
    const permission = rolePermissions.find(
      (p: any) =>
        p.role === userRole && p.permission_id === permissionId && p.granted,
    );

    const result = !!permission;
    console.log(`Permission result for ${userRole}: ${result}`);
    return result;
  } catch (error) {
    console.error("Error checking permission sync:", error);
    // For admin users, default to true to prevent lockout
    const userRole = getUserRoleSync();
    if (userRole === "admin") {
      console.log("Error occurred but user is admin - allowing access");
      return true;
    }
    // Default to false for security for non-admin users
    return false;
  }
};

// Check multiple permissions (user must have ALL of them)
export const hasAllPermissions = async (
  permissionIds: string[],
): Promise<boolean> => {
  const results = await Promise.all(
    permissionIds.map((id) => hasPermission(id)),
  );
  return results.every((result) => result);
};

// Check multiple permissions (user must have ANY of them)
export const hasAnyPermission = async (
  permissionIds: string[],
): Promise<boolean> => {
  const results = await Promise.all(
    permissionIds.map((id) => hasPermission(id)),
  );
  return results.some((result) => result);
};

// Permission checking functions for specific features (async versions)
export const canViewFinances = async (): Promise<boolean> => {
  return await hasPermission("view_finances");
};

export const canManageExpenses = async (): Promise<boolean> => {
  return await hasPermission("manage_expenses");
};

export const canEditExpenses = async (): Promise<boolean> => {
  return await hasPermission("edit_expenses");
};

export const canDeleteExpenses = async (): Promise<boolean> => {
  return await hasPermission("delete_expenses");
};

export const canManageBudgets = async (): Promise<boolean> => {
  return await hasPermission("manage_budgets");
};

export const canEditBudgets = async (): Promise<boolean> => {
  return await hasPermission("edit_budgets");
};

export const canDeleteBudgets = async (): Promise<boolean> => {
  return await hasPermission("delete_budgets");
};

export const canViewLedger = async (): Promise<boolean> => {
  return await hasPermission("view_ledger");
};

export const canManageLedger = async (): Promise<boolean> => {
  return await hasPermission("manage_ledger");
};

export const canEditLedger = async (): Promise<boolean> => {
  return await hasPermission("edit_ledger");
};

export const canDeleteLedger = async (): Promise<boolean> => {
  return await hasPermission("delete_ledger");
};

export const canViewProjects = async (): Promise<boolean> => {
  return await hasPermission("view_projects");
};

export const canManageProjects = async (): Promise<boolean> => {
  return await hasPermission("manage_projects");
};

export const canEditProjects = async (): Promise<boolean> => {
  return await hasPermission("edit_projects");
};

export const canDeleteProjects = async (): Promise<boolean> => {
  return await hasPermission("delete_projects");
};

export const canViewDonors = async (): Promise<boolean> => {
  return await hasPermission("view_donors");
};

export const canManageDonors = async (): Promise<boolean> => {
  return await hasPermission("manage_donors");
};

export const canEditDonors = async (): Promise<boolean> => {
  return await hasPermission("edit_donors");
};

export const canDeleteDonors = async (): Promise<boolean> => {
  return await hasPermission("delete_donors");
};

export const canViewReports = async (): Promise<boolean> => {
  return await hasPermission("view_reports");
};

export const canGenerateReports = async (): Promise<boolean> => {
  return await hasPermission("generate_reports");
};

export const canEditReports = async (): Promise<boolean> => {
  return await hasPermission("edit_reports");
};

export const canDeleteReports = async (): Promise<boolean> => {
  return await hasPermission("delete_reports");
};

export const canViewUsers = async (): Promise<boolean> => {
  return await hasPermission("view_users");
};

export const canManageUsers = async (): Promise<boolean> => {
  return await hasPermission("manage_users");
};

export const canEditUsers = async (): Promise<boolean> => {
  return await hasPermission("edit_users");
};

export const canDeleteUsers = async (): Promise<boolean> => {
  return await hasPermission("delete_users");
};

export const canManageSettings = async (): Promise<boolean> => {
  return await hasPermission("manage_settings");
};

export const canEditSettings = async (): Promise<boolean> => {
  return await hasPermission("edit_settings");
};

// Synchronous versions for immediate checks (using cache/localStorage)
export const canViewFinancesSync = (): boolean =>
  hasPermissionSync("view_finances");
export const canManageExpensesSync = (): boolean =>
  hasPermissionSync("manage_expenses");
export const canEditExpensesSync = (): boolean =>
  hasPermissionSync("edit_expenses");
export const canDeleteExpensesSync = (): boolean =>
  hasPermissionSync("delete_expenses");
export const canManageBudgetsSync = (): boolean =>
  hasPermissionSync("manage_budgets");
export const canEditBudgetsSync = (): boolean =>
  hasPermissionSync("edit_budgets");
export const canDeleteBudgetsSync = (): boolean =>
  hasPermissionSync("delete_budgets");
export const canViewLedgerSync = (): boolean =>
  hasPermissionSync("view_ledger");
export const canManageLedgerSync = (): boolean =>
  hasPermissionSync("manage_ledger");
export const canEditLedgerSync = (): boolean =>
  hasPermissionSync("edit_ledger");
export const canDeleteLedgerSync = (): boolean =>
  hasPermissionSync("delete_ledger");
export const canViewProjectsSync = (): boolean =>
  hasPermissionSync("view_projects");
export const canManageProjectsSync = (): boolean =>
  hasPermissionSync("manage_projects");
export const canEditProjectsSync = (): boolean =>
  hasPermissionSync("edit_projects");
export const canDeleteProjectsSync = (): boolean =>
  hasPermissionSync("delete_projects");
export const canViewDonorsSync = (): boolean =>
  hasPermissionSync("view_donors");
export const canManageDonorsSync = (): boolean =>
  hasPermissionSync("manage_donors");
export const canEditDonorsSync = (): boolean =>
  hasPermissionSync("edit_donors");
export const canDeleteDonorsSync = (): boolean =>
  hasPermissionSync("delete_donors");
export const canViewReportsSync = (): boolean =>
  hasPermissionSync("view_reports");
export const canGenerateReportsSync = (): boolean =>
  hasPermissionSync("generate_reports");
export const canEditReportsSync = (): boolean =>
  hasPermissionSync("edit_reports");
export const canDeleteReportsSync = (): boolean =>
  hasPermissionSync("delete_reports");
export const canViewUsersSync = (): boolean => hasPermissionSync("view_users");
export const canManageUsersSync = (): boolean =>
  hasPermissionSync("manage_users");
export const canEditUsersSync = (): boolean => hasPermissionSync("edit_users");
export const canDeleteUsersSync = (): boolean =>
  hasPermissionSync("delete_users");
export const canManageSettingsSync = (): boolean =>
  hasPermissionSync("manage_settings");
export const canEditSettingsSync = (): boolean =>
  hasPermissionSync("edit_settings");

// Legacy role-based checks (for backward compatibility)
export const isAdmin = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === "admin";
};

export const isAccountant = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === "accountant";
};

export const isProjectManager = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === "project_manager";
};

export const isDonor = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === "donor";
};

// Synchronous versions
export const isAdminSync = (): boolean => getUserRoleSync() === "admin";
export const isAccountantSync = (): boolean =>
  getUserRoleSync() === "accountant";
export const isProjectManagerSync = (): boolean =>
  getUserRoleSync() === "project_manager";
export const isDonorSync = (): boolean => getUserRoleSync() === "donor";

// Initialize default permissions in database
export const initializeDefaultPermissions = async (
  force: boolean = false,
): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      console.error("Cannot initialize permissions: missing organization");
      return;
    }

    const supabase = createClient();

    // Check if permissions already exist
    if (!force) {
      const { data: existingPermissions } = await supabase
        .from("role_permissions")
        .select("id")
        .eq("organization_id", orgId)
        .limit(1);

      if (existingPermissions && existingPermissions.length > 0) {
        console.log("Permissions already initialized in database");
        return;
      }
    }

    console.log(
      force
        ? "Force initializing default permissions in database..."
        : "Initializing default permissions in database...",
    );

    // Get all available permissions
    const { data: allPermissions } = await supabase
      .from("permissions")
      .select("permission_id");

    if (!allPermissions || allPermissions.length === 0) {
      console.error("No permissions found in database");
      return;
    }

    // Define role permissions - SIMPLIFIED to only admin and accountant
    const rolePermissions = [
      // Admin gets all permissions
      ...allPermissions.map((p) => ({
        organization_id: orgId,
        role: "admin",
        permission_id: p.permission_id,
        granted: true,
      })),

      // Accountant permissions - CAN ADD but CANNOT EDIT/DELETE
      ...[
        "view_finances",
        "view_ledger",
        "view_projects",
        "view_donors",
        "view_reports",
        "view_users",
        "manage_expenses", // Allow adding expenses
        "manage_budgets", // Allow adding budgets
        "manage_ledger", // Allow adding ledger entries
        "generate_reports", // Allow generating reports
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "accountant",
        permission_id: permissionId,
        granted: true, // View permissions + add permissions
      })),
      // ALL edit/delete/settings permissions are DENIED for accountant
      ...[
        "edit_expenses", // DENIED - cannot edit expenses
        "delete_expenses", // DENIED - cannot delete expenses
        "edit_budgets", // DENIED - cannot edit budgets
        "delete_budgets", // DENIED - cannot delete budgets
        "edit_ledger", // DENIED - cannot edit ledger entries
        "delete_ledger", // DENIED - cannot delete ledger entries
        "manage_projects",
        "edit_projects",
        "delete_projects",
        "manage_donors",
        "edit_donors",
        "delete_donors",
        "edit_reports",
        "delete_reports",
        "manage_users",
        "edit_users",
        "delete_users",
        "manage_settings", // DENIED - cannot access settings
        "edit_settings",
        "view_settings", // DENIED - cannot view settings
        "manage_currencies",
        "edit_currencies",
        "delete_currencies",
        "manage_categories",
        "edit_categories",
        "delete_categories",
        "manage_accounts",
        "edit_accounts",
        "delete_accounts",
        "manage_permissions",
        "assign_roles",
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "accountant",
        permission_id: permissionId,
        granted: false, // ALL edit/delete/settings permissions DENIED
      })),
    ];

    // Insert permissions
    const { error } = await supabase
      .from("role_permissions")
      .upsert(rolePermissions, {
        onConflict: "organization_id,role,permission_id",
      });

    if (error) {
      console.error("Error initializing permissions:", error);
      return;
    }

    // Clear cache to force refresh
    permissionsCache = [];
    cacheTimestamp = 0;

    console.log(
      "Default permissions initialized successfully in database:",
      rolePermissions.length,
      "permissions set",
    );
  } catch (error) {
    console.error("Error initializing default permissions:", error);
  }
};

// Debug function to check current permissions
export const debugPermissions = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const userRole = await getUserRole();
    const permissions = await getRolePermissions();

    console.log("=== PERMISSION DEBUG INFO ===");
    console.log("Current User Role:", userRole);
    console.log("Total Permissions:", permissions.length);
    console.log(
      "User's Permissions:",
      permissions.filter((p) => p.role === userRole),
    );
    console.log("Sample Permission Checks:");
    console.log("- Can View Finances:", await canViewFinances());
    console.log("- Can Manage Expenses:", await canManageExpenses());
    console.log("- Can Edit Budgets:", await canEditBudgets());
    console.log("- Can Generate Reports:", await canGenerateReports());
    console.log("=============================");
  } catch (error) {
    console.error("Error debugging permissions:", error);
  }
};

// Function to reset permissions (for debugging)
export const resetPermissions = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      console.error("Cannot reset permissions: missing organization");
      return;
    }

    const supabase = createClient();

    // Delete all role permissions for this organization
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("organization_id", orgId);

    if (error) {
      console.error("Error resetting permissions:", error);
      return;
    }

    // Clear cache and session storage only
    permissionsCache = [];
    cacheTimestamp = 0;
    sessionStorage.removeItem("temp_user_role");

    console.log("Permissions reset successfully");

    // Dispatch a custom event to notify components of permission changes
    window.dispatchEvent(
      new CustomEvent("permissionsChanged", {
        detail: { action: "reset" },
      }),
    );
  } catch (error) {
    console.error("Error resetting permissions:", error);
  }
};

// Function to update specific role permissions
export const updateRolePermissions = async (
  role: string,
  permissionId: string,
  granted: boolean,
): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  try {
    console.log(`Updating permission: ${role} - ${permissionId} = ${granted}`);

    const orgId = await getOrganizationId();
    if (!orgId) {
      console.error("Cannot update permissions: missing organization");
      return false;
    }

    const supabase = createClient();

    // Upsert the permission
    const { error } = await supabase.from("role_permissions").upsert(
      {
        organization_id: orgId,
        role: role,
        permission_id: permissionId,
        granted: granted,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "organization_id,role,permission_id",
      },
    );

    if (error) {
      console.error("Error updating role permissions:", error);
      return false;
    }

    // Clear cache to force refresh
    permissionsCache = [];
    cacheTimestamp = 0;

    // Force refresh permissions from database
    await getRolePermissions();

    // Update session cache immediately
    await syncPermissionsToSessionCache();

    // Dispatch event to notify components
    window.dispatchEvent(
      new CustomEvent("permissionsChanged", {
        detail: { action: "update", role, permissionId, granted },
      }),
    );

    console.log(
      `Permission updated successfully: ${role} - ${permissionId} = ${granted}`,
    );
    return true;
  } catch (error) {
    console.error("Error updating role permissions:", error);
    return false;
  }
};

// Function to refresh permissions from database
export const refreshPermissions = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    console.log("Refreshing permissions from database...");

    // Clear cache to force database fetch
    permissionsCache = [];
    cacheTimestamp = 0;

    // Clear session cache as well
    sessionStorage.removeItem("temp_user_role");

    // Fetch fresh permissions
    const freshPermissions = await getRolePermissions();
    console.log(
      `Refreshed ${freshPermissions.length} permissions from database`,
    );

    // Update localStorage with fresh data
    await syncPermissionsToLocalStorage();

    // Dispatch event to notify components to refresh their permission state
    window.dispatchEvent(
      new CustomEvent("permissionsChanged", {
        detail: {
          action: "refresh",
          permissionsCount: freshPermissions.length,
        },
      }),
    );

    console.log("Permissions refreshed successfully from database");
  } catch (error) {
    console.error("Error refreshing permissions:", error);
  }
};

// Function to sync permissions to session cache only
export const syncPermissionsToSessionCache = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const permissions = await getRolePermissions();
    const userRole = await getUserRole();
    const userEmail = await getCurrentUserEmail();

    // Store in both session and localStorage for better persistence
    sessionStorage.setItem("temp_user_role", userRole);
    localStorage.setItem("ngo_current_user_role", userRole);
    localStorage.setItem("ngo_role_permissions", JSON.stringify(permissions));

    // Store user email for super admin checks
    if (userEmail) {
      localStorage.setItem("ngo_current_user_email", userEmail);
    }

    cacheTimestamp = Date.now();

    // Set admin verification flag if role is admin or user is super admin
    if (userRole === "admin" || (userEmail && isSuperAdminEmail(userEmail))) {
      sessionStorage.setItem("admin_verified", "true");
      localStorage.setItem("admin_verified", "true");
      console.log(
        `Admin verification set for ${userEmail || "unknown user"} with role ${userRole}`,
      );
    } else {
      sessionStorage.removeItem("admin_verified");
      localStorage.removeItem("admin_verified");
    }

    console.log(
      `Permissions synced to cache: ${permissions.length} permissions for role ${userRole} (email: ${userEmail})`,
    );
  } catch (error) {
    console.error("Error syncing permissions to session cache:", error);
  }
};

// Function to sync permissions to localStorage (referenced in refreshPermissions)
const syncPermissionsToLocalStorage = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const permissions = await getRolePermissions();
    const userRole = await getUserRole();

    // Store in localStorage for persistence
    localStorage.setItem("ngo_role_permissions", JSON.stringify(permissions));
    localStorage.setItem("ngo_current_user_role", userRole);

    console.log(
      `Permissions synced to localStorage: ${permissions.length} permissions for role ${userRole}`,
    );
  } catch (error) {
    console.error("Error syncing permissions to localStorage:", error);
  }
};

// Advanced debugging function to trace permission issues
export const tracePermissionIssue = async (
  permissionId: string,
): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    console.log(`\n=== TRACING PERMISSION ISSUE: ${permissionId} ===`);

    const userRole = await getUserRole();
    const userRoleSync = getUserRoleSync();
    const permissions = await getRolePermissions();
    const permissionsSync = getRolePermissionsSync();

    console.log("1. Role Information:");
    console.log(`   - Async role: ${userRole}`);
    console.log(`   - Sync role: ${userRoleSync}`);
    console.log(`   - Role match: ${userRole === userRoleSync}`);

    console.log("\n2. Permission Data:");
    console.log(`   - Async permissions count: ${permissions.length}`);
    console.log(`   - Sync permissions count: ${permissionsSync.length}`);
    console.log(
      `   - Data match: ${permissions.length === permissionsSync.length}`,
    );

    console.log("\n3. Specific Permission Check:");
    const asyncPermission = permissions.find(
      (p: any) => p.role === userRole && p.permission_id === permissionId,
    );
    const syncPermission = permissionsSync.find(
      (p: any) => p.role === userRoleSync && p.permission_id === permissionId,
    );

    console.log(`   - Async permission found: ${!!asyncPermission}`);
    console.log(`   - Async permission granted: ${asyncPermission?.granted}`);
    console.log(`   - Sync permission found: ${!!syncPermission}`);
    console.log(`   - Sync permission granted: ${syncPermission?.granted}`);

    console.log("\n4. Cache Status:");
    console.log(`   - Cache size: ${permissionsCache.length}`);
    console.log(
      `   - Cache timestamp: ${new Date(cacheTimestamp).toISOString()}`,
    );
    console.log(`   - Cache age: ${Date.now() - cacheTimestamp}ms`);

    console.log("\n5. LocalStorage Status:");
    const localRole = localStorage.getItem("ngo_current_user_role");
    const localPermissions = localStorage.getItem("ngo_role_permissions");
    console.log(`   - Local role: ${localRole}`);
    console.log(`   - Local permissions exist: ${!!localPermissions}`);
    if (localPermissions) {
      try {
        const parsed = JSON.parse(localPermissions);
        console.log(`   - Local permissions count: ${parsed.length}`);
      } catch (e) {
        console.log(`   - Local permissions parse error: ${e}`);
      }
    }

    console.log("\n6. Database Check:");
    const orgId = await getOrganizationId();
    if (orgId) {
      const supabase = createClient();
      const { data: dbPermissions, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("organization_id", orgId)
        .eq("role", userRole)
        .eq("permission_id", permissionId);

      console.log(`   - Database query error: ${error?.message || "None"}`);
      console.log(`   - Database permission found: ${!!dbPermissions?.[0]}`);
      console.log(
        `   - Database permission granted: ${dbPermissions?.[0]?.granted}`,
      );
    }

    console.log("\n7. Function Results:");
    const asyncResult = await hasPermission(permissionId);
    const syncResult = hasPermissionSync(permissionId);
    console.log(`   - hasPermission (async): ${asyncResult}`);
    console.log(`   - hasPermissionSync: ${syncResult}`);
    console.log(`   - Results match: ${asyncResult === syncResult}`);

    console.log("\n=== END TRACE ===\n");
  } catch (error) {
    console.error("Error in tracePermissionIssue:", error);
  }
};

// Quick permission status check
export const getPermissionStatus = (permissionId: string): any => {
  if (typeof window === "undefined") return null;

  const userRole = getUserRoleSync();
  const permissions = getRolePermissionsSync();
  const permission = permissions.find(
    (p: any) => p.role === userRole && p.permission_id === permissionId,
  );

  // Check if user is super admin
  let isSuperAdmin = false;
  try {
    const userEmail = localStorage.getItem("ngo_current_user_email");
    isSuperAdmin = userEmail ? isSuperAdminEmail(userEmail) : false;
  } catch (error) {
    console.error("Error checking super admin status:", error);
  }

  return {
    userRole,
    permissionId,
    found: !!permission,
    granted: permission?.granted || false,
    hasPermission: hasPermissionSync(permissionId),
    totalPermissions: permissions.length,
    userPermissions: permissions.filter((p: any) => p.role === userRole).length,
    isSuperAdmin,
    adminVerified:
      sessionStorage.getItem("admin_verified") === "true" ||
      localStorage.getItem("admin_verified") === "true",
  };
};

// Function to manually verify and fix admin user roles
export const verifyAndFixAdminRole = async (
  userEmail?: string,
): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  try {
    const email = userEmail || (await getCurrentUserEmail());

    if (!email) {
      console.error("No user email available for admin verification");
      return false;
    }

    console.log(`Verifying admin role for: ${email}`);

    if (isSuperAdminEmail(email)) {
      console.log(`${email} is a super admin - ensuring admin role`);

      const userId = await getCurrentUserId();
      const orgId = await getOrganizationId();

      if (userId && orgId) {
        await ensureSuperAdminRole(userId, orgId);

        // Update local storage and session
        sessionStorage.setItem("temp_user_role", "admin");
        localStorage.setItem("ngo_current_user_role", "admin");
        localStorage.setItem("ngo_current_user_email", email);
        sessionStorage.setItem("admin_verified", "true");
        localStorage.setItem("admin_verified", "true");

        // Clear permissions cache to force refresh
        permissionsCache = [];
        cacheTimestamp = 0;

        // Sync permissions
        await syncPermissionsToSessionCache();

        console.log(`Admin role verified and fixed for ${email}`);
        return true;
      }
    } else {
      console.log(`${email} is not a super admin`);
      return false;
    }
  } catch (error) {
    console.error("Error verifying admin role:", error);
    return false;
  }

  return false;
};

// Debug function specifically for admin role issues
export const debugAdminRole = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    console.log("\n=== ADMIN ROLE DEBUG ===");

    const userEmail = await getCurrentUserEmail();
    const userId = await getCurrentUserId();
    const userRole = await getUserRole();
    const userRoleSync = getUserRoleSync();

    console.log("1. User Information:");
    console.log(`   - Email: ${userEmail}`);
    console.log(`   - User ID: ${userId}`);
    console.log(
      `   - Is Super Admin: ${userEmail ? isSuperAdminEmail(userEmail) : false}`,
    );

    console.log("\n2. Role Information:");
    console.log(`   - Async Role: ${userRole}`);
    console.log(`   - Sync Role: ${userRoleSync}`);
    console.log(`   - Role Match: ${userRole === userRoleSync}`);

    console.log("\n3. Storage Status:");
    console.log(
      `   - Session Role: ${sessionStorage.getItem("temp_user_role")}`,
    );
    console.log(
      `   - Local Role: ${localStorage.getItem("ngo_current_user_role")}`,
    );
    console.log(
      `   - Local Email: ${localStorage.getItem("ngo_current_user_email")}`,
    );
    console.log(
      `   - Session Admin Verified: ${sessionStorage.getItem("admin_verified")}`,
    );
    console.log(
      `   - Local Admin Verified: ${localStorage.getItem("admin_verified")}`,
    );

    console.log("\n4. Database Check:");
    if (userId) {
      const orgId = await getOrganizationId();
      if (orgId) {
        const supabase = createClient();
        const { data: dbRole, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("organization_id", orgId)
          .single();

        console.log(`   - Database Role: ${dbRole?.role || "Not found"}`);
        console.log(`   - Database Error: ${error?.message || "None"}`);
      }
    }

    console.log("\n5. Recommendations:");
    if (userEmail && isSuperAdminEmail(userEmail) && userRole !== "admin") {
      console.log(
        `   - ⚠️  Super admin ${userEmail} does not have admin role!`,
      );
      console.log(`   - 🔧 Run verifyAndFixAdminRole() to fix this`);
    } else if (
      userEmail &&
      isSuperAdminEmail(userEmail) &&
      userRole === "admin"
    ) {
      console.log(`   - ✅ Super admin ${userEmail} has correct admin role`);
    } else {
      console.log(`   - ℹ️  User ${userEmail} is not a super admin`);
    }

    console.log("\n=== END ADMIN DEBUG ===\n");
  } catch (error) {
    console.error("Error in debugAdminRole:", error);
  }
};
