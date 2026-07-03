import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  X,
  Briefcase,
  Upload,
  Trello,
  Sparkles,
  Settings
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/vendor" },
  { label: "Active Jobs", icon: Briefcase, path: "/vendor/jobs" },
  { label: "On Bench Talent", icon: Sparkles, path: "/vendor/bench" },
  { label: "Pipeline", icon: Trello, path: "/vendor/pipeline" },
  { label: "My Candidates", icon: Users, path: "/vendor/candidates" },
  { label: "Settings", icon: Settings, path: "/vendor/settings" },
];

export const VendorSidebar = ({ onMobileClose }: { onMobileClose?: () => void }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen flex flex-col border-r border-white/10 relative z-20 shrink-0 shadow-2xl"
      style={{ background: 'var(--sidebar-gradient)' }}
    >
      {/* logo */}
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

      {/* nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
              ${isActive
                  ? "bg-white/10 text-white shadow-lg shadow-white/5"
                  : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${isActive
                  ? "text-white"
                  : "text-white/40 group-hover:text-white/80"
                  }`}
              />

              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 overflow-hidden"
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 w-0.5 h-6 bg-white rounded-r"
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          );
        })}
      </nav>


      {/* collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-12 flex items-center justify-center border-t border-white/5 text-white/40 hover:text-white hover:bg-white/5 transition-all"
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
