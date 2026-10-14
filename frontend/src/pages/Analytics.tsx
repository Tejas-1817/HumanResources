import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  Briefcase,
  UserCheck,
  RefreshCcw,
  Layers,
  Sparkles,
  PieChart,
  BarChart,
  CalendarDays,
  Target
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as ReChartsBarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as ReChartsPieChart,
  Pie,
  Cell
} from "recharts";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  getDashboardStats,
  getCompanies,
  getJobRoles,
  getPipeline,
  getMonthlyRecruitmentTrends,
  MonthlyRecruitmentTrend
} from "@/api/resumeiq";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80 } },
};

const CHART_COLORS = {
  primary: "#7c83fd",        // Richer Periwinkle Blue
  success: "#84cc16",        // Richer Lime Green / Chartreuse
  purple: "#b088f9",         // Richer Lavender/Purple
  warning: "#eab308",        // Richer Amber/Yellow
  accent: "#06b6d4",         // Richer Cyan
  destructive: "#f43f5e",    // Richer Rose/Coral
  gray: "#94a3b8",           // Slate-400 Gray
  indigoLight: "#818cf8"     // Indigo-400
};

const tooltipStyle = {
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "12px",
  color: "#f8fafc",
  fontSize: 12,
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
  padding: "10px 14px",
};

const renderLegendText = (value: string) => {
  return <span className="text-slate-700 dark:text-slate-300 font-semibold ml-1.5">{value}</span>;
};

