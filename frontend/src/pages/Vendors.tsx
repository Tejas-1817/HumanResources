import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Handshake,
  Plus,
  Search,
  MoreVertical,
  Shield,
  Briefcase,
  Trash2,
  ChevronRight,
  ExternalLink,
  Building,
  Building2,
  Mail,
  Phone,
  BarChart3,
  Calendar,
  Users,
  ListFilter,
  ChevronDown,
  Pencil
} from "lucide-react";
import {
  getVendors,
  createVendor,
  updateVendor,
  getJobRoles,
  assignVendorJob,
  deactivateVendor,
  getCandidates,
  deleteCandidate,
  getPipeline,
  getVendorAssignedJobs
} from "@/api/resumeiq";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const Vendors = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewParam = searchParams.get("view");

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<any>(null);
  const [isDeleteCandidateModalOpen, setIsDeleteCandidateModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    company_name: "",
    phone: "",
    password: "",
    is_active: true
  });

  // Default to 'talent' view as requested
  const [activeView, setActiveView] = useState<"partners" | "talent">(
    viewParam === "partners" ? "partners" : "talent"
  );

  useEffect(() => {
    if (viewParam === "partners") {
      setActiveView("partners");
    } else if (viewParam === "talent" || !viewParam) {
      setActiveView("talent");
    }
  }, [viewParam]);

  // Talent Hub Filters
  const [vendorFilterId, setVendorFilterId] = useState<number | "">("");
  const [isVendorFilterOpen, setIsVendorFilterOpen] = useState(false);
  const vendorFilterRef = useRef<HTMLDivElement>(null);
  const [skillFilter, setSkillFilter] = useState("");

  // Close sorting dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorFilterRef.current && !vendorFilterRef.current.contains(event.target as Node)) {
        setIsVendorFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    company_name: "",
    password: "",
    phone: ""
  });

  const [assignment, setAssignment] = useState({
    job_role_id: 0
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ["job-roles-all"],
    queryFn: () => getJobRoles()
  });

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ["candidates-hub", vendorFilterId, skillFilter || searchTerm],
    queryFn: () => getCandidates({
      vendor_id: vendorFilterId || undefined,
      search: (skillFilter || searchTerm) || undefined,
      page: 1,
      page_size: 1000,
      unassigned_only: true
    }),
    enabled: activeView === "talent"
  });

  const candidates = candidatesData?.items ?? [];

  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => getPipeline(),
    enabled: activeView === "talent"
  });

  const pipeline = pipelineData ?? {};

  const { data: vendorJobs = [], isLoading: vendorJobsLoading } = useQuery({
    queryKey: ["vendor-jobs", vendorFilterId],
    queryFn: () => getVendorAssignedJobs(Number(vendorFilterId)),
    enabled: activeView === "talent" && !!vendorFilterId
  });

  const isTalentLoading = candidatesLoading || pipelineLoading || (!!vendorFilterId && vendorJobsLoading);

  const groupedTalent = useMemo(() => {
    if (activeView !== "talent") return [];

    const allApplications = Object.values(pipeline).flat();
    const candidateToJobsMap = new Map<number, Set<number>>();
    allApplications.forEach((app: any) => {
      if (!candidateToJobsMap.has(app.candidate_id)) {
        candidateToJobsMap.set(app.candidate_id, new Set());
      }
      candidateToJobsMap.get(app.candidate_id)!.add(app.job_role_id);
    });

    const activeJobs = vendorFilterId ? vendorJobs : allJobs;

    return activeJobs
      .map((job: any) => {
        const jobCandidates = candidates.filter((c: any) => {
          const jobIds = candidateToJobsMap.get(c.id);
          return jobIds && jobIds.has(job.id);
        });

        return {
          ...job,
          candidates: jobCandidates
        };
      })
      .filter((job: any) => job.candidates.length > 0);
  }, [activeView, pipeline, allJobs, vendorJobs, vendorFilterId, candidates]);

  const [selectedJobRoleId, setSelectedJobRoleId] = useState<number | "all">("all");

  // Reset selected job role to 'all' if it's no longer present in groupedTalent
  useEffect(() => {
    if (selectedJobRoleId !== "all") {
      const exists = groupedTalent.some((job: any) => job.id === selectedJobRoleId);
      if (!exists) {
        setSelectedJobRoleId("all");
      }
    }
  }, [groupedTalent, selectedJobRoleId]);

  const appsByCandidate = useMemo(() => {
    const map = new Map<number, any>();
    const allApplications = Object.values(pipeline).flat();
    allApplications.forEach((app: any) => {
      if (!map.has(app.candidate_id)) map.set(app.candidate_id, app);
    });
    return map;
  }, [pipeline]);

  const roleById = useMemo(() => new Map((allJobs || []).map((r: any) => [r.id, r])), [allJobs]);

  const displayedCandidates = useMemo(() => {
    if (selectedJobRoleId === "all") {
      return candidates.map((c: any) => {
        const app = appsByCandidate.get(c.id);
        const job = app ? roleById.get(app.job_role_id) : null;
        return {
          ...c,
          jobTitle: job ? job.title : null,
          jobId: job ? job.id : null,
          companyName: job ? job.company_name : null
        };
      });
    } else {
      const job = groupedTalent.find((j: any) => j.id === selectedJobRoleId);
      if (!job) return [];
      return job.candidates.map((c: any) => ({
        ...c,
        jobTitle: job.title,
        jobId: job.id,
        companyName: job.company_name
      }));
    }
  }, [candidates, selectedJobRoleId, groupedTalent, appsByCandidate, roleById]);

  const createMutation = useMutation({
    mutationFn: (vendor: any) => {
      // Debug logs requested
      console.log("Auth Token:", localStorage.getItem("resumeiq_token"));
      console.log("Current User Role:", user?.role);
      console.log("Payload to be sent:", vendor);
      return createVendor(vendor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created successfully");
      setIsCreateModalOpen(false);
      setNewVendor({ name: "", email: "", company_name: "", password: "", phone: "" });
    },
    onError: (err: any) => {
      // Log full error object as requested
      console.error("Vendor creation error response:", err.response);
      
      // Surface real error in UI temporarily as requested
      toast.error(
        err.response?.data 
          ? `Error: ${JSON.stringify(err.response.data)}` 
          : "Failed to create vendor"
      );
    }
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => assignVendorJob(selectedVendor.id, { ...data, vendor_id: selectedVendor.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Job assigned to vendor");
      setIsAssignModalOpen(false);
      setAssignment({ job_role_id: 0 });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to assign job");
    }
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: (id: number) => deleteCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates-hub"] });
      toast.success("Candidate record removed from bench");
      setIsDeleteCandidateModalOpen(false);
      setCandidateToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to remove candidate");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deactivateVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deactivated/removed successfully");
      setIsDeleteModalOpen(false);
      setVendorToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete vendor");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => {
      const data = { ...payload };
      if (!data.password) {
        delete data.password;
      }
      return updateVendor(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Partner updated successfully");
      setIsEditModalOpen(false);
      setVendorToEdit(null);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || 
        (err.response?.data ? `Error: ${JSON.stringify(err.response.data)}` : "Failed to update partner")
      );
    }
  });

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="On Bench Talent Management"
        description="Collaborate with external On Bench Talent"
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group relative px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="relative flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>Add New Partner</span>
            </div>
            <div className="absolute inset-0 bg-primary/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </button>
        }
      />

      {/* Tabs - Swapped so Talent Hub is first */}
      <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-xl w-fit border border-border/50">
        <button
          onClick={() => setActiveView("talent")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeView === "talent" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="w-4 h-4" /> Talent Hub
        </button>
        <button
          onClick={() => setActiveView("partners")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeView === "partners" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Handshake className="w-4 h-4" /> Partner Management
        </button>
      </div>

      {activeView === "talent" ? (
        /* Talent Hub View (Candidates) */
        <div className="space-y-6">
          {/* Header info with Search */}
          <div className="p-4 rounded-2xl bg-secondary/10 border border-border/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {vendorFilterId ? `On Bench: ${vendors.find(v => v.id === vendorFilterId)?.name}` : "On Bench: All"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {vendorFilterId ? `Viewing available candidates provided by ${vendors.find(v => v.id === vendorFilterId)?.name}` : "Viewing available candidates across all sources"}
              </p>
            </div>

            <div className="relative w-full md:w-[480px] shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, skills, experience..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Job Roles Filter Buttons */}
          {!isTalentLoading && groupedTalent.length > 0 && (
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Filter by Job Role:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobRoleId("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                    selectedJobRoleId === "all"
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.01]"
                      : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span>All Roles</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                    selectedJobRoleId === "all"
                      ? "bg-white/20 text-white"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {candidates.length}
                  </span>
                </button>

                {groupedTalent.map((job: any) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobRoleId(job.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                      selectedJobRoleId === job.id
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.01]"
                        : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span>{job.title}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                      selectedJobRoleId === job.id
                        ? "bg-white/20 text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      {job.candidates.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sidebar and candidates list layout, aligned at top */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Inner Left Sidebar (Navigation Bar) */}
            <div className="w-full lg:w-60 shrink-0 glass-card p-4 rounded-2xl border border-border/50 space-y-4">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                Sources
              </div>
              <div className="space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
                {/* Option 1: All */}
                <button
                  type="button"
                  onClick={() => {
                    setVendorFilterId("");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    vendorFilterId === ""
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  <span>All</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                    vendorFilterId === "" ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                  }`}>
                    All
                  </span>
                </button>

                {/* Other Options: Partners */}
                {vendors.map((vendor) => {
                  const isActive = vendorFilterId === vendor.id;
                  return (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => {
                        setVendorFilterId(vendor.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                      }`}
                    >
                      <span className="truncate flex-1 pr-2">{vendor.name}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                      }`}>
                        {vendor.company_name?.charAt(0).toUpperCase() || "P"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Candidates List Column */}
            <div className="flex-1 min-w-0">
              {isTalentLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 animate-pulse bg-white/5 rounded-2xl" />
                  ))}
                </div>
              ) : displayedCandidates.length === 0 ? (
                <div className="glass-card p-20 text-center">
                  <p className="text-sm text-muted-foreground italic">No candidates found on bench.</p>
                </div>
              ) : (
                <div className="glass-card overflow-hidden border border-border/50 rounded-2xl bg-white">
                {/* Candidates List Header */}
                <div className="hidden md:block p-4 border-b border-border/50 bg-secondary/25">
                  <div className="grid grid-cols-12 gap-x-2 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="col-span-3">Candidate</div>
                    <div className="col-span-1 pl-4">Experience</div>
                    <div className="col-span-3">Skills</div>
                    <div className="col-span-2">Applied To</div>
                    <div className="col-span-2 text-center">Source</div>
                    <div className="col-span-1 text-right pr-2">Action</div>
                  </div>
                </div>

                {/* Candidates List Body */}
                <div className="divide-y divide-border/30">
                  {displayedCandidates.map((c: any) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => navigate(`/candidates/${c.id}`)}
                      className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-x-2 p-5 md:p-4 md:px-6 items-start md:items-center hover:bg-secondary/20 transition-all group cursor-pointer"
                    >
                      <div className="w-full md:col-span-3 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0 transition-transform group-hover:scale-105">
                          {c.name?.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{c.name}</p>
                          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 flex-wrap">
                            <span>{c.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:col-span-1 flex items-center pl-4">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 text-xs font-bold text-foreground border border-border/50 whitespace-nowrap">
                          {c.experience_years || 0}y
                        </div>
                      </div>

                      <div className="w-full md:col-span-3 flex flex-wrap gap-1">
                        {(c.skills || "").split(",").slice(0, 3).map((s: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-lg bg-primary/5 text-primary text-[11px] font-bold border border-primary/10 whitespace-nowrap">
                            {s.trim()}
                          </span>
                        ))}
                        {(c.skills || "").split(",").length > 3 && (
                          <span className="text-[11px] text-muted-foreground font-bold px-1">
                            +{(c.skills || "").split(",").length - 3}
                          </span>
                        )}
                      </div>

                      <div className="w-full md:col-span-2 flex items-center justify-start">
                        {c.companyName ? (
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Building2 className="w-3.5 h-3.5 text-primary opacity-60 shrink-0" />
                              <span className="text-[11px] font-bold text-foreground truncate max-w-[120px]" title={c.companyName}>
                                {c.companyName}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground pl-5 truncate max-w-[120px]" title={c.jobTitle}>
                              {c.jobTitle}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-500/20">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            Available
                          </span>
                        )}
                      </div>

                      <div className="w-full md:col-span-2 flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 border border-border text-[11px] font-bold text-muted-foreground truncate max-w-full">
                          <Building className="w-3 h-3 text-muted-foreground/70" />
                          {c.source_vendor || vendors.find(v => v.id === c.uploaded_by_vendor_id)?.name || "Partner"}
                        </span>
                      </div>

                      <div className="w-full md:col-span-1 flex justify-end pr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCandidateToDelete(c);
                            setIsDeleteCandidateModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90"
                          title="Delete Candidate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      ) : (
        /* Partner Management View (Vendors) */
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="hidden md:block p-4 border-b border-border/50 bg-secondary/20">
              <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="col-span-12 md:col-span-4">Name</div>
                <div className="md:col-span-4">Contact Information</div>
                <div className="md:col-span-2 text-center">Assignments</div>
                <div className="md:col-span-2 text-right">Action</div>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {vendorsLoading ? (
                [1, 2, 3, 4].map(i => <div key={i} className="h-20 animate-pulse bg-white/5" />)
              ) : filteredVendors.length === 0 ? (
                <div className="p-20 text-center">
                  <Handshake className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No partner vendors found.</p>
                </div>
              ) : (
                filteredVendors.map((vendor) => (
                  <motion.div
                    layout
                    key={vendor.id}
                    onClick={() => navigate(`/candidates?vendor_id=${vendor.id}&unassigned_only=true`)}
                    className="flex flex-col md:grid md:grid-cols-12 gap-4 p-5 md:p-4 md:px-8 items-start md:items-center hover:bg-primary/[0.02] transition-all group cursor-pointer"
                  >
                    <div className="w-full md:col-span-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105">
                        <Handshake className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {vendor.name}
                          </p>
                          <span className={`w-1.5 h-1.5 rounded-full ${vendor.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                        </div>
                        {vendor.company_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {vendor.company_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="w-full md:col-span-4 space-y-1 py-2 md:py-0">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                        <Mail className="w-3.5 h-3.5 opacity-50" /> {vendor.email}
                      </div>
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 opacity-50" /> {vendor.phone}
                        </div>
                      )}
                    </div>

                    <div className="w-full md:col-span-2 flex justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedVendor(vendor); setIsAssignModalOpen(true); }}
                        className="w-full md:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Briefcase className="w-3.5 h-3.5" /> Assign Job
                      </button>
                    </div>

                    <div className="w-full md:col-span-2 flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVendorToEdit(vendor);
                          setEditForm({
                            name: vendor.name || "",
                            email: vendor.email || "",
                            company_name: vendor.company_name || "",
                            phone: vendor.phone || "",
                            password: "",
                            is_active: vendor.is_active !== false
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 rounded-lg bg-secondary/85 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                        title="Edit Partner"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setVendorToDelete(vendor); setIsDeleteModalOpen(true); }}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-90"
                        title="Remove On Bench Talent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Partner Modal */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Partner: ${vendorToEdit?.name}`}>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (vendorToEdit) {
            updateMutation.mutate({ id: vendorToEdit.id, payload: editForm });
          }
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block">Contact Name</label>
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="label-text mb-2 block">Organization Name</label>
              <input
                required
                value={editForm.company_name}
                onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                placeholder="Global Talent Solutions"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="label-text mb-2 block">Email Address (Login Username)</label>
            <input
              required
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="john@globaltalent.com"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Reset Password (leave blank to keep current)</label>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Phone Number</label>
            <input
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="edit_is_active"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="w-4 h-4 accent-primary rounded bg-secondary border-border focus:ring-primary/50"
            />
            <label htmlFor="edit_is_active" className="text-sm text-foreground select-none cursor-pointer">
              Active / Enabled
            </label>
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Vendor Modal */}
      <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add New Partner">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newVendor); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block">Contact Name</label>
              <input
                required
                value={newVendor.name}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="label-text mb-2 block">Organization Name</label>
              <input
                required
                value={newVendor.company_name}
                onChange={(e) => setNewVendor({ ...newVendor, company_name: e.target.value })}
                placeholder="Global Talent Solutions"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="label-text mb-2 block">Email Address (Login Username)</label>
            <input
              required
              type="email"
              value={newVendor.email}
              onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
              placeholder="john@globaltalent.com"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Initial Password</label>
            <input
              required
              type="password"
              value={newVendor.password}
              onChange={(e) => setNewVendor({ ...newVendor, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Phone Number</label>
            <input
              value={newVendor.phone}
              onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? "Creating..." : "Create Partner"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Job Modal */}
      <Modal open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign Job to ${selectedVendor?.name}`}>
        <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(assignment); }} className="space-y-6">
          <div>
            <label className="label-text mb-2 block font-bold uppercase tracking-widest text-[10px]">Select Job Role</label>
            <select
              required
              value={assignment.job_role_id}
              onChange={(e) => setAssignment({ ...assignment, job_role_id: parseInt(e.target.value) })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="0">Choose an open position...</option>
              {allJobs.filter(j => j.status === 'open').map(job => (
                <option key={job.id} value={job.id}>{job.title} ({job.location || 'Remote'})</option>
              ))}
            </select>
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignMutation.isPending || assignment.job_role_id === 0}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Candidate Delete Confirmation Modal */}
      <Modal open={isDeleteCandidateModalOpen} onClose={() => setIsDeleteCandidateModalOpen(false)} title="Remove Candidate from Bench">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Delete candidate record?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete <strong>{candidateToDelete?.name}</strong>?
                This will permanently remove their profile and all associated data from the Talent Hub.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsDeleteCandidateModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteCandidateMutation.mutate(candidateToDelete.id)}
              disabled={deleteCandidateMutation.isPending}
              className="flex-1 py-3 bg-destructive rounded-lg text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
            >
              {deleteCandidateMutation.isPending ? "Removing..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Permanently Remove Partner">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Are you sure you want to permanently delete this record?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are about to delete <strong>{vendorToDelete?.name}</strong>.
                This action is <strong>irreversible</strong> and will remove their record and login access from the system.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate(vendorToDelete.id)}
              disabled={deleteMutation.isPending}
              className="flex-1 py-3 bg-destructive rounded-lg text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
            >
              {deleteMutation.isPending ? "Deleting..." : "Yes, Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Vendors;
