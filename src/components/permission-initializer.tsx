"use client";

import { useEffect, useState } from "react";
import {
  setUserRole,
  initializeDefaultPermissions,
  debugPermissions,
  getUserRoleSync,
  getRolePermissionsSync,
  syncPermissionsToSessionCache,
  refreshPermissions,
  verifyAndFixAdminRole,
  debugAdminRole,
} from "@/utils/permissions";
import { createClient } from "../../supabase/client";

interface PermissionInitializerProps {
  userRole: string;
}

export default function PermissionInitializer({
  userRole,
}: PermissionInitializerProps) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializePermissions = async () => {
      console.log(
        "PermissionInitializer: Setting up permissions for role:",
        userRole,
      );

      try {
        // Only set role if it's different from current role (prevent duplicates)
        const currentRole = getUserRoleSync();
        if (currentRole !== userRole) {
          console.log(`Role change detected: ${currentRole} -> ${userRole}`);
          await setUserRole(userRole);
        } else {
          console.log(`Role already set correctly: ${userRole}`);
        }

        // Initialize default permissions only if they don't exist
        await initializeDefaultPermissions();

        // Sync permissions to session cache for immediate access
        await syncPermissionsToSessionCache();

        // Verify permissions were set correctly
        setTimeout(() => {
          const currentRole = getUserRoleSync();
          const permissions = getRolePermissionsSync();
          const userPermissions = permissions.filter(
            (p) => p.role === currentRole,
          );

          console.log("Permission verification:", {
            expectedRole: userRole,
            actualRole: currentRole,
            totalPermissions: permissions.length,
            userPermissions: userPermissions.length,
            roleMatch: currentRole === userRole,
          });

          if (currentRole !== userRole) {
            console.warn("Role mismatch detected, correcting...");
            setUserRole(userRole);
          }

          if (permissions.length === 0) {
            console.warn(
              "No permissions found after initialization, forcing re-init...",
            );
            initializeDefaultPermissions(true);
          }

          // Set role in both session and localStorage for better persistence
          sessionStorage.setItem("temp_user_role", userRole);
          localStorage.setItem("ngo_current_user_role", userRole);

          // Also store user email for super admin checks (if available)
          try {
            const supabase = createClient();
            supabase.auth
              .getUser()
              .then(({ data: { user } }) => {
                if (user?.email) {
                  localStorage.setItem("ngo_current_user_email", user.email);
                }
              })
              .catch((error) => {
                console.error("Error storing user email:", error);
              });
          } catch (error) {
            console.error("Error storing user email:", error);
          }

          if (userRole === "admin") {
            sessionStorage.setItem("admin_verified", "true");
            localStorage.setItem("admin_verified", "true");
            console.log("Admin role verified and set in storage");
          } else {
            sessionStorage.removeItem("admin_verified");
            localStorage.removeItem("admin_verified");
            console.log(`Non-admin role (${userRole}) set in storage`);
          }

          setInitialized(true);
          setLoading(false);
        }, 500);

        // Debug permissions in development
        if (process.env.NODE_ENV === "development") {
          setTimeout(async () => {
            await debugPermissions();
            await debugAdminRole();
          }, 1000);
        }

        // Additional verification for admin users
        if (userRole === "admin") {
          setTimeout(async () => {
            const verified = await verifyAndFixAdminRole();
            if (verified) {
              console.log("Admin role verification completed successfully");
            }
          }, 1500);
        }
      } catch (error) {
        console.error("Error initializing permissions:", error);
        setLoading(false);

        // Fallback to localStorage-only mode
        try {
          localStorage.setItem("ngo_current_user_role", userRole);
          sessionStorage.setItem("temp_user_role", userRole);
          if (userRole === "admin") {
            localStorage.setItem("admin_verified", "true");
            sessionStorage.setItem("admin_verified", "true");
          }
          console.log("Fallback: Set role in storage");
          setInitialized(true);
          setLoading(false);
        } catch (localError) {
          console.error("Fallback failed:", localError);
          setLoading(false);
        }
      }
    };

    initializePermissions();
  }, [userRole]);

  // Listen for permission changes and re-verify
  useEffect(() => {
    const handlePermissionChange = async (event: CustomEvent) => {
      console.log("Permission change detected in initializer:", event.detail);

      try {
        // Refresh permissions from database
        await refreshPermissions();

        // Sync to session cache
        await syncPermissionsToSessionCache();

        const currentRole = getUserRoleSync();
        const permissions = getRolePermissionsSync();

        if (currentRole !== userRole) {
          console.log("Role changed, updating...");
          await setUserRole(userRole);
        }
      } catch (error) {
        console.error("Error handling permission change:", error);
      }
    };

    const handleRoleChange = async (event: CustomEvent) => {
      console.log("Role change detected in initializer:", event.detail);

      try {
        // Sync permissions after role change
        await syncPermissionsToSessionCache();
      } catch (error) {
        console.error("Error handling role change:", error);
      }
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
  }, [userRole]);

  // Show loading state while initializing
  if (loading) {
    return (
      <div className="fixed top-4 right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
        Initializing permissions...
      </div>
    );
  }

  return null; // This component doesn't render anything after initialization
}
