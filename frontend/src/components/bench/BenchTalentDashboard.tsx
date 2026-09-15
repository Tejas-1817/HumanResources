import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserCheck,
  Hourglass,
  Briefcase,
  Search,
  Plus,
  Filter,
  ChevronDown,
  X,
  MoreVertical,
  Building2,
  Building,
  Mail,
  Phone,
  Calendar,
  LayoutGrid,
  LayoutList,
  Trash2,
  Edit,
  ExternalLink,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  AlertCircle,
  Clock,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import {
  getCandidates,
  getVendors,
  getJobRoles,
  getPipeline,
  deleteCandidate,
  createApplication,
  updateCandidate,
  Candidate,
  JobRole,
} from "@/api/resumeiq";
import { Modal } from "@/components/ui/Modal";
import { AddCandidateForm } from "@/components/forms/QuickActionForms";
import { toast } from "sonner";
import { formatJobRoleTitle } from "@/components/ui/TableDataCell";

// Helper for availability estimation based on candidate data or deterministic hash
const getAvailabilityStatus = (candidate: any): string => {
  if (candidate.availability) return candidate.availability;
  // Deterministic realistic availability for bench candidates
  const seed = (candidate.id || 1) % 3;
  if (seed === 0) return "Immediately";
  if (seed === 1) return "15 Days";
  return "30 Days";
};

