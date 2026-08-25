import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Lock, Unlock, Edit2, Banknote, Calendar, MapPin, Briefcase, Target, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Candidate, getCandidateById, getJobRoleById, getPipeline, markPipelineSent, updateJobRole } from "@/api/resumeiq";
import UploadPage from "./Upload";

const JobRoleDetail = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const roleId = Number(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    location: "",
    work_mode: "",
    experience_required: "" as string | number,
    positions_required: 1,
    estimated_budget: 0,
    currency: "INR",
    deadline: "",
    project_time_period: "",
  });

  const { data: roleData } = useQuery({
    queryKey: ["job-role-detail", roleId],
    queryFn: () => getJobRoleById(roleId),
    enabled: Number.isFinite(roleId),
  });
  const { data: pipeline } = useQuery({
    queryKey: ["pipeline", roleId],
    queryFn: () => getPipeline(roleId),
    enabled: Number.isFinite(roleId),
  });
  const applications = Object.values(pipeline || {}).flat();
  const { data: candidates } = useQuery({
    queryKey: ["role-candidates", roleId, applications.length],
    queryFn: async () => {
      const results = await Promise.all(applications.map((a) => getCandidateById(a.candidate_id).catch(() => null)));
      return results.filter((c): c is Candidate => c !== null);
    },
    enabled: applications.length > 0,
  });
  const candidateById = new Map((candidates || []).map((c) => [c.id, c]));

  if (!roleData) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading role details...</div>;
  }

  
  const selectedCount = (pipeline?.["selected"] || []).length;
  const joinedCount = (pipeline?.["joined"] || []).length;
  const filledCount = selectedCount + joinedCount;
  const positionsRequired = roleData.positions_required ?? 1;
  const isFullyStaffed = filledCount >= positionsRequired;
  const progressPercent = positionsRequired > 0 ? Math.min(100, Math.round((filledCount / positionsRequired) * 100)) : 100;

  const isOpen = roleData.status?.toLowerCase() === "open";

  const handleToggleStatus = async () => {
    setClosing(true);
    try {
      const newStatus = isOpen ? "closed" : "open";
      await updateJobRole(roleId, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ["job-role-detail", roleId] });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      toast.success(isOpen ? "Job role closed successfully" : "Job role reopened successfully");
      setConfirmOpen(false);
    } catch {
      toast.error("Failed to update job role status");
    } finally {
      setClosing(false);
    }
  };

  const handleEditClick = () => {
    if (!roleData) return;
    setEditForm({
      title: roleData.title,
      description: roleData.description,
      location: roleData.location || "",
      work_mode: roleData.work_mode || "office",
      experience_required: roleData.experience_required != null ? roleData.experience_required : "",
      positions_required: roleData.positions_required || 1,
      estimated_budget: roleData.estimated_budget || 0,
      currency: roleData.currency || "INR",
      deadline: roleData.deadline ? new Date(roleData.deadline).toISOString().split("T")[0] : "",
      project_time_period: roleData.project_time_period || "",
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateJobRole(roleId, {
        title: editForm.title,
        description: editForm.description,
        location: editForm.location,
        work_mode: editForm.work_mode,
        experience_required: editForm.experience_required !== "" ? String(editForm.experience_required).trim() : null,
        positions_required: editForm.positions_required,
        estimated_budget: editForm.estimated_budget,
        currency: editForm.currency,
        deadline: editForm.deadline || null,
        project_time_period: editForm.project_time_period || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["job-role-detail", roleId] });
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      toast.success("Job role updated successfully");
      setEditModalOpen(false);
    } catch (error) {
      toast.error("Failed to update job role");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>


      <PageHeader
        title={roleData.title}
        description={`${roleData.company_name} · Role #${roleData.id}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={roleData.status} />
            <button
              onClick={handleEditClick}
              className="px-4 py-2 rounded-none font-bold text-sm transition-all flex items-center gap-2 bg-secondary text-foreground hover:bg-secondary/80 border border-border"
            >
              <Edit2 className="w-4 h-4" />
              Edit Details
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className={`px-4 py-2 rounded-none font-bold text-sm transition-all flex items-center gap-2 ${
                isOpen
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                  : "bg-success/10 text-success hover:bg-success/20 border border-success/20"
              }`}
            >
              {isOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isOpen ? "Close Role" : "Reopen Role"}
            </button>
          </div>
        }
      />

      <div className="glass-card p-6 mb-6 rounded-xl border border-border/50 bg-card">

        {/* ── Job Details Strip ── */}
        {(roleData.location || roleData.work_mode || roleData.experience_required != null || roleData.deadline || roleData.project_time_period) && (
          <div className="flex flex-wrap gap-3 mb-6 pb-5 border-b border-border/50">
            {roleData.location && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50">
                <span className="text-base">📍</span>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Location</p>
                  <p className="text-sm font-semibold text-foreground">{roleData.location}</p>
                </div>
              </div>
            )}
            {roleData.work_mode && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50">
                <span className="text-base">
                  {roleData.work_mode === "remote" ? "🌐" : roleData.work_mode === "hybrid" ? "🔀" : "🏢"}
                </span>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Work Mode</p>
                  <p className="text-sm font-semibold text-foreground capitalize">{roleData.work_mode}</p>
                </div>
              </div>
            )}
            {roleData.experience_required != null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50">
                <span className="text-base">🎯</span>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Experience</p>
                  <p className="text-sm font-semibold text-foreground">
                    {String(roleData.experience_required).toLowerCase().includes("yr") || String(roleData.experience_required).toLowerCase().includes("year")
                      ? roleData.experience_required
                      : `${roleData.experience_required} yrs`}
                  </p>
                </div>
              </div>
            )}
            {roleData.project_time_period && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50">
                <span className="text-base">🕒</span>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Project Duration</p>
                  <p className="text-sm font-semibold text-foreground">{roleData.project_time_period}</p>
                </div>
              </div>
            )}
            {roleData.deadline && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-base">📅</span>
                <div>
                  <p className="text-[9px] font-bold text-amber-500/70 uppercase tracking-widest">Closes On</p>
                  <p className="text-sm font-semibold text-amber-500">{new Date(roleData.deadline).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Job Description</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-6">{roleData.description}</p>
        
        {roleData.estimated_budget && (
          <div className="pt-6 border-t border-border/50">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Financial Overview</h3>
            <div className="p-4 bg-secondary/50 border border-border rounded-lg inline-block">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Estimated Budget</p>
              <p className="text-xl font-bold text-foreground">
                {roleData.currency === "USD" ? "$" : "₹"}{(roleData.estimated_budget || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Hiring Progress */}
        <div className="pt-6 border-t border-border/50 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hiring Progress</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isFullyStaffed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-primary/5 border-primary/20 text-primary"}`}>
              {filledCount} / {positionsRequired} Positions Filled
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${progressPercent}%` }}
               transition={{ duration: 1, ease: "easeOut" }}
               className={`h-full ${isFullyStaffed ? "bg-emerald-500" : "bg-primary"}`}
             />
          </div>
          {isFullyStaffed && (
            <p className="text-[10px] text-emerald-500/80 mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
               ✨ All positions successfully filled!
            </p>
          )}
        </div>
      </div>

      <div className="glass-card p-6 mb-6 rounded-xl border border-border/50">
        <UploadPage
          prefilledRole={{ id: roleData.id, title: roleData.title }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["pipeline", roleId] });
            queryClient.invalidateQueries({ queryKey: ["role-candidates"] });
          }}
        />
      </div>

      <div className="glass-card p-6 rounded-xl border border-border/50">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Applications ({applications.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Candidate</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Source</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Resume</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications
                .sort((a, b) => {
                  const getWeight = (s: string) => {
                    if (s === 'selected') return -1;
                    if (s === 'rejected') return 1;
                    return 0;
                  };
                  return getWeight(a.status) - getWeight(b.status);
                })
                .map((app) => (
                <tr key={app.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td 
                    className="py-3 px-4 text-sm text-foreground font-bold flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/candidates/${app.candidate_id}`)}
                  >
                    {candidateById.get(app.candidate_id)?.name || `Candidate #${app.candidate_id}`}
                    {app.is_replacement && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[8px] font-bold border border-amber-500/20 uppercase tracking-widest whitespace-nowrap">
                        REPLACEMENT
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-foreground">
                    {candidateById.get(app.candidate_id)?.source_label || "Direct"}
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={app.status} /></td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${app.resume_sent ? "text-success" : "text-muted-foreground"}`}>
                      {app.resume_sent ? "Sent" : "Not sent"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {!app.resume_sent && (
                      <button
                        onClick={async () => {
                          try {
                            await markPipelineSent(app.id);
                            await queryClient.invalidateQueries({ queryKey: ["pipeline", roleId] });
                            toast.success("Resume marked as sent");
                          } catch (err: any) {
                            console.error("Failed to mark sent:", err);
                            const detail = err.response?.data?.detail || "Please try again";
                            toast.error(`Could not mark sent: ${detail}`);
                          }
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-widest transition-colors"
                      >
                        <Send className="w-3 h-3" /> Mark Sent
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation modal for closing / reopening */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={isOpen ? "Close Job Role" : "Reopen Job Role"}>
        <div className="space-y-4">
          <p className="body-text">
            {isOpen
              ? "Are you sure you want to close this role? This indicates that the required candidates have been achieved and no further applications will be accepted."
              : "Are you sure you want to reopen this role? This will allow new applications to be submitted again."}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 py-3 rounded-lg bg-secondary text-foreground font-bold text-sm hover:bg-secondary/80 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={closing}
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                isOpen
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {closing ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isOpen ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              {closing ? "Updating..." : isOpen ? "Yes, Close Role" : "Yes, Reopen Role"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Details Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Job Role Details">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label-text mb-2 block">Job Title</label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Senior Product Designer"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="label-text mb-2 block">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
                placeholder="Describe the role responsibilities..."
              />
            </div>

            <div>
              <label className="label-text mb-2 block">Location</label>
              <input
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Indore / Bangalore"
              />
            </div>

            <div>
              <label className="label-text mb-2 block">Work Mode</label>
              <select
                value={editForm.work_mode}
                onChange={(e) => setEditForm({ ...editForm, work_mode: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="office">Office</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="label-text mb-2 block">Experience Required (Years)</label>
              <input
                type="text"
                placeholder="e.g. 3-5 Years"
                value={editForm.experience_required}
                onChange={(e) => setEditForm({ ...editForm, experience_required: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="label-text mb-2 block">Positions Required</label>
              <input
                type="number"
                value={editForm.positions_required}
                onChange={(e) => setEditForm({ ...editForm, positions_required: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="md:col-span-1">
              <label className="label-text mb-2 block flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5 text-primary" />
                Estimated Budget
              </label>
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 flex items-center px-3 bg-primary/5 rounded-l-xl border-r border-border pointer-events-none group-focus-within:border-primary transition-colors">
                  <span className="text-xs font-bold text-primary">
                    {editForm.currency === "INR" ? "₹" : "$"}
                  </span>
                </div>
                <input
                  type="number"
                  value={editForm.estimated_budget}
                  onChange={(e) => setEditForm({ ...editForm, estimated_budget: Number(e.target.value) })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary/40 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold transition-all"
                  placeholder="0.00"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                   <select 
                     value={editForm.currency}
                     onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                     className="bg-transparent text-[10px] font-black text-muted-foreground focus:outline-none cursor-pointer hover:text-primary transition-colors pr-2 uppercase"
                   >
                     <option value="INR">INR</option>
                     <option value="USD">USD</option>
                   </select>
                </div>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="label-text mb-2 block flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Closing Deadline
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary/40 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark] transition-all font-semibold"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label-text mb-2 block flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Project Duration
              </label>
              <input
                value={editForm.project_time_period}
                onChange={(e) => setEditForm({ ...editForm, project_time_period: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/40 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                placeholder="e.g. 6 Months / 1 Year"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-1 p-1">
            <button
              onClick={() => setEditModalOpen(false)}
              className="flex-1 py-3 rounded-lg bg-secondary text-foreground font-bold text-sm hover:bg-secondary/80 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUpdating ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Edit2 className="w-4 h-4" />
              )}
              {isUpdating ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default JobRoleDetail;
