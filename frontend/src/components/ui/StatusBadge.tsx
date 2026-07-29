// Lowercased keys for direct lookup via status.toLowerCase()
const statusStyles: Record<string, string> = {
  // Job role statuses
  open: "bg-success/10 text-success border-success/20",
  closed: "bg-red-500/10 text-red-600 border-red-500/20",

  // Generic candidate statuses
  active: "bg-success/10 text-success border-success/20",
  hired: "bg-success/10 text-success border-success/20",
  screening: "bg-primary/10 text-primary border-primary/20",
  review: "bg-warning/10 text-warning border-warning/20",
  new: "bg-accent/10 text-accent border-accent/20",

  // Pipeline statuses (application states)
  pending: "bg-warning/10 text-warning border-warning/20",
  shortlisted: "bg-primary/10 text-primary border-primary/20",
  interview_scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  interviewed: "bg-accent/10 text-accent border-accent/20",
  selected: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  on_hold: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  dropped: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  not_joined: "bg-rose-500/10 text-rose-600 border-rose-500/20",

  // Custom computed statuses
  "in progress": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  in_progress: "bg-orange-500/10 text-orange-600 border-orange-500/20",

  // Fallback
  default: "bg-muted text-muted-foreground border-border",
};

// Human-readable label overrides for underscore-separated statuses
const statusLabels: Record<string, string> = {
  interview_scheduled: "Interview Scheduled",
  on_hold: "On Hold",
  not_joined: "Did Not Join",
  "in progress": "In Progress",
  in_progress: "In Progress",
};

interface StatusBadgeProps {
  status: string;
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusBadge = ({ status, text, size = "md", className = "" }: StatusBadgeProps) => {
  const key = status.toLowerCase();
  const style = statusStyles[key] || statusStyles.default;
  const label = text ?? (statusLabels[key] ?? status);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium border transition-all ${sizeClasses[size]} ${style} ${className}`}>
      {label}
    </span>
  );
};
