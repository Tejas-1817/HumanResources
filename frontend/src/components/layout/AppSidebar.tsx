import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Internal Hiring", icon: Building, path: "/internal-hiring" },
  { label: "Total Candidates", icon: Users, path: "/candidates" },
  { label: "Open Positions", icon: Briefcase, path: "/open-positions" },
  { label: "Selected", icon: UserCheck, path: "/selected" },
  { label: "Replacements", icon: RefreshCcw, path: "/replacements" },
  { label: "Companies", icon: Building2, path: "/companies" },
  { label: "On Bench Talent", icon: Handshake, path: "/vendors" },
  { label: "Archives", icon: Archive, path: "/archives" },
];

const quickActions = [
  { label: "Add Candidate", icon: UserPlus, actionId: "add-candidate", colorClass: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { label: "Schedule Interview", icon: Calendar, actionId: "schedule-interview", colorClass: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  { label: "Upload CV", icon: FileUp, actionId: "upload-cv", colorClass: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  { label: "Create Job Post", icon: PlusCircle, actionId: "create-job-post", colorClass: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { label: "Add Company", icon: Building, actionId: "add-company", colorClass: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
];

export const AppSidebar = ({ onMobileClose, onQuickAction }: { onMobileClose?: () => void; onQuickAction?: (actionId: string) => void }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen flex flex-col border-r border-white/10 relative z-20 shrink-0 shadow-2xl"
      style={{ background: 'var(--sidebar-gradient)' }}
    >
      {/* ✅ Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3 justify-between">
        <div className={`flex items-center gap-3 flex-1 overflow-hidden transition-all duration-200 ${collapsed ? "justify-center" : "pl-8"}`}>
          <img
            src="/altzor-Logo.png"
            alt="Altzor Logo"
            className={`object-contain transition-all duration-200 ${collapsed ? "w-10" : "w-28"
              }`}
          />
        </div>
        {!collapsed && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-2 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const queryParams = new URLSearchParams(location.search);
          const isVendorCandidates = location.pathname === "/candidates" && queryParams.has("vendor_id");
          
          let isActive = false;
          if (item.path === "/vendors") {
            isActive = location.pathname === "/vendors" || isVendorCandidates;
          } else if (item.path === "/candidates") {
            isActive = location.pathname === "/candidates" && !isVendorCandidates;
          } else {
            isActive = location.pathname === item.path;
          }

          return (
            <div key={item.label} className="flex flex-col">
              <Link
                to={item.path}
                onClick={() => {
                  if (onMobileClose) {
                    onMobileClose();
                  }
                }}
                className={`relative flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <item.icon
                  className={`w-4 h-4 shrink-0 ${isActive
                    ? "text-white"
                    : "text-white/40"
                    }`}
                />

                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex-1 flex items-center justify-between overflow-hidden"
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isActive && (
                  <div className="absolute left-0 w-1 h-5 bg-white rounded-r" />
                )}
              </Link>
            </div>
          );
        })}

        {/* Divider & Quick Actions Heading */}
        <div className="pt-2.5 pb-1 px-3">
          {!collapsed ? (
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Quick Actions</p>
          ) : (
            <div className="h-[1px] bg-white/10 my-1" />
          )}
        </div>

        {/* Quick Action Buttons */}
        {quickActions.map((action) => (
          <div key={action.actionId} className="flex flex-col">
            <button
              onClick={() => {
                if (onQuickAction) onQuickAction(action.actionId);
                if (onMobileClose) onMobileClose();
              }}
              className="relative flex items-center gap-3 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-150 text-white/60 hover:text-white hover:bg-white/5 group text-left w-full"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-300 ${action.colorClass} group-hover:scale-105 shrink-0`}>
                <action.icon className="w-3.5 h-3.5" />
              </div>

              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 flex items-center justify-between overflow-hidden"
                  >
                    <span className="whitespace-nowrap">{action.label}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        ))}
      </nav>

      {/* Settings button */}
      <button
        onClick={() => {
          if (onQuickAction) onQuickAction("settings");
          if (onMobileClose) onMobileClose();
        }}
        className={`h-10 flex items-center gap-3 border-t border-white/5 text-sm font-medium transition-all duration-150 text-white/60 hover:text-white hover:bg-white/5 group text-left w-full ${
          collapsed ? "justify-center px-3" : "px-6"
        }`}
      >
        <Settings className="w-4 h-4 text-white/40 group-hover:text-white shrink-0" />
        {!collapsed && <span className="whitespace-nowrap">Settings</span>}
      </button>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-white/5 text-white/40 hover:text-white hover:bg-white/5 transition-all"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
};