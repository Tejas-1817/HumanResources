import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export const getTabKey = (pathname: string, search: string): string => {
  if (pathname === "/vendors") {
    const params = new URLSearchParams(search);
    return params.get("view") === "partners" ? "/vendors?view=partners" : "/vendors";
  }
  if (pathname === "/candidates") {
    const params = new URLSearchParams(search);
    const vendorId = params.get("vendor_id");
    return vendorId ? `/candidates?vendor_id=${vendorId}` : "/candidates";
  }
  return pathname;
};

export const getTabTitle = (pathname: string, search: string): string => {
  const params = new URLSearchParams(search);
  const isPartners = params.get("view") === "partners";
  const hasVendorId = params.has("vendor_id");

  // HR Portal Tabs
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
  if (pathname === "/analytics") return "Analytics";
  if (pathname === "/selected") return "Selected";
  if (pathname === "/open-positions") return "Positions";
  if (pathname === "/replacements") return "Replacements";
  if (pathname === "/companies") return "Companies";
  if (pathname === "/archives") return "Archives";
  if (pathname === "/vendors") {
    return isPartners ? "Vendors" : "On Bench Talent";
  }
  if (pathname === "/candidates") {
    return hasVendorId ? "On Bench Talent" : "Total Candidates";
  }
  if (pathname.startsWith("/candidates/")) return "Candidate Details";
  if (pathname.startsWith("/job-roles/")) return "Position Details";

  // Vendor Portal Tabs
  if (pathname === "/vendor") return "Dashboard";
  if (pathname === "/vendor/jobs") return "Active Jobs";
  if (pathname === "/vendor/bench") return "On Bench Talent";
  if (pathname === "/vendor/pipeline") return "Pipeline";
  if (pathname === "/vendor/candidates") return "My Candidates";
  if (pathname === "/vendor/selected") return "Selected";
  if (pathname === "/vendor/upload") return "Upload CV";
  if (pathname === "/vendor/settings") return "Settings";
  if (pathname.startsWith("/vendor/jobs/")) return "Job Details";
  if (pathname.startsWith("/vendor/candidates/")) return "Candidate Details";

  // Interviewer Portal Tabs
  if (pathname === "/interviewer") return "My Schedule";
  if (pathname.startsWith("/interviewer/candidates/")) return "Candidate Details";

  return "Page";
};

interface TabLoadingContainerProps {
  children: React.ReactNode;
}

export const TabLoadingContainer: React.FC<TabLoadingContainerProps> = ({ children }) => {
  const location = useLocation();
  const currentTabKey = getTabKey(location.pathname, location.search);
  const tabTitle = getTabTitle(location.pathname, location.search);

  const [isLoading, setIsLoading] = useState(true);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const lastTabKeyRef = useRef(currentTabKey);

  const isFetching = useIsFetching();

  // Trigger loading state when tabKey changes or on initial mount
  useEffect(() => {
    setIsLoading(true);
    setMinTimePassed(false);
    lastTabKeyRef.current = currentTabKey;

    const minTimer = setTimeout(() => {
      setMinTimePassed(true);
    }, 1000);

    // Safety fallback: ensure loader doesn't hang more than 8 seconds under any circumstance
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(safetyTimer);
    };
  }, [currentTabKey]);

  // Complete loading once both min 1s has elapsed and data queries have settled
  useEffect(() => {
    if (minTimePassed && isFetching === 0) {
      setIsLoading(false);
    }
  }, [minTimePassed, isFetching]);

  return (
    <>
      {isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[55vh] py-16 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            Loading {tabTitle}...
          </span>
        </div>
      )}
      <div style={{ display: isLoading ? "none" : "block" }}>
        {children}
      </div>
    </>
  );
};
