import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronLeft, ChevronRight, ChevronDown, X, Mail, Phone, Calendar, Building2, User, UserCheck, Plus, Upload, Trash2, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Candidate, deleteCandidate, getCandidates, getCompanies, getVendors, getJobRoles, getPipeline } from "@/api/resumeiq";
import UploadPage from "./Upload";
import { toast } from "sonner";
import { formatJobRoleTitle } from "@/components/ui/TableDataCell";

const PAGE_SIZE = 50;

const experienceRanges = [
  { label: "All", min: 0, max: Infinity },
  { label: "0-2 years", min: 0, max: 2 },
  { label: "2-5 years", min: 2, max: 5 },
  { label: "5-10 years", min: 5, max: 10 },
  { label: "10+ years", min: 10, max: Infinity },
];

const Candidates = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const stageFromUrl = searchParams.get("stage") || "";
  const statusFromUrl = searchParams.get("applicant_status") || "";
  const initialStatus = stageFromUrl || statusFromUrl;
  const companyIdFromUrl = searchParams.get("company_id") ? Number(searchParams.get("company_id")) : "";

  const [filtersOpen, setFiltersOpen] = useState(() => Boolean(initialStatus || companyIdFromUrl || searchParams.get("vendor_id") || searchParams.get("unassigned_only")));
  const [expFilter, setExpFilter] = useState(0);
  const [skillFilter, setSkillFilter] = useState("");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<string>(() => initialStatus);
  const [companyFilter, setCompanyFilter] = useState<number | "">(() => companyIdFromUrl);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const navigate = useNavigate();
  const vendorIdFromUrl = searchParams.get("vendor_id") ? Number(searchParams.get("vendor_id")) : null;
  const unassignedOnly = searchParams.get("unassigned_only") === "true";
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentStatusFromUrl = searchParams.get("stage") || searchParams.get("applicant_status") || "";
    if (currentStatusFromUrl !== applicantStatusFilter) {
      setApplicantStatusFilter(currentStatusFromUrl);
      if (currentStatusFromUrl) {
        setFiltersOpen(true);
      }
    }
    const currentCompanyFromUrl = searchParams.get("company_id") ? Number(searchParams.get("company_id")) : "";
    if (currentCompanyFromUrl !== companyFilter) {
      setCompanyFilter(currentCompanyFromUrl);
      if (currentCompanyFromUrl) {
        setFiltersOpen(true);
      }
    }
  }, [searchParams]);

  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies(),
  });

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => getVendors(),
  });

  const { data: jobRolesData } = useQuery({
    queryKey: ["job-roles"],
    queryFn: () => getJobRoles(),
  });

  const { data: pipelineData = {} } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => getPipeline(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["candidates", search.trim(), skillFilter.trim(), expFilter, page, companyFilter, vendorIdFromUrl, unassignedOnly, applicantStatusFilter],
    queryFn: () => {
      let combinedSearch = search.trim();
      const st = skillFilter.trim();
      if (st) {
        combinedSearch = combinedSearch ? `${combinedSearch} ${st}` : st;
      }
      const range = experienceRanges[expFilter];
      const isPipelineStage = ["applied", "pending", "shortlisted", "interview", "selected", "joined"].includes(applicantStatusFilter.toLowerCase());
      return getCandidates({
        search: combinedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
        company_id: companyFilter || undefined,
        min_experience: range?.min > 0 ? range.min : undefined,
        max_experience: range?.max !== Infinity ? range.max : undefined,
        vendor_id: vendorIdFromUrl || undefined,
        unassigned_only: unassignedOnly,
        applicant_status: isPipelineStage ? undefined : (applicantStatusFilter || undefined),
        stage: isPipelineStage ? applicantStatusFilter.toLowerCase() : undefined,
      });
    }
  });

  const candidates = useMemo(() => data?.items ?? [], [data?.items]);
  const totalFromServer = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFromServer / PAGE_SIZE));
  const hasActiveFilters = expFilter !== 0 || skillFilter.trim().length > 0 || companyFilter !== "" || applicantStatusFilter !== "" || vendorIdFromUrl !== null || unassignedOnly;

  const clearFilters = () => {
    setExpFilter(0);
    setSkillFilter("");
    setApplicantStatusFilter("");
    setCompanyFilter("");
    if (vendorIdFromUrl || unassignedOnly || searchParams.get("applicant_status") || searchParams.get("stage") || searchParams.get("company_id")) {
      searchParams.delete("vendor_id");
      searchParams.delete("unassigned_only");
      searchParams.delete("applicant_status");
      searchParams.delete("stage");
      searchParams.delete("company_id");
      setSearchParams(searchParams);
    }
  };

  const roleById = useMemo(() => new Map((jobRolesData || []).map((r) => [r.id, r])), [jobRolesData]);
  const companyById = useMemo(() => new Map((companiesData || []).map((c) => [c.id, c])), [companiesData]);

  const appsByCandidate = useMemo(() => {
    const map = new Map<number, any>();
    Object.values(pipelineData).flat().forEach((app: any) => {
      if (!map.has(app.candidate_id)) map.set(app.candidate_id, app);
    });
    return map;
  }, [pipelineData]);

  const getMarkSentStatus = (candidateId: number) => {
    const app = appsByCandidate.get(candidateId);
    if (!app) return "N/A";
    const role = roleById.get(app.job_role_id);
    if (!role) return "N/A";
    const company = companyById.get(role.company_id);
    if (company?.is_internal) return "N/A";
    return app.resume_sent ? "Sent" : "Not Sent";
  };

  const handleDeleteCandidate = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${name || "this candidate"}? This will also remove all their applications.`)) {
      return;
    }

    try {
      await deleteCandidate(id);
      toast.success("Candidate deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    } catch (error) {
      toast.error("Failed to delete candidate");
      console.error(error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title={vendorIdFromUrl ? (() => { const v = vendorsData?.find(v => v.id === vendorIdFromUrl); return `${unassignedOnly ? 'On Bench' : 'Talent Pool'}: ${v ? (v.company_name || v.name) : "Partner"}`; })() : "Candidate Directory"}
        description={vendorIdFromUrl ? (() => { const v = vendorsData?.find(v => v.id === vendorIdFromUrl); return `Viewing ${unassignedOnly ? 'available ' : ''}candidates provided by ${v ? (v.company_name || v.name) : "this partner"}`; })() : "Comprehensive list of all talent in the system"}
        actions={
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
        }
      />

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4 rounded-xl border border-border/50">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${filtersOpen || hasActiveFilters
              ? "bg-primary/10 border-primary/20 text-primary"
              : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
              }`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-4 sm:p-6 rounded-xl border border-primary/10 bg-primary/5 shadow-2xl shadow-primary/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Experience Range</label>
                <div className="flex flex-wrap gap-2">
                  {experienceRanges.map((r, i) => (
                    <button
                      key={r.label}
                      onClick={() => { setExpFilter(i); setPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${expFilter === i
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Technical Skills</label>
                <div className="relative">
                  <input
                    type="text"
                    value={skillFilter}
                    onChange={(e) => { setSkillFilter(e.target.value); setPage(1); }}
                    placeholder="e.g. React, Python..."
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  {skillFilter && (
                    <button onClick={() => setSkillFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Applicants Status Filter - In middle of Technical Skills and Affiliated Company */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Applicants Status</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <UserCheck className="w-4 h-4 text-primary/70" />
                  </div>
                  <select
                    value={applicantStatusFilter.toLowerCase() === "pending" ? "applied" : applicantStatusFilter}
                    onChange={(e) => {
                      setApplicantStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className={`w-full pl-10 pr-9 py-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer ${
                      applicantStatusFilter
                        ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                        : "bg-secondary/50 border-border text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <option value="">All Applicants</option>
                    <option value="applied">Applied (Pending + Applied)</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="selected">Selected</option>
                    <option value="joined">Joined</option>
                    <option value="active">Active (In Process)</option>
                    <option value="available">Available (On Bench)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                    {applicantStatusFilter && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setApplicantStatusFilter("");
                          setPage(1);
                        }}
                        className="pointer-events-auto p-0.5 rounded-md hover:bg-primary/20 text-primary transition-colors"
                        title="Clear status filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Affiliated Company</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Building2 className="w-4 h-4 text-primary/70" />
                  </div>
                  <select
                    value={companyFilter}
                    onChange={(e) => { setCompanyFilter(e.target.value ? Number(e.target.value) : ""); setPage(1); }}
                    className={`w-full pl-10 pr-9 py-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer ${
                      companyFilter !== ""
                        ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                        : "bg-secondary/50 border-border text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <option value="">All Companies</option>
                    {companiesData?.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                    {companyFilter !== "" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompanyFilter("");
                          setPage(1);
                        }}
                        className="pointer-events-auto p-0.5 rounded-md hover:bg-primary/20 text-primary transition-colors"
                        title="Clear company filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Candidate List - Mobile Card View / Desktop Table View */}
      <div className="space-y-4">
        {/* Mobile View (Cards) */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {isLoading ? (
            <div className="py-20 text-center animate-pulse glass-card rounded-xl">
              <User className="w-8 h-8 text-primary/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Retrieving talent...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-20 text-center glass-card rounded-xl">
              <p className="text-sm text-muted-foreground italic">No candidates found.</p>
            </div>
          ) : (
            candidates.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !unassignedOnly && navigate(`/candidates/${c.id}`)}
                className={`glass-card p-4 rounded-xl border border-border/50 relative overflow-hidden group transition-all ${!unassignedOnly ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {c.name?.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{c.name || "Unknown"}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {!unassignedOnly && (
                          <StatusBadge status={appsByCandidate.has(c.id) ? "shortlisted" : "selected"} text={appsByCandidate.has(c.id) ? "In Process" : "Available"} size="sm" />
                        )}
                        {c.is_replacement && (
                          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest border border-amber-500/20 px-1.5 py-0.5 rounded">REPLACEMENT</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteCandidate(e, c.id, c.name)}
                    className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className={`grid ${unassignedOnly ? 'grid-cols-2' : 'grid-cols-3'} gap-1 pt-2.5 border-t border-border/50`}>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Experience</p>
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary" /> {c.experience_years || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Contact</p>
                    <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-primary" /> {c.email ? "Email" : "N/A"}
                    </p>
                    {c.phone && (
                      <p className="text-xs font-semibold text-primary/80 truncate flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    )}
                  </div>
                {!unassignedOnly && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Source</p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {c.source_label}
                    </p>
                  </div>
                )}
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Primary Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.skills || "").split(",").slice(0, 4).map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-secondary text-[9px] font-bold border border-border">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block glass-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-left border-collapse table-responsive-fit">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className={`py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left ${unassignedOnly ? 'w-[28%]' : 'w-[18%]'}`}>Candidate</th>
                  <th className={`py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left ${unassignedOnly ? 'w-[28%]' : 'w-[20%]'}`}>Contact Information</th>
                  <th className={`py-3.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center ${unassignedOnly ? 'w-[14%]' : 'w-[10%]'}`}>Experience</th>
                  <th className={`py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left ${unassignedOnly ? 'w-[22%]' : 'w-[17%]'}`}>Top Skills</th>
                  {!unassignedOnly && (
                    <>
                      <th className="py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left w-[12%]">Source</th>
                      <th className="py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left w-[16%]">Applied To</th>
                    </>
                  )}
                  <th className={`py-3.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right ${unassignedOnly ? 'w-[8%]' : 'w-[7%]'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={unassignedOnly ? 5 : 7} className="py-20 text-center animate-pulse">
                      <div className="flex flex-col items-center gap-3">
                        <User className="w-8 h-8 text-primary/20" />
                        <p className="text-sm text-muted-foreground font-medium">Retrieving talent data...</p>
                      </div>
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={unassignedOnly ? 5 : 7} className="py-20 text-center">
                      <p className="text-sm text-muted-foreground italic">No candidates found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  candidates.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => !unassignedOnly && navigate(`/candidates/${c.id}`)}
                      className={`${!unassignedOnly ? 'hover:bg-primary/[0.02] cursor-pointer' : 'cursor-default'} transition-colors group`}
                    >
                      <td className="py-3 px-3 align-middle">
                        <div className="min-w-0 max-w-full">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors cell-text-wrap leading-tight">{c.name || "Unknown Candidate"}</p>
                          {c.is_replacement && (
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">REPLACEMENT</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="space-y-1 min-w-0 max-w-full">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground leading-tight">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="cell-text-wrap break-all text-[11px]">{c.email || "No email"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground leading-tight">
                            <Phone className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                            <span className="cell-text-wrap break-all text-[11px]">{c.phone || "No phone number"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 align-middle text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-bold text-foreground whitespace-nowrap">
                          <Calendar className="w-3 h-3 text-primary shrink-0" /> {c.experience_years || 0} Yrs
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="flex flex-wrap gap-1 max-w-full">
                          {(c.skills || "").split(",").slice(0, 3).map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-primary/5 text-primary text-[9px] font-bold border border-primary/10 whitespace-nowrap">
                              {s.trim()}
                            </span>
                          ))}
                          {(c.skills || "").split(",").length > 3 && (
                            <span className="text-[9px] text-muted-foreground font-bold">+{((c.skills || "").split(",").length - 3)}</span>
                          )}
                          {!(c.skills || "").trim() && <span className="text-[10px] text-muted-foreground italic">None</span>}
                        </div>
                      </td>
                      {!unassignedOnly && (
                        <>
                          <td className="py-3 px-3 align-middle">
                            <span className="inline-block text-[11px] font-bold text-foreground cell-text-wrap leading-tight">{c.source_label}</span>
                          </td>
                          <td className="py-3 px-3 align-middle">
                            {appsByCandidate.has(c.id) ? (
                              <div className="min-w-0 max-w-full">
                                <div className="flex items-start gap-1.5 mb-0.5">
                                  <Building2 className="w-3.5 h-3.5 text-primary opacity-70 shrink-0 mt-0.5" />
                                  <span
                                    className="text-xs font-bold text-foreground cell-text-wrap leading-snug"
                                    style={{
                                      whiteSpace: "normal",
                                      wordBreak: "normal",
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    {roleById.get(appsByCandidate.get(c.id).job_role_id)?.company_name || "Unknown Company"}
                                  </span>
                                </div>
                                <div
                                  className="text-[11px] pl-5 cell-text-wrap leading-snug text-muted-foreground"
                                  style={{
                                    whiteSpace: "normal",
                                    wordBreak: "normal",
                                    overflowWrap: "break-word",
                                  }}
                                >
                                  {formatJobRoleTitle(roleById.get(appsByCandidate.get(c.id).job_role_id)?.title)}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-500/20 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Available
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!unassignedOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/candidates/${c.id}`);
                              }}
                              className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all inline-flex items-center justify-center shadow-xs group/btn cursor-pointer"
                              title="View"
                              aria-label="View"
                            >
                              <Eye className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteCandidate(e, c.id, c.name)}
                            className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-xs inline-flex items-center justify-center cursor-pointer"
                            title="Delete Candidate"
                            aria-label="Delete Candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-secondary/20 border border-border/50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground font-medium text-center sm:text-left">
            Showing <span className="text-foreground">{candidates.length}</span> of <span className="text-foreground">{totalFromServer}</span> candidates
          </p>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-bold text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs font-bold text-foreground tracking-widest">
              {page} <span className="text-muted-foreground font-normal">/</span> {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-bold text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Talent Pool Upload Modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Talent Pool Upload"
      >
        <div className="max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
          <UploadPage
            onSuccess={() => {
              setUploadModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ["candidates"] });
            }}
          />
        </div>
      </Modal>
    </motion.div>
  );
};

export default Candidates;