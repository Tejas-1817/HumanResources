import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  description?: string;
  color?: "primary" | "accent" | "success" | "warning";
  delay?: number;
  onClick?: () => void;
}

const colorMap = {
  primary: "bg-primary/10 text-primary border-primary/20 glow-primary",
  accent: "bg-accent/10 text-accent border-accent/20 glow-accent",
  success: "bg-success/10 text-success border-success/20 glow-success",
  warning: "bg-warning/10 text-warning border-warning/20 glow-warning",
};

export const StatCard = ({ label, value, icon: Icon, trend, description, color = "primary", delay = 0, onClick }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -4, scale: 1.02 }}
    onClick={onClick}
    className={`glass-card glass-card-hover p-6 flex flex-col gap-5 border-white/5 relative overflow-hidden group ${onClick ? "cursor-pointer" : ""}`}
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-10 -mt-10 rounded-full group-hover:bg-primary/10 transition-colors" />

    <div className="flex items-center justify-between relative z-10">
      <span className="label-text">{label}</span>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
        <Icon className="w-5 h-5 shadow-sm" />
      </div>
    </div>

    <div className="relative z-10">
      <p className="text-3xl font-bold text-foreground tracking-tighter mb-1">{value}</p>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20`}>
            {trend}
          </span>
        )}
        {description && <span className="text-[10px] text-muted-foreground font-medium">{description}</span>}
      </div>
    </div>
  </motion.div>
);
