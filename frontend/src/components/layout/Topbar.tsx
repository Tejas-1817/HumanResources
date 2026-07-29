import { useState, useEffect } from "react";
import { Bell, ChevronRight, UserMinus, Menu, KeyRound, Lock, Eye, EyeOff, Save, ShieldCheck, ArrowLeft, CheckCheck, Clock, Inbox } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { interviewerChangePassword, getNotifications, markNotificationRead, markAllNotificationsRead, Notification } from "@/api/resumeiq";
import { toast } from "sonner";

const routeLabels: Record<string, string> = {
  "companies": "Companies",
  "job-roles": "Job Role",
  "candidates": "Candidate",
  "upload": "Upload",
  "jobs": "Jobs",
  "pipeline": "Pipeline",
  "selected": "Selected",
  "replacements": "Replacements",
  "open-positions": "Open Positions",
};

export const Topbar = ({
  onMenuClick,
  isVendor = false,
  isInterviewer = false,
  user: userOverride,
  logout: logoutOverride
}: {
  onMenuClick: () => void,
  isVendor?: boolean,
  isInterviewer?: boolean,
  user?: { name: string, email: string; role?: string } | null,
  logout?: () => void
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const hrAuth = useAuth();

  // Only show back button if we are not on one of the root landing pages
  const isRootPath =
    location.pathname === "/" ||
    location.pathname === "/vendor" ||
    location.pathname === "/vendor/" ||
    location.pathname === "/interviewer" ||
    location.pathname === "/interviewer/";
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return "";
    }
  };

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      await interviewerChangePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      });
      toast.success("Password updated successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setChangePasswordOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.detail || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const currentUser = userOverride !== undefined ? userOverride : hrAuth.user;
  const currentLogout = logoutOverride !== undefined ? logoutOverride : hrAuth.logout;

  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split("/").filter((x) => x);

    // Default breadcrumb starting point
    const breadcrumbs = [{
      label: isVendor 
        ? "Vendor" 
        : (location.pathname === "/" && currentUser?.name) 
          ? `Welcome, ${currentUser.name}!` 
          : "Altzör",
      path: isVendor ? "/vendor" : "/",
      isLast: isVendor ? pathnames.length === 1 : pathnames.length === 0
    }];

    // If vendor, the first part is "vendor", so we skip it for deeper labels
    const startIndex = isVendor ? 1 : 0;

    pathnames.slice(startIndex).forEach((name, index) => {
      const path = `/${pathnames.slice(0, index + startIndex + 1).join("/")}`;
      let label = routeLabels[name] || (isNaN(Number(name)) ? name.charAt(0).toUpperCase() + name.slice(1) : null);

      if (name === "vendors") {
        const searchParams = new URLSearchParams(location.search);
        const view = searchParams.get("view");
        if (view === "partners") {
          label = "Vendors";
        } else {
          label = "On Bench Talent";
        }
      }

      if (label) {
        breadcrumbs.push({
          label,
          path,
          isLast: (index + startIndex) === pathnames.length - 1
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="h-16 border-b border-border surface-1 flex items-center justify-between px-4 md:px-6 shrink-0 relative z-50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {!isRootPath && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all flex items-center justify-center shrink-0 border border-border/40 hover:border-border hover:scale-105 active:scale-95"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 text-sm overflow-hidden whitespace-nowrap">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />}
              {crumb.isLast ? (
                <span className="text-foreground font-semibold truncate max-w-[100px] md:max-w-none">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-muted-foreground hover:text-primary transition-colors truncate max-w-[80px] md:max-w-none"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer ${showNotifications ? 'bg-secondary text-foreground' : ''}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                {/* Backdrop to close */}
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowNotifications(false)}
                />

                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-80 md:w-96 glass-card border border-border/50 shadow-2xl p-4 z-[70] overflow-hidden flex flex-col max-h-[480px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="h-px bg-border/50 mb-3" />

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[350px]">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                        <Inbox className="w-8 h-8 opacity-40" />
                        <span className="text-xs">No notifications yet</span>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id);
                          }}
                          className={`p-3 rounded-xl border transition-all text-left flex gap-3 ${
                            notif.is_read
                              ? "bg-secondary/40 border-border/20 text-muted-foreground"
                              : "bg-secondary border-primary/20 text-foreground hover:border-primary/40 cursor-pointer"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-xs font-bold truncate ${notif.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {notif.title}
                              </p>
                              {!notif.is_read && (
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] mt-1 leading-relaxed break-words font-medium">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/75 font-semibold">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(notif.created_at)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer overflow-hidden ring-1 ring-border"
          >
            {currentUser?.name?.charAt(0).toUpperCase() || "U"}
          </button>

          <AnimatePresence>
            {showProfile && (
              <>
                {/* Backdrop to close */}
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowProfile(false)}
                />

                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-64 glass-card border border-border/50 shadow-2xl p-4 z-[70] overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                      {currentUser?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{currentUser?.name || "User"}</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">{currentUser?.email}</p>
                    </div>
                  </div>

                  <div className="h-px bg-border/50 mb-4" />

                  {isInterviewer && (
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        setChangePasswordOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-secondary transition-all font-bold text-xs group mb-1.5"
                    >
                      <KeyRound className="w-4 h-4 transition-transform group-hover:scale-110 text-primary" />
                      Change Password
                    </button>
                  )}

                  <button
                    onClick={() => { setShowProfile(false); currentLogout && currentLogout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all font-bold text-xs group"
                  >
                    <UserMinus className="w-4 h-4 transition-transform group-hover:scale-110" />
                    Sign Out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal
        open={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false);
          setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        }}
        title="Change Password"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showCurrent ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full bg-secondary border border-border/50 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Password</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNew ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full bg-secondary border border-border/50 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full bg-secondary border border-border/50 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Repeat new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setChangePasswordOpen(false);
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              }}
              className="flex-1 py-2.5 bg-secondary rounded-xl text-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordLoading}
              className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {passwordLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
};
