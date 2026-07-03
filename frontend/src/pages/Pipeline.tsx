import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plus, Filter, ChevronDown, GripVertical, User, UserCheck, Clock, Briefcase, MessageSquare, Save, Trash2, Edit2, X, Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getCandidates, getCompanies, getJobRoles, getPipeline, updatePipelineStatus, markPipelineSent } from "@/api/resumeiq";
interface PipelineCard {
  id: number;
  candidateId: number;
  name: string;
  role: string;
  roleId: number;
  companyId: number;
  companyName: string;
  createdAt: string;
  isReplacement?: boolean;
  resumeSent?: boolean;
  statusDate?: string;
  interviewDate?: string;
  remarks?: string | null;
}

interface Column {
  id: string;
  title: string;
  color: string;
  bgGlow: string;
  cards: PipelineCard[];
}

const stageMap: Array<{ id: string; title: string; color: string; bgGlow: string }> = [
  { id: "pending", title: "Pending", color: "bg-slate-400", bgGlow: "from-slate-400/10" },
  { id: "shortlisted", title: "Shortlisted", color: "bg-primary", bgGlow: "from-primary/10" },
  { id: "interview_scheduled", title: "Interview Scheduled", color: "bg-amber-500", bgGlow: "from-amber-500/10" },
  { id: "interviewed", title: "Interviewed", color: "bg-orange-500", bgGlow: "from-orange-500/10" },
  { id: "on_hold", title: "On Hold", color: "bg-orange-400", bgGlow: "from-orange-400/10" },
  { id: "rejected", title: "Rejected", color: "bg-destructive", bgGlow: "from-destructive/10" },
  { id: "selected", title: "Selected", color: "bg-emerald-500", bgGlow: "from-emerald-500/10" },
  { id: "dropped", title: "Dropped", color: "bg-zinc-400", bgGlow: "from-zinc-400/10" },
];

