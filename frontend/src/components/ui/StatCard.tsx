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
    whileHover={{ y: -2, scale: 1.01 }}
    onClick={onClick}
    className={`glass-card glass-card-hover py-2.5 px-4 flex flex-col gap-2 border-white/5 relative overflow-hidden group ${onClick ? "cursor-pointer" : ""}`}
  >
    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-2xl -mr-8 -mt-8 rounded-full group-hover:bg-primary/10 transition-colors" />

    <div className="flex items-center justify-between relative z-10">
      <span className="label-text text-[9px]">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorMap[color]}`}>
        <Icon className="w-4 h-4 shadow-sm" />
      </div>
    </div>

    <div className="relative z-10">
      <p className="text-2xl font-bold text-foreground tracking-tighter leading-none">{value}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {trend && (
          <span className={`text-[9px] font-bold px-1 py-0.2 rounded bg-success/10 text-success border border-success/20`}>
            {trend}
          </span>
        )}
        {description && <span className="text-[9px] text-muted-foreground font-medium">{description}</span>}
      </div>
    </div>
  </motion.div>
);
