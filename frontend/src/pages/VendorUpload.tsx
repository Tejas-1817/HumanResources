import { useState, useRef, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  MapPin,
  Clock,
  ArrowLeft,
  Trash2,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  FileCheck2,
  Check,
  Building2,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getVendorJobs, getVendorPipeline, vendorUploadResume } from "@/api/resumeiq";
import { toast } from "sonner";

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  uploadDate: string;
  status: "ready" | "uploading" | "synced" | "failed";
  errorMessage?: string;
  candidateName?: string;
}

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatUploadDate = (date: Date): string => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const VendorUpload = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jobIdFromQuery = searchParams.get("jobId");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(
    jobIdFromQuery ? parseInt(jobIdFromQuery, 10) : null
  );

  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ completed: 0, total: 0 });

  // Options state
  const [duplicateHandling, setDuplicateHandling] = useState<"skip" | "overwrite">("skip");
  const [emailNotification, setEmailNotification] = useState<boolean>(true);

  // Fetch assigned jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["vendor-jobs"],
    queryFn: getVendorJobs,
  });

  // Fetch pipeline to count resumes sent
  const { data: pipeline = {} } = useQuery({
    queryKey: ["vendor-pipeline"],
    queryFn: getVendorPipeline,
  });

  // Keep selectedJobId in sync with query parameter
  useEffect(() => {
    if (jobIdFromQuery) {
      const parsed = parseInt(jobIdFromQuery, 10);
      if (!isNaN(parsed) && parsed !== selectedJobId) {
        setSelectedJobId(parsed);
      }
    } else if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
      setSearchParams({ jobId: String(jobs[0].id) }, { replace: true });
    }
  }, [jobIdFromQuery, jobs]);

  // Selected job details
  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null;
    return jobs.find((j) => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  // Resumes sent count for selected job
  const resumesSentCount = useMemo(() => {
    if (!selectedJobId) return 0;
    const allApps = Object.values(pipeline).flat() as any[];
    return allApps.filter((app) => app.job_role_id === selectedJobId).length;
  }, [pipeline, selectedJobId]);

  // Compute status badge styling matching Positions tab
  const jobStatusBadge = useMemo(() => {
    if (!selectedJob) return null;
    const s = (selectedJob.status || "open").toLowerCase().trim().replace("_", "-");
    if (s === "open" || s === "active") {
      return {
        label: "OPEN",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    }
    if (s === "on-hold" || s === "on hold") {
      return {
        label: "ON HOLD",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    }
    if (s === "loss") {
      return {
        label: "LOSS",
        className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };
    }
    return {
      label: "CLOSED",
      className: "bg-muted text-muted-foreground border-border",
    };
  }, [selectedJob]);

  // File processing and validation
  const processFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: QueuedFile[] = [];

    fileArray.forEach((file) => {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`"${file.name}" is not a supported file type. Only PDF, DOC, and DOCX are allowed.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      // Check if file already in queue
      const isDuplicate = queuedFiles.some((q) => q.name === file.name && q.size === file.size);
      if (isDuplicate) {
        toast.info(`"${file.name}" is already in the upload queue.`);
        return;
      }

      validFiles.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        uploadDate: formatUploadDate(new Date()),
        status: "ready",
      });
    });

    if (validFiles.length > 0) {
      setQueuedFiles((prev) => [...prev, ...validFiles]);
      toast.success(`Added ${validFiles.length} file${validFiles.length > 1 ? "s" : ""} to queue.`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllFiles = () => {
    setQueuedFiles([]);
    toast.info("Cleared all uploaded files from queue.");
  };

  // Sync Candidates Handler
  const handleSyncCandidates = async () => {
    if (!selectedJobId) {
      toast.error("Please select an assigned job opening first.");
      return;
    }

    if (queuedFiles.length === 0) {
      toast.error("Please upload at least one resume to sync.");
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ completed: 0, total: queuedFiles.length });

    let successCount = 0;
    let failCount = 0;

    const updatedQueued = [...queuedFiles];

    for (let i = 0; i < updatedQueued.length; i++) {
      const item = updatedQueued[i];
      if (item.status === "synced") {
        setSyncProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
        continue;
      }

      // Mark current as uploading
      setQueuedFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" } : f))
      );

      try {
        const res = await vendorUploadResume({
          file: item.file,
          jobRoleId: selectedJobId,
        });

        successCount++;
        setQueuedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "synced",
                  candidateName: res?.candidate?.name || res?.name || "Candidate",
                }
              : f
          )
        );
      } catch (err: any) {
        failCount++;
        const errorMsg =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to parse and sync candidate resume";
        setQueuedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "failed",
                  errorMessage: errorMsg,
                }
              : f
          )
        );
      }

      setSyncProgress((prev) => ({ ...prev, completed: i + 1 }));
    }

    setIsSyncing(false);

    // Invalidate queries so dashboard/pipeline updates immediately
    queryClient.invalidateQueries({ queryKey: ["vendor-jobs"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-stats"] });

    if (successCount > 0) {
      toast.success(
        `Successfully synced ${successCount} candidate${successCount > 1 ? "s" : ""} to ResumeIQ!`
      );
    }
    if (failCount > 0) {
      toast.error(`${failCount} file${failCount > 1 ? "s" : ""} could not be synced. Check table status.`);
    }
  };

  const isSyncDisabled = isSyncing || queuedFiles.length === 0 || !selectedJobId;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Link to="/vendor" className="hover:text-primary transition-colors flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          <span>Vendor</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
        <Link to="/vendor/jobs" className="hover:text-primary transition-colors">
          Jobs
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
        <span className="text-foreground font-bold">Upload Candidates</span>
      </nav>

      {/* 2. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Upload Candidates
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Submit and synchronize multiple candidate resumes directly for your assigned job requisition.
          </p>
        </div>

        <Link
          to="/vendor/jobs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground transition-all shadow-xs self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Jobs</span>
        </Link>
      </div>

      {/* 3. Selected Job Summary Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs transition-all hover:border-primary/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Job Identity */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground truncate">
                  {selectedJob?.title || "No Job Selected"}
                </h3>
                {jobStatusBadge && (
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${jobStatusBadge.className}`}
                  >
                    {jobStatusBadge.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground/70" />
                  {selectedJob?.location || "Remote"}
                </span>
                <span>•</span>
                <span>{selectedJob?.work_mode || "Full-time"}</span>
                {selectedJob?.company_name && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-foreground/80">{selectedJob.company_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Job Metrics & Switcher */}
          <div className="flex items-center gap-3 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
            <div className="px-3 py-1.5 rounded-xl bg-secondary/80 border border-border/60 text-center min-w-[90px]">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                Positions
              </span>
              <span className="text-xs font-extrabold text-foreground">
                {selectedJob?.positions_required || 1} Required
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-secondary/80 border border-border/60 text-center min-w-[95px]">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                Experience
              </span>
              <span className="text-xs font-extrabold text-foreground truncate max-w-[120px] block">
                {selectedJob?.experience_required != null
                  ? String(selectedJob.experience_required).toLowerCase().includes("yr")
                    ? selectedJob.experience_required
                    : `${selectedJob.experience_required} Yrs`
                  : "Fresher / Any"}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-center min-w-[90px]">
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                Resumes Sent
              </span>
              <span className="text-xs font-extrabold text-primary">
                {resumesSentCount} Sent
              </span>
            </div>

            {/* Quick Switch Dropdown if vendor has multiple assigned jobs */}
            {jobs.length > 1 && (
              <div className="relative">
                <select
                  value={selectedJobId || ""}
                  onChange={(e) => {
                    const newId = Number(e.target.value);
                    setSelectedJobId(newId);
                    setSearchParams({ jobId: String(newId) });
                  }}
                  className="px-3 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-xs"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      Switch: {j.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative bg-card border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all duration-300 shadow-xs ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.008]"
            : "border-border hover:border-primary/50 hover:bg-secondary/20"
        } ${isSyncing ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isSyncing}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto transition-transform group-hover:scale-110 duration-300 ring-8 ring-primary/5">
            <UploadCloud className="w-8 h-8 md:w-10 md:h-10 animate-bounce-slow" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base md:text-lg font-bold text-foreground">
              Drag & Drop Resumes Here
            </h3>
            <p className="text-xs text-muted-foreground">
              Supports <span className="font-semibold text-foreground">PDF, DOC, DOCX</span> formats up to{" "}
              <span className="font-semibold text-foreground">20MB each</span>.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSyncing}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 inline-flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Browse Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Uploaded Files Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="p-4 md:px-6 border-b border-border/80 flex items-center justify-between gap-4 bg-secondary/15">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-xs md:text-sm font-bold text-foreground">
              Uploaded Files ({queuedFiles.length})
            </h3>
          </div>

          {queuedFiles.length > 0 && (
            <button
              type="button"
              onClick={clearAllFiles}
              disabled={isSyncing}
              className="text-xs font-semibold text-destructive hover:underline disabled:opacity-50 transition-all"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Files Content */}
        {queuedFiles.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-xs font-bold text-foreground">No files in queue</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Upload candidates above to review, validate, and synchronize their profiles into the hiring pipeline.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/30">
                  <th className="py-3 px-4 md:px-6">File Name</th>
                  <th className="py-3 px-4 text-center">Size</th>
                  <th className="py-3 px-4 text-center hidden sm:table-cell">Upload Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {queuedFiles.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    {/* File Name */}
                    <td className="py-3.5 px-4 md:px-6">
                      <div className="flex items-center gap-3 min-w-0 max-w-md">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate" title={item.name}>
                            {item.name}
                          </p>
                          {item.candidateName && item.status === "synced" && (
                            <p className="text-[10px] text-emerald-600 font-bold truncate">
                              Parsed Candidate: {item.candidateName}
                            </p>
                          )}
                          {item.errorMessage && item.status === "failed" && (
                            <p className="text-[10px] text-destructive truncate" title={item.errorMessage}>
                              {item.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-3.5 px-4 text-center text-muted-foreground font-medium whitespace-nowrap">
                      {item.formattedSize}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-center text-muted-foreground font-medium hidden sm:table-cell whitespace-nowrap">
                      {item.uploadDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.status === "ready" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground border border-border">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>Ready to Sync</span>
                        </span>
                      )}
                      {item.status === "uploading" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Syncing...</span>
                        </span>
                      )}
                      {item.status === "synced" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Synced</span>
                        </span>
                      )}
                      {item.status === "failed" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                          <AlertCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    {/* Delete Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        disabled={isSyncing}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Sync Options Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/70 pb-3">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="text-xs md:text-sm font-bold text-foreground">Sync Options</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Duplicate Handling */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-2">
            <label className="text-xs font-bold text-foreground block">Duplicate Candidate Handling</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="skip"
                  checked={duplicateHandling === "skip"}
                  onChange={() => setDuplicateHandling("skip")}
                  className="w-4 h-4 accent-primary text-primary focus:ring-primary/40 cursor-pointer"
                />
                <span>Skip duplicates if candidate already exists in pipeline</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="overwrite"
                  checked={duplicateHandling === "overwrite"}
                  onChange={() => setDuplicateHandling("overwrite")}
                  className="w-4 h-4 accent-primary text-primary focus:ring-primary/40 cursor-pointer"
                />
                <span>Update / refresh candidate details from latest resume</span>
              </label>
            </div>
          </div>

          {/* Email Notification */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-2">
            <label className="text-xs font-bold text-foreground block">Notifications</label>
            <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={emailNotification}
                onChange={(e) => setEmailNotification(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer accent-primary mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground block">Email notification upon sync</span>
                <span className="text-[11px] text-muted-foreground block">
                  Send upload confirmation and parsed candidate summary to vendor contact email.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* 7. Bottom Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <Link
          to="/vendor/jobs"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground transition-all shadow-xs order-2 sm:order-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Jobs</span>
        </Link>

        <button
          type="button"
          onClick={handleSyncCandidates}
          disabled={isSyncDisabled}
          className="relative group px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs tracking-wide shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2 overflow-hidden active:scale-98"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>
                Syncing Candidates ({syncProgress.completed}/{syncProgress.total})...
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                Sync Candidates {queuedFiles.length > 0 ? `(${queuedFiles.length})` : ""}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default VendorUpload;
