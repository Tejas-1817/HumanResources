import { useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Send, Eye, Plus, FileText, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorJobById, getVendorPipeline } from "@/api/resumeiq";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const stageMap = [
  { id: "pending", title: "Pending", color: "bg-slate-400" },
  { id: "shortlisted", title: "Shortlisted", color: "bg-primary" },
  { id: "interview_scheduled", title: "Interview Scheduled", color: "bg-amber-500" },
  { id: "interviewed", title: "Interviewed", color: "bg-orange-500" },
  { id: "on_hold", title: "On Hold", color: "bg-orange-400" },
  { id: "rejected", title: "Rejected", color: "bg-destructive" },
  { id: "selected", title: "Selected", color: "bg-emerald-500" },
  { id: "dropped", title: "Dropped", color: "bg-zinc-400" },
];

const VendorJobDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const roleId = Number(id);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["vendor-job-detail", roleId],
    queryFn: () => getVendorJobById(roleId),
    enabled: Number.isFinite(roleId),
  });

  const { data: pipeline = {}, isLoading: pipelineLoading } = useQuery({
    queryKey: ["vendor-pipeline"],
    queryFn: getVendorPipeline,
  });

  const myApplications = useMemo(() => {
    return Object.values(pipeline).flat().filter((app: any) => app.job_role_id === roleId);
  }, [pipeline, roleId]);

  const pipelineColumns = useMemo(() => {
    return stageMap.map(stage => {
      const allAppsInStage = pipeline[stage.id] || [];
      const roleSpecificApps = allAppsInStage.filter((app: any) => app.job_role_id === roleId);
      return { ...stage, apps: roleSpecificApps };
    });
  }, [pipeline, roleId]);

  if (jobLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Synchronizing job details...</div>;
  }

  if (!job) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">The requested job role could not be located.</p>
        <button onClick={() => navigate("/vendor/jobs")} className="text-primary font-bold hover:underline">Return to Openings</button>
      </div>
    );
  }

  const isOpen = job.status?.toLowerCase() === "open";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/vendor/jobs")}
          className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-all text-muted-foreground shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{job.title}</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-60">Intelligence Hub / Job Role Information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-border/50 bg-card shadow-sm">
            <div className="flex flex-wrap gap-3 mb-6 pb-5 border-b border-border/50">
              {job.location && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50">
                  <span className="text-base">📍</span>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Location</p>
                    <p className="text-xs font-bold text-foreground mt-1">{job.location}</p>
                  </div>
                </div>
              )}
              {job.work_mode && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50">
                  <span className="text-base">{job.work_mode === "remote" ? "🌐" : job.work_mode === "hybrid" ? "🔀" : "🏢"}</span>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Work Mode</p>
                    <p className="text-xs font-bold text-foreground mt-1 capitalize">{job.work_mode}</p>
                  </div>
                </div>
              )}
              {job.experience_required != null && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50">
                  <span className="text-base">🎯</span>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Experience</p>
                    <p className="text-xs font-bold text-foreground mt-1">
                      {String(job.experience_required).toLowerCase().includes("yr") || String(job.experience_required).toLowerCase().includes("year")
                        ? job.experience_required
                        : `${job.experience_required} yrs`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Job Description</h3>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>

          <div className="glass-card p-6 border border-border/50 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-foreground">My Submissions</h3>
                <p className="text-xs text-muted-foreground">Historical synchronization of talent with this requirement</p>
              </div>
              <Link
                to={`/vendor/upload?jobId=${job.id}`}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xl shadow-primary/20"
              >
                <Plus className="w-4 h-4" /> Upload Resume
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-4 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Candidate</th>
                    <th className="text-left py-4 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="text-right py-4 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {myApplications.length > 0 ? (
                    myApplications
                      .sort((a, b) => {
                        const getWeight = (s: string) => {
                          if (s === 'selected') return -1;
                          if (s === 'rejected') return 1;
                          return 0;
                        };
                        return getWeight(a.status) - getWeight(b.status);
                      })
                      .map((app: any) => (
                        <tr key={app.id} className="hover:bg-secondary/20 transition-colors group/row">
                          <td className="py-5 px-4 font-bold text-sm">
                            <div className="flex flex-col">
                              <span>{app.candidate_name}</span>
                              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-medium mt-1">
                                <Clock className="w-2.5 h-2.5" />
                                {app.status_date ? new Date(app.status_date).toLocaleDateString() : "Historical Ingest"}
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-4">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="py-5 px-4 text-right">
                            <Link
                              to={`/vendor/candidates/${app.candidate_id}`}
                              className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/80 transition-all inline-flex opacity-40 group-hover/row:opacity-100"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-15">
                          <FileText className="w-10 h-10" />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em]">No talent submissions recorded</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border border-border/50 bg-card shadow-sm">
            <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-5">Role Requirements</h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center py-1 border-b border-border/20">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Positions</span>
                <span className="text-sm font-black text-foreground">{job.positions_required}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/20">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Experience</span>
                <span className="text-sm font-black text-foreground">
                  {job.experience_required != null
                    ? (String(job.experience_required).toLowerCase().includes("yr") || String(job.experience_required).toLowerCase().includes("year")
                        ? job.experience_required
                        : `${job.experience_required}+ Yrs`)
                    : "Fresher / No bar"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isOpen ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {job.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-foreground uppercase tracking-tight">Access Authority</p>
                <p className="text-[9px] text-primary font-bold">Authorized Pipeline</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed italic opacity-80 font-medium">
              \"This role is explicitly assigned to your synchronization portal. Ensure candidates match all specified criteria before formal ingest.\"
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 border border-border/50 bg-card shadow-sm mt-6 overflow-hidden">
        <div className="mb-8">
          <h3 className="text-lg font-bold text-foreground">Pipeline Visibility</h3>
          <p className="text-xs text-muted-foreground tracking-wide">Real-time synchronization flow of interview stages</p>
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-5 min-h-[350px]">
            {pipelineColumns.map(col => (
              <div key={col.id} className="min-w-[260px] flex-1 flex flex-col">
                <div className="flex items-center gap-2.5 mb-4 px-1">
                  <div className={`w-2 h-2 rounded-full ring-4 ring-white/5 ${col.color}`} />
                  <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">{col.title}</h4>
                  <span className="text-[9px] font-black text-muted-foreground ml-auto bg-secondary/80 px-2 py-0.5 rounded-lg border border-border/50 shadow-sm">
                    {col.apps.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 p-2.5 rounded-2xl bg-secondary/10 border border-border/30 min-h-[300px] shadow-inner">
                  {col.apps.map((app: any) => (
                    <motion.div
                      layout
                      key={app.id}
                      className="glass-card p-3.5 shadow-md border-border/40 hover:border-primary/40 transition-all cursor-pointer group bg-background/40 hover:bg-background/60"
                      onClick={() => navigate(`/vendor/candidates/${app.candidate_id}`)}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          {app.candidate_name?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-foreground truncate group-hover:text-primary transition-colors">{app.candidate_name}</p>
                          <div className={`flex items-center gap-1.5 text-muted-foreground/50 mt-1 ${!app.status_date ? 'hidden' : ''}`}>
                            <Clock className="w-3 h-3" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">
                              {app.status_date ? new Date(app.status_date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {col.apps.length === 0 && !pipelineLoading && (
                    <div className="flex flex-col items-center justify-center h-48 opacity-10">
                      <User className="w-6 h-6 mb-2" />
                      <p className="text-[9px] font-black uppercase tracking-[0.3em]">No Talent</p>
                    </div>
                  )}
                  {pipelineLoading && (
                    <div className="space-y-4 p-1">
                      <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                      <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VendorJobDetail;
