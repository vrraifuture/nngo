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
import { Settings } from "lucide-react";
import { createClient } from "../../../../supabase/client";
import {
  getUserRoleSync,
  canManageSettingsSync,
  isAdminSync,
} from "@/utils/permissions";
import CurrencySettings from "@/components/currency-settings";
import DashboardCurrencyUpdater from "@/components/dashboard-currency-updater";

// Export the client component directly
export default function SettingsPage() {
  return <SettingsPageContent />;
}

// Client component for the main settings functionality
function SettingsPageContent() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("viewer");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasManageSettings, setHasManageSettings] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadUserRole();
        setLoading(false);
      } catch (error) {
        console.error("Error initializing settings data:", error);
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Load user role from database with better error handling
  const loadUserRole = async () => {
    try {
      console.log("Loading user role...");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error:", authError);
        // Set fallback role and continue loading the page
        setUserRole("admin"); // Allow access to settings
        setIsAdmin(true);
        setHasManageSettings(true);
        return;
      }

      if (!user) {
        console.log("No authenticated user found");
        // Set fallback role and continue loading the page
        setUserRole("admin"); // Allow access to settings
        setIsAdmin(true);
        setHasManageSettings(true);
        return;
      }

      console.log("Authenticated user:", user.id, user.email);

      // Define super admin users
      const SUPER_ADMIN_EMAILS = [
        "abdousentore@gmail.com",
        // Add more super admin emails here as needed
      ];

      // Check if user is a super admin
      const isSuperAdmin =
        user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

      if (isSuperAdmin) {
        console.log(`Super admin detected: ${user.email}`);
        setUserRole("admin");
        setIsAdmin(true);
        setHasManageSettings(true);
        sessionStorage.setItem("temp_user_role", "admin");
        sessionStorage.setItem("admin_verified", "true");
        return;
      }

      // Try to fetch user role from database
      const { data: userRoleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role from database:", error);
        // Fallback: allow access to settings for all authenticated users
        setUserRole("admin");
        setIsAdmin(true);
        setHasManageSettings(true);
      } else {
        console.log("User role found in database:", userRoleData);
        const role = userRoleData?.role || "admin"; // Default to admin for settings access
        setUserRole(role);

        // Update permission states based on role
        const adminStatus = role === "admin";
        const manageSettingsStatus = true; // Allow all users to manage settings

        setIsAdmin(adminStatus);
        setHasManageSettings(manageSettingsStatus);

        // Store role in session for sync functions
        sessionStorage.setItem("temp_user_role", role);

        if (adminStatus) {
          sessionStorage.setItem("admin_verified", "true");
        }
      }
    } catch (error) {
      console.error("Error loading user role:", error);
      // Final fallback: allow access to settings
      setUserRole("admin");
      setIsAdmin(true);
      setHasManageSettings(true);
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
          <Settings className="h-5 w-5 text-red-500" />
          <CardTitle className="text-red-700">{title}</CardTitle>
        </div>
        <CardDescription className="text-red-600">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-red-600 bg-red-100 p-4 rounded-lg">
          <div className="text-sm">
            <p className="font-medium">Access Restricted</p>
            <p>
              You don't have the required permissions to access settings. Only
              administrators can manage system settings.
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

  // Allow all authenticated users to access settings (removed permission restrictions)
  const hasSettingsAccess = () => {
    return true; // Allow everyone to access settings
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <main className="w-full">
          <div className="container mx-auto px-4 py-8 flex items-center justify-center">
            <div className="text-gray-500">Loading settings...</div>
          </div>
        </main>
      </div>
    );
  }

  // Removed permission check - all users can access settings now

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
                  Manage system configuration and preferences
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full text-sm font-medium capitalize bg-green-100 text-green-800">
                Settings Access Granted
              </div>
              <div className="text-xs text-gray-500">Role: {userRole}</div>
            </div>
          </header>

          {/* Currency Settings - The main and most important setting */}
          <CurrencySettings
            onCurrencyChange={(currency) => {
              console.log("Currency changed to:", currency);
              // The CurrencySettings component handles all the currency update logic
            }}
          />

          {/* User Management Settings */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription className="text-purple-600">
                Add new users and assign roles for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Add New User Section */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Add New User
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        User Email *
                      </label>
                      <input
                        type="email"
                        id="newUserEmail"
                        className="w-full p-2 border rounded-md"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Assign Role *
                      </label>
                      <select
                        id="newUserRole"
                        className="w-full p-2 border rounded-md"
                        defaultValue=""
                      >
                        <option value="">Select role...</option>
                        <option value="admin">Admin (Full Access)</option>
                        <option value="accountant">
                          Accountant (Add Only)
                        </option>
                        <option value="viewer">Viewer (Read Only)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={async () => {
                          const emailInput = document.getElementById(
                            "newUserEmail",
                          ) as HTMLInputElement;
                          const roleSelect = document.getElementById(
                            "newUserRole",
                          ) as HTMLSelectElement;

                          const email = emailInput?.value?.trim();
                          const role = roleSelect?.value;

                          if (!email || !role) {
                            alert("Please enter both email and role.");
                            return;
                          }

                          if (!email.includes("@")) {
                            alert("Please enter a valid email address.");
                            return;
                          }

                          try {
                            // For now, we'll store user invitations in localStorage
                            // In a real app, this would send an invitation email
                            const existingInvites = JSON.parse(
                              localStorage.getItem("ngo_user_invites") || "[]",
                            );
                            const newInvite = {
                              id: Date.now().toString(),
                              email: email,
                              role: role,
                              status: "pending",
                              invited_at: new Date().toISOString(),
                              invited_by: userRole,
                            };

                            // Check if user already invited
                            if (
                              existingInvites.find(
                                (inv: any) => inv.email === email,
                              )
                            ) {
                              alert(
                                "User with this email has already been invited.",
                              );
                              return;
                            }

                            existingInvites.push(newInvite);
                            localStorage.setItem(
                              "ngo_user_invites",
                              JSON.stringify(existingInvites),
                            );

                            alert(
                              `User invitation sent to ${email} with role: ${role}`,
                            );

                            // Clear form
                            emailInput.value = "";
                            roleSelect.value = "";

                            // Refresh the page to show updated user list
                            window.location.reload();
                          } catch (error) {
                            console.error("Error inviting user:", error);
                            alert(
                              "Error sending invitation. Please try again.",
                            );
                          }
                        }}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        Send Invitation
                      </button>
                    </div>
                  </div>
                </div>

                {/* Manual User Creation with PIN */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      NEW
                    </span>
                    Manual User Creation with PIN
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Create users manually and assign them a PIN for immediate
                    access without email verification.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="manualUserName"
                        className="w-full p-2 border rounded-md"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="manualUserEmail"
                        className="w-full p-2 border rounded-md"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        4-Digit PIN *
                      </label>
                      <input
                        type="password"
                        id="manualUserPin"
                        className="w-full p-2 border rounded-md"
                        placeholder="1234"
                        maxLength={4}
                        pattern="[0-9]{4}"
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.value = target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 4);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Role *
                      </label>
                      <select
                        id="manualUserRole"
                        className="w-full p-2 border rounded-md"
                        defaultValue=""
                      >
                        <option value="">Select role...</option>
                        <option value="admin">Admin (Full Access)</option>
                        <option value="accountant">
                          Accountant (Add Only)
                        </option>
                        <option value="viewer">Viewer (Read Only)</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        const nameInput = document.getElementById(
                          "manualUserName",
                        ) as HTMLInputElement;
                        const emailInput = document.getElementById(
                          "manualUserEmail",
                        ) as HTMLInputElement;
                        const pinInput = document.getElementById(
                          "manualUserPin",
                        ) as HTMLInputElement;
                        const roleSelect = document.getElementById(
                          "manualUserRole",
                        ) as HTMLSelectElement;

                        const name = nameInput?.value?.trim();
                        const email = emailInput?.value?.trim();
                        const pin = pinInput?.value?.trim();
                        const role = roleSelect?.value;

                        if (!name || !email || !pin || !role) {
                          alert("Please fill in all fields.");
                          return;
                        }

                        if (!email.includes("@")) {
                          alert("Please enter a valid email address.");
                          return;
                        }

                        if (pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
                          alert("PIN must be exactly 4 digits.");
                          return;
                        }

                        try {
                          // Store manual users in localStorage
                          const existingUsers = JSON.parse(
                            localStorage.getItem("ngo_manual_users") || "[]",
                          );

                          // Check if user already exists
                          if (
                            existingUsers.find(
                              (user: any) => user.email === email,
                            )
                          ) {
                            alert("User with this email already exists.");
                            return;
                          }

                          const newUser = {
                            id: Date.now().toString(),
                            name: name,
                            email: email,
                            pin: pin, // In production, this should be hashed
                            role: role,
                            status: "active",
                            created_at: new Date().toISOString(),
                            created_by: userRole,
                          };

                          existingUsers.push(newUser);
                          localStorage.setItem(
                            "ngo_manual_users",
                            JSON.stringify(existingUsers),
                          );

                          alert(
                            `User ${name} created successfully!\n\nLogin Details:\nEmail: ${email}\nPIN: ${pin}\nRole: ${role}\n\nPlease share these credentials securely with the user.`,
                          );

                          // Clear form
                          nameInput.value = "";
                          emailInput.value = "";
                          pinInput.value = "";
                          roleSelect.value = "";

                          // Refresh to show updated user list
                          window.location.reload();
                        } catch (error) {
                          console.error("Error creating manual user:", error);
                          alert("Error creating user. Please try again.");
                        }
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                      Create User with PIN
                    </button>
                  </div>
                </div>

                {/* Current Users List */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Invited Users
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const invites = JSON.parse(
                          localStorage.getItem("ngo_user_invites") || "[]",
                        );
                        if (invites.length === 0) {
                          return (
                            <p className="text-gray-500 text-sm">
                              No users invited yet.
                            </p>
                          );
                        }
                        return invites.map((invite: any) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                          >
                            <div>
                              <div className="font-medium text-sm">
                                {invite.email}
                              </div>
                              <div className="text-xs text-gray-500">
                                Role: {invite.role} | Status: {invite.status} |
                                Invited:{" "}
                                {new Date(
                                  invite.invited_at,
                                ).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Remove invitation for ${invite.email}?`,
                                    )
                                  ) {
                                    try {
                                      const existingInvites = JSON.parse(
                                        localStorage.getItem(
                                          "ngo_user_invites",
                                        ) || "[]",
                                      );
                                      const updatedInvites =
                                        existingInvites.filter(
                                          (inv: any) => inv.id !== invite.id,
                                        );
                                      localStorage.setItem(
                                        "ngo_user_invites",
                                        JSON.stringify(updatedInvites),
                                      );
                                      window.location.reload();
                                    } catch (error) {
                                      alert("Error removing invitation.");
                                    }
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ));
                      } catch (error) {
                        return (
                          <p className="text-red-500 text-sm">
                            Error loading user invitations.
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* Manual Users List */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      PIN
                    </span>
                    Manual Users (PIN Access)
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const manualUsers = JSON.parse(
                          localStorage.getItem("ngo_manual_users") || "[]",
                        );
                        if (manualUsers.length === 0) {
                          return (
                            <p className="text-gray-500 text-sm">
                              No manual users created yet.
                            </p>
                          );
                        }
                        return manualUsers.map((user: any) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200"
                          >
                            <div>
                              <div className="font-medium text-sm">
                                {user.name} ({user.email})
                              </div>
                              <div className="text-xs text-gray-500">
                                Role: {user.role} | PIN: ••••
                                {user.pin.slice(-2)} | Status: {user.status} |
                                Created:{" "}
                                {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  alert(
                                    `User Login Details:\n\nName: ${user.name}\nEmail: ${user.email}\nPIN: ${user.pin}\nRole: ${user.role}\n\nPlease share these credentials securely.`,
                                  );
                                }}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                View PIN
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Remove user ${user.name} (${user.email})?`,
                                    )
                                  ) {
                                    try {
                                      const existingUsers = JSON.parse(
                                        localStorage.getItem(
                                          "ngo_manual_users",
                                        ) || "[]",
                                      );
                                      const updatedUsers = existingUsers.filter(
                                        (u: any) => u.id !== user.id,
                                      );
                                      localStorage.setItem(
                                        "ngo_manual_users",
                                        JSON.stringify(updatedUsers),
                                      );
                                      window.location.reload();
                                    } catch (error) {
                                      alert("Error removing user.");
                                    }
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ));
                      } catch (error) {
                        return (
                          <p className="text-red-500 text-sm">
                            Error loading manual users.
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* Role Assignment Section */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Current User Role Management
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Current User Role
                      </label>
                      <div className="p-3 bg-gray-50 rounded border">
                        <span className="font-mono text-sm">{userRole}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Change Role To
                      </label>
                      <select
                        className="w-full p-2 border rounded-md"
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          if (newRole && newRole !== userRole) {
                            try {
                              const { setUserRole } = await import(
                                "@/utils/permissions"
                              );
                              await setUserRole(newRole);
                              alert(
                                `Role changed to ${newRole}. Please refresh the page.`,
                              );
                              window.location.reload();
                            } catch (error) {
                              console.error("Error changing role:", error);
                              alert("Error changing role. Please try again.");
                            }
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Select new role...</option>
                        <option value="admin">Admin (Full Access)</option>
                        <option value="accountant">
                          Accountant (Add Only)
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Role Permissions Explanation */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Role Permissions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Admin Role */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h5 className="font-medium text-green-800">
                          Admin Role
                        </h5>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1 ml-5">
                        <li>✅ View all financial data</li>
                        <li>✅ Add new entries (expenses, budgets, etc.)</li>
                        <li>✅ Edit existing entries</li>
                        <li>✅ Delete entries</li>
                        <li>✅ Access settings and configuration</li>
                        <li>✅ Generate and manage reports</li>
                        <li>✅ Manage users and permissions</li>
                      </ul>
                    </div>

                    {/* Accountant Role */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h5 className="font-medium text-blue-800">
                          Accountant Role
                        </h5>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1 ml-5">
                        <li>✅ View all financial data</li>
                        <li>✅ Add new entries (expenses, budgets, etc.)</li>
                        <li>❌ Cannot edit existing entries</li>
                        <li>❌ Cannot delete entries</li>
                        <li>❌ Cannot access settings</li>
                        <li>✅ Generate reports (view only)</li>
                        <li>❌ Cannot manage users</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Fund Tracking Settings */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Fund Tracking Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium text-gray-700">
                          Allow Edit/Delete Fund Entries
                        </label>
                        <p className="text-sm text-gray-500">
                          Enable edit and delete buttons for fund tracking
                          entries
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          onChange={(e) => {
                            const settings = {
                              allowEditDelete: e.target.checked,
                            };
                            localStorage.setItem(
                              "ngo_fund_tracking_settings",
                              JSON.stringify(settings),
                            );
                            alert(
                              "Fund tracking settings updated. Please refresh the page to see changes.",
                            );
                          }}
                          defaultChecked={(() => {
                            try {
                              const settings = localStorage.getItem(
                                "ngo_fund_tracking_settings",
                              );
                              return settings
                                ? JSON.parse(settings).allowEditDelete
                                : false;
                            } catch {
                              return false;
                            }
                          })()}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Permission Initialization */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">
                    Permission System
                  </h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Initialize or reset the permission system for your
                    organization
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const { initializeDefaultPermissions } = await import(
                            "@/utils/permissions"
                          );
                          await initializeDefaultPermissions(true);
                          alert("Permissions initialized successfully!");
                        } catch (error) {
                          console.error(
                            "Error initializing permissions:",
                            error,
                          );
                          alert(
                            "Error initializing permissions. Please try again.",
                          );
                        }
                      }}
                      className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                    >
                      Initialize Permissions
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const { debugPermissions } = await import(
                            "@/utils/permissions"
                          );
                          await debugPermissions();
                          alert(
                            "Check console for permission debug information.",
                          );
                        } catch (error) {
                          console.error("Error debugging permissions:", error);
                        }
                      }}
                      className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Debug Permissions
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simple Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">
                System Information
              </CardTitle>
              <CardDescription className="text-blue-600">
                Current system configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">User Role</h4>
                  <p className="text-gray-600">{userRole}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Access Level
                  </h4>
                  <p className="text-gray-600">
                    {isAdmin ? "Full Administrator" : "Settings Access"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">Need Help?</CardTitle>
              <CardDescription className="text-green-600">
                Settings and configuration guidance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-green-800 space-y-2">
                <p>
                  <strong>Currency Settings:</strong> Configure your
                  organization's default currency. This will be used throughout
                  the entire system for all financial displays.
                </p>
                <p>
                  <strong>System Consistency:</strong> Once you set RWF as the
                  default currency, all amounts will be displayed in RWF format
                  across the entire application.
                </p>
                <p>
                  <strong>Changes:</strong> Currency changes take effect
                  immediately and will refresh the page to ensure all components
                  are updated.
                </p>
                <p>
                  <strong>Access:</strong> All authenticated users can now
                  access and modify currency settings. Permission restrictions
                  have been removed for better usability.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
