import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Mail,
  Phone,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getVendorCandidates } from "@/api/resumeiq";
import { useState } from "react";

const VendorCandidates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["vendor-candidates"],
    queryFn: getVendorCandidates,
  });

  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.skills?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 glass-card-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">My Candidates</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage and track candidates you have submitted to ResumeIQ.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex-shrink-0" title="Filter">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-3">
        {filteredCandidates.length > 0 ? (
          filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="glass-card p-4 rounded-xl space-y-3 border border-border/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{candidate.name}</h3>
                    <p className="text-xs text-primary font-medium">{candidate.experience_years} Yrs Exp</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(candidate.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{candidate.email}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
              </div>

              {candidate.skills && (
                <p className="text-[11px] text-muted-foreground bg-secondary/40 px-2.5 py-1 rounded-lg border border-border/40 line-clamp-2">
                  {candidate.skills}
                </p>
              )}

              <div className="pt-2 border-t border-border/40 flex justify-end">
                <Link
                  to={`/vendor/candidates/${candidate.id}`}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-all inline-flex items-center justify-center gap-2 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Details
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-8 text-center text-muted-foreground text-sm">
            No candidates found matching your search.
          </div>
        )}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Candidate</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expertise</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Submitted At</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{candidate.name}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {candidate.email}
                            </div>
                            {candidate.phone && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {candidate.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs font-medium text-foreground">
                          {candidate.experience_years} Years Experience
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                          {candidate.skills || "No skills identified"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/vendor/candidates/${candidate.id}`}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all inline-flex items-center gap-1.5 group/btn shadow-sm shadow-primary/5"
                      >
                        <Eye className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No candidates found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorCandidates;
