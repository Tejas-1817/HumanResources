import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2, Copy, Check, ExternalLink, KeyRound } from "lucide-react";
import { forgotPassword } from "@/api/resumeiq";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Build the full clickable URL from the relative path returned by the API
  const fullResetUrl = resetLink
    ? `${window.location.origin}${resetLink}`
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      if (res && res.reset_link) {
        setResetLink(res.reset_link);
      }
      if (res && res.email_sent) {
        setEmailSent(true);
      }
      setSuccess(true);
    } catch (err: any) {
      console.error("Forgot password request failed:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Could not send reset instructions. Please check your email and try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullResetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex justify-between items-center text-xs">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group font-bold">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            HR Login
          </Link>
          <Link to="/vendor/login" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group font-bold">
            Vendor Login
            <ArrowLeft className="w-3.5 h-3.5 rotate-180 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {success ? (
          <div className="glass-card p-8 text-center space-y-5">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            {/* Heading — different based on whether link is shown or email was sent */}
            {emailSent ? (
              <>
                <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We've sent password reset instructions to{" "}
                  <span className="font-bold text-foreground">{email}</span>.
                </p>
                {resetLink && (
                  <p className="text-muted-foreground text-[11px] font-medium pt-1.5">
                    (Local development helper link is generated below)
                  </p>
                )}
              </>
            ) : resetLink ? (
              <>
                <h2 className="text-2xl font-bold text-foreground">Reset Link Ready</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  No email server is configured on this device. Use the link below to reset the password for{" "}
                  <span className="font-bold text-foreground">{email}</span>.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We've sent password reset instructions to{" "}
                  <span className="font-bold text-foreground">{email}</span>.
                </p>
              </>
            )}

            {/* Reset link block — shown prominently when no email is sent */}
            {resetLink && fullResetUrl && (
              <div className="text-left space-y-3">
                {/* Copy + URL row */}
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 px-3 py-3 rounded-lg bg-secondary border border-border text-foreground text-xs font-mono break-all select-all leading-relaxed">
                    {fullResetUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`shrink-0 px-3 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border ${
                      copied
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                        : "bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground hover:border-transparent"
                    }`}
                    title="Copy reset link"
                  >
                    {copied ? (
                      <><Check className="w-4 h-4" /><span className="text-xs">Copied!</span></>
                    ) : (
                      <><Copy className="w-4 h-4" /><span className="text-xs">Copy</span></>
                    )}
                  </button>
                </div>

                {/* Big prominent "Reset Password" button */}
                <button
                  onClick={() => navigate(resetLink)}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                >
                  <KeyRound className="w-4 h-4" />
                  Click Here to Reset Password
                </button>

                {/* Open in new tab */}
                <a
                  href={fullResetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Or open in new tab
                </a>
              </div>
            )}

            {/* Return to login — only shown when email was sent (no link needed) */}
            {(!resetLink || emailSent) && (
              <div className="space-y-2 pt-2">
                <Link
                  to="/login"
                  className="inline-block w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all text-center"
                >
                  Return to HR Login
                </Link>
                <Link
                  to="/vendor/login"
                  className="inline-block w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/90 transition-all border border-border text-center"
                >
                  Return to Vendor Login
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-10 border border-white/5">
            <h2 className="text-2xl font-bold text-foreground mb-2">Forgot Password?</h2>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              No worries! Enter your email address and we'll send you instructions to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                <label className="label-text mb-2 block">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full px-4 py-3 pl-11 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating link...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