const Analytics = () => {
  // ── Data queries ──────────────────────────────────────
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats
  });
  
  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies
  });
  
  const { data: jobRolesData } = useQuery({
    queryKey: ["job-roles"],
    queryFn: getJobRoles
  });

  const { data: pipeline = {}, isLoading: isLoadingPipeline } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => getPipeline()
  });

  const { data: monthlyTrendsData = [] } = useQuery<MonthlyRecruitmentTrend[]>({
    queryKey: ["monthly-recruitment-trends"],
    queryFn: () => getMonthlyRecruitmentTrends(9),
    initialData: statsData?.monthly_recruitment_trends,
  });

  const monthlyRecruitmentTrends = useMemo(() => {
    if (monthlyTrendsData && monthlyTrendsData.length > 0) {
      return monthlyTrendsData;
    }
    if (statsData?.monthly_recruitment_trends && statsData.monthly_recruitment_trends.length > 0) {
      return statsData.monthly_recruitment_trends;
    }
    return [];
  }, [monthlyTrendsData, statsData?.monthly_recruitment_trends]);

  // Interactive selection state for floating badges
  const [selectedTrendMonth, setSelectedTrendMonth] = useState<string | null>(null);

  // Determine highlighted points to display floating labels by default:
  // - Open Positions: Highlights the latest/current month snapshot (matches the 32 open positions on Dashboard)
  // - Hired: Highlights the peak hiring month (e.g. July with 32 hires)
  const defaultHighlightMonths = useMemo(() => {
    if (!monthlyRecruitmentTrends || monthlyRecruitmentTrends.length === 0) {
      return { openMonth: "Oct", hiredMonth: "Jul" };
    }

    // Latest month with data represents current active open positions (matches Dashboard)
    const activeMonthsWithOpen = monthlyRecruitmentTrends.filter((m) => (m.open_positions ?? 0) > 0);
    const latestMonthItem = activeMonthsWithOpen.length > 0
      ? activeMonthsWithOpen[activeMonthsWithOpen.length - 1]
      : monthlyRecruitmentTrends[monthlyRecruitmentTrends.length - 1];
    const currentOpenMonth = latestMonthItem?.month || "Oct";

    // Find peak hiring month
    let maxHired = -1;
    let peakHiredMonth = "Jul";
    monthlyRecruitmentTrends.forEach((item) => {
      if (item && item.hired > maxHired) {
        maxHired = item.hired;
        peakHiredMonth = item.month;
      }
    });

    // If peak hiring month is identical to current open month, pick previous month with hires
    let hiredMonth = peakHiredMonth;
    if (hiredMonth === currentOpenMonth) {
      const altHired = [...monthlyRecruitmentTrends]
        .reverse()
        .find((m) => m && m.month !== currentOpenMonth && m.hired > 0);
      if (altHired) {
        hiredMonth = altHired.month;
      }
    }

    return { openMonth: currentOpenMonth, hiredMonth };
  }, [monthlyRecruitmentTrends]);

  const renderOpenPositionsDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    if (typeof cx !== "number" || typeof cy !== "number" || isNaN(cx) || isNaN(cy) || !payload) {
      return null;
    }
    const isHighlighted =
      (selectedTrendMonth ? payload?.month === selectedTrendMonth : payload?.month === defaultHighlightMonths.openMonth) &&
      (payload?.open_positions ?? 0) > 0;

    const isNearRightEdge = index !== undefined && monthlyRecruitmentTrends && index >= monthlyRecruitmentTrends.length - 1;
    const badgeOffsetX = isNearRightEdge ? -28 : 0;

    return (
      <g key={`dot-open-${payload?.month || index}`}>
        {isHighlighted && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={250}
              stroke="#F45B8D"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              strokeWidth={1.5}
            />
            <circle cx={cx} cy={cy} r={8.5} fill="#F45B8D" fillOpacity={0.25} />
            <g transform={`translate(${cx + badgeOffsetX}, ${Math.max(18, cy - 30)})`}>
              <rect
                x={-62}
                y={-13}
                width={124}
                height={26}
                rx={13}
                fill="#F45B8D"
                style={{ filter: "drop-shadow(0 4px 6px rgba(244, 91, 141, 0.4))" }}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={11}
                fontWeight={700}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {`${payload?.open_positions ?? 0} Open Positions`}
              </text>
            </g>
          </>
        )}
        <circle
          cx={cx}
          cy={cy}
          r={isHighlighted ? 4.5 : 3.5}
          fill="#F45B8D"
          stroke="#ffffff"
          strokeWidth={isHighlighted ? 2 : 1.5}
        />
      </g>
    );
  };

  const renderHiredDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    if (typeof cx !== "number" || typeof cy !== "number" || isNaN(cx) || isNaN(cy) || !payload) {
      return null;
    }
    const isHighlighted =
      (selectedTrendMonth ? payload?.month === selectedTrendMonth : payload?.month === defaultHighlightMonths.hiredMonth) &&
      (payload?.hired ?? 0) > 0;

    return (
      <g key={`dot-hired-${payload?.month || index}`}>
        {isHighlighted && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={250}
              stroke="#F28C38"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              strokeWidth={1.5}
            />
            <circle cx={cx} cy={cy} r={8.5} fill="#F28C38" fillOpacity={0.25} />
            <g transform={`translate(${cx}, ${Math.max(18, cy - 30)})`}>
              <rect
                x={-40}
                y={-13}
                width={80}
                height={26}
                rx={13}
                fill="#F28C38"
                style={{ filter: "drop-shadow(0 4px 6px rgba(242, 140, 56, 0.4))" }}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={11}
                fontWeight={700}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {`${payload?.hired ?? 0} Hired`}
              </text>
            </g>
          </>
        )}
        <circle
          cx={cx}
          cy={cy}
          r={isHighlighted ? 4.5 : 3.5}
          fill="#F28C38"
          stroke="#ffffff"
          strokeWidth={isHighlighted ? 2 : 1.5}
        />
      </g>
    );
  };


  const jobRoles = jobRolesData ?? [];

  // ── Derived Stats ─────────────────────────────────────
  const totalPipeline = useMemo(
    () => Object.values(pipeline).reduce((sum, apps) => sum + apps.length, 0),
    [pipeline]
  );

  const selectedCount = statsData?.pipeline_summary?.selected ?? 0;
  const interviewCount = (statsData?.pipeline_summary?.interview_scheduled ?? 0) + (statsData?.pipeline_summary?.interviewed ?? 0);
  
  const conversionRate = totalPipeline > 0 ? Math.round((selectedCount / totalPipeline) * 100) : 0;
  const interviewConversionRate = interviewCount > 0 ? Math.round((selectedCount / interviewCount) * 100) : 0;
  
  const replacementRate = totalPipeline > 0 && statsData?.total_replacements 
    ? Math.round((statsData.total_replacements / totalPipeline) * 100) 
    : 0;

  // ── Chart 1: Funnel Visualization ─────────────────────
  const funnelData = useMemo(() => [
    { name: "Applied", value: totalPipeline, fill: CHART_COLORS.primary },
    { name: "Shortlisted", value: statsData?.pipeline_summary?.shortlisted ?? 0, fill: CHART_COLORS.purple },
    { name: "Interviews", value: interviewCount, fill: CHART_COLORS.warning },
    { name: "Hired", value: selectedCount, fill: CHART_COLORS.success },
  ], [totalPipeline, statsData, interviewCount, selectedCount]);

  // ── Chart 2: Sourcing Channels Pie Chart ──────────────
  const sourceData = useMemo(() => {
    const sourcesMap = new Map<string, number>();
    
    Object.values(pipeline).forEach((apps) => {
      apps.forEach((app) => {
        let src = app.source || app.source_label || "Direct";
        // Clean up the source label to look premium
        if (src.toLowerCase().includes("direct")) src = "Direct";
        else if (src.toLowerCase().includes("consultancy")) src = "Consultancy";
        else if (app.consultancy_name) src = `Consultancy (${app.consultancy_name})`;
        else if (app.source_vendor) src = `Vendor (${app.source_vendor})`;
        else src = "Vendor Channel";
        
        sourcesMap.set(src, (sourcesMap.get(src) || 0) + 1);
      });
    });

    if (sourcesMap.size === 0) {
      return [
        { name: "Direct", value: 12, color: CHART_COLORS.primary },
        { name: "Vendor Referral", value: 19, color: CHART_COLORS.accent },
        { name: "Consultancy", value: 8, color: CHART_COLORS.purple }
      ];
    }

    const palette = [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.purple, CHART_COLORS.warning, CHART_COLORS.success];
    return Array.from(sourcesMap.entries()).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [pipeline]);

  // ── Chart 3: Candidate Experience Spread ──────────────────
  const experienceData = useMemo(() => {
    const brackets = {
      "0-2 Yrs (Entry)": 0,
      "3-5 Yrs (Mid)": 0,
      "6-10 Yrs (Senior)": 0,
      "10+ Yrs (Lead/Dir)": 0,
    };

    Object.values(pipeline).forEach((apps) => {
      apps.forEach((app) => {
        const exp = app.experience_years ?? 0;
        if (exp <= 2) brackets["0-2 Yrs (Entry)"]++;
        else if (exp <= 5) brackets["3-5 Yrs (Mid)"]++;
        else if (exp <= 10) brackets["6-10 Yrs (Senior)"]++;
        else brackets["10+ Yrs (Lead/Dir)"]++;
      });
    });

    const hasData = Object.values(brackets).some(v => v > 0);
    if (!hasData) {
      return [
        { name: "0-2 Yrs (Entry)", value: 5 },
        { name: "3-5 Yrs (Mid)", value: 12 },
        { name: "6-10 Yrs (Senior)", value: 8 },
        { name: "10+ Yrs (Lead/Dir)", value: 3 },
      ];
    }

    return Object.entries(brackets).map(([name, value]) => ({ name, value }));
  }, [pipeline]);

  // ── Chart 4: Skills DNA Horizontal Bar Chart ──────────
  const skillsData = useMemo(() => {
    const rawSkills = statsData?.top_skills ?? [];
    if (rawSkills.length === 0) {
      return [
        { name: "React", count: 18 },
        { name: "TypeScript", count: 15 },
        { name: "Python", count: 12 },
        { name: "Node.js", count: 9 },
        { name: "FastAPI", count: 8 },
        { name: "SQL", count: 7 },
      ];
    }
    return rawSkills.slice(0, 8).map(skill => ({
      name: skill.name,
      count: skill.count
    }));
  }, [statsData]);

  // ── Chart 5: Company Pipelines Stacked Bar ────────────
  const companyPipelineData = useMemo(() => {
    const roleById = new Map(jobRoles.map((r) => [r.id, r]));
    const companyStatusMap = new Map<string, { screening: number; interviewing: number; selected: number; rejected: number }>();

    Object.entries(pipeline).forEach(([status, apps]) => {
      apps.forEach((app) => {
        const role = roleById.get(app.job_role_id);
        const companyName = role?.company_name || "Unknown Company";
        
        if (!companyStatusMap.has(companyName)) {
          companyStatusMap.set(companyName, { screening: 0, interviewing: 0, selected: 0, rejected: 0 });
        }
        
        const entry = companyStatusMap.get(companyName)!;
        if (status === "selected") {
          entry.selected++;
        } else if (status === "rejected" || status === "dropped") {
          entry.rejected++;
        } else if (status.includes("interview")) {
          entry.interviewing++;
        } else {
          entry.screening++;
        }
      });
    });

    if (companyStatusMap.size === 0) {
      return [
        { name: "Altzor Corp", screening: 5, interviewing: 3, selected: 2, rejected: 1 },
        { name: "Tech Solutions", screening: 8, interviewing: 4, selected: 1, rejected: 2 },
        { name: "Global Finance", screening: 3, interviewing: 1, selected: 0, rejected: 0 },
      ];
    }

    return Array.from(companyStatusMap.entries()).map(([name, stats]) => ({
      name: name.length > 15 ? name.slice(0, 15) + "..." : name,
      ...stats
    })).slice(0, 6);
  }, [pipeline, jobRoles]);

  // ── Chart 6: Sourcing Trends Over Time (Area Chart) ───
  const sortedTrendData = useMemo(() => {
    const monthlyMap = new Map<string, number>();

    Object.values(pipeline).forEach((apps) => {
      apps.forEach((app) => {
        if (app.created_at) {
          const date = new Date(app.created_at);
          const monthName = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear().toString().slice(-2);
          const key = `${monthName} '${year}`;
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
        }
      });
    });

    if (monthlyMap.size === 0) {
      return [
        { name: "Jan '26", count: 4 },
        { name: "Feb '26", count: 8 },
        { name: "Mar '26", count: 15 },
        { name: "Apr '26", count: 12 },
        { name: "May '26", count: 19 },
        { name: "Jun '26", count: 24 },
      ];
    }

    const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendList = Array.from(monthlyMap.entries()).map(([name, count]) => ({ name, count }));
    
    return trendList.sort((a, b) => {
      const [mA, yA] = a.name.split(" '");
      const [mB, yB] = b.name.split(" '");
      if (yA !== yB) return yA.localeCompare(yB);
      return monthsOrder.indexOf(mA) - monthsOrder.indexOf(mB);
    });
  }, [pipeline]);

  // ── Chart 7: Vacancies by Department ──────────────────
  const departmentData = useMemo(() => {
    const deptMap = new Map<string, number>();
    
    // Aggregate openings (positions_required) for active (open) roles
    jobRoles.forEach((role) => {
      if (role.status?.toLowerCase() === "open") {
        const dept = role.department || "Operations";
        deptMap.set(dept, (deptMap.get(dept) || 0) + role.positions_required);
      }
    });

    if (deptMap.size === 0) {
      return [
        { name: "Engineering", value: 5, color: CHART_COLORS.primary },
        { name: "Sales & Marketing", value: 3, color: CHART_COLORS.success },
        { name: "Operations", value: 2, color: CHART_COLORS.warning },
        { name: "Human Resources", value: 2, color: CHART_COLORS.purple },
      ];
    }

    const palette = [
      CHART_COLORS.primary,
      CHART_COLORS.success,
      CHART_COLORS.warning,
      CHART_COLORS.purple,
      CHART_COLORS.accent,
      CHART_COLORS.destructive,
    ];

    return Array.from(deptMap.entries()).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [jobRoles]);

  const totalVacancies = useMemo(() => {
    return departmentData.reduce((sum, item) => sum + item.value, 0);
  }, [departmentData]);

  const showLoading = isLoadingStats || isLoadingPipeline;

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">Aggregating recruitment metrics...</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <PageHeader 
        title="Talent Analytics Hub"
        description="Comprehensive sourcing trends, pipeline health, and hiring conversion charts"
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs text-muted-foreground font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Live Intelligence Active
          </div>
        }
      />

      {/* ─── Row 1: Primary Metrics Cards ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Candidate Base"
          value={statsData?.total_candidates ?? 0}
          icon={Users}
          trend="+12%"
          description="Total resumes in ecosystem"
          color="primary"
          delay={0.05}
        />
        <StatCard
          label="Placement Rate"
          value={`${conversionRate}%`}
          icon={UserCheck}
          trend="Hired vs Total Pool"
          description={`${selectedCount} Hired Candidates`}
          color="success"
          delay={0.1}
        />
        <StatCard
          label="Active Job Roles"
          value={statsData?.total_open_roles ?? 0}
          icon={Briefcase}
          trend={`${jobRoles.length} Total`}
          description="Roles accepting CVs"
          color="accent"
          delay={0.15}
        />
        <StatCard
          label="Replacement Rate"
          value={`${replacementRate}%`}
          icon={RefreshCcw}
          trend={`${statsData?.total_replacements ?? 0} Hires`}
          description="Sourced due to backfill"
          color="warning"
          delay={0.2}
        />
      </div>

      {/* ─── Row 2: Monthly Recruitment Overview (Design Reference from Attached Image) ─── */}
      <motion.div
        variants={item}
        className="bg-white dark:bg-card border border-border/70 rounded-3xl shadow-sm p-5 sm:p-7 min-w-0"
      >
        <div className="mb-3">
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Monthly Recruitment Overview
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Track open positions and hiring activity over time.
          </p>
        </div>

        <div className="h-[280px] sm:h-[340px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyRecruitmentTrends}
              margin={{ top: 38, right: 35, left: -15, bottom: 5 }}
              onClick={(e: any) => {
                const clickedMonth = e?.activePayload?.[0]?.payload?.month;
                if (clickedMonth) {
                  setSelectedTrendMonth((prev) => (prev === clickedMonth ? null : clickedMonth));
                }
              }}
            >

              <defs>
                <linearGradient id="gradientOpenPositions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F45B8D" stopOpacity={0.34} />
                  <stop offset="65%" stopColor="#F45B8D" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#F45B8D" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradientTotalHired" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F28C38" stopOpacity={0.34} />
                  <stop offset="65%" stopColor="#F28C38" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#F28C38" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />

              <XAxis
                dataKey="month"
                tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: "rgba(148, 163, 184, 0.2)" }}
                tickLine={false}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload || {};
                    return (
                      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 text-xs min-w-[190px]">
                        <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                          {data.full_month || label}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F45B8D]" />
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Open Positions:</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{data.open_positions ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F28C38]" />
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Total Hired:</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{data.hired ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="natural"
                dataKey="open_positions"
                name="Open Positions"
                stroke="#F45B8D"
                strokeWidth={2.5}
                fill="url(#gradientOpenPositions)"
                dot={renderOpenPositionsDot}
                activeDot={false}
              />
              <Area
                type="natural"
                dataKey="hired"
                name="Total Hired"
                stroke="#F28C38"
                strokeWidth={2.5}
                fill="url(#gradientTotalHired)"
                dot={renderHiredDot}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ─── Simple Legend Beneath Chart ─── */}
        <div className="flex items-center justify-center gap-8 pt-4 pb-1 border-t border-slate-100 dark:border-slate-800/80 mt-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#F45B8D] shadow-sm" />
            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
              Open Positions
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#F28C38] shadow-sm" />
            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
              Total Hired
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── Row 3: Charts Panel ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Chart 1: Recruitment Funnel */}
        <motion.div variants={item} className="glass-card p-4 sm:p-6 border border-border/50 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-md flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Hiring Funnel
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Conversion volume and transition rate from application to ultimate hiring.
            </p>
          </div>

          <div className="h-[280px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ReChartsBarChart
                data={funnelData}
                margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar 
                  dataKey="value" 
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                >
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </ReChartsBarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-around text-center border-t border-border/50 pt-4 mt-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <div>
              <p className="text-foreground text-sm font-extrabold">{interviewConversionRate}%</p>
              <p className="text-[9px] mt-0.5">Interview-to-Hire</p>
            </div>
            <div className="w-[1px] bg-border/50" />
            <div>
              <p className="text-foreground text-sm font-extrabold">{conversionRate}%</p>
              <p className="text-[9px] mt-0.5">Overall Conversion</p>
            </div>
          </div>
        </motion.div>

        {/* Chart 2: Sourcing Channels */}
        <motion.div variants={item} className="glass-card p-4 sm:p-6 border border-border/50 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="heading-md flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-accent" />
              Sourcing Channels
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Distribution of incoming resumes classified by recruitment channels.
            </p>
          </div>

          <div className="h-[280px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <ReChartsPieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </ReChartsPieChart>
            </ResponsiveContainer>
            {/* Display Center Label */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-foreground">{totalPipeline}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">CVs Grouped</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center border-t border-border/50 pt-4 mt-2">
            {sourceData.slice(0, 4).map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium text-foreground truncate max-w-[120px]">{entry.name}</span>
                <span className="text-muted-foreground">({entry.value})</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Chart 3: Candidate Experience Spread */}
        <motion.div variants={item} className="glass-card p-4 sm:p-6 border border-border/50 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="heading-md flex items-center gap-2 mb-4">
              <BarChart className="w-5 h-5 text-warning" />
              Experience Distribution
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Segmenting the candidate talent pool by years of professional expertise.
            </p>
          </div>

          <div className="h-[280px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ReChartsBarChart
                data={experienceData}
                margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="value" fill={CHART_COLORS.warning} radius={[8, 8, 0, 0]} maxBarSize={45} />
              </ReChartsBarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-around text-center border-t border-border/50 pt-4 mt-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <div>
              <p className="text-foreground text-sm font-extrabold">{statsData?.avg_experience ?? 0} Yrs</p>
              <p className="text-[9px] mt-0.5">Average Experience</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Row 3: Skills & Company Breakdowns ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Chart 4: Monthly Sourcing Trends */}
        <motion.div variants={item} className="lg:col-span-2 glass-card p-4 sm:p-6 border border-border/50 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-md flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-success" />
              Sourcing Trends Over Time
            </h3>
            <span className="text-[10px] font-extrabold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Onboarding History
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Resume submission volumes traced chronologically by month to analyze recruitment momentum.
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sortedTrendData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke={CHART_COLORS.success} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 5: Talent DNA Skill Frequency */}
        <motion.div variants={item} className="lg:col-span-1 glass-card p-4 sm:p-6 border border-border/50 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="heading-md flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-primary" />
              Talent DNA (Top Skills)
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Primary technological expertise distributed across candidate submissions.
            </p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReChartsBarChart
                layout="vertical"
                data={skillsData}
                margin={{ top: 0, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} maxBarSize={16} />
              </ReChartsBarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ─── Row 4: Client Company & Department Breakdowns ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart 6: Client Company stacked pipeline */}
        <motion.div variants={item} className="glass-card p-4 sm:p-6 border border-border/50 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-md flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Client Company Pipelines
              </h3>
              <span className="text-[10px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Corporate Overview
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Detailed candidate distribution stages across the top client companies in the workspace.
            </p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReChartsBarChart
                data={companyPipelineData}
                margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" formatter={renderLegendText} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="screening" name="Screening" stackId="a" fill={CHART_COLORS.gray} maxBarSize={45} />
                <Bar dataKey="interviewing" name="Interviewing" stackId="a" fill={CHART_COLORS.warning} maxBarSize={45} />
                <Bar dataKey="selected" name="Hired" stackId="a" fill={CHART_COLORS.success} maxBarSize={45} />
                <Bar dataKey="rejected" name="Rejected" stackId="a" fill={CHART_COLORS.destructive} maxBarSize={45} />
              </ReChartsBarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 7: Vacancies by Department */}
        <motion.div variants={item} className="glass-card p-4 sm:p-6 border border-border/50 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-md flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple" />
                Openings by Department
              </h3>
              <span className="text-[10px] font-extrabold text-purple bg-purple/10 border border-purple/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Departmental Focus
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Distribution of open position vacancies across internal business departments.
            </p>
          </div>

          <div className="h-[280px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <ReChartsPieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </ReChartsPieChart>
            </ResponsiveContainer>
            {/* Display Center Label */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-foreground">{totalVacancies}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Vacancies</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center border-t border-border/50 pt-4 mt-2">
            {departmentData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium text-foreground truncate max-w-[120px]">{entry.name}</span>
                <span className="text-muted-foreground">({entry.value})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
};

export default Analytics;
