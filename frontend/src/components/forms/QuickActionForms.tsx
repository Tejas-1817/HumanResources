import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sun, Moon, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createCandidate,
  createInterviewSchedule,
  createJobRole,
  createCompany,
  getCandidates,
  getJobRoles,
  getInterviewers,
  getCompanies,
  updateMe,
  updateVendorMe,
  updateInterviewerMe,
} from "@/api/resumeiq";

// ─── Add Candidate Form ──────────────────────────────────────────
export const AddCandidateForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience_years: "",
    skills: "",
    source: "Direct",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and Email are required");
      return;
    }
    setLoading(true);
    try {
      await createCandidate({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined,
        skills: form.skills.trim() || undefined,
        source: form.source,
      });
      toast.success("Candidate added successfully");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="label-text mb-2 block font-medium">Name *</label>
        <input
          required
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. John Doe"
        />
      </div>
      <div>
        <label className="label-text mb-2 block font-medium">Email *</label>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. john@example.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text mb-2 block font-medium">Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="e.g. +123456789"
          />
        </div>
        <div>
          <label className="label-text mb-2 block font-medium">Experience (Years)</label>
          <input
            type="number"
            min="0"
            value={form.experience_years}
            onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="e.g. 5"
          />
        </div>
      </div>
      <div>
        <label className="label-text mb-2 block font-medium">Skills (comma separated)</label>
        <input
          type="text"
          value={form.skills}
          onChange={(e) => setForm({ ...form, skills: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. React, Node.js, Python"
        />
      </div>
      <div>
        <label className="label-text mb-2 block font-medium">Source</label>
        <select
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="LinkedIn">LinkedIn</option>
          <option value="Indeed">Indeed</option>
          <option value="Referral">Referral</option>
          <option value="Direct">Direct</option>
          <option value="Internshala">Internshala</option>
          <option value="Consultancy">Consultancy</option>
          <option value="Vendor">Vendor</option>
        </select>
      </div>
      <button
        disabled={loading}
        type="submit"
        className="w-full py-3 mt-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Add Candidate
      </button>
    </form>
  );
};

// ─── Schedule Interview Form ─────────────────────────────────────
export const ScheduleInterviewForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    job_role_id: "",
    candidate_id: "",
    interviewer_id: "",
    date: "",
    time: "",
    venue: "Online",
  });
  const [loading, setLoading] = useState(false);

  const { data: candidatesData, isLoading: loadingCandidates } = useQuery({
    queryKey: ["all-candidates-select"],
    queryFn: () => getCandidates({ page_size: 1000 }),
  });
  const candidates = candidatesData?.items ?? [];

  const { data: jobRolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ["all-job-roles-select"],
    queryFn: () => getJobRoles(),
  });
  const jobRoles = jobRolesData ?? [];

  const { data: interviewersData, isLoading: loadingInterviewers } = useQuery({
    queryKey: ["all-interviewers-select"],
    queryFn: () => getInterviewers(),
  });
  const interviewers = interviewersData ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.job_role_id || !form.candidate_id || !form.interviewer_id || !form.date || !form.time || !form.venue) {
      toast.error("All fields are required");
      return;
    }
    setLoading(true);
    try {
      await createInterviewSchedule({
        job_role_id: Number(form.job_role_id),
        candidate_id: Number(form.candidate_id),
        interviewer_id: Number(form.interviewer_id),
        date: form.date,
        time: form.time,
        venue: form.venue,
      });
      toast.success("Interview scheduled successfully");
      queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to schedule interview");
    } finally {
      setLoading(false);
    }
  };

  const isLoadingData = loadingCandidates || loadingRoles || loadingInterviewers;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="label-text mb-2 block font-medium">Job Position *</label>
        <select
          required
          value={form.job_role_id}
          onChange={(e) => setForm({ ...form, job_role_id: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={isLoadingData}
        >
          <option value="" disabled>{loadingRoles ? "Loading job positions..." : "Select Job Position"}</option>
          {jobRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.title} ({role.company_name})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-text mb-2 block font-medium">Candidate *</label>
        <select
          required
          value={form.candidate_id}
          onChange={(e) => setForm({ ...form, candidate_id: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={isLoadingData}
        >
          <option value="" disabled>{loadingCandidates ? "Loading candidates..." : "Select Candidate"}</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-text mb-2 block font-medium">Interviewer *</label>
        <select
          required
          value={form.interviewer_id}
          onChange={(e) => setForm({ ...form, interviewer_id: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={isLoadingData}
        >
          <option value="" disabled>{loadingInterviewers ? "Loading interviewers..." : "Select Interviewer"}</option>
          {interviewers.map((intv) => (
            <option key={intv.id} value={intv.id}>
              {intv.name} ({intv.email})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text mb-2 block font-medium">Date *</label>
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="label-text mb-2 block font-medium">Time *</label>
          <input
            required
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div>
        <label className="label-text mb-2 block font-medium">Venue *</label>
        <select
          required
          value={form.venue}
          onChange={(e) => setForm({ ...form, venue: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="Online">Online</option>
          <option value="Office">Office</option>
        </select>
      </div>

      <button
        disabled={loading || isLoadingData}
        type="submit"
        className="w-full py-3 mt-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Schedule Interview
      </button>
    </form>
  );
};

// ─── Create Job Post Form ────────────────────────────────────────
export const CreateJobPostForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    company_id: "",
    title: "",
    description: "",
    positions_required: "1",
    location: "",
    work_mode: "hybrid",
    experience_required: "",
    deadline: "",
  });
  const [loading, setLoading] = useState(false);

  const { data: companiesData, isLoading: loadingCompanies } = useQuery({
    queryKey: ["all-companies-select"],
    queryFn: () => getCompanies(),
  });
  const companies = companiesData ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_id || !form.title.trim() || !form.description.trim()) {
      toast.error("Company, Title, and Description are required");
      return;
    }
    setLoading(true);
    try {
      await createJobRole({
        company_id: Number(form.company_id),
        title: form.title.trim(),
        description: form.description.trim(),
        positions_required: Number(form.positions_required),
        location: form.location.trim() || undefined,
        work_mode: form.work_mode,
        experience_required: form.experience_required ? Number(form.experience_required) : undefined,
        deadline: form.deadline || undefined,
      });
      toast.success("Job position created successfully");
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create job position");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="label-text mb-2 block font-medium">Company *</label>
        <select
          required
          value={form.company_id}
          onChange={(e) => setForm({ ...form, company_id: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={loadingCompanies}
        >
          <option value="" disabled>{loadingCompanies ? "Loading companies..." : "Select Company"}</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-text mb-2 block font-medium">Job Title *</label>
        <input
          required
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. Senior Backend Engineer"
        />
      </div>

      <div>
        <label className="label-text mb-2 block font-medium">Description *</label>
        <textarea
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none"
          placeholder="Detailed job description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text mb-2 block font-medium">Positions Required</label>
          <input
            type="number"
            min="1"
            value={form.positions_required}
            onChange={(e) => setForm({ ...form, positions_required: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="label-text mb-2 block font-medium">Experience Req. (Years)</label>
          <input
            type="number"
            min="0"
            value={form.experience_required}
            onChange={(e) => setForm({ ...form, experience_required: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="e.g. 3"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text mb-2 block font-medium">Work Mode</label>
          <select
            value={form.work_mode}
            onChange={(e) => setForm({ ...form, work_mode: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <div>
          <label className="label-text mb-2 block font-medium">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="e.g. Bangalore"
          />
        </div>
      </div>

      <div>
        <label className="label-text mb-2 block font-medium">Deadline</label>
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <button
        disabled={loading}
        type="submit"
        className="w-full py-3 mt-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Create Job Position
      </button>
    </form>
  );
};

// ─── Add Company Form ─────────────────────────────────────────────
export const AddCompanyForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Company Name is required");
      return;
    }
    setLoading(true);
    try {
      await createCompany({
        name: name.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Company added successfully");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="label-text mb-2 block font-medium">Company Name *</label>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. Acme Corporation"
        />
      </div>
      <div>
        <label className="label-text mb-2 block font-medium">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. Bangalore, India"
        />
      </div>
      <div>
        <label className="label-text mb-2 block font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none"
          placeholder="Brief details about the company..."
        />
      </div>
      <button
        disabled={loading}
        type="submit"
        className="w-full py-3 mt-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Add Company
      </button>
    </form>
  );
};

// ─── Settings Form ────────────────────────────────────────────────
export const SettingsForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { user, vendor, interviewer, checkAuth } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || vendor?.name || interviewer?.name || "",
    email: user?.email || vendor?.email || interviewer?.email || "",
    companyName: vendor?.company_name || "",
    phone: vendor?.phone || interviewer?.phone || "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState(() => {
    let saved = localStorage.getItem("theme") || "slate-light";
    if (saved === "light") saved = "slate-light";
    if (saved === "dark") saved = "slate-dark";
    return saved;
  });

  const baseTheme = activeTheme.split("-")[0] || "slate";
  const themeMode = activeTheme.split("-")[1] || "light";

  const handleThemeChange = (base: string, mode: string) => {
    const themeName = `${base}-${mode}`;
    setActiveTheme(themeName);
    
    const root = document.documentElement;
    const themeClasses = [
      "theme-slate-light", "theme-slate-dark",
      "theme-ocean-light", "theme-ocean-dark",
      "theme-amethyst-light", "theme-amethyst-dark",
      "theme-forest-light", "theme-forest-dark",
      "theme-sunset-light", "theme-sunset-dark"
    ];
    themeClasses.forEach(c => root.classList.remove(c));
    
    const isDark = mode === "dark";
    root.classList.toggle("dark", isDark);
    root.classList.add(`theme-${themeName}`);
    
    localStorage.setItem("theme", themeName);
    
    const friendlyBaseName = base.charAt(0).toUpperCase() + base.slice(1);
    const friendlyModeName = mode.charAt(0).toUpperCase() + mode.slice(1);
    toast.success(`${friendlyBaseName} (${friendlyModeName}) applied`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and Email are required");
      return;
    }
    setLoading(true);
    try {
      if (vendor) {
        await updateVendorMe({
          name: form.name.trim(),
          email: form.email.trim(),
          company_name: form.companyName.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password.trim() || undefined,
        });
      } else if (interviewer) {
        await updateInterviewerMe({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password.trim() || undefined,
        });
      } else {
        await updateMe({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim() || undefined,
        });
      }
      await checkAuth();
      toast.success("Settings updated successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Failed to update profile settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-3">
            {vendor ? "Vendor Details" : interviewer ? "Interviewer Details" : "Admin Details"}
          </h4>
        </div>
        <div>
          <label className="label-text mb-2 block font-medium">Name *</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
            placeholder="Name"
          />
        </div>
        <div>
          <label className="label-text mb-2 block font-medium">Email Address *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
            placeholder="Email"
          />
        </div>

        {vendor && (
          <div>
            <label className="label-text mb-2 block font-medium">Company Name *</label>
            <input
              required
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
              placeholder="Company Name"
            />
          </div>
        )}

        {(vendor || interviewer) && (
          <div>
            <label className="label-text mb-2 block font-medium">Phone Number</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Phone number"
            />
          </div>
        )}

        <div>
          <label className="label-text mb-2 block font-medium">Change Password (optional)</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Enter new password to change"
          />
        </div>
        <button
          disabled={loading}
          type="submit"
          className="w-full py-3 mt-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Save Changes
        </button>
      </form>

      <div className="border-t border-border/60 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Theme Settings</h4>
          
          {/* Light / Dark Mode Toggle */}
          <div className="flex items-center bg-secondary/80 rounded-lg p-1 border border-border/50 shrink-0">
            <button
              type="button"
              onClick={() => handleThemeChange(baseTheme, "light")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                themeMode === "light"
                  ? "bg-background text-primary shadow-sm border border-border/10 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange(baseTheme, "dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                themeMode === "dark"
                  ? "bg-background text-primary shadow-sm border border-border/10 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
          </div>
        </div>

        {/* Theme Accent Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "slate", name: "Slate Default", desc: "Classic corporate design", color: "bg-[#6366f1]", bgLight: "bg-slate-50 border border-slate-200 text-slate-800", bgDark: "bg-[#0b0f19] border border-slate-800 text-slate-200" },
            { id: "ocean", name: "Ocean Deep", desc: "Teal accented theme", color: "bg-[#14b8a6]", bgLight: "bg-cyan-50/50 border border-cyan-100 text-cyan-800", bgDark: "bg-[#050f14] border border-[#0c242c] text-teal-100" },
            { id: "amethyst", name: "Royal Amethyst", desc: "Violet purple accents", color: "bg-[#a855f7]", bgLight: "bg-purple-50/50 border border-purple-100 text-purple-800", bgDark: "bg-[#0a0410] border border-[#210c30] text-purple-100" },
            { id: "forest", name: "Forest Moss", desc: "Serene green details", color: "bg-[#10b981]", bgLight: "bg-emerald-50/50 border border-emerald-100 text-emerald-800", bgDark: "bg-[#051008] border border-[#0d2a17] text-emerald-100" },
            { id: "sunset", name: "Sunset Glow", desc: "Warm amber & terracotta", color: "bg-[#f97316]", bgLight: "bg-orange-50/50 border border-orange-100 text-orange-800", bgDark: "bg-[#100805] border border-[#2c130c] text-amber-100" }
          ].map((t) => {
            const isSelected = baseTheme === t.id;
            const previewBg = themeMode === "light" ? t.bgLight : t.bgDark;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeChange(t.id, themeMode)}
                className={`group text-left p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between h-[110px] relative overflow-hidden shadow-sm hover:shadow-md ${
                  isSelected
                    ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 scale-[1.02]"
                    : "border-border/60 bg-secondary/20 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${t.color} shadow-sm`} />
                    <span className="text-xs font-black tracking-tight">{t.name}</span>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                
                {/* Mini palette preview */}
                <div className={`mt-2 w-full h-8 rounded-lg ${previewBg} p-1.5 flex items-center gap-1.5 overflow-hidden relative`}>
                  <div className="w-3.5 h-3.5 rounded-full bg-primary/20 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="w-8 h-1 bg-current opacity-30 rounded-full" />
                    <div className="w-12 h-1 bg-current opacity-20 rounded-full" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
