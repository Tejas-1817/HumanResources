import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("resumeiq_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor to handle 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized: clear token and redirect to login
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("resumeiq_token");
        window.location.href = `${import.meta.env.BASE_URL}login`;
      }
    }
    return Promise.reject(error);
  }
);

export interface PipelineStage {
  id: string;
  title: string;
  color?: string;
  bgGlow?: string;
}

export interface Candidate {
  id: number;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience_years?: number;
  skills?: string;
  original_filename?: string;
  resume_url?: string;
  source: string;
  is_replacement?: boolean;
  created_at: string;
  raw_text?: string;
  source_label?: string;
  uploaded_by_vendor_id?: number;
  source_vendor?: string;
}

export interface JobRole {
  id: number;
  company_id: number;
  company_name: string;
  title: string;
  description: string;
  status: string;
  deadline: string | null;
  pipeline_stages: PipelineStage[] | null;
  estimated_budget: number | null;
  currency: string;
  positions_required: number;
  department?: string | null;
  location: string | null;
  work_mode: string | null;
  experience_required: string | number | null;
  project_time_period: string | null;
  created_by: number | null;
  created_at: string;
}

interface CandidateListResponse {
  items: Candidate[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Application {
  id: number;
  candidate_id: number;
  job_role_id: number;
  status: string;
  resume_sent: boolean;
  created_at: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  experience_years?: number;
  skills?: string;
  is_replacement?: boolean;
  status_date?: string;
  interview_date?: string;
  remarks?: string | null;
  source_label?: string;
  source?: string;
  consultancy_name?: string;
}

interface PipelineResponse {
  [stage: string]: Application[];
}

export interface Company {
  id: number;
  name: string;
  location?: string | null;
  note?: string | null;
  created_at: string;
  description?: string;
}

export interface JobRoleDetail extends JobRole {
  company_name: string;
}

export interface Vendor {
  id: number;
  name: string;
  email: string;
  company_name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface VendorStats {
  jobs_assigned: number;
  resumes_submitted: number;
  candidates_in_pipeline: number;
  candidates_selected: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    company_id?: number;
  };
  vendor?: {
    id: number;
    name: string;
    email: string;
    company_name: string;
    role: string;
  };
  interviewer?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
  };
}

export interface VendorAuthResponse {
  access_token: string;
  token_type: string;
  role: string;
  vendor?: {
    id: number;
    name: string;
    email: string;
    company_name: string;
    role: string;
  };
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    company_id?: number;
  };
  interviewer?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
  };
}

export interface LoginPayload {
  email: string;
  password: "";
}

export interface CompanyCreatePayload {
  name: string;
  location?: string | null;
  note?: string | null;
}

export const registerApi = async (payload: any): Promise<any> => {
  const { data } = await client.post("/auth/register", payload);
  return data;
};

export const loginApi = async (email: string, password: string): Promise<AuthResponse> => {
  const { data } = await client.post<AuthResponse>("/auth/login", { email, password });
  return data;
};

export const getMe = async (): Promise<any> => {
  const { data } = await client.get("/auth/me");
  return data;
};

export const updateMe = async (payload: { name?: string; email?: string; password?: string }): Promise<any> => {
  const { data } = await client.patch("/auth/me", payload);
  return data;
};

export const forgotPassword = async (email: string): Promise<{ message: string; reset_link?: string; email_sent?: boolean }> => {
  const { data } = await client.post<{ message: string; reset_link?: string; email_sent?: boolean }>("/auth/forgot-password", { email });
  return data;
};

export const resetPassword = async (payload: { token: string; new_password: string }): Promise<{ message: string }> => {
  const { data } = await client.post("/auth/reset-password", payload);
  return data;
};

export const getCandidates = async (params?: {
  search?: string;
  page?: number;
  size?: number;
  page_size?: number;
  source?: string;
  company_id?: number;
  job_role_id?: number;
  min_experience?: number;
  max_experience?: number;
  vendor_id?: number;
  unassigned_only?: boolean;
  interviewer_id?: number;
}): Promise<CandidateListResponse> => {
  const { data } = await client.get<CandidateListResponse>("/candidates", { params });
  return data;
};

export const createCandidate = async (payload: Partial<Candidate>): Promise<Candidate> => {
  const { data } = await client.post<Candidate>("/candidates", payload);
  return data;
};

