import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Building2,
  Edit,
  Trash2,
  Briefcase,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  GripVertical,
  User,
  X,
  Users,
  GitBranch,
  Clock,
  ExternalLink,
  MessageSquare,
  Save,
  UserCheck,
  Eye,
  ChevronDown,
  Check,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { AssignVendorDropdown } from "@/components/modals/AssignVendorDropdown";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Company,
  Candidate,
  createCompany,
  deleteCompany,
  getCompanies,
  getCandidates,
  getJobRoles,
  getPipeline,
  updateCompany,
  createJobRole,
  updateJobRole,
  deleteJobRole,
  updatePipelineStatus,
  getVendors,
  PipelineStage,
} from "@/api/resumeiq";

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────
const CANDIDATES_PAGE_SIZE = 8;

const experienceRanges = [
  { label: "All", min: 0, max: Infinity },
  { label: "0-2 yrs", min: 0, max: 2 },
  { label: "2-5 yrs", min: 2, max: 5 },
  { label: "5-10 yrs", min: 5, max: 10 },
  { label: "10+", min: 10, max: Infinity },
];

const DEFAULT_STAGES = [
  { id: "pending", title: "Pending", color: "bg-slate-400", bgGlow: "from-slate-400/10" },
  { id: "shortlisted", title: "Shortlisted", color: "bg-primary", bgGlow: "from-primary/10" },
  { id: "interview_scheduled", title: "Interview", color: "bg-amber-500", bgGlow: "from-amber-500/10" },
  { id: "interviewed", title: "Interviewed", color: "bg-orange-500", bgGlow: "from-orange-500/10" },
  { id: "on_hold", title: "On Hold", color: "bg-orange-400", bgGlow: "from-orange-400/10" },
  { id: "rejected", title: "Rejected", color: "bg-destructive", bgGlow: "from-destructive/10" },
  { id: "selected", title: "Selected", color: "bg-emerald-500", bgGlow: "from-emerald-500/10" },
  { id: "dropped", title: "Dropped", color: "bg-zinc-400", bgGlow: "from-zinc-400/10" },
];

const getStatusFromAge = (c: Candidate): string => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000));
  if (days <= 1) return "New";
  if (days <= 7) return "Screening";
  return "Review";
};

const getRoleTags = (r: any) => {
  const title = r.title.toLowerCase();
  const tags: string[] = [];

  if (title.includes("general")) {
    return ["— General positions and unassigned roles"];
  }

  if (title.includes("python")) {
    tags.push("Python", "Django");
  } else if (title.includes("outreach")) {
    tags.push("Sales", "CRM");
  } else if (title.includes("devops")) {
    tags.push("AWS", "Docker");
  } else if (title.includes("tester")) {
    tags.push("QA", "Testing");
  } else if (title.includes("accountant")) {
    tags.push("Finance", "Tally");
  } else if (title.includes("hr") || title.includes("human resources")) {
    tags.push("HR", "People Mgmt.");
  } else if (title.includes("ui") || title.includes("ux") || title.includes("design")) {
    tags.push("Figma", "Adobe XD");
  } else if (title.includes("data") || title.includes("analyst")) {
    tags.push("SQL", "Excel");
  } else {
    tags.push(r.title);
  }

  if (r.experience_required != null && r.experience_required !== "") {
    const exp = r.experience_required;
    if (typeof exp === "number") {
      tags.push(`${exp}+ Yrs`);
    } else {
      tags.push(String(exp).includes("Yrs") ? exp : `${exp} Yrs`);
    }
  } else {
    // Fallbacks matching the design mock image
    if (title.includes("outreach")) tags.push("1-2 Yrs");
    else if (title.includes("python") || title.includes("devops")) tags.push("3+ Yrs");
    else if (title.includes("ui") || title.includes("ux") || title.includes("design")) tags.push("2-4 Yrs");
    else tags.push("2-3 Yrs");
  }
  return tags;
};

