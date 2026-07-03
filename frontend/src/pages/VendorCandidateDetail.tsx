import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Download, Calendar, Phone, FileText } from "lucide-react";
import { SkillTag } from "@/components/ui/SkillTag";
import { useQuery } from "@tanstack/react-query";
import { getVendorCandidateById } from "@/api/resumeiq";
import client from "@/api/client";
import { toast } from "sonner";

const VendorCandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const candidateId = Number(id);

  const { data: c, isLoading, isError } = useQuery({
    queryKey: ["vendor-candidate", candidateId],
    queryFn: () => getVendorCandidateById(candidateId),
    enabled: Number.isFinite(candidateId),
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    if (!c || !c.original_filename?.toLowerCase().endsWith(".pdf")) {
      setPdfUrl(null);
      return;
    }

    setIsPdfLoading(true);
    let url = "";
    client.get(`/vendor/candidates/${c.id}/file`, { responseType: "blob" })
      .then((res) => {
        url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        setPdfUrl(url);
      })
      .catch(() => {
        setPdfUrl(null);
        toast.error("Failed to load PDF preview");
      })
      .finally(() => setIsPdfLoading(false));

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [c?.id, c?.original_filename]);

  const handleDownload = async () => {
    if (!c) return;
    try {
      const res = await client.get(`/vendor/candidates/${c.id}/file`, { responseType: "blob" });
      const mime = c.original_filename?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement("a");
      a.href = url;
      a.download = c.original_filename || `candidate-${c.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Resume file not available");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-medium">Loading profile...</div>;
  if (isError || !c) return <div className="p-8 text-center text-muted-foreground font-medium">Candidate not found or access denied.</div>;

  const candidateName = c.name || "Unnamed Candidate";
  const initials = candidateName.charAt(0).toUpperCase() || "?";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <button
        onClick={() => navigate("/vendor/candidates")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-4 font-medium"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Candidate Directory
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 h-fit">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black mx-auto mb-4">
              {initials}
            </div>
            <h2 className="text-xl font-bold text-foreground truncate px-2">{candidateName}</h2>
            <div className="mt-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                Vendor-Sourced
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate font-medium">{c.email}</span>
            </div>
            {c.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">{c.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">{c.experience_years} Years Experience</span>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Core Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {(c.skills || "").split(",").filter((s: string) => s.trim()).map((skill: string) => (
                <SkillTag key={skill} skill={skill.trim()} />
              ))}
              {!(c.skills || "").trim() && <p className="text-xs text-muted-foreground italic">No skills extracted</p>}
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="w-full mt-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20 hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Resume
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 h-full min-h-[600px] flex flex-col">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 shrink-0">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              Resume Preview
            </h3>

            <div className="flex-1 bg-secondary/30 rounded-xl overflow-hidden border border-white/5 relative">
              {isPdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-xs font-bold text-primary animate-pulse uppercase tracking-widest">Loading PDF...</span>
                  </div>
                </div>
              )}

              {pdfUrl ? (
                <iframe src={pdfUrl} className="w-full h-full border-0" title="Resume Preview" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 opacity-20" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm mb-2">No In-Browser Preview Available</h4>
                  <p className="text-xs max-w-[280px] leading-relaxed mb-6">
                    {c.original_filename?.toLowerCase().endsWith(".pdf")
                      ? "The PDF could not be loaded. Please try downloading it directly."
                      : "Preview is only supported for PDF files. Click below to download and view the original document."}
                  </p>
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-foreground hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Document
                  </button>
                  <p className="text-[9px] mt-4 opacity-50 font-bold uppercase tracking-widest">File: {c.original_filename}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VendorCandidateDetail;
