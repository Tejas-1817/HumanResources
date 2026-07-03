import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Upload,
    FileText,
    X,
    CheckCircle2,
    AlertCircle,
    Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getVendorJobs, vendorUploadResume } from "@/api/resumeiq";
import { toast } from "sonner";

const VendorUpload = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const jobIdFromQuery = searchParams.get("jobId");

    const [selectedJobId, setSelectedJobId] = useState<number | null>(
        jobIdFromQuery ? parseInt(jobIdFromQuery) : null
    );
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const { data: jobs = [] } = useQuery({
        queryKey: ["vendor-jobs"],
        queryFn: getVendorJobs,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!selectedJobId) {
            toast.error("Please select a job opening first");
            return;
        }
        if (files.length === 0) {
            toast.error("Please add at least one resume");
            return;
        }

        setUploading(true);
        setResults([]);

        const uploadPromises = files.map(async (file) => {
            try {
                const res = await vendorUploadResume({
                    file,
                    jobRoleId: selectedJobId
                });
                return { filename: file.name, success: true, ...res };
            } catch (err: any) {
                return {
                    filename: file.name,
                    success: false,
                    error: err.response?.data?.detail || "Upload failed"
                };
            }
        });

        const allResults = await Promise.all(uploadPromises);
        setResults(allResults);
        setUploading(false);

        const successCount = allResults.filter(r => r.success).length;
        if (successCount > 0) {
            toast.success(`Successfully uploaded ${successCount} candidates`);
            setFiles([]);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Upload Candidates</h1>
                    <p className="text-muted-foreground">Synchronize your talent pool with ResumeIQ.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Step 1: Selection */}
                <div className="glass-card p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black">1</div>
                        <h2 className="text-lg font-bold text-foreground">Select Job Opening</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {jobs.map((job) => (
                            <button
                                key={job.id}
                                onClick={() => setSelectedJobId(job.id)}
                                className={`group relative p-4 rounded-2xl border transition-all text-left overflow-hidden ${selectedJobId === job.id
                                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/10 ring-1 ring-primary"
                                        : "bg-secondary/40 border-border hover:border-primary/30 hover:bg-secondary/60"
                                    }`}
                            >
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-2">
                                        <Briefcase className={`w-4 h-4 ${selectedJobId === job.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                        {selectedJobId === job.id && (
                                            <motion.div layoutId="job-check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                            </motion.div>
                                        )}
                                    </div>
                                    <div className="font-bold text-sm text-foreground mb-1 transition-colors group-hover:text-primary">
                                        {job.title}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                        {job.location || "Remote"}
                                    </div>
                                </div>
                                {selectedJobId === job.id && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Step 2: Upload */}
                <div className="glass-card p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black">2</div>
                        <h2 className="text-lg font-bold text-foreground">Add Resume Files</h2>
                    </div>

                    <div className="relative">
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            disabled={uploading}
                        />
                        <div className={`group relative p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-300 ${uploading
                                ? "opacity-50 cursor-not-allowed"
                                : "bg-secondary/20 border-border hover:border-primary/50 hover:bg-secondary/40"
                            }`}>
                            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-primary animate-bounce-slow" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-bold text-foreground">Click or Drag Resumes</p>
                                <p className="text-xs text-muted-foreground mt-1 px-4">
                                    Supports PDF, DOCX, and DOC formats
                                </p>
                            </div>

                            {/* Inner Glow */}
                            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5 pointer-events-none" />
                        </div>
                    </div>

                    {/* File List */}
                    <AnimatePresence>
                        {files.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between pt-4 border-t border-border">
                                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                        Queued Files ({files.length})
                                    </h3>
                                    <button
                                        onClick={() => setFiles([])}
                                        className="text-[10px] font-bold text-destructive hover:underline"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {files.map((file, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            key={i}
                                            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-foreground truncate">{file.name}</div>
                                                <div className="text-[9px] text-muted-foreground uppercase">{(file.size / 1024).toFixed(0)} KB • Ready</div>
                                            </div>
                                            <button
                                                onClick={() => removeFile(i)}
                                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                disabled={uploading}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Final Actions */}
                <div className="flex items-center justify-between py-4">
                    <button
                        onClick={() => navigate("/vendor/candidates")}
                        className="px-6 py-3 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-secondary transition-all"
                        disabled={uploading}
                    >
                        Return to Candidates
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploading || files.length === 0 || !selectedJobId}
                        className="relative group px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden"
                    >
                        <div className="relative z-10 flex items-center gap-2">
                            {uploading ? (
                                <span className="flex items-center gap-3">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Ingesting Talent...
                                </span>
                            ) : (
                                "Sync Selected Talent"
                            )}
                        </div>

                        {/* Shimmer Effect on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    </button>
                </div>

                {/* Results Section */}
                <AnimatePresence>
                    {results.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-6 md:p-8 space-y-6 bg-secondary/5 border-primary/10"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Processing Report</h3>
                                <div className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                                    {results.filter(r => r.success).length} Success • {results.filter(r => !r.success).length} Failed
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {results.map((res, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={i}
                                        className={`flex items-center gap-4 p-4 rounded-xl border ${res.success ? "bg-emerald-500/5 border-emerald-500/10" : "bg-destructive/5 border-destructive/10"
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${res.success ? "bg-emerald-500/20 text-emerald-500" : "bg-destructive/20 text-destructive"
                                            }`}>
                                            {res.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-foreground truncate">{res.filename}</div>
                                            {res.error && <div className="text-[10px] text-destructive italic">{res.error}</div>}
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-widest shrink-0">
                                            {res.success ? <span className="text-emerald-500">Synced</span> : <span className="text-destructive">Failed</span>}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default VendorUpload;
