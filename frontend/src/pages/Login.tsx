import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { registerApi } from "@/api/resumeiq";
import altzorLogo from "@/assets/altzor-Logo.png";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hr");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await registerApi({ name, email, password, role });
        toast.success("Account created! Please sign in.");
        setIsSignUp(false);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error("Auth action failed:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "An error occurred. Please try again.";
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
          <div className="flex items-center gap-4 mb-8">
            <img
              src={altzorLogo}
              alt="Altzor Logo"
              className="w-44 h-auto object-contain drop-shadow-2xl"
            />
          </div>

          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-bold text-white leading-tight mb-6"
          >
            Unified Recruitment<br />Intelligence
          </motion.h1>

          <p className="text-white/70 text-lg max-w-md leading-relaxed">
            One platform for HR teams and Vendors to collaborate, parse resumes, and hire faster.
          </p>

        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Decorative background for mobile */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? "Join the enterprise hiring platform" : "Sign in to manage your pipeline"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold text-center"
              >
                {error}
              </motion.div>
            )}

            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                <div>
                  <label className="label-text mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required={isSignUp}
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="label-text mb-1.5 block">I am joining as</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("hr")}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${role === "hr" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/30"}`}
                    >
                      HR Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("vendor")}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${role === "vendor" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/30"}`}
                    >
                      Vendor
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div>
              <label className="label-text mb-1.5 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-text">Password</label>
                {!isSignUp && (
                  <Link
                    to="/forgot-password"
                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                  >
                    Forgot?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm pr-12"
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
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-[0.2em] hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? (
                <>Already have an account? <span className="text-primary font-bold">Sign In</span></>
              ) : (
                <>New to the platform? <span className="text-primary font-bold">Create Account</span></>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;