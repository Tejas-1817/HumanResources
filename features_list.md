# ResumeIQ - Detailed Feature List (User Point of View)

This document lists all user-facing features currently implemented in the application across the different user portals. Use this list to check off completed items and identify missing features.

---

## 🔑 1. Common & Authentication Features
*Ref: [App.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/App.tsx), [Login.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/Login.tsx)*

- [ ] **Unified Login Portal:** A single login page that authenticates all user types (HR/Admin, Partner Vendor, and Interviewer) and automatically routes them to their corresponding dashboard.
- [ ] **Forgot Password Flow:**
  - [ ] Request a reset link sent to the user's email address ([ForgotPassword.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/ForgotPassword.tsx)).
- [ ] **Reset Password Flow:**
  - [ ] Set a new password securely using a tokenized link received via email ([ResetPassword.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/ResetPassword.tsx)).

---

## 💼 2. Recruiter / HR Admin Portal
*The workspace for managing client requirements, candidates, external vendors, and internal hiring operations.*

### A. Recruitment Dashboard
*Ref: [Dashboard.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/Dashboard.tsx)*

- [ ] **Primary Metrics Strip:** High-level cards displaying:
  - [ ] *Total Candidates* (clicking navigates to the Candidate Directory).
  - [ ] *Open Positions* (clicking navigates to the open positions page).
  - [ ] *Selected Hires* (clicking navigates to successful hires page).
  - [ ] *Staffing Replacements* (clicking navigates to replacements page).
- [ ] **Recruitment Funnel Progress:** Interactive progress tracking showing candidate conversion stages (Applied $\rightarrow$ Shortlisted $\rightarrow$ Interview $\rightarrow$ Selected).
- [ ] **Recruitment Funnel Area Chart:** Interactive visual display of historical conversion efficiency.
- [ ] **Global Candidate Search:** Search for candidates instantly by name via a dropdown search bar in the header.
- [ ] **Open Positions Feed:** A quick-access feed showing recently created vacancies grouped by client.
- [ ] **Pipeline Stage Distribution:** Interactive inner-ring donut/pie chart representing the share of candidates in each stage.
- [ ] **Talent DNA (Skill Cloud):**
  - [ ] Highlights the most common skills found across resumes.
  - [ ] Clicking a skill card opens a modal showing matches for that technical area.

### B. Candidate Directory
*Ref: [Candidates.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/Candidates.tsx), [CandidateDetail.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/CandidateDetail.tsx)*

- [ ] **Recruiter Directory:** List of all candidates with experience level, contact info, primary skills, and source channels.
- [ ] **Advanced Filtering & Search:**
  - [ ] Search by candidate name, email, or phone.
  - [ ] Filter by experience years ranges (e.g., 0-2 yrs, 2-5 yrs, etc.).
  - [ ] Filter by technical skills or affiliated company.
- [ ] **Detailed Candidate Profile:**
  - [ ] Experience summary parsed from the uploaded resume.
  - [ ] Sourcing metadata (e.g., LinkedIn, Indeed, Referral, Partner Vendor).
  - [ ] **Resume Document Previewer:** View the original PDF resume file directly in the browser.
  - [ ] **Plain Text Fallback:** View plain text extracted from the resume if a visual preview cannot load.
  - [ ] Download raw resume file.
  - [ ] Edit candidate profile info (name, email, phone, experience, skills).
  - [ ] Delete candidate profile (removes all associated job applications).
- [ ] **Resume Upload Action:** Import new resumes directly into the general talent pool database.

### C. Client & Company Hubs
*Ref: [Companies.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/Companies.tsx), [JobRoleDetail.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/JobRoleDetail.tsx)*

- [ ] **Company Directory:** Lists all partner companies along with vacancy stats (Total/Active roles) and total applicants.
- [ ] **Add/Edit Companies:** Recruiter can create or update client companies.
- [ ] **Detailed Company Workspace:** Clicking a client opens a page with three views:
  - [ ] **Job Roles:**
    - [ ] Create job roles with details (title, description, location, work mode, experience required, positions required, budget, currency, deadline, duration).
    - [ ] Edit role specifications, close active vacancies, reopen roles, or delete roles.
  - [ ] **Candidate Directory:** Search and view applicants submitted for this company's vacancies.
  - [ ] **Kanban Recruitment Board:**
    - [ ] Drag-and-drop candidates between recruitment columns/stages.
    - [ ] Reorder pipeline columns using drag-and-drop.
    - [ ] Add custom pipeline stages (e.g., "Technical Assessment Round 2") and delete stages.
    - [ ] **Stage Transition Scheduler:** Prompts for date, time, and custom remarks when moving candidates.
    - [ ] Edit candidate status notes/remarks directly.

### D. Internal Hiring Module
*Ref: [InternalHiring.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/InternalHiring.tsx)*

- [ ] **Organized Workspace:** Customized view specifically preloaded for internal job openings (e.g., *"Altzor Digital Solutions"*).
- [ ] **Internal Job Roles & Pipeline:** Core vacancy management, candidates list, and Kanban boards tailored for company internal slots.
- [ ] **Interviewer Directory:**
  - [ ] Search, add, update, or remove internal company interviewers.
  - [ ] Reset interviewer account password.
