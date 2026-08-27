import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  MapPin,
  Calendar,
  ChevronRight,
  Search,
  Plus
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getVendorJobs, getVendorPipeline } from "@/api/resumeiq";

const VendorJobs = () => {
  const navigate = useNavigate();
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["vendor-jobs"],
    queryFn: getVendorJobs,
  });

  const { data: pipeline = {}, isLoading: pipelineLoading } = useQuery({
    queryKey: ["vendor-pipeline"],
    queryFn: getVendorPipeline,
  });

  const isLoading = jobsLoading || pipelineLoading;

  // Calculate resumes sent per job
  const resumesByJob = (Object.values(pipeline).flat() as any[]).reduce((acc: Record<number, number>, app) => {
    acc[app.job_role_id] = (acc[app.job_role_id] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return <div className="animate-pulse space-y-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 glass-card-skeleton" />)}
    </div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Job Openings</h1>
          <p className="text-muted-foreground">View and manage job roles explicitly assigned to you by HR.</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Table Header - Desktop Only */}
        <div className="hidden md:grid md:grid-cols-[3.2fr_1.3fr_1.3fr_1.3fr_1.1fr_1.6fr] gap-4 px-8 py-4 border-b border-border bg-secondary/30 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] items-center">
          <div className="text-left">Job Role & Location</div>
          <div className="text-center">Positions</div>
          <div className="text-center">Experience</div>
          <div className="text-center">Resumes Sent</div>
          <div className="text-center">Status</div>
          <div className="text-center">Actions</div>
        </div>

        <div className="divide-y divide-border">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div 
                key={job.id} 
                onClick={() => navigate(`/vendor/jobs/${job.id}`)}
                className="group p-6 md:px-8 md:py-4 md:grid md:grid-cols-[3.2fr_1.3fr_1.3fr_1.3fr_1.1fr_1.6fr] gap-4 items-center hover:bg-primary/[0.03] transition-all border-b border-border last:border-0 cursor-pointer"
              >
                {/* 1. Job Role & Info */}
                <div className="flex items-center gap-3.5 min-w-0 mb-4 md:mb-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform ring-1 ring-primary/10">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate" title={job.title}>
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{job.location || "Remote"} • {job.work_mode || "Full-time"}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Positions */}
                <div className="flex justify-center items-center mb-2 md:mb-0">
                  <span className="md:hidden text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest block mr-2">Positions:</span>
                  <span className="inline-flex px-3 py-1 rounded-lg bg-secondary text-[11px] font-bold text-foreground whitespace-nowrap">
                    {job.positions_required || 1} {(job.positions_required || 1) === 1 ? "Position" : "Positions"}
                  </span>
                </div>

                {/* 3. Experience */}
                <div className="flex justify-center items-center mb-2 md:mb-0">
                  <span className="md:hidden text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest block mr-2">Experience:</span>
                  <span className="inline-flex px-3 py-1 rounded-lg bg-secondary text-[11px] font-bold text-foreground whitespace-nowrap truncate max-w-[130px]" title={String(job.experience_required || "Fresher / Any")}>
                    {job.experience_required != null
                      ? (String(job.experience_required).toLowerCase().includes("yr") || String(job.experience_required).toLowerCase().includes("year")
                          ? job.experience_required
                          : `${job.experience_required} Yrs Exp`)
                      : "Fresher / Any"}
                  </span>
                </div>

                {/* 4. Submissions (Resumes Sent) */}
                <div className="flex justify-center items-center mb-2 md:mb-0">
                  <span className="md:hidden text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest block mr-2">Resumes Sent:</span>
                  <span className="inline-flex px-3 py-1 rounded-lg bg-primary/10 text-[11px] font-bold text-primary border border-primary/20 whitespace-nowrap">
                    {resumesByJob[job.id] || 0} Sent
                  </span>
                </div>

                {/* 5. Status */}
                <div className="flex justify-center items-center mb-4 md:mb-0">
                  <span className="md:hidden text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest block mr-2">Status:</span>
                  {(() => {
                    const s = (job.status || "open").toLowerCase().trim().replace("_", "-");
                    let label = "OPEN";
                    let cls = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                    if (s === "on-hold" || s === "on hold") {
                      label = "ON HOLD";
                      cls = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                    } else if (s === "closed") {
                      label = "CLOSED";
                      cls = "bg-muted text-muted-foreground border-border";
                    } else if (s === "loss") {
                      label = "LOSS";
                      cls = "bg-rose-500/10 text-rose-500 border-rose-500/20";
                    } else if (s !== "open" && s !== "active") {
                      label = (job.status || "OPEN").toUpperCase();
                      cls = "bg-secondary text-muted-foreground border-border";
                    }
                    return (
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${cls}`}>
                        {label}
                      </span>
                    );
                  })()}
                </div>

                {/* 6. Action */}
                <div className="flex justify-center items-center">
                  <Link
                    to={`/vendor/upload?jobId=${job.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full md:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload Resume
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center">
              <Briefcase className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">No jobs assigned yet</h3>
              <p className="text-xs text-muted-foreground/50 mt-1">Contact HR to get job assignments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorJobs;
