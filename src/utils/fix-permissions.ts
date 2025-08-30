import { createClient } from "../../supabase/client";

export const fixAccountantPermissions = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const supabase = createClient();

    console.log("Fixing accountant permissions...");

    // Get organization ID
    const { data: orgData } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (!orgData?.id) {
      console.error("No organization found");
      return;
    }

    const orgId = orgData.id;

    // Delete existing accountant permissions
    await supabase
      .from("role_permissions")
      .delete()
      .eq("role", "accountant")
      .eq("organization_id", orgId);

    // Add correct permissions (add-only)
    const allowedPermissions = [
      "view_finances",
      "manage_expenses",
      "manage_budgets",
      "view_ledger",
      "manage_ledger",
      "view_projects",
      "view_donors",
      "view_reports",
      "generate_reports",
    ];

    const deniedPermissions = [
      "edit_expenses",
      "delete_expenses",
      "edit_budgets",
      "delete_budgets",
      "edit_ledger",
      "delete_ledger",
      "edit_projects",
      "delete_projects",
      "edit_donors",
      "delete_donors",
      "edit_reports",
      "delete_reports",
      "manage_users",
      "edit_users",
      "delete_users",
      "manage_settings",
      "edit_settings",
    ];

    // Insert allowed permissions
    const allowedData = allowedPermissions.map((permission) => ({
      organization_id: orgId,
      role: "accountant",
      permission_id: permission,
      granted: true,
    }));

    await supabase.from("role_permissions").insert(allowedData);

    // Insert denied permissions
    const deniedData = deniedPermissions.map((permission) => ({
      organization_id: orgId,
      role: "accountant",
      permission_id: permission,
      granted: false,
    }));

    await supabase.from("role_permissions").insert(deniedData);

    console.log("Accountant permissions fixed successfully!");

    // Clear cache
    sessionStorage.removeItem("temp_user_role");

    alert("Accountant permissions have been fixed! Please refresh the page.");
  } catch (error) {
    console.error("Error fixing accountant permissions:", error);
    alert("Error fixing permissions. Check console for details.");
  }
};

// Make it available globally for easy access
if (typeof window !== "undefined") {
  (window as any).fixAccountantPermissions = fixAccountantPermissions;
}
