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
        const currentDate = new Date();
        const firstDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1,
        );
        const lastDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
        );

        console.log("Client-side: Counting reports for period:", {
          start: firstDayOfMonth.toISOString(),
          end: lastDayOfMonth.toISOString(),
        });

        let totalReports = 0;

        // First try to get actual reports from the reports table
        try {
          const { data: actualReports, error: reportsError } = await supabase
            .from("reports")
            .select("id, generated_at")
            .gte("generated_at", firstDayOfMonth.toISOString())
            .lte("generated_at", lastDayOfMonth.toISOString());

          if (!reportsError && actualReports) {
            totalReports += actualReports.length;
            console.log("Found database reports:", actualReports.length);
          }
        } catch (dbError) {
          console.log("Database reports not accessible:", dbError);
        }

        // Also count localStorage reports
        try {
          const localReports = JSON.parse(
            localStorage.getItem("ngo_reports") || "[]",
          );

          const thisMonthLocalReports = localReports.filter((report: any) => {
            const reportDate = new Date(report.generated_at);
            return (
              reportDate >= firstDayOfMonth && reportDate <= lastDayOfMonth
            );
          });

          totalReports += thisMonthLocalReports.length;
          console.log(
            "Found localStorage reports:",
            thisMonthLocalReports.length,
          );
        } catch (localError) {
          console.log("Error reading localStorage reports:", localError);
        }

        console.log("Total reports this month:", totalReports);
        setReportsCount(totalReports);
      } catch (error) {
        console.error("Error counting reports:", error);
        setReportsCount(0);
      } finally {
        setLoading(false);
      }
    };

    countReports();

    // Listen for localStorage changes (when new reports are generated)
    const handleStorageChange = () => {
      console.log("Storage changed, recounting reports...");
      countReports();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events when reports are generated
    const handleReportGenerated = () => {
      console.log("Report generated event, recounting...");
      setTimeout(countReports, 500); // Small delay to ensure localStorage is updated
    };

    window.addEventListener("reportGenerated", handleReportGenerated);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("reportGenerated", handleReportGenerated);
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