export const getCandidateById = async (id: number): Promise<Candidate> => {
  const { data } = await client.get<Candidate>(`/candidates/${id}`);
  return data;
};

export const updateCandidate = async (id: number, payload: Partial<Candidate>): Promise<Candidate> => {
  const { data } = await client.patch<Candidate>(`/candidates/${id}`, payload);
  return data;
};

export const deleteCandidate = async (id: number): Promise<void> => {
  await client.delete(`/candidates/${id}`);
};

export const getJobRoles = async (companyId?: number): Promise<JobRole[]> => {
  const { data } = await client.get<JobRole[]>("/job-roles", {
    params: { company_id: companyId },
  });
  return data;
};

export const getJobRoleById = async (id: number): Promise<JobRoleDetail> => {
  const { data } = await client.get<JobRoleDetail>(`/job-roles/${id}`);
  return data;
};

export const createJobRole = async (payload: {
  company_id: number;
  title: string;
  description: string;
  status?: string;
  deadline?: string | null;
  pipeline_stages?: PipelineStage[];
  estimated_budget?: number | null;
  currency?: string;
  positions_required?: number;
  department?: string | null;
  location?: string | null;
  work_mode?: string | null;
  experience_required?: string | number | null;
  project_time_period?: string | null;
  vendor_ids?: number[];
}): Promise<JobRole> => {
  const { data } = await client.post<JobRole>("/job-roles", payload);
  return data;
};

export const updateJobRole = async (
  id: number,
  payload: {
    company_id?: number;
    title?: string;
    description?: string;
    status?: string;
    deadline?: string | null;
    pipeline_stages?: PipelineStage[];
    estimated_budget?: number | null;
    currency?: string;
    positions_required?: number;
    department?: string | null;
    location?: string | null;
    work_mode?: string | null;
    experience_required?: string | number | null;
    project_time_period?: string | null;
    vendor_ids?: number[];
  }
): Promise<JobRoleDetail> => {
  const { data } = await client.patch<JobRoleDetail>(`/job-roles/${id}`, payload);
  return data;
};

