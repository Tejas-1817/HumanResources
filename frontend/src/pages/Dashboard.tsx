import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  Building2,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Layers,
  UserCheck,
  UserX,
  AlertCircle,
  Search,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboardStats,
  getCompanies,
  getJobRoles,
  getPipeline,
  getCandidates,
} from "@/api/resumeiq";
import { InterviewCalendar } from "@/components/dashboard/InterviewCalendar";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

const PIPELINE_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  shortlisted: "#6366f1",
  interview_scheduled: "#f59e0b",
  interviewed: "#f97316",
  on_hold: "#fb923c",
  rejected: "#ef4444",
  selected: "#10b981",
};

const Dashboard = () => {
  const navigate = useNavigate();

  // ── Data queries ──────────────────────────────────────
  const { data: statsData } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });
  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: () => getCompanies() });
  const { data: jobRolesData } = useQuery({ queryKey: ["job-roles"], queryFn: () => getJobRoles() });

  const data = statsData;
  const companies = companiesData ?? [];
  const jobRoles = jobRolesData ?? [];
  const { data: pipeline = {} } = useQuery({ queryKey: ["pipeline"], queryFn: () => getPipeline() });

  // ── Candidate Search ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["candidate-search", debouncedQuery],
    queryFn: () => getCandidates({ search: debouncedQuery, page_size: 5 }),
    enabled: debouncedQuery.length >= 2,
  });



  // ── Derived stats ─────────────────────────────────────
  const totalPipeline = useMemo(
    () => Object.values(pipeline).reduce((sum, apps) => sum + apps.length, 0),
    [pipeline]
  );
  const selectedCount = data?.pipeline_summary?.selected ?? 0;
  const interviewCount = (data?.pipeline_summary?.interview_scheduled ?? 0) + (data?.pipeline_summary?.interviewed ?? 0);

  const funnelData = useMemo(
    () => [
      { name: "Applied", value: totalPipeline },
      { name: "Shortlisted", value: data?.pipeline_summary?.shortlisted ?? 0 },
      { name: "Interview", value: interviewCount },
      { name: "Selected", value: selectedCount },
    ],
    [totalPipeline, data, interviewCount, selectedCount]
  );




  // Companies with role / pipeline breakdown
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const roleById = useMemo(() => new Map(jobRoles.map((r) => [r.id, r])), [jobRoles]);

  const companyBreakdown = useMemo(() => {
    const map = new Map<number, { id: number, name: string; totalRoles: number; openRoles: number; pipelineCount: number; selectedCount: number }>();
    for (const c of companies) {
      map.set(c.id, { id: c.id, name: c.name, totalRoles: 0, openRoles: 0, pipelineCount: 0, selectedCount: 0 });
    }
    for (const r of jobRoles) {
      const entry = map.get(r.company_id);
      if (entry) {
        entry.totalRoles++;
        if (r.status === "open") entry.openRoles++;
      }
    }
    for (const [status, apps] of Object.entries(pipeline)) {
      for (const app of apps) {
        const role = roleById.get(app.job_role_id);
        if (role) {
          const entry = map.get(role.company_id);
          if (entry) {
            entry.pipelineCount++;
            if (status === "selected") entry.selectedCount++;
          }
        }
      }
    }
    return [...map.values()].sort((a, b) => b.pipelineCount - a.pipelineCount);
  }, [companies, jobRoles, pipeline, roleById]);

  // Recent activity
  const recentActivity = useMemo(
    () =>
      (data?.recent_uploads ?? []).slice(0, 15).map((u) => ({
        candidate_id: u.candidate_id,
        action: "New candidate uploaded",
        name: u.name || u.email || `Candidate #${u.candidate_id}`,
        time: new Date(u.created_at).toLocaleString(),
        status: "Screening",
      })),
    [data]
  );



  const conversionRate = totalPipeline > 0 ? Math.round((selectedCount / totalPipeline) * 100) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Recruitment Command"
          description="Real-time intelligence and pipeline health overview"
          className="mb-1 w-full"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {/* Global Search Bar */}
              <div className="relative group w-full md:w-80">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className={`w-4 h-4 transition-colors ${searchQuery ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <input
                  type="text"
                  placeholder="Search candidates by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 shadow-sm"
                />

                {/* Search Results Dropdown */}
                {showResults && debouncedQuery.length >= 2 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-border bg-secondary/50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Top Matches</span>
                        {isSearching && <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {searchResults?.items.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-xs text-muted-foreground italic">No candidates found for "{debouncedQuery}"</p>
                          </div>
                        ) : (
                          searchResults?.items.map((candidate) => (
                            <button
                              key={candidate.id}
                              onClick={() => { navigate(`/candidates/${candidate.id}`); setShowResults(false); }}
                              className="w-full p-3 flex items-center gap-3 hover:bg-primary/5 transition-colors border-b border-border/50 last:border-0 text-left group/result"
                            >
                              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold text-primary group-hover/result:bg-primary/20 transition-colors">
                                {candidate.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate group-hover/result:text-primary transition-colors">{candidate.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                    <Mail className="w-2 h-2" /> {candidate.email || "No email"}
                                  </span>
                                  <span className="text-[9px] text-primary/50 font-bold uppercase tracking-wider">• {candidate.experience_years}y Exp</span>
                                </div>
                              </div>
                              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover/result:opacity-100 transition-opacity" />
                            </button>
                          ))
                        )}
                      </div>
                      {searchResults?.items && searchResults.items.length > 0 && (
                        <button
                          onClick={() => { navigate(`/candidates?search=${debouncedQuery}`); setShowResults(false); }}
                          className="w-full py-2 bg-secondary/50 text-center text-[10px] font-bold text-primary hover:bg-secondary transition-colors"
                        >
                          View all results ({searchResults.total})
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>


            </div>
          }
        />
      </div>

      {/* ─── Row 1: Primary Metrics ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Candidates"
          value={data?.total_candidates ?? 0}
          icon={Users}
          trend="+14%"
          description="Growing talent pool"
          color="primary"
          delay={0.05}
          onClick={() => navigate("/candidates")}
        />
        <StatCard
          label="Open Positions"
          value={data?.total_open_roles ?? 0}
          icon={Briefcase}
          trend="8 Active"
          description="Strategic roles open"
          color="accent"
          delay={0.1}
          onClick={() => navigate("/open-positions")}
        />
        <StatCard
          label="Selected"
          value={selectedCount}
          icon={UserCheck}
          trend={`${conversionRate}% Rate`}
          description="Successful placements"
          color="success"
          delay={0.15}
          onClick={() => navigate("/selected")}
        />
        <StatCard
          label="Replacements"
          value={data?.total_replacements ?? 0}
          icon={UserX}
          trend="Tracking"
          description="Staffing gap recovery"
          color="warning"
          delay={0.2}
          onClick={() => navigate("/replacements")}
        />
      </div>

      {/* ─── Row 2: Funnel Visualization & Company Breakdown ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Funnel */}
        <motion.div variants={item} className="lg:col-span-1 glass-card p-6 border-border/50">
          <h3 className="heading-md mb-6">Recruitment Funnel</h3>
          <div className="space-y-6">
            {funnelData.map((step, i) => {
              const pct = totalPipeline > 0 ? Math.round((step.value / totalPipeline) * 100) : 0;
              const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--success))"];
              return (
                <div key={step.name} className="group cursor-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{step.name}</span>
                    <span className="text-sm font-bold text-foreground">
                      {step.value} <span className="text-[10px] text-muted-foreground font-normal ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border/50 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                      className="h-full rounded-full relative overflow-hidden"
                      style={{ backgroundColor: colors[i] }}
                    >
                      <div className="absolute inset-0 bg-white/10 animate-pulse" />
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Company Activity & Feed */}
        <motion.div variants={item} className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="heading-md">Open Positions</h3>
          </div>

          <div className="space-y-4">
            <h4 className="label-text mb-4 text-primary">Clients</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {jobRoles
                .filter(r => r.status === "open")
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 6)
                .map((r, i) => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/job-roles/${r.id}`)}
                    className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border/50 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform group-hover:border-primary/50">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{r.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold uppercase tracking-wide">
                          <Building2 className="w-2.5 h-2.5" />
                          {r.company_name || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1 text-[9px] text-primary/80 font-bold uppercase tracking-wide">
                          <Users className="w-2.5 h-2.5" /> {r.positions_required} positions
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </motion.div>
      </div>



      {/* ─── Row 4: Interview Calendar ─────── */}
      <motion.div variants={item}>
        <InterviewCalendar />
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
