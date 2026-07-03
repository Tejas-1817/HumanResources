import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserCheck,
  Building2,
  Briefcase,
  Search,
  ChevronLeft,
  Calendar,
  ExternalLink,
  Clock,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useQuery } from "@tanstack/react-query";
import {
  getVendorPipeline,
  getVendorJobs,
} from "@/api/resumeiq";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const VendorSelectedCandidates = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // ── Data queries ──────────────────────────────────────
  const { data: pipeline = {}, isLoading: pipelineLoading } = useQuery({
    queryKey: ["vendor-pipeline"],
    queryFn: getVendorPipeline
  });

  const { data: jobRoles = [] } = useQuery({
    queryKey: ["vendor-jobs"],
    queryFn: getVendorJobs
  });

  const roleById = useMemo(() => new Map(jobRoles.map((r: any) => [r.id, r])), [jobRoles]);

  const selectedCandidates = useMemo(() => {
    const list = (pipeline["selected"] || []).map((app: any) => {
      const role = roleById.get(app.job_role_id);
      return {
        id: app.id,
        candidate_id: app.candidate_id,
        name: app.candidate_name || `Candidate #${app.candidate_id}`,
        roleTitle: role?.title || "Unknown Role",
        companyName: role?.company_name || "Unknown Company",
        date: app.status_date || app.created_at,
        email: app.candidate_email,
        phone: app.candidate_phone,
        experience: app.experience_years,
        technology: role?.title || "N/A",
        duration: role?.project_time_period || "N/A",
        cost: role?.estimated_budget ? `${role.currency || '$'} ${role.estimated_budget.toLocaleString()}` : "N/A"
      };
    });

    if (!searchQuery.trim()) return list;
    const lower = searchQuery.toLowerCase();
    return list.filter((c: any) =>
      c.name.toLowerCase().includes(lower) ||
      c.companyName.toLowerCase().includes(lower) ||
      c.roleTitle.toLowerCase().includes(lower)
    );
  }, [pipeline, roleById, searchQuery]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate("/vendor")}
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-all text-muted-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title="Successful Hires"
          description="Candidates you've submitted that were successfully selected"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative group w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search your hires..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                />
              </div>
            </div>
          }
        />
      </div>

      <div className="space-y-4">
        {/* Desktop View (Table) */}
        <div className="hidden md:block glass-card overflow-hidden">
          <div className="p-3 border-b border-border/50 bg-secondary/20">
            <div className="grid grid-cols-12 gap-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="col-span-4">Candidate</div>
              <div className="col-span-3">Company</div>
              <div className="col-span-3">Job Role</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {pipelineLoading ? (
               <div className="p-12 text-center animate-pulse text-sm text-muted-foreground">Synchronizing selections...</div>
            ) : selectedCandidates.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-4">
                  <UserCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">No successful hires yet</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? `No results match "${searchQuery}"` : "Keep submitting talent! Your successful placements will appear here."}
                </p>
              </div>
            ) : (
              selectedCandidates.map((cand: any) => (
                <motion.div
                  key={cand.id}
                  variants={item}
                  onClick={() => navigate(`/vendor/candidates/${cand.candidate_id}`)}
                  className="grid grid-cols-12 gap-3 py-3 px-6 items-center hover:bg-secondary/30 transition-colors group cursor-pointer"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs shadow-sm ring-1 ring-emerald-500/20">
                      {cand.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {cand.name}
                      </p>
                      <div className="flex flex-col">
                        <p className="text-[11px] text-muted-foreground">{cand.email}</p>
                        {cand.phone && <p className="text-[11px] text-primary/80 font-medium">{cand.phone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-primary opacity-60" />
                      <span className="text-xs font-bold text-foreground truncate">{cand.companyName}</span>
                    </div>
                  </div>

                  <div className="col-span-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-primary opacity-60" />
                      <span className="text-xs font-bold text-foreground truncate">{cand.roleTitle}</span>
                    </div>
                  </div>

                  <div className="col-span-2 text-right">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5 ml-auto"
                    >
                      <Eye className="w-3 h-3" />
                      View Profile
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
           {selectedCandidates.map((cand: any) => (
              <div 
                key={cand.id}
                onClick={() => navigate(`/vendor/candidates/${cand.candidate_id}`)}
                className="glass-card p-4 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                   <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
                      {cand.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                   </div>
                   <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{cand.name}</p>
                      <div className="flex flex-col">
                        <p className="text-[10px] text-muted-foreground truncate">{cand.roleTitle}</p>
                        {cand.phone && <p className="text-[10px] text-primary/80 font-medium truncate">{cand.phone}</p>}
                      </div>
                   </div>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">{cand.companyName}</span>
                   <span className="text-[10px] font-bold text-emerald-500">SELECTED</span>
                </div>
              </div>
           ))}
        </div>
      </div>
    </motion.div>
  );
};

export default VendorSelectedCandidates;
