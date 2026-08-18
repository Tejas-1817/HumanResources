import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/Modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanies, createJobRole, createCompany, JobRole } from "@/api/resumeiq";
import { toast } from "sonner";
import {
  BriefcaseBusiness,
  Loader2,
  Building2,
  Calendar as CalendarIcon,
  Plus,
  UploadCloud,
  FileText,
  Clock,
  DollarSign,
  UserCheck,
  CheckCircle,
  ChevronDown
} from "lucide-react";

// Validation schema with optional fields
const formSchema = z.object({
  company_id: z.string().optional(),
  project_name: z.string().optional(),
  title: z.string().optional(),
  skills: z.string().optional(),
  experience_required: z.string().optional(),
  work_mode: z.string().optional(),
  location: z.string().optional(),
  positions_required: z.string().optional(),
  project_start_date: z.string().optional(),
  project_duration_val: z.string().optional(),
  project_duration_unit: z.string().optional(),
  request_raised_by: z.string().optional(),
  budget: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddOpenPositionModalProps {
  open: boolean;
  onClose: () => void;
  onPositionCreated?: (position: JobRole) => void;
}

// Mock Database of Internal Employees
const EMPLOYEES = [
  { id: "emp-1", name: "Sarah Connor", designation: "HR Director" },
  { id: "emp-2", name: "John Doe", designation: "Senior Talent Acquisition" },
  { id: "emp-3", name: "Kalyani Sen", designation: "Recruitment Lead" },
  { id: "emp-4", name: "Amit Sharma", designation: "Project Manager" },
  { id: "emp-5", name: "Jane Smith", designation: "Resource Manager" }
];

export const AddOpenPositionModal = ({ open, onClose, onPositionCreated }: AddOpenPositionModalProps) => {
  const queryClient = useQueryClient();
  
  // Clients query
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies(),
  });

  // Client search & inline addition
  const [clientSearch, setClientSearch] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientLocation, setNewClientLocation] = useState("");

  // Employee search state
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      work_mode: "on-site",
      positions_required: "1",
      project_duration_unit: "Months",
      description: "",
      skills: "",
      location: "",
      status: "open",
    },
  });

  const selectedClientId = watch("company_id");
  const descriptionText = watch("description");

  // Form Section tracking: 2 Pages ("page-1" and "page-2")
  const [activePage, setActivePage] = useState<1 | 2>(1);

  // PDF drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Client add mutation
  const addClientMutation = useMutation({
    mutationFn: (payload: { name: string; location: string }) => createCompany(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setValue("company_id", data.id.toString());
      setClientSearch(data.name);
      setIsAddingNewClient(false);
      setNewClientName("");
      setNewClientLocation("");
      toast.success("Client added successfully");
    },
    onError: (error: any) => {
      const data = error?.response?.data;
      const errorMsg = data?.detail || data?.message || "Failed to add new client";
      toast.error(errorMsg);
    }
  });

  // Create Job Role mutation
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const budgetVal = values.budget || "N/A";
      const raisedByEmp = EMPLOYEES.find(e => e.id === values.request_raised_by);
      const raisedByName = raisedByEmp ? `${raisedByEmp.name} (${raisedByEmp.designation})` : (values.request_raised_by || "N/A");
      const durationFormatted = values.project_duration_val
        ? `${values.project_duration_val} ${values.project_duration_unit || "Months"}`
        : "6 Months";
      const projectName = values.project_name || "N/A";
      const title = (values.title || "").trim() || "New Position";
      const targetCompanyId = values.company_id ? parseInt(values.company_id) : (companies[0]?.id || 1);

      // Serialize details into description
      const richDetails = `
=== REQUISITION METADATA ===
Project: ${projectName}
Project Start Date: ${values.project_start_date || "N/A"}
Project Duration: ${durationFormatted}
Request Raised By: ${raisedByName}
Budget Range: ${budgetVal}
=============================

${values.description || ""}`;

      return createJobRole({
        company_id: targetCompanyId,
        title: title,
        description: richDetails.trim(),
        status: values.status || "open",
        positions_required: values.positions_required ? parseInt(values.positions_required) || 1 : 1,
        location: values.location ? values.location.trim() : null,
        work_mode: values.work_mode || "on-site",
        experience_required: values.experience_required ? parseFloat(values.experience_required) || null : null,
        project_time_period: durationFormatted !== "N/A" ? durationFormatted : null,
      });
    },
    onSuccess: (data: JobRole) => {
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Position created successfully");
      reset();
      setUploadedFileName(null);
      setClientSearch("");
      setEmployeeSearch("");
      setActivePage(1);
      onClose();
      if (onPositionCreated) {
        onPositionCreated(data);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to create position");
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  // PDF Text Extraction mockup
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setIsExtracting(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        const text = e.target?.result as string;
        const cleanText = text
          ? text.slice(0, 1000)
          : `• Drive development of user-facing components\n• Collaborate with product managers & engineers\n• Write clean, testable, and robust front-end code.`;
        setValue("description", cleanText);
        setIsExtracting(false);
        toast.success("Text extracted successfully!");
      }, 1000);
    };

    if (file.type === "text/plain") {
      reader.readAsText(file);
    } else {
      setTimeout(() => {
        setValue(
          "description",
          `• Deliver premium, production-ready React codebase & user interface layouts\n• Participate in system architecture design meetings\n• Ensure high performance on mobile and desktop web platforms.`
        );
        setIsExtracting(false);
        toast.success("Text extracted from PDF successfully");
      }, 1200);
    }
  };

  // Safe client list filtration
  const filteredClientsList = companies.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Safe employee list filtration
  const filteredEmployeesList = EMPLOYEES.filter(e =>
    e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.designation.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  return (
    <Modal open={open} onClose={onClose} title="Position Requisition Form">
      <div className="max-h-[82vh] overflow-y-auto custom-scrollbar p-1">
        {/* Simple Page Steps Indicator */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            type="button"
            onClick={() => setActivePage(1)}
            className={`flex items-center gap-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activePage === 1 ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span>
            Position & Requirements
          </button>
          <div className="h-px bg-border w-12 mb-2" />
          <button
            type="button"
            onClick={() => setActivePage(2)}
            className={`flex items-center gap-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activePage === 2 ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">2</span>
            Timeline & Responsibilities
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* PAGE 1: POSITION DETAILS & REQUIREMENTS */}
          {activePage === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Row 1: Position Name & Openings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Position Name</label>
                  <input
                    {...register("title")}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                  />
                  {errors.title && <p className="text-[10px] text-destructive font-bold">{errors.title.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Openings</label>
                  <input
                    type="number"
                    min="1"
                    {...register("positions_required")}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                  />
                  {errors.positions_required && <p className="text-[10px] text-destructive font-bold">{errors.positions_required.message}</p>}
                </div>
              </div>

              {/* Row 2: Client & Project Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative" ref={clientDropdownRef}>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Client / Company Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search or select client..."
                      value={clientSearch}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setIsClientDropdownOpen(true);
                      }}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                    />
                    <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {isClientDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto p-1.5">
                      {filteredClientsList.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setValue("company_id", c.id.toString());
                            setClientSearch(c.name);
                            setIsClientDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-secondary rounded-lg font-semibold flex items-center justify-between"
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">{c.location}</span>
                        </button>
                      ))}

                      {filteredClientsList.length === 0 && !isAddingNewClient && (
                        <div className="p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-2">No client found matching "{clientSearch}"</p>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewClient(true);
                              setNewClientName(clientSearch);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add "{clientSearch}" as new Client
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isAddingNewClient && (
                    <div className="mt-2 p-3 bg-secondary/30 rounded-xl border border-border/80 space-y-2">
                      <p className="text-[10px] font-bold text-primary uppercase">Create New Client</p>
                      <input
                        type="text"
                        placeholder="Client Name"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Client Location"
                        value={newClientLocation}
                        onChange={(e) => setNewClientLocation(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewClient(false)}
                          className="px-3 py-1 bg-transparent hover:bg-secondary rounded text-xs text-muted-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!newClientName}
                          onClick={() => addClientMutation.mutate({ name: newClientName, location: newClientLocation || "On-site" })}
                          className="px-3 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-primary-hover disabled:opacity-50"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  )}
                  {errors.company_id && <p className="text-[10px] text-destructive font-bold">{errors.company_id.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Cloud Migration"
                    {...register("project_name")}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                  />
                  {errors.project_name && <p className="text-[10px] text-destructive font-bold">{errors.project_name.message}</p>}
                </div>
              </div>

              {/* Row 3: Skills Required */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Skills Required</label>
                <input
                  {...register("skills")}
                  placeholder="e.g. React, Node.js, AWS Cloud, PostgreSQL"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                />
                {errors.skills && <p className="text-[10px] text-destructive font-bold">{errors.skills.message}</p>}
              </div>

              {/* Row 4: Experience, Mode, Location & Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    {...register("experience_required")}
                    placeholder="e.g. 5"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                  />
                  {errors.experience_required && <p className="text-[10px] text-destructive font-bold">{errors.experience_required.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Employment Type</label>
                  <select
                    {...register("work_mode")}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-semibold"
                  >
                    <option value="on-site">On-site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</label>
                  <input
                    {...register("location")}
                    placeholder="e.g. Bengaluru, Karnataka"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                  />
                  {errors.location && <p className="text-[10px] text-destructive font-bold">{errors.location.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                  <select
                    {...register("status")}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-semibold"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="loss">Loss</option>
                  </select>
                </div>
              </div>

              {/* Page 1 Action Row */}
              <div className="flex justify-end pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setActivePage(2)}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  Next Page &rarr;
                </button>
              </div>
            </div>
          )}

          {/* PAGE 2: TIMELINE, BUDGET & RESPONSIBILITIES */}
          {activePage === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Row 1: Project Start Date & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" /> Project Start Date
                  </label>
                  <input
                    type="date"
                    {...register("project_start_date")}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                  />
                  {errors.project_start_date && <p className="text-[10px] text-destructive font-bold">{errors.project_start_date.message}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Duration</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 6"
                      {...register("project_duration_val")}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                    />
                  </div>
                  <div className="col-span-1">
                    <select
                      {...register("project_duration_unit")}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-semibold"
                    >
                      <option value="Weeks">Weeks</option>
                      <option value="Months">Months</option>
                      <option value="Years">Years</option>
                    </select>
                  </div>
                </div>
              </div>
              {errors.project_duration_val && <p className="text-[10px] text-destructive font-bold">{errors.project_duration_val.message}</p>}

              {/* Row 2: Request Raised By & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative" ref={employeeDropdownRef}>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" /> Request Raised By
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search employee or enter custom..."
                      value={employeeSearch}
                      onFocus={() => setIsEmployeeDropdownOpen(true)}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setIsEmployeeDropdownOpen(true);
                      }}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none font-medium"
                    />
                    <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {isEmployeeDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto p-1">
                      {filteredEmployeesList.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            setValue("request_raised_by", e.id);
                            setEmployeeSearch(`${e.name} (${e.designation})`);
                            setIsEmployeeDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-secondary rounded-lg font-semibold flex justify-between items-center"
                        >
                          <span>{e.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{e.designation}</span>
                        </button>
                      ))}
                      {filteredEmployeesList.length === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setValue("request_raised_by", employeeSearch);
                            setIsEmployeeDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-primary font-bold hover:bg-secondary"
                        >
                          Use "{employeeSearch}" as custom designation
                        </button>
                      )}
                    </div>
                  )}
                  {errors.request_raised_by && <p className="text-[10px] text-destructive font-bold">{errors.request_raised_by.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Budget Range
                  </label>
                  <input
                    {...register("budget")}
                    placeholder="e.g. ₹5,00,000 or ₹12 LPA"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                  />
                  {errors.budget && <p className="text-[10px] text-destructive font-bold">{errors.budget.message}</p>}
                </div>
              </div>

              {/* Row 3: Drag & Drop File Extraction */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) handleFileUpload(files[0]);
                }}
                className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <input
                  type="file"
                  id="requisition-file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) handleFileUpload(files[0]);
                  }}
                />
                <label htmlFor="requisition-file" className="cursor-pointer space-y-1.5 block">
                  <div className="w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                    {isExtracting ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <UploadCloud className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {isExtracting ? "Extracting JDs..." : "Optional: Upload JD Document"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Drag PDF or Text file here to auto-populate responsibilities</p>
                  </div>
                  {uploadedFileName && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" /> Loaded: {uploadedFileName}
                    </div>
                  )}
                </label>
              </div>

              {/* Row 4: Responsibilities Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                  <span>Responsibilities</span>
                  <span className="font-normal opacity-70">Review/Edit details</span>
                </label>
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="flex flex-wrap gap-1 p-2 bg-secondary/20 border-b border-border text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setValue("description", descriptionText + " **Bold**")}
                      className="px-2 py-0.5 hover:bg-secondary rounded font-bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("description", descriptionText + " *Italics*")}
                      className="px-2 py-0.5 hover:bg-secondary rounded italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("description", descriptionText + "\n• ")}
                      className="px-2 py-0.5 hover:bg-secondary rounded"
                    >
                      Bullet list
                    </button>
                  </div>
                  <textarea
                    {...register("description")}
                    className="w-full px-4 py-3 text-xs focus:outline-none min-h-[120px] resize-y bg-transparent font-medium"
                    placeholder="Provide requisition responsibilities and project scope details here..."
                  />
                </div>
                {errors.description && <p className="text-[10px] text-destructive font-bold">{errors.description.message}</p>}
              </div>

              {/* Page 2 Action Row */}
              <div className="flex justify-between items-center pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setActivePage(1)}
                  className="px-5 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-secondary transition-all"
                >
                  &larr; Back Page
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-secondary text-muted-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <BriefcaseBusiness className="w-3.5 h-3.5" />
                        Create Position
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </form>
      </div>
    </Modal>
  );
};
