import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Briefcase, Building2, Lock, Unlock, Edit2, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createJobRole, getCompanies, getJobRoles, getVendors, updateJobRole } from "@/api/resumeiq";

const JobRoles = () => {
  const queryClient = useQueryClient();
  const { data: rolesData } = useQuery({ queryKey: ["job-roles"], queryFn: () => getJobRoles() });
  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: () => getCompanies() });
  const { data: vendorsData } = useQuery({ queryKey: ["vendors"], queryFn: () => getVendors() });
  
  const roles = rolesData ?? [];
  const companies = companiesData ?? [];
  const vendors = (vendorsData ?? []).filter(v => v.is_active);
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectTimePeriod, setProjectTimePeriod] = useState("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  
  const navigate = useNavigate();

  // Close/reopen confirmation state
  const [confirmRoleId, setConfirmRoleId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<"close" | "reopen">("close");
  const [updating, setUpdating] = useState(false);

  const filtered = filter === "All" ? roles : roles.filter((r) => r.status.toLowerCase() === filter.toLowerCase());

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setProjectTimePeriod("");
    setCompanyId(null);
    setSelectedVendorIds([]);
    setEditRoleId(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !companyId) {
      toast.error("Please fill title, description and company");
      return;
    }
    
    try {
      if (editRoleId) {
        await updateJobRole(editRoleId, {
          title: title.trim(),
          description: description.trim(),
          project_time_period: projectTimePeriod.trim() || null,
          vendor_ids: selectedVendorIds,
        });
        toast.success("Job role updated");
      } else {
        await createJobRole({
          title: title.trim(),
          description: description.trim(),
          project_time_period: projectTimePeriod.trim() || null,
          company_id: companyId,
          status: "open",
          vendor_ids: selectedVendorIds,
        });
        toast.success("Job role created and distributed");
      }
      
      await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      setModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save job role");
    }
  };

  const openEdit = (e: React.MouseEvent, role: any) => {
    e.stopPropagation();
    setEditRoleId(role.id);
    setTitle(role.title);
    setDescription(role.description);
    setProjectTimePeriod(role.project_time_period || "");
    setCompanyId(role.company_id);
    setSelectedVendorIds([]); // Reset for edit
    setModalOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const toggleVendorSelection = (vendorId: number) => {
    setSelectedVendorIds(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId) 
        : [...prev, vendorId]
    );
  };

  const handleToggleStatus = async () => {
     if (confirmRoleId === null) return;
     setUpdating(true);
     try {
       const newStatus = confirmAction === "close" ? "closed" : "open";
       await updateJobRole(confirmRoleId, { status: newStatus });
       await queryClient.invalidateQueries({ queryKey: ["job-roles"] });
       toast.success(confirmAction === "close" ? "Job role closed" : "Job role reopened");
       setConfirmRoleId(null);
     } catch {
       toast.error("Failed to update role status");
     } finally {
       setUpdating(false);
     }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Roles"
        description="Manage job openings across companies"
        actions={
          <button onClick={openCreate} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Role
          </button>
        }
      />

      <div className="flex gap-2 mb-6">
        {["All", "Open", "Closed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((r, i) => {
          const roleIsOpen = r.status.toLowerCase() === "open";
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate(`/job-roles/${r.id}`)}
              className="glass-card p-5 cursor-pointer hover:border-primary/20 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium text-sm">{r.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Building2 className="w-3 h-3" />
                      {companyById.get(r.company_id)?.name ?? `Company #${r.company_id}`}
                    </div>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
               <div className="flex items-center gap-2 ml-auto mt-4 justify-end">
                  <button
                    onClick={(e) => openEdit(e, r)}
                    className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-all border border-border/50"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmRoleId(r.id);
                      setConfirmAction(roleIsOpen ? "close" : "reopen");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      roleIsOpen
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                        : "bg-success/10 text-success hover:bg-success/20 border border-success/20"
                    }`}
                  >
                    {roleIsOpen ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {roleIsOpen ? "Close" : "Reopen"}
                  </button>
                </div>
            </motion.div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editRoleId ? "Edit Job Role" : "Create Job Role"}>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
          {/* Main Form Fields */}
          <div>
            <label className="label-text mb-2 block font-bold">Job Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Senior Frontend Engineer" />
          </div>
          
          <div>
            <label className="label-text mb-2 block font-bold">Company *</label>
            <select value={companyId ?? ""} onChange={(e) => setCompanyId(Number(e.target.value))} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* VENDOR ASSIGNMENT SECTION - MOVED UP FOR VISIBILITY */}
          <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 ring-1 ring-primary/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3 h-3" />
                On Bench Talent Authority
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {selectedVendorIds.length} Assigned
                </span>
              </div>
            </div>

            {vendors.length === 0 ? (
              <div className="p-3 rounded-lg bg-background border border-border text-[10px] text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-orange-500" />
                No active vendors found. Please create vendors to enable distribution.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                {vendors.map((v) => {
                  const isSelected = selectedVendorIds.includes(v.id);
                  return (
                    <div 
                      key={v.id} 
                      onClick={() => toggleVendorSelection(v.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20" 
                          : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-white border-white" : "border-muted-foreground/30"}`}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-primary" />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-bold truncate leading-none">{v.name}</p>
                        <p className={`text-[9px] truncate mt-1 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{v.email}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[9px] text-primary/60 italic leading-tight">
              * Assigned vendors will immediately receive authority to submit candidates for this role.
            </p>
          </div>

          <div>
            <label className="label-text mb-2 block font-bold">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]" placeholder="Required skills, responsibilities, etc." />
          </div>

          <div>
            <label className="label-text mb-2 block font-bold">Project Duration</label>
            <input value={projectTimePeriod} onChange={(e) => setProjectTimePeriod(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. 6 Months" />
          </div>

          <button onClick={handleSave} className="w-full py-4 mt-2 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 uppercase tracking-widest">
            {editRoleId ? "Save Changes" : "Create & Distribute Role"}
          </button>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={confirmRoleId !== null}
        onClose={() => setConfirmRoleId(null)}
        title={confirmAction === "close" ? "Close Job Role" : "Reopen Job Role"}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {confirmAction === "close"
              ? "Are you sure you want to close this role? This indicates that the required candidates have been achieved and no further applications will be accepted."
              : "Are you sure you want to reopen this role? This will allow new applications to be submitted again."}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setConfirmRoleId(null)}
              className="flex-1 py-3 rounded-lg bg-secondary text-foreground font-bold text-sm hover:bg-secondary/80 transition-all font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={updating}
              className={`flex-1 py-3 rounded-lg font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                confirmAction === "close"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {updating ? "Updating..." : (confirmAction === "close" ? "Yes, Close" : "Yes, Reopen")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JobRoles;
