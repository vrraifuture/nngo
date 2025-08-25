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

        // Query database for reports in current month
        const { data: reports, error: reportsError } = await supabase
          .from("reports")
          .select("id, name, generated_at, type")
          .gte("generated_at", startDate)
          .lte("generated_at", endDate)
          .order("generated_at", { ascending: false });

        if (reportsError) {
          console.error("❌ Database error fetching reports:", reportsError);
          setReportsCount(0);
          return;
        }

        const reportCount = reports?.length || 0;
        setReportsCount(reportCount);

        console.log("📊 Reports found:", {
          count: reportCount,
          reports:
            reports?.map((r) => ({
              name: r.name,
              type: r.type,
              generated_at: r.generated_at,
              local_date: new Date(r.generated_at).toLocaleString(),
            })) || [],
        });

        // Also check if reports table exists and is accessible
        if (reportCount === 0) {
          console.log(
            "⚠️ No reports found for current month. Checking table accessibility...",
          );

          // Test if we can access the reports table at all
          const { data: testData, error: testError } = await supabase
            .from("reports")
            .select("id")
            .limit(1);

          if (testError) {
            console.error("❌ Reports table not accessible:", testError);
          } else {
            console.log(
              "✅ Reports table is accessible, but no reports found for current month",
            );
            console.log("📈 Total reports in database:", testData?.length || 0);
          }
        }
      } catch (error) {
        console.error("❌ Error counting reports:", error);
        setReportsCount(0);
      } finally {
        setLoading(false);
      }
    };

    countReports();

    // Listen for custom events when reports are generated
    const handleReportGenerated = () => {
      console.log("Report generated event, recounting...");
      setTimeout(countReports, 500); // Small delay to ensure database is updated
    };

    window.addEventListener("reportGenerated", handleReportGenerated);

    return () => {
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
