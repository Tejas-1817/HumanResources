import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, useVendorAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import CandidateDetail from "@/pages/CandidateDetail";
import Companies from "@/pages/Companies";
import Candidates from "@/pages/Candidates";
import Vendors from "@/pages/Vendors";
import JobRoleDetail from "@/pages/JobRoleDetail";
import SelectedCandidates from "@/pages/SelectedCandidates";
import Replacements from "@/pages/Replacements";
import OpenPositions from "@/pages/OpenPositions";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import JobRoles from "@/pages/JobRoles";
import NotFound from "@/pages/NotFound";
import InternalHiring from "@/pages/InternalHiring";
import InterviewerDashboard from "@/pages/InterviewerDashboard";
import Archives from "@/pages/Archives";

import { VendorLayout } from "@/components/layout/VendorLayout";
import { InterviewerLayout } from "@/components/layout/InterviewerLayout";
import VendorDashboard from "@/pages/VendorDashboard";
import VendorJobs from "@/pages/VendorJobs";
import VendorUpload from "@/pages/VendorUpload";
import VendorCandidates from "@/pages/VendorCandidates";
import VendorBench from "@/pages/VendorBench";
import VendorCandidateDetail from "@/pages/VendorCandidateDetail";
import VendorPipeline from "@/pages/VendorPipeline";
import VendorJobDetail from "@/pages/VendorJobDetail";
import VendorSelectedCandidates from "@/pages/VendorSelectedCandidates";
import VendorSettings from "@/pages/VendorSettings";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const VendorProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isVendorAuthenticated, isVendorLoading } = useVendorAuth();
  if (isVendorLoading) return <div className="p-6 text-sm text-muted-foreground">Loading Vendor Portal...</div>;
  if (!isVendorAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const InterviewerProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isInterviewerAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading Interviewer Portal...</div>;
  if (!isInterviewerAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, isVendorAuthenticated, isInterviewerAuthenticated, isLoading } = useAuth();

  const isAnythingLoading = isLoading;

  return (
    <Routes>
      <Route
        path="/login"
        element={isAnythingLoading ? (
          <div className="p-6 text-sm text-muted-foreground flex flex-col items-center justify-center min-h-screen">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="animate-pulse">Authenticating...</p>
          </div>
        ) : isAuthenticated ? (
          <Navigate to="/" replace />
        ) : isVendorAuthenticated ? (
          <Navigate to="/vendor" replace />
        ) : isInterviewerAuthenticated ? (
          <Navigate to="/interviewer" replace />
        ) : (
          <Login />
        )}
      />

      {/* Redirect old vendor login to unified login */}
      <Route path="/vendor/login" element={<Navigate to="/login" replace />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* HR Portal Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/internal-hiring" element={<InternalHiring />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/candidates/:id" element={<CandidateDetail />} />
        <Route path="/job-roles/:id" element={<JobRoleDetail />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/selected" element={<SelectedCandidates />} />
        <Route path="/replacements" element={<Replacements />} />
        <Route path="/open-positions" element={<OpenPositions />} />
        <Route path="/candidates" element={<Candidates />} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/job-roles" element={<Navigate to="/companies" replace />} />
        <Route path="/pipeline" element={<Navigate to="/companies" replace />} />
      </Route>

      {/* Vendor Portal Routes */}
      <Route
        path="/vendor"
        element={
          <VendorProtectedRoute>
            <VendorLayout />
          </VendorProtectedRoute>
        }
      >
        <Route index element={<VendorDashboard />} />
        <Route path="jobs" element={<VendorJobs />} />
        <Route path="jobs/:id" element={<VendorJobDetail />} />
        <Route path="upload" element={<VendorUpload />} />
        <Route path="bench" element={<VendorBench />} />
        <Route path="candidates" element={<VendorCandidates />} />
        <Route path="candidates/:id" element={<VendorCandidateDetail />} />
        <Route path="pipeline" element={<VendorPipeline />} />
        <Route path="selected" element={<VendorSelectedCandidates />} />
        <Route path="settings" element={<VendorSettings />} />
      </Route>

      {/* Interviewer Portal Route */}
      <Route
        path="/interviewer"
        element={
          <InterviewerProtectedRoute>
            <InterviewerLayout />
          </InterviewerProtectedRoute>
        }
      >
        <Route index element={<InterviewerDashboard />} />
        <Route path="candidates/:id" element={<CandidateDetail />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
