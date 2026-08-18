import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload as UploadIcon, FileText, CheckCircle2, X, Sparkles, Building2, Briefcase, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadResume } from "@/api/resumeiq";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";

const SOURCES = [
  { id: "LinkedIn", label: "LinkedIn", icon: "🔗" },
  { id: "Indeed", label: "Indeed", icon: "🔍" },
  { id: "Referral", label: "Referral", icon: "🤝" },
  { id: "Direct", label: "Direct", icon: "📤" },
  { id: "Internshala", label: "Internshala", icon: "🎓" },
  { id: "Consultancy", label: "Consultancy", icon: "🏢" },
  { id: "Vendor", label: "Vendor", icon: "🏪" },
];

interface AddCandidateToPositionModalProps {
  open: boolean;
  onClose: () => void;
  position?: {
    id: number;
    title: string;
    company_id?: number;
    clientName?: string;
  } | null;
  onSuccess?: () => void;
}

export const AddCandidateToPositionModal = ({
  open,
  onClose,
  position,
  onSuccess,
}: AddCandidateToPositionModalProps) => {
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedSource, setSelectedSource] = useState("Direct");
  const [consultancy, setConsultancy] = useState("");
  const [vendor, setVendor] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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
      (f) =>
        f.type === "application/pdf" ||
        f.name.toLowerCase().endsWith(".docx") ||
        f.name.toLowerCase().endsWith(".doc")
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!position) return;
    if (!files.length) {
      toast.error("Please select or drop candidate resumes");
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

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        await uploadResume({
          file,
          jobRoleTitle: position.title,
          jobRoleId: position.id,
          companyId: position.company_id,
          source: sourceMap[selectedSource] ?? "direct",
          consultancyName: selectedSource === "Consultancy" ? consultancy.trim() : undefined,
          vendorName: selectedSource === "Vendor" ? vendor.trim() : undefined,
        });
        successCount += 1;
      } catch (err: unknown) {
        const msg =
          (err as any).response?.data?.message ||
          (err as any).response?.data?.detail ||
          (err as any).message ||
          "Upload failed";
        toast.error(`${file.name}: ${msg}`);
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} candidate resume(s) uploaded successfully for ${position.title}!`);
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      if (onSuccess) onSuccess();
      setFiles([]);
      setProgress(0);
      onClose();
    }
  };

  if (!position) return null;

  return (
    <Modal open={open} onClose={onClose} title="Add Candidates to Position">
      <div className="space-y-5">
        {/* Position Context Tag */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{position.title}</p>
              {position.clientName && (
                <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-primary" /> {position.clientName}
                </p>
              )}
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
            Active Target
          </span>
        </div>

        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-secondary/40"
          }`}
          onClick={() => document.getElementById("candidate-file-input")?.click()}
        >
          <input
            id="candidate-file-input"
            type="file"
            multiple
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <UploadIcon className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-foreground">
            Drop candidate resumes here or <span className="text-primary underline">browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Supports PDF, DOCX, DOC files (Multiple candidates allowed)</p>
        </div>

        {/* File Queue List */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Selected Files ({files.length})</p>
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/50 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate font-semibold text-foreground">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Source Selection */}
        <div>
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
            Candidate Source
          </label>
          <div className="grid grid-cols-4 gap-2">
            {SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelectedSource(source.id)}
                className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  selectedSource === source.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <span>{source.icon}</span>
                <span className="truncate">{source.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Extra fields based on source */}
        {selectedSource === "Consultancy" && (
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Consultancy Name</label>
            <input
              type="text"
              value={consultancy}
              onChange={(e) => setConsultancy(e.target.value)}
              placeholder="e.g. Apex Recruitment Partners"
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {selectedSource === "Vendor" && (
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Vendor Name</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Global Tech Staffing"
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>Uploading & Parsing Resumes...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary/60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Upload & Assign Candidates
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
