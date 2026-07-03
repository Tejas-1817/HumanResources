import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserX,
  Building2,
  Briefcase,
  Search,
  ChevronLeft,
  Calendar,
  ExternalLink,
  UserCheck,
  ArrowRight,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useQuery } from "@tanstack/react-query";
import {
  getCompanies,
  getJobRoles,
  getPipeline,
  Application,
} from "@/api/resumeiq";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const Replacements = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // ── Data queries ──────────────────────────────────────
  const { data: companies = [] } = useQuery({ 
    queryKey: ["companies"], 
    queryFn: () => getCompanies() 
  });
  const { data: jobRoles = [] } = useQuery({ 
    queryKey: ["job-roles"], 
    queryFn: () => getJobRoles() 
  });
  const { data: pipeline = {} } = useQuery({ 
    queryKey: ["pipeline"], 
    queryFn: () => getPipeline() 
  });

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const roleById = useMemo(() => new Map(jobRoles.map((r) => [r.id, r])), [jobRoles]);

  const replacementCandidates = useMemo(() => {
    // Flatten all pipeline stages to find applications with is_replacement: true
    const allApps = Object.values(pipeline).flat() as Application[];
    const list = allApps
      .filter(app => app.is_replacement)
      .map(app => {
        const role = roleById.get(app.job_role_id);
        
        // Try to find if "Replaced: [Name]" is in remarks
        let replacedName = "";
        const appWithRemarks = app as any;
        if (appWithRemarks.remarks) {
          const match = appWithRemarks.remarks.match(/replaced[:\s]+([^,\n\.]+)/i);
          if (match) replacedName = match[1].trim();
        }

        return {
          id: app.id,
          candidate_id: app.candidate_id,
          name: app.candidate_name || `Candidate #${app.candidate_id}`,
          roleTitle: role?.title || "Unknown Role",
          companyName: role?.company_name || "Unknown Company",
          date: app.status_date || app.created_at,
          email: app.candidate_email,
          phone: app.candidate_phone,
          replacedName: replacedName,
          status: app.status
        };
      })
      .sort((a, b) => {
        const getWeight = (s: string) => {
          if (s === 'selected') return -1;
          if (s === 'rejected') return 1;
          return 0;
        };
        return getWeight(a.status) - getWeight(b.status);
      });
    
    if (!searchQuery.trim()) return list;
    const lower = searchQuery.toLowerCase();
    return list.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.companyName.toLowerCase().includes(lower) || 
      c.roleTitle.toLowerCase().includes(lower) ||
      c.replacedName.toLowerCase().includes(lower)
    );
  }, [pipeline, roleById, searchQuery]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Staffing Replacements"
          description="Candidates hired to fill existing staffing gaps and role vacancies"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative group w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search replacements..."
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
        {/* Mobile View (Cards) */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {replacementCandidates.length === 0 ? (
            <div className="p-12 text-center glass-card">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-4">
                <UserX className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No replacements found</h3>
              <p className="text-sm text-muted-foreground">No candidates have been marked as replacements yet.</p>
            </div>
          ) : (
            replacementCandidates.map((cand) => (
              <motion.div
                key={cand.id}
                variants={item}
                onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                className="glass-card p-4 rounded-xl border border-border/50 relative overflow-hidden group active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning font-bold text-xs ring-1 ring-warning/20">
                      {cand.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{cand.name}</h3>
                      <div className="flex flex-col">
                        <p className="text-[11px] text-muted-foreground">{cand.email}</p>
                        {cand.phone && <p className="text-[11px] text-primary/80 font-medium">{cand.phone}</p>}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-40" />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/50 mb-2.5">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Company</p>
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                      <Building2 className="w-3 h-3 text-primary opacity-60" /> {cand.companyName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Role</p>
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                      <Briefcase className="w-3 h-3 text-primary opacity-60" /> {cand.roleTitle}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border/50">
                   <div className="flex flex-col gap-2">
                    <div className="inline-flex items-center gap-1.5 self-start px-2 py-1 rounded bg-warning/10 text-warning text-[10px] font-bold uppercase tracking-widest border border-warning/20">
                      REPLACEMENT
                    </div>
                    {cand.replacedName && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3" /> replaces <span className="text-foreground font-bold">{cand.replacedName}</span>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block glass-card overflow-hidden">
          <div className="p-3 border-b border-border/50 bg-secondary/20">
            <div className="grid grid-cols-12 gap-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="col-span-4">New Hire</div>
              <div className="col-span-3">Company & Role</div>
              <div className="col-span-3 text-center">Replacement Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {replacementCandidates.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-4">
                  <UserX className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">No replacements found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? `No results match "${searchQuery}"` : "No candidates have been marked as replacements yet."}
                </p>
              </div>
            ) : (
              replacementCandidates.map((cand) => (
                <motion.div
                  key={cand.id}
                  variants={item}
                  onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                  className="grid grid-cols-12 gap-3 py-3 px-6 items-center hover:bg-secondary/30 transition-colors group cursor-pointer"
                >
                  {/* Candidate Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning font-bold text-xs shadow-sm ring-1 ring-warning/20">
                      {cand.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {cand.name}
                      </p>
                      <div className="flex flex-col">
                        <p className="text-[11px] text-muted-foreground truncate">{cand.email}</p>
                        {cand.phone && <p className="text-[11px] text-primary/80 font-medium truncate">{cand.phone}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Company & Role */}
                  <div className="col-span-3 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-primary opacity-60" />
                      <span className="text-xs font-bold text-foreground truncate">{cand.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Briefcase className="w-3 h-3" />
                      <span className="truncate">{cand.roleTitle}</span>
                    </div>
                  </div>

                  {/* Replacement Mapping */}
                  <div className="col-span-3">
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-[10px] font-bold">
                          REPLACEMENT
                        </div>
                        {cand.replacedName && (
                          <p className="mt-1 text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                            <ArrowRight className="w-2.5 h-2.5" /> in place of <span className="text-foreground font-bold">{cand.replacedName}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/candidates/${cand.candidate_id}`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5 ml-auto group/btn"
                    >
                      <Eye className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                      View Profile
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Replacements;