export const BenchTalentDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [expFilters, setExpFilters] = useState<string[]>([]);
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const [appliedToFilters, setAppliedToFilters] = useState<string[]>([]);
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const [availabilityFilters, setAvailabilityFilters] = useState<string[]>([]);
  const [dateAddedFilter, setDateAddedFilter] = useState<string>("all");

  // Filter Dropdown Toggles
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [roleSearchQuery, setRoleSearchQuery] = useState("");

  // Sort & View State
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "exp-desc" | "exp-asc" | "recent">("recent");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Selection & Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals
  const [isAddTalentOpen, setIsAddTalentOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<any | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  // Quick Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    skills: "",
    experience_years: 0,
  });

  // Assign Modal Fields
  const [assignCompanyId, setAssignCompanyId] = useState<string>("");
  const [assignRoleId, setAssignRoleId] = useState<string>("");
  const [assignRemarks, setAssignRemarks] = useState<string>("");
  const [assignStartDate, setAssignStartDate] = useState<string>("");
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Dropdown reference for closing on click outside
  const filterBarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- QUERIES ---
  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ["candidates-hub", "unassigned"],
    queryFn: () =>
      getCandidates({
        page: 1,
        page_size: 1000,
        unassigned_only: true,
      }),
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
  });

  const { data: allJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["job-roles-all"],
    queryFn: () => getJobRoles(),
  });

  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => getPipeline(),
  });

  const pipeline = pipelineData ?? {};
  const rawCandidates = candidatesData?.items ?? [];
  const isLoading = candidatesLoading || vendorsLoading || jobsLoading || pipelineLoading;

  // Map of active application by candidate
  const appsByCandidate = useMemo(() => {
    const map = new Map<number, any>();
    const allApplications = Object.values(pipeline).flat();
    allApplications.forEach((app: any) => {
      if (!map.has(app.candidate_id)) map.set(app.candidate_id, app);
    });
    return map;
  }, [pipeline]);

  // Map of roles by ID
  const roleById = useMemo(() => new Map((allJobs || []).map((r: any) => [r.id, r])), [allJobs]);

  // Vendor map by ID
  const vendorById = useMemo(() => new Map((vendors || []).map((v: any) => [v.id, v])), [vendors]);

  // Enrich candidates with status, applied company/role, availability, and source
  const enrichedCandidates = useMemo(() => {
    return rawCandidates.map((c: any) => {
      const app = appsByCandidate.get(c.id);
      const job = app ? roleById.get(app.job_role_id) : null;
      const vendor = c.uploaded_by_vendor_id ? vendorById.get(c.uploaded_by_vendor_id) : null;

      // Status logic:
      // - Placed: candidate has application with status 'selected' or 'joined'
      // - Interviewing: candidate has application in active interview/shortlist process
      // - Available: candidate has no active restrictive application
      let benchStatus: "Available" | "Interviewing" | "Placed" = "Available";
      if (app) {
        if (app.status === "selected" || app.status === "joined") {
          benchStatus = "Placed";
        } else if (app.status !== "dropped" && app.status !== "rejected" && app.status !== "completed") {
          benchStatus = "Interviewing";
        }
      }

      const roleTitle = job ? job.title : (c.skills?.split(",")[0]?.trim() ? `${c.skills.split(",")[0].trim()} Specialist` : "Talent");
      const companyName = job ? (job.company_name || "Assigned Company") : null;
      const availability = getAvailabilityStatus(c);

      const sourceDisplay =
        c.source_vendor ||
        (vendor ? (vendor.company_name || vendor.name) : null) ||
        c.source_label ||
        (c.source === "vendor" ? "Partner Vendor" : (c.source || "Direct"));

      return {
        ...c,
        benchStatus,
        roleTitle,
        companyName,
        jobTitle: job ? job.title : null,
        availability,
        sourceDisplay,
      };
    });
  }, [rawCandidates, appsByCandidate, roleById, vendorById]);

  // Summary Metrics (dynamic and accurate)
  const stats = useMemo(() => {
    const total = enrichedCandidates.length;
    const available = enrichedCandidates.filter((c) => c.benchStatus === "Available").length;
    const interviewing = enrichedCandidates.filter((c) => c.benchStatus === "Interviewing").length;
    const placed = enrichedCandidates.filter((c) => c.benchStatus === "Placed").length;

    const availablePct = total > 0 ? Math.round((available / total) * 100) : 0;
    const interviewingPct = total > 0 ? Math.round((interviewing / total) * 100) : 0;
    const placedPct = total > 0 ? Math.round((placed / total) * 100) : 0;

    return { total, available, interviewing, placed, availablePct, interviewingPct, placedPct };
  }, [enrichedCandidates]);

  // Extract unique available values for filter dropdowns
  const availableFilterOptions = useMemo(() => {
    const rolesSet = new Set<string>();
    const skillsCountMap = new Map<string, number>();
    const appliedToSet = new Set<string>();
    const sourcesSet = new Set<string>();

    enrichedCandidates.forEach((c) => {
      if (c.roleTitle) rolesSet.add(c.roleTitle);
      if (c.companyName) appliedToSet.add(c.companyName);
      if (c.sourceDisplay) sourcesSet.add(c.sourceDisplay);

      if (c.skills) {
        c.skills
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .forEach((s: string) => {
            skillsCountMap.set(s, (skillsCountMap.get(s) || 0) + 1);
          });
      }
    });

    const sortedSkills = Array.from(skillsCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([skill]) => skill);

    return {
      roles: Array.from(rolesSet).sort(),
      skills: sortedSkills,
      appliedTo: Array.from(appliedToSet).sort(),
      sources: Array.from(sourcesSet).sort(),
    };
  }, [enrichedCandidates]);

  // Filter & Search Logic
  const filteredCandidates = useMemo(() => {
    return enrichedCandidates.filter((c) => {
      // Search
      if (debouncedSearch) {
        const name = (c.name || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const skills = (c.skills || "").toLowerCase();
        const role = (c.roleTitle || "").toLowerCase();
        const company = (c.companyName || "").toLowerCase();
        const source = (c.sourceDisplay || "").toLowerCase();

        const terms = debouncedSearch.split(" ").filter(Boolean);
        const matchesAllTerms = terms.every(
          (t) =>
            name.includes(t) ||
            email.includes(t) ||
            skills.includes(t) ||
            role.includes(t) ||
            company.includes(t) ||
            source.includes(t)
        );
        if (!matchesAllTerms) return false;
      }

      // Status filter
      if (statusFilters.length > 0 && !statusFilters.includes(c.benchStatus)) {
        return false;
      }

      // Job Role filter
      if (roleFilters.length > 0 && !roleFilters.includes(c.roleTitle)) {
        return false;
      }

      // Experience filter
      if (expFilters.length > 0) {
        const exp = c.experience_years || 0;
        const matchesExp = expFilters.some((filter) => {
          if (filter === "0-1") return exp <= 1;
          if (filter === "1-3") return exp > 1 && exp <= 3;
          if (filter === "3-5") return exp > 3 && exp <= 5;
          if (filter === "5+") return exp > 5;
          return false;
        });
        if (!matchesExp) return false;
      }

      // Skills filter
      if (skillFilters.length > 0) {
        const candSkills = (c.skills || "").toLowerCase();
        const hasSkill = skillFilters.some((s) => candSkills.includes(s.toLowerCase()));
        if (!hasSkill) return false;
      }

      // Applied To filter
      if (appliedToFilters.length > 0) {
        if (!c.companyName || !appliedToFilters.includes(c.companyName)) {
          return false;
        }
      }

      // Source filter
      if (sourceFilters.length > 0 && !sourceFilters.includes(c.sourceDisplay)) {
        return false;
      }

      // Availability filter
      if (availabilityFilters.length > 0 && !availabilityFilters.includes(c.availability)) {
        return false;
      }

      // Date added filter
      if (dateAddedFilter !== "all" && c.created_at) {
        const candidateDate = new Date(c.created_at).getTime();
        const now = Date.now();
        const diffDays = (now - candidateDate) / (1000 * 3600 * 24);
        if (dateAddedFilter === "7d" && diffDays > 7) return false;
        if (dateAddedFilter === "30d" && diffDays > 30) return false;
      }

      return true;
    });
  }, [
    enrichedCandidates,
    debouncedSearch,
    statusFilters,
    roleFilters,
    expFilters,
    skillFilters,
    appliedToFilters,
    sourceFilters,
    availabilityFilters,
    dateAddedFilter,
  ]);

  // Sorting
  const sortedCandidates = useMemo(() => {
    const list = [...filteredCandidates];
    list.sort((a, b) => {
      if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "exp-desc") return (b.experience_years || 0) - (a.experience_years || 0);
      if (sortBy === "exp-asc") return (a.experience_years || 0) - (b.experience_years || 0);
      // "recent" by created_at or id
      return (b.id || 0) - (a.id || 0);
    });
    return list;
  }, [filteredCandidates, sortBy]);

  // Pagination
  const totalItems = sortedCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCandidates.slice(start, start + pageSize);
  }, [sortedCandidates, currentPage, pageSize]);

  // Active Filters Count & List
  const activeFilterList = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];
    statusFilters.forEach((s) =>
      list.push({
        key: `status-${s}`,
        label: `Status: ${s}`,
        onRemove: () => setStatusFilters((prev) => prev.filter((item) => item !== s)),
      })
    );
    roleFilters.forEach((r) =>
      list.push({
        key: `role-${r}`,
        label: `Role: ${r}`,
        onRemove: () => setRoleFilters((prev) => prev.filter((item) => item !== r)),
      })
    );
    expFilters.forEach((e) =>
      list.push({
        key: `exp-${e}`,
        label: `Exp: ${e === "5+" ? "5+ years" : `${e} years`}`,
        onRemove: () => setExpFilters((prev) => prev.filter((item) => item !== e)),
      })
    );
    skillFilters.forEach((s) =>
      list.push({
        key: `skill-${s}`,
        label: `Skill: ${s}`,
        onRemove: () => setSkillFilters((prev) => prev.filter((item) => item !== s)),
      })
    );
    appliedToFilters.forEach((a) =>
      list.push({
        key: `app-${a}`,
        label: `Applied: ${a}`,
        onRemove: () => setAppliedToFilters((prev) => prev.filter((item) => item !== a)),
      })
    );
    sourceFilters.forEach((src) =>
      list.push({
        key: `src-${src}`,
        label: `Source: ${src}`,
        onRemove: () => setSourceFilters((prev) => prev.filter((item) => item !== src)),
      })
    );
    availabilityFilters.forEach((av) =>
      list.push({
        key: `av-${av}`,
        label: `Availability: ${av}`,
        onRemove: () => setAvailabilityFilters((prev) => prev.filter((item) => item !== av)),
      })
    );
    if (dateAddedFilter !== "all") {
      list.push({
        key: `date-${dateAddedFilter}`,
        label: dateAddedFilter === "7d" ? "Added: Last 7 Days" : "Added: Last 30 Days",
        onRemove: () => setDateAddedFilter("all"),
      });
    }
    return list;
  }, [
    statusFilters,
    roleFilters,
    expFilters,
    skillFilters,
    appliedToFilters,
    sourceFilters,
    availabilityFilters,
    dateAddedFilter,
  ]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilters([]);
    setRoleFilters([]);
    setExpFilters([]);
    setSkillFilters([]);
    setAppliedToFilters([]);
    setSourceFilters([]);
    setAvailabilityFilters([]);
    setDateAddedFilter("all");
    setCurrentPage(1);
  };

  // Bulk Selection Handlers
  const handleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    const allPageSelected = paginatedCandidates.every((c) => next.has(c.id));
    if (allPageSelected) {
      paginatedCandidates.forEach((c) => next.delete(c.id));
    } else {
      paginatedCandidates.forEach((c) => next.add(c.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const isAllPageSelected =
    paginatedCandidates.length > 0 && paginatedCandidates.every((c) => selectedIds.has(c.id));
  const isSomePageSelected =
    paginatedCandidates.some((c) => selectedIds.has(c.id)) && !isAllPageSelected;

  // Single / Bulk Delete Handlers
  const confirmDeleteCandidate = (candidate: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCandidateToDelete(candidate);
    setIsBulkDelete(false);
    setIsDeleteModalOpen(true);
  };

  const confirmBulkDelete = () => {
    setIsBulkDelete(true);
    setCandidateToDelete(null);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    try {
      if (isBulkDelete) {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map((id) => deleteCandidate(id)));
        toast.success(`Successfully removed ${ids.length} candidates from bench.`);
        setSelectedIds(new Set());
      } else if (candidateToDelete) {
        await deleteCandidate(candidateToDelete.id);
        toast.success(`Removed ${candidateToDelete.name} from bench.`);
        const next = new Set(selectedIds);
        next.delete(candidateToDelete.id);
        setSelectedIds(next);
      }
      await queryClient.invalidateQueries({ queryKey: ["candidates-hub"] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to remove candidate");
    }
  };

  // Assign to Position Mutation / Handler
  const executeAssign = async () => {
    if (!assignRoleId) {
      toast.error("Please select a target position / role");
      return;
    }
    const targetCandidateIds = isBulkAssignOpen && selectedIds.size > 0
      ? Array.from(selectedIds)
      : candidateToEdit?.id
      ? [candidateToEdit.id]
      : [];

    if (targetCandidateIds.length === 0) {
      toast.error("No candidate selected for assignment");
      return;
    }

    setAssigningLoading(true);
    try {
      await Promise.all(
        targetCandidateIds.map((cid) =>
          createApplication({
            candidate_id: cid,
            job_role_id: Number(assignRoleId),
            status: "pending",
            remarks: assignRemarks.trim() || undefined,
            start_date: assignStartDate || undefined,
          })
        )
      );
      toast.success(
        targetCandidateIds.length === 1
          ? "Candidate assigned to position successfully!"
          : `Assigned ${targetCandidateIds.length} candidates to position!`
      );
      setSelectedIds(new Set());
      setIsBulkAssignOpen(false);
      setAssignCompanyId("");
      setAssignRoleId("");
      setAssignRemarks("");
      setAssignStartDate("");
      await queryClient.invalidateQueries({ queryKey: ["candidates-hub"] });
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign candidates");
    } finally {
      setAssigningLoading(false);
    }
  };

  // Quick Edit Handlers
  const openEditModal = (candidate: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCandidateToEdit(candidate);
    setEditForm({
      name: candidate.name || "",
      email: candidate.email || "",
      phone: candidate.phone || "",
      skills: candidate.skills || "",
      experience_years: candidate.experience_years || 0,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateToEdit) return;
    try {
      await updateCandidate(candidateToEdit.id, {
        name: editForm.name.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        skills: editForm.skills.trim() || undefined,
        experience_years: Number(editForm.experience_years) || 0,
      });
      toast.success("Candidate details updated successfully!");
      setIsEditModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["candidates-hub"] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update candidate");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              On Bench Talent
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              Talent Pool
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, filter and track available talent across roles and opportunities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddTalentOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Talent</span>
          </button>
        </div>
      </div>

      {/* ── 2. SUMMARY CARDS (DYNAMIC METRICS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total On Bench */}
        <div
          onClick={() => setStatusFilters([])}
          className={`p-5 rounded-2xl bg-card border shadow-xs transition-all cursor-pointer group hover:shadow-md hover:border-indigo-500/40 ${
            statusFilters.length === 0 ? "border-border/60" : "border-border/40 opacity-85 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              TOTAL ON BENCH
            </p>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center ring-1 ring-indigo-500/20 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-foreground">{isLoading ? "..." : stats.total}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">All bench candidates</p>
          </div>
        </div>

        {/* Card 2: Available */}
        <div
          onClick={() => setStatusFilters(["Available"])}
          className={`p-5 rounded-2xl bg-card border shadow-xs transition-all cursor-pointer group hover:shadow-md hover:border-emerald-500/40 ${
            statusFilters.includes("Available") ? "ring-2 ring-emerald-500/30 border-emerald-500" : "border-border/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              AVAILABLE
            </p>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center ring-1 ring-emerald-500/20 group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-foreground">{isLoading ? "..." : stats.available}</p>
              {!isLoading && stats.total > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.availablePct}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Ready for opportunities</p>
          </div>
        </div>

        {/* Card 3: Interviewing */}
        <div
          onClick={() => setStatusFilters(["Interviewing"])}
          className={`p-5 rounded-2xl bg-card border shadow-xs transition-all cursor-pointer group hover:shadow-md hover:border-amber-500/40 ${
            statusFilters.includes("Interviewing") ? "ring-2 ring-amber-500/30 border-amber-500" : "border-border/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              INTERVIEWING
            </p>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center ring-1 ring-amber-500/20 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-foreground">{isLoading ? "..." : stats.interviewing}</p>
              {!isLoading && stats.total > 0 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {stats.interviewingPct}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Currently interviewing</p>
          </div>
        </div>

        {/* Card 4: Placed */}
        <div
          onClick={() => setStatusFilters(["Placed"])}
          className={`p-5 rounded-2xl bg-card border shadow-xs transition-all cursor-pointer group hover:shadow-md hover:border-blue-500/40 ${
            statusFilters.includes("Placed") ? "ring-2 ring-blue-500/30 border-blue-500" : "border-border/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              PLACED
            </p>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center ring-1 ring-blue-500/20 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-foreground">{isLoading ? "..." : stats.placed}</p>
              {!isLoading && stats.total > 0 && (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {stats.placedPct}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Successfully placed</p>
          </div>
        </div>
      </div>

      {/* ── 3. SEARCH & PRIMARY FILTER SYSTEM ── */}
      <div ref={filterBarRef} className="space-y-3 bg-card p-4 sm:p-5 rounded-2xl border border-border/60 shadow-xs">
        {/* Top Filter Bar: Search + Primary Dropdown Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Global Search Bar */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, skill, role, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-secondary/60 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Primary Filters Dropdown Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Status Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  statusFilters.length > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary"
                }`}
              >
                <span>Status</span>
                {statusFilters.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {statusFilters.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openDropdown === "status" && (
                <div className="absolute left-0 mt-2 w-48 rounded-xl bg-card border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="space-y-1">
                    {["Available", "Interviewing", "Placed"].map((status) => {
                      const checked = statusFilters.includes(status);
                      return (
                        <label
                          key={status}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer text-xs font-semibold select-none"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setStatusFilters((prev) =>
                                checked ? prev.filter((s) => s !== status) : [...prev, status]
                              );
                              setCurrentPage(1);
                            }}
                            className="rounded text-primary border-border focus:ring-primary/50"
                          />
                          <span>{status}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Job Role Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "role" ? null : "role")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  roleFilters.length > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary"
                }`}
              >
                <span>Job Role</span>
                {roleFilters.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {roleFilters.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openDropdown === "role" && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-card border border-border shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 mb-2 text-xs rounded-lg bg-secondary border border-border/50 focus:outline-none"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                    {availableFilterOptions.roles
                      .filter((r) => r.toLowerCase().includes(roleSearchQuery.toLowerCase()))
                      .map((role) => {
                        const checked = roleFilters.includes(role);
                        return (
                          <label
                            key={role}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary cursor-pointer text-xs font-medium select-none"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setRoleFilters((prev) =>
                                  checked ? prev.filter((r) => r !== role) : [...prev, role]
                                );
                                setCurrentPage(1);
                              }}
                              className="rounded text-primary border-border focus:ring-primary/50"
                            />
                            <span className="truncate">{role}</span>
                          </label>
                        );
                      })}
                    {availableFilterOptions.roles.length === 0 && (
                      <p className="text-xs text-muted-foreground p-2 text-center">No roles found</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Experience Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "exp" ? null : "exp")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  expFilters.length > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary"
                }`}
              >
                <span>Experience</span>
                {expFilters.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {expFilters.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openDropdown === "exp" && (
                <div className="absolute left-0 mt-2 w-48 rounded-xl bg-card border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="space-y-1">
                    {[
                      { id: "0-1", label: "0–1 years" },
                      { id: "1-3", label: "1–3 years" },
                      { id: "3-5", label: "3–5 years" },
                      { id: "5+", label: "5+ years" },
                    ].map((item) => {
                      const checked = expFilters.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer text-xs font-semibold select-none"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setExpFilters((prev) =>
                                checked ? prev.filter((e) => e !== item.id) : [...prev, item.id]
                              );
                              setCurrentPage(1);
                            }}
                            className="rounded text-primary border-border focus:ring-primary/50"
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Skills Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "skills" ? null : "skills")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  skillFilters.length > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary"
                }`}
              >
                <span>Skills</span>
                {skillFilters.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {skillFilters.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openDropdown === "skills" && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-card border border-border shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <input
                    type="text"
                    placeholder="Search skills (e.g. React)..."
                    value={skillSearchQuery}
                    onChange={(e) => setSkillSearchQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 mb-2 text-xs rounded-lg bg-secondary border border-border/50 focus:outline-none"
                  />
                  <div className="max-h-52 overflow-y-auto space-y-1 custom-scrollbar">
                    {availableFilterOptions.skills
                      .filter((s) => s.toLowerCase().includes(skillSearchQuery.toLowerCase()))
                      .map((skill) => {
                        const checked = skillFilters.includes(skill);
                        return (
                          <label
                            key={skill}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary cursor-pointer text-xs font-medium select-none"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSkillFilters((prev) =>
                                  checked ? prev.filter((s) => s !== skill) : [...prev, skill]
                                );
                                setCurrentPage(1);
                              }}
                              className="rounded text-primary border-border focus:ring-primary/50"
                            />
                            <span className="truncate">{skill}</span>
                          </label>
                        );
                      })}
                    {availableFilterOptions.skills.length === 0 && (
                      <p className="text-xs text-muted-foreground p-2 text-center">No skills available</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Applied To Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "applied" ? null : "applied")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  appliedToFilters.length > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary"
                }`}
              >
                <span>Applied To</span>
                {appliedToFilters.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {appliedToFilters.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openDropdown === "applied" && (
                <div className="absolute left-0 mt-2 w-60 rounded-xl bg-card border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                    {availableFilterOptions.appliedTo.map((comp) => {
                      const checked = appliedToFilters.includes(comp);
                      return (
                        <label
                          key={comp}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary cursor-pointer text-xs font-medium select-none"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setAppliedToFilters((prev) =>
                                checked ? prev.filter((a) => a !== comp) : [...prev, comp]
                              );
                              setCurrentPage(1);
                            }}
                            className="rounded text-primary border-border focus:ring-primary/50"
                          />
                          <span className="truncate">{comp}</span>
                        </label>
                      );
                    })}
                    {availableFilterOptions.appliedTo.length === 0 && (
                      <p className="text-xs text-muted-foreground p-2 text-center">No applications found</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Source Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "source" ? null : "source")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  sourceFilters.length > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary"
                }`}
              >
                <span>Source</span>
                {sourceFilters.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {sourceFilters.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openDropdown === "source" && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl bg-card border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                    {availableFilterOptions.sources.map((src) => {
                      const checked = sourceFilters.includes(src);
                      return (
                        <label
                          key={src}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary cursor-pointer text-xs font-medium select-none"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSourceFilters((prev) =>
                                checked ? prev.filter((s) => s !== src) : [...prev, src]
                              );
                              setCurrentPage(1);
                            }}
                            className="rounded text-primary border-border focus:ring-primary/50"
                          />
                          <span className="truncate">{src}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 7. More Filters Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "more" ? null : "more")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  availabilityFilters.length > 0 || dateAddedFilter !== "all"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>More Filters</span>
                {(availabilityFilters.length > 0 || dateAddedFilter !== "all") && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openDropdown === "more" && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-card border border-border shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Availability
                    </label>
                    <div className="space-y-1">
                      {["Immediately", "15 Days", "30 Days"].map((av) => {
                        const checked = availabilityFilters.includes(av);
                        return (
                          <label
                            key={av}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary cursor-pointer text-xs font-medium"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setAvailabilityFilters((prev) =>
                                  checked ? prev.filter((a) => a !== av) : [...prev, av]
                                );
                                setCurrentPage(1);
                              }}
                              className="rounded text-primary border-border focus:ring-primary/50"
                            />
                            <span>{av}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Date Added
                    </label>
                    <select
                      value={dateAddedFilter}
                      onChange={(e) => {
                        setDateAddedFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-secondary border border-border/60 focus:outline-none"
                    >
                      <option value="all">All Time</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. ACTIVE FILTER DISPLAY ── */}
        {(activeFilterList.length > 0 || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
              Filters:
            </span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20">
                <span>"{searchTerm}"</span>
                <button onClick={() => setSearchTerm("")} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeFilterList.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-foreground font-medium border border-border/60"
              >
                <span>{f.label}</span>
                <button onClick={f.onRemove} className="hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-primary hover:underline ml-auto pl-2 py-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ── 5. RESULTS HEADER (COUNT + SORTING + VIEW TOGGLE) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">
            {isLoading ? "Counting candidates..." : `${totalItems} candidate${totalItems === 1 ? "" : "s"} found`}
          </p>
          {selectedIds.size > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-card border border-border/60 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
            >
              <option value="recent">Recently Added</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="exp-desc">Experience: High → Low</option>
              <option value="exp-asc">Experience: Low → High</option>
            </select>
          </div>

          {/* Table / Card View Toggle */}
          <div className="flex items-center bg-secondary/60 p-0.5 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table View"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              title="Card View"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "card"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 8. BULK ACTION TOOLBAR (STICKY/FLOATING) ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="sticky top-4 z-40 p-3.5 rounded-2xl bg-card/95 backdrop-blur-md border border-primary/30 shadow-xl flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-primary text-primary-foreground font-black text-xs">
                {selectedIds.size} Selected
              </span>
              <p className="text-xs text-muted-foreground font-medium hidden sm:inline">
                Perform bulk action on selected bench talent
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkAssignOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Assign to Position</span>
              </button>

              <button
                type="button"
                onClick={confirmBulkDelete}
                className="px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-bold text-xs hover:bg-destructive/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove from Bench</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Deselect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6. CANDIDATE LIST (TABLE VIEW & CARD VIEW) ── */}
      {isLoading ? (
        // ── 10. LOADING SKELETON ──
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-card border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : paginatedCandidates.length === 0 ? (
        // ── 9. EMPTY STATE ──
        <div className="p-16 rounded-2xl bg-card border border-border/60 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No candidates found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try changing your search terms, adjusting experience range, or clearing active filters.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all mt-2"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        // ── DESKTOP & TABLET TABLE ──
        <div className="glass-card overflow-hidden border border-border/60 rounded-2xl bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/20">
                  <th className="py-3.5 px-2 text-center align-middle w-[3%]">
                    <button
                      type="button"
                      onClick={handleSelectAllOnPage}
                      className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center mx-auto"
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : isSomePageSelected ? (
                        <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-primary" />
                        </div>
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 pl-3 pr-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left align-middle w-[19%]">
                    Candidate
                  </th>
                  <th className="py-3.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left align-middle w-[13%]">
                    Role
                  </th>
                  <th className="py-3.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left align-middle w-[8%]">
                    Experience
                  </th>
                  <th className="py-3.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left align-middle w-[16%]">
                    Skills
                  </th>
                  <th className="py-3.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left align-middle w-[13%]">
                    Applied To
                  </th>
                  <th className="py-3.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center align-middle w-[7%]">
                    Availability
                  </th>
                  <th className="py-3.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center align-middle w-[7%]">
                    Status
                  </th>
                  <th className="py-3.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center align-middle w-[7%]">
                    Source
                  </th>
                  <th className="py-3.5 pr-3 pl-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center align-middle w-[7%]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/40 text-sm">
                {paginatedCandidates.map((c: any) => {
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/candidates/${c.id}`)}
                      className={`hover:bg-secondary/30 transition-colors cursor-pointer group ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-2 align-middle text-center" onClick={(e) => handleToggleSelectOne(c.id, e)}>
                        <button type="button" className="text-muted-foreground hover:text-primary flex items-center justify-center mx-auto">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* Candidate Avatar + Name + Email */}
                      <td className="py-3.5 pl-3 pr-2 align-middle text-left">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 transition-transform group-hover:scale-105">
                            {c.name
                              ?.split(" ")
                              .filter(Boolean)
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "??"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-2.5 align-middle text-left">
                        <p className="text-xs font-bold text-foreground truncate" title={c.roleTitle}>
                          {c.roleTitle}
                        </p>
                      </td>

                      {/* Experience */}
                      <td className="py-3.5 px-2.5 align-middle text-left">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-secondary/70 border border-border/60 text-xs font-bold text-foreground whitespace-nowrap">
                          {c.experience_years ? `${c.experience_years} yrs` : "0 yrs"}
                        </span>
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-2.5 align-middle text-left">
                        <div className="flex flex-wrap gap-1 items-center">
                          {(c.skills || "")
                            .split(",")
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((s: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20 whitespace-nowrap"
                              >
                                {s}
                              </span>
                            ))}
                          {(c.skills || "").split(",").filter(Boolean).length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-bold px-1">
                              +{(c.skills || "").split(",").filter(Boolean).length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Applied To */}
                      <td className="py-3.5 px-2.5 align-middle text-left">
                        {c.companyName ? (
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                              <Building2 className="w-3.5 h-3.5 text-primary opacity-70 shrink-0" />
                              <span className="truncate" title={c.companyName}>{c.companyName}</span>
                            </div>
                            {c.jobTitle && (
                              <p className="text-[10px] text-muted-foreground truncate pl-5" title={c.jobTitle}>
                                {formatJobRoleTitle(c.jobTitle)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary/50 text-[11px] font-semibold text-muted-foreground border border-border/40">
                            Bench
                          </span>
                        )}
                      </td>

                      {/* Availability */}
                      <td className="py-3.5 px-2 align-middle text-center">
                        <div className="flex justify-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-foreground border border-border/60 whitespace-nowrap">
                            {c.availability}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-2 align-middle text-center">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border whitespace-nowrap ${
                              c.benchStatus === "Available"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : c.benchStatus === "Interviewing"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.benchStatus === "Available"
                                  ? "bg-emerald-500"
                                  : c.benchStatus === "Interviewing"
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-blue-500"
                              }`}
                            />
                            {c.benchStatus}
                          </span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-2 align-middle text-center">
                        <div className="flex justify-center">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-secondary/80 text-[10px] font-semibold text-muted-foreground truncate max-w-full" title={c.sourceDisplay}>
                            {c.sourceDisplay}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 pr-3 pl-2 align-middle text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCandidateToEdit(c);
                              setIsBulkAssignOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Assign to Position"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openEditModal(c, e)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            title="Edit Candidate"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => confirmDeleteCandidate(c, e)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove from Bench"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // ── 7. CARD VIEW (MOBILE & TOGGLE) ──
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCandidates.map((c: any) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/candidates/${c.id}`)}
                className={`p-4 rounded-2xl bg-card border transition-all cursor-pointer group hover:shadow-md space-y-3 ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-border/60 hover:border-border"
                }`}
              >
                {/* Header: Avatar, Name, Checkbox, Menu */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelectOne(c.id, e)}
                      className="text-muted-foreground hover:text-primary shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {c.name
                        ?.split(" ")
                        .filter(Boolean)
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "??"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {c.name}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      c.benchStatus === "Available"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : c.benchStatus === "Interviewing"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    }`}
                  >
                    {c.benchStatus}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Role:</span>
                    <p className="font-bold text-foreground truncate mt-0.5">{c.roleTitle}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Experience:</span>
                    <p className="font-bold text-foreground mt-0.5">{c.experience_years || 0} yrs</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Availability:</span>
                    <p className="font-semibold text-foreground mt-0.5">{c.availability}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Source:</span>
                    <p className="font-semibold text-muted-foreground truncate mt-0.5">{c.sourceDisplay}</p>
                  </div>
                </div>

                {/* Applied To */}
                {c.companyName && (
                  <div className="p-2 rounded-xl bg-secondary/50 border border-border/40 text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                      Applied To:
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
                      <Building2 className="w-3.5 h-3.5 text-primary opacity-70 shrink-0" />
                      <span className="truncate">{c.companyName}</span>
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(c.skills || "")
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((s: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20 whitespace-nowrap"
                      >
                        {s}
                      </span>
                    ))}
                </div>

                {/* Footer Actions */}
                <div
                  className="flex items-center justify-between pt-2 border-t border-border/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/candidates/${c.id}`)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCandidateToEdit(c);
                        setIsBulkAssignOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Assign to Position"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => openEditModal(c, e)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => confirmDeleteCandidate(c, e)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 11. PAGINATION CONTROLS ── */}
      {!isLoading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg bg-card border border-border/60 text-foreground font-semibold"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-card border border-border/60 font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 font-bold text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-card border border-border/60 font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── 9. MODALS ── */}

      {/* 1. Add Talent Modal */}
      <Modal open={isAddTalentOpen} onClose={() => setIsAddTalentOpen(false)} title="Add Talent to Bench">
        <AddCandidateForm
          onSuccess={() => {
            setIsAddTalentOpen(false);
            queryClient.invalidateQueries({ queryKey: ["candidates-hub"] });
            queryClient.invalidateQueries({ queryKey: ["candidates"] });
          }}
        />
      </Modal>

      {/* 2. Assign to Position Modal */}
      <Modal
        open={isBulkAssignOpen}
        onClose={() => {
          setIsBulkAssignOpen(false);
          setCandidateToEdit(null);
        }}
        title="Assign Talent to Position"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-muted-foreground">
            Assign {candidateToEdit ? candidateToEdit.name : `${selectedIds.size} selected candidate(s)`} to an open role / project.
          </p>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Select Company *</label>
            <select
              value={assignCompanyId}
              onChange={(e) => {
                setAssignCompanyId(e.target.value);
                setAssignRoleId("");
              }}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">-- Choose Company --</option>
              {Array.from(new Set(allJobs.map((j: any) => j.company_name))).map((compName: any) => (
                <option key={compName} value={compName}>
                  {compName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Select Job Role / Project *</label>
            <select
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">-- Choose Job Role --</option>
              {allJobs
                .filter((j: any) => !assignCompanyId || j.company_name === assignCompanyId)
                .map((job: any) => (
                  <option key={job.id} value={job.id}>
                    {job.company_name ? `${job.company_name} - ` : ""}
                    {job.title}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Target Start Date</label>
              <input
                type="date"
                value={assignStartDate}
                onChange={(e) => setAssignStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Remarks / Notes</label>
              <input
                type="text"
                placeholder="Optional assignment note..."
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBulkAssignOpen(false)}
              className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={assigningLoading || !assignRoleId}
              onClick={executeAssign}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {assigningLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Assignment</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Quick Edit Candidate Modal */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Talent Details">
        <form onSubmit={handleSaveEdit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Name *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Email *</label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Phone</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Experience (Years)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={editForm.experience_years}
              onChange={(e) => setEditForm({ ...editForm, experience_years: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Skills (comma separated)</label>
            <input
              type="text"
              value={editForm.skills}
              onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Delete Confirmation Modal */}
      <Modal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Remove Candidate from Bench">
        <div className="space-y-3 text-left">
          <p className="text-sm text-foreground">
            {isBulkDelete
              ? `Are you sure you want to remove ${selectedIds.size} candidates from the bench?`
              : `Are you sure you want to remove ${candidateToDelete?.name} from the bench?`}
          </p>
          <p className="text-xs text-muted-foreground">
            This action will permanently delete this candidate record from the talent pool.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeDelete}
              className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-all"
            >
              Confirm Removal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
