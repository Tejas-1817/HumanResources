import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Building2,
  Search,
  ExternalLink,
  Users,
  Plus,
  Star,
  MapPin,
  Check,
  ChevronDown,
  Filter,
  Download,
  MoreVertical,
  Clock,
  Calendar,
  Edit,
  Trash2,
  X,
  UserCheck,
  DollarSign,
  FileText,
  Mail,
  Phone,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { AddOpenPositionModal } from "@/components/modals/AddOpenPositionModal";
import { EditOpenPositionModal } from "@/components/modals/EditOpenPositionModal";
import { AddCandidateToPositionModal } from "@/components/modals/AddCandidateToPositionModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  getCompanies,
  getJobRoles,
  getPipeline,
  deleteJobRole,
  updateCandidate,
  deleteApplication,
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
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<"specifications" | "candidates">("specifications");
  const [candidateModalPosition, setCandidateModalPosition] = useState<any | null>(null);
  const [positionToEdit, setPositionToEdit] = useState<any | null>(null);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState("");

  // Edit Candidate State
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [editCandidateForm, setEditCandidateForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [savingCandidate, setSavingCandidate] = useState(false);

  // Delete Candidate State
  const [candidateToDelete, setCandidateToDelete] = useState<any | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState(false);

  // Read initial tab from URL query param (e.g. ?tab=active)
  const initialTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "active" || tab === "closed" || tab === "on_hold" || tab === "recent") return tab;
    return "all";
  }, []);

  // Delete Job Role mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteJobRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      toast.success("Position deleted successfully");
      setActiveDropdown(null);
      if (selectedPosition?.id === activeDropdown) {
        setSelectedPosition(null);
      }
    },
    onError: () => {
      toast.error("Failed to delete position");
    }
  });

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this position? All associated applications will be lost.")) {
      deleteMutation.mutate(id);
    }
  };

  // Data queries
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies()
  });
  const { data: jobRoles = [] } = useQuery({
    queryKey: ["job-roles"],
    queryFn: () => getJobRoles()
  });
  const { data: pipeline = {} as any } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => getPipeline()
  });

  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "active" | "loss" | "on_hold" | "closed" | "recent">(initialTab as any);
  const [selectedCompany, setSelectedCompany] = useState("Company");

  // Summary Metrics
  const statsSummary = useMemo(() => {
    const totalPartners = companies.length;
    const totalPositions = jobRoles.reduce((sum, r) => sum + (r.positions_required || 1), 0);
    const activePositions = jobRoles.reduce((sum, r) => {
      if (r.status.toLowerCase() !== "open") return sum;
      const filledCount = Object.values(pipeline).flat().filter((app: any) => app.job_role_id === r.id && (app.status === "selected" || app.status === "joined")).length;
      const remaining = Math.max(0, (r.positions_required || 1) - filledCount);
      return sum + remaining;
    }, 0);

    const uniqueCands = new Set<number>();
    Object.values(pipeline).flat().forEach((app: any) => {
      uniqueCands.add(app.candidate_id);
    });
    const totalCandidates = uniqueCands.size;

    const successfulHires = Object.values(pipeline).flat().filter((app: any) => app.status === "selected").length;

    return {
      totalPartners,
      totalPositions,
      activePositions,
      totalCandidates,
      successfulHires
    };
  }, [companies, jobRoles, pipeline]);

  // Client name filter list
  const companyNames = useMemo(() => {
    return companies.map(c => c.name);
  }, [companies]);


  // Enrich and filter Job Roles
  const filteredPositions = useMemo(() => {
    let list = jobRoles.map((role) => {
      const client = companies.find(c => c.id === role.company_id);

      // Parse Requisition Metadata from serialized description if present
      let projectName = "N/A";
      let projectStartDate = "N/A";
      let projectDuration = "N/A";
      let raisedBy = "N/A";
      let budget = "N/A";
      let responsibilities = role.description || "";

      if (role.description && role.description.includes("=== REQUISITION METADATA ===")) {
        const parts = role.description.split("=============================\n\n");
        responsibilities = parts[1] || role.description;
        const metaSection = parts[0] || "";

        const projMatch = metaSection.match(/Project:\s*(.*)/);
        const startMatch = metaSection.match(/Project Start Date:\s*(.*)/);
        const durationMatch = metaSection.match(/Project Duration:\s*(.*)/);
        const raisedMatch = metaSection.match(/Request Raised By:\s*(.*)/);
        const budgetMatch = metaSection.match(/Budget Range:\s*(.*)/);

        if (projMatch) projectName = projMatch[1].trim();
        if (startMatch) projectStartDate = startMatch[1].trim();
        if (durationMatch) {
          const d = durationMatch[1].trim();
          projectDuration = (d && d !== "N/A") ? d : (role.project_time_period || "6 Months");
        }
        if (raisedMatch) raisedBy = raisedMatch[1].trim();
        if (budgetMatch) budget = budgetMatch[1].trim();
      } else if (role.project_time_period) {
        projectDuration = role.project_time_period;
      } else {
        projectDuration = "6 Months";
      }

      // Count candidate applications for this specific position
      const totalCandidates = Object.values(pipeline).flat().filter((app: any) => app.job_role_id === role.id).length;
      const hiredCandidates = Object.values(pipeline).flat().filter((app: any) => app.job_role_id === role.id && (app.status === "selected" || app.status === "joined")).length;
      const positionsReq = role.positions_required || 1;
      const isFilled = hiredCandidates >= positionsReq && positionsReq > 0;
      let computedStatus = (role.status || "open").toLowerCase();
      if (isFilled && computedStatus === "open") {
        computedStatus = "closed";
      }

      return {
        ...role,
        status: computedStatus,
        clientName: client ? client.name : "Unknown Client",
        projectName,
        projectStartDate,
        projectDuration,
        raisedBy,
        budget,
        responsibilities,
        totalCandidates,
        hiredCandidates
      };
    });

    // Apply Tab Filters & Default Sorting
    if (activeTabFilter === "active") {
      list = list.filter(r => r.status === "open");
    } else if (activeTabFilter === "loss") {
      list = list.filter(r => r.status === "loss");
    } else if (activeTabFilter === "on_hold") {
      list = list.filter(r => r.status === "on-hold" || r.status === "on_hold");
    } else if (activeTabFilter === "closed") {
      list = list.filter(r => r.status === "closed");
    } else if (activeTabFilter === "recent") {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // In "All Positions", show Open status positions first, then Closed / On-hold positions
      list = [...list].sort((a, b) => {
        const aOpen = (a.status || "").toLowerCase() === "open" ? 0 : 1;
        const bOpen = (b.status || "").toLowerCase() === "open" ? 0 : 1;
        if (aOpen !== bOpen) {
          return aOpen - bOpen;
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    }

    // Apply Client Dropdown Filter
    if (selectedCompany !== "Company") {
      list = list.filter(r => r.clientName === selectedCompany);
    }


    // Apply Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.clientName.toLowerCase().includes(query) ||
        r.projectName.toLowerCase().includes(query)
      );
    }

    return list;
  }, [jobRoles, companies, pipeline, activeTabFilter, selectedCompany, searchQuery]);

  // Pagination Configuration (20 positions per page)
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 when search query, tabs, or company filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTabFilter, selectedCompany]);

  const totalPages = Math.ceil(filteredPositions.length / ITEMS_PER_PAGE);
  const paginatedPositions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPositions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPositions, currentPage]);

  const formatWorkMode = (workMode?: string | null, location?: string | null): string => {
    if (workMode && workMode.trim()) {
      const mode = workMode.trim().toLowerCase();
      if (mode === "remote") return "Remote";
      if (mode === "hybrid") return "Hybrid";
      if (mode === "onsite" || mode === "on-site" || mode === "on site") return "On-site";
      return workMode.trim().charAt(0).toUpperCase() + workMode.trim().slice(1);
    }
    
    if (location && location.trim()) {
      const loc = location.trim().toLowerCase();
      if (loc === "remote") return "Remote";
      if (loc === "hybrid") return "Hybrid";
      if (loc === "onsite" || loc === "on-site" || loc === "on site") return "On-site";
    }

    return "On-site";
  };

  const formatExportDuration = (duration?: string | null, timePeriod?: string | null): string => {
    if (duration && duration !== "N/A" && duration.trim()) {
      return duration.trim();
    }
    if (timePeriod && timePeriod !== "N/A" && timePeriod.trim()) {
      return timePeriod.trim();
    }
    return "6 Months";
  };

  const handleExportExcel = () => {
    try {
      if (!filteredPositions || filteredPositions.length === 0) {
        toast.error("No positions found to export");
        return;
      }

      // Map rows with required column headers:
      // Position Name | Duration | Total Openings | Work Mode | JD
      const exportData = filteredPositions.map((pos) => ({
        "Position Name": pos.title || "N/A",
        "Duration": formatExportDuration(pos.projectDuration, pos.project_time_period),
        "Total Openings": pos.positions_required || 1,
        "Work Mode": formatWorkMode(pos.work_mode, pos.location),
        "JD": pos.responsibilities || pos.description || "N/A",
      }));

      // Create a worksheet from JSON
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-fit column widths
      worksheet["!cols"] = [
        { wch: 30 }, // Position Name
        { wch: 20 }, // Duration
        { wch: 16 }, // Total Openings
        { wch: 16 }, // Work Mode
        { wch: 60 }, // JD
      ];

      // Create workbook and append sheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Positions");

      // Download .xlsx file
      XLSX.writeFile(workbook, "positions_export.xlsx");
      toast.success(`Successfully exported ${exportData.length} position(s) to positions_export.xlsx`);
    } catch (error: any) {
      console.error("Export Excel failed:", error);
      toast.error("Failed to export positions to Excel");
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "open") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          Open
        </span>
      );
    }
    if (s === "loss") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Loss
        </span>
      );
    }
    if (s === "on-hold" || s === "on_hold") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
          On-Hold
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
        Closed
      </span>
    );
  };

  // Candidates associated with the currently selected position
  const selectedPositionCandidates = useMemo(() => {
    if (!selectedPosition) return [];
    const allApps = Object.values(pipeline || {}).flat();
    let apps = allApps.filter((app: any) => app.job_role_id === selectedPosition.id);
    if (candidateSearchQuery.trim()) {
      const q = candidateSearchQuery.toLowerCase();
      apps = apps.filter((app: any) =>
        (app.candidate_name || "").toLowerCase().includes(q) ||
        (app.candidate_email || "").toLowerCase().includes(q) ||
        (app.candidate_phone || "").toLowerCase().includes(q)
      );
    }
    return apps;
  }, [selectedPosition, pipeline, candidateSearchQuery]);

  const handleOpenEditCandidate = (cand: any) => {
    setEditingCandidate(cand);
    setEditCandidateForm({
      name: cand.candidate_name || "",
      email: cand.candidate_email || "",
      phone: cand.candidate_phone || "",
    });
  };

  const handleSaveCandidateEdit = async () => {
    if (!editingCandidate) return;
    if (!editCandidateForm.name.trim()) {
      toast.error("Candidate name is required");
      return;
    }
    setSavingCandidate(true);
    try {
      await updateCandidate(editingCandidate.candidate_id, {
        name: editCandidateForm.name.trim(),
        email: editCandidateForm.email.trim() || undefined,
        phone: editCandidateForm.phone.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Candidate updated successfully");
      setEditingCandidate(null);
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to update candidate";
      toast.error(msg);
    } finally {
      setSavingCandidate(false);
    }
  };

  const handleConfirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    setDeletingCandidate(true);
    try {
      // Remove candidate from this specific position by deleting the application record
      await deleteApplication(candidateToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(`Removed ${candidateToDelete.candidate_name || "candidate"} from position`);
      setCandidateToDelete(null);
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to remove candidate";
      toast.error(msg);
    } finally {
      setDeletingCandidate(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Positions"
          description="Track and manage position requisitions and candidate hiring funnels"
          actions={
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search positions or clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                />
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Position
              </button>
            </div>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.totalPositions ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Total Positions</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.activePositions ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Active Positions</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.totalPartners ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Partner Clients</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.totalCandidates ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Total Candidates</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-500/20" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.successfulHires ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Hired Candidates</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border/40 pb-px text-sm">
        {[
          { id: "all", label: "All Positions", icon: Briefcase },
          { id: "active", label: "Open Only", icon: Check },
          { id: "loss", label: "Loss Positions", icon: X },
          { id: "closed", label: "Closed Positions", icon: Calendar },
          { id: "recent", label: "Recently Added", icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as any)}
              className={`pb-3 font-semibold transition-all flex items-center gap-2 relative ${activeTabFilter === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Secondary filter selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-card border border-border text-muted-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 font-semibold cursor-pointer"
          >
            <option value="Company">Client</option>
            {companyNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

        </div>

        <div className="flex items-center gap-2.5 self-start">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-card border border-border text-emerald-600 hover:text-emerald-700 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
            title="Export positions to Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>

          <button
            onClick={() => {
              setSelectedCompany("Company");
              setSearchQuery("");
              setActiveTabFilter("all");
            }}
            className="px-4 py-2.5 rounded-xl bg-card border border-border text-muted-foreground text-xs font-semibold hover:bg-secondary/40 hover:text-foreground transition-all flex items-center gap-2"
          >
            <Filter className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main Table view */}
      {filteredPositions.length === 0 ? (
        <div className="p-20 text-center glass-card">
          <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-6">
            <Briefcase className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No positions found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or filter tags to locate specific open roles.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="p-4 px-6 md:px-8 border-b border-border/50 bg-secondary/20">
            <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest items-center">
              <div className="col-span-4">Position Name</div>
              <div className="col-span-3">Client</div>
              <div className="col-span-2 text-center">Openings</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-1 text-right pr-1">Action</div>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {paginatedPositions.map((pos) => (
              <motion.div
                key={pos.id}
                variants={item}
                onClick={() => setSelectedPosition(pos)}
                className="grid grid-cols-12 gap-4 p-4 px-6 md:px-8 items-center hover:bg-primary/[0.02] transition-colors group cursor-pointer"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {pos.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                      {formatWorkMode(pos.work_mode, pos.location)}
                    </p>
                  </div>
                </div>

                <div className="col-span-3 text-xs font-semibold text-foreground truncate">{pos.clientName}</div>
                <div className="col-span-2 text-center flex flex-col items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{pos.positions_required}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPosition(pos);
                      setModalTab("candidates");
                    }}
                    className="text-[10px] font-bold text-primary hover:underline mt-0.5 flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" /> {pos.totalCandidates} Candidates
                  </button>
                </div>
                <div className="col-span-2 text-center">{renderStatusBadge(pos.status)}</div>

                <div className="col-span-1 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === pos.id ? null : pos.id);
                      }}
                      className="p-1.5 rounded-lg border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {activeDropdown === pos.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10 py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPositionToEdit(pos);
                            setActiveDropdown(null);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-secondary/40 text-foreground flex items-center gap-2"
                        >
                          <Edit className="w-3.5 h-3.5 text-primary" />
                          Edit Position
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCandidateModalPosition(pos);
                            setActiveDropdown(null);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-secondary/40 text-foreground flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          Add Candidate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPosition(pos);
                            setModalTab("candidates");
                            setActiveDropdown(null);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-secondary/40 text-foreground flex items-center gap-2"
                        >
                          <Users className="w-3.5 h-3.5 text-primary" />
                          View Candidates ({pos.totalCandidates})
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPosition(pos);
                            setModalTab("specifications");
                            setActiveDropdown(null);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-secondary/40 text-foreground flex items-center gap-2 border-b border-border/50"
                        >
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          Specifications
                        </button>
                        <button
                          onClick={(e) => handleDelete(pos.id, e)}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-secondary/40 text-destructive flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Position
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border/50 bg-secondary/10 rounded-b-xl">
            <p className="text-xs text-muted-foreground font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPositions.length)} of {filteredPositions.length} positions
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-muted-foreground disabled:opacity-40"
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${currentPage === page
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-card border border-border hover:bg-secondary/40 text-muted-foreground"
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Position Specifications & Candidate Management Modal */}
      <AnimatePresence>
        {selectedPosition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedPosition(null);
                setModalTab("specifications");
                setCandidateSearchQuery("");
              }}
              className="fixed inset-0 bg-black backdrop-blur-sm cursor-pointer"
            />
            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl bg-card border border-border shadow-2xl rounded-2xl p-6 flex flex-col max-h-[88vh] overflow-y-auto custom-scrollbar z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground uppercase tracking-wider">{selectedPosition.title}</h2>
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" /> {selectedPosition.clientName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPositionToEdit(selectedPosition);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 border border-border"
                  >
                    <Edit className="w-3.5 h-3.5 text-primary" />
                    Edit Position
                  </button>
                  <button
                    onClick={() => setCandidateModalPosition(selectedPosition)}
                    className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Candidate
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPosition(null);
                      setModalTab("specifications");
                      setCandidateSearchQuery("");
                    }}
                    className="p-1.5 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-border"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center gap-4 border-b border-border mb-5">
                <button
                  onClick={() => setModalTab("specifications")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 ${
                    modalTab === "specifications"
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
                >
                  <FileText className="w-4 h-4" /> Specifications
                </button>
                <button
                  onClick={() => setModalTab("candidates")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 ${
                    modalTab === "candidates"
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
                >
                  <Users className="w-4 h-4" /> Candidates ({
                    Object.values(pipeline || {}).flat().filter((app: any) => app.job_role_id === selectedPosition.id).length
                  })
                </button>
              </div>

              {/* Tab 1: Specifications */}
              {modalTab === "specifications" && (
                <div className="space-y-6 flex-1">
                  <div className="grid grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-2xl border border-border/50">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Project</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{selectedPosition.projectName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hiring Status</p>
                      <div className="mt-1">{renderStatusBadge(selectedPosition.status)}</div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Openings Required</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{selectedPosition.positions_required}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location / Mode</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        {selectedPosition.location && selectedPosition.location.toLowerCase() !== selectedPosition.work_mode?.toLowerCase()
                          ? `${selectedPosition.location} (${formatWorkMode(selectedPosition.work_mode, selectedPosition.location)})`
                          : formatWorkMode(selectedPosition.work_mode, selectedPosition.location)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Skills Required</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{selectedPosition.skills || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Experience Required</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{selectedPosition.experience_required ? `${selectedPosition.experience_required} Years` : "Fresher / No bar"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Budget Details</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{selectedPosition.budget}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Project Timeline</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">Starts on {selectedPosition.projectStartDate} (Duration: {selectedPosition.projectDuration})</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Request Raised By</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{selectedPosition.raisedBy}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-4 space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Responsibilities & Job Scope
                    </p>
                    <div className="bg-secondary/15 p-4 rounded-xl border border-border/40 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedPosition.responsibilities}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Candidates List */}
              {modalTab === "candidates" && (
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search candidate name, skills, status..."
                        value={candidateSearchQuery}
                        onChange={(e) => setCandidateSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground shrink-0">
                      Total: {selectedPositionCandidates.length}
                    </span>
                  </div>

                  {selectedPositionCandidates.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-secondary/10 rounded-2xl border border-border/50">
                      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/40 mx-auto mb-3">
                        <Users className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1">No candidates found for this position</h4>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                        {candidateSearchQuery
                          ? "No candidates matched your search criteria. Try a different query."
                          : "Upload resumes or assign candidates directly to begin evaluation."}
                      </p>
                      <button
                        onClick={() => setCandidateModalPosition(selectedPosition)}
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-sm hover:bg-primary/90 transition-all inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Add Candidate Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                      {selectedPositionCandidates.map((cand: any) => (
                        <div
                          key={cand.id}
                          className="p-3.5 bg-card border border-border/70 rounded-xl hover:border-primary/40 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="space-y-1 min-w-0">
                            <span
                              onClick={() => navigate(`/candidates/${cand.candidate_id}`)}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer block truncate hover:underline"
                              title="View Candidate Details & Resume"
                            >
                              {cand.candidate_name || `Candidate #${cand.candidate_id}`}
                            </span>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {cand.candidate_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                                  {cand.candidate_email}
                                </span>
                              )}
                              {cand.candidate_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                                  {cand.candidate_phone}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCandidate(cand)}
                              className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5"
                              title="Edit Candidate"
                            >
                              <Edit className="w-3.5 h-3.5 text-primary" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setCandidateToDelete(cand)}
                              className="px-3 py-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold transition-colors flex items-center gap-1.5"
                              title="Remove Candidate from Position"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Candidate Modal */}
      <Modal
        open={!!editingCandidate}
        onClose={() => setEditingCandidate(null)}
        title="Edit Candidate Details"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Candidate Name</label>
            <input
              type="text"
              value={editCandidateForm.name}
              onChange={(e) => setEditCandidateForm({ ...editCandidateForm, name: e.target.value })}
              placeholder="Candidate Full Name"
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Email Address</label>
            <input
              type="email"
              value={editCandidateForm.email}
              onChange={(e) => setEditCandidateForm({ ...editCandidateForm, email: e.target.value })}
              placeholder="candidate@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={editCandidateForm.phone}
              onChange={(e) => setEditCandidateForm({ ...editCandidateForm, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setEditingCandidate(null)}
              disabled={savingCandidate}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCandidateEdit}
              disabled={savingCandidate}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {savingCandidate ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Candidate Confirmation Modal */}
      <Modal
        open={!!candidateToDelete}
        onClose={() => setCandidateToDelete(null)}
        title="Remove Candidate from Position"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove{" "}
            <strong className="text-foreground">{candidateToDelete?.candidate_name || "this candidate"}</strong>{" "}
            from <strong className="text-foreground">{selectedPosition?.title}</strong>? This will remove their application from this position.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCandidateToDelete(null)}
              disabled={deletingCandidate}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteCandidate}
              disabled={deletingCandidate}
              className="px-5 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs shadow-md hover:bg-destructive/90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {deletingCandidate ? "Removing..." : "Yes, Remove"}
            </button>
          </div>
        </div>
      </Modal>

      <AddOpenPositionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPositionCreated={(newRole) => {
          const client = companies.find((c) => c.id === newRole.company_id);
          setCandidateModalPosition({
            ...newRole,
            clientName: client ? client.name : "Client",
          });
        }}
      />

      <AddCandidateToPositionModal
        open={!!candidateModalPosition}
        onClose={() => setCandidateModalPosition(null)}
        position={candidateModalPosition}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["pipeline"] });
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
          queryClient.invalidateQueries({ queryKey: ["job-roles"] });
        }}
      />

      <EditOpenPositionModal
        open={!!positionToEdit}
        onClose={() => setPositionToEdit(null)}
        position={positionToEdit}
        onSuccess={() => {
          if (selectedPosition && positionToEdit && selectedPosition.id === positionToEdit.id) {
            setSelectedPosition(null);
          }
        }}
      />
    </motion.div>
  );
};

export default OpenPositions;
