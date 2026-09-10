import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Search,
  Calendar,
  Clock,
  Filter,
  ChevronDown,
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Pencil,
  ArchiveRestore,
  Upload,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCompanies,
  getJobRoles,
  getPipeline,
  Application,
  deleteApplication,
  bulkDeleteApplications,
  updatePipelineStatus,
} from "@/api/resumeiq";
import * as XLSX from "xlsx";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const formatArchivedDate = (dateStr?: string | null) => {
  if (!dateStr) return { date: "—", time: "" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr, time: "" };
    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date, time };
  } catch {
    return { date: dateStr, time: "" };
  }
};

const getAvatarPalette = (name: string) => {
  const palettes = [
    { bg: "bg-purple-100", text: "text-purple-700" },
    { bg: "bg-emerald-100", text: "text-emerald-700" },
    { bg: "bg-rose-100", text: "text-rose-700" },
    { bg: "bg-blue-100", text: "text-blue-700" },
    { bg: "bg-amber-100", text: "text-amber-700" },
    { bg: "bg-indigo-100", text: "text-indigo-700" },
    { bg: "bg-teal-100", text: "text-teal-700" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palettes[Math.abs(hash) % palettes.length];
};

const Archives = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "selected" | "rejected" | "dropped">("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Note Modal states
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Clear selections & pagination when filters change
  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [searchQuery, statusFilter, timeFilter, companyFilter, roleFilter]);

  // ── Data queries ──────────────────────────────────────
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies(),
  });

  const { data: jobRoles = [] } = useQuery({
    queryKey: ["job-roles"],
    queryFn: () => getJobRoles(),
  });

  const { data: pipeline = {} } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => getPipeline(),
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
          email: app.candidate_email || "N/A",
          phone: app.candidate_phone || (app as any).phone || "+91 97518 6435",
          experience: app.experience_years,
          status: stageId, // "selected", "rejected", "dropped"
          remarks: app.remarks || app.note || null,
          source: app.source_label || (app.source ? app.source.charAt(0).toUpperCase() + app.source.slice(1) : "Direct"),
        });
      });
    });
    return list;
  }, [pipeline, roleById]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = allArchivedCandidates.length;
    const selected = allArchivedCandidates.filter((c) => c.status === "selected").length;
    const rejected = allArchivedCandidates.filter((c) => c.status === "rejected").length;
    const dropped = allArchivedCandidates.filter((c) => c.status === "dropped").length;
    return {
      total,
      selected,
      rejected,
      dropped,
      selectedPct: total ? ((selected / total) * 100).toFixed(1) : "0.0",
      rejectedPct: total ? ((rejected / total) * 100).toFixed(1) : "0.0",
      droppedPct: total ? ((dropped / total) * 100).toFixed(1) : "0.0",
    };
  }, [allArchivedCandidates]);

  // Filter Dropdown Options
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    allArchivedCandidates.forEach((c) => {
      if (c.companyName && c.companyName.trim() && c.companyName !== "Unknown Company") {
        set.add(c.companyName.trim());
      }
    });
    return Array.from(set).sort();
  }, [allArchivedCandidates]);

  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    allArchivedCandidates.forEach((c) => {
      if (c.roleTitle && c.roleTitle.trim() && c.roleTitle !== "Unknown Role") {
        set.add(c.roleTitle.trim());
      }
    });
    return Array.from(set).sort();
  }, [allArchivedCandidates]);

  // Filtered candidates list
  const archivedCandidates = useMemo(() => {
    let filtered = allArchivedCandidates;

    // Status Tab / Dropdown Filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status && c.status.toLowerCase() === statusFilter);
    }

    // Time Filter
    if (timeFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((c) => {
        if (!c.date) return false;
        const d = new Date(c.date);
        if (isNaN(d.getTime())) return false;
        if (timeFilter === "today") {
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        }
        if (timeFilter === "this_week") {
          const startOfWeek = new Date(now);
          startOfWeek.setHours(0, 0, 0, 0);
          startOfWeek.setDate(now.getDate() - now.getDay());
          return d.getTime() >= startOfWeek.getTime();
        }
        if (timeFilter === "this_month") {
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth()
          );
        }
        if (timeFilter === "this_year") {
          return d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Company Filter
    if (companyFilter !== "all") {
      filtered = filtered.filter((c) => c.companyName === companyFilter);
    }

    // Role Filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((c) => c.roleTitle === roleFilter);
    }

    // Search Query (candidate name, company, role, email, phone, remarks, source)
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(lower)) ||
          (c.companyName && c.companyName.toLowerCase().includes(lower)) ||
          (c.roleTitle && c.roleTitle.toLowerCase().includes(lower)) ||
          (c.email && c.email.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.toLowerCase().includes(lower)) ||
          (c.remarks && c.remarks.toLowerCase().includes(lower)) ||
          (c.source && c.source.toLowerCase().includes(lower))
      );
    }

    // Default: Date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [allArchivedCandidates, searchQuery, statusFilter, timeFilter, companyFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(archivedCandidates.length / PAGE_SIZE));

  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return archivedCandidates.slice(start, start + PAGE_SIZE);
  }, [archivedCandidates, currentPage, PAGE_SIZE]);

  // Handlers
  const handleResetFilters = () => {
    setStatusFilter("all");
    setTimeFilter("all");
    setCompanyFilter("all");
    setRoleFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
    toast.info("All filters reset");
  };

  const handleApplyFilters = () => {
    toast.success(`Filtered ${archivedCandidates.length} candidate(s)`);
  };

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

  const handleRestore = async (cand: any) => {
    if (!confirm(`Restore ${cand.name} back to the active pipeline (Applied stage)?`)) return;
    try {
      await updatePipelineStatus(cand.id, "applied", "Restored from archives");
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success(`${cand.name} restored to active pipeline successfully`);
    } catch (err) {
      toast.error("Failed to restore candidate");
    }
  };

  const handleSaveRemarks = async () => {
    if (!editingCandidate) return;
    setIsSavingNote(true);
    try {
      await updatePipelineStatus(
        editingCandidate.id,
        editingCandidate.status,
        editNoteText,
        null,
        null,
        null,
        editNoteText
      );
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Candidate notes updated successfully");
      setEditingCandidate(null);
    } catch (err) {
      toast.error("Failed to update candidate notes");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleExport = () => {
    try {
      if (archivedCandidates.length === 0) {
        toast.error("No archived candidates found to export");
        return;
      }
      const exportData = archivedCandidates.map((c) => {
        const archDate = formatArchivedDate(c.date);
        return {
          "Candidate Name": c.name || "N/A",
          "Email": c.email || "N/A",
          "Phone": c.phone || "N/A",
          "Company": c.companyName || "N/A",
          "Job Role": c.roleTitle || "N/A",
          "Status": c.status ? c.status.toUpperCase() : "N/A",
          "Archived Date": `${archDate.date} ${archDate.time}`.trim(),
          "Decision Note / Remarks": c.remarks || "N/A",
          "Source": c.source || "N/A",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = [
        { wch: 25 },
        { wch: 28 },
        { wch: 18 },
        { wch: 22 },
        { wch: 25 },
        { wch: 14 },
        { wch: 22 },
        { wch: 35 },
        { wch: 15 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Archives");
      const filterTag = statusFilter !== "all" ? `_${statusFilter}` : "";
      XLSX.writeFile(workbook, `archives${filterTag}_export_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`Successfully exported ${exportData.length} archived candidate(s)`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export archives data");
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── Top Header with Breadcrumb & Search ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Altzör</span>
            </button>
            <span className="text-slate-400">&gt;</span>
            <span className="text-slate-800 font-semibold">Archives</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Archives</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            View historical records of candidates with selection, rejection, or drop status.
          </p>
        </div>

        {/* Header Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search archived candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white shadow-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Metric Cards (4 in row) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Archived */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("all")}
          className={`bg-white border rounded-xl p-3.5 sm:p-4 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all duration-200 hover:shadow-sm active:scale-[0.99] select-none ${
            statusFilter === "all"
              ? "border-purple-300 ring-2 ring-purple-400/20"
              : "border-slate-200/80 hover:border-purple-200"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <Archive className="w-5 h-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Total Archived</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {stats.total.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Selected */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("selected")}
          className={`bg-white border rounded-xl p-3.5 sm:p-4 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all duration-200 hover:shadow-sm active:scale-[0.99] select-none ${
            statusFilter === "selected"
              ? "border-green-300 ring-2 ring-green-400/20"
              : "border-slate-200/80 hover:border-green-200"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-green-50/70 border border-green-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Selected</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {stats.selected.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Rejected */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("rejected")}
          className={`bg-white border rounded-xl p-3.5 sm:p-4 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all duration-200 hover:shadow-sm active:scale-[0.99] select-none ${
            statusFilter === "rejected"
              ? "border-red-300 ring-2 ring-red-400/20"
              : "border-slate-200/80 hover:border-red-200"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-red-50/70 border border-red-100 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Rejected</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {stats.rejected.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Dropped */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("dropped")}
          className={`bg-white border rounded-xl p-3.5 sm:p-4 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all duration-200 hover:shadow-sm active:scale-[0.99] select-none ${
            statusFilter === "dropped"
              ? "border-orange-300 ring-2 ring-orange-400/20"
              : "border-slate-200/80 hover:border-orange-200"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50/70 border border-orange-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Dropped</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {stats.dropped.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* ── Filters Panel Card ───────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Filters Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm sm:text-base tracking-tight">Filters</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>

        {/* Controls Row (Status, Company, Role, Date Range, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-500 transition cursor-pointer shadow-xs"
              >
                <option value="all">All Status</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
                <option value="dropped">Dropped</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Company</label>
            <div className="relative">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-500 transition cursor-pointer shadow-xs truncate"
              >
                <option value="all">All Companies</option>
                {availableCompanies.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Job Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Job Role</label>
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-500 transition cursor-pointer shadow-xs truncate"
              >
                <option value="all">All Roles</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date Range</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-500 transition cursor-pointer shadow-xs"
              >
                <option value="all">Select date range</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Inline Search Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 lg:invisible">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:border-blue-500 transition shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
          >
            <Filter className="w-3.5 h-3.5" /> Apply Filters
          </button>
        </div>
      </div>

      {/* ── Tabs and Action Bar Row ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
        {/* Horizontal Status Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {[
            { key: "all" as const, label: "All Candidates", count: stats.total },
            { key: "selected" as const, label: "Selected", count: stats.selected },
            { key: "rejected" as const, label: "Rejected", count: stats.rejected },
            { key: "dropped" as const, label: "Dropped", count: stats.dropped },
          ].map((t) => {
            const isActive = statusFilter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`flex items-center gap-2 pb-2 text-sm font-semibold transition-all relative whitespace-nowrap ${
                  isActive ? "text-blue-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.count}
                </span>
                {isActive && (
                  <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side: Export & Count */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-1.5 rounded-lg border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-purple-600 font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
            title="Export candidates to Excel"
          >
            <Upload className="w-3.5 h-3.5 rotate-180" /> Export
          </button>
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            {archivedCandidates.length} candidate{archivedCandidates.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Bulk Action Bar Banner ───────────────────────────── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm">
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

      {/* ── Table Container ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={archivedCandidates.length > 0 && selectedIds.length === archivedCandidates.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 font-bold">CANDIDATE</th>
                <th className="py-3.5 px-4 font-bold">COMPANY</th>
                <th className="py-3.5 px-4 font-bold">JOB ROLE</th>
                <th className="py-3.5 px-4 font-bold text-center">STATUS</th>
                <th className="py-3.5 px-4 font-bold text-right pr-6">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {archivedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <Archive className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">No archived records found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {searchQuery
                        ? `No records match "${searchQuery}". Try clearing filters.`
                        : "Historical candidate selection, rejection, or drop records will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((cand) => {
                  const palette = getAvatarPalette(cand.name);
                  const initials = cand.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={cand.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(cand.id)}
                          onChange={() => handleToggleSelect(cand.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Candidate */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${palette.bg} ${palette.text}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p
                              onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                              className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer truncate"
                            >
                              {cand.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{cand.email}</p>
                            <p className="text-xs text-slate-500 truncate">{cand.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-4 px-4 font-semibold text-slate-800 text-sm">
                        {cand.companyName}
                      </td>

                      {/* Job Role */}
                      <td className="py-4 px-4 font-medium text-slate-700 text-sm">
                        {cand.roleTitle}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          {cand.status === "selected" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                              Selected
                            </span>
                          )}
                          {cand.status === "rejected" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              Rejected
                            </span>
                          )}
                          {cand.status === "dropped" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                              <Clock className="w-3.5 h-3.5 text-orange-600" />
                              Dropped
                            </span>
                          )}
                          {cand.status !== "selected" &&
                            cand.status !== "rejected" &&
                            cand.status !== "dropped" && (
                              <StatusBadge status={cand.status} />
                            )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Candidate */}
                          <button
                            onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                            className="w-8 h-8 rounded-lg border border-slate-200/80 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-500 flex items-center justify-center transition shadow-2xs"
                            title="View Candidate Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Remarks / Notes */}
                          <button
                            onClick={() => {
                              setEditingCandidate(cand);
                              setEditNoteText(cand.remarks || "");
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-200/80 bg-white hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 text-slate-500 flex items-center justify-center transition shadow-2xs"
                            title="Edit Decision Note / Remarks"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Restore Candidate to Pipeline */}
                          <button
                            onClick={() => handleRestore(cand)}
                            className="w-8 h-8 rounded-lg border border-slate-200/80 bg-white hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 text-slate-500 flex items-center justify-center transition shadow-2xs"
                            title="Restore Candidate to Pipeline"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ────────────────────────────────── */}
        {archivedCandidates.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs sm:text-sm font-medium text-slate-500 text-center sm:text-left">
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, archivedCandidates.length)} to{" "}
              {Math.min(currentPage * PAGE_SIZE, archivedCandidates.length)} of {archivedCandidates.length} archives
            </p>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 shadow-xs shrink-0 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages })
                .slice(
                  Math.max(0, Math.min(currentPage - 3, totalPages - 5)),
                  Math.min(totalPages, Math.max(5, currentPage + 2))
                )
                .map((_, idx) => {
                  const pageNum =
                    Math.max(1, Math.min(currentPage - 2, Math.max(1, totalPages - 4))) + idx;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs sm:text-sm shadow-xs transition-colors shrink-0 ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white border border-blue-600"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 shadow-xs shrink-0 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Decision Note / Remarks Modal ───────────────── */}
      <Modal
        open={!!editingCandidate}
        onClose={() => setEditingCandidate(null)}
        title="Edit Candidate Decision Note"
      >
        {editingCandidate && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <p className="text-sm font-bold text-slate-900">{editingCandidate.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingCandidate.roleTitle} • {editingCandidate.companyName}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Decision Note / Remarks
              </label>
              <textarea
                rows={4}
                value={editNoteText}
                onChange={(e) => setEditNoteText(e.target.value)}
                placeholder="Enter remarks, feedback, or archive reason for this candidate..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCandidate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingNote}
                onClick={handleSaveRemarks}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition shadow-xs disabled:opacity-50"
              >
                {isSavingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default Archives;
