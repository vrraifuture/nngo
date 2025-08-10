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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Shield,
  User,
  Settings,
  RefreshCw,
  Download,
  Upload,
} from "lucide-react";
import {
  getUserRoleSync,
  getRolePermissionsSync,
  setUserRole,
  initializeDefaultPermissions,
  resetPermissions,
  debugPermissions,
  canManageSettingsSync,
  updateRolePermissions,
  refreshPermissions,
  syncPermissionsToSessionCache,
  tracePermissionIssue,
  getPermissionStatus,
} from "@/utils/permissions";
import {
  getUserRoleAction,
  getRolePermissionsAction,
  updateRolePermissionAction,
  initializeDefaultPermissionsAction,
} from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PermissionManagerProps {
  userRole: string;
}

const AVAILABLE_ROLES = [
  { value: "admin", label: "Administrator", color: "bg-red-100 text-red-800" },
  {
    value: "accountant",
    label: "Accountant (Read-Only)",
    color: "bg-blue-100 text-blue-800",
  },
];

const PERMISSION_CATEGORIES = {
  finances: {
    label: "Financial Management",
    permissions: [
      "view_finances",
      "manage_expenses",
      "edit_expenses",
      "delete_expenses",
    ],
  },
  budgets: {
    label: "Budget Management",
    permissions: ["manage_budgets", "edit_budgets", "delete_budgets"],
  },
  ledger: {
    label: "General Ledger",
    permissions: [
      "view_ledger",
      "manage_ledger",
      "edit_ledger",
      "delete_ledger",
    ],
  },
  projects: {
    label: "Project Management",
    permissions: [
      "view_projects",
      "manage_projects",
      "edit_projects",
      "delete_projects",
    ],
  },
  donors: {
    label: "Donor Management",
    permissions: [
      "view_donors",
      "manage_donors",
      "edit_donors",
      "delete_donors",
    ],
  },
  reports: {
    label: "Report Management",
    permissions: [
      "view_reports",
      "generate_reports",
      "edit_reports",
      "delete_reports",
    ],
  },
  users: {
    label: "User Management",
    permissions: ["view_users", "manage_users", "edit_users", "delete_users"],
  },
  settings: {
    label: "System Settings",
    permissions: ["manage_settings", "edit_settings"],
  },
};

