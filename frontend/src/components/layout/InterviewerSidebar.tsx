import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { label: "My Schedule", icon: LayoutDashboard, path: "/interviewer" },
];

export const InterviewerSidebar = ({ onMobileClose, onQuickAction }: { onMobileClose?: () => void; onQuickAction?: (actionId: string) => void }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { interviewer } = useAuth();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen flex flex-col border-r border-white/10 relative z-20 shrink-0 shadow-2xl"
      style={{ background: "var(--sidebar-gradient)" }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3 justify-between">
        <div className={`flex items-center gap-3 flex-1 overflow-hidden transition-all duration-200 ${collapsed ? "justify-center" : "pl-2"}`}>
          <img
            src="/altzor-Logo.png"
            alt="Altzor Logo"
            className={`object-contain transition-all duration-200 ${collapsed ? "w-10" : "w-28"}`}
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

      {/* Interviewer info (expanded only) */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 border-b border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {interviewer?.name?.charAt(0).toUpperCase() || "I"}
              </div>
              <div className="min-w-0">
                <p className="text-white text-[13px] font-semibold truncate">{interviewer?.name || "Interviewer"}</p>
                <p className="text-white/40 text-[10px] truncate">Interviewer Portal</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 py-2 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onMobileClose}
              className={`relative flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              <item.icon
                className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-white/40"}`}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <div className="absolute left-0 w-1 h-5 bg-white rounded-r" />
              )}
            </Link>
          );
        })}
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