const Pipeline = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draggedCard, setDraggedCard] = useState<{ id: number; fromCol: string; name: string; companyId: number; currentInterviewDate?: string; isReplacement?: boolean } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [schedulingData, setSchedulingData] = useState<{ id: number; stageId: string; name: string } | null>(null);
  const [transitionDate, setTransitionDate] = useState("");
  const [transitionTime, setTransitionTime] = useState("");
  const [transitionNote, setTransitionNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [viewingNoteId, setViewingNoteId] = useState<number | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalData, setNoteModalData] = useState<{ id: number; status: string; initialValue: string } | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [isReplacement, setIsReplacement] = useState<boolean | null>(null);
  const [isPlacementMove, setIsPlacementMove] = useState<boolean>(false);

  const {
    data: pipelineData = {},
    refetch: refetchPipeline,
    isLoading: isPipelineQueryLoading
  } = useQuery({
    queryKey: ["pipeline", selectedCompanyId, selectedRoleId],
    queryFn: () => getPipeline(selectedRoleId ?? undefined, selectedCompanyId ?? undefined),
  });

  const { data: candidates } = useQuery({ queryKey: ["candidates-all"], queryFn: () => getCandidates({ page: 1, page_size: 500 }) });
  const { data: jobRoles } = useQuery({
    queryKey: ["job-roles", selectedCompanyId],
    queryFn: () => getJobRoles(selectedCompanyId ?? undefined)
  });
  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: () => getCompanies() });
  const companies = companiesData ?? [];

  // Auto-select first company and first job role as default state
  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId && !selectedRoleId && jobRoles && jobRoles.length > 0) {
      setSelectedRoleId(jobRoles[0].id);
    }
  }, [jobRoles, selectedCompanyId, selectedRoleId]);

  const pipeline = useMemo(() => pipelineData || {}, [pipelineData]);

  const candidateById = useMemo(() => new Map((candidates?.items || []).map((c) => [c.id, c])), [candidates?.items]);
  const roleById = useMemo(() => new Map((jobRoles || []).map((r) => [r.id, r])), [jobRoles]);
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  // Helper: map a raw application to a PipelineCard. Returns null if role can't be resolved.
  const mapAppToCard = useMemo(() => (app: any): PipelineCard | null => {
    const role = roleById.get(app.job_role_id);
    if (!role) return null;
    const companyId = role.company_id;
    const company = companyById.get(companyId);
    return {
      id: app.id,
      candidateId: app.candidate_id,
      name: candidateById.get(app.candidate_id)?.name || `Candidate #${app.candidate_id}`,
      role: role.title,
      roleId: app.job_role_id,
      companyId,
      companyName: role.company_name || `Company #${companyId}`,
      createdAt: app.created_at,
      isReplacement: app.is_replacement,
      resumeSent: app.resume_sent,
      statusDate: app.status_date,
      interviewDate: app.interview_date,
      remarks: app.remarks,
    };
  }, [roleById, companyById, candidateById]);

  // Build all resolved cards (unfiltered) — used for company badge counts
  const allCards: PipelineCard[] = useMemo(() => {
    return Object.values(pipeline)
      .flat()
      .map(mapAppToCard)
      .filter((c): c is PipelineCard => c !== null);
  }, [pipeline, mapAppToCard]);

  // Get unique companies that have pipeline data
  const companiesWithPipeline = useMemo(() => {
    const ids = new Set(allCards.map((c) => c.companyId));
    return companies.filter((c) => ids.has(c.id));
  }, [allCards, companies]);

  // Get roles for the selected company
  const rolesForSelectedCompany = useMemo(() => {
    if (!selectedCompanyId) return jobRoles || [];
    return (jobRoles || []).filter(r => r.company_id === selectedCompanyId);
  }, [jobRoles, selectedCompanyId]);

  // Build columns — filter strictly by selected company and role
  const columns: Column[] = useMemo(
    () => {
      // If no role is selected, return empty columns as per requirement
      if (!selectedRoleId) {
        return stageMap.map((stage) => ({
          ...stage,
          cards: [],
        }));
      }

      // Debug: log the pipeline data structure
      const pipelineKeys = Object.keys(pipeline || {});
      console.log(`[COLUMNS_BUILD] Pipeline keys: [${pipelineKeys.join(", ")}]`);
      console.log(`[COLUMNS_BUILD] Total applications in pipeline: ${Object.values(pipeline || {}).flat().length}`);
      console.log(`[COLUMNS_BUILD] Selected role ID: ${selectedRoleId}`);

      const filteredColumns = Object.keys(pipeline || {}).reduce((acc, status) => {
        const apps = pipeline[status] || [];
        const filtered = apps.filter((app: any) => {
          // Strict filtering by role_id as requested
          const matches = Number(app.job_role_id) === Number(selectedRoleId);
          return matches;
        });
        acc[status] = filtered;
        if (filtered.length > 0) {
          console.log(`[COLUMNS_BUILD] Status '${status}': ${filtered.length} apps (from ${apps.length} total)`);
        }
        return acc;
      }, {} as Record<string, any[]>);

      const columns = stageMap.map((stage) => {
        const stageApps = filteredColumns[stage.id] || [];
        const cards = stageApps
          .map(mapAppToCard)
          .filter((card): card is PipelineCard => card !== null);
        
        if (cards.length > 0) {
          console.log(`[COLUMNS_BUILD] Column '${stage.id}' (${stage.title}): ${cards.length} cards`);
        }
        
        return {
          id: stage.id,
          title: stage.title,
          color: stage.color,
          bgGlow: stage.bgGlow,
          cards,
        };
      });

      return columns;
    },
    [pipeline, mapAppToCard, selectedRoleId]
  );

  const totalFiltered = columns.reduce((sum, col) => sum + col.cards.length, 0);

  const handleDragStart = (card: PipelineCard, colId: string) => {
    setDraggedCard({
      id: card.id,
      fromCol: colId,
      name: card.name,
      companyId: card.companyId,
      currentInterviewDate: card.interviewDate,
      isReplacement: card.isReplacement
    });
  };

  const handleDrop = async (toColId: string) => {
    setDropTarget(null);
    if (!draggedCard || draggedCard.fromCol === toColId) {
      setDraggedCard(null);
      return;
    }

    if (selectedCompanyId !== null && draggedCard.companyId !== selectedCompanyId) {
      toast.error("Security alert: Cannot move candidates between companies!");
      setDraggedCard(null);
      return;
    }

    // Validate the target stage exists in stageMap
    const targetStage = stageMap.find(s => s.id === toColId);
    if (!targetStage) {
      console.error(`[DRAG_DROP] ERROR: Target stage '${toColId}' not found in stageMap!`);
      toast.error(`Invalid stage: ${toColId}`);
      setDraggedCard(null);
      return;
    }

    // ALWAYS open scheduling modal for ALL transitions
    console.log(`[DRAG_DROP] Dragging card ${draggedCard.id} (${draggedCard.name}) from '${draggedCard.fromCol}' to '${toColId}' (${targetStage.title})`);
    setSchedulingData({ id: draggedCard.id, stageId: toColId, name: draggedCard.name });
    setIsReplacement(draggedCard.isReplacement ?? null);
    
    const isRelevantStage = toColId === "selected" || 
                           toColId === "interview_scheduled" || 
                           targetStage.title.toLowerCase().includes("schedule") ||
                           targetStage.title.toLowerCase().includes("selected");
    setIsPlacementMove(isRelevantStage);

    if (draggedCard.currentInterviewDate) {
      try {
        const d = new Date(draggedCard.currentInterviewDate);
        setTransitionDate(d.toLocaleDateString('en-CA'));
        setTransitionTime(d.toTimeString().slice(0, 5));
      } catch {
        const now = new Date();
        setTransitionDate(now.toLocaleDateString('en-CA'));
        setTransitionTime(now.toTimeString().slice(0, 5));
      }
    } else {
      const now = new Date();
      setTransitionDate(now.toLocaleDateString('en-CA'));
      setTransitionTime(now.toTimeString().slice(0, 5));
    }

    setInterviewModalOpen(true);
    setDraggedCard(null);
  };

  const handleMarkSent = async (id: number) => {
    try {
      await markPipelineSent(id);
      toast.success('Resume marked as sent');
      refetchPipeline();
    } catch (err) {
      console.error('Failed to mark sent:', err);
      toast.error('Failed to mark resume as sent');
    }
  };

  const handleConfirmSchedule = async () => {
    if (!schedulingData || !transitionDate) {
      toast.error("Please select a date");
      return;
    }
    try {
      // Ensure time is included to prevent 12:00 AM default
      const timeStr = transitionTime || "09:00";

      const pad = (n: number) => String(n).padStart(2, "0");
      const now = new Date();
      const offset = -now.getTimezoneOffset();
      const sign = offset >= 0 ? "+" : "-";
      const tzOffset = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
      const dateTime = `${transitionDate}T${timeStr}:00${tzOffset}`;

      const targetCol = stageMap.find((c) => c.id === schedulingData.stageId);
      const isInterview = targetCol?.title.toLowerCase().includes("interview");

      console.log(`[DEBUG] Updating application ${schedulingData.id} to status: ${schedulingData.stageId}`);
      console.log(`[DEBUG] Timezone offset: ${tzOffset}, DateTime: ${dateTime}`);

      // Call the API to update the status
      const updatedApplication = await updatePipelineStatus(
        schedulingData.id,
        schedulingData.stageId,
        transitionNote || null,
        dateTime,
        isInterview ? dateTime : "clear",
        null,
        transitionNote || null,
        (schedulingData.stageId === "selected" || 
         schedulingData.stageId === "interview_scheduled" || 
         stageMap.find(s => s.id === schedulingData.stageId)?.title.toLowerCase().includes("schedule") ||
         stageMap.find(s => s.id === schedulingData.stageId)?.title.toLowerCase().includes("selected")
        ) ? isReplacement : null
      );

      console.log(`[DEBUG] API response received with status: ${updatedApplication.status}`);

      // CRITICAL: Invalidate cache in correct order and wait for refetch
      // 1. First invalidate the pipeline query
      console.log(`[DEBUG] Invalidating pipeline cache...`);
      await queryClient.invalidateQueries({ 
        queryKey: ["pipeline", selectedCompanyId, selectedRoleId],
        exact: true
      });
      
      // 2. Also invalidate the broader pipeline query
      await queryClient.invalidateQueries({ 
        queryKey: ["pipeline"],
        exact: false
      });

      // 3. Invalidate job-roles as well in case pipeline_stages changed
      await queryClient.invalidateQueries({ 
        queryKey: ["job-roles"],
        exact: false
      });

      // 4. Refetch to ensure latest data
      console.log(`[DEBUG] Refetching pipeline data...`);
      await refetchPipeline();

      console.log(`[DEBUG] Transition complete: ${schedulingData.name} -> ${targetCol?.title}`);
      toast.success(`${schedulingData.name} moved to ${targetCol?.title || schedulingData.stageId}`);
      
      // Reset the form
      setInterviewModalOpen(false);
      setSchedulingData(null);
      setTransitionDate("");
      setTransitionTime("");
      setTransitionNote("");
      setIsReplacement(null);
    } catch (error: any) {
      console.error("Transition error:", error);
      const detail = error.response?.data?.detail || error.message || "Unknown error";
      console.error(`[ERROR] ${detail}`);
      toast.error(`Failed to update status: ${detail}`);
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
      refetchPipeline();
    } catch (err) {
      toast.error("Failed to save note");
    }
  };

  const handleDeleteNote = async (cardId: number, status: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await updatePipelineStatus(cardId, status, null, null, null, null, "");
      toast.success("Note deleted");
      refetchPipeline();
    } catch (err) {
      toast.error("Failed to delete note");
    }
  };

  const selectedCompany = selectedCompanyId ? companyById.get(selectedCompanyId) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
      <PageHeader
        title="Recruitment Pipeline"
        description="Manage candidates across different roles and companies"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["pipeline"] })}
              className="p-2.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
              title="Refresh Board"
            >
              <Filter className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 transition-all min-w-[200px]"
              >
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left truncate">
                  {selectedCompany ? selectedCompany.name : "All Companies"}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${companyDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {companyDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCompanyDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-50 w-full min-w-[240px] glass-card p-2 shadow-2xl max-h-[320px] overflow-y-auto"
                    >
                      <button
                        onClick={() => {
                          setSelectedCompanyId(null);
                          setSelectedRoleId(null);
                          setCompanyDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedCompanyId === null ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                          }`}
                      >
                        <Building2 className="w-4 h-4" />
                        All Companies
                        <span className="ml-auto text-xs text-muted-foreground">{companies.length}</span>
                      </button>

                      <div className="h-px bg-border my-1.5" />

                      {companiesWithPipeline.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCompanyId(c.id);
                            setSelectedRoleId(null);
                            setCompanyDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedCompanyId === c.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                            }`}
                        >
                          <Building2 className="w-4 h-4" />
                          <span className="truncate flex-1">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary uppercase font-bold">
                            {allCards.filter(card => card.companyId === c.id).length}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 transition-all min-w-[200px]"
              >
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left truncate">
                  {selectedRoleId ? roleById.get(selectedRoleId)?.title : "Select specific role..."}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${roleDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {roleDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-50 w-full min-w-[240px] glass-card p-2 shadow-2xl max-h-[320px] overflow-y-auto"
                    >
                      <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Available Job Roles
                      </div>
                      <div className="h-px bg-border my-1" />

                      {rolesForSelectedCompany.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => {
                            setSelectedRoleId(Number(role.id));
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedRoleId === Number(role.id) ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                            }`}
                        >
                          <Briefcase className="w-4 h-4" />
                          <span className="truncate flex-1">{role.title}</span>
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary uppercase font-bold">
                            {role.status}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        }
      />

      {(selectedCompany || selectedRoleId) && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10"
        >
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground font-medium">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground">Filtering pipeline</span>
              {selectedCompany && (
                <span className="flex items-center gap-1.5 text-foreground font-bold">
                  for <span className="text-primary">{selectedCompany.name}</span>
                </span>
              )}
              {selectedRoleId && (
                <>
                  <span className="text-muted-foreground mx-1">role</span>
                  <span className="text-primary font-bold">{roleById.get(selectedRoleId)?.title}</span>
                  
                  {/* Selected Role Meta Strip */}
                  <div className="flex flex-wrap items-center gap-2 ml-2">
                    {roleById.get(selectedRoleId)?.location && (
                      <span className="text-[10px] font-bold text-muted-foreground/70 bg-secondary/50 px-2 py-0.5 rounded border border-border/50">
                        📍 {roleById.get(selectedRoleId)?.location}
                      </span>
                    )}
                    {roleById.get(selectedRoleId)?.work_mode && (
                      <span className="text-[10px] font-bold text-muted-foreground/70 bg-secondary/50 px-2 py-0.5 rounded border border-border/50 capitalize">
                        {roleById.get(selectedRoleId)?.work_mode === "remote" ? "🌐" : roleById.get(selectedRoleId)?.work_mode === "hybrid" ? "🔀" : "🏢"} {roleById.get(selectedRoleId)?.work_mode}
                      </span>
                    )}
                    {roleById.get(selectedRoleId)?.experience_required != null && (
                      <span className="text-[10px] font-bold text-muted-foreground/70 bg-secondary/50 px-2 py-0.5 rounded border border-border/50">
                        🎯 {roleById.get(selectedRoleId)?.experience_required}y
                      </span>
                    )}
                    {roleById.get(selectedRoleId)?.project_time_period && (
                      <span className="text-[10px] font-bold text-muted-foreground/70 bg-secondary/50 px-2 py-0.5 rounded border border-border/50">
                        🕒 {roleById.get(selectedRoleId)?.project_time_period}
                      </span>
                    )}
                    {roleById.get(selectedRoleId)?.deadline && (
                      <span className="text-[10px] font-bold text-orange-500/80 bg-orange-500/5 px-2 py-0.5 rounded border border-orange-500/10">
                        📅 {new Date(roleById.get(selectedRoleId)!.deadline!).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </span>
          <span className="text-xs text-muted-foreground">
            — {totalFiltered} candidate{totalFiltered !== 1 ? "s" : ""} in view
          </span>
          <button
            onClick={() => {
              setSelectedCompanyId(null);
              setSelectedRoleId(null);
            }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Clear all filters
          </button>
        </motion.div>
      )}

      <div className="flex items-center gap-2 mb-6 flex-wrap" key={`summary-${selectedCompanyId}-${selectedRoleId}`}>
        {columns.map((col, idx) => {
          const stage = stageMap.find((s) => s.id === col.id)!;
          return (
            <div key={col.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r ${stage.bgGlow} to-transparent border border-border/50`}>
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <span className="text-xs font-medium text-foreground truncate">{col.title}</span>
                <span className="text-xs font-bold text-muted-foreground ml-auto pl-2">{col.cards.length}</span>
              </div>
              {idx < columns.length - 1 && (
                <span className="text-foreground font-bold">→</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
        {!selectedRoleId ? (
          <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 max-w-md border-primary/20 bg-primary/5"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-3">Select a job role</h2>
              <p className="text-sm text-muted-foreground mb-8">
                The pipeline view is scoped to individual roles. Please select a role from the dropdown above to manage its candidates.
              </p>
              <button
                onClick={() => setRoleDropdownOpen(true)}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                Choose Role
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="flex gap-4 h-full min-h-[600px] pb-4">
            {columns.map((col) => {
              const isDropping = dropTarget === col.id;
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTarget(col.id);
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={() => handleDrop(col.id)}
                  className="min-w-[85vw] md:min-w-[250px] lg:min-w-[260px] flex-shrink-0 flex flex-col snap-center md:snap-align-none pb-4 md:pb-0"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                    <span className="text-xs text-muted-foreground ml-auto bg-secondary px-2 py-0.5 rounded-full">{col.cards.length}</span>
                  </div>

                  <div
                    className={`flex-1 space-y-2 min-h-[500px] p-2 rounded-xl border transition-all duration-200 ${isDropping
                      ? "bg-primary/10 border-primary/50 ring-2 ring-primary/10"
                      : "bg-[hsla(var(--box-bg),0.7)] border-border/40"
                      }`}
                  >
                    {col.cards.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground/40">
                        <User className="w-8 h-8 mb-2" />
                        <p className="text-xs">No candidates</p>
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
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileDrag={{ scale: 1.05, opacity: 0.8, rotate: 2 }}
                        className="glass-card p-2.5 cursor-grab active:cursor-grabbing group cursor-pointer border border-border/50 hover:border-primary/30 transition-all shadow-sm"
                        onClick={() => navigate(`/candidates/${card.candidateId}`)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="opacity-0 group-hover:opacity-40 transition-opacity mt-1.5">
                            <GripVertical className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold shrink-0">
                                {card.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-foreground truncate">{card.name}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkSent(card.id); }}
                                className={`shrink-0 transition-opacity ${card.resumeSent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                              >
                                <StatusBadge status={card.resumeSent ? "selected" : "pending"} text={card.resumeSent ? "SENT" : "SEND"} size="sm" />
                              </button>
                            </div>

                            {(card.statusDate || card.interviewDate || card.createdAt) && (
                              <div className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 border border-border/40">
                                <Clock className="w-3 h-3 text-primary/70" />
                                <div className="text-[10px] text-foreground font-semibold">
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
                            <div className="mt-auto pt-3 border-t border-border/30">
                              {card.remarks ? (
                                <div className="group/note relative">
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNoteValue(card.remarks || "");
                                      setNoteModalData({ id: card.id, status: col.id, initialValue: card.remarks || "" });
                                      setNoteModalOpen(true);
                                    }}
                                    className="flex flex-col gap-1 px-2 py-1.5 rounded-lg bg-secondary/30 border border-transparent hover:border-primary/20 hover:bg-secondary/50 transition-all cursor-pointer"
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
                                  className="w-full text-center py-2 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-1.5 border border-dashed border-border/40 rounded-lg hover:bg-primary/5"
                                >
                                  <Plus className="w-3 h-3" /> Add Note
                                </button>
                              )}
                            </div>

                            {card.isReplacement && (
                              <div className="mt-2 text-right">
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold border border-amber-500/20 uppercase tracking-wider whitespace-nowrap">
                                  REPLACEMENT
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>



      <Modal
        open={interviewModalOpen}
        onClose={() => { setInterviewModalOpen(false); setSchedulingData(null); }}
        title={`Transition to ${stageMap.find(s => s.id === schedulingData?.stageId)?.title || 'Next'}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the date and time for <strong>{schedulingData?.name}</strong> moving to <strong>{stageMap.find(s => s.id === schedulingData?.stageId)?.title}</strong> stage.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block">Date</label>
              <input
                type="date"
                value={transitionDate}
                onChange={(e) => setTransitionDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="label-text mb-2 block">Time</label>
              <input
                type="time"
                value={transitionTime}
                onChange={(e) => setTransitionTime(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Replacement Inquiry - Specifically for Selected stage */}
          {isPlacementMove && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">
                  {schedulingData?.stageId === "selected" ? "Placement" : "Scheduling"} Confirmation
                </p>
              </div>
              
              <h4 className="text-sm font-bold text-foreground">Is this a replacement hire?</h4>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplacement(false)}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${!isReplacement ? 'bg-white border-primary shadow-lg ring-1 ring-primary/20' : 'bg-secondary/50 border-border opacity-60 hover:opacity-100'}`}
                >
                  <span className={`text-xs font-bold ${!isReplacement ? 'text-primary' : 'text-muted-foreground'}`}>New Opening</span>
                  <span className="text-[9px] text-muted-foreground">Direct hire</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReplacement(true)}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${isReplacement ? 'bg-white border-amber-500 shadow-lg ring-1 ring-amber-200' : 'bg-secondary/50 border-border opacity-60 hover:opacity-100'}`}
                >
                  <span className={`text-xs font-bold ${isReplacement ? 'text-amber-600' : 'text-muted-foreground'}`}>Replacement</span>
                  <span className="text-[9px] text-muted-foreground">Backfill vacancy</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="label-text mb-2 block font-bold uppercase tracking-tight text-[10px]">Transition Remark</label>
            <textarea
              value={transitionNote}
              onChange={(e) => setTransitionNote(e.target.value)}
              placeholder="Internal note about this move..."
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setInterviewModalOpen(false); setSchedulingData(null); }}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSchedule}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              Confirm
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
            <label className="label-text mb-2 block">Candidate Note</label>
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
    </motion.div>
  );
};

export default Pipeline;
