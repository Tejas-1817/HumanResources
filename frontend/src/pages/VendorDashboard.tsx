import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getVendorDashboardStats } from "@/api/resumeiq";
import { useVendorAuth } from "@/context/AuthContext";
import { StatCard } from "@/components/ui/StatCard";

const VendorDashboard = () => {
  const { vendor } = useVendorAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["vendor-stats"],
    queryFn: getVendorDashboardStats,
  });

  const navigate = useNavigate();

  // Calculate conversion rate for success hire
  const conversionRate = stats?.resumes_submitted > 0 
    ? Math.round((stats.candidates_selected / stats.resumes_submitted) * 100) 
    : 0;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome, {vendor?.name}
        </h1>
        <p className="text-muted-foreground">
          Here is an overview of your recruitment activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Assigned Jobs"
          value={stats?.jobs_assigned ?? 0}
          icon={Briefcase}
          trend="Active"
          description="Assigned role openings"
          color="primary"
          delay={0.05}
          onClick={() => navigate("/vendor/jobs")}
        />
        <StatCard
          label="Submissions"
          value={stats?.resumes_submitted ?? 0}
          icon={FileText}
          trend="Total"
          description="Accumulated talent ingest"
          color="accent"
          delay={0.1}
          onClick={() => navigate("/vendor/candidates")}
        />
        <StatCard
          label="Selected"
          value={stats?.candidates_selected ?? 0}
          icon={CheckCircle2}
          trend={`${conversionRate}% Rate`}
          description="Successful hires"
          color="success"
          delay={0.15}
          onClick={() => navigate("/vendor/selected")}
        />
        <StatCard
          label="In Pipeline"
          value={stats?.candidates_in_pipeline ?? 0}
          icon={Clock}
          trend="Current"
          description="Active interview flow"
          color="warning"
          delay={0.2}
          onClick={() => navigate("/vendor/pipeline")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              Recent Guidelines
            </h2>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">1</div>
              <div>
                <h4 className="font-bold text-foreground mb-1">Quality Over Quantity</h4>
                <p className="text-sm text-muted-foreground">Ensure candidates match at least 70% of the required skills before uploading.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">2</div>
              <div>
                <h4 className="font-bold text-foreground mb-1">Update Statuses</h4>
                <p className="text-sm text-muted-foreground">Keep track of your candidates in the pipeline view. HR will update statuses as they progress.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">3</div>
              <div>
                <h4 className="font-bold text-foreground mb-1">Bulk Uploads</h4>
                <p className="text-sm text-muted-foreground">You can upload multiple resumes at once for a specific job opening.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 bg-primary/5 border-primary/20">
          <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <Link
              to="/vendor/upload"
              className="flex items-center justify-between p-4 rounded-xl bg-primary text-primary-foreground font-bold hover:shadow-xl hover:shadow-primary/20 transition-all group"
            >
              Upload Resumes
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/vendor/jobs"
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 text-foreground font-bold hover:bg-white/10 transition-all group"
            >
              View My Jobs
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
