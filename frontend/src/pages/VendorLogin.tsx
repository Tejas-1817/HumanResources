import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useVendorAuth } from "@/context/AuthContext";

const VendorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { vendorLogin } = useVendorAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await vendorLogin(email, password);
    } catch (err: any) {
      console.error("Vendor login failed:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        (err.message === "Network Error" ? "Connection error - please check if backend is running" : "Invalid vendor credentials. Please try again.");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center px-16 border-r border-white/10 relative overflow-hidden"
        style={{ background: 'var(--sidebar-gradient)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <img
              src="/altzor-Logo.png"
              alt="Altzor Logo"
              className="w-36 h-auto object-contain"
            />
          </div>
          <div className="px-3 py-1 bg-white/10 rounded-full inline-block mb-8">
            <span className="text-[10px] font-bold text-white tracking-widest uppercase">Vendor Portal</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Partner with Altzor Digital Solution
          </h1>

          <p className="text-white/70 text-lg max-w-md leading-relaxed">
            Manage your candidate submissions, track their progress in the hiring pipeline,
            and view assigned job openings in one secure platform.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img
              src="/Altzor-Logo.png"
              alt="Altzor Logo"
              className="w-32 h-auto object-contain mb-2"
            />
            <div className="px-3 py-1 bg-primary/10 rounded-full">
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Vendor Portal</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Vendor Sign in
          </h2>
          <p className="text-muted-foreground mb-8 text-sm">
            Access your recruitment partner dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="label-text mb-2 block font-medium">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendor@company.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm mb-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-text font-medium">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                >
                  Forgot?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:translate-y-[-1px] active:translate-y-0 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Access Portal"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Are you an HR user? <Link to="/login" className="text-primary font-bold hover:underline">Sign in here</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorLogin;