export const extractJdText = async (file: File): Promise<{ filename: string; text: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await client.post<{ filename: string; text: string }>("/job-roles/extract-jd", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const deleteJobRole = async (id: number): Promise<void> => {
  await client.delete(`/job-roles/${id}`);
};

export const getCompanies = async (params?: { search?: string }): Promise<Company[]> => {
  const { data } = await client.get<Company[]>("/companies", { params });
  return data;
};

export const createCompany = async (payload: CompanyCreatePayload): Promise<Company> => {
  const { data } = await client.post<Company>("/companies", payload);
  return data;
};

export const updateCompany = async (id: number, payload: Partial<CompanyCreatePayload>): Promise<Company> => {
  const { data } = await client.patch<Company>(`/companies/${id}`, payload);
  return data;
};

export const deleteCompany = async (id: number): Promise<void> => {
  await client.delete(`/companies/${id}`);
};

export const deleteApplication = async (id: number): Promise<void> => {
  await client.delete(`/applications/${id}`);
};

export const bulkDeleteApplications = async (ids: number[]): Promise<void> => {
  await client.post("/applications/bulk-delete", { application_ids: ids });
};


export const getPipeline = async (roleId?: number, companyId?: number): Promise<PipelineResponse> => {
  const { data } = await client.get<PipelineResponse>("/pipeline", {
    params: { job_role_id: roleId, company_id: companyId },
  });
  return data;
};

export const updatePipelineStatus = async (
  applicationId: number,
  status: string,
  note: string | null = null,
  statusDate: string | null = null,
  interviewDate: string | null = null,
  offerDate: string | null = null,
  remarks: string | null = null,
  isReplacement: boolean | null = null
): Promise<Application> => {
  const { data } = await client.put<Application>(`/pipeline/${applicationId}`, {
    status,
    note,
    status_date: statusDate,
    interview_date: interviewDate,
    offer_date: offerDate,
    remarks,
    is_replacement: isReplacement,
  });
  return data;
};

export const getApplicationsByCandidate = async (candidateId: number): Promise<Application[]> => {
  const { data } = await client.get<Application[]>(`/candidates/${candidateId}/applications`);
  return data;
};

export const markPipelineSent = async (applicationId: number): Promise<Application> => {
  const { data } = await client.put<Application>(`/pipeline/${applicationId}/mark-sent`);
  return data;
};

export const getCandidatesByCompany = async (companyId: number): Promise<Candidate[]> => {
  const data = await getCandidates({ company_id: companyId, page_size: 1000 });
  return data.items;
};

export const getDashboardStats = async (): Promise<any> => {
  const { data } = await client.get("/dashboard/stats");
  return data;
};

export const uploadResume = async (payload: {
  file: File;
  jobRoleTitle?: string;
  jobRoleId?: number;
  candidateId?: number;
  companyId?: number;
  source?: string;
  consultancyName?: string;
  vendorName?: string;
}): Promise<{ candidate_id: number; resume_url: string }> => {
  const formData = new FormData();
  formData.append("file", payload.file);
  if (payload.jobRoleTitle) formData.append("job_role_title", payload.jobRoleTitle);
  if (payload.jobRoleId) formData.append("job_role_id", payload.jobRoleId.toString());
  if (payload.candidateId) formData.append("candidate_id", payload.candidateId.toString());
  if (payload.companyId) formData.append("company_id", payload.companyId.toString());
  if (payload.source) formData.append("source", payload.source);
  if (payload.consultancyName) formData.append("consultancy_name", payload.consultancyName);
  if (payload.vendorName) formData.append("vendor_name", payload.vendorName);

  const { data } = await client.post("/upload/resume", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

// Vendor Portal APIs
export const vendorLoginApi = async (email: string, password: string): Promise<VendorAuthResponse> => {
  const { data } = await client.post<VendorAuthResponse>("/vendor/login", { email, password });
  return data;
};

export const getVendorMe = async (): Promise<any> => {
  const { data } = await client.get("/vendor/me");
  return data;
};

export const updateVendorMe = async (payload: { name?: string; email?: string; company_name?: string; phone?: string; password?: string }): Promise<any> => {
  const { data } = await client.patch("/vendor/me", payload);
  return data;
};

export const getVendorJobs = async (): Promise<JobRole[]> => {
  const { data } = await client.get<JobRole[]>("/vendor/jobs");
  return data;
};

export const getVendorJobById = async (id: number): Promise<JobRole> => {
  const { data } = await client.get<JobRole>(`/vendor/jobs/${id}`);
  return data;
};

export const getVendorCandidates = async (): Promise<Candidate[]> => {
  const { data } = await client.get<Candidate[]>("/vendor/candidates");
  return data;
};

export const getVendorCandidateById = async (id: number): Promise<Candidate> => {
  const { data } = await client.get<Candidate>(`/vendor/candidates/${id}`);
  return data;
};

export const getVendorPipeline = async (): Promise<PipelineResponse> => {
  const { data } = await client.get<PipelineResponse>("/vendor/pipeline");
  return data;
};

export const getVendorDashboardStats = async (): Promise<VendorStats> => {
  const { data } = await client.get<VendorStats>("/vendor/dashboard/stats");
  return data;
};

export const vendorUploadResume = async (payload: {
  file: File;
  jobRoleId: number;
}): Promise<any> => {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("job_role_id", payload.jobRoleId.toString());

  const { data } = await client.post("/vendor/candidates/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const vendorUploadOnBench = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await client.post("/vendor/candidates/upload-on-bench", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const vendorDeleteCandidate = async (id: number): Promise<void> => {
  await client.delete(`/vendor/candidates/${id}`);
};

export const vendorChangePassword = async (payload: any): Promise<any> => {
  const { data } = await client.post("/vendor/change-password", payload);
  return data;
};

// HR specific Vendor management APIs
export const getVendors = async (): Promise<Vendor[]> => {
  const { data } = await client.get<Vendor[]>("/hr/vendors");
  return data;
};

export const createVendor = async (payload: any): Promise<Vendor> => {
  const { data } = await client.post<Vendor>("/hr/vendors", payload);
  return data;
};

export const updateVendor = async (id: number, payload: any): Promise<Vendor> => {
  const { data } = await client.patch<Vendor>(`/hr/vendors/${id}`, payload);
  return data;
};

export const deactivateVendor = async (id: number): Promise<void> => {
  await client.delete(`/hr/vendors/${id}`);
};

export const assignVendorJob = async (vendorId: number, payload: any): Promise<any> => {
  const { data } = await client.post(`/hr/vendors/${vendorId}/assign-job`, payload);
  return data;
};

export const unassignJobFromVendorApi = async (vendorId: number, jobRoleId: number): Promise<void> => {
  await client.delete(`/hr/vendors/${vendorId}/assign-job/${jobRoleId}`);
};

export const getVendorAssignedJobs = async (vendorId: number): Promise<JobRole[]> => {
  const { data } = await client.get<JobRole[]>(`/hr/vendors/${vendorId}/jobs`);
  return data;
};

export const assignVendorsToRoles = async (payload: {
  vendor_ids: number[];
  role_ids: number[];
}): Promise<any> => {
  const { data } = await client.post("/vendor-assignments", payload);
  return data;
};

export interface Interviewer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at: string;
}

export const getInterviewers = async (search?: string): Promise<Interviewer[]> => {
  const { data } = await client.get<Interviewer[]>("/interviewers", {
    params: { search },
  });
  return data;
};

export const createInterviewer = async (payload: {
  name: string;
  email: string;
  phone?: string | null;
}): Promise<Interviewer> => {
  const { data } = await client.post<Interviewer>("/interviewers", payload);
  return data;
};

export const updateInterviewer = async (
  id: number,
  payload: {
    name?: string;
    email?: string;
    phone?: string | null;
  }
): Promise<Interviewer> => {
  const { data } = await client.patch<Interviewer>(`/interviewers/${id}`, payload);
  return data;
};

export const deleteInterviewer = async (id: number): Promise<void> => {
  await client.delete(`/interviewers/${id}`);
};

export interface InterviewSchedule {
  id: number;
  job_role_id: number;
  candidate_id?: number | null;
  interviewer_id: number;
  date: string;
  time: string;
  venue: string;
  created_at: string;
  candidate_name?: string | null;
  job_role_title?: string | null;
  interviewer_name?: string | null;
}

export const getInterviewSchedules = async (): Promise<InterviewSchedule[]> => {
  const { data } = await client.get<InterviewSchedule[]>("/interview-schedules");
  return data;
};

export const createInterviewSchedule = async (payload: {
  job_role_id: number;
  candidate_id?: number | null;
  interviewer_id: number;
  date: string;
  time: string;
  venue: string;
}): Promise<InterviewSchedule> => {
  const { data } = await client.post<InterviewSchedule>("/interview-schedules", payload);
  return data;
};

export const getInterviewerMe = async (): Promise<any> => {
  const { data } = await client.get("/interviewer/me");
  return data;
};

export const updateInterviewerMe = async (payload: { name?: string; email?: string; phone?: string; password?: string }): Promise<any> => {
  const { data } = await client.patch("/interviewer/me", payload);
  return data;
};

export const getInterviewerInterviews = async (): Promise<InterviewSchedule[]> => {
  const { data } = await client.get<InterviewSchedule[]>("/interviewer/interviews");
  return data;
};

export const assignCandidatesToSchedule = async (
  scheduleId: number,
  candidateIds: number[]
): Promise<InterviewSchedule[]> => {
  const { data } = await client.put<InterviewSchedule[]>(
    `/interview-schedules/${scheduleId}/assign`,
    { candidate_ids: candidateIds }
  );
  return data;
};

export const updateInterviewSchedule = async (
  scheduleId: number,
  payload: {
    interviewer_id?: number;
    date?: string;
    time?: string;
    venue?: string;
  }
): Promise<InterviewSchedule> => {
  const { data } = await client.patch<InterviewSchedule>(
    `/interview-schedules/${scheduleId}`,
    payload
  );
  return data;
};

export const interviewerChangePassword = async (payload: any): Promise<any> => {
  const { data } = await client.post("/interviewer/change-password", payload);
  return data;
};

export const adminResetInterviewerPassword = async (
  interviewerId: number,
  payload: { password: string }
): Promise<any> => {
  const { data } = await client.post(`/interviewers/${interviewerId}/reset-password`, payload);
  return data;
};

export interface Notification {
  id: number;
  recipient_role: string;
  recipient_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const getNotifications = async (): Promise<Notification[]> => {
  const { data } = await client.get<Notification[]>("/notifications");
  return data;
};

export const markNotificationRead = async (id: number): Promise<Notification> => {
  const { data } = await client.put<Notification>(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async (): Promise<{ success: boolean; message: string }> => {
  const { data } = await client.put<{ success: boolean; message: string }>("/notifications/read-all");
  return data;
};







