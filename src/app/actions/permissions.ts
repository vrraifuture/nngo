"use server";

import { createClient } from "../../../supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Server action to get user role
export const getUserRoleAction = async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
        role: "viewer", // Default fallback
      };
    }

    // Check if user is super admin
    const SUPER_ADMIN_EMAILS = ["abdousentore@gmail.com"];
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(
      user.email?.toLowerCase() || "",
    );

    if (isSuperAdmin) {
      return {
        success: true,
        role: "admin",
      };
    }

    // Get user role from database
    const { data: userRole, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user role:", error);
      return {
        success: true,
        role: "viewer", // Default fallback for security
      };
    }

    return {
      success: true,
      role: userRole?.role || "viewer",
    };
  } catch (error) {
    console.error("Error in getUserRoleAction:", error);
    return {
      success: false,
      error: "Failed to get user role",
      role: "viewer",
    };
  }
};

// Server action to get role permissions
export const getRolePermissionsAction = async () => {
  try {
    // Use service role client to ensure we can read permissions
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Get organization ID (for now, use the first organization)
    const { data: organizations, error: orgError } = await serviceSupabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (orgError) {
      console.error("Error getting organization:", orgError);
      return {
        success: false,
        error: "Organization not found",
        permissions: [],
      };
    }

    // Get role permissions from database
    const { data: permissions, error } = await serviceSupabase
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
      .eq("organization_id", organizations.id);

    if (error) {
      console.error("Error getting role permissions:", error);
      return {
        success: false,
        error: "Failed to get permissions",
        permissions: [],
      };
    }

    console.log(`Loaded ${permissions?.length || 0} role permissions`);
    return {
      success: true,
      permissions: permissions || [],
    };
  } catch (error) {
    console.error("Error in getRolePermissionsAction:", error);
    return {
      success: false,
      error: "Failed to get role permissions",
      permissions: [],
    };
  }
};

// Server action to update role permissions
export const updateRolePermissionAction = async (formData: FormData) => {
  try {
    const role = formData.get("role")?.toString();
    const permissionId = formData.get("permission_id")?.toString();
    const granted = formData.get("granted") === "true";

    if (!role || !permissionId) {
      return {
        success: false,
        error: "Role and permission ID are required",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Check if user has permission to manage settings (allow super admins)
    const SUPER_ADMIN_EMAILS = ["abdousentore@gmail.com"];
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(
      user.email?.toLowerCase() || "",
    );

    if (!isSuperAdmin) {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (userRole?.role !== "admin") {
        return {
          success: false,
          error: "Insufficient permissions",
        };
      }
    }

    // Use service role client for permission updates
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Get organization ID
    const { data: organizations, error: orgError } = await serviceSupabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (orgError) {
      return {
        success: false,
        error: "Organization not found",
      };
    }

    // Update or insert the permission
    const { error } = await serviceSupabase.from("role_permissions").upsert(
      {
        organization_id: organizations.id,
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
      return {
        success: false,
        error: "Failed to update permission",
      };
    }

    console.log(`Updated permission: ${role} - ${permissionId} = ${granted}`);
    return {
      success: true,
      message: "Permission updated successfully",
    };
  } catch (error) {
    console.error("Error in updateRolePermissionAction:", error);
    return {
      success: false,
      error: "Failed to update role permission",
    };
  }
};

// Server action to initialize default permissions
export const initializeDefaultPermissionsAction = async () => {
  try {
    // Use service role client to bypass RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Get organization ID
    const { data: organizations, error: orgError } = await serviceSupabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (orgError) {
      console.error("Error getting organization:", orgError);
      return {
        success: false,
        error: "Organization not found",
      };
    }

    const orgId = organizations.id;

    // Get all available permissions
    const { data: allPermissions } = await serviceSupabase
      .from("permissions")
      .select("permission_id");

    if (!allPermissions || allPermissions.length === 0) {
      return {
        success: false,
        error: "No permissions found in database",
      };
    }

    // Define role permissions - FIXED ACCOUNTANT PERMISSIONS
    const rolePermissions = [
      // Admin gets all permissions
      ...allPermissions.map((p) => ({
        organization_id: orgId,
        role: "admin",
        permission_id: p.permission_id,
        granted: true,
      })),

      // Accountant permissions - LIMITED ACCESS
      ...[
        "view_finances",
        "manage_expenses", // Can add expenses
        "manage_budgets", // Can add budgets
        "view_ledger",
        "manage_ledger", // Can add ledger entries
        "view_projects",
        "view_donors",
        "view_reports",
        "generate_reports",
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "accountant",
        permission_id: permissionId,
        granted: true,
      })),
      // Explicitly deny all other permissions for accountant
      ...[
        "edit_expenses",
        "delete_expenses",
        "edit_budgets",
        "delete_budgets",
        "edit_ledger",
        "delete_ledger",
        "manage_projects", // DENIED: Cannot manage projects
        "edit_projects",
        "delete_projects",
        "manage_donors", // DENIED: Cannot manage donors
        "edit_donors",
        "delete_donors",
        "edit_reports",
        "delete_reports",
        "manage_settings", // DENIED: Cannot access settings
        "edit_settings",
        "manage_users",
        "edit_users",
        "delete_users",
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "accountant",
        permission_id: permissionId,
        granted: false,
      })),

      // Project Manager permissions
      ...[
        "view_finances",
        "view_projects",
        "manage_projects",
        "edit_projects",
        "delete_projects",
        "view_donors",
        "view_reports",
        "generate_reports",
        "edit_reports",
      ].map((permissionId) => ({
        organization_id: orgId,
        role: "project_manager",
        permission_id: permissionId,
        granted: true,
      })),

      // Donor permissions (very limited)
      ...["view_reports", "view_projects"].map((permissionId) => ({
        organization_id: orgId,
        role: "donor",
        permission_id: permissionId,
        granted: true,
      })),
    ];

    // Insert permissions using upsert to handle existing permissions
    const { error } = await serviceSupabase
      .from("role_permissions")
      .upsert(rolePermissions, {
        onConflict: "organization_id,role,permission_id",
      });

    if (error) {
      console.error("Error initializing permissions:", error);
      return {
        success: false,
        error: "Failed to initialize permissions",
      };
    }

    console.log(`Initialized ${rolePermissions.length} role permissions`);
    return {
      success: true,
      message: "Default permissions initialized successfully",
    };
  } catch (error) {
    console.error("Error in initializeDefaultPermissionsAction:", error);
    return {
      success: false,
      error: "Failed to initialize default permissions",
    };
  }
};
