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
        console.log("🔍 Starting report count process...");

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Create date range for current month in local timezone
        const firstDayOfMonth = new Date(
          currentYear,
          currentMonth,
          1,
          0,
          0,
          0,
          0,
        );
        const lastDayOfMonth = new Date(
          currentYear,
          currentMonth + 1,
          0,
          23,
          59,
          59,
          999,
        );

        // Convert to ISO strings for database query
        const startDate = firstDayOfMonth.toISOString();
        const endDate = lastDayOfMonth.toISOString();

        console.log("🔍 Counting reports for current month:", {
          month: currentMonth + 1,
          year: currentYear,
          startDate,
          endDate,
          localStart: firstDayOfMonth.toLocaleString(),
          localEnd: lastDayOfMonth.toLocaleString(),
        });

        let totalReportsCount = 0;

        // First, try to get reports from database
        try {
          const { data: dbReports, error: reportsError } = await supabase
            .from("reports")
            .select("id, name, generated_at, type")
            .gte("generated_at", startDate)
            .lte("generated_at", endDate)
            .order("generated_at", { ascending: false });

          if (!reportsError && dbReports) {
            totalReportsCount += dbReports.length;
            console.log("📊 Database reports found:", {
              count: dbReports.length,
              reports: dbReports.map((r) => ({
                name: r.name,
                type: r.type,
                generated_at: r.generated_at,
                local_date: new Date(r.generated_at).toLocaleString(),
              })),
            });
          } else {
            console.log("❌ Database error or no reports:", reportsError);
          }
        } catch (dbError) {
          console.error("❌ Database connection error:", dbError);
        }

        // Also check localStorage for reports
        try {
          const localReports = JSON.parse(
            localStorage.getItem("ngo_reports") || "[]",
          );
          if (localReports.length > 0) {
            // Filter local reports for current month
            const currentMonthLocalReports = localReports.filter(
              (report: any) => {
                const reportDate = new Date(report.generated_at);
                return (
                  reportDate >= firstDayOfMonth && reportDate <= lastDayOfMonth
                );
              },
            );
            totalReportsCount += currentMonthLocalReports.length;
            console.log("📊 Local storage reports found:", {
              total: localReports.length,
              currentMonth: currentMonthLocalReports.length,
              reports: currentMonthLocalReports.map((r: any) => ({
                name: r.name,
                type: r.type,
                generated_at: r.generated_at,
              })),
            });
          }
        } catch (localError) {
          console.error("❌ Error reading from localStorage:", localError);
        }

        console.log("📈 Final report count:", totalReportsCount);
        setReportsCount(totalReportsCount);

        // If no reports found, check if reports table exists at all
        if (totalReportsCount === 0) {
          console.log(
            "⚠️ No reports found for current month. Checking table accessibility...",
          );

          try {
            // Test if we can access the reports table at all
            const { data: testData, error: testError } = await supabase
              .from("reports")
              .select("id")
              .limit(1);

            if (testError) {
              console.error("❌ Reports table not accessible:", testError);
              // If table doesn't exist, show a small count from localStorage
              const allLocalReports = JSON.parse(
                localStorage.getItem("ngo_reports") || "[]",
              );
              if (allLocalReports.length > 0) {
                setReportsCount(allLocalReports.length);
                console.log(
                  "📊 Using total localStorage reports count:",
                  allLocalReports.length,
                );
              }
            } else {
              console.log(
                "✅ Reports table is accessible, but no reports found for current month",
              );

              // Get total count from database
              const { data: allDbReports, error: allError } = await supabase
                .from("reports")
                .select("id")
                .limit(100);

              if (!allError && allDbReports) {
                console.log(
                  "📈 Total reports in database:",
                  allDbReports.length,
                );
                if (allDbReports.length > 0) {
                  setReportsCount(allDbReports.length);
                }
              }
            }
          } catch (testError) {
            console.error("❌ Error testing reports table:", testError);
          }
        }
      } catch (error) {
        console.error("❌ Error counting reports:", error);
        // Fallback to localStorage count
        try {
          const fallbackReports = JSON.parse(
            localStorage.getItem("ngo_reports") || "[]",
          );
          setReportsCount(fallbackReports.length);
          console.log(
            "📊 Using fallback localStorage count:",
            fallbackReports.length,
          );
        } catch (fallbackError) {
          console.error("❌ Fallback also failed:", fallbackError);
          setReportsCount(0);
        }
      } finally {
        setLoading(false);
      }
    };

    countReports();

    // Listen for custom events when reports are generated
    const handleReportGenerated = () => {
      console.log("📢 Report generated event received, recounting...");
      setTimeout(countReports, 1000); // Increased delay to ensure database is updated
    };

    window.addEventListener("reportGenerated", handleReportGenerated);

    // Also listen for storage events in case reports are added via localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "ngo_reports") {
        console.log("📢 Storage change detected for reports, recounting...");
        setTimeout(countReports, 500);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("reportGenerated", handleReportGenerated);
      window.removeEventListener("storage", handleStorageChange);
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
