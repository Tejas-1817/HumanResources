import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { Modal } from "@/components/ui/Modal";
import UploadPage from "@/pages/Upload";
import { AddCandidateForm, ScheduleInterviewForm, CreateJobPostForm, AddCompanyForm, SettingsForm } from "@/components/forms/QuickActionForms";

export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // Close sidebar and scroll to top on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar
          onMobileClose={() => setIsSidebarOpen(false)}
          onQuickAction={(actionId) => setActiveModal(actionId)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(prev => !prev)} />
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-4 md:p-6 w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* ─── Quick Action Modals ───────────────────────────────── */}
      <Modal open={activeModal === "add-candidate"} onClose={() => setActiveModal(null)} title="Add Candidate">
        <AddCandidateForm onSuccess={() => setActiveModal(null)} />
      </Modal>

      <Modal open={activeModal === "schedule-interview"} onClose={() => setActiveModal(null)} title="Schedule Interview">
        <ScheduleInterviewForm onSuccess={() => setActiveModal(null)} />
      </Modal>

      <Modal open={activeModal === "upload-cv"} onClose={() => setActiveModal(null)} title="Upload CV / Resume">
        <div className="max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
          <UploadPage onSuccess={() => setActiveModal(null)} />
        </div>
      </Modal>

      <Modal open={activeModal === "create-job-post"} onClose={() => setActiveModal(null)} title="Create Job Position">
        <CreateJobPostForm onSuccess={() => setActiveModal(null)} />
      </Modal>

      <Modal open={activeModal === "add-company"} onClose={() => setActiveModal(null)} title="Add Company">
        <AddCompanyForm onSuccess={() => setActiveModal(null)} />
      </Modal>

      <Modal open={activeModal === "settings"} onClose={() => setActiveModal(null)} title="Settings">
        <SettingsForm onSuccess={() => setActiveModal(null)} />
      </Modal>
    </div>
  );
};
