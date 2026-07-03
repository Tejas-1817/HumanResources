import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Mail,
  Phone,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Trash2,
  Calendar,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getVendorCandidates, vendorUploadOnBench, vendorDeleteCandidate } from "@/api/resumeiq";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const VendorBench = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["vendor-candidates"],
    queryFn: getVendorCandidates,
  });

  const uploadMutation = useMutation({
    mutationFn: vendorUploadOnBench,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-candidates"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        await uploadMutation.mutateAsync(file);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setUploading(false);
    setFiles([]);
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} candidates to your bench.`);
      setIsUploadModalOpen(false);
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} files.`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this candidate? This will remove all their data from the portal.")) {
      return;
    }

    try {
      await vendorDeleteCandidate(id);
      toast.success("Candidate deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor-candidates"] });
    } catch (error) {
      toast.error("Failed to delete candidate");
    }
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.skills?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="On-Bench Candidates"
        description="Manage your available talent pool and upload new potential candidates."
        actions={
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="group relative px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 flex items-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-none" />
            <PlusIcon className="w-4 h-4" />
            <span>Upload Bench Talent</span>
          </button>
        }
      />

      {/* ─── Search & Metrics ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 bg-secondary/30 p-1 px-2 rounded-2xl border border-border/50 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border shadow-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">{candidates.length} Total Talent</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border shadow-sm">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-bold text-foreground">{candidates.filter(c => new Date(c.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length} New this week</span>
          </div>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search name, skills, experience..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
          />
        </div>
      </div>

      {/* ─── Talent Directory (List View) ─── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary/20 animate-pulse border border-border/50" />
          ))}
        </div>
      ) : filteredCandidates.length > 0 ? (
        <div className="glass-card overflow-hidden border-border/50 shadow-2xl shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/20">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Candidate Profile</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Experience</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Skills Palette</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Ingested</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredCandidates.map((candidate) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={candidate.id}
                    className="hover:bg-primary/[0.02] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/vendor/candidates/${candidate.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-inner group-hover:scale-105 transition-transform duration-300 shrink-0">
                          {candidate.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">{candidate.name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 truncate">
                            <Mail className="w-3 h-3 opacity-50" />
                            {candidate.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-secondary/50 text-[11px] font-bold text-foreground border border-border/50">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {candidate.experience_years} Years
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                        {candidate.skills?.split(",").slice(0, 5).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-bold border border-border">
                            {skill.trim()}
                          </span>
                        ))}
                        {candidate.skills && candidate.skills.split(",").length > 5 && (
                          <span className="text-[10px] text-muted-foreground font-black px-1">
                            +{candidate.skills.split(",").length - 5}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-bold text-muted-foreground">
                        {new Date(candidate.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all shadow-sm"
                          onClick={(e) => handleDelete(e, candidate.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 glass-card bg-secondary/5 border-dashed border-border">
          <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mb-4 text-muted-foreground">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No talent found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-8">Start growing your bench by uploading resumes.</p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Upload Now
          </button>
        </div>
      )}

      {/* ─── Upload Modal ─── */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Bench Talent Ingestion</h2>
                    <p className="text-[10px] text-muted-foreground uppercase font-black mt-0.5 tracking-wider">Independent sync to talent pool</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    disabled={uploading}
                  />
                  <div className={`p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all ${uploading ? "opacity-30" : "bg-secondary/10 border-border hover:border-primary/50 hover:bg-secondary/20"
                    }`}>
                    <Upload className="w-10 h-10 text-primary animate-bounce-slow" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">Drop resumes to parse</p>
                      <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX supported</p>
                    </div>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50 group">
                      <FileText className="w-4 h-4 text-orange-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={uploading}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={uploading}
                    className="flex-1 py-3.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-secondary transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || files.length === 0}
                    className="flex-[2] py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : "Sync Talent Pool"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default VendorBench;
