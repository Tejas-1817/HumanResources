import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/api/resumeiq";
import {
  LayoutDashboard,
  Building2,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  Handshake,
  Briefcase,
  UserCheck,
  RefreshCcw,
  Building,
  Archive,
  UserPlus,
  Calendar,
  FileUp,
  PlusCircle,
  Settings,
  BarChart3,
  HelpCircle,
} from "lucide-react";

// Flat list of navigation items as requested, preserving original titles and icons
const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Total Candidates", icon: Users, path: "/candidates" },
  { label: "Positions", icon: Briefcase, path: "/open-positions" },
  { label: "Selected", icon: UserCheck, path: "/selected" },
  { label: "Replacements", icon: RefreshCcw, path: "/replacements" },
  { label: "Companies", icon: Building2, path: "/companies" },
  { label: "On Bench Talent", icon: Handshake, path: "/vendors" },
  { label: "Vendors", icon: Handshake, path: "/vendors?view=partners" },
  { label: "Archives", icon: Archive, path: "/archives" },
];

const quickActions = [
  { label: "Add Candidate", icon: UserPlus, actionId: "add-candidate" },
  { label: "Schedule Interview", icon: Calendar, actionId: "schedule-interview" },
  { label: "Upload CV", icon: FileUp, actionId: "upload-cv" },
  { label: "Create Job Post", icon: PlusCircle, actionId: "create-job-post" },
  { label: "Add Company", icon: Building, actionId: "add-company" },
];

export const AppSidebar = ({ onMobileClose, onQuickAction }: { onMobileClose?: () => void; onQuickAction?: (actionId: string) => void }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  const getBadgeValue = (label: string) => {
    return null;
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen flex flex-col border-r border-slate-900/40 relative z-20 shrink-0 shadow-2xl"
      style={{ background: 'linear-gradient(180deg, #001230 0%, #000c22 100%)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3 justify-between shrink-0 relative">
        <div className={`flex items-center gap-3 flex-1 overflow-hidden transition-all duration-200 ${collapsed ? "justify-center" : "pl-6"}`}>
          <img
            src="/altzor-Logo.png"
            alt="Altzor Logo"
            className={`object-contain transition-all duration-200 ${collapsed ? "w-8" : "w-24"}`}
          />
        </div>

        {/* Collapse toggle on the upper side, floating on the right border */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-[#001230] border border-white/10 text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all absolute top-1/2 -translate-y-1/2 -right-3 z-50 cursor-pointer"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {!collapsed && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-2 px-3.5 space-y-0.5 overflow-y-auto custom-scrollbar">
        {/* Navigation Items */}
        {navItems.map((item) => {
          const queryParams = new URLSearchParams(location.search);
          const viewParam = queryParams.get("view");
          const isVendorCandidates = location.pathname === "/candidates" && queryParams.has("vendor_id");

          let isActive = false;
          if (item.path === "/vendors?view=partners") {
            // Vendors tab: active when on /vendors with view=partners
            isActive = location.pathname === "/vendors" && viewParam === "partners";
          } else if (item.path === "/vendors") {
            // On Bench Talent tab: active when on /vendors WITHOUT view=partners, or vendor candidate drill-down
            isActive = (location.pathname === "/vendors" && viewParam !== "partners") || isVendorCandidates;
          } else if (item.path === "/candidates") {
            isActive = location.pathname === "/candidates" && !isVendorCandidates;
          } else {
            isActive = location.pathname === item.path;
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => {
                if (onMobileClose) {
                  onMobileClose();
                }
              }}
              className={`relative flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 group
              ${isActive
                  ? "bg-blue-600 text-white shadow-[0_4px_10px_rgba(0,85,255,0.2)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
            >
              <item.icon
                className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between flex-1 min-w-0"
                  >
                    <span className="truncate">{item.label}</span>
                    {getBadgeValue(item.label) !== undefined && getBadgeValue(item.label) !== null && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-2 ${isActive ? "bg-white text-blue-600" : "bg-blue-500/20 text-blue-400"
                        }`}>
                        {getBadgeValue(item.label)}
                      </span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Divider & Quick Actions Heading */}
        <div className="pt-2.5 pb-1 px-3">
          {!collapsed ? (
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quick Actions</p>
          ) : (
            <div className="h-[1px] bg-white/5 my-1" />
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="space-y-0.5">
          {quickActions.map((action) => (
            <button
              key={action.actionId}
              onClick={() => {
                if (onQuickAction) onQuickAction(action.actionId);
                if (onMobileClose) onMobileClose();
              }}
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 text-slate-400 hover:text-white hover:bg-white/5 text-left w-full group"
            >
              <action.icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 transition-colors" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="whitespace-nowrap"
                  >
                    {action.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>
      </nav>

      {/* Settings button */}
      <button
        onClick={() => {
          if (onQuickAction) onQuickAction("settings");
          if (onMobileClose) onMobileClose();
        }}
        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 text-slate-400 hover:text-white hover:bg-white/5 group text-left w-[calc(100%-24px)] mx-3 mb-1.5`}
      >
        <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 transition-colors" />
        {!collapsed && <span className="whitespace-nowrap">Settings</span>}
      </button>

      {/* Help & Support button */}
      <button
        onClick={() => {
          if (onMobileClose) onMobileClose();
        }}
        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 text-slate-400 hover:text-white hover:bg-white/5 group text-left w-[calc(100%-24px)] mx-3 mb-4`}
      >
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 transition-colors" />
        {!collapsed && <span className="whitespace-nowrap">Help & Support</span>}
      </button>


    </motion.aside>
  );
};