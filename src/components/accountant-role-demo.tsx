"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Settings,
  Users,
  Shield,
} from "lucide-react";
import {
  getUserRoleSync,
  canManageExpensesSync,
  canEditExpensesSync,
  canDeleteExpensesSync,
  canManageLedgerSync,
  canEditLedgerSync,
  canDeleteLedgerSync,
  canManageSettingsSync,
  canManageUsersSync,
  setUserRoleForTesting,
  demonstrateAccountantPermissions,
  createSampleAccountantUser,
  testAccountantPermissions,
} from "@/utils/permissions";

interface PermissionCheck {
  name: string;
  permission: boolean;
  icon: React.ReactNode;
  description: string;
}

export default function AccountantRoleDemo() {
  const [currentRole, setCurrentRole] = useState<string>("admin");
  const [permissions, setPermissions] = useState<PermissionCheck[]>([]);

  const updatePermissions = () => {
    const role = getUserRoleSync();
    setCurrentRole(role);

    const permissionChecks: PermissionCheck[] = [
      {
        name: "Add Expenses",
        permission: canManageExpensesSync(),
        icon: <Plus className="h-4 w-4" />,
        description: "Can create new expense entries",
      },
      {
        name: "Edit Expenses",
        permission: canEditExpensesSync(),
        icon: <Edit className="h-4 w-4" />,
        description: "Can modify existing expenses",
      },
      {
        name: "Delete Expenses",
        permission: canDeleteExpensesSync(),
        icon: <Trash2 className="h-4 w-4" />,
        description: "Can remove expense entries",
      },
      {
        name: "Add Ledger Entries",
        permission: canManageLedgerSync(),
        icon: <Plus className="h-4 w-4" />,
        description: "Can create new ledger entries",
      },
      {
        name: "Edit Ledger Entries",
        permission: canEditLedgerSync(),
        icon: <Edit className="h-4 w-4" />,
        description: "Can modify existing ledger entries",
      },
      {
        name: "Delete Ledger Entries",
        permission: canDeleteLedgerSync(),
        icon: <Trash2 className="h-4 w-4" />,
        description: "Can remove ledger entries",
      },
      {
        name: "Manage Settings",
        permission: canManageSettingsSync(),
        icon: <Settings className="h-4 w-4" />,
        description: "Can access system settings",
      },
      {
        name: "Manage Users",
        permission: canManageUsersSync(),
        icon: <Users className="h-4 w-4" />,
        description: "Can manage user accounts",
      },
    ];

    setPermissions(permissionChecks);
  };

  useEffect(() => {
    updatePermissions();

    // Listen for role changes
    const handleRoleChange = () => {
      setTimeout(updatePermissions, 100);
    };

    window.addEventListener("roleChanged", handleRoleChange);
    window.addEventListener("permissionsChanged", handleRoleChange);

    return () => {
      window.removeEventListener("roleChanged", handleRoleChange);
      window.removeEventListener("permissionsChanged", handleRoleChange);
    };
  }, []);

  const handleRoleSwitch = async (role: string) => {
    await setUserRoleForTesting(role);
    updatePermissions();
  };

  const handleDemoAccountant = async () => {
    await demonstrateAccountantPermissions();
    updatePermissions();
  };

  const handleTestPermissions = () => {
    testAccountantPermissions();
  };

  const handleCreateSampleUser = () => {
    createSampleAccountantUser();
    alert(
      "Sample accountant user created!\nEmail: accountant@example.com\nPIN: 1234",
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "accountant":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Accountant Role Permissions Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Role Display */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Current Role:</span>
                <Badge className={getRoleColor(currentRole)}>
                  {currentRole.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Role Switch Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleRoleSwitch("admin")}
                variant={currentRole === "admin" ? "default" : "outline"}
                size="sm"
              >
                Switch to Admin
              </Button>
              <Button
                onClick={() => handleRoleSwitch("accountant")}
                variant={currentRole === "accountant" ? "default" : "outline"}
                size="sm"
              >
                Switch to Accountant
              </Button>
            </div>

            {/* Demo Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleDemoAccountant}
                variant="outline"
                size="sm"
              >
                Run Full Demo
              </Button>
              <Button
                onClick={handleTestPermissions}
                variant="outline"
                size="sm"
              >
                Test in Console
              </Button>
              <Button
                onClick={handleCreateSampleUser}
                variant="outline"
                size="sm"
              >
                Create Sample User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {permissions.map((perm, index) => (
          <Card
            key={index}
            className={`border-2 ${perm.permission ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${perm.permission ? "bg-green-100" : "bg-red-100"}`}
                  >
                    {perm.icon}
                  </div>
                  <div>
                    <div className="font-medium">{perm.name}</div>
                    <div className="text-sm text-gray-600">
                      {perm.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {perm.permission ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Permissions:</span>
              <span className="font-medium">{permissions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Granted:</span>
              <span className="font-medium text-green-600">
                {permissions.filter((p) => p.permission).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Denied:</span>
              <span className="font-medium text-red-600">
                {permissions.filter((p) => !p.permission).length}
              </span>
            </div>
          </div>

          {currentRole === "accountant" && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                Accountant Role Summary:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Can ADD expenses and ledger entries</li>
                <li>❌ Cannot EDIT or DELETE anything</li>
                <li>❌ Cannot access settings or user management</li>
                <li>
                  🔒 This ensures data integrity while allowing data entry
                </li>
              </ul>
            </div>
          )}

          {currentRole === "admin" && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">
                Admin Role Summary:
              </h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>✅ Full access to all features</li>
                <li>✅ Can add, edit, and delete everything</li>
                <li>✅ Can manage settings and users</li>
                <li>🔑 Complete administrative control</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
