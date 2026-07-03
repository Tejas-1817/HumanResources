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
        <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-5 border-b border-border bg-secondary/30 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
          <div className="col-span-3">Job Role & Location</div>
          <div className="col-span-2 text-center">Positions</div>
          <div className="col-span-2 text-center">Experience</div>
          <div className="col-span-2 text-center">Resumes Sent</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-border">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div 
                key={job.id} 
                onClick={() => navigate(`/vendor/jobs/${job.id}`)}
                className="group p-6 md:px-8 md:py-4 md:grid md:grid-cols-12 gap-4 items-center hover:bg-primary/[0.03] transition-all border-b border-border last:border-0 cursor-pointer"
              >
                {/* Job Role & Info */}
                <div className="col-span-3 flex items-center gap-4 mb-4 md:mb-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location || "Remote"} • {job.work_mode || "Full-time"}
                    </div>
                  </div>
                </div>

                {/* Positions */}
                <div className="col-span-2 text-center mb-2 md:mb-0">
                  <span className="md:hidden text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest block mb-1">Positions</span>
                  <span className="px-3 py-1 rounded-lg bg-secondary text-[11px] font-bold text-foreground">
                    {job.positions_required} Positions
                  </span>
                </div>

                {/* Experience */}
                <div className="col-span-2 text-center mb-2 md:mb-0">
                  <span className="md:hidden text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest block mb-1">Experience</span>
                  <span className="px-3 py-1 rounded-lg bg-secondary text-[11px] font-bold text-foreground">
                    {job.experience_required}+ Yrs Exp
                  </span>
                </div>

                {/* Submissions (Resumes Sent) */}
                <div className="col-span-2 text-center mb-2 md:mb-0">
                  <span className="md:hidden text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest block mb-1">Resumes Sent</span>
                  <span className="px-3 py-1 rounded-lg bg-primary/10 text-[11px] font-bold text-primary border border-primary/20">
                    {resumesByJob[job.id] || 0} Sent
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-1 text-center mb-4 md:mb-0">
                  <span className="md:hidden text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest block mb-1">Status</span>
                  <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    job.status === "open" 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                      : "bg-secondary text-muted-foreground border-border"
                  }`}>
                    {job.status}
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-2 flex justify-end">
                  <Link
                    to={`/vendor/upload?jobId=${job.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full md:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    Upload
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
