import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Download,
  Calendar,
  Phone,
  Edit,
  Trash2,
  Globe,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  PlusCircle,
  Plus,
} from "lucide-react";
import { SkillTag } from "@/components/ui/SkillTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "@/api/client";
import {
  getCandidateById,
  getApplicationsByCandidate,
  updateCandidate,
  deleteCandidate,
  getCompanies,
  getJobRoles,
  createApplication,
} from "@/api/resumeiq";
import { useAuth } from "@/context/AuthContext";

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const candidateId = Number(id);
  const { isInterviewerAuthenticated } = useAuth();

  const { data: c, isLoading, isError } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCandidateById(candidateId),
    enabled: Number.isFinite(candidateId),
  });

  // Fetch applications for this candidate
  const { data: appsData } = useQuery({
    queryKey: ["candidate-applications", candidateId],
    queryFn: () => getApplicationsByCandidate(candidateId),
    enabled: Number.isFinite(candidateId),
  });
  const applications = appsData ?? [];

  // Fetch companies and job roles for assignment
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies(),
  });
  const { data: jobRoles = [] } = useQuery({
    queryKey: ["job-roles"],
    queryFn: () => getJobRoles(),
  });

  // Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | "">("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");
  const [assignStatus, setAssignStatus] = useState<string>("selected");
  const [assignStartDate, setAssignStartDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [assignRemarks, setAssignRemarks] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Group applications by company in chronological order
  const historyByCompany = useMemo(() => {
    const map = new Map<
      string,
      { companyName: string; companyId?: number; items: typeof applications }
    >();

    const sortedApps = [...applications].sort((a, b) => {
      const dateA = new Date(a.start_date || a.status_date || a.created_at).getTime();
      const dateB = new Date(b.start_date || b.status_date || b.created_at).getTime();
      return dateB - dateA;
    });

    sortedApps.forEach((app) => {
      const cName = app.company_name || "Direct / Internal Placement";
      if (!map.has(cName)) {
        map.set(cName, {
          companyName: cName,
          companyId: app.company_id,
          items: [],
        });
      }
      map.get(cName)!.items.push(app);
    });

    return Array.from(map.values());
  }, [applications]);

  const availableRoles = useMemo(() => {
    if (!selectedCompanyId) return jobRoles;
    return jobRoles.filter((r) => r.company_id === Number(selectedCompanyId));
  }, [jobRoles, selectedCompanyId]);

  const handleAssign = async () => {
    if (!selectedRoleId) {
      toast.error("Please select a project / job role");
      return;
    }
    setAssigning(true);
    try {
      await createApplication({
        candidate_id: candidateId,
        job_role_id: Number(selectedRoleId),
        status: assignStatus,
        start_date: assignStartDate || undefined,
        remarks: assignRemarks.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["candidate-applications", candidateId] });
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate successfully assigned to new project!");
      setAssignModalOpen(false);
      setSelectedCompanyId("");
      setSelectedRoleId("");
      setAssignRemarks("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to assign candidate");
    } finally {
      setAssigning(false);
    }
  };

  // Derive best status from applications
  const statusPriority = ["selected", "interviewed", "interview_scheduled", "shortlisted", "pending", "on_hold", "rejected"];
  const bestStatus = applications.length > 0
    ? applications.reduce((best, app) => {
      const bestIdx = statusPriority.indexOf(best);
      const appIdx = statusPriority.indexOf(app.status);
      return appIdx >= 0 && (bestIdx < 0 || appIdx < bestIdx) ? app.status : best;
    }, applications[0].status)
    : "pending";

  // Format status for display
  const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", skills: "", experience_years: 0 });
  const [saving, setSaving] = useState(false);

  // PDF Preview State
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!c) return;
    let active = true;
    let url = "";
    setIsPdfLoading(true);

    client
      .get(`/candidates/${c.id}/file`, { responseType: "blob" })
      .then((res) => {
        if (!active) return;
        if (res.data?.type?.includes("json")) {
          setPdfUrl(null);
          return;
        }
        const blob = new Blob([res.data], { type: res.data.type || "application/pdf" });
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(() => {
        if (active) setPdfUrl(null);
      })
      .finally(() => {
        if (active) setIsPdfLoading(false);
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [c?.id, c?.original_filename]);

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openEditModal = () => {
    if (!c) return;
    setEditForm({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      skills: c.skills || "",
      experience_years: c.experience_years,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!c) return;
    setSaving(true);
    try {
      await updateCandidate(c.id, {
        name: editForm.name.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        skills: editForm.skills.trim() || undefined,
        experience_years: editForm.experience_years,
      });
      await queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate updated");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update candidate");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!c) return;
    setDeleting(true);
    try {
      await deleteCandidate(c.id);
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate deleted");
      navigate("/candidates");
    } catch {
      toast.error("Failed to delete candidate");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!c) return;
    try {
      const res = await client.get(`/candidates/${c.id}/file`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: res.data.type || "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = c.original_filename || `candidate-${c.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Resume downloaded successfully");
    } catch {
      toast.error("Resume file not available");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading candidate...</p>;
  if (isError || !c) return <p className="text-sm text-muted-foreground">Candidate not found.</p>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Candidates
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile panel */}
        <div className="glass-card p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl sm:text-2xl font-bold mx-auto mb-4">
              {(c.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">{c.name || "Unknown"}</h2>
            <div className="mt-2 flex flex-col items-center gap-2">
              <StatusBadge status={formatStatus(bestStatus)} />
              {c.is_replacement && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20 uppercase tracking-wider">
                  REPLACEMENT
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              {c.email ? (
                <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-primary transition-colors font-medium truncate">
                  {c.email}
                </a>
              ) : (
                <span className="text-muted-foreground">No email</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="text-muted-foreground hover:text-primary transition-colors font-medium truncate">
                  {c.phone}
                </a>
              ) : (
                <span className="text-muted-foreground">No phone</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{c.experience_years || 0} years experience</span>
            </div>
            {c.source_label && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 truncate">
                  {c.source_label}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="label-text mb-3">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {(c.skills || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => <SkillTag key={s} skill={s} />)}
              {!(c.skills || "").trim() && <span className="text-xs text-muted-foreground">No skills listed</span>}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button onClick={handleDownload} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Download Resume
            </button>
            {!isInterviewerAuthenticated && (
              <button
                onClick={() => setAssignModalOpen(true)}
                className="w-full py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" /> Assign to Project
              </button>
            )}
            {!isInterviewerAuthenticated && (
              <div className="flex gap-2">
                <button onClick={openEditModal} className="flex-1 py-2.5 rounded-lg bg-secondary border border-border text-foreground font-medium text-sm hover:bg-secondary/80 transition-all flex items-center justify-center gap-2">
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => setDeleteOpen(true)} className="flex-1 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive font-medium text-sm hover:bg-destructive/20 transition-all flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <div className="glass-card p-4 sm:p-6">
            <h3 className="heading-md mb-3">Summary</h3>
            <p className="body-text">
              Parsed from uploaded resume <strong>{c.original_filename}</strong>.
              {c.experience_years > 0 && <> Has <strong>{c.experience_years}</strong> years of experience.</>}
              {c.skills && <> Key skills include <strong>{c.skills.split(",").slice(0, 5).map(s => s.trim()).join(", ")}</strong>.</>}
            </p>
          </div>

          {/* Company & Project History */}
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="heading-md">Company & Project History</h3>
                  <p className="text-xs text-muted-foreground">
                    Chronological record of company assignments and projects
                  </p>
                </div>
              </div>

              {!isInterviewerAuthenticated && (
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign to Position
                </button>
              )}
            </div>

            {historyByCompany.length === 0 ? (
              <div className="py-8 text-center bg-secondary/30 rounded-xl border border-dashed border-border/80 p-6">
                <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">No Company Assignments Yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  This candidate currently has no project assignments. They are available in the candidate pool / on bench.
                </p>
                {!isInterviewerAuthenticated && (
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Assign First Project
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {historyByCompany.map((grp) => (
                  <div
                    key={grp.companyName}
                    className="rounded-xl border border-border/70 bg-card/60 overflow-hidden shadow-xs"
                  >
                    {/* Company Header */}
                    <div className="px-4 py-3 bg-secondary/40 border-b border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-bold text-foreground truncate">
                          {grp.companyName}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-bold text-muted-foreground border border-border shrink-0">
                        {grp.items.length} {grp.items.length === 1 ? "project" : "projects"}
                      </span>
                    </div>

                    {/* Project Assignments Under this Company */}
                    <div className="divide-y divide-border/40">
                      {grp.items.map((app) => {
                        const isCompleted = app.status === "completed";
                        const isActive = ["selected", "joined"].includes(app.status);
                        const isDropped = app.status === "dropped";

                        const startDateDisplay = app.start_date
                          ? new Date(app.start_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : app.created_at
                          ? new Date(app.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—";

                        const endDateDisplay = app.end_date
                          ? new Date(app.end_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : isCompleted && app.completion_date
                          ? new Date(app.completion_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : isCompleted || isDropped
                          ? "—"
                          : "Active / Ongoing";

                        return (
                          <div key={app.id} className="p-3.5 sm:p-4 hover:bg-secondary/20 transition-colors space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">
                                  {app.job_role_title || `Project #${app.job_role_id}`}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isCompleted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                  </span>
                                ) : isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Active (Selected)
                                  </span>
                                ) : isDropped ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                    Dropped
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                    <Clock className="w-3 h-3" /> {formatStatus(app.status)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Timeline & Meta */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 opacity-70" />
                                <span>
                                  Start: <strong className="text-foreground font-medium">{startDateDisplay}</strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span>
                                  End: <strong className="text-foreground font-medium">{endDateDisplay}</strong>
                                </span>
                              </div>
                              {app.completion_date && (
                                <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                  <span>
                                    Completed: {new Date(app.completion_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </span>
                                </div>
                              )}
                              {(app.source_label || app.source) && (
                                <span className="text-[11px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
                                  Source: {app.source_label || app.source}
                                </span>
                              )}
                            </div>

                            {/* Drop Reason */}
                            {isDropped && app.drop_reason && (
                              <div className="mt-1 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600">
                                <strong>Drop Reason:</strong> {app.drop_reason}
                              </div>
                            )}

                            {/* Remarks */}
                            {app.remarks && (
                              <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded border border-border/50">
                                <strong>Notes:</strong> {app.remarks}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Improved Resume Preview */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">Resume Document</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{c.original_filename?.split('.').pop()} View</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                  title="Toggle Fullscreen"
                >
                  <Globe className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`relative bg-[#f8f9fa] transition-all duration-500 overflow-hidden ${isFullScreen ? "fixed inset-0 z-[100] h-screen w-screen p-2 sm:p-4 md:p-8 bg-black/60 backdrop-blur-sm" : "h-[380px] sm:h-[500px] md:h-[600px]"}`}>
              {isFullScreen && (
                <button
                  onClick={() => setIsFullScreen(false)}
                  className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all z-10"
                >
                  <ArrowLeft className="w-6 h-6 rotate-90" />
                </button>
              )}

              <div className={`w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10 ${isFullScreen ? "max-w-5xl mx-auto" : ""}`}>
                {isPdfLoading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-card gap-3">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-muted-foreground animate-pulse">Loading preview...</span>
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0 bg-white"
                    title="Resume Preview"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-card">
                    <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6">
                      <Mail className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground mb-2">Resume Preview Unavailable</h4>
                    <p className="text-sm text-muted-foreground max-w-xs mb-8">
                      We couldn't generate a visual preview for this document format or the file is temporarily unavailable.
                    </p>

                    {c.raw_text && (
                      <div className="w-full max-w-2xl bg-secondary/50 rounded-xl p-6 border border-border text-left overflow-auto max-h-[300px]">
                        <h5 className="text-[10px] font-black uppercase text-primary mb-3 tracking-widest border-b border-primary/20 pb-2">Extracted Text Content</h5>
                        <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap leading-relaxed">
                          {c.raw_text}
                        </pre>
                      </div>
                    )}

                    {!c.raw_text && (
                      <button onClick={handleDownload} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:ring-4 hover:ring-primary/20 transition-all">
                        Download to View Document
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Candidate">
        <div className="space-y-4">
          <div>
            <label className="label-text mb-2 block">Name</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Phone</label>
            <input
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Skills (comma-separated)</label>
            <input
              value={editForm.skills}
              onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="React, Node.js, Python"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Experience (years)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={editForm.experience_years}
              onChange={(e) => setEditForm({ ...editForm, experience_years: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Candidate">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{c.name || "this candidate"}</strong>? This will also remove all associated applications. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteOpen(false)}
              className="flex-1 py-3 rounded-lg bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-3 rounded-lg bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign to Project / Company Modal */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Candidate to Position / Project"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Assign <strong className="text-foreground">{c.name}</strong> to a new company and project. 
            All previous company & project history will remain preserved.
          </p>

          <div>
            <label className="label-text mb-2 block">Company (Optional filter)</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value ? Number(e.target.value) : "");
                setSelectedRoleId("");
              }}
              className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Companies</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>{comp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text mb-2 block">Job Role / Project <span className="text-destructive">*</span></label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a project / position...</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title} ({role.company_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-2 block">Initial Status</label>
              <select
                value={assignStatus}
                onChange={(e) => setAssignStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="selected">Selected (Active)</option>
                <option value="joined">Joined</option>
                <option value="pending">Pending</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview_scheduled">Interview</option>
              </select>
            </div>

            <div>
              <label className="label-text mb-2 block">Start Date</label>
              <input
                type="date"
                value={assignStartDate}
                onChange={(e) => setAssignStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="label-text mb-2 block">Assignment Remarks / Notes</label>
            <textarea
              rows={2}
              value={assignRemarks}
              onChange={(e) => setAssignRemarks(e.target.value)}
              placeholder="e.g. Assigned to Gyde for Senior Java Developer role..."
              className="w-full px-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
            <button
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning || !selectedRoleId}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {assigning ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default CandidateDetail;
