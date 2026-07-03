import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload as UploadIcon, FileText, CheckCircle2, X, Sparkles, Building2, Globe, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import { getCompanies, getJobRoles, JobRole, Company, uploadResume } from "@/api/resumeiq";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const SOURCES = [
  { id: "LinkedIn", label: "LinkedIn", icon: "🔗" },
  { id: "Indeed", label: "Indeed", icon: "🔍" },
  { id: "Referral", label: "Referral", icon: "🤝" },
  { id: "Direct", label: "Direct", icon: "📤" },
  { id: "Internshala", label: "Internshala", icon: "🎓" },
  { id: "Consultancy", label: "Consultancy", icon: "🏢" },
  { id: "Vendor", label: "Vendor", icon: "🏪" },
];

interface UploadProps {
  prefilledRole?: { id: number; title: string };
  prefilledCompanyId?: number;
  onSuccess?: () => void;
}

const UploadPage = ({ prefilledRole, prefilledCompanyId, onSuccess }: UploadProps) => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [jobRoleTitle, setJobRoleTitle] = useState(prefilledRole?.title || "");
  const [selectedSource, setSelectedSource] = useState("Direct");
  const [consultancy, setConsultancy] = useState("");
  const [vendor, setVendor] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | "">(prefilledCompanyId || "");
  const [hasDefaultBeenSet, setHasDefaultBeenSet] = useState(false);
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<number | "">("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: companiesData } = useQuery<Company[]>({
    queryKey: ["companies", { include_internal: true }],
    queryFn: () => getCompanies({ include_internal: true }),
  });
  const companies = companiesData ?? [];

  useEffect(() => {
    if (prefilledCompanyId) {
      setSelectedCompanyId(prefilledCompanyId);
      setHasDefaultBeenSet(true);
    }
  }, [prefilledCompanyId]);

  useEffect(() => {
    if (!prefilledCompanyId && !hasDefaultBeenSet && companies.length > 0) {
      const internalCompany = companies.find(c => c.is_internal || c.name === "Altzor Digital Solutions");
      if (internalCompany) {
        setSelectedCompanyId(internalCompany.id);
      }
      setHasDefaultBeenSet(true);
    }
  }, [companies, prefilledCompanyId, hasDefaultBeenSet]);

  const { data: jobRolesData } = useQuery<JobRole[]>({
    queryKey: ["job-roles", selectedCompanyId],
    queryFn: () => getJobRoles(selectedCompanyId || undefined),
  });
  const jobRoles = jobRolesData ?? [];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || 
             f.name.toLowerCase().endsWith(".docx") || 
             f.name.toLowerCase().endsWith(".doc")
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleUpload = async () => {
    const roleId = prefilledRole?.id || selectedJobRoleId;
    const selectedRole = jobRoles.find(r => r.id === roleId);
    const normalizedRoleTitle = selectedRole?.title || "";
    if (!files.length || !selectedSource) {
      toast.error("Please add files and select a source");
      return;
    }
    setUploading(true);
    setProgress(0);
    const sourceMap: Record<string, string> = {
      LinkedIn: "linkedin",
      Indeed: "indeed",
      Referral: "referral",
      Direct: "direct",
      Consultancy: "consultancy",
      Vendor: "vendor",
      Internshala: "internshala",
    };
    
    let successCount = 0;
    const roleIdFinal = prefilledRole?.id || (selectedJobRoleId !== "" ? selectedJobRoleId : undefined);
    
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        await uploadResume({
          file,
          jobRoleTitle: normalizedRoleTitle || undefined,
          jobRoleId: roleIdFinal,
          companyId: selectedCompanyId || undefined,
          source: sourceMap[selectedSource] ?? "direct",
          consultancyName: selectedSource === "Consultancy" ? consultancy.trim() : undefined,
          vendorName: selectedSource === "Vendor" ? vendor.trim() : undefined,
        });
        successCount += 1;
      } catch (err: unknown) {
        const msg = (err as any).response?.data?.message || (err as any).message || "Sync failed";
        toast.error(`${file.name}: ${msg}`);
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} item(s) synchronized`);
      if (onSuccess) onSuccess();
      else navigate("/candidates");
    }
    setFiles([]);
    setProgress(0);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {!prefilledRole && (
        <div className="text-center pb-2">
          <h2 className="text-xl font-bold text-foreground">Talent Console</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Synchronize external resumes with the intelligence pool</p>
        </div>
      )}

      {/* Primary Interaction Field: Rectangular Dropzone */}
      <motion.div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer backdrop-blur-sm ${
          dragActive 
            ? "border-primary bg-primary/5 scale-[1.01] shadow-2xl" 
            : "border-border/60 bg-secondary/20 hover:border-primary/40"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input id="file-input" type="file" multiple accept=".pdf,.docx,.doc" className="hidden" onChange={handleFileInput} />
        <div className="flex flex-col items-center gap-3">
          <UploadIcon className={`w-6 h-6 text-primary transition-transform ${dragActive ? 'scale-125' : ''}`} />
          <div>
            <p className="text-xs font-bold text-foreground">Click or drop talent resumes</p>
            <p className="text-[9px] text-muted-foreground uppercase mt-1">PDF, DOCX, or DOC accepted</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {files.map((f, i) => (
              <span key={i} className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary flex items-center gap-1.5">
                <FileText className="w-2.5 h-2.5" /> {f.name.slice(0, 12)}...
                <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }} />
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Simplified Config Field */}
      <div className="glass-card p-5 rounded-xl border border-primary/5 space-y-5">
        <div>
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2.5 block">Source Channel</label>
          <div className="grid grid-cols-3 gap-1.5">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSource(s.id)}
                className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${
                  selectedSource === s.id 
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                    : "bg-secondary/40 text-muted-foreground border-border/50 hover:bg-secondary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {!prefilledRole && (
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Target Company</label>
                <div className="relative group">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  {prefilledCompanyId ? (
                    <div className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary/30 border border-border text-[11px] font-bold flex items-center h-[38px] text-muted-foreground select-none">
                      {companies.find((c) => c.id === prefilledCompanyId)?.name === "Altzor Digital Solutions" ||
                      companies.find((c) => c.id === prefilledCompanyId)?.is_internal
                        ? "Internal Hiring"
                        : (companies.find((c) => c.id === prefilledCompanyId)?.name || "Altzor Digital Solutions")}
                    </div>
                  ) : (
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value ? Number(e.target.value) : "");
                        setSelectedJobRoleId("");
                      }}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Company (Optional)</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.is_internal || c.name === "Altzor Digital Solutions" ? "Internal Hiring" : c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {selectedCompanyId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="relative"
                >
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Job Role</label>
                  <div className="relative group">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/60 group-focus-within:text-primary transition-colors" />
                    <select
                      value={selectedJobRoleId}
                      onChange={(e) => setSelectedJobRoleId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all appearance-none cursor-pointer border-primary/20"
                    >
                      <option value="">Select Position (Optional)</option>
                      {jobRoles.map((r) => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}

              {!selectedCompanyId && (
                <div className="mt-1.5 flex items-center gap-1.5 px-1">
                  <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                  <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">Automatic Talent Pool Placement</span>
                </div>
              )}
            </div>
          )}

          {selectedSource === "Consultancy" && (
            <div className="relative border-t border-border/50 pt-4 mt-1">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Consultancy Detail</label>
              <div className="relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={consultancy}
                  onChange={(e) => setConsultancy(e.target.value)}
                  placeholder="External organization name"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>
          )}

          {selectedSource === "Vendor" && (
            <div className="relative border-t border-border/50 pt-4 mt-1">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Vendor Detail</label>
              <div className="relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Vendor name"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-3">
          <AnimatePresence>
            {uploading && (
              <div className="mb-4 space-y-1.5">
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-[0.2em] text-primary">
                  <span>Parsing Engine Active</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </AnimatePresence>

          <button
            onClick={handleUpload}
            disabled={uploading || !files.length}
            className="group w-full py-3 rounded-lg bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-[0.25em] shadow-xl shadow-primary/10 hover:shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>Ingest Selected Talent <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
