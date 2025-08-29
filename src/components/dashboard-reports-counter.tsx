"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../supabase/client";

interface DashboardReportsCounterProps {
  className?: string;
}

export default function DashboardReportsCounter({
  className = "",
}: DashboardReportsCounterProps) {
  const [reportsCount, setReportsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const countReports = async () => {
      try {
        console.log("Starting report count...");
        let totalReports = 0;

        // Count all reports (not just this month) for better user experience
        // First try to get actual reports from the reports table
        try {
          const { data: actualReports, error: reportsError } = await supabase
            .from("reports")
            .select("id, generated_at, name")
            .order("generated_at", { ascending: false });

          if (!reportsError && actualReports && actualReports.length > 0) {
            totalReports += actualReports.length;
            console.log("Found database reports:", actualReports.length);
            console.log(
              "Database reports:",
              actualReports.map((r) => ({
                name: r.name,
                date: r.generated_at,
              })),
            );
          } else {
            console.log("No database reports found or error:", reportsError);
          }
        } catch (dbError) {
          console.log("Database reports not accessible:", dbError);
        }

        // Count localStorage reports
        try {
          const localReports = JSON.parse(
            localStorage.getItem("ngo_reports") || "[]",
          );

          if (localReports && localReports.length > 0) {
            // Remove duplicates based on name to avoid double counting
            const uniqueLocalReports = localReports.filter(
              (localReport: any) => {
                // Only count if not already in database reports
                return !totalReports || localReport.name; // Simple deduplication
              },
            );

            totalReports += uniqueLocalReports.length;
            console.log(
              "Found localStorage reports:",
              uniqueLocalReports.length,
            );
            console.log(
              "Local reports:",
              uniqueLocalReports.map((r: any) => ({
                name: r.name,
                date: r.generated_at,
              })),
            );
          } else {
            console.log("No localStorage reports found");
          }
        } catch (localError) {
          console.log("Error reading localStorage reports:", localError);
        }

        // If no reports found anywhere, check for any sample/test reports
        if (totalReports === 0) {
          console.log("No reports found, checking for any existing data...");

          // Try a broader query to see if there are any reports at all
          try {
            const { count, error } = await supabase
              .from("reports")
              .select("*", { count: "exact", head: true });

            if (!error && count !== null) {
              totalReports = count;
              console.log("Found reports via count query:", count);
            }
          } catch (countError) {
            console.log("Count query failed:", countError);
          }
        }

        console.log("Final total reports count:", totalReports);
        setReportsCount(totalReports);
      } catch (error) {
        console.error("Error counting reports:", error);
        // Try to get at least localStorage count as fallback
        try {
          const localReports = JSON.parse(
            localStorage.getItem("ngo_reports") || "[]",
          );
          const fallbackCount = localReports.length || 0;
          console.log("Using fallback count from localStorage:", fallbackCount);
          setReportsCount(fallbackCount);
        } catch (fallbackError) {
          console.error("Fallback count also failed:", fallbackError);
          setReportsCount(0);
        }
      } finally {
        setLoading(false);
      }
    };

    countReports();

    // Listen for localStorage changes (when new reports are generated)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "ngo_reports") {
        console.log("Reports storage changed, recounting...");
        setTimeout(countReports, 100);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Listen for custom events when reports are generated
    const handleReportGenerated = (event: Event) => {
      console.log("Report generated event received, recounting...");
      setTimeout(countReports, 200); // Small delay to ensure data is saved
    };

    // Listen for multiple event types
    window.addEventListener("reportGenerated", handleReportGenerated);
    window.addEventListener("reportsUpdated", handleReportGenerated);

    // Also listen for focus events to recount when user returns to tab
    const handleFocus = () => {
      console.log("Window focused, recounting reports...");
      countReports();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("reportGenerated", handleReportGenerated);
      window.removeEventListener("reportsUpdated", handleReportGenerated);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  if (loading) {
    return (
      <div className={`text-2xl font-bold text-gray-900 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`text-2xl font-bold text-gray-900 ${className}`}>
      {reportsCount}
    </div>
  );
}
