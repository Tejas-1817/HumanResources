import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  RefreshCw,
  Video,
  Building2,
  CheckCircle2,
  CalendarClock,
  Users,
  Filter,
  X,
  GitBranch,
  MessageSquare,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInterviewerInterviews,
  InterviewSchedule,
  getJobRoles,
  getPipeline,
  getCompanies,
  updatePipelineStatus,
  updateJobRole,
} from "@/api/resumeiq";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkillTag } from "@/components/ui/SkillTag";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const getInitials = (name: string) => {
  if (!name) return "C";
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
};

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

const InterviewerDashboard = () => {
  const navigate = useNavigate();
  const { interviewer } = useAuth();
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);

  // Note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalData, setNoteModalData] = useState<any | null>(null);
  const [noteValue, setNoteValue] = useState("");

  // Drag/Drop and Scheduling state
  const queryClient = useQueryClient();
  const [draggedCard, setDraggedCard] = useState<{ id: number; fromCol: string; name: string; currentInterviewDate?: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [schedulingData, setSchedulingData] = useState<{ id: number; stageId: string; name: string } | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewNote, setInterviewNote] = useState("");

  // Tabs state
  const [activeTab, setActiveTab] = useState<"interviews_scheduled" | "pipeline">("interviews_scheduled");

  // ─── Company context (Altzor Digital Solutions) ──────────────────────────
  const { data: companiesData } = useQuery({
    queryKey: ["companies", { include_internal: true }],
    queryFn: () => getCompanies({ include_internal: true }),
  });
  const selectedCompany = useMemo(() => {
    return (companiesData ?? []).find((c) => c.name === "Altzor Digital Solutions") ?? null;
  }, [companiesData]);
  const selectedCompanyId = selectedCompany?.id ?? null;

  // ─── Pipeline Tab state & queries ───────────────────────────────────────────
  const { data: jobRolesData } = useQuery({
    queryKey: ["job-roles"],
    queryFn: () => getJobRoles(),
    enabled: !!selectedCompanyId,
  });
  const { data: pipelineData } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => getPipeline(),
    enabled: !!selectedCompanyId,
  });

  const jobRoles = jobRolesData ?? [];
  const pipeline = pipelineData ?? {};
  const roleById = useMemo(() => new Map(jobRoles.map((r) => [r.id, r])), [jobRoles]);
  const companyRoles = useMemo(() => {
    if (!selectedCompanyId) return [];
    return jobRoles.filter((r) => r.company_id === selectedCompanyId);
  }, [jobRoles, selectedCompanyId]);

  const [pipelineRoleFilter, setPipelineRoleFilter] = useState<number | string | null>(null);

  const filterButtons = useMemo(() => {
    const filteredRoles = companyRoles.filter((r) => r.title.toLowerCase() !== "general");
    return [
      { id: "all" as const, title: "All" },
      ...filteredRoles
    ];
  }, [companyRoles]);

  // Auto-select "all" filter when Pipeline tab is entered
  useEffect(() => {
    if (activeTab === "pipeline" && !pipelineRoleFilter) {
      setPipelineRoleFilter("all");
    }
  }, [activeTab, pipelineRoleFilter]);

  const companyPipelineColumns = useMemo(() => {
    if (!selectedCompanyId) return [];

    if (!pipelineRoleFilter) {
      return DEFAULT_STAGES.map((stage) => ({
        ...stage,
        cards: [],
      }));
    }

    const isAll = pipelineRoleFilter === "all";
    const activeRole = (!isAll && typeof pipelineRoleFilter === "number") ? roleById.get(pipelineRoleFilter) : null;
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
          if (c.companyId !== selectedCompanyId) return false;
          if (isAll) return true;
          return c.roleId === pipelineRoleFilter;
        }),
    }));
  }, [pipeline, roleById, selectedCompanyId, pipelineRoleFilter]);

  const pipelineCandidates = useMemo(() => {
    const list = companyPipelineColumns.flatMap((col) =>
      col.cards.map((card) => ({
        ...card,
        stageId: col.id,
        stageTitle: col.title,
      }))
    );

    return list.sort((a, b) => {
      const getScore = (status: string) => {
        const s = status.toLowerCase();
        if (s === "selected") return 1;
        if (s === "pending") return 1.5;
        if (s === "on_hold") return 2;
        if (s === "dropped") return 2.5;
        if (s === "rejected") return 3;
        return 2;
      };

      const scoreA = getScore(a.stageId);
      const scoreB = getScore(b.stageId);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [companyPipelineColumns]);

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

  const handleRowClick = (interview: any) => {
    setSelectedInterview(interview);
    setModalOpen(true);
  };

  const handleDragStart = (card: any, colId: string) => {
    setDraggedCard({
      id: card.id,
      fromCol: colId,
      name: card.name,
      currentInterviewDate: card.statusDate || card.interviewDate,
    });
  };

  const handleDrop = async (toColId: string, toIdx: number) => {
    setDropTarget(null);

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
    } catch {
      toast.error("Failed to schedule stage transition");
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
      toast.success("Feedback saved");
      setNoteModalOpen(false);
      setNoteModalData(null);
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  const handleDeleteNote = async (cardId: number, status: string) => {
    try {
      await updatePipelineStatus(cardId, status, "clear", null, null, null, "clear");
      toast.success("Feedback removed");
      setNoteModalOpen(false);
      setNoteModalData(null);
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    } catch {
      toast.error("Failed to delete feedback");
    }
  };

  const handleRemoveStage = async (roleId: number, stageId: string) => {
    const role = roleById.get(roleId);
    if (!role) return;
    const stageToRemove = (role.pipeline_stages || DEFAULT_STAGES).find((s) => s.id === stageId);
    if (!confirm(`Remove the "${stageToRemove?.title}" stage?`)) return;
    const updatedStages = (role.pipeline_stages || [...DEFAULT_STAGES]).filter((s) => s.id !== stageId);
    try {
      await updateJobRole(roleId, { pipeline_stages: updatedStages });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success(`Stage "${stageToRemove?.title}" removed`);
    } catch {
      toast.error("Failed to remove stage");
    }
  };

  const uniqueInterviews = useMemo(() => {
    const groups: { [key: string]: typeof interviews[0] & { candidate_names: string[], candidate_ids: number[] } } = {};
    interviews.forEach((item) => {
      const key = `${item.job_role_id}-${item.date}-${item.time}-${(item.venue || "").toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          ...item,
          candidate_names: item.candidate_name ? [item.candidate_name] : [],
          candidate_ids: item.candidate_id ? [item.candidate_id] : [],
        };
      } else {
        const g = groups[key];
        if (item.candidate_name && !g.candidate_names.includes(item.candidate_name)) {
          g.candidate_names.push(item.candidate_name);
        }
        if (item.candidate_id && !g.candidate_ids.includes(item.candidate_id)) {
          g.candidate_ids.push(item.candidate_id);
        }
      }
    });
    return Object.values(groups);
  }, [interviews]);

  const fetchInterviews = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await getInterviewerInterviews();
      setInterviews(data);
    } catch {
      toast.error("Failed to load interviews.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayInterviews = uniqueInterviews.filter((i) => i.date === today);
  const onlineInterviews = uniqueInterviews.filter(
    (i) => i.venue?.toLowerCase() === "online"
  );
  const officeInterviews = uniqueInterviews.filter(
    (i) => i.venue?.toLowerCase() === "office"
  );

  const venueStyle = (venue: string) => {
    const v = venue?.toLowerCase();
    if (v === "online")
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    if (v === "office")
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="My Interview Schedule"
        description={`${greeting}, ${interviewer?.name || "Interviewer"} — here are your assigned sessions`}
        actions={
          <button
            onClick={() => fetchInterviews(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary transition-all text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Scheduled"
          value={uniqueInterviews.length}
          icon={CalendarClock}
          trend={`${uniqueInterviews.length} Session${uniqueInterviews.length !== 1 ? "s" : ""}`}
          description="All assigned interviews"
          color="primary"
          delay={0.05}
        />
        <StatCard
          label="Today's Interviews"
          value={todayInterviews.length}
          icon={CheckCircle2}
          trend={todayInterviews.length > 0 ? "Upcoming" : "None Today"}
          description="Scheduled for today"
          color="accent"
          delay={0.1}
        />
        <StatCard
          label="Online"
          value={onlineInterviews.length}
          icon={Video}
          trend="Virtual"
          description="Remote sessions"
          color="success"
          delay={0.15}
        />
        <StatCard
          label="In Office"
          value={officeInterviews.length}
          icon={Building2}
          trend="On-site"
          description="Physical sessions"
          color="warning"
          delay={0.2}
        />
      </div>

      {/* ── Tabs container ── */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        {/* Tab Selection Bar */}
        <div className="flex items-center border-b border-border px-5 pt-1">
          {([
            { key: "interviews_scheduled" as const, label: "Scheduled Interviews", icon: CalendarClock, count: uniqueInterviews.length },
            { key: "pipeline" as const, label: "In Progress", icon: GitBranch, count: pipelineTotalCount },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === t.key ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* ═══ SCHEDULED INTERVIEWS TAB ═══ */}
          {activeTab === "interviews_scheduled" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="heading-md font-bold text-foreground">Scheduled Interviews</h3>
                  <p className="body-text mt-1">Your upcoming interview sessions</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                  {uniqueInterviews.length} Sessions
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm animate-pulse">
                    Loading your interviews...
                  </p>
                </div>
              ) : uniqueInterviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
                    <Calendar className="w-10 h-10 text-primary/40" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    No interviews scheduled yet
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    When the HR team assigns you interviews, they'll appear here with
                    full details.
                  </p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-[2rem_1.2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 mb-2 rounded-lg bg-secondary/50 border border-border/50">
                    <span className="label-text text-center">#</span>
                    <span className="label-text flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <Briefcase className="w-3.5 h-3.5" /> Position
                    </span>
                    <span className="label-text flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <Calendar className="w-3.5 h-3.5" /> Date
                    </span>
                    <span className="label-text flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </span>
                    <span className="label-text flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <MapPin className="w-3.5 h-3.5" /> Venue
                    </span>
                    <span className="label-text flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <Users className="w-3.5 h-3.5" /> Candidates
                    </span>
                  </div>

                  {/* Table Rows */}
                  <div className="space-y-2">
                    {uniqueInterviews.map((interview, index) => (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        onClick={() => handleRowClick(interview)}
                        className="group grid grid-cols-1 md:grid-cols-[2rem_1.2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3.5 rounded-xl bg-secondary/20 hover:bg-secondary/50 border border-transparent hover:border-border/50 cursor-pointer transition-all"
                      >
                        {/* Row number */}
                        <div className="hidden md:flex w-6 h-6 rounded-md bg-primary/10 items-center justify-center text-primary text-[11px] font-bold font-mono">
                          {index + 1}
                        </div>

                        {/* Position */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                              {interview.job_role_title || "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider md:hidden">
                              Position
                            </p>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 md:hidden">
                            <Calendar className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {formatDate(interview.date)}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider md:hidden">
                              Date
                            </p>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 md:hidden">
                            <Clock className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {interview.time}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider md:hidden">
                              Time
                            </p>
                          </div>
                        </div>

                        {/* Venue */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 md:hidden">
                            <MapPin className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${venueStyle(interview.venue)}`}
                            >
                              {interview.venue?.toLowerCase() === "online" ? (
                                <Video className="w-3 h-3" />
                              ) : (
                                <Building2 className="w-3 h-3" />
                              )}
                              {interview.venue}
                            </span>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider md:hidden">
                              Venue
                            </p>
                          </div>
                        </div>

                        {/* Candidates */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 md:hidden">
                            <Users className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            {interview.candidate_names.length === 0 ? (
                              <span className="text-sm text-muted-foreground italic">—</span>
                            ) : (
                              interview.candidate_names.map((name, i) => {
                                const initials = name
                                  .trim()
                                  .split(/\s+/)
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase();
                                return (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/5 border border-primary/10 text-foreground text-xs font-medium max-w-[160px] truncate"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                                      {initials}
                                    </span>
                                    <span className="truncate">{name}</span>
                                  </span>
                                );
                              })
                            )}
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider md:hidden mt-0.5">
                              Candidates
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══ PIPELINE TAB ═══ */}
          {activeTab === "pipeline" && (
            <div>
              <div className="flex items-center gap-3 mb-5 overflow-x-auto pb-2 scrollbar-none">
                <div className="text-sm font-medium text-muted-foreground mr-2 flex items-center gap-1.5 border-r border-border pr-4 h-9 whitespace-nowrap">
                  <Filter className="w-4 h-4" /> Filter Pipeline:
                </div>
                {filterButtons.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setPipelineRoleFilter(role.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${pipelineRoleFilter === role.id ? "bg-primary text-primary-foreground font-bold" : "bg-secondary/80 text-muted-foreground hover:text-foreground"}`}
                  >
                    {role.title}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-muted-foreground">
                  Total Candidates: {pipelineCandidates.length}
                </span>
              </div>

              {!pipelineRoleFilter ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 bg-secondary/20 border border-border/50 border-dashed rounded-2xl min-h-[400px] text-center">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm ring-1 ring-primary/20">
                    <Briefcase className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Initialize Hub Pipeline</h3>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                    Select a specific job role to view recruitment stages.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelineCandidates.map((card, index) => {
                    const initials = card.name
                      ? card.name
                          .split(" ")
                          .filter(Boolean)
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "??";

                    return (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 rounded-xl bg-secondary/20 hover:bg-secondary/30 border border-border/50 hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Left: Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 ring-1 ring-primary/20">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                onClick={() => navigate(`/interviewer/candidates/${card.candidateId}`)}
                                className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                              >
                                {card.name}
                              </h4>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                card.stageId === 'selected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                card.stageId === 'on_hold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                card.stageId === 'rejected' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                'bg-primary/10 text-primary border border-primary/20'
                              }`}>
                                {card.stageTitle || card.stageId}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {card.role} · {card.experience} yrs exp
                            </p>
                            
                            {/* Skills */}
                            {card.skills && card.skills.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {card.skills.map((s: string) => (
                                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/50">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Feedback display */}
                            <div className="mt-2.5">
                              {card.remarks ? (
                                <div className="p-2.5 rounded-lg bg-primary/[0.02] border border-border/40 text-xs text-muted-foreground">
                                  <span className="font-bold text-primary mr-1">Feedback:</span>
                                  <span className="italic">"{card.remarks}"</span>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground/40 italic">
                                  No feedback added yet
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => {
                              setNoteValue(card.remarks || "");
                              setNoteModalData({ id: card.id, status: card.stageId, initialValue: card.remarks || "" });
                              setNoteModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-xs font-semibold"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Feedback
                          </button>

                          <select
                            value={card.stageId}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await updatePipelineStatus(
                                  card.id,
                                  newStatus,
                                  null,
                                  null,
                                  null,
                                  null,
                                  card.remarks || null
                                );
                                await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
                                toast.success(`Updated ${card.name}'s status to ${newStatus}`);
                              } catch {
                                toast.error("Failed to update status");
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                          >
                            {(roleById.get(card.roleId)?.pipeline_stages || DEFAULT_STAGES).map((stage: any) => (
                              <option key={stage.id} value={stage.id} className="bg-popover text-popover-foreground">
                                {stage.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </motion.div>
                    );
                  })}

                  {pipelineCandidates.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-xl">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No candidates in progress for this job role</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Today's highlight panel (only if there are interviews today and on the interviews tab) */}
      {activeTab === "interviews_scheduled" && todayInterviews.length > 0 && (
        <motion.div variants={item} className="glass-card p-6 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32 rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h3 className="heading-md mb-1">Today's Sessions</h3>
            <p className="body-text mb-5">
              You have {todayInterviews.length} interview
              {todayInterviews.length !== 1 ? "s" : ""} today
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todayInterviews.map((iv, i) => (
                <div
                  key={iv.id}
                  onClick={() => handleRowClick(iv)}
                  className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border/50 cursor-pointer transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-sm">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {iv.job_role_title || "Interview"}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                        <Clock className="w-2.5 h-2.5" /> {iv.time}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${venueStyle(iv.venue)}`}
                      >
                        {iv.venue}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Assigned Candidates Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedInterview(null);
        }}
        title="Assigned Candidates"
      >
        {selectedInterview && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <h4 className="text-sm font-bold text-foreground mb-2">Interview Details</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Position</span>
                  <span className="font-semibold text-foreground">{selectedInterview.job_role_title || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Venue</span>
                  <span className="font-semibold text-foreground">{selectedInterview.venue}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Date</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedInterview.date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Time</span>
                  <span className="font-semibold text-foreground">{selectedInterview.time}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Candidates ({selectedInterview.candidate_names?.length || 0})
              </h4>
              {(!selectedInterview.candidate_names || selectedInterview.candidate_names.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-secondary/10 rounded-xl border border-dashed border-border">
                  <Users className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No candidates assigned</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {selectedInterview.candidate_names.map((name: string, i: number) => {
                    const candidateId = selectedInterview.candidate_ids?.[i];
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (candidateId) {
                            setModalOpen(false);
                            setSelectedInterview(null);
                            navigate(`/interviewer/candidates/${candidateId}`);
                          }
                        }}
                        className={`flex items-center gap-3 p-3.5 rounded-xl bg-secondary/20 border border-border/50 transition-all ${candidateId ? "cursor-pointer hover:bg-primary/5 hover:border-primary/30 group" : ""}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                          {getInitials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate transition-colors ${candidateId ? "text-foreground group-hover:text-primary" : "text-foreground"}`}>
                            {name}
                          </p>
                          {candidateId && (
                            <p className="text-[10px] text-muted-foreground group-hover:text-primary/60 transition-colors font-medium mt-0.5">
                              View profile →
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        open={interviewModalOpen}
        onClose={() => { setInterviewModalOpen(false); setSchedulingData(null); }}
        title="Feedback"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Submit feedback for <strong>{schedulingData?.name}</strong>.
          </p>
          <div>
            <textarea
              value={interviewNote}
              onChange={(e) => setInterviewNote(e.target.value)}
              placeholder="Add feedback"
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
              Submit feedback
            </button>
          </div>
        </div>
      </Modal>

      {/* Note Management Modal */}
      <Modal
        open={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setNoteModalData(null); }}
        title="Candidate Feedback"
      >
        <div className="space-y-4">
          <div>
            <label className="label-text mb-2 block font-bold uppercase tracking-tight text-[10px]">Feedback</label>
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Write feedback for this candidate..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setNoteModalOpen(false); setNoteModalData(null); }}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors font-bold"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveNote()}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors font-bold"
            >
              Save Feedback
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default InterviewerDashboard;