export default function PermissionManager({
  userRole,
}: PermissionManagerProps) {
  const [currentRole, setCurrentRole] = useState(userRole);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState(false);

  useEffect(() => {
    loadPermissions();

    // Listen for permission changes
    const handlePermissionChange = (event: CustomEvent) => {
      console.log("Permission change detected:", event.detail);
      loadPermissions();
    };

    const handleRoleChange = (event: CustomEvent) => {
      console.log("Role change detected:", event.detail);
      loadPermissions();
    };

    window.addEventListener(
      "permissionsChanged",
      handlePermissionChange as EventListener,
    );
    window.addEventListener("roleChanged", handleRoleChange as EventListener);

    return () => {
      window.removeEventListener(
        "permissionsChanged",
        handlePermissionChange as EventListener,
      );
      window.removeEventListener(
        "roleChanged",
        handleRoleChange as EventListener,
      );
    };
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);

      // Load user role from server
      const roleResult = await getUserRoleAction();
      if (roleResult.success) {
        setCurrentRole(roleResult.role);
      }

      // Load permissions from server
      const permissionsResult = await getRolePermissionsAction();
      if (permissionsResult.success) {
        setPermissions(permissionsResult.permissions);
        console.log("Loaded permissions from server:", {
          role: roleResult.role,
          permissionsCount: permissionsResult.permissions.length,
        });
      } else {
        console.log("No permissions found, initializing defaults...");
        const initResult = await initializeDefaultPermissionsAction();
        if (initResult.success) {
          // Reload after initialization
          const newPermissionsResult = await getRolePermissionsAction();
          if (newPermissionsResult.success) {
            setPermissions(newPermissionsResult.permissions);
          }
        }
      }

      // Update session cache for sync functions
      await syncPermissionsToSessionCache();
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!canManageSettingsSync()) {
      alert("You don't have permission to change roles.");
      return;
    }

    try {
      setLoading(true);
      console.log(`Changing role from ${currentRole} to ${newRole}`);

      await setUserRole(newRole);
      setCurrentRole(newRole);

      // Force refresh permissions to ensure they're loaded for the new role
      setTimeout(async () => {
        await refreshPermissions();
        await syncPermissionsToSessionCache();
        await loadPermissions();
      }, 500);

      // Show confirmation
      alert(
        `Role changed to ${AVAILABLE_ROLES.find((r) => r.value === newRole)?.label || newRole}. The page will refresh to apply changes.`,
      );

      // Trigger a page refresh to update all components
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error changing role:", error);
      alert("Error changing role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPermissions = async () => {
    if (!canManageSettingsSync()) {
      alert("You don't have permission to reset permissions.");
      return;
    }

    if (
      confirm(
        "Are you sure you want to reset all permissions to default? This will reload the page.",
      )
    ) {
      try {
        setLoading(true);
        console.log("Resetting permissions to default...");

        await resetPermissions();
        await initializeDefaultPermissions(true); // Force initialization

        // Refresh local state
        setTimeout(async () => {
          await loadPermissions();
        }, 500);

        alert("Permissions have been reset to default values.");

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error("Error resetting permissions:", error);
        alert("Error resetting permissions. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDebugPermissions = async () => {
    try {
      await debugPermissions();

      // Also run advanced debugging
      console.log("\n=== ADVANCED PERMISSION DEBUG ===");
      const testPermissions = [
        "manage_expenses",
        "edit_budgets",
        "view_reports",
        "manage_settings",
      ];

      for (const perm of testPermissions) {
        const status = getPermissionStatus(perm);
        console.log(`${perm}:`, status);
      }

      alert(
        "Comprehensive debug info has been logged to the console. Press F12 to view detailed analysis.",
      );
    } catch (error) {
      console.error("Error debugging permissions:", error);
      alert("Error debugging permissions. Check console for details.");
    }
  };

  const handleTracePermission = async (permissionId: string) => {
    try {
      await tracePermissionIssue(permissionId);
      alert(
        `Detailed trace for '${permissionId}' logged to console. Press F12 to view.`,
      );
    } catch (error) {
      console.error("Error tracing permission:", error);
      alert("Error tracing permission. Check console for details.");
    }
  };

  const handleTogglePermission = async (
    role: string,
    permissionId: string,
    currentlyGranted: boolean,
  ) => {
    if (!canManageSettingsSync()) {
      alert("You don't have permission to modify permissions.");
      return;
    }

    try {
      setLoading(true);
      const newGrantedState = !currentlyGranted;

      console.log(
        `Toggling permission: ${role} - ${permissionId} from ${currentlyGranted} to ${newGrantedState}`,
      );

      // Use server action to update permission
      const formData = new FormData();
      formData.append("role", role);
      formData.append("permission_id", permissionId);
      formData.append("granted", newGrantedState.toString());

      const result = await updateRolePermissionAction(formData);

      if (result.success) {
        // Immediately update local state to reflect the change
        setPermissions((prevPermissions) => {
          const updatedPermissions = prevPermissions.map((p) => {
            if (p.role === role && p.permission_id === permissionId) {
              return { ...p, granted: newGrantedState };
            }
            return p;
          });

          // If permission doesn't exist, add it
          const permissionExists = prevPermissions.some(
            (p) => p.role === role && p.permission_id === permissionId,
          );

          if (!permissionExists) {
            updatedPermissions.push({
              role,
              permission_id: permissionId,
              granted: newGrantedState,
              permissions: {
                name: permissionId,
                description: "",
                category: "",
              },
            });
          }

          return updatedPermissions;
        });

        console.log(
          `Permission ${permissionId} for ${role} updated successfully to ${newGrantedState}`,
        );
      } else {
        alert(`Failed to update permission: ${result.error}`);
      }
    } catch (error) {
      console.error("Error toggling permission:", error);
      alert("Error updating permission. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportPermissions = () => {
    const data = {
      currentRole,
      permissions,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permissions-${currentRole}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRolePermissions = (role: string) => {
    return permissions.filter((p) => p.role === role && p.granted);
  };

  const getAllRolePermissions = (role: string) => {
    return permissions.filter((p) => p.role === role);
  };

  const getPermissionsByCategory = (role: string) => {
    const rolePerms = getRolePermissions(role);
    const result: any = {};

    Object.entries(PERMISSION_CATEGORIES).forEach(([category, config]) => {
      result[category] = {
        ...config,
        granted: config.permissions.filter((perm) =>
          rolePerms.some((rp) => rp.permission_id === perm),
        ),
        total: config.permissions.length,
      };
    });

    return result;
  };

  if (!canManageSettingsSync() && currentRole !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Manager
          </CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to manage system settings. Contact an
              administrator for access.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Current User Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Current Role
              </Label>
              <div className="mt-1">
                <Badge
                  className={
                    AVAILABLE_ROLES.find((r) => r.value === currentRole)
                      ?.color || "bg-gray-100 text-gray-800"
                  }
                >
                  {AVAILABLE_ROLES.find((r) => r.value === currentRole)
                    ?.label || currentRole}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Total Permissions
              </Label>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {getRolePermissions(currentRole).length}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Permission Status
              </Label>
              <div className="mt-1">
                <Badge className="bg-green-100 text-green-800">
                  {permissions.length > 0 ? "Initialized" : "Not Initialized"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Role Management
          </CardTitle>
          <CardDescription>
            Change your current role or manage permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="role-select">Switch Role</Label>
                <Select value={currentRole} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleResetPermissions}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
              <Button
                onClick={handleDebugPermissions}
                variant="outline"
                size="sm"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Debug Permissions
              </Button>
              <Button onClick={exportPermissions} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Config
              </Button>
              <Button
                onClick={() => setEditingPermissions(!editingPermissions)}
                variant={editingPermissions ? "default" : "outline"}
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                {editingPermissions ? "Exit Edit Mode" : "Edit Permissions"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Overview by Role</CardTitle>
          <CardDescription>
            View permissions for different roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>View Role:</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(getPermissionsByCategory(selectedRole)).map(
                ([category, config]) => (
                  <Card key={category} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{config.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {config.granted.length} / {config.total} permissions
                        </span>
                        <Badge
                          className={
                            config.granted.length === config.total
                              ? "bg-green-100 text-green-800"
                              : config.granted.length > 0
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {config.granted.length === config.total
                            ? "Full Access"
                            : config.granted.length > 0
                              ? "Partial Access"
                              : "No Access"}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        {config.permissions.map((perm: string) => (
                          <div
                            key={perm}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-gray-600">
                              {perm
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l: string) =>
                                  l.toUpperCase(),
                                )}
                            </span>
                            <div className="flex items-center gap-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  config.granted.includes(perm)
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              />
                              {editingPermissions && (
                                <button
                                  onClick={() => handleTracePermission(perm)}
                                  className="text-xs text-blue-500 hover:text-blue-700"
                                  title="Debug this permission"
                                >
                                  🔍
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Permission Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Permission Matrix</CardTitle>
          <CardDescription>
            Complete overview of all permissions across roles
            {editingPermissions && (
              <span className="text-orange-600 font-medium">
                {" "}
                - Edit Mode: Click switches to toggle permissions
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  {AVAILABLE_ROLES.map((role) => (
                    <TableHead key={role.value} className="text-center">
                      {role.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(PERMISSION_CATEGORIES).map(
                  ([category, config]) =>
                    config.permissions.map((permission) => (
                      <TableRow key={permission}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">
                              {permission
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l: string) =>
                                  l.toUpperCase(),
                                )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {config.label}
                            </div>
                          </div>
                        </TableCell>
                        {AVAILABLE_ROLES.map((role) => {
                          // Get the actual permission record from database
                          const permissionRecord = getAllRolePermissions(
                            role.value,
                          ).find((p) => p.permission_id === permission);

                          // Check if permission is granted (default to false if not found)
                          const isGranted = permissionRecord?.granted === true;

                          return (
                            <TableCell key={role.value} className="text-center">
                              {editingPermissions ? (
                                <Switch
                                  checked={isGranted}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      role.value,
                                      permission,
                                      isGranted,
                                    )
                                  }
                                  disabled={loading}
                                  className="mx-auto"
                                />
                              ) : (
                                <div
                                  className={`w-4 h-4 rounded-full mx-auto ${
                                    isGranted ? "bg-green-500" : "bg-red-500"
                                  }`}
                                />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )),
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
