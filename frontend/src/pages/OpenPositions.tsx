import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Edit,
  Trash2,
  X,
  UserCheck,
  DollarSign,
  FileText
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddOpenPositionModal } from "@/components/modals/AddOpenPositionModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCompanies,
  getJobRoles,
  getPipeline,
  deleteJobRole,
} from "@/api/resumeiq";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const OpenPositions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<any | null>(null);

  // Read initial tab from URL query param (e.g. ?tab=active)
  const initialTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "active" || tab === "closed" || tab === "on_hold" || tab === "recent") return tab;
    return "all";
  }, []);

  // Delete Job Role mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteJobRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      toast.success("Position deleted successfully");
      setActiveDropdown(null);
      if (selectedPosition?.id === activeDropdown) {
        setSelectedPosition(null);
      }
    },
    onError: () => {
      toast.error("Failed to delete position");
    }
  });

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this position? All associated applications will be lost.")) {
      deleteMutation.mutate(id);
    }
  };

  // Data queries
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies()
  });
  const { data: jobRoles = [] } = useQuery({ 
    queryKey: ["job-roles"], 
    queryFn: () => getJobRoles() 
  });
  const { data: pipeline = {} as any } = useQuery({ 
    queryKey: ["pipeline"], 
    queryFn: () => getPipeline() 
  });

  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "active" | "on_hold" | "closed" | "recent">(initialTab as any);
  const [selectedCompany, setSelectedCompany] = useState("Company");
  const [selectedStatus, setSelectedStatus] = useState("Status");

  // Summary Metrics
  const statsSummary = useMemo(() => {
    const totalPartners = companies.length;
    const totalPositions = jobRoles.reduce((sum, r) => sum + (r.positions_required || 1), 0);
    const activePositions = jobRoles.reduce((sum, r) => {
      if (r.status.toLowerCase() !== "open") return sum;
      const filledCount = Object.values(pipeline).flat().filter((app: any) => app.job_role_id === r.id && (app.status === "selected" || app.status === "joined")).length;
      const remaining = Math.max(0, (r.positions_required || 1) - filledCount);
      return sum + remaining;
    }, 0);
    
    const uniqueCands = new Set<number>();
    Object.values(pipeline).flat().forEach((app: any) => {
      uniqueCands.add(app.candidate_id);
    });
    const totalCandidates = uniqueCands.size;
    
    const successfulHires = Object.values(pipeline).flat().filter((app: any) => app.status === "selected").length;
    
    return {
      totalPartners,
      totalPositions,
      activePositions,
      totalCandidates,
      successfulHires
    };
  }, [companies, jobRoles, pipeline]);

  // Client name filter list
  const companyNames = useMemo(() => {
    return companies.map(c => c.name);
  }, [companies]);

  // Status option mapping
  const statuses = ["Open", "Closed"];

  // Enrich and filter Job Roles
  const filteredPositions = useMemo(() => {
    let list = jobRoles.map((role) => {
      const client = companies.find(c => c.id === role.company_id);
      
      // Parse Requisition Metadata from serialized description if present
      let projectName = "N/A";
      let projectStartDate = "N/A";
      let projectDuration = "N/A";
      let raisedBy = "N/A";
      let budget = "N/A";
      let responsibilities = role.description || "";

      if (role.description && role.description.includes("=== REQUISITION METADATA ===")) {
        const parts = role.description.split("=============================\n\n");
        responsibilities = parts[1] || role.description;
        const metaSection = parts[0] || "";
        
        const projMatch = metaSection.match(/Project:\s*(.*)/);
        const startMatch = metaSection.match(/Project Start Date:\s*(.*)/);
        const durationMatch = metaSection.match(/Project Duration:\s*(.*)/);
        const raisedMatch = metaSection.match(/Request Raised By:\s*(.*)/);
        const budgetMatch = metaSection.match(/Budget Range:\s*(.*)/);

        if (projMatch) projectName = projMatch[1].trim();
        if (startMatch) projectStartDate = startMatch[1].trim();
        if (durationMatch) projectDuration = durationMatch[1].trim();
        if (raisedMatch) raisedBy = raisedMatch[1].trim();
        if (budgetMatch) budget = budgetMatch[1].trim();
      }

      // Count candidate applications for this specific position
      const totalCandidates = Object.values(pipeline).flat().filter((app: any) => app.job_role_id === role.id).length;
      const hiredCandidates = Object.values(pipeline).flat().filter((app: any) => app.job_role_id === role.id && (app.status === "selected" || app.status === "joined")).length;
      const positionsReq = role.positions_required || 1;
      const isFilled = hiredCandidates >= positionsReq && positionsReq > 0;
      const computedStatus = isFilled ? "closed" : (role.status || "open").toLowerCase();

      return {
        ...role,
        status: computedStatus,
        clientName: client ? client.name : "Unknown Client",
        projectName,
        projectStartDate,
        projectDuration,
        raisedBy,
        budget,
        responsibilities,
        totalCandidates,
        hiredCandidates
      };
    });

    // Apply Tab Filters
    if (activeTabFilter === "active") {
      list = list.filter(r => r.status === "open");
    } else if (activeTabFilter === "on_hold") {
      list = list.filter(r => r.status === "on-hold" || r.status === "on_hold");
    } else if (activeTabFilter === "closed") {
      list = list.filter(r => r.status === "closed");
    } else if (activeTabFilter === "recent") {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Apply Client Dropdown Filter
    if (selectedCompany !== "Company") {
      list = list.filter(r => r.clientName === selectedCompany);
    }

    // Apply Status Dropdown Filter
    if (selectedStatus !== "Status") {
      const targetStatus = selectedStatus.toLowerCase();
      list = list.filter(r => r.status.toLowerCase() === targetStatus);
    }

    // Apply Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.clientName.toLowerCase().includes(query) ||
        r.projectName.toLowerCase().includes(query)
      );
    }

    return list;
  }, [jobRoles, companies, pipeline, activeTabFilter, selectedCompany, selectedStatus, searchQuery]);

  // Pagination Configuration
  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredPositions.length / ITEMS_PER_PAGE);
  const paginatedPositions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPositions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPositions, currentPage]);

  const renderStatusBadge = (status: string) => {
    if (status.toLowerCase() === "open") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          Open
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
        Closed
      </span>
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Open Positions"
          description="Track and manage position requisitions and candidate hiring funnels"
          actions={
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search positions or clients..."
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
                Add Position
              </button>
            </div>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.totalPositions ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Total Positions</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.activePositions ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Active Positions</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.totalPartners ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Partner Clients</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.totalCandidates ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Total Candidates</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-500/20" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground leading-none">{statsSummary.successfulHires ?? 0}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">Hired Candidates</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border/40 pb-px text-sm">
        {[
          { id: "all", label: "All Positions", icon: Briefcase },
          { id: "active", label: "Open Only", icon: Check },
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

      {/* Secondary filter selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select 
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-card border border-border text-muted-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 font-semibold cursor-pointer"
          >
            <option value="Company">Client</option>
            {companyNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-card border border-border text-muted-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 font-semibold cursor-pointer"
          >
            <option value="Status">Status</option>
            {statuses.map(stat => (
              <option key={stat} value={stat}>{stat}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => {
            setSelectedCompany("Company");
            setSelectedStatus("Status");
            setSearchQuery("");
            setActiveTabFilter("all");
          }}
          className="px-4 py-2.5 rounded-xl bg-card border border-border text-muted-foreground text-xs font-semibold hover:bg-secondary/40 hover:text-foreground transition-all flex items-center gap-2 self-start"
        >
          <Filter className="w-3.5 h-3.5" />
          Clear Filters
        </button>
      </div>

      {/* Main Table view */}
      {filteredPositions.length === 0 ? (
        <div className="p-20 text-center glass-card">
          <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center text-muted-foreground/30 mx-auto mb-6">
            <Briefcase className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No positions found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or filter tags to locate specific open roles.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-secondary/20">
            <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest items-center">
              <div className="col-span-3">Position Name</div>
              <div className="col-span-2">Client</div>
              <div className="col-span-2">Project</div>
              <div className="col-span-2 text-center">Openings</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {paginatedPositions.map((pos) => (
              <motion.div
                key={pos.id}
                variants={item}
                onClick={() => setSelectedPosition(pos)}
                className="grid grid-cols-12 gap-4 p-4 px-8 items-center hover:bg-primary/[0.02] transition-colors group cursor-pointer"
              >
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {pos.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{pos.location || "On-site"}</p>
                  </div>
                </div>

                <div className="col-span-2 text-xs font-semibold text-foreground truncate">{pos.clientName}</div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">{pos.projectName || "N/A"}</div>
                <div className="col-span-2 text-center text-sm font-bold text-foreground">{pos.positions_required}</div>
                <div className="col-span-2 text-center">{renderStatusBadge(pos.status)}</div>

                <div className="col-span-1 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === pos.id ? null : pos.id);
                      }}
                      className="p-1.5 rounded-lg border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {activeDropdown === pos.id && (
                      <div className="absolute right-0 mt-2 w-32 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-10 py-1">
                        <button
                          onClick={(e) => handleDelete(pos.id, e)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/40 text-destructive flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border/50 bg-secondary/10 rounded-b-xl">
            <p className="text-xs text-muted-foreground font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPositions.length)} of {filteredPositions.length} positions
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-muted-foreground disabled:opacity-40" 
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-card border border-border hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side Details Drawer */}
      <AnimatePresence>
        {selectedPosition && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPosition(null)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-black text-foreground uppercase tracking-wider">Position Specifications</h2>
                </div>
                <button
                  onClick={() => setSelectedPosition(null)}
                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-border"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Specification Details List */}
              <div className="space-y-6 flex-1">
                <div>
                  <h3 className="text-xl font-black text-foreground tracking-tight">{selectedPosition.title}</h3>
                  <p className="text-xs font-bold text-primary mt-1 flex items-center gap-1 uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5" /> {selectedPosition.clientName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-2xl border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Project</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{selectedPosition.projectName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hiring Status</p>
                    <div className="mt-1">{renderStatusBadge(selectedPosition.status)}</div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Openings</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{selectedPosition.positions_required}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location / Mode</p>
                    <p className="text-xs font-bold text-foreground mt-0.5 capitalize">{selectedPosition.location || "N/A"} ({selectedPosition.work_mode || "On-site"})</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Skills Required</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{selectedPosition.skills || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Experience Required</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{selectedPosition.experience_required ? `${selectedPosition.experience_required} Years` : "Fresher / No bar"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Budget Details</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{selectedPosition.budget}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Project Timeline</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">Starts on {selectedPosition.projectStartDate} (Duration: {selectedPosition.projectDuration})</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Request Raised By</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{selectedPosition.raisedBy}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Responsibilities & Job Scope
                  </p>
                  <div className="bg-secondary/15 p-4 rounded-xl border border-border/40 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedPosition.responsibilities}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AddOpenPositionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
};

export default OpenPositions;
