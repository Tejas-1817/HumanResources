# ResumeIQ - AI-Powered Recruitment Management System

ResumeIQ is a modern, full-stack recruitment platform designed to streamline the hiring process. It features a robust candidate tracking system, real-time pipeline management, and powerful analytics for recruitment operations.

## 🚀 Features

- **Recruitment Command Center**: A comprehensive dashboard providing real-time intelligence on pipeline health, talent DNA (skills), and hiring performance.
- **Dynamic Kanban Pipeline**: Manage candidates through customizable hiring stages (Pending, Shortlisted, Interview, etc.) with drag-and-drop functionality.
- **Partner Hub**: Dedicated space to manage multiple client companies and their specific job roles.
- **Smart Candidate Management**: Advanced search and filtering by experience, skills, and status across the entire talent pool.
- **Successful Placements tracking**: Monitor ROI and placement efficiency with detailed views on hired candidate costs and durations.
- **Resume Parsing & Storage**: Automated candidate profile creation from resume uploads.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: [SQLite](https://www.sqlite.org/) with SQLAlchemy ORM
- **Authentication**: JWT-based secure authentication
- **File Handling**: Local storage for resume uploads

## 📂 Project Structure

```text
resumeiq/
├── backend/            # FastAPI Project
│   ├── app/           # Application logic (models, schemas, routers)
│   ├── uploads/       # Storage for candidate resumes
│   └── requirements.txt
├── frontend/           # Vite + React Project
│   ├── src/
│   │   ├── api/       # API integration layer
│   │   ├── components/# Reusable UI components
│   │   └── pages/      # Page-level components (Dashboard, Pipeline, etc.)
│   └── package.json
└── README.md
```

## 🏁 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
  python -m venv venv  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and set your API URL:
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 License

This project is licensed under the MIT License.
