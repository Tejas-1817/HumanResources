import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Search,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  ListFilter,
  ChevronDown,
  X,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCompanies,
  getJobRoles,
  getPipeline,
  Application,
  deleteApplication,
  bulkDeleteApplications,
} from "@/api/resumeiq";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const Archives = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "selected" | "rejected" | "dropped">("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "company">("date");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Clear selections when filters or searches change
  useEffect(() => {
    setSelectedIds([]);
  }, [searchQuery, statusFilter]);

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

  const roleById = useMemo(() => new Map(jobRoles.map((r) => [r.id, r])), [jobRoles]);

  const archivedCandidates = useMemo(() => {
    const list: any[] = [];
    const stages = ["selected", "rejected", "dropped"];

    stages.forEach((stageId) => {
      const apps = pipeline[stageId] || [];
      apps.forEach((app: Application) => {
        const role = roleById.get(app.job_role_id);
        list.push({
          id: app.id,
          candidate_id: app.candidate_id,
          name: app.candidate_name || `Candidate #${app.candidate_id}`,
          roleTitle: role?.title || "Unknown Role",
          companyName: role?.company_name || "Unknown Company",
          date: app.status_date || app.created_at,
          email: app.candidate_email,
          phone: app.candidate_phone,
          experience: app.experience_years,
          status: stageId, // "selected", "rejected", "dropped"
          remarks: app.remarks || app.note || null,
          source: app.source_label || (app.source ? app.source.charAt(0).toUpperCase() + app.source.slice(1) : "Direct")
        });
      });
    });

    // Filtering logic
    let filtered = list;
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status.toLowerCase() === statusFilter);
    }

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.companyName.toLowerCase().includes(lower) ||
        c.roleTitle.toLowerCase().includes(lower)
      );
    }

    // Sorting logic
    filtered.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "company") return a.companyName.localeCompare(b.companyName);
      return new Date(b.date).getTime() - new Date(a.date).getTime(); // Default: Date descending
    });

    return filtered;
  }, [pipeline, roleById, searchQuery, statusFilter, sortBy]);

  // Selection handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === archivedCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(archivedCandidates.map((c) => c.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Deletion handlers
  const handleSingleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}'s archived application?`)) return;
    setIsDeleting(true);
    try {
      await deleteApplication(id);
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      toast.success("Archived application deleted successfully");
    } catch (err) {
      toast.error("Failed to delete application");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected archived applications?`)) return;
    setIsDeleting(true);
    try {
      await bulkDeleteApplications(selectedIds);
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      setSelectedIds([]);
      toast.success("Selected archived applications deleted successfully");
    } catch (err) {
      toast.error("Failed to delete selected applications");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Archives"
          description="View complete historical records of candidates with selection, rejection, or drop status"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary/80 transition-all shadow-sm group"
                >
                  <ListFilter className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap border-r border-border/50 pr-2 mr-1">Sort By</span>
                  <span className="text-xs font-bold text-foreground capitalize mr-1">
                    {sortBy === "date" ? "Action Date" : sortBy}
                  </span>
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
                        { id: "date", label: "Action Date" },
                        { id: "name", label: "Candidate Name" },
                        { id: "company", label: "Company Name" }
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
                <span className="text-xs font-bold text-primary">{archivedCandidates.length}</span>
                <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Total</span>
              </div>

              <div className="relative group w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search archives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                />
              </div>
            </div>
          }
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border/50 pb-px">
        {([
          { key: "all" as const, label: "All Candidates" },
          { key: "selected" as const, label: "Selected" },
          { key: "rejected" as const, label: "Rejected" },
          { key: "dropped" as const, label: "Dropped" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all -mb-px ${statusFilter === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bulk Action Bar Banner */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-bold text-destructive">
                  {selectedIds.length} candidate{selectedIds.length !== 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearSelection}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-all disabled:opacity-50"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* Mobile View (Cards) */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {archivedCandidates.length === 0 ? (
            <div className="p-12 text-center glass-card">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-4">
                <Archive className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No archived records</h3>
              <p className="text-sm text-muted-foreground">No candidate actions recorded yet.</p>
            </div>
          ) : (
            archivedCandidates.map((cand) => (
              <motion.div
                key={cand.id}
                variants={item}
                onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                className="glass-card p-4 rounded-xl border border-border/50 relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cand.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(cand.id);
                      }}
                      className="rounded border-muted-foreground/30 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer"
                    />
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/20">
                      {cand.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[150px]">{cand.name}</h3>
                      <div className="flex flex-col">
                        <p className="text-[11px] text-muted-foreground">{cand.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleDelete(cand.id, cand.name);
                        }}
                        disabled={isDeleting}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                        title="Delete from Archives"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-40" />
                    </div>
                    <StatusBadge status={cand.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/50 mb-2.5">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Company & Role</p>
                    <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-primary opacity-65" /> {cand.companyName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate font-medium pl-5">{cand.roleTitle}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Action Date</p>
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary opacity-60" />
                      {cand.date ? new Date(cand.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                    </p>
                  </div>
                </div>

                {cand.remarks && (
                  <div className="mt-2 p-2.5 rounded-lg bg-secondary/35 border border-border/40 text-[11px] text-muted-foreground italic flex gap-1.5 items-start">
                    <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-2">"{cand.remarks}"</span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block glass-card overflow-hidden">
          <div className="p-3 border-b border-border/50 bg-secondary/20">
            <div className="grid grid-cols-12 gap-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest items-center">
              <div className="col-span-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={archivedCandidates.length > 0 && selectedIds.length === archivedCandidates.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-muted-foreground/30 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer"
                />
                <span>Candidate</span>
              </div>
              <div className="col-span-2">Company</div>
              <div className="col-span-2">Technology/Role</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-2 text-center">Action Date</div>
              <div className="col-span-1.5">Decision Note</div>
              <div className="col-span-0.5 text-right"></div>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {archivedCandidates.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-4">
                  <Archive className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">No archived records found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? `No results match "${searchQuery}"` : "Historical candidate selection, rejection, or drop records will appear here."}
                </p>
              </div>
            ) : (
              archivedCandidates.map((cand) => (
                <motion.div
                  key={cand.id}
                  variants={item}
                  onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                  className="grid grid-cols-12 gap-3 py-3.5 px-6 items-center hover:bg-secondary/30 transition-colors group cursor-pointer"
                >
                  {/* Checkbox & Candidate Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cand.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleToggleSelect(cand.id)
                      }
                      className="rounded border-muted-foreground/30 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer"
                    />
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shadow-sm ring-1 ring-primary/20">
                      {cand.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {cand.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{cand.email}</p>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-primary opacity-60 shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">{cand.companyName}</span>
                    </div>
                  </div>

                  {/* Technology / Role */}
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-primary opacity-60 shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">{cand.roleTitle}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-1 flex justify-center">
                    <StatusBadge status={cand.status} className="scale-95" />
                  </div>

                  {/* Action Date */}
                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/60 text-foreground text-[10px] font-bold border border-border">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {cand.date ? new Date(cand.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                    </span>
                  </div>

                  {/* Remarks */}
                  <div className="col-span-1.5 min-w-0">
                    {cand.remarks ? (
                      <p className="text-[11px] text-muted-foreground italic truncate" title={cand.remarks}>
                        "{cand.remarks}"
                      </p>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </div>

                  {/* Single Delete Column Button */}
                  <div className="col-span-0.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSingleDelete(cand.id, cand.name);
                      }}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete from Archives"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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

export default Archives;