- [ ] **Interview Scheduling Console:**
  - [ ] View scheduled sessions showing positions, dates, times, venues, and assigned candidate counts.
  - [ ] Schedule new interviews (matching a role, interviewer, date, time, and venue).
  - [ ] Assign/remove candidates to/from scheduled sessions.

### E. Vendor Sourcing Management
*Ref: [Vendors.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/Vendors.tsx)*

- [ ] **Partner Directory:** Manage external vendors.
- [ ] **Add/Deactivate Vendors:** Add new partner accounts (with names, company name, login credentials) or deactivate existing partners.
- [ ] **Assign Jobs:** Assign open job roles to partner vendors so they can view the descriptions and submit resumes.
- [ ] **Bench Talent Hub:**
  - [ ] Displays all "On Bench" (unassigned and available) candidates uploaded by vendors.
  - [ ] Search bench candidates by name, email, skills, or source vendor.
  - [ ] Delete/remove candidates from the bench talent pool.

### F. Recruitment Ingestion & Reporting
- [ ] **Bulk Resume Upload Portal:** [Upload.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/Upload.tsx) lets recruiters drag-and-drop or select multiple resumes.
  - [ ] Select source (LinkedIn, Indeed, referral, consultancy, etc.).
  - [ ] Select target client company and job role (defaults to general Talent Pool if left blank).
  - [ ] View upload processing report indicating success/fail rate.
- [ ] **Hired/Selected Directory:** [SelectedCandidates.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/SelectedCandidates.tsx) displays all candidates successfully hired, with filters and details on client budget cost.
- [ ] **Replacements Directory:** [Replacements.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/Replacements.tsx) tracks replacement hires and parses remarks to show whom they replaced.
- [ ] **Client Openings Hub:** [OpenPositions.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/OpenPositions.tsx) lists companies with open vacancies, displaying work mode details and pipeline applicant counts.

---

## 🏪 3. Partner Vendor Portal
*Presented to third-party vendor companies sourcing bench talent.*

### A. Vendor Dashboard
*Ref: [VendorDashboard.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/VendorDashboard.tsx)*
- [ ] **Performance Stat Metrics:** View Assigned Jobs, Total Submissions, Hired/Selected Candidates, and Candidates in Pipeline.
- [ ] **Guidelines Feed:** Displays submission instructions and quality standards set by HR.
- [ ] **Quick Links:** Fast access to upload resumes and view assigned jobs.

### B. Assigned Job Roles
*Ref: [VendorJobs.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/VendorJobs.tsx), [VendorJobDetail.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/VendorJobDetail.tsx)*
- [ ] **Assigned Openings Directory:** View vacancies assigned to the vendor, along with details on vacancies, required experience, and resumes sent.
- [ ] **Submission Tracking:** View candidates submitted for a specific role and check their progression status.
- [ ] **Pipeline Visibility Kanban:** Read-only view showing where their candidates are positioned in the recruitment stages.

### C. Bench Talent Upload & Directories
*Ref: [VendorBench.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/VendorBench.tsx), [VendorCandidates.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/VendorCandidates.tsx), [VendorCandidateDetail.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/VendorCandidateDetail.tsx)*
- [ ] **Submit to Open Roles:** [VendorUpload.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/VendorUpload.tsx) lets vendors select a role and upload resumes in bulk. Displays a success/fail ingestion report.
- [ ] **General Bench Upload:** Upload resumes to their available talent pool without tying them to an active job opening immediately.
- [ ] **Candidate Directory:** Search and view candidate list.
- [ ] **Profile Detail & Resume Preview:** Access ca
ndidate details (experience, skills) and preview the uploaded PDF resume.
- [ ] **Delete Profiles:** Remove candidate records from their bench list.

### D. Settings
*Ref: [VendorSettings.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/VendorSettings.tsx)*
- [ ] **Security Settings:** Change account password.

---

## 👩‍🏫 4. Interviewer Portal
*Presented to team members evaluating candidates.*

### A. Interviewer Dashboard
*Ref: [InterviewerDashboard.tsx](file:///c:/Users/admin/Desktop/HumanResources_New/HumanResources/HumanResources/frontend/src/pages/InterviewerDashboard.tsx)*
- [ ] **Session Metrics:** Summary cards showing Total Scheduled, Today's Interviews, Online Sessions, and In-Office Sessions.
- [ ] **Scheduled Interviews:** Tab displaying positions, dates, times, venues, and candidate details for assigned sessions. Clicking opens session info.
- [ ] **Pipeline Progress:** Tab showing all active candidates in progress for the company.
  - [ ] Clicking a candidate's name navigates to their profile to review skills and experience.
  - [ ] **Feedback Notes:** Input and save evaluation feedback or remarks directly on the candidate pipeline card.
  - [ ] **Update Candidate Stage:** Transition candidates to different stages (e.g., Shortlisted, Interviewed, Selected) and schedule dates/times for the next evaluation round.
