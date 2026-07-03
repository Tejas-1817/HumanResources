import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Clock,
  User,
  ChevronDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorJobs, getVendorPipeline } from "@/api/resumeiq";

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

const VendorPipeline = () => {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const { data: jobs = [] } = useQuery({
    queryKey: ["vendor-jobs"],
    queryFn: getVendorJobs,
  });

  const { data: pipeline = {}, isLoading } = useQuery({
    queryKey: ["vendor-pipeline"],
    queryFn: getVendorPipeline,
  });

  const columns = useMemo(() => {
    return stageMap.map(stage => {
      const allApps = pipeline[stage.id] || [];
      const filteredApps = selectedRoleId
        ? allApps.filter((app: any) => app.job_role_id === selectedRoleId)
        : allApps;

      return {
        ...stage,
        apps: filteredApps
      };
    });
  }, [pipeline, selectedRoleId]);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Pipeline Visibility</h1>
          <p className="text-muted-foreground">Track the progress of your submitted candidates in real-time.</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 transition-all min-w-[220px]"
          >
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-left truncate">
              {selectedRoleId ? jobs.find(j => j.id === selectedRoleId)?.title : "All Assigned Jobs"}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${roleDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {roleDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 z-50 w-full glass-card p-2 shadow-2xl max-h-64 overflow-y-auto"
              >
                <button
                  onClick={() => { setSelectedRoleId(null); setRoleDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedRoleId ? 'bg-primary/10 text-primary' : 'hover:bg-white/5 text-foreground'}`}
                >
                  All Assigned Jobs
                </button>
                {jobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => { setSelectedRoleId(job.id); setRoleDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedRoleId === job.id ? 'bg-primary/10 text-primary' : 'hover:bg-white/5 text-foreground'}`}
                  >
                    {job.title}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex gap-4 h-full min-h-[500px]">
          {columns.map(col => (
            <div key={col.id} className="min-w-[260px] flex flex-col">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
                <span className="text-[10px] font-bold text-muted-foreground ml-auto bg-white/5 px-2 py-0.5 rounded-full">
                  {col.apps.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 p-2 rounded-2xl bg-white/[0.02] border border-white/5 min-h-[400px]">
                {col.apps.map((app: any) => (
                  <motion.div
                    layout="position"
                    key={app.id}
                    className="glass-card p-3 h-[80px] w-full flex flex-col justify-between shadow-md border-white/5 hover:border-primary/20 transition-all shrink-0"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold shrink-0">
                        {app.candidate_name?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-foreground truncate">{app.candidate_name}</p>
                        <p className="text-[8px] text-muted-foreground truncate">{jobs.find(j => j.id === app.job_role_id)?.title || 'Assigned Role'}</p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-1 text-muted-foreground/40 ${!app.status_date ? 'invisible' : ''}`}>
                      <Clock className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-medium uppercase tracking-tighter">
                        {app.status_date ? new Date(app.status_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {col.apps.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-32 opacity-20">
                    <User className="w-6 h-6 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Empty</p>
                  </div>
                )}
                {isLoading && (
                  <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-24 glass-card-skeleton" />)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorPipeline;
