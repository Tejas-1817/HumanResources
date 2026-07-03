import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  Search,
  ExternalLink,
  Users,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddOpenPositionModal } from "@/components/modals/AddOpenPositionModal";
import { useQuery } from "@tanstack/react-query";
import {
  getCompanies,
  getJobRoles,
  getPipeline,
} from "@/api/resumeiq";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const OpenPositions = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Data queries ──────────────────────────────────────
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies()
  });
  const { data: jobRoles = [] } = useQuery({ queryKey: ["job-roles"], queryFn: () => getJobRoles() });
  const { data: pipeline = {} as any } = useQuery({ queryKey: ["pipeline"], queryFn: () => getPipeline() });

  const companyWithRoles = useMemo(() => {
    const map = new Map<number, { id: number; name: string; roles: any[]; totalApps: number }>();

    // Initialize map with companies
    companies.forEach(c => {
      map.set(c.id, { id: c.id, name: c.name, roles: [], totalApps: 0 });
    });

    // Add open roles to companies
    (jobRoles as any[]).forEach(role => {
      if (role.status === "open") {
        const entry = map.get(role.company_id);
        if (entry) {
          entry.roles.push(role);
        }
      }
    });

    // Count applications in pipeline for these roles
    Object.values(pipeline).flat().forEach((app: any) => {
      const role = (jobRoles as any[]).find(r => r.id === app.job_role_id);
      if (role && role.status === "open") {
        const entry = map.get(role.company_id);
        if (entry) {
          entry.totalApps++;
        }
      }
    });

    // Filter to only companies with open roles
    const list = Array.from(map.values()).filter(c => c.roles.length > 0);

    if (!searchQuery.trim()) return list;
    const lower = searchQuery.toLowerCase();
    return list.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.roles.some(r => r.title.toLowerCase().includes(lower))
    );
  }, [companies, jobRoles, pipeline, searchQuery]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Clients"
          description="Listing all partner companies with strategic positions currently open"
          actions={
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search companies or roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                />
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Open Position
              </button>
            </div>
          }
        />
      </div>

      {companyWithRoles.length === 0 ? (
        <div className="p-20 text-center glass-card">
          <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-6">
            <Briefcase className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No open positions found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `No results match "${searchQuery}". Try a different search term.`
              : "There are currently no active job roles across all companies."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile View (Cards) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {companyWithRoles.map((company) => (
              <motion.div
                key={company.id}
                variants={item}
                onClick={() => navigate(`/companies?id=${company.id}`)}
                className="glass-card p-5 rounded-xl border border-border/50 relative overflow-hidden group active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{company.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                          {company.roles.length} Open {company.roles.length === 1 ? 'Position' : 'Positions'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-40" />
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Featured Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {company.roles.slice(0, 3).map(role => (
                      <span
                        key={role.id}
                        className="px-2 py-1 rounded bg-secondary text-[10px] font-bold border border-border"
                      >
                        {role.title}
                      </span>
                    ))}
                    {company.roles.length > 3 && (
                      <span className="text-[9px] text-muted-foreground font-bold px-1">+{company.roles.length - 3}</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-success text-[11px] font-bold">
                    <Users className="w-3.5 h-3.5" />
                    {company.totalApps} Applicants
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium italic">Tap to view hub</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop View (Traditional Row) */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-secondary/20">
              <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="col-span-4">Partner Company</div>
                <div className="col-span-5">Active Positions</div>
                <div className="col-span-2 text-center">Pipeline</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {companyWithRoles.map((company) => (
                <motion.div
                  key={company.id}
                  variants={item}
                  className="grid grid-cols-12 gap-4 p-4 px-8 items-center hover:bg-primary/[0.02] transition-colors group cursor-pointer"
                  onClick={() => navigate(`/companies?id=${company.id}`)}
                >
                  {/* Company Info */}
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/20 group-hover:scale-110 transition-transform shadow-sm">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {company.name} ({company.roles.length})
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
                        Active {company.roles.length === 1 ? 'Role' : 'Roles'}
                      </p>
                    </div>
                  </div>

                  {/* Active Positions List */}
                  <div className="col-span-5 flex flex-wrap gap-2">
                    {company.roles.slice(0, 3).map(role => (
                      <div
                        key={role.id}
                        onClick={(e) => { e.stopPropagation(); navigate(`/job-roles/${role.id}`); }}
                        className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-primary/[0.02] transition-all cursor-pointer group/role"
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3 h-3 text-primary/60 group-hover/role:text-primary transition-colors" />
                          <span className="text-[11px] font-bold text-foreground group-hover/role:text-primary transition-colors">{role.title}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {role.location && <span className="text-[9px] text-muted-foreground/70">📍 {role.location}</span>}
                          {role.work_mode && <span className="text-[9px] text-muted-foreground/70 capitalize">• {role.work_mode}</span>}
                          {role.experience_required != null && <span className="text-[9px] text-muted-foreground/70">• {role.experience_required}y Exp</span>}
                          {role.project_time_period && <span className="text-[9px] text-primary/60 font-bold">• {role.project_time_period}</span>}
                        </div>
                      </div>
                    ))}
                    {company.roles.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-bold flex items-center px-2">
                        + {company.roles.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Pipeline Stats */}
                  <div className="col-span-2 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-[11px] font-bold ring-1 ring-success/20">
                      <Users className="w-3.5 h-3.5 opacity-70" />
                      {company.totalApps} Candidates
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 text-right">
                    <button
                      className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all group/btn"
                      title="View Detailed Hub"
                    >
                      <ExternalLink className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AddOpenPositionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
};

export default OpenPositions;
