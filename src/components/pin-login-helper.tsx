"use client";

import { useEffect } from "react";
import { createClient } from "../../supabase/client";

export default function PinLoginHelper() {
  const supabase = createClient();

  useEffect(() => {
    // Check if there are manual users and provide login instructions
    const checkManualUsers = () => {
      try {
        const manualUsers = JSON.parse(
          localStorage.getItem("ngo_manual_users") || "[]",
        );

        if (manualUsers.length > 0) {
          console.log(
            `Found ${manualUsers.length} manual users with PIN access`,
          );
          console.log(
            "Manual users:",
            manualUsers.map((u: any) => ({
              name: u.name,
              email: u.email,
              role: u.role,
            })),
          );

          // Add a notice to the page about PIN login
          const existingNotice = document.getElementById("pin-login-notice");
          if (!existingNotice) {
            const notice = document.createElement("div");
            notice.id = "pin-login-notice";
            notice.className =
              "fixed top-4 right-4 bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm";
            notice.innerHTML = `
              <div class="text-sm">
                <strong>PIN Login Available</strong><br/>
                ${manualUsers.length} user(s) can login with email + PIN instead of password.
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-blue-600 hover:text-blue-800">×</button>
              </div>
            `;
            document.body.appendChild(notice);

            // Auto-remove after 10 seconds
            setTimeout(() => {
              if (document.getElementById("pin-login-notice")) {
                document.getElementById("pin-login-notice")?.remove();
              }
            }, 10000);
          }
        }
      } catch (error) {
        console.error("Error checking manual users:", error);
      }
    };

    // Check on component mount
    checkManualUsers();

    // Also check when localStorage changes
    const handleStorageChange = () => {
      checkManualUsers();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return null; // This component doesn't render anything visible
}
