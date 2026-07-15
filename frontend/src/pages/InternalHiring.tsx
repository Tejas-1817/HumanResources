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
  X,
  Users,
  GitBranch,
  Clock,
  MessageSquare,
  Save,
  ChevronDown,
  Check,
  Upload,
  UserCheck,
  KeyRound,
  Copy,
  Link2,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import UploadPage from "./Upload";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { AssignVendorDropdown } from "@/components/modals/AssignVendorDropdown";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Candidate,
  getCandidates,
  getJobRoles,
  getPipeline,
  createJobRole,
  updateJobRole,
  deleteJobRole,
  updatePipelineStatus,
  getVendors,
  getCompanies,
  Interviewer,
  getInterviewers,
  createInterviewer,
  updateInterviewer,
  deleteInterviewer,
  getCandidatesByCompany,
  InterviewSchedule,
  getInterviewSchedules,
  createInterviewSchedule,
  assignCandidatesToSchedule,
  updateInterviewSchedule,
  forgotPassword,
  adminResetInterviewerPassword,
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

// ──────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────
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
// Helper Components for Inline Editing
// ──────────────────────────────────────────────────────────
const EditableDateInput = ({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => Promise<void>;
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = async () => {
    if (!localValue || localValue === value) return;
    await onSave(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="date"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="bg-secondary/50 border border-border/50 text-foreground text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  );
};

const EditableTimeInput = ({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => Promise<void>;
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = async () => {
    if (!localValue || localValue === value) return;
    await onSave(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="time"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="bg-secondary/50 border border-border/50 text-foreground text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  );
};

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
export default function InternalHiring() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ─── Data queries ──────────────────────────────────────
  const { data: companiesData, isLoading: companiesLoading } = useQuery({ queryKey: ["companies", { include_internal: true }], queryFn: () => getCompanies({ include_internal: true }) });
  const { data: jobRolesData } = useQuery({ queryKey: ["job-roles"], queryFn: () => getJobRoles() });
  const { data: pipelineData } = useQuery({ queryKey: ["pipeline"], queryFn: () => getPipeline() });
  const { data: vendorsData } = useQuery({ queryKey: ["vendors"], queryFn: () => getVendors() });

  const companies = companiesData ?? [];
  const jobRoles = jobRolesData ?? [];
  const pipeline = pipelineData ?? {};
  const vendors = (vendorsData ?? []).filter(v => v.is_active);

  const roleById = useMemo(() => new Map(jobRoles.map((r) => [r.id, r])), [jobRoles]);

  // Find Altzor Digital Solutions company context
  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.name === "Altzor Digital Solutions") ?? null;
  }, [companies]);

  const selectedCompanyId = selectedCompany?.id ?? null;

  const [activeTab, setActiveTab] = useState<"roles" | "candidates" | "pipeline" | "interviewers" | "interviews_scheduled" >(() => {
    return (sessionStorage.getItem("internal_hiring_active_tab") as any) || "roles";
  });

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    sessionStorage.setItem("internal_hiring_active_tab", tab);
  };

  // ─── Job Roles state ──────────────────────────────────
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    title: "",
    description: "",
    deadline: "",
    estimated_budget: "",
    currency: "INR",
    positions_required: "" as number | string,
    pipeline_stages: [...DEFAULT_STAGES],
    department: "",
    location: "",
    work_mode: "onsite",
    experience_required: "" as number | string,
    project_time_period: "",
  });
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalData, setNoteModalData] = useState<{ id: number; status: string; initialValue: string } | null>(null);
  const [noteValue, setNoteValue] = useState("");

  // ─── Interviewers state ────────────────────────────────
  const [interviewerSearch, setInterviewerSearch] = useState("");
  const { data: interviewersData } = useQuery({
    queryKey: ["interviewers", interviewerSearch],
    queryFn: () => getInterviewers(interviewerSearch || undefined),
  });
  const interviewers = interviewersData ?? [];

  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<number[]>([]);
  const [interviewerModalOpen, setInterviewerModalOpen] = useState(false);
  const [editInterviewerId, setEditInterviewerId] = useState<number | null>(null);
  const [interviewerForm, setInterviewerForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [savingInterviewer, setSavingInterviewer] = useState(false);

  // ─── Reset Password Modal state ────────────────────────────
  const [adminResetModalOpen, setAdminResetModalOpen] = useState(false);
  const [resetInterviewer, setResetInterviewer] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetPasswordCopied, setResetPasswordCopied] = useState(false);
  const [savingReset, setSavingReset] = useState(false);

  // ─── Interviews Scheduled state ──────────────────────────
  const { data: schedulesData } = useQuery({
    queryKey: ["interview-schedules"],
    queryFn: () => getInterviewSchedules(),
  });
  const schedules = schedulesData ?? [];

  const uniqueSchedules = useMemo(() => {
    const groups: { [key: string]: typeof schedules[0] & { candidate_ids: number[], schedule_ids: number[] } } = {};
    schedules.forEach((item) => {
      const key = `${item.job_role_id}-${item.interviewer_id}-${item.date}-${item.time}-${item.venue.toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          ...item,
          candidate_ids: item.candidate_id ? [item.candidate_id] : [],
          schedule_ids: [item.id],
        };
      } else {
        const g = groups[key];
        g.schedule_ids.push(item.id);
        if (item.candidate_id && !g.candidate_ids.includes(item.candidate_id)) {
          g.candidate_ids.push(item.candidate_id);
        }
      }
    });
    return Object.values(groups);
  }, [schedules]);

  const { data: companyCandidatesData } = useQuery({
    queryKey: ["company-candidates", selectedCompanyId],
    queryFn: () => getCandidatesByCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const companyCandidates = companyCandidatesData ?? [];

  const candidateSchedules = useMemo(() => {
    const rows: any[] = [];
    uniqueSchedules.forEach((group) => {
      if (group.candidate_ids.length === 0) {
        rows.push({
          ...group,
          uniqueKey: `empty-${group.id}`,
          displayCandidateName: "—",
        });
      } else {
        group.candidate_ids.forEach((candId) => {
          const rawSchedule = schedules.find(
            (s) =>
              s.candidate_id === candId &&
              s.job_role_id === group.job_role_id &&
              s.interviewer_id === group.interviewer_id &&
              s.date === group.date &&
              s.time === group.time
          );
          const candName =
            rawSchedule?.candidate_name ||
            companyCandidates.find((c: any) => c.id === candId)?.name ||
            `Candidate #${candId}`;
          rows.push({
            ...group,
            id: rawSchedule?.id || group.id,
            uniqueKey: `${candId}-${group.id}`,
            displayCandidateName: candName,
          });
        });
      }
    });
    return rows;
  }, [uniqueSchedules, schedules, companyCandidates]);

  const [assignedCandidatesModalOpen, setAssignedCandidatesModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [assigningCandidates, setAssigningCandidates] = useState(false);
  const [modalCandSearch, setModalCandSearch] = useState("");
  const [selectedModalCandidateIds, setSelectedModalCandidateIds] = useState<number[]>([]);
  const [isAddingCandidates, setIsAddingCandidates] = useState(false);

  const filteredModalCandidates = useMemo(() => {
    const query = modalCandSearch.toLowerCase().trim();
    if (!query) return companyCandidates;
    return companyCandidates.filter((c: any) =>
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.toLowerCase().includes(query)) ||
      (c.skills && c.skills.toLowerCase().includes(query))
    );
  }, [companyCandidates, modalCandSearch]);

  const openAssignedCandidatesModal = (item: any) => {
    setSelectedSchedule(item);
    setSelectedModalCandidateIds(item.candidate_ids);
    setModalCandSearch("");
    setIsAddingCandidates(false);
    setAssignedCandidatesModalOpen(true);
  };

  const handleAssignCandidates = async () => {
    if (!selectedSchedule) return;
    setAssigningCandidates(true);
    try {
      await assignCandidatesToSchedule(selectedSchedule.id, selectedModalCandidateIds);
      await queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });
      setSelectedSchedule((prev: any) => prev ? { ...prev, candidate_ids: selectedModalCandidateIds } : null);
      setIsAddingCandidates(false);
      toast.success("Candidates assigned successfully");
      window.location.reload();
    } catch {
      toast.error("Failed to assign candidates");
    } finally {
      setAssigningCandidates(false);
    }
  };

  const handleRemoveCandidate = async (candidateId: number) => {
    if (!selectedSchedule) return;
    const updatedIds = selectedModalCandidateIds.filter(id => id !== candidateId);
    setAssigningCandidates(true);
    try {
      await assignCandidatesToSchedule(selectedSchedule.id, updatedIds);
      await queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });
      setSelectedModalCandidateIds(updatedIds);
      setSelectedSchedule((prev: any) => prev ? { ...prev, candidate_ids: updatedIds } : null);
      toast.success("Candidate unassigned successfully");
      window.location.reload();
    } catch {
      toast.error("Failed to unassign candidate");
    } finally {
      setAssigningCandidates(false);
    }
  };



  const { data: allInterviewersData } = useQuery({
    queryKey: ["all-interviewers"],
    queryFn: () => getInterviewers(),
  });
  const allInterviewers = allInterviewersData ?? [];

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    job_role_id: "",
    interviewer_id: "",
    date: "",
    time: "",
    venue: "Online",
  });

  // ─── Interviews Scheduled role filter ──────────────────────────
  const [scheduleRoleFilter, setScheduleRoleFilter] = useState<number | null>(null);

  // Unique job roles that appear in current candidateSchedules (auto-updates when roles are deleted)
  const scheduledRoleIds = useMemo(() => {
    const seen = new Set<number>();
    candidateSchedules.forEach((s) => seen.add(s.job_role_id));
    return Array.from(seen);
  }, [candidateSchedules]);

  // Reset filter if the filtered role no longer has any schedules
  const validScheduleRoleFilter = scheduledRoleIds.includes(scheduleRoleFilter as number)
    ? scheduleRoleFilter
    : null;

  const filteredCandidateSchedules = useMemo(() => {
    if (!validScheduleRoleFilter) return candidateSchedules;
    return candidateSchedules.filter((s) => s.job_role_id === validScheduleRoleFilter);
  }, [candidateSchedules, validScheduleRoleFilter]);

  // ──────────────────────────────────────────────────────────
  // Derived data
  // ──────────────────────────────────────────────────────────
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

  // Filtered roles for Altzor Digital Solutions
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

  // Filtered pipeline for Altzor Digital Solutions
  const companyPipelineColumns = useMemo(() => {
    if (!selectedCompanyId) return [];

    // If no role is selected, return empty columns
    if (!pipelineRoleFilter) {
      return DEFAULT_STAGES.map((stage) => ({
        ...stage,
        cards: [],
      }));
    }

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

  // Candidates query for Altzor Digital Solutions
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
      department: roleForm.department.trim() || null,
      location: roleForm.location.trim() || null,
      work_mode: roleForm.work_mode || null,
      experience_required: roleForm.experience_required !== "" ? parseFloat(roleForm.experience_required.toString()) : null,
      project_time_period: roleForm.project_time_period.trim() || null,
      vendor_ids: selectedVendorIds,
    });
    await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
    setRoleModalOpen(false);
    setRoleForm({ title: "", description: "", deadline: "", estimated_budget: "", currency: "INR", positions_required: "", pipeline_stages: [...DEFAULT_STAGES], department: "", location: "", work_mode: "onsite", experience_required: "", project_time_period: "" });
    toast.success("Job role created");
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
        department: roleForm.department.trim() || null,
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
    } catch {
      toast.error("Failed to update job role");
    } finally {
      setUpdatingRole(false);
    }
  };

  const openAddRole = () => {
    setEditRoleId(null);
    setSelectedVendorIds([]);
    setRoleForm({ title: "", description: "", deadline: "", estimated_budget: "", currency: "INR", positions_required: "", pipeline_stages: [...DEFAULT_STAGES], department: "", location: "", work_mode: "onsite", experience_required: "", project_time_period: "" });
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
      department: r.department || "",
      location: r.location || "",
      work_mode: r.work_mode || "onsite",
      experience_required: r.experience_required !== null && r.experience_required !== undefined ? r.experience_required : "",
      project_time_period: r.project_time_period || "",
    });
    setSelectedVendorIds([]);
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
      bgGlow: "from-slate-500/5",
    };

    try {
      await updateJobRole(roleId, {
        pipeline_stages: [...currentStages, newStage],
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

    const stageToRemove = (role.pipeline_stages || DEFAULT_STAGES).find((s) => s.id === stageId);
    if (!confirm(`Are you sure you want to remove the "${stageToRemove?.title}" stage?`)) return;

    const currentStages = role.pipeline_stages || [...DEFAULT_STAGES];
    const updatedStages = currentStages.filter((s) => s.id !== stageId);

    try {
      await updateJobRole(roleId, {
        pipeline_stages: updatedStages,
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
      currentInterviewDate: card.statusDate || card.interviewDate,
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

    setSchedulingData({ id: draggedCard.id, stageId: toColId, name: draggedCard.name });

    const existingDate = draggedCard.currentInterviewDate;
    if (existingDate) {
      try {
        const raw = existingDate.includes("T") ? existingDate : `${existingDate}T00:00:00`;
        const d = new Date(raw);
        setInterviewDate(d.toLocaleDateString("en-CA"));
        setInterviewTime(d.toTimeString().slice(0, 5));
      } catch {
        const now = new Date();
        setInterviewDate(now.toLocaleDateString("en-CA"));
        setInterviewTime(now.toTimeString().slice(0, 5));
      }
    } else {
      const now = new Date();
      setInterviewDate(now.toLocaleDateString("en-CA"));
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
      const targetStage = (activeRole?.pipeline_stages || DEFAULT_STAGES).find((s) => s.id === schedulingData.stageId);
      const timeStr = interviewTime || "09:00";

      const pad = (n: number) => String(n).padStart(2, "0");
      const now = new Date();
      const offset = -now.getTimezoneOffset();
      const sign = offset >= 0 ? "+" : "-";
      const tzOffset = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
      const dateTime = `${interviewDate}T${timeStr}:00${tzOffset}`;

      const isInterview = targetStage?.title.toLowerCase().includes("interview");

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
    } catch {
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
    } catch {
      toast.error("Failed to delete note");
    }
  };

  // ─── Interviewers handlers ─────────────────────────────
  const handleCreateInterviewer = async () => {
    if (!interviewerForm.name.trim() || !interviewerForm.email.trim()) {
      toast.error("Please fill in Name and Email");
      return;
    }
    setSavingInterviewer(true);
    try {
      await createInterviewer({
        name: interviewerForm.name.trim(),
        email: interviewerForm.email.trim(),
        phone: interviewerForm.phone.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["interviewers"] });
      setInterviewerModalOpen(false);
      setInterviewerForm({ name: "", email: "", phone: "" });
      toast.success("Interviewer added successfully");
      window.location.reload();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to create interviewer";
      toast.error(msg);
    } finally {
      setSavingInterviewer(false);
    }
  };

  const handleUpdateInterviewer = async () => {
    if (!editInterviewerId) return;
    if (!interviewerForm.name.trim() || !interviewerForm.email.trim()) {
      toast.error("Please fill in Name and Email");
      return;
    }
    setSavingInterviewer(true);
    try {
      await updateInterviewer(editInterviewerId, {
        name: interviewerForm.name.trim(),
        email: interviewerForm.email.trim(),
        phone: interviewerForm.phone.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["interviewers"] });
      setInterviewerModalOpen(false);
      setEditInterviewerId(null);
      setInterviewerForm({ name: "", email: "", phone: "" });
      setSelectedInterviewerIds([]);
      toast.success("Interviewer updated successfully");
      window.location.reload();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to update interviewer";
      toast.error(msg);
    } finally {
      setSavingInterviewer(false);
    }
  };

  const handleDeleteInterviewer = async () => {
    if (selectedInterviewerIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the selected interviewer(s)?`)) return;
    try {
      for (const id of selectedInterviewerIds) {
        await deleteInterviewer(id);
      }
      await queryClient.invalidateQueries({ queryKey: ["interviewers"] });
      setSelectedInterviewerIds([]);
      toast.success("Interviewer(s) deleted successfully");
      window.location.reload();
    } catch {
      toast.error("Failed to delete selected interviewer(s)");
    }
  };

  const openAddInterviewer = () => {
    setEditInterviewerId(null);
    setInterviewerForm({ name: "", email: "", phone: "" });
    setInterviewerModalOpen(true);
  };

  const openEditInterviewer = () => {
    if (selectedInterviewerIds.length !== 1) return;
    const selectedId = selectedInterviewerIds[0];
    const target = interviewers.find(i => i.id === selectedId);
    if (!target) return;
    setEditInterviewerId(selectedId);
    setInterviewerForm({
      name: target.name,
      email: target.email,
      phone: target.phone || "",
    });
    setInterviewerModalOpen(true);
  };

  // ─── Interviews Scheduled handlers ──────────────────────
  const handleCreateSchedule = async () => {
    const { job_role_id, interviewer_id, date, time, venue } = scheduleForm;
    if (!job_role_id || !interviewer_id || !date || !time || !venue) {
      toast.error("Please fill in all details");
      return;
    }
    setSavingSchedule(true);
    try {
      await createInterviewSchedule({
        job_role_id: parseInt(job_role_id),
        interviewer_id: parseInt(interviewer_id),
        date,
        time,
        venue,
      });
      await queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });
      setScheduleModalOpen(false);
      setScheduleForm({
        job_role_id: "",
        interviewer_id: "",
        date: "",
        time: "",
        venue: "Online",
      });
      toast.success("Interview scheduled successfully");
      window.location.reload();
    } catch {
      toast.error("Failed to schedule interview");
    } finally {
      setSavingSchedule(false);
    }
  };

  const openScheduleModal = () => {
    setScheduleForm({
      job_role_id: companyRoles[0]?.id?.toString() || "",
      interviewer_id: allInterviewers[0]?.id?.toString() || "",
      date: new Date().toLocaleDateString("en-CA"),
      time: "10:00",
      venue: "Online",
    });
    setScheduleModalOpen(true);
  };

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  if (companiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Internal Hiring"
          description="Internal and in-house hiring for Altzor Digital Solutions"
        />
        <div className="glass-card p-8 text-center text-muted-foreground">
          <p>Company "Altzor Digital Solutions" not found. Please verify backend database seeds.</p>
        </div>
      </div>
    );
  }

  const isPipeline = activeTab === "pipeline";

  return (
    <div className={isPipeline ? "h-[calc(100vh-110px)] md:h-[calc(100vh-130px)] flex flex-col overflow-hidden space-y-3" : ""}>
      <PageHeader
        title="Internal Hiring"
        description="Internal and in-house hiring for Altzor Digital Solutions"
        actions={
          <div className="flex gap-2">
            {[
              { label: "Roles", value: roleCountByCompany.get(selectedCompanyId!) || 0 },
              { label: "Open", value: openRoleCountByCompany.get(selectedCompanyId!) || 0 },
              { label: "In Progress", value: pipelineTotalCount },
            ].map((s) => (
              <div key={s.label} className="bg-secondary/60 rounded-lg px-4 py-2 text-center min-w-[70px]">
                <div className="text-lg font-bold text-primary">{s.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        }
      />

      <div className={`glass-card overflow-hidden ${isPipeline ? "flex-1 flex flex-col min-h-0" : ""}`}>
        {/* Tabs */}
        <div className="flex items-center border-b border-border px-5 pt-1">
          {([
            { key: "roles" as const, label: "Job Roles", icon: Briefcase, count: null },
            { key: "candidates" as const, label: "Candidates", icon: Users, count: candTotal },
            { key: "pipeline" as const, label: "In Progress", icon: GitBranch, count: pipelineTotalCount },
            { key: "interviewers" as const, label: "Interviewer", icon: UserCheck, count: interviewers.length },
            { key: "interviews_scheduled" as const, label: "Interviews scheduled", icon: Clock, count: candidateSchedules.length },
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
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-border/60 ${
                      selectedRoleIds.length > 0 
                        ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-600/15" 
                        : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <UserCheck className="w-4 h-4" /> Assign to Vendor {selectedRoleIds.length > 0 && `(${selectedRoleIds.length})`}
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                  <button
                    onClick={openAddRole}
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
                  <button onClick={openAddRole} className="mt-4 text-xs text-primary font-bold hover:underline underline-offset-4">
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
              <div className="flex items-center justify-between gap-3 mb-4">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCandFiltersOpen(!candFiltersOpen)}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors ${candFiltersOpen || candExpFilter !== 0 || candSkillFilter ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <Filter className="w-4 h-4" /> Filters
                  </button>
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                </div>
              </div>
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

          {/* ═══ INTERVIEWERS TAB ═══ */}
          {activeTab === "interviewers" && (
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <button
                  onClick={openAddInterviewer}
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Plus className="w-4 h-4" /> Add Interviewer
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openEditInterviewer}
                    disabled={selectedInterviewerIds.length !== 1}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border ${
                      selectedInterviewerIds.length === 1
                        ? "bg-amber-600 border-amber-600/30 text-white hover:bg-amber-700"
                        : "bg-secondary text-muted-foreground/40 border-border/40 cursor-not-allowed"
                    }`}
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (selectedInterviewerIds.length !== 1) return;
                      const selectedInterviewer = interviewers.find(i => i.id === selectedInterviewerIds[0]);
                      if (!selectedInterviewer) return;
                      setResetInterviewer(selectedInterviewer);
                      setNewPassword("");
                      setResetSuccess(false);
                      setResetPasswordCopied(false);
                      setAdminResetModalOpen(true);
                    }}
                    disabled={selectedInterviewerIds.length !== 1}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border ${
                      selectedInterviewerIds.length === 1
                        ? "bg-violet-600 border-violet-600/30 text-white hover:bg-violet-700"
                        : "bg-secondary text-muted-foreground/40 border-border/40 cursor-not-allowed"
                    }`}
                    title="Reset the password for the selected interviewer"
                  >
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </button>
                  <button
                    onClick={handleDeleteInterviewer}
                    disabled={selectedInterviewerIds.length === 0}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border ${
                      selectedInterviewerIds.length > 0
                        ? "bg-destructive border-destructive/30 text-white hover:bg-destructive/90"
                        : "bg-secondary text-muted-foreground/40 border-border/40 cursor-not-allowed"
                    }`}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
                <div className="ml-auto relative flex-1 max-w-xs min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search interviewers..."
                    value={interviewerSearch}
                    onChange={(e) => setInterviewerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-secondary/10">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 w-12 text-center">
                        <div 
                          className="p-1 cursor-pointer inline-block"
                          onClick={() => {
                            if (selectedInterviewerIds.length === interviewers.length) {
                              setSelectedInterviewerIds([]);
                            } else {
                              setSelectedInterviewerIds(interviewers.map(i => i.id));
                            }
                          }}
                        >
                          <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${selectedInterviewerIds.length > 0 && selectedInterviewerIds.length === interviewers.length ? "bg-primary border-primary text-white" : "border-muted-foreground/30 hover:border-primary/50"}`}>
                            {selectedInterviewerIds.length > 0 && selectedInterviewerIds.length === interviewers.length && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </th>
                      <th className="p-4">Interviewer</th>
                      <th className="p-4">Email ID</th>
                      <th className="p-4">Phone Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-sm">
                    {interviewers.map((item) => {
                      const isSelected = selectedInterviewerIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-primary/[0.02] transition-colors cursor-pointer ${
                            isSelected ? "bg-primary/[0.02] font-medium" : ""
                          }`}
                          onClick={() => {
                            setSelectedInterviewerIds(prev =>
                              prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                            );
                          }}
                        >
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div 
                              className="p-1 cursor-pointer inline-block"
                              onClick={() => {
                                setSelectedInterviewerIds(prev =>
                                  prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                );
                              }}
                            >
                              <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30 hover:border-primary/50"}`}>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                              {item.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "IN"}
                            </div>
                            <span className="text-foreground font-semibold">{item.name}</span>
                          </td>
                          <td className="p-4 text-muted-foreground">{item.email}</td>
                          <td className="p-4 text-muted-foreground">{item.phone || "—"}</td>
                        </tr>
                      );
                    })}
                    {interviewers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-muted-foreground">
                          <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>No interviewers found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ INTERVIEWS SCHEDULED TAB ═══ */}
          {activeTab === "interviews_scheduled" && (
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <button
                  onClick={openScheduleModal}
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Plus className="w-4 h-4" /> Schedule interviews
                </button>
              </div>

              {/* ── Job Role Filter Buttons ── */}
              {candidateSchedules.length > 0 && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <button
                    onClick={() => setScheduleRoleFilter(null)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                      !validScheduleRoleFilter
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
                    }`}
                  >
                    All ({candidateSchedules.length})
                  </button>
                  {scheduledRoleIds.map((roleId) => {
                    const role = companyRoles.find((r) => r.id === roleId) ||
                      jobRoles.find((r) => r.id === roleId);
                    const roleTitle = role?.title || `Role #${roleId}`;
                    const count = candidateSchedules.filter((s) => s.job_role_id === roleId).length;
                    const isActive = validScheduleRoleFilter === roleId;
                    return (
                      <button
                        key={roleId}
                        onClick={() => setScheduleRoleFilter(roleId)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                            : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {roleTitle} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-border bg-secondary/10">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Job Role</th>
                      <th className="p-4">Candidate</th>
                      <th className="p-4">Interviewer</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Time</th>
                      <th className="p-4">Venue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-sm">
                    {filteredCandidateSchedules.map((item) => {
                      return (
                      <tr
                        key={item.uniqueKey}
                        className="hover:bg-primary/[0.02] transition-colors"
                      >
                        <td className="p-4 font-semibold text-foreground">{item.job_role_title || `Role #${item.job_role_id}`}</td>
                        <td className="p-4">
                          {item.displayCandidateName === "—" || (item.candidate_ids?.length ?? 0) === 0 ? (
                            <button
                              onClick={() => openAssignedCandidatesModal(item)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all flex items-center gap-1.5"
                            >
                              <Users className="w-3.5 h-3.5" shrink-0="true" />
                              Assign Candidate
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-foreground font-medium">{item.displayCandidateName}</span>
                              <button
                                onClick={() => openAssignedCandidatesModal(item)}
                                className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Edit Assigned Candidates"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <select
                            value={item.interviewer_id}
                            onChange={async (e) => {
                              const newId = parseInt(e.target.value);
                              try {
                                await updateInterviewSchedule(item.id, { interviewer_id: newId });
                                await queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });
                                toast.success("Interviewer updated successfully");
                              } catch {
                                toast.error("Failed to update interviewer");
                              }
                            }}
                            className="bg-secondary/50 border border-border/50 text-foreground text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-[150px] truncate"
                          >
                            {allInterviewers.map((int: any) => (
                              <option key={int.id} value={int.id} className="bg-popover text-popover-foreground">
                                {int.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <EditableDateInput
                            value={item.date}
                            onSave={async (newDate) => {
                              try {
                                await updateInterviewSchedule(item.id, { date: newDate });
                                await queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });
                                toast.success("Date updated successfully");
                              } catch {
                                toast.error("Failed to update date");
                              }
                            }}
                          />
                        </td>
                        <td className="p-4">
                          <EditableTimeInput
                            value={item.time}
                            onSave={async (newTime) => {
                              try {
                                await updateInterviewSchedule(item.id, { time: newTime });
                                await queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });
                                toast.success("Time updated successfully");
                              } catch {
                                toast.error("Failed to update time");
                              }
                            }}
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={item.venue}
                            onChange={async (e) => {
                              const newVenue = e.target.value;
                              try {
                                await updateInterviewSchedule(item.id, { venue: newVenue });
                                await queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });
                                toast.success("Venue updated successfully");
                              } catch {
                                toast.error("Failed to update venue");
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                              item.venue.toLowerCase() === "online" 
                                ? "bg-sky-500/10 text-sky-500 border-sky-500/20" 
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}
                          >
                            <option value="Online" className="bg-popover text-popover-foreground">Online</option>
                            <option value="Office" className="bg-popover text-popover-foreground">Office</option>
                          </select>
                        </td>
                      </tr>
                      );
                    })}
                     {filteredCandidateSchedules.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>{candidateSchedules.length === 0 ? "No interviews scheduled yet" : "No interviews for this role"}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Reset Password Modal */}
      <Modal
        open={adminResetModalOpen}
        onClose={() => setAdminResetModalOpen(false)}
        title="Reset Interviewer Password"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <KeyRound className="w-6 h-6 text-violet-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Resetting password for:
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-bold text-foreground">{resetInterviewer?.name}</span> ({resetInterviewer?.email})
              </p>
            </div>
          </div>

          {!resetSuccess ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newPassword.trim() || newPassword.length < 6) {
                  toast.error("Password must be at least 6 characters");
                  return;
                }
                setSavingReset(true);
                try {
                  await adminResetInterviewerPassword(resetInterviewer.id, { password: newPassword });
                  setResetSuccess(true);
                  toast.success("Password reset successfully");
                } catch (err: any) {
                  toast.error(err?.response?.data?.detail || "Failed to reset password");
                } finally {
                  setSavingReset(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 bg-secondary border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                      let pass = "";
                      for (let i = 0; i < 10; i++) {
                        pass += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setNewPassword(pass);
                    }}
                    className="px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAdminResetModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 border border-border transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReset}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
                >
                  {savingReset ? "Saving..." : "Reset Password"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">New Password</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-mono break-all select-all font-bold">
                    {newPassword}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword).then(() => {
                        setResetPasswordCopied(true);
                        setTimeout(() => setResetPasswordCopied(false), 2500);
                      });
                    }}
                    className={`shrink-0 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border ${
                      resetPasswordCopied
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                        : "bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground hover:border-transparent"
                    }`}
                  >
                    {resetPasswordCopied ? (
                      <><Check className="w-4 h-4" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy</>
                    )}
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600">
                You can now share this password with the interviewer through external means of communication.
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setAdminResetModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 border border-border transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
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
              <p className="text-[10px] text-muted-foreground italic">No active vendors found.</p>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-xs text-foreground flex items-center justify-between hover:bg-secondary/80 transition-colors"
                >
                  <span className="truncate">
                    {selectedVendorIds.length === 0 
                      ? "Select Vendors..." 
                      : selectedVendorIds.map(id => { const v = vendors.find(v => v.id === id); return v ? (v.company_name || v.name) : ""; }).filter(Boolean).join(", ")
                    }
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 ml-2" />
                </button>

                {vendorDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setVendorDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md z-50 p-1 divide-y divide-border/50">
                      {vendors.map((v) => {
                        const isSelected = selectedVendorIds.includes(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedVendorIds(prev =>
                                prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                              );
                            }}
                            className="w-full px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                          >
                            <span className="font-medium truncate">{v.name} ({v.company_name})</span>
                            <div className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center shrink-0 ml-2 ${isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"}`}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Required Positions</label>
              <input
                type="number"
                min="1"
                value={roleForm.positions_required}
                onChange={(e) => setRoleForm({ ...roleForm, positions_required: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Required Experience (Yrs)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={roleForm.experience_required}
                onChange={(e) => setRoleForm({ ...roleForm, experience_required: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Job Location</label>
              <input
                type="text"
                value={roleForm.location}
                onChange={(e) => setRoleForm({ ...roleForm, location: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Pune, India"
              />
            </div>
            <div>
              <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Work Mode</label>
              <select
                value={roleForm.work_mode}
                onChange={(e) => setRoleForm({ ...roleForm, work_mode: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
              >
                <option value="onsite">🏢 Onsite</option>
                <option value="remote">🌐 Remote</option>
                <option value="hybrid">🔀 Hybrid</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Department</label>
              <input
                type="text"
                value={roleForm.department}
                onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Engineering, Sales"
              />
            </div>
            <div>
              <label className="label-text mb-2 block text-xs font-bold uppercase tracking-wider">Project Time Period</label>
              <input
                type="text"
                value={roleForm.project_time_period}
                onChange={(e) => setRoleForm({ ...roleForm, project_time_period: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 6 Months (Extendable)"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block">Estimated Budget</label>
              <div className="relative">
                <input
                  type="number"
                  value={roleForm.estimated_budget}
                  onChange={(e) => setRoleForm({ ...roleForm, estimated_budget: e.target.value })}
                  className="w-full pl-8 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Budget amount"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold pointer-events-none">
                  {roleForm.currency === "INR" ? "₹" : "$"}
                </span>
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

      {/* Talent Pool Upload Modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Talent Pool Upload"
      >
        <div className="max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
          <UploadPage
            prefilledCompanyId={selectedCompanyId ?? undefined}
            onSuccess={() => {
              setUploadModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ["candidates-hub"] });
              queryClient.invalidateQueries({ queryKey: ["pipeline"] });
              window.location.reload();
            }}
          />
        </div>
      </Modal>

      {/* Add/Edit Interviewer Modal */}
      <Modal
        open={interviewerModalOpen}
        onClose={() => setInterviewerModalOpen(false)}
        title={editInterviewerId ? "Edit Interviewer" : "Add Interviewer"}
      >
        <div className="space-y-4">
          <div>
            <label className="label-text mb-2 block">Interviewer</label>
            <input
              type="text"
              value={interviewerForm.name}
              onChange={(e) => setInterviewerForm({ ...interviewerForm, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Email-ID</label>
            <input
              type="email"
              value={interviewerForm.email}
              onChange={(e) => setInterviewerForm({ ...interviewerForm, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. john.doe@example.com"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Phone number</label>
            <input
              type="text"
              value={interviewerForm.phone}
              onChange={(e) => setInterviewerForm({ ...interviewerForm, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. +1 (555) 019-2834"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setInterviewerModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={editInterviewerId ? handleUpdateInterviewer : handleCreateInterviewer}
              disabled={savingInterviewer}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all glow-primary flex items-center justify-center gap-2"
            >
              {savingInterviewer && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editInterviewerId ? "Update Interviewer" : "Add Interviewer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Interview"
      >
        <div className="space-y-4">
          <div>
            <label className="label-text mb-2 block font-medium">Job Roles</label>
            <select
              value={scheduleForm.job_role_id}
              onChange={(e) => setScheduleForm({ ...scheduleForm, job_role_id: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="" disabled>Select Job Role</option>
              {companyRoles.map((role) => (
                <option key={role.id} value={role.id}>{role.title}</option>
              ))}
            </select>
          </div>


          <div>
            <label className="label-text mb-2 block font-medium">Interviewer</label>
            <select
              value={scheduleForm.interviewer_id}
              onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer_id: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="" disabled>Select Interviewer</option>
              {allInterviewers.map((intv) => (
                <option key={intv.id} value={intv.id}>{intv.name} ({intv.email})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block font-medium">Date</label>
              <input
                type="date"
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="label-text mb-2 block font-medium">Time</label>
              <input
                type="time"
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="label-text mb-2 block font-medium">Venue</label>
            <select
              value={scheduleForm.venue}
              onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="Online">Online</option>
              <option value="Office">Office</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSchedule}
              disabled={savingSchedule}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all glow-primary flex items-center justify-center gap-2"
            >
              {savingSchedule && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Schedule Interview
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

      {/* Assigned Candidates Modal */}
      <Modal
        open={assignedCandidatesModalOpen}
        onClose={() => setAssignedCandidatesModalOpen(false)}
        title={isAddingCandidates ? "Assign Candidates" : "Assigned Candidates"}
      >
        <div className="space-y-4">
          {selectedSchedule && (
            <div className="p-3 bg-secondary/50 rounded-xl border border-border/50 text-xs space-y-1.5 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Job Role</span>
                <span className="text-foreground font-black uppercase tracking-wider">{selectedSchedule.job_role_title}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-1.5">
                <span className="text-muted-foreground font-semibold">Interviewer</span>
                <span className="text-foreground font-bold">{selectedSchedule.interviewer_name}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-1.5">
                <span className="text-muted-foreground font-semibold">Schedule Info</span>
                <span className="text-foreground font-bold">{selectedSchedule.date} at {selectedSchedule.time} ({selectedSchedule.venue})</span>
              </div>
            </div>
          )}

          {!isAddingCandidates ? (
            <div className="space-y-4">
              <div>
                <label className="label-text mb-2 block font-bold text-xs uppercase tracking-wider text-muted-foreground">Currently Assigned</label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {(() => {
                    const assigned = companyCandidates.filter(c => selectedModalCandidateIds.includes(c.id));
                    if (assigned.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground bg-secondary/20 border border-dashed border-border/50 rounded-xl">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">No candidates assigned to this interview yet</p>
                        </div>
                      );
                    }
                    return assigned.map((c) => {
                      const displayName = c.name || "Unknown";
                      const initials = displayName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                              {initials || "NA"}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-foreground truncate">{displayName}</h4>
                              <p className="text-[10px] text-muted-foreground truncate">{c.email || "No email"} · {c.experience_years || 0} yrs</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCandidate(c.id)}
                            disabled={assigningCandidates}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove Candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCandidates(true)}
                className="w-full py-2.5 rounded-lg border border-dashed border-primary/30 text-primary hover:bg-primary/5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                <Plus className="w-4 h-4" /> Assign Candidates
              </button>

              <div className="pt-2 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setAssignedCandidatesModalOpen(false)}
                  className="w-full py-3 bg-secondary rounded-lg text-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label-text mb-2 block font-bold text-xs uppercase tracking-wider">Select Candidates</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={modalCandSearch}
                    onChange={(e) => setModalCandSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredModalCandidates.map((c) => {
                    const isChecked = selectedModalCandidateIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked 
                            ? "bg-primary/[0.03] border-primary/30" 
                            : "bg-secondary/20 border-border/50 hover:border-primary/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedModalCandidateIds(prev =>
                              prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className="rounded border-muted-foreground/30 text-primary focus:ring-primary/50 w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{c.name || "Unknown"}</h4>
                          <p className="text-[10px] text-muted-foreground truncate">{c.email || "No email"} · {c.experience_years || 0} yrs</p>
                        </div>
                      </label>
                    );
                  })}
                  {filteredModalCandidates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No candidates found</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsAddingCandidates(false)}
                  className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAssignCandidates}
                  disabled={assigningCandidates}
                  className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all glow-primary flex items-center justify-center gap-2"
                >
                  {assigningCandidates && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Assign
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
