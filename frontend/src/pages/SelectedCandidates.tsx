import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  ListFilter,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableDataCellWithIcon, SourceBadge, formatJobRoleTitle } from "@/components/ui/TableDataCell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCompanies,
  getJobRoles,
  getPipeline,
  updatePipelineStatus,
  Application,
} from "@/api/resumeiq";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const SelectedCandidates = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "company" | "technology">("name");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [revealedCosts, setRevealedCosts] = useState<Record<number, boolean>>({});
  const [dropApp, setDropApp] = useState<{ id: number; candidateName: string } | null>(null);
  const [dropping, setDropping] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const handleConfirmDrop = async () => {
    if (!dropApp) return;
    setDropping(true);
    try {
      await updatePipelineStatus(dropApp.id, "dropped");
      toast.success(`${dropApp.candidateName} has been dropped from position`);
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      setDropApp(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to drop candidate");
    } finally {
      setDropping(false);
    }
  };

  // Close sorting dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const selectedCandidates = useMemo(() => {
    const list = (pipeline["selected"] || []).map((app: Application) => {
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
        cost: role?.estimated_budget ? `${role.currency || '$'} ${role.estimated_budget.toLocaleString()}` : "N/A",
        source: app.source_label || (app.source ? app.source.charAt(0).toUpperCase() + app.source.slice(1) : "Direct")
      };
    });

    // Sorting logic
    list.sort((a, b) => {
      if (sortBy === "company") return a.companyName.localeCompare(b.companyName);
      if (sortBy === "technology") return a.technology.localeCompare(b.technology);
      return a.name.localeCompare(b.name);
    });

    if (!searchQuery.trim()) return list;
    const lower = searchQuery.toLowerCase();
    return list.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.companyName.toLowerCase().includes(lower) ||
      c.technology.toLowerCase().includes(lower)
    );
  }, [pipeline, roleById, searchQuery, sortBy]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Successful Hires"
          description="A comprehensive list of candidates successfully selected across all clients"
          actions={
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary/80 transition-all shadow-sm group"
                >
                  <ListFilter className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap border-r border-border/50 pr-2 mr-1">Sort By</span>
                  <span className="text-xs font-bold text-foreground capitalize mr-1">{sortBy}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isSortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 backdrop-blur-md bg-card/95"
                    >
                      {[
                        { id: "name", label: "Candidate Name" },
                        { id: "company", label: "Company Name" },
                        { id: "technology", label: "Job Role" }
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortBy(option.id as any);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${sortBy === option.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}
                        >
                          {option.label}
                          {sortBy === option.id && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-xs font-bold text-primary">{selectedCandidates.length}</span>
                <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Total</span>
              </div>
              <div className="relative group w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search hires..."
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
          {selectedCandidates.length === 0 ? (
            <div className="p-12 text-center glass-card">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-4">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No selections found</h3>
              <p className="text-sm text-muted-foreground">You haven't marked any candidates as selected yet.</p>
            </div>
          ) : (
            selectedCandidates.map((cand) => (
              <motion.div
                key={cand.id}
                variants={item}
                onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                className="glass-card p-4 rounded-xl border border-border/50 relative overflow-hidden group active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success font-bold text-xs ring-1 ring-success/20">
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
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropApp({ id: cand.id, candidateName: cand.name });
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors z-10"
                      title="Drop Candidate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-40 shrink-0" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border/50 mb-2.5">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Client</p>
                    <TableDataCellWithIcon
                      icon={<Building2 className="w-3.5 h-3.5 text-primary opacity-60" />}
                      text={cand.companyName}
                      textClassName="text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Job Role</p>
                    <TableDataCellWithIcon
                      icon={<Briefcase className="w-3.5 h-3.5 text-primary opacity-60" />}
                      text={cand.technology}
                      textClassName="text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border/50">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Duration</p>
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary opacity-60 shrink-0" /> {cand.duration}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Source</p>
                    <div className="text-xs font-bold text-foreground cell-text-wrap">
                      {cand.source}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block glass-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-left border-collapse table-responsive-fit">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left w-[23%]">Candidate</th>
                  <th className="py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left w-[19%]">Client</th>
                  <th className="py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left w-[25%]">Job Role</th>
                  <th className="py-3.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center w-[11%]">Duration</th>
                  <th className="py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left w-[14%]">Source</th>
                  <th className="py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center w-[8%]">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/50">
                {selectedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-4">
                        <UserCheck className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1">No selections found</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? `No results match "${searchQuery}"` : "You haven't marked any candidates as selected yet."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  selectedCandidates.map((cand) => (
                    <tr
                      key={cand.id}
                      onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                      className="hover:bg-primary/[0.02] transition-colors group cursor-pointer"
                    >
                      {/* Candidate */}
                      <td className="py-3 px-3 align-middle text-left">
                        <div className="flex items-center gap-2.5 min-w-0 max-w-full">
                          <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center text-success font-bold text-xs shadow-sm ring-1 ring-success/20 shrink-0">
                            {cand.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-tight cell-text-wrap"
                            >
                              {cand.name}
                            </p>
                            <div className="flex flex-col mt-0.5">
                              <p className="text-[10px] text-muted-foreground truncate">{cand.email}</p>
                              {cand.phone && <p className="text-[10px] text-primary/80 font-medium truncate">{cand.phone}</p>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3 px-3 align-middle text-left">
                        <div className="flex items-start gap-1.5 min-w-0 max-w-full">
                          <Building2 className="w-3.5 h-3.5 text-primary opacity-60 shrink-0 mt-0.5" />
                          <span
                            className="text-xs font-bold text-foreground leading-snug cell-text-wrap"
                            title={cand.companyName}
                          >
                            {cand.companyName}
                          </span>
                        </div>
                      </td>

                      {/* Job Role */}
                      <td className="py-3 px-3 align-middle text-left">
                        <div className="flex items-start gap-1.5 min-w-0 max-w-full">
                          <Briefcase className="w-3.5 h-3.5 text-primary opacity-60 shrink-0 mt-0.5" />
                          <span
                            className="text-xs font-bold text-foreground leading-snug cell-text-wrap"
                            title={cand.technology}
                          >
                            {formatJobRoleTitle(cand.technology)}
                          </span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-2 align-middle text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/50 text-foreground text-[10px] font-bold border border-border/50 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-primary shrink-0" />
                          {cand.duration}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-3 align-middle text-left">
                        <div
                          className="inline-flex items-start gap-1.5 px-2 py-0.5 rounded-lg bg-secondary/50 border border-border text-[11px] font-semibold text-muted-foreground text-left max-w-full cell-text-wrap leading-tight"
                          title={cand.source}
                        >
                          <Building2 className="w-3 h-3 shrink-0 mt-0.5 opacity-60" />
                          <span className="cell-text-wrap">
                            {cand.source}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/candidates/${cand.candidate_id}`);
                            }}
                            className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all inline-flex items-center justify-center shadow-xs group/btn cursor-pointer"
                            title="View"
                            aria-label="View"
                          >
                            <Eye className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropApp({ id: cand.id, candidateName: cand.name });
                            }}
                            className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-xs inline-flex items-center justify-center cursor-pointer"
                            title="Drop Candidate"
                            aria-label="Drop Candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drop Confirmation Modal */}
      <Modal
        open={!!dropApp}
        onClose={() => setDropApp(null)}
        title="Confirm Drop Candidate"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to drop <strong className="text-foreground">{dropApp?.candidateName}</strong>? 
            This candidate will be flagged as dropped and will be moved to the dropped column/stage across the pipeline.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              onClick={() => setDropApp(null)}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              disabled={dropping}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDrop}
              className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-destructive/15 flex items-center gap-1.5"
              disabled={dropping}
            >
              {dropping ? "Dropping..." : "Yes, Drop Candidate"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default SelectedCandidates;
