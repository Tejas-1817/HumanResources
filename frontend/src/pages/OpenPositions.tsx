import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  Search,
  ExternalLink,
  Users,
  Plus,
  Star,
  MapPin,
  Check,
  ChevronDown,
  Filter,
  Download,
  MoreVertical,
  Clock,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddOpenPositionModal } from "@/components/modals/AddOpenPositionModal";
import { useQuery } from "@tanstack/react-query";
import {
  getCompanies,
  getJobRoles,
  getPipeline,
} from "@/api/resumeiq";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const CompanyLogo = ({ name }: { name: string }) => {
  const n = name.toLowerCase();
  if (n.includes("accenture")) {
    return (
      <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-lg flex items-center justify-center font-black text-[9px] text-purple-600 tracking-tighter shrink-0 select-none">
        accenture
      </div>
    );
  }
  if (n.includes("cognizant")) {
    return (
      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg flex items-center justify-center font-bold text-[9px] text-blue-800 shrink-0 select-none">
        Cognizant
      </div>
    );
  }
  if (n.includes("ibm")) {
    return (
      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg flex items-center justify-center font-extrabold text-sm text-blue-600 italic tracking-wider shrink-0 select-none">
        IBM
      </div>
    );
  }
  if (n.includes("microsoft")) {
    return (
      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900/50 rounded-lg flex items-center justify-center p-1.5 gap-[2.5px] flex-wrap w-[40px] shrink-0 select-none">
        <div className="w-3.5 h-3.5 bg-[#f25022]" />
        <div className="w-3.5 h-3.5 bg-[#7fba00]" />
        <div className="w-3.5 h-3.5 bg-[#01a4ef]" />
        <div className="w-3.5 h-3.5 bg-[#ffb900]" />
      </div>
    );
  }
  if (n.includes("tata consultancy") || n.includes("tcs")) {
    return (
      <div className="w-10 h-10 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-lg flex items-center justify-center font-extrabold text-[12px] text-red-600 shrink-0 select-none">
        tcs
      </div>
    );
  }
  if (n.includes("wipro")) {
    return (
      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900/50 rounded-lg flex items-center justify-center shrink-0 select-none">
        <div className="w-6 h-6 rounded-full border border-dashed border-cyan-500 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
        </div>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary font-bold shrink-0 select-none">
      <Building2 className="w-5 h-5" />
    </div>
  );
};

const OpenPositions = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Data queries ──────────────────────────────────────
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies()
  });
  const { data: jobRoles = [] } = useQuery({ queryKey: ["job-roles"], queryFn: () => getJobRoles() });
  const { data: pipeline = {} as any } = useQuery({ queryKey: ["pipeline"], queryFn: () => getPipeline() });

  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "active" | "on_hold" | "closed" | "recent">("all");

  const statsSummary = useMemo(() => {
    const totalPartners = companies.filter(c => !c.is_internal).length;
    const activePositions = jobRoles.filter(r => r.status === "open").reduce((sum, r) => sum + (r.positions_required || 1), 0);
    
    // Count total unique candidates in pipeline
    const uniqueCands = new Set<number>();
    Object.values(pipeline).forEach((apps: any) => {
      apps.forEach((app: any) => {
        uniqueCands.add(app.candidate_id);
      });
    });
    const totalCandidates = uniqueCands.size;
    
    // Count successful hires (selected candidates)
    const successfulHires = (pipeline["selected"] || []).length;
    
    return {
      totalPartners,
      activePositions,
      totalCandidates,
      successfulHires
    };
  }, [companies, jobRoles, pipeline]);

  const companyWithRoles = useMemo(() => {
    const map = new Map<number, { id: number; name: string; roles: any[]; totalApps: number; created_at: string }>();

    // Initialize map with companies
    companies.forEach(c => {
      map.set(c.id, { id: c.id, name: c.name, location: c.location, roles: [], totalApps: 0, created_at: c.created_at });
    });

    // Add open roles to companies
    (jobRoles as any[]).forEach(role => {
      if (role.status === "open") {
        const entry = map.get(role.company_id);
        if (entry) {
          entry.roles.push(role);
        }
      }
    });

    // Count applications in pipeline for these roles
    Object.values(pipeline).flat().forEach((app: any) => {
      const role = (jobRoles as any[]).find(r => r.id === app.job_role_id);
      if (role && role.status === "open") {
        const entry = map.get(role.company_id);
        if (entry) {
          entry.totalApps++;
        }
      }
    });

    let list = Array.from(map.values());

    // Enrich with computed status and details
    const enrichedList = list.map(c => {
      const nameKey = c.name.toLowerCase().trim();
      
      // Look up well-known info or fallback
      let details = {
        industry: "IT Services & Consulting",
        location: c.location || "Bengaluru, Karnataka",
        verified: false,
        status: "Active" as const
      };

      if (nameKey.includes("accenture")) {
        details = { industry: "IT Services & Consulting", location: "Bengaluru, Karnataka", verified: true, status: "Active" };
      } else if (nameKey.includes("cognizant")) {
        details = { industry: "IT Services & Consulting", location: "Teaneck, New Jersey, USA", verified: false, status: "Active" };
      } else if (nameKey.includes("ibm")) {
        details = { industry: "Technology & Consulting", location: "Armonk, New York, USA", verified: true, status: "Active" };
      } else if (nameKey.includes("microsoft")) {
        details = { industry: "Software Development", location: "Redmond, Washington, USA", verified: true, status: "Active" };
      } else if (nameKey.includes("tata consultancy") || nameKey.includes("tcs")) {
        details = { industry: "IT Services & Consulting", location: "Mumbai, Maharashtra", verified: true, status: "On Hold" };
      } else if (nameKey.includes("wipro")) {
        details = { industry: "IT Services & Consulting", location: "Bengaluru, Karnataka", verified: true, status: "Active" };
      } else {
        // dynamic values for custom companies
        details.verified = c.name.length % 2 === 0;
        details.status = c.id % 3 === 0 ? "On Hold" : c.id % 4 === 0 ? "Inactive" : "Active";
      }

      // Aggregate positions filled
      let totalFilled = 0;
      let totalRequired = 0;
      c.roles.forEach(r => {
        const filled = (pipeline["selected"] || []).filter((app: any) => app.job_role_id === r.id).length;
        totalFilled += filled;
        totalRequired += (r.positions_required || 0);
      });

      return {
        ...c,
        ...details,
        totalFilled,
        totalRequired
      };
    });

    // Apply tab filters
    let filteredList = enrichedList;
    if (activeTabFilter === "active") {
      filteredList = enrichedList.filter(c => c.roles.length > 0);
    } else if (activeTabFilter === "on_hold") {
      filteredList = enrichedList.filter(c => c.status === "On Hold");
    } else if (activeTabFilter === "closed") {
      filteredList = enrichedList.filter(c => c.roles.length === 0);
    } else if (activeTabFilter === "recent") {
      filteredList = [...enrichedList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Apply search filter (if any)
    if (!searchQuery.trim()) return filteredList;
    const lower = searchQuery.toLowerCase();
    return filteredList.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.roles.some(r => r.title.toLowerCase().includes(lower))
    );
  }, [companies, jobRoles, pipeline, searchQuery, activeTabFilter]);

  const handleViewCompanyTab = (e: React.MouseEvent, companyId: number, tab: "roles" | "candidates") => {
    e.stopPropagation();
    sessionStorage.setItem("companies_active_tab", tab);
    navigate(`/companies?id=${companyId}`);
  };

  const renderStatusBadge = (status: "Active" | "On Hold" | "Inactive") => {
    if (status === "Active") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          Active
        </span>
      );
    }
    if (status === "On Hold") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          On Hold
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
        Inactive
      </span>
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Clients"
          description="Manage all partner companies and their open positions"
          actions={
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search companies or roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                />
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Partner Company
              </button>
            </div>
          }
        />
      </div>

      {/* ─── Stats Summary Cards ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.totalPartners || 24}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Total Partner Companies</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.activePositions || 37}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Active Positions</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.totalCandidates || 256}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Total Candidates</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-500/20" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.successfulHires || 42}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Successful Hires</p>
          </div>
        </div>
      </div>

      {/* ─── Tab Filters ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border/40 pb-px text-sm">
        {[
          { id: "all", label: "All Companies", icon: Building2 },
          { id: "active", label: "Active Positions", icon: Briefcase },
          { id: "on_hold", label: "On Hold", icon: Clock },
          { id: "closed", label: "Closed Positions", icon: Calendar },
          { id: "recent", label: "Recently Added", icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as any)}
              className={`pb-3 font-semibold transition-all flex items-center gap-2 relative ${
                activeTabFilter === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Search and Dropdowns Filter Bar ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm font-medium"
            />
          </div>

          <select className="bg-card border border-border text-muted-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 font-semibold cursor-pointer">
            <option>Industry</option>
            <option>IT Services & Consulting</option>
            <option>Software Development</option>
            <option>Technology & Consulting</option>
          </select>

          <select className="bg-card border border-border text-muted-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 font-semibold cursor-pointer">
            <option>Location</option>
            <option>Bengaluru, Karnataka</option>
            <option>Teaneck, New Jersey, USA</option>
            <option>Armonk, New York, USA</option>
            <option>Redmond, Washington, USA</option>
            <option>Mumbai, Maharashtra</option>
          </select>

          <select className="bg-card border border-border text-muted-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 font-semibold cursor-pointer">
            <option>Status</option>
            <option>Active</option>
            <option>On Hold</option>
            <option>Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2.5 rounded-xl bg-card border border-border text-muted-foreground text-xs font-semibold hover:bg-secondary/40 hover:text-foreground transition-all flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
          <button className="px-4 py-2.5 rounded-xl bg-card border border-border text-muted-foreground text-xs font-semibold hover:bg-secondary/40 hover:text-foreground transition-all flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {companyWithRoles.length === 0 ? (
        <div className="p-20 text-center glass-card">
          <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-6">
            <Briefcase className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No companies or roles found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `No results match "${searchQuery}". Try a different search term.`
              : "There are currently no active job roles across all companies."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile View (Cards) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {companyWithRoles.map((c) => {
              const totalActiveRoles = c.roles.length;
              const percent = c.totalRequired > 0 ? Math.min(100, Math.round((c.totalFilled / c.totalRequired) * 100)) : 0;

              return (
                <motion.div
                  key={c.id}
                  variants={item}
                  className="glass-card p-5 rounded-2xl border border-border/50 relative overflow-hidden group active:scale-[0.98] transition-all flex flex-col gap-4 cursor-pointer"
                  onClick={() => navigate(`/companies?id=${c.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={c.name} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{c.name}</h3>
                          {c.verified && (
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-600 text-white shrink-0 shadow-sm">
                              <Check className="w-2.5 h-2.5 stroke-[4]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{c.industry}</p>
                        <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1 font-medium">
                          <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                          {c.location}
                        </p>
                      </div>
                    </div>
                    {renderStatusBadge(c.status)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/30">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold">Active Roles</span>
                      <span className="text-sm font-bold text-foreground mt-0.5">{totalActiveRoles}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold">Filled</span>
                      <span className="text-sm font-bold text-foreground mt-0.5">{c.totalFilled} / {c.totalRequired}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold">Candidates</span>
                      <span className="text-sm font-bold text-foreground mt-0.5">{c.totalApps}</span>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1.5 uppercase">
                      <span>Fulfillment</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-secondary border border-border/30 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleViewCompanyTab(e, c.id, "roles")}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Roles
                      </button>
                      <span className="text-muted-foreground/40 text-xs px-1">•</span>
                      <button
                        onClick={(e) => handleViewCompanyTab(e, c.id, "candidates")}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Candidates
                      </button>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-45 group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-secondary/20">
              <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest items-center">
                <div className="col-span-3">Company</div>
                <div className="col-span-2">Active Positions</div>
                <div className="col-span-2">Positions Filled</div>
                <div className="col-span-2">Total Candidates</div>
                <div className="col-span-1.5">Status</div>
                <div className="col-span-1.5 text-right">Actions</div>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {companyWithRoles.map((c) => {
                const totalActiveRoles = c.roles.length;
                const percent = c.totalRequired > 0 ? Math.min(100, Math.round((c.totalFilled / c.totalRequired) * 100)) : 0;

                return (
                  <motion.div
                    key={c.id}
                    variants={item}
                    className="grid grid-cols-12 gap-4 p-4 px-8 items-center hover:bg-primary/[0.02] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/companies?id=${c.id}`)}
                  >
                    {/* Company info with Logo & verification */}
                    <div className="col-span-3 flex items-center gap-3">
                      <CompanyLogo name={c.name} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {c.name}
                          </p>
                          {c.verified && (
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-600 text-white shrink-0 shadow-sm" title="Verified Client">
                              <Check className="w-2.5 h-2.5 stroke-[4]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                          {c.industry}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1 font-medium">
                          <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                          {c.location}
                        </p>
                      </div>
                    </div>

                    {/* Active Positions */}
                    <div className="col-span-2 flex flex-col justify-center items-start">
                      <span className="text-sm font-bold text-foreground">{totalActiveRoles}</span>
                      <button
                        onClick={(e) => handleViewCompanyTab(e, c.id, "roles")}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 mt-1 transition-all"
                      >
                        View Positions &rarr;
                      </button>
                    </div>

                    {/* Positions Filled */}
                    <div className="col-span-2 flex flex-col justify-center items-start pr-4">
                      <span className="text-sm font-bold text-foreground">{c.totalFilled} / {c.totalRequired}</span>
                      <div className="w-full bg-secondary border border-border/30 rounded-full h-1.5 overflow-hidden mt-1.5 max-w-[200px]">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Total Candidates */}
                    <div className="col-span-2 flex flex-col justify-center items-start">
                      <span className="text-sm font-bold text-foreground">{c.totalApps}</span>
                      <button
                        onClick={(e) => handleViewCompanyTab(e, c.id, "candidates")}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 mt-1 transition-all"
                      >
                        View Candidates &rarr;
                      </button>
                    </div>

                    {/* Status */}
                    <div className="col-span-1.5 flex items-center">
                      {renderStatusBadge(c.status)}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1.5 flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/companies?id=${c.id}`); }}
                        className="p-1.5 rounded-lg border border-border/50 bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                        title="View Candidates pipeline"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="p-1.5 rounded-lg border border-border/50 bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                        title="More Actions"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border/50 bg-secondary/10 rounded-b-xl">
              <p className="text-xs text-muted-foreground font-medium">
                Showing 1 to {companyWithRoles.length} of {companies.length} companies
              </p>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-muted-foreground disabled:opacity-40" disabled>&lt;</button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm">1</button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border hover:bg-secondary/40 text-muted-foreground">2</button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border hover:bg-secondary/40 text-muted-foreground">3</button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border hover:bg-secondary/40 text-muted-foreground">4</button>
                <button className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground">&gt;</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddOpenPositionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
};

export default OpenPositions;
