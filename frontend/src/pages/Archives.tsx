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
  CheckCircle2,
  XCircle,
  Download,
  MoreVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
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
  const [timeFilter, setTimeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;
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
    setCurrentPage(1);
  }, [searchQuery, statusFilter, timeFilter, companyFilter, roleFilter]);

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

  const allArchivedCandidates = useMemo(() => {
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
    return list;
  }, [pipeline, roleById]);

  const stats = useMemo(() => {
    const total = allArchivedCandidates.length;
    const selected = allArchivedCandidates.filter(c => c.status === "selected").length;
    const rejected = allArchivedCandidates.filter(c => c.status === "rejected").length;
    const dropped = allArchivedCandidates.filter(c => c.status === "dropped").length;
    return {
      total,
      selected,
      rejected,
      dropped,
      selectedPct: total ? ((selected / total) * 100).toFixed(1) : "0",
      rejectedPct: total ? ((rejected / total) * 100).toFixed(1) : "0",
      droppedPct: total ? ((dropped / total) * 100).toFixed(1) : "0",
    };
  }, [allArchivedCandidates]);

  const archivedCandidates = useMemo(() => {
    let filtered = allArchivedCandidates;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status.toLowerCase() === statusFilter);
    }
    if (companyFilter !== "all") {
      filtered = filtered.filter(c => c.companyName === companyFilter);
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter(c => c.roleTitle === roleFilter);
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
  }, [allArchivedCandidates, searchQuery, statusFilter, companyFilter, roleFilter, sortBy]);

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
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Archives"
          description="View complete historical records of candidates with selection, rejection, or drop status"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Archive className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Archived</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{stats.total.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">All time</p>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl border-2 border-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Selected</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{stats.selected.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-green-600 font-bold mt-0.5">{stats.selectedPct}% of total</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl border-2 border-red-100 flex items-center justify-center shrink-0 bg-red-50/50">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rejected</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{stats.rejected.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-red-600 font-bold mt-0.5">{stats.rejectedPct}% of total</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl border-2 border-orange-100 flex items-center justify-center shrink-0 bg-orange-50/50">
              <Clock className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dropped</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{stats.dropped.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-orange-600 font-bold mt-0.5">{stats.droppedPct}% of total</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border/50 pb-4">
          {/* Left: Tabs */}
          <div className="flex gap-6">
            {([
              { key: "all" as const, label: "All Candidates" },
              { key: "selected" as const, label: "Selected" },
              { key: "rejected" as const, label: "Rejected" },
              { key: "dropped" as const, label: "Dropped" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`pb-2 text-sm font-bold transition-colors relative ${statusFilter === t.key ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t.label}
                {statusFilter === t.key && (
                  <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Right: Dropdowns, Search, Export */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Time Filter */}
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold bg-white hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Companies Filter */}
            <div className="relative">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="appearance-none pl-4 pr-8 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold bg-white hover:bg-slate-50 transition-colors shadow-sm focus:outline-none max-w-[150px] truncate"
              >
                <option value="all">All Companies</option>
                {Array.from(new Set(allArchivedCandidates.map(c => c.companyName))).map(comp => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Roles Filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none pl-4 pr-8 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold bg-white hover:bg-slate-50 transition-colors shadow-sm focus:outline-none max-w-[150px] truncate"
              >
                <option value="all">All Roles</option>
                {Array.from(new Set(allArchivedCandidates.map(c => c.roleTitle))).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search archives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500 w-[200px]"
              />
            </div>

            {/* Export Button */}
            <button className="px-4 py-2 rounded-lg border border-purple-200 text-purple-600 text-sm font-bold flex items-center gap-2 bg-purple-50/50 hover:bg-purple-100 transition-all shadow-sm">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
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
        <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="grid grid-cols-12 gap-3 px-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest items-center">
              <div className="col-span-3 flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={archivedCandidates.length > 0 && selectedIds.length === archivedCandidates.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>CANDIDATE</span>
              </div>
              <div className="col-span-2">COMPANY</div>
              <div className="col-span-2">ROLE</div>
              <div className="col-span-1 text-center">STATUS</div>
              <div className="col-span-1.5">ACTION DATE</div>
              <div className="col-span-1.5">DECISION NOTE</div>
              <div className="col-span-1 text-right">ACTIONS</div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
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
              archivedCandidates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((cand) => (
                <motion.div
                  key={cand.id}
                  variants={item}
                  onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                  className="grid grid-cols-12 gap-3 py-4 px-6 items-center hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  {/* Checkbox & Candidate Info */}
                  <div className="col-span-3 flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cand.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleToggleSelect(cand.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                      {cand.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {cand.name}
                      </p>
                      <p className="text-[12px] text-slate-500 truncate">{cand.email}</p>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-slate-700 truncate">{cand.companyName}</p>
                        <p className="text-[12px] text-slate-500 truncate">General</p>
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-2 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{cand.roleTitle}</p>
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-1 flex justify-center">
                    <StatusBadge status={cand.status} className="scale-95" />
                  </div>

                  {/* Action Date */}
                  <div className="col-span-1.5 flex flex-col">
                    <span className="text-sm font-bold text-slate-700">
                      {cand.date ? new Date(cand.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                    </span>
                    <span className="text-[12px] text-slate-500">
                      {cand.date ? new Date(cand.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </span>
                  </div>

                  {/* Remarks */}
                  <div className="col-span-1.5 min-w-0">
                    {cand.remarks ? (
                      <p className="text-xs text-slate-600 line-clamp-2" title={cand.remarks}>
                        {cand.remarks}
                      </p>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSingleDelete(cand.id, cand.name); }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      title="Delete from Archives"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Pagination Footer */}
        {archivedCandidates.length > 0 && (
          <div className="flex items-center justify-between py-4">
            <p className="text-sm font-medium text-slate-500">
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, archivedCandidates.length)} to {Math.min(currentPage * PAGE_SIZE, archivedCandidates.length)} of {archivedCandidates.length} archives
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: Math.ceil(archivedCandidates.length / PAGE_SIZE) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm shadow-sm transition-colors ${
                    currentPage === i + 1 
                      ? 'bg-blue-600 text-white border border-blue-600' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={currentPage === Math.ceil(archivedCandidates.length / PAGE_SIZE)}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(archivedCandidates.length / PAGE_SIZE), prev + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Archives;
