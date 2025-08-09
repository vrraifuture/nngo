// Permission utility functions for role-based access control
import { createClient } from "../../supabase/client";

// Server-side permission system - no localStorage dependency
let permissionsCache: any[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds for faster updates

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

// Get user's role from database
export const getUserRole = async (): Promise<string> => {
  if (typeof window === "undefined") return "admin"; // Server-side fallback

  try {
    const userId = await getCurrentUserId();
    const orgId = await getOrganizationId();

    if (!userId || !orgId) {
      console.warn("No user or organization found, defaulting to admin");
      return "admin";
    }

    const supabase = createClient();
    const { data: userRole, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .single();

    if (error) {
      console.error("Error getting user role:", error);
      return "admin"; // Fallback to admin
    }

    return userRole?.role || "admin";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "admin";
  }
};

// Synchronous version that uses cache only - no localStorage
export const getUserRoleSync = (): string => {
  if (typeof window === "undefined") return "viewer"; // Server-side default

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

  return "viewer"; // Default to viewer for security
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
    const { error } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        organization_id: orgId,
        role: role,
      },
      {
        onConflict: "user_id,organization_id",
      },
    );

    if (error) {
      console.error("Error setting user role:", error);
      return;
    }

    // Update session cache only (no localStorage)
    const previousRole = getUserRoleSync();
    sessionStorage.setItem("temp_user_role", role);

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

    // If no permissions are loaded, return false for security (except for verified admin)
    if (rolePermissions.length === 0) {
      // Only allow admin if explicitly set in session and verified
      const isVerifiedAdmin =
        userRole === "admin" &&
        sessionStorage.getItem("admin_verified") === "true";
      if (isVerifiedAdmin) {
        console.log(
          "Verified admin with no permissions loaded - allowing access",
        );
        return true;
      }
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
    // Default to false for security
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

    // Define role permissions with restricted defaults
    const rolePermissions = [
      // Admin gets all permissions
      ...allPermissions.map((p) => ({
        organization_id: orgId,
        role: "admin",
        permission_id: p.permission_id,
        granted: true,
      })),

      // Accountant permissions - RESTRICTED by default (admin must enable)
      ...[
        "view_finances",
        "view_ledger",
        "view_projects",
        "view_donors",
        "view_reports",
        "generate_reports",
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "accountant",
        permission_id: permissionId,
        granted: true, // Only basic view permissions
      })),
      // Restricted permissions for accountant (must be enabled by admin)
      ...[
        "manage_expenses",
        "edit_expenses",
        "delete_expenses",
        "manage_budgets",
        "edit_budgets",
        "delete_budgets",
        "manage_ledger",
        "edit_ledger",
        "delete_ledger",
        "edit_reports",
        "delete_reports",
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "accountant",
        permission_id: permissionId,
        granted: false, // Disabled by default - admin must enable
      })),

      // Project Manager permissions - RESTRICTED by default
      ...[
        "view_finances",
        "view_projects",
        "view_donors",
        "view_reports",
        "generate_reports",
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "project_manager",
        permission_id: permissionId,
        granted: true, // Only basic view permissions
      })),
      // Restricted permissions for project manager
      ...[
        "manage_projects",
        "edit_projects",
        "delete_projects",
        "edit_reports",
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "project_manager",
        permission_id: permissionId,
        granted: false, // Disabled by default - admin must enable
      })),

      // Donor permissions (very limited - view only)
      ...["view_reports", "view_projects"].map((permissionId) => ({
        organization_id: orgId,
        role: "donor",
        permission_id: permissionId,
        granted: true,
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

    // Store in session cache only (no localStorage)
    sessionStorage.setItem("temp_user_role", userRole);
    cacheTimestamp = Date.now();

    console.log(
      `Permissions synced to session cache: ${permissions.length} permissions for role ${userRole}`,
    );
  } catch (error) {
    console.error("Error syncing permissions to session cache:", error);
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

  return {
    userRole,
    permissionId,
    found: !!permission,
    granted: permission?.granted || false,
    hasPermission: hasPermissionSync(permissionId),
    totalPermissions: permissions.length,
    userPermissions: permissions.filter((p: any) => p.role === userRole).length,
  };
};
