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
        setUserRole("viewer");
        return;
      }

      if (!user) {
        console.log("No authenticated user found");
        setUserRole("viewer");
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
        setUserRole("viewer");
      } else {
        console.log("User role found in database:", userRoleData);
        const role = userRoleData?.role || "viewer";
        setUserRole(role);

        // Update permission states based on role
        const adminStatus = role === "admin";
        const manageSettingsStatus = adminStatus;

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
      setUserRole("viewer");
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
