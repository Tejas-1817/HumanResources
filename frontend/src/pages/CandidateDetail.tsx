import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Download, Calendar, Phone, Edit, Trash2, Globe } from "lucide-react";
import { SkillTag } from "@/components/ui/SkillTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "@/api/client";
import { getCandidateById, getApplicationsByCandidate, updateCandidate, deleteCandidate } from "@/api/resumeiq";
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
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!c || !c.original_filename?.toLowerCase().endsWith(".pdf")) return;
    let url = "";
    client
      .get(`/candidates/${c.id}/file`, { responseType: "blob" })
      .then((res) => {
        url = URL.createObjectURL(new Blob([res.data], { type: res.data.type || "application/pdf" }));
        setPdfUrl(url);
      })
      .catch(() => setPdfUrl(null));

    return () => {
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
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = c.original_filename || `candidate-${c.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Resume file not available");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading candidate...</p>;
  if (isError || !c) return <p className="text-sm text-muted-foreground">Candidate not found.</p>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile panel */}
        <div className="glass-card p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold mx-auto mb-4">
              {(c.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <h2 className="text-xl font-semibold text-foreground">{c.name || "Unknown"}</h2>
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
              <Mail className="w-4 h-4 text-muted-foreground" />
              {c.email ? (
                <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  {c.email}
                </a>
              ) : (
                <span className="text-muted-foreground">No email</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="text-muted-foreground hover:text-primary transition-colors font-medium">
                  {c.phone}
                </a>
              ) : (
                <span className="text-muted-foreground">No phone</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{c.experience_years || 0} years experience</span>
            </div>
            {c.source_label && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
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
          <div className="glass-card p-6">
            <h3 className="heading-md mb-3">Summary</h3>
            <p className="body-text">
              Parsed from uploaded resume <strong>{c.original_filename}</strong>.
              {c.experience_years > 0 && <> Has <strong>{c.experience_years}</strong> years of experience.</>}
              {c.skills && <> Key skills include <strong>{c.skills.split(",").slice(0, 5).map(s => s.trim()).join(", ")}</strong>.</>}
            </p>
          </div>

          {/* Improved Resume Preview */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Resume Document</h3>
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

            <div className={`relative bg-[#f8f9fa] transition-all duration-500 overflow-hidden ${isFullScreen ? "fixed inset-0 z-[100] h-screen w-screen p-8 bg-black/60 backdrop-blur-sm" : "h-[600px]"}`}>
              {isFullScreen && (
                <button
                  onClick={() => setIsFullScreen(false)}
                  className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all z-10"
                >
                  <ArrowLeft className="w-6 h-6 rotate-90" />
                </button>
              )}

              <div className={`w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10 ${isFullScreen ? "max-w-5xl mx-auto" : ""}`}>
                {pdfUrl ? (
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
    </motion.div>
  );
};

export default CandidateDetail;