const getRoleIconDetails = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("python") || t.includes("developer") || t.includes("engineer") || t.includes("devops")) {
    if (t.includes("python")) {
      return {
        icon: Briefcase,
        bg: "bg-blue-50 dark:bg-blue-950/30",
        text: "text-blue-600 dark:text-blue-400",
        border: "border border-blue-100 dark:border-blue-900/50"
      };
    }
    if (t.includes("devops")) {
      return {
        icon: Briefcase,
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-600 dark:text-amber-400",
        border: "border border-amber-100 dark:border-amber-900/50"
      };
    }
    return {
      icon: Briefcase,
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "border border-blue-100 dark:border-blue-900/50"
    };
  }
  if (t.includes("outreach") || t.includes("sales") || t.includes("marketing")) {
    return {
      icon: Briefcase,
      bg: "bg-purple-50 dark:bg-purple-950/30",
      text: "text-purple-600 dark:text-purple-400",
      border: "border border-purple-100 dark:border-purple-900/50"
    };
  }
  if (t.includes("general")) {
    return {
      icon: GitBranch,
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border border-emerald-100 dark:border-emerald-900/50"
    };
  }
  if (t.includes("hr") || t.includes("human resources") || t.includes("recruiter")) {
    return {
      icon: Clock,
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border border-amber-100 dark:border-amber-900/50"
    };
  }
  if (t.includes("accountant") || t.includes("finance") || t.includes("billing")) {
    return {
      icon: Users,
      bg: "bg-rose-50 dark:bg-rose-950/30",
      text: "text-rose-600 dark:text-rose-400",
      border: "border border-rose-100 dark:border-rose-900/50"
    };
  }
  if (t.includes("ui") || t.includes("ux") || t.includes("design") || t.includes("frontend")) {
    return {
      icon: GitBranch,
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border border-cyan-100 dark:border-cyan-900/50"
    };
  }
  if (t.includes("data") || t.includes("analyst") || t.includes("analytics")) {
    return {
      icon: Briefcase,
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border border-indigo-100 dark:border-indigo-900/50"
    };
  }
  return {
    icon: Briefcase,
    bg: "bg-gray-50 dark:bg-gray-950/30",
    text: "text-gray-600 dark:text-gray-400",
    border: "border border-gray-100 dark:border-gray-900/50"
  };
};

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
const Companies = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ─── Data queries ──────────────────────────────────────
  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: () => getCompanies() });
  const { data: jobRolesData } = useQuery({ queryKey: ["job-roles"], queryFn: () => getJobRoles() });
  const { data: pipelineData } = useQuery({ queryKey: ["pipeline"], queryFn: () => getPipeline() });
  const { data: vendorsData } = useQuery({ queryKey: ["vendors"], queryFn: () => getVendors() });

  const companies = companiesData ?? [];
  const jobRoles = jobRolesData ?? [];
  const pipeline = pipelineData ?? {};
  const vendors = (vendorsData ?? []).filter(v => v.is_active);

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const roleById = useMemo(() => new Map(jobRoles.map((r) => [r.id, r])), [jobRoles]);

  // ─── Selection state ──────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const companyParam = searchParams.get("id");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    companyParam ? parseInt(companyParam) : null
  );

  // ─── Default Selection ────────────────────────────────────
  // Removed auto-selection to allow showing the grid when no company is explicitly selected
  useEffect(() => {
    if (companyParam) {
      const id = parseInt(companyParam);
      if (!isNaN(id)) {
        setSelectedCompanyId(id);
      }
    } else {
      setSelectedCompanyId(null);
    }
  }, [companyParam]);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      openAddCompany();
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [activeTab, setActiveTab] = useState<"roles" | "candidates" | "pipeline">(() => {
    return (sessionStorage.getItem("companies_active_tab") as any) || "roles";
  });

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    sessionStorage.setItem("companies_active_tab", tab);
  };

  // ─── Company Search state ─────────────────────────────
  const [companySearch, setCompanySearch] = useState("");


  // ─── Company CRUD state ───────────────────────────────
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: "", location: "" });

  // ─── Job Roles state ──────────────────────────────────
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ title: "", description: "", deadline: "", estimated_budget: "", currency: "INR", positions_required: "" as number | string, pipeline_stages: [...DEFAULT_STAGES], location: "", work_mode: "onsite", experience_required: "" as number | string, project_time_period: "" });
  const [roleFilter, setRoleFilter] = useState("All");
  const [confirmRoleId, setConfirmRoleId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<"close" | "reopen">("close");
  const [roleDeleteId, setRoleDeleteId] = useState<number | null>(null);
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [isAssignVendorOpen, setIsAssignVendorOpen] = useState(false);

  // ─── Candidates state ─────────────────────────────────
  const [candSearch, setCandSearch] = useState("");
  const [candPage, setCandPage] = useState(1);
  const [candExpFilter, setCandExpFilter] = useState(0);
  const [candSkillFilter, setCandSkillFilter] = useState("");
  const [candFiltersOpen, setCandFiltersOpen] = useState(false);

  // ─── Pipeline state ───────────────────────────────────
  const [pipelineRoleFilter, setPipelineRoleFilter] = useState<number | "all" | null>(null);
  const [draggedCard, setDraggedCard] = useState<{ id: number; fromCol: string; name: string; currentInterviewDate?: string } | null>(null);
  const [draggedStageIdx, setDraggedStageIdx] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [schedulingData, setSchedulingData] = useState<{ id: number; stageId: string; name: string } | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewNote, setInterviewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [viewingNoteId, setViewingNoteId] = useState<number | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalData, setNoteModalData] = useState<{ id: number; status: string; initialValue: string } | null>(null);
  const [noteValue, setNoteValue] = useState("");

  // ──────────────────────────────────────────────────────────
  // Derived data
  // ──────────────────────────────────────────────────────────
  const selectedCompany = selectedCompanyId ? companyById.get(selectedCompanyId) ?? null : null;

  // Roles per company (count)
  const roleCountByCompany = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of jobRoles) m.set(r.company_id, (m.get(r.company_id) || 0) + 1);
    return m;
  }, [jobRoles]);
  const openRoleCountByCompany = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of jobRoles) if (r.status === "open") m.set(r.company_id, (m.get(r.company_id) || 0) + 1);
    return m;
  }, [jobRoles]);

  // Candidates count per company (from pipeline/applications)
  const candidateCountByCompany = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const apps of Object.values(pipeline)) {
      for (const app of apps) {
        const role = roleById.get(app.job_role_id);
        const cid = role?.company_id ?? 0;
        if (!m.has(cid)) m.set(cid, new Set());
        m.get(cid)!.add(app.candidate_id);
      }
    }
    return new Map([...m].map(([k, v]) => [k, v.size]));
  }, [pipeline, roleById]);

  // Total positions filled and required per company
  const positionsFilledByCompany = useMemo(() => {
    const m = new Map<number, { filled: number, required: number }>();

    for (const r of jobRoles) {
      const cid = r.company_id;
      const filledCount = (pipeline["selected"] || []).filter((app: any) => app.job_role_id === r.id).length;
      const requiredCount = r.positions_required || 0;

      if (!m.has(cid)) {
        m.set(cid, { filled: 0, required: 0 });
      }
      const val = m.get(cid)!;
      val.filled += filledCount;
      val.required += requiredCount;
    }

    return m;
  }, [jobRoles, pipeline]);



  // Filtered roles for selected company
  const companyRoles = useMemo(() => {
    if (!selectedCompanyId) return [];
    const roles = jobRoles.filter((r) => r.company_id === selectedCompanyId);

    // Map each role to include its computed status and filled count
    const rolesWithComputedStatus = roles.map(r => {
      const filledCount = (pipeline["selected"] || []).filter((app: any) => app.job_role_id === r.id).length;

      let computedStatus = "open";
      if (r.status.toLowerCase() === "closed") {
        computedStatus = "closed";
      } else {
        const inProgressStages = ["shortlisted", "interview_scheduled", "interviewed", "on_hold"];
        const hasActiveCandidates = inProgressStages.some(stage =>
          (pipeline[stage] || []).some((app: any) => app.job_role_id === r.id)
        );
        if (hasActiveCandidates) {
          computedStatus = "in progress";
        }
      }

      return {
        ...r,
        filledCount,
        computedStatus
      };
    });

    if (roleFilter === "All") return rolesWithComputedStatus;
    return rolesWithComputedStatus.filter((r) => r.computedStatus.toLowerCase() === roleFilter.toLowerCase());
  }, [jobRoles, selectedCompanyId, roleFilter, pipeline]);

  // Auto-select first job role when Pipeline tab is entered
  useEffect(() => {
    if (activeTab === "pipeline" && selectedCompanyId && !pipelineRoleFilter && companyRoles.length > 0) {
      setPipelineRoleFilter("all");
    }
  }, [activeTab, selectedCompanyId, pipelineRoleFilter, companyRoles]);
  // Filtered pipeline for selected company
  const companyPipelineColumns = useMemo(() => {
    if (!selectedCompanyId) return [];

    // If no role is selected, return empty columns as per strict requirement
    if (!pipelineRoleFilter) {
      return DEFAULT_STAGES.map((stage) => ({
        ...stage,
        cards: [],
      }));
    }

    // Use stages from filtered role, or default if none/multiple
    const activeRole = pipelineRoleFilter && pipelineRoleFilter !== "all" ? roleById.get(pipelineRoleFilter) : null;
    const stagesToUse = activeRole?.pipeline_stages || DEFAULT_STAGES;

    return stagesToUse.map((stage) => ({
      ...stage,
      cards: (pipeline[stage.id] || [])
        .map((app: any) => {
          const role = roleById.get(app.job_role_id);
          const companyId = role?.company_id ?? 0;
          const days = Math.max(0, Math.floor((Date.now() - new Date(app.created_at).getTime()) / 86400000));
          const timeInStage = days === 0 ? "Today" : `${days}d ago`;
          const skillsList = (app.skills || "").split(",").map((s: string) => s.trim()).filter(Boolean);
          return {
            id: app.id,
            candidateId: app.candidate_id,
            name: app.candidate_name || `Candidate #${app.candidate_id}`,
            role: role?.title || `Role #${app.job_role_id}`,
            experience: app.experience_years || 0,
            skills: skillsList.slice(0, 2),
            hasMoreSkills: skillsList.length > 2,
            timeInStage,
            roleId: app.job_role_id,
            companyId,
            isReplacement: app.is_replacement,
            createdAt: app.created_at,
            interviewDate: app.interview_date,
            statusDate: app.status_date,
            remarks: app.remarks,
          };
        })
        .filter((c: any) => {
          const isMatch = pipelineRoleFilter === "all"
            ? c.companyId === selectedCompanyId
            : (c.companyId === selectedCompanyId && c.roleId === pipelineRoleFilter);

          if (!isMatch) return false;

          const isFinalStage = ["selected", "rejected", "dropped"].includes(stage.id.toLowerCase());
          if (isFinalStage && c.statusDate) {
            const days = Math.max(0, Math.floor((Date.now() - new Date(c.statusDate).getTime()) / 86400000));
            if (days > 7) {
              return false;
            }
          }
          return true;
        }),
    }));
  }, [pipeline, roleById, selectedCompanyId, pipelineRoleFilter]);



  const pipelineTotal = companyPipelineColumns.reduce((s, c) => s + c.cards.length, 0);

  const pipelineTotalCount = useMemo(() => {
    if (!selectedCompanyId) return 0;
    let total = 0;
    Object.entries(pipeline).forEach(([stageId, list]: [string, any]) => {
      if (["selected", "rejected", "dropped"].includes(stageId.toLowerCase())) {
        return;
      }
      list.forEach((app: any) => {
        const role = roleById.get(app.job_role_id);
        if (role?.company_id === selectedCompanyId) {
          total++;
        }
      });
    });
    return total;
  }, [pipeline, selectedCompanyId, roleById]);

  // Candidates query for selected company
  const { data: candData, isLoading: candLoading } = useQuery({
    queryKey: ["candidates-hub", selectedCompanyId, candSearch, candSkillFilter, candExpFilter, candPage],
    queryFn: () => {
      let combinedSearch = candSearch.trim();
      const st = candSkillFilter.trim();
      if (st) combinedSearch = combinedSearch ? `${combinedSearch} ${st}` : st;
      const range = experienceRanges[candExpFilter];
      return getCandidates({
        search: combinedSearch || undefined,
        page: candPage,
        page_size: CANDIDATES_PAGE_SIZE,
        company_id: selectedCompanyId ?? undefined,
        min_experience: range?.min > 0 ? range.min : undefined,
        max_experience: range?.max !== Infinity ? range.max : undefined,
      });
    },
    enabled: !!selectedCompanyId,
  });
  const candItems = candData?.items ?? [];
  const candTotal = candData?.total ?? 0;
  const candTotalPages = Math.max(1, Math.ceil(candTotal / CANDIDATES_PAGE_SIZE));

  // ──────────────────────────────────────────────────────────
  // Company CRUD handlers
  // ──────────────────────────────────────────────────────────
  const openAddCompany = () => { setEditId(null); setCompanyForm({ name: "", location: "" }); setCompanyModalOpen(true); };
  const openEditCompany = (c: Company) => { setEditId(c.id); setCompanyForm({ name: c.name, location: c.location || "" }); setCompanyModalOpen(true); };
  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) { toast.error("Company name is required"); return; }
    try {
      if (editId) {
        await updateCompany(editId, { name: companyForm.name.trim(), location: companyForm.location.trim() || null });
        toast.success("Company updated");
      } else {
        await createCompany({ name: companyForm.name.trim(), location: companyForm.location.trim() || null });
        toast.success("Company added");
      }
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      setCompanyModalOpen(false);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { message?: string } } };
      toast.error(maybe.response?.data?.message || "Failed to save company");
    }
  };
  const handleDeleteCompany = async () => {
    if (!deleteId) return;
    try {
      await deleteCompany(deleteId);
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company removed");
      if (selectedCompanyId === deleteId) setSelectedCompanyId(null);
      setDeleteId(null);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { message?: string } } };
      toast.error(maybe.response?.data?.message || "Cannot delete company");
    }
  };

  // ──────────────────────────────────────────────────────────
  // Job Role handlers
  // ──────────────────────────────────────────────────────────
  const handleCreateRole = async () => {
    if (!roleForm.title.trim() || !selectedCompanyId) {
      toast.error("Please fill in the job title");
      return;
    }
    await createJobRole({
      title: roleForm.title.trim(),
      description: roleForm.description.trim(),
      company_id: selectedCompanyId!,
      status: "open",
      deadline: roleForm.deadline || null,
      estimated_budget: roleForm.estimated_budget ? parseFloat(roleForm.estimated_budget as string) : undefined,
      currency: roleForm.currency,
      positions_required: isNaN(parseInt(roleForm.positions_required.toString())) ? 0 : parseInt(roleForm.positions_required.toString()),
      pipeline_stages: roleForm.pipeline_stages,
      location: roleForm.location.trim() || null,
      work_mode: roleForm.work_mode || null,
      experience_required: roleForm.experience_required !== "" ? parseFloat(roleForm.experience_required.toString()) : null,
      project_time_period: roleForm.project_time_period.trim() || null,
      vendor_ids: selectedVendorIds,
    });
    await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
    setRoleModalOpen(false);
    setRoleForm({ title: "", description: "", deadline: "", estimated_budget: "", currency: "INR", positions_required: "", pipeline_stages: [...DEFAULT_STAGES], location: "", work_mode: "onsite", experience_required: "", project_time_period: "" });
    toast.success("Job role created");
    window.location.reload();
  };

  const handleUpdateRole = async () => {
    if (!editRoleId || !roleForm.title.trim()) {
      toast.error("Please fill in the job title");
      return;
    }
    setUpdatingRole(true);
    try {
      await updateJobRole(editRoleId!, {
        title: roleForm.title.trim(),
        description: roleForm.description.trim(),
        deadline: roleForm.deadline || null,
        estimated_budget: roleForm.estimated_budget ? parseFloat(roleForm.estimated_budget as string) : undefined,
        currency: roleForm.currency,
        positions_required: isNaN(parseInt(roleForm.positions_required.toString())) ? 0 : parseInt(roleForm.positions_required.toString()),
        location: roleForm.location.trim() || null,
        work_mode: roleForm.work_mode || null,
        experience_required: roleForm.experience_required !== "" ? parseFloat(roleForm.experience_required.toString()) : null,
        project_time_period: roleForm.project_time_period.trim() || null,
        vendor_ids: selectedVendorIds,
      });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      setRoleModalOpen(false);
      setEditRoleId(null);
      toast.success("Job role updated");
      window.location.reload();
    } catch {
      toast.error("Failed to update job role");
    } finally {
      setUpdatingRole(false);
    }
  };

  const openAddRole = () => {
    setEditRoleId(null);
    setSelectedVendorIds([]);
    setRoleForm({ title: "", description: "", deadline: "", estimated_budget: "", currency: "INR", positions_required: "", pipeline_stages: [...DEFAULT_STAGES], location: "", work_mode: "onsite", experience_required: "", project_time_period: "" });
    setRoleModalOpen(true);
  };

  const openEditRole = (r: any) => {
    setEditRoleId(r.id);
    setRoleForm({
      title: r.title,
      description: r.description,
      deadline: r.deadline || "",
      estimated_budget: r.estimated_budget?.toString() || "",
      currency: r.currency || "INR",
      positions_required: r.positions_required !== undefined && r.positions_required !== null ? r.positions_required : 0,
      pipeline_stages: r.pipeline_stages || [...DEFAULT_STAGES],
      location: r.location || "",
      work_mode: r.work_mode || "onsite",
      experience_required: r.experience_required !== null && r.experience_required !== undefined ? r.experience_required : "",
      project_time_period: r.project_time_period || "",
    });
    setSelectedVendorIds([]); // Reset for edit as we don't have current assignments in basic list
    setRoleModalOpen(true);
  };
  const handleToggleRole = async () => {
    if (!confirmRoleId) return;
    setUpdatingRole(true);
    try {
      const newStatus = confirmAction === "close" ? "closed" : "open";
      await updateJobRole(confirmRoleId, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      setConfirmRoleId(null);
      toast.success(`Job role ${newStatus}`);
      window.location.reload();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleDeleteId) return;
    try {
      await deleteJobRole(roleDeleteId);
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      setRoleDeleteId(null);
      toast.success("Job role deleted");
      window.location.reload();
    } catch {
      toast.error("Failed to delete role");
    }
  };

  // ──────────────────────────────────────────────────────────
  // Pipeline management handlers
  // ──────────────────────────────────────────────────────────
  const handleStageReorder = async (fromIdx: number, toIdx: number) => {
    if (!pipelineRoleFilter || fromIdx === toIdx) return;
    const role = roleById.get(pipelineRoleFilter);
    if (!role) return;

    const stages = [...(role.pipeline_stages || DEFAULT_STAGES)];
    const [removed] = stages.splice(fromIdx, 1);
    stages.splice(toIdx, 0, removed);

    try {
      await updateJobRole(pipelineRoleFilter, { pipeline_stages: stages });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      toast.success("Stage order updated");
      window.location.reload();
    } catch {
      toast.error("Failed to reorder stages");
    }
  };

  const handleAddStage = async (roleId: number) => {
    const title = prompt("Enter name for new stage (e.g. Technical Round 1):");
    if (!title || !title.trim()) return;

    const role = roleById.get(roleId);
    if (!role) return;

    const currentStages = role.pipeline_stages || [...DEFAULT_STAGES];
    const newId = `round_${Date.now()}`;
    const newStage = {
      id: newId,
      title: title.trim(),
      color: "bg-slate-500",
      bgGlow: "from-slate-500/5"
    };

    try {
      await updateJobRole(roleId, {
        pipeline_stages: [...currentStages, newStage]
      });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      toast.success(`Stage "${title}" added`);
      window.location.reload();
    } catch {
      toast.error("Failed to add stage");
    }
  };

  const handleRemoveStage = async (roleId: number, stageId: string) => {
    const role = roleById.get(roleId);
    if (!role) return;

    const stageToRemove = (role.pipeline_stages || DEFAULT_STAGES).find(s => s.id === stageId);
    if (!confirm(`Are you sure you want to remove the "${stageToRemove?.title}" stage?`)) return;

    const currentStages = role.pipeline_stages || [...DEFAULT_STAGES];
    const updatedStages = currentStages.filter(s => s.id !== stageId);

    try {
      await updateJobRole(roleId, {
        pipeline_stages: updatedStages
      });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      toast.success("Stage removed");
      window.location.reload();
    } catch {
      toast.error("Failed to remove stage");
    }
  };

  // ──────────────────────────────────────────────────────────
  // Pipeline drag/drop handlers
  // ──────────────────────────────────────────────────────────
  const handleDragStart = (card: any, colId: string) => {
    setDraggedCard({
      id: card.id,
      fromCol: colId,
      name: card.name,
      currentInterviewDate: card.statusDate || card.interviewDate
    });
    setDraggedStageIdx(null);
  };

  const handleStageDragStart = (idx: number) => {
    setDraggedStageIdx(idx);
    setDraggedCard(null);
  };

  const handleDrop = async (toColId: string, toIdx: number) => {
    setDropTarget(null);

    // Handle Stage Reorder
    if (draggedStageIdx !== null) {
      const fromIdx = draggedStageIdx;
      setDraggedStageIdx(null);
      await handleStageReorder(fromIdx, toIdx);
      return;
    }

    // Handle Card Move
    if (!draggedCard || draggedCard.fromCol === toColId) {
      setDraggedCard(null);
      return;
    }

    // ALWAYS intercept for ALL transitions
    setSchedulingData({ id: draggedCard.id, stageId: toColId, name: draggedCard.name });

    // If candidate already has a relevant date, pre-populate modal with it
    const existingDate = draggedCard.currentInterviewDate;
    if (existingDate) {
      try {
        const raw = existingDate.includes("T") ? existingDate : `${existingDate}T00:00:00`;
        const d = new Date(raw);
        setInterviewDate(d.toLocaleDateString('en-CA'));
        setInterviewTime(d.toTimeString().slice(0, 5));
      } catch {
        const now = new Date();
        setInterviewDate(now.toLocaleDateString('en-CA'));
        setInterviewTime(now.toTimeString().slice(0, 5));
      }
    } else {
      const now = new Date();
      setInterviewDate(now.toLocaleDateString('en-CA'));
      setInterviewTime(now.toTimeString().slice(0, 5));
    }

    setInterviewModalOpen(true);
    setDraggedCard(null);
  };

  const handleConfirmSchedule = async () => {
    if (!schedulingData || !interviewDate) {
      toast.error("Please select a date");
      return;
    }
    try {
      const activeRole = pipelineRoleFilter ? roleById.get(pipelineRoleFilter) : null;
      const targetStage = (activeRole?.pipeline_stages || DEFAULT_STAGES).find(s => s.id === schedulingData.stageId);
      // Ensure time is included and timezone offset is appended
      const timeStr = interviewTime || "09:00";

      const pad = (n: number) => String(n).padStart(2, "0");
      const now = new Date();
      const offset = -now.getTimezoneOffset();
      const sign = offset >= 0 ? "+" : "-";
      const tzOffset = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
      const dateTime = `${interviewDate}T${timeStr}:00${tzOffset}`;

      const isInterview = targetStage?.title.toLowerCase().includes("interview");

      // Save user selected time as the primary transition date (status_date)
      // And also to interview_date if it's an interview stage
      await updatePipelineStatus(
        schedulingData.id,
        schedulingData.stageId,
        interviewNote || null,
        dateTime,
        isInterview ? dateTime : "clear",
        null,
        interviewNote || null
      );
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success(`${targetStage?.title || "Stage"} scheduled for ${schedulingData.name} on ${interviewDate}`);
      setInterviewModalOpen(false);
      setSchedulingData(null);
      setInterviewDate("");
      setInterviewTime("");
      setInterviewNote("");
      window.location.reload();
    } catch {
      toast.error("Failed to schedule interview");
    }
  };

  const handleSaveNote = async (id?: number, status?: string) => {
    const cardId = id || noteModalData?.id;
    const currentStatus = status || noteModalData?.status;

    if (!cardId || !currentStatus) return;

    if (!noteValue.trim()) {
      handleDeleteNote(cardId, currentStatus);
      return;
    }
    try {
      await updatePipelineStatus(cardId, currentStatus, noteValue, null, null, null, noteValue);
      toast.success("Note saved");
      setNoteModalOpen(false);
      setNoteModalData(null);
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      window.location.reload();
    } catch (err) {
      toast.error("Failed to save note");
    }
  };

  const handleDeleteNote = async (cardId: number, status: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await updatePipelineStatus(cardId, status, null, null, null, null, "");
      toast.success("Note deleted");
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      window.location.reload();
    } catch (err) {
      toast.error("Failed to delete note");
    }
  };

  // ──────────────────────────────────────────────────────────
  // Render helpers
  // ──────────────────────────────────────────────────────────
  const selectCompany = (id: number) => {
    if (selectedCompanyId === id) { setSelectedCompanyId(null); return; }
    setSelectedCompanyId(id);
    handleTabChange("roles");
    // Reset candidate state
    setCandSearch(""); setCandPage(1); setCandExpFilter(0); setCandSkillFilter("");
    setRoleFilter("All");
  };

  const handleViewCompanyTab = (e: React.MouseEvent, companyId: number, tab: "roles" | "candidates") => {
    e.stopPropagation();
    sessionStorage.setItem("companies_active_tab", tab);
    setActiveTab(tab);
    // Reset candidate page & states if transitioning to candidates
    if (tab === "candidates") {
      setCandSearch("");
      setCandPage(1);
      setCandExpFilter(0);
      setCandSkillFilter("");
    }
    navigate(`/companies?id=${companyId}`);
  };

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title={selectedCompanyId ? "Company Hub" : "Partner Companies"}
        description={selectedCompanyId
          ? `Manage recruitment ops for ${selectedCompany?.name}`
          : "Overview of all active partner organizations and their hiring status"}
        actions={
          <button onClick={openAddCompany} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Company
          </button>
        }
      />

      {/* ─── SEARCH BAR (Only for List View) ─────────────────── */}
      {!selectedCompanyId && (
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative group w-full md:w-[400px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by company name..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
              Total: {companies.length} Partners
            </div>
          </div>
        </div>
      )}

      {/* ─── CATALOG VIEW (List of Companies) ─────────────────── */}
      {!selectedCompanyId && (
        <div className="glass-card overflow-hidden">
          <div className="hidden md:block p-4 border-b border-border/50 bg-secondary/20">
            <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="col-span-12 md:col-span-4">Organization</div>
              <div className="md:col-span-5 hidden md:block">Activity & Recruitment Stats</div>
              <div className="md:col-span-3 text-right hidden md:block">Quick Actions</div>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {companies
              .filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
              .map((c) => {
                const totalRoles = roleCountByCompany.get(c.id) || 0;
                const openRoles = openRoleCountByCompany.get(c.id) || 0;
                const totalCand = candidateCountByCompany.get(c.id) || 0;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col md:grid md:grid-cols-12 gap-4 p-5 md:p-4 md:px-8 items-start md:items-center hover:bg-primary/[0.02] transition-all group cursor-pointer"
                    onClick={() => navigate(`/companies?id=${c.id}`)}
                  >
                    {/* Organization Info */}
                    <div className="w-full md:col-span-4 flex items-center gap-4">
                      <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/20 group-hover:scale-110 transition-transform shadow-sm shrink-0">
                        <Building2 className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {c.name}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="w-full md:col-span-5 flex items-center justify-between md:justify-start gap-4 md:gap-6 py-2 md:py-0 border-y border-border/30 md:border-none">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{totalRoles}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Roles</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-success">{openRoles}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Active</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-primary">{totalCand}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Candidates</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full md:col-span-3 flex items-center justify-between md:justify-end gap-2 mt-2 md:mt-0">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditCompany(c); }}
                          className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                          title="Edit Company"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                          className="p-2 rounded-lg bg-destructive/5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          title="Delete Company"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        className="px-4 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2 group/btn"
                      >
                        Details
                        <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}

            {companies.length === 0 && (
              <div className="p-20 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No companies registered yet.</p>
                <button onClick={openAddCompany} className="mt-4 text-xs text-primary font-bold hover:underline">Register New Partner</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Detail Panel ─────────────────────────────── */}
      <AnimatePresence>
        {selectedCompany && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* ─── Breadcrumb Back Link ─────────────────────────────── */}
            <div className="mb-4">
              <button
                onClick={() => setSelectedCompanyId(null)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Back to All Companies
              </button>
            </div>
            <div className={`glass-card overflow-hidden ${isPipeline ? "flex-1 flex flex-col min-h-0" : ""}`}>
              {/* Detail header */}
              <div className="p-5 border-b border-border flex items-center gap-4 flex-wrap">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{selectedCompany.name}</h2>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditCompany(selectedCompany)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                        title="Edit Company"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(selectedCompany.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        title="Delete Company"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Added {new Date(selectedCompany.created_at).toLocaleDateString()}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  {[
                    { label: "Roles", value: roleCountByCompany.get(selectedCompanyId!) || 0 },
                    { label: "Open", value: openRoleCountByCompany.get(selectedCompanyId!) || 0 },
                    { label: "In Progress", value: pipelineTotalCount },
                  ].map((s) => (
                    <div key={s.label} className="bg-secondary/60 rounded-lg px-4 py-2 text-center">
                      <div className="text-lg font-bold text-primary">{s.value}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center border-b border-border px-5 pt-1">
                {([
                  { key: "roles" as const, label: "Job Roles", icon: Briefcase, count: null },
                  { key: "candidates" as const, label: "Candidates", icon: Users, count: candTotal },
                  { key: "pipeline" as const, label: "In Progress", icon: GitBranch, count: pipelineTotalCount },
                ]).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleTabChange(t.key)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                    {t.count !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === t.key ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className={`p-5 ${isPipeline ? "flex-1 flex flex-col min-h-0 overflow-hidden" : ""}`}>
                {/* ═══ JOB ROLES TAB ═══ */}
                {activeTab === "roles" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      {["All", "Open", "In Progress", "Closed"].map((f) => (
                        <button
                          key={f}
                          onClick={() => setRoleFilter(f as any)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${roleFilter === f ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                        >
                          {f}
                        </button>
                      ))}
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => setIsAssignVendorOpen(true)}
                          disabled={selectedRoleIds.length === 0}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-border/60 ${selectedRoleIds.length > 0
                              ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-600/15"
                              : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                            }`}
                        >
                          <UserCheck className="w-4 h-4" /> Assign to Vendor {selectedRoleIds.length > 0 && `(${selectedRoleIds.length})`}
                          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                        </button>
                        <button
                          onClick={() => { setRoleForm({ title: "", description: "", deadline: "", estimated_budget: "", currency: "INR", positions_required: 1, pipeline_stages: [...DEFAULT_STAGES], location: "", work_mode: "onsite", experience_required: "", project_time_period: "" }); setRoleModalOpen(true); }}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-md shadow-blue-600/10"
                        >
                          <Plus className="w-4 h-4" /> Add Position
                        </button>
                      </div>
                    </div>
                    {companyRoles.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground glass-card border-dashed">
                        <Briefcase className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">No job roles yet for {selectedCompany?.name || "the company"}</p>
                        <button onClick={() => { setRoleForm({ title: "", description: "", deadline: "", estimated_budget: "", currency: "INR", positions_required: 1, pipeline_stages: [...DEFAULT_STAGES], location: "", work_mode: "onsite", experience_required: "", project_time_period: "" }); setRoleModalOpen(true); }} className="mt-4 text-xs text-primary font-bold hover:underline underline-offset-4">
                          + Initialize Active Recruitment
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border bg-secondary/10">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-border bg-secondary/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              <th className="p-4 w-12">
                                <div
                                  className="p-1 cursor-pointer"
                                  onClick={() => {
                                    if (selectedRoleIds.length === companyRoles.length) {
                                      setSelectedRoleIds([]);
                                    } else {
                                      setSelectedRoleIds(companyRoles.map(r => r.id));
                                    }
                                  }}
                                >
                                  <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${selectedRoleIds.length === companyRoles.length && companyRoles.length > 0 ? "bg-primary border-primary text-white" : "border-muted-foreground/30"}`}>
                                    {selectedRoleIds.length === companyRoles.length && companyRoles.length > 0 && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                              </th>
                              <th className="p-4">Job Role</th>
                              <th className="p-4">Department</th>
                              <th className="p-4 text-center">Openings</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50 text-sm">
                            {companyRoles.map((r) => {
                              const roleIsOpen = r.status.toLowerCase() === "open";
                              const tags = getRoleTags(r);
                              const iconDetails = getRoleIconDetails(r.title);
                              const IconComponent = iconDetails.icon;
                              const openingsCount = Math.max(0, (r.positions_required || 1) - r.filledCount);
                              const isGeneral = r.title.toLowerCase().includes("general");

                              return (
                                <tr
                                  key={r.id}
                                  className={`hover:bg-primary/[0.02] transition-colors ${!roleIsOpen ? "opacity-60" : ""} ${selectedRoleIds.includes(r.id) ? "bg-primary/[0.01]" : ""}`}
                                >
                                  <td className="p-4">
                                    <div
                                      className="p-1 cursor-pointer"
                                      onClick={() => {
                                        setSelectedRoleIds(prev =>
                                          prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                                        );
                                      }}
                                    >
                                      <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${selectedRoleIds.includes(r.id) ? "bg-primary border-primary text-white" : "border-muted-foreground/30 hover:border-primary/50"}`}>
                                        {selectedRoleIds.includes(r.id) && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/job-roles/${r.id}`)}>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-bold text-foreground hover:text-primary transition-colors truncate max-w-[220px]">{r.title}</h4>
                                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                                            Open
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                          Filled: {r.filledCount} / {r.positions_required}
                                        </p>
                                        {isGeneral ? (
                                          <span className="text-[11px] text-muted-foreground/80 mt-1 block font-medium">
                                            {tags[0]}
                                          </span>
                                        ) : (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {tags.map((tag, idx) => (
                                              <span key={idx} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-secondary text-muted-foreground border border-border/50 uppercase tracking-wider">
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-semibold text-muted-foreground dark:text-muted-foreground/80 text-xs">
                                      {r.department || "Operations"}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center font-bold text-foreground">
                                    {openingsCount}
                                  </td>
                                  <td className="p-4">
                                    <StatusBadge status={r.computedStatus} className="scale-90 origin-left" />
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/job-roles/${r.id}`); }}
                                        className="p-1.5 rounded-lg border border-border/50 bg-card hover:bg-secondary/40 text-blue-500 hover:text-blue-600 transition-colors shadow-sm"
                                        title="View Details"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); openEditRole(r); }}
                                        className="p-1.5 rounded-lg border border-border/50 bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                                        title="Edit Role"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setRoleDeleteId(r.id); }}
                                        className="p-1.5 rounded-lg border border-border/50 bg-card hover:bg-secondary/40 text-muted-foreground hover:text-destructive transition-colors shadow-sm"
                                        title="Delete Role"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/job-roles/${r.id}`); }}
                                        className="px-3.5 py-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm ml-2"
                                      >
                                        View Details <ChevronRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ CANDIDATES TAB ═══ */}
                {activeTab === "candidates" && (
                  <div>
                    {/* Search + filters */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search by name, email, phone..."
                          value={candSearch}
                          onChange={(e) => { setCandSearch(e.target.value); setCandPage(1); }}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => setCandFiltersOpen(!candFiltersOpen)}
                        className={`px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors ${candFiltersOpen || candExpFilter !== 0 || candSkillFilter ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        <Filter className="w-4 h-4" /> Filters
                      </button>
                    </div>
                    {/* Filter panel */}
                    <AnimatePresence>
                      {candFiltersOpen && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                          <div className="glass-card p-4 flex flex-wrap items-end gap-4">
                            <div>
                              <label className="label-text mb-1.5 block text-xs">Experience</label>
                              <div className="flex gap-1.5">
                                {experienceRanges.map((r, i) => (
                                  <button key={r.label} onClick={() => { setCandExpFilter(i); setCandPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${candExpFilter === i ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="label-text mb-1.5 block text-xs">Skill</label>
                              <div className="relative">
                                <input type="text" value={candSkillFilter} onChange={(e) => { setCandSkillFilter(e.target.value); setCandPage(1); }} placeholder="e.g. React" className="w-48 px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                {candSkillFilter && (
                                  <button onClick={() => setCandSkillFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Candidate cards grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {candLoading && <p className="text-sm text-muted-foreground col-span-2">Loading candidates...</p>}
                      {candItems.map((c, i) => {
                        const displayName = c.name || "Unknown";
                        const initials = displayName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                        return (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            whileHover={{ y: -1 }}
                            onClick={() => navigate(`/candidates/${c.id}`)}
                            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-pointer hover:border-primary/20 transition-all"
                          >
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                              {initials || "NA"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">{displayName}</h4>
                              <p className="text-xs text-muted-foreground truncate">{c.email || "No email"} · {c.experience_years || 0} yrs</p>
                            </div>
                            <StatusBadge status={getStatusFromAge(c)} />
                          </motion.div>
                        );
                      })}
                    </div>
                    {candItems.length === 0 && !candLoading && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No candidates found for {selectedCompany?.name}</p>
                      </div>
                    )}
                    {/* Pagination */}
                    {candTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-muted-foreground">Page {candPage} of {candTotalPages} · {candTotal} total</p>
                        <div className="flex items-center gap-2">
                          <button disabled={candPage <= 1} onClick={() => setCandPage((p) => p - 1)} className="p-2 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          {Array.from({ length: Math.min(candTotalPages, 5) }, (_, i) => {
                            let pn; if (candTotalPages <= 5) pn = i + 1; else if (candPage <= 3) pn = i + 1; else if (candPage >= candTotalPages - 2) pn = candTotalPages - 4 + i; else pn = candPage - 2 + i;
                            return (
                              <button key={pn} onClick={() => setCandPage(pn)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${candPage === pn ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                                {pn}
                              </button>
                            );
                          })}
                          <button disabled={candPage >= candTotalPages} onClick={() => setCandPage((p) => p + 1)} className="p-2 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ PIPELINE TAB ═══ */}
                {activeTab === "pipeline" && (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Role Filter for Pipeline */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="text-sm font-medium text-muted-foreground mr-2 flex items-center gap-1.5 border-r border-border pr-4 h-9">
                        <Filter className="w-4 h-4" /> Filter Pipeline:
                      </div>
                      <button
                        onClick={() => setPipelineRoleFilter("all")}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${pipelineRoleFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                      >
                        All
                      </button>
                      {jobRoles.filter(r => r.company_id === selectedCompanyId!).map(role => (
                        <button
                          key={role.id}
                          onClick={() => setPipelineRoleFilter(role.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${pipelineRoleFilter === role.id ? "bg-primary text-primary-foreground font-bold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                        >
                          {role.title}
                        </button>
                      ))}
                      {pipelineRoleFilter && pipelineRoleFilter !== "all" && (
                        <button
                          onClick={() => handleAddStage(pipelineRoleFilter)}
                          className="px-3 py-2 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-1 ml-4 border border-primary/20"
                        >
                          <Plus className="w-3 h-3" /> Add Stage
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-5 flex-wrap">
                      {companyPipelineColumns.map((col, idx) => (
                        <div key={col.id} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/80 border border-border/50">
                            <div className={`w-2 h-2 rounded-full ${col.color}`} />
                            <span className="text-xs font-medium text-foreground truncate">{col.title}</span>
                            <span className="text-xs font-bold text-muted-foreground ml-auto pl-2">{col.cards.length}</span>
                          </div>
                          {idx < companyPipelineColumns.length - 1 && (
                            <span className="text-foreground font-bold">→</span>
                          )}
                        </div>
                      ))}
                    </div>


                    {/* Kanban columns */}
                    <div className="flex gap-4 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory custom-scrollbar max-h-[calc(100vh-290px)] -mx-5 px-5 md:mx-0 md:px-0">
                      {!pipelineRoleFilter ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-secondary/20 border border-border/50 border-dashed rounded-2xl min-h-[400px] text-center snap-start">
                          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm ring-1 ring-primary/20">
                            <Briefcase className="w-10 h-10 text-primary" />
                          </div>
                          <h3 className="text-xl font-bold text-foreground mb-3">Initialize Hub Pipeline</h3>
                          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                            Select a specific job role to view and manage its recruitment stages.
                            Pipelines are role-specific to ensure data accuracy.
                          </p>
                        </div>
                      ) : (
                        companyPipelineColumns.map((col, idx) => {
                          const isDropping = dropTarget === col.id;

                          return (
                            <div
                              key={col.id}
                              onDragOver={(e) => { e.preventDefault(); setDropTarget(col.id); }}
                              onDragLeave={() => setDropTarget(null)}
                              onDrop={() => handleDrop(col.id, idx)}
                              className="min-w-[85vw] md:min-w-[250px] lg:min-w-[260px] flex-shrink-0 flex flex-col snap-center md:snap-align-none"
                            >
                              <div
                                className={`flex items-center gap-2 mb-4 px-2 group py-1 transition-all ${draggedStageIdx === idx ? "opacity-30" : ""}`}
                                draggable={!!pipelineRoleFilter && pipelineRoleFilter !== "all"}
                                onDragStart={() => handleStageDragStart(idx)}
                              >
                                <div className={`w-2.5 h-2.5 rounded-full ${col.color} shadow-sm`} />
                                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">{col.title}</h3>
                                <span className="text-[10px] text-primary ml-auto bg-primary/10 px-2.5 py-1 rounded-full font-black ring-1 ring-primary/20">{col.cards.length}</span>
                                {pipelineRoleFilter && pipelineRoleFilter !== "all" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveStage(pipelineRoleFilter, col.id); }}
                                    className="ml-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div
                                className={`flex-1 space-y-3 min-h-[350px] max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar p-2.5 rounded-2xl border transition-all duration-300 ${isDropping
                                  ? "bg-primary/5 border-primary/50 ring-4 ring-primary/[0.03]"
                                  : "bg-secondary/40 border-border/40"
                                  }`}
                              >
                                {col.cards.length === 0 && (
                                  <div className="flex flex-col items-center justify-center h-[120px] text-muted-foreground/30">
                                    <Users className="w-6 h-6 mb-2 opacity-50" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No Activity</p>
                                  </div>
                                )}
                                {col.cards.map((card) => (
                                  <motion.div
                                    key={card.id}
                                    draggable
                                    onDragStart={() => handleDragStart(card, col.id)}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileDrag={{ scale: 1.05, opacity: 0.8, rotate: 2 }}
                                    onClick={() => navigate(`/candidates/${card.candidateId}`)}
                                    className="pipeline-card p-2.5 cursor-grab active:cursor-grabbing group shadow hover:shadow-md transition-all border border-border/50 flex flex-col"
                                  >
                                    <div className="flex flex-col gap-2 grow">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[9px] font-black shrink-0 ring-1 ring-primary/20">
                                          {card.name ? card.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                                        </div>
                                        <p className="text-[11px] font-bold text-foreground truncate">{card.name}</p>
                                      </div>

                                      {(card.statusDate || card.interviewDate || card.createdAt) && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/5 border border-primary/10">
                                          <Clock className="w-3 h-3 text-primary/70" />
                                          <div className="text-[9px] text-primary font-bold">
                                            {(() => {
                                              try {
                                                const raw = card.statusDate || card.interviewDate || card.createdAt;
                                                if (!raw) return "";
                                                const dateStr = raw.includes("T") ? raw : `${raw}T00:00:00`;
                                                return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                              } catch { return "Date Error"; }
                                            })()}
                                          </div>
                                        </div>
                                      )}

                                      {/* Redesigned Note Area */}
                                      <div className="mt-auto pt-2 border-t border-border/30">
                                        {card.remarks ? (
                                          <div className="group/note relative">
                                            <div
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setNoteValue(card.remarks || "");
                                                setNoteModalData({ id: card.id, status: col.id, initialValue: card.remarks || "" });
                                                setNoteModalOpen(true);
                                              }}
                                              className="flex flex-col gap-1 px-2 py-1 rounded-lg bg-secondary/30 border border-transparent hover:border-primary/20 hover:bg-secondary/50 transition-all cursor-pointer"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-[8px] font-black text-primary uppercase tracking-widest opacity-70">
                                                  <MessageSquare className="w-2.5 h-2.5" /> Note
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteNote(card.id, col.id);
                                                    }}
                                                    className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                                                    title="Delete Note"
                                                  >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                  </button>
                                                </div>
                                              </div>
                                              <p className="text-[10px] text-foreground/80 italic leading-snug break-all truncate line-clamp-1">
                                                "{card.remarks.split(/\s+/).slice(0, 4).join(" ")}{card.remarks.split(/\s+/).length > 4 ? "..." : ""}"
                                              </p>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setNoteValue("");
                                              setNoteModalData({ id: card.id, status: col.id, initialValue: "" });
                                              setNoteModalOpen(true);
                                            }}
                                            className="w-full text-center py-1.5 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-1 border border-dashed border-border/40 rounded-lg hover:bg-primary/5"
                                          >
                                            <Plus className="w-2.5 h-2.5" /> Note
                                          </button>
                                        )}
                                      </div>

                                      {card.isReplacement && (
                                        <div className="mt-1 text-right">
                                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-black border border-amber-500/20 uppercase tracking-widest whitespace-nowrap">
                                            REPLACEMENT
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {pipelineRoleFilter && pipelineTotal === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No pipeline activity for this role</p>
                      </div>
                    )}

                  </div>
                )}


              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modals ─────────────────────────────────────── */}

      {/* Add/Edit Company */}
      <Modal open={companyModalOpen} onClose={() => setCompanyModalOpen(false)} title={editId ? "Edit Company" : "Add Company"}>
        <div className="space-y-4">
          <div>
            <label className="label-text mb-2 block">Company Name</label>
            <input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Acme Corp" />
          </div>
          <div>
            <label className="label-text mb-2 block">Location</label>
            <input value={companyForm.location} onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Bangalore, India" />
          </div>

          <button onClick={handleSaveCompany} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all font-bold">
            {editId ? "Update Company" : "Add Company"}
          </button>
        </div>
      </Modal>

      {/* Delete Company */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Company">
        <p className="text-sm text-muted-foreground mb-5">Delete company <strong>{companyById.get(deleteId || 0)?.name || ""}</strong>? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">Cancel</button>
          <button onClick={handleDeleteCompany} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">Delete</button>
        </div>
      </Modal>

      {/* Create/Edit Job Role */}
      <Modal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} title={editRoleId ? "Edit Job Position" : "Create Job Position"}>
        <div className="space-y-4">
          <div>
            <label className="label-text mb-2 block">Company</label>
            <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground text-sm flex items-center gap-2 font-bold">
              <Building2 className="w-4 h-4 text-primary" /> {selectedCompany?.name}
            </div>
          </div>
          <div>
            <label className="label-text mb-2 block">Job Title</label>
            <input value={roleForm.title} onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Senior Frontend Engineer" />
          </div>
          <div>
            <label className="label-text mb-2 block">Description</label>
            <textarea
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px] resize-none"
              placeholder="Detailed role description..."
            />
          </div>
          <div>
            <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Closing Date (Job Expiry)</label>
            <div className="relative">
              <input
                type="date"
                value={roleForm.deadline}
                onChange={(e) => setRoleForm({ ...roleForm, deadline: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          {/* VENDOR ASSIGNMENT SECTION */}
          <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 ring-1 ring-primary/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3 h-3" />
                On Bench Talent Authority
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {selectedVendorIds.length} Assigned
                </span>
              </div>
            </div>

            {vendors.length === 0 ? (
              <div className="p-3 rounded-lg bg-background border border-border text-[10px] text-muted-foreground flex items-center gap-2">
                <Users className="w-3 h-3 text-orange-500" />
                No active vendors found. Please create vendors to enable distribution.
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm hover:border-primary/50 transition-all group"
                >
                  <div className="flex flex-wrap gap-1.5 overflow-hidden">
                    {selectedVendorIds.length === 0 ? (
                      <span className="text-muted-foreground">Select On Bench Talent partners...</span>
                    ) : (
                      selectedVendorIds.map(id => {
                        const v = vendors.find(vend => vend.id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                            {v ? (v.company_name || v.name) : id}
                            <X
                              className="w-2.5 h-2.5 hover:text-destructive cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVendorIds(prev => prev.filter(vid => vid !== id));
                              }}
                            />
                          </span>
                        );
                      })
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${vendorDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {vendorDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setVendorDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-0 right-0 top-full mt-2 z-50 glass-card p-2 shadow-2xl border border-border/50 max-h-60 overflow-y-auto"
                    >
                      <div className="grid grid-cols-1 gap-1">
                        {vendors.map((v) => {
                          const isSelected = selectedVendorIds.includes(v.id);
                          return (
                            <div
                              key={v.id}
                              onClick={() => {
                                setSelectedVendorIds(prev =>
                                  prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                                );
                              }}
                              className={`flex items-center justify-between gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${isSelected
                                ? "bg-primary/5 text-primary"
                                : "hover:bg-secondary text-muted-foreground"
                                }`}
                            >
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold truncate leading-none mb-1">{v.name}</p>
                                <p className="text-[9px] truncate opacity-60">{v.email}</p>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            )}
            <p className="text-[9px] text-primary/60 italic leading-tight">
              * Assigned vendors will immediately receive authority to submit candidates for this role.
            </p>
          </div>

          <div>
            <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Number of Positions Required</label>
            <input
              type="number"
              value={roleForm.positions_required}
              onChange={(e) => setRoleForm({ ...roleForm, positions_required: e.target.value === "" ? "" : isNaN(parseInt(e.target.value)) ? "" : parseInt(e.target.value) })}
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter positions required"
            />
          </div>
          {/* ── New fields: Location, Work Mode, Experience ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Location</label>
              <input
                type="text"
                value={roleForm.location}
                onChange={(e) => setRoleForm({ ...roleForm, location: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Bangalore, India"
              />
            </div>
            <div>
              <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Experience Required (yrs)</label>
              <input
                type="number"
                value={roleForm.experience_required}
                onChange={(e) => setRoleForm({ ...roleForm, experience_required: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                min="0"
                step="0.5"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 3"
              />
            </div>
          </div>
          <div>
            <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Work Mode</label>
            <select
              value={roleForm.work_mode}
              onChange={(e) => setRoleForm({ ...roleForm, work_mode: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="onsite">🏢 On-Site</option>
              <option value="remote">🌐 Remote</option>
              <option value="hybrid">🔀 Hybrid</option>
            </select>
          </div>
          <div>
            <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Project Duration</label>
            <input
              type="text"
              value={roleForm.project_time_period}
              onChange={(e) => setRoleForm({ ...roleForm, project_time_period: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. 6 Months"
            />
          </div>
          <div>
            <div>
              <label className="label-text mb-2 block">Estimated Budget</label>
              <div className="relative">
                <input
                  type="number"
                  value={roleForm.estimated_budget}
                  onChange={(e) => setRoleForm({ ...roleForm, estimated_budget: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                  {roleForm.currency === "INR" ? "₹" : "$"}
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className="label-text mb-2 block">Currency</label>
            <select
              value={roleForm.currency}
              onChange={(e) => setRoleForm({ ...roleForm, currency: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD">US Dollar ($)</option>
            </select>
          </div>
          <button
            onClick={editRoleId ? handleUpdateRole : handleCreateRole}
            disabled={updatingRole}
            className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all glow-primary mt-2 flex items-center justify-center gap-2"
          >
            {updatingRole && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {editRoleId ? "Update Job Position" : "Create Job Position"}
          </button>
        </div>
      </Modal>

      {/* Close/Reopen Role Confirmation */}
      <Modal open={confirmRoleId !== null} onClose={() => setConfirmRoleId(null)} title={confirmAction === "close" ? "Close Job Position" : "Reopen Job Position"}>
        <div className="space-y-4">
          <p className="body-text">
            {confirmAction === "close"
              ? "Are you sure you want to close this position? No further applications will be accepted."
              : "Are you sure you want to reopen this position? New applications will be accepted again."}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => setConfirmRoleId(null)} className="flex-1 py-3 rounded-lg bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-all">Cancel</button>
            <button
              onClick={handleToggleRole}
              disabled={updatingRole}
              className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${confirmAction === "close" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
            >
              {updatingRole ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : confirmAction === "close" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {updatingRole ? "Updating..." : confirmAction === "close" ? "Yes, Close" : "Yes, Reopen"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Job Role Confirmation */}
      <Modal open={roleDeleteId !== null} onClose={() => setRoleDeleteId(null)} title="Delete Job Role">
        <div className="space-y-4">
          <p className="body-text">
            Are you sure you want to permanently delete the role <strong>{roleById.get(roleDeleteId || 0)?.title}</strong>?
            This action cannot be undone and will remove all associated application data.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => setRoleDeleteId(null)} className="flex-1 py-3 rounded-lg bg-secondary text-foreground font-bold text-sm hover:bg-secondary/80 transition-all">Cancel</button>
            <button
              onClick={handleDeleteRole}
              className="flex-1 py-3 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Yes, Delete Role
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        open={interviewModalOpen}
        onClose={() => { setInterviewModalOpen(false); setSchedulingData(null); }}
        title="Schedule Stage"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Plan transition for <strong>{schedulingData?.name}</strong>.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block font-bold uppercase tracking-tight text-[10px]">Target Date</label>
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="label-text mb-2 block font-bold uppercase tracking-tight text-[10px]">Target Time</label>
              <input
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="label-text mb-2 block font-bold uppercase tracking-tight text-[10px]">Transition Remark</label>
            <textarea
              value={interviewNote}
              onChange={(e) => setInterviewNote(e.target.value)}
              placeholder="Add an internal note about this move..."
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setInterviewModalOpen(false); setSchedulingData(null); }}
              className="flex-1 py-3 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSchedule}
              className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors font-bold"
            >
              Confirm Schedule
            </button>
          </div>
        </div>
      </Modal>

      {/* Note Management Modal */}
      <Modal
        open={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setNoteModalData(null); }}
        title={noteModalData?.initialValue ? "Edit Note" : "Add Note"}
      >
        <div className="space-y-4">
          <div>
            <label className="label-text mb-2 block font-bold uppercase tracking-tight text-[10px]">Candidate Note</label>
            <textarea
              autoFocus
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Enter candidate status or feedback..."
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[150px] transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setNoteModalOpen(false); setNoteModalData(null); }}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveNote()}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Note
            </button>
          </div>
        </div>
      </Modal>
      <AssignVendorDropdown
        open={isAssignVendorOpen}
        onClose={() => setIsAssignVendorOpen(false)}
        vendors={vendors}
        selectedRoleIds={selectedRoleIds}
        onSuccess={() => {
          setIsAssignVendorOpen(false);
          setSelectedRoleIds([]);
        }}
      />
    </div>
  );
};

export default Companies;
