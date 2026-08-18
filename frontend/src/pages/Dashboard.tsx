import { useState, useEffect, useMemo, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Briefcase,
  Calendar,
  Bell,
  ChevronDown,
  Menu,
  ArrowUpRight,
  Search,
  Mail,
  Phone,
  ExternalLink,
  Plus,
  User,
  UserCheck,
  UserX,
  Clock,
  Inbox,
  CheckCheck,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  CalendarDays,
  UserPlus,
  BarChart3,
  BadgeCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  getDashboardStats,
  getCompanies,
  getJobRoles,
  getPipeline,
  getCandidates,
  getInterviewSchedules,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
} from "@/api/resumeiq";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

// ── SVG Sparkline component for conversion rate graph ────────────────
const Sparkline = () => {
  return (
    <svg className="w-24 h-12 overflow-visible" viewBox="0 0 100 40">
      <defs>
        <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 35 C 15 32, 25 18, 40 22 C 55 26, 65 10, 75 8 C 85 6, 92 14, 100 5 L 100 40 L 0 40 Z"
        fill="url(#sparklineGrad)"
      />
      <path
        d="M 0 35 C 15 32, 25 18, 40 22 C 55 26, 65 10, 75 8 C 85 6, 92 14, 100 5"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="5" r="3" fill="#3b82f6" />
      <circle cx="100" cy="5" r="6" fill="#3b82f6" className="animate-ping" style={{ transformOrigin: '100px 5px' }} />
    </svg>
  );
};

// ── Mini Calendar Widget ─────────────────────────────────────────────
const DashboardCalendar = ({
  selectedDate,
  onSelectDate,
  schedules = [],
  onScheduleInterview,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  schedules?: any[];
  onScheduleInterview?: (date: Date) => void;
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
  const [popoverDay, setPopoverDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setPopoverDay(null);
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setPopoverDay(null);
  };

  // Helper to check if a day has interviews
  const hasInterviewsOnDay = (day: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (!schedules || schedules.length === 0) {
      return false;
    }

    return schedules.some((s) => {
      if (!s.date) return false;
      const sDate = s.date.includes("T") ? s.date.split("T")[0] : s.date;
      return sDate === dayStr;
    });
  };

  // Helper to check if a day is a holiday
  const getHolidayName = (day: number) => {
    const mmDd = `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const holidayList = [
      { date: "01-01", name: "New Year's Day" },
      { date: "01-14", name: "Makar Sankranti" },
      { date: "01-26", name: "Republic Day" },
      { date: "03-14", name: "Holi" },
      { date: "04-14", name: "Ambedkar Jayanti" },
      { date: "04-18", name: "Good Friday" },
      { date: "05-01", name: "Maharashtra Day" },
      { date: "08-15", name: "Independence Day" },
      { date: "08-27", name: "Ganesh Chaturthi" },
      { date: "10-02", name: "Gandhi Jayanti" },
      { date: "10-24", name: "Dussehra" },
      { date: "10-20", name: "Diwali" },
      { date: "10-21", name: "Diwali (Lakshmi Puja)" },
      { date: "11-05", name: "Guru Nanak Jayanti" },
      { date: "12-25", name: "Christmas Day" },
    ];
    const h = holidayList.find(item => item.date === mmDd);
    return h ? h.name : null;
  };

  // Close popover when clicking anywhere else
  useEffect(() => {
    const handleClickOutside = () => setPopoverDay(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-slate-800 tracking-tight">Interview Schedule Calendar</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }}
            className="p-1 rounded-md hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold text-slate-700 min-w-[75px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleNextMonth(); }}
            className="p-1 rounded-md hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black text-red-500 uppercase tracking-wider w-8 text-center">SUN</span>
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider w-8 text-center">MON</span>
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider w-8 text-center">TUE</span>
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider w-8 text-center">WED</span>
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider w-8 text-center">THU</span>
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider w-8 text-center">FRI</span>
        <span className="text-xs font-black text-red-500 uppercase tracking-wider w-8 text-center">SAT</span>
      </div>

      <div className="grid grid-cols-7 gap-y-2 gap-x-1 justify-items-center flex-1">
        {/* Calendar Padding Cells */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} className="w-8 h-8" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateObj = new Date(year, month, dayNum);
          const dayOfWeek = dateObj.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const holidayName = getHolidayName(dayNum);
          const isHoliday = !!holidayName;

          const isToday =
            dayNum === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();

          const isSelected =
            dayNum === selectedDate.getDate() &&
            month === selectedDate.getMonth() &&
            year === selectedDate.getFullYear();

          const hasInterviews = hasInterviewsOnDay(dayNum);

          return (
            <div key={`day-${dayNum}`} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDate(new Date(year, month, dayNum));
                  setPopoverDay(popoverDay === dayNum ? null : dayNum);
                }}
                title={holidayName || undefined}
                className={`w-8 h-8 rounded-full flex flex-col items-center justify-center text-xs font-bold transition-all cursor-pointer
                  ${isSelected
                    ? "bg-blue-600 text-white shadow-sm font-extrabold"
                    : isToday
                      ? "bg-blue-50 text-blue-600 border border-blue-200"
                      : (isHoliday || isWeekend)
                        ? "text-red-500 hover:bg-red-50 font-bold"
                        : "text-slate-800 hover:bg-slate-100"
                  }`}
              >
                <span>{dayNum}</span>
                {/* Dot indicator if day has interviews */}
                {hasInterviews && !isSelected && (
                  <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isToday ? "bg-blue-600" : "bg-blue-500"}`} />
                )}
              </button>

              <AnimatePresence>
                {popoverDay === dayNum && onScheduleInterview && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-white shadow-xl border border-slate-100 rounded-xl p-2 min-w-[160px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-[10px] text-slate-500 font-bold mb-2 text-center uppercase tracking-wider">Options</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopoverDay(null);
                        onScheduleInterview(new Date(year, month, dayNum));
                      }}
                      className="text-[11px] w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20"
                    >
                      <Plus className="w-3 h-3" /> Schedule Interview
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Metric Card Sub-component ────────────────────────────────────────
const MetricCard = ({
  label,
  value,
  icon: Icon,
  iconBg = "bg-blue-50 text-blue-600",
  onClick,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  icon: any;
  iconBg?: string;
  onClick?: () => void;
  valueClassName?: string;
}) => {
  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className={`bg-white border border-blue-200/80 hover:border-blue-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between ${onClick ? "cursor-pointer" : ""
        }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <div className="mt-0.5">
            {typeof value === "string" || typeof value === "number" ? (
              <h3 className={`text-2xl font-black text-slate-800 ${valueClassName || ""}`}>{value}</h3>
            ) : (
              value
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ── State variables for header popups ─────────────────
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── State variables for timeframe & upcoming filters ─
  const [timeframe, setTimeframe] = useState("This Week");
  const [upcomingView, setUpcomingView] = useState("View");
  const [upcomingWeek, setUpcomingWeek] = useState("Week");

  const [upcomingMonth, setUpcomingMonth] = useState(() =>
    new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
  );

  const monthOptions = useMemo(() => {
    const opts = ["Month", "All Months"];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    }
    return opts;
  }, []);

  // Dropdown open states
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showWeekDropdown, setShowWeekDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showStatsDropdown, setShowStatsDropdown] = useState(false);

  // Recruitment Statistics timeframe filter
  type StatsTimeframe = "This Week" | "This Month" | "Last 3 Months" | "All Time";
  const [statsTimeframe, setStatsTimeframe] = useState<StatsTimeframe>("This Month");

  // Calendar date communication state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [highlightTodaysInterviews, setHighlightTodaysInterviews] = useState(false);

  const handleInterviewsTodayClick = () => {
    const el = document.getElementById("todays-interviews");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setHighlightTodaysInterviews(true);
    setTimeout(() => {
      setHighlightTodaysInterviews(false);
    }, 4000);
  };

  // ── Data queries ──────────────────────────────────────
  const { data: statsData } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });
  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: () => getCompanies() });
  const { data: jobRolesData } = useQuery({ queryKey: ["job-roles"], queryFn: () => getJobRoles() });
  const { data: rawPipeline = {} } = useQuery({ queryKey: ["pipeline"], queryFn: () => getPipeline() });
  const pipeline = rawPipeline || {};
  const { data: schedules = [] } = useQuery({ queryKey: ["interview-schedules"], queryFn: () => getInterviewSchedules() });
  const { data: benchData } = useQuery({ queryKey: ["bench-candidates-count"], queryFn: () => getCandidates({ page_size: 1, unassigned_only: true }) });

  const data = statsData;
  const companies = companiesData ?? [];
  const jobRoles = jobRolesData ?? [];

  const totalActivePositionsCount = useMemo(() => {
    return jobRoles.reduce((sum, r) => {
      const filledCount = Object.values(pipeline).flat().filter((app: any) => app.job_role_id === r.id && (app.status === "selected" || app.status === "joined")).length;
      const isClosed = r.status?.toLowerCase() === "closed" || (r.positions_required > 0 && filledCount >= r.positions_required);
      if (isClosed) return sum;

      const remaining = Math.max(0, (r.positions_required || 1) - filledCount);
      return sum + remaining;
    }, 0);
  }, [jobRoles, pipeline]);

  // ── Notification API handlers ────────────────────────
  const fetchNotifications = async () => {
    try {
      const list = await getNotifications();
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // ── Greeting calculations ─────────────────────────────
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good Morning";
    if (hrs < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // ── Candidate Search ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["candidate-search", debouncedQuery],
    queryFn: () => getCandidates({ search: debouncedQuery, page_size: 5 }),
    enabled: debouncedQuery.length >= 2,
  });

  // Client-side filter companies by query (already loaded)
  const filteredCompaniesSearch = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    return companies
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 4);
  }, [companies, debouncedQuery]);

  // Client-side filter job roles by title or company name
  const filteredJobRolesSearch = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    return jobRoles
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.company_name && r.company_name.toLowerCase().includes(q))
      )
      .slice(0, 4);
  }, [jobRoles, debouncedQuery]);

  // ── Derived statistics & helpers ─────────────────────
  const benchCount = benchData?.total ?? 0;

  const candidateSchedulesCount = useMemo(() => {
    const groups: { [key: string]: any } = {};
    schedules.forEach((item) => {
      const key = `${item.job_role_id}-${item.interviewer_id}-${item.date}-${item.time}-${(item.venue || "").toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          ...item,
          candidate_ids: item.candidate_id ? [item.candidate_id] : [],
        };
      } else {
        const g = groups[key];
        if (item.candidate_id && !g.candidate_ids.includes(item.candidate_id)) {
          g.candidate_ids.push(item.candidate_id);
        }
      }
    });
    let count = 0;
    Object.values(groups).forEach((group: any) => {
      count += group.candidate_ids.length === 0 ? 1 : group.candidate_ids.length;
    });
    return count;
  }, [schedules]);

  const todayInterviewsRealCount = useMemo(() => {
    const localToday = new Date();
    const year = localToday.getFullYear();
    const month = String(localToday.getMonth() + 1).padStart(2, '0');
    const day = String(localToday.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const groups: { [key: string]: any } = {};
    schedules.forEach((item) => {
      const sDate = item.date.includes("T") ? item.date.split("T")[0] : item.date;
      if (sDate === todayStr) {
        const key = `${item.job_role_id}-${item.interviewer_id}-${item.date}-${item.time}-${(item.venue || "").toLowerCase()}`;
        if (!groups[key]) {
          groups[key] = {
            ...item,
            candidate_ids: item.candidate_id ? [item.candidate_id] : [],
          };
        } else {
          const g = groups[key];
          if (item.candidate_id && !g.candidate_ids.includes(item.candidate_id)) {
            g.candidate_ids.push(item.candidate_id);
          }
        }
      }
    });
    let count = 0;
    Object.values(groups).forEach((group: any) => {
      count += group.candidate_ids.length === 0 ? 1 : group.candidate_ids.length;
    });
    return count;
  }, [schedules]);

  const totalPipeline = useMemo(
    () => Object.values(pipeline).reduce((sum: number, apps: any) => sum + (apps?.length || 0), 0),
    [pipeline]
  );
  
  const selectedCount = data?.pipeline_summary?.selected ?? 0;
  const conversionRate = totalPipeline > 0 ? Math.round((selectedCount / totalPipeline) * 100) : 0;

  // ── Filtered pipeline for Recruitment Statistics ─────
  const filteredPipeline = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;
    if (statsTimeframe === "This Week") {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
    } else if (statsTimeframe === "This Month") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (statsTimeframe === "Last 3 Months") {
      cutoff = new Date(now);
      cutoff.setMonth(now.getMonth() - 3);
    }
    if (!cutoff) return pipeline; // "All Time"
    const result: typeof pipeline = {};
    for (const [status, apps] of Object.entries(pipeline)) {
      result[status] = (apps as any[]).filter((app: any) => {
        if (!app.created_at) return true;
        return new Date(app.created_at) >= cutoff!;
      });
    }
    return result;
  }, [pipeline, statsTimeframe]);

  const overallStats = useMemo(() => {
    let pendingCount = 0;
    let shortlistedCount = 0;
    let interviewCountVal = 0;
    let selectedCountVal = 0;
    let joinedCount = 0;
    const hasPipelineData = Object.keys(filteredPipeline).length > 0;
    if (hasPipelineData) {
      pendingCount = (filteredPipeline["pending"] || []).length;
      shortlistedCount = (filteredPipeline["shortlisted"] || []).length;
      interviewCountVal = (filteredPipeline["interview_scheduled"] || []).length + (filteredPipeline["interviewed"] || []).length;
      selectedCountVal = (filteredPipeline["selected"] || []).length;
      joinedCount = (filteredPipeline["joined"] || []).length;
    }

    const appliedVal = pendingCount;
    const shortlistedVal = shortlistedCount;
    const interviewVal = interviewCountVal;
    const selectedVal = selectedCountVal;
    const joinedVal = joinedCount;

    const totalStats = appliedVal + shortlistedVal + interviewVal + selectedVal + joinedVal;

    return [
      { name: "Applied", value: appliedVal, pct: `${totalStats > 0 ? Math.round((appliedVal / totalStats) * 100) : 0}%`, bg: "bg-blue-50", textColor: "text-blue-500", icon: Send },
      { name: "Shortlisted", value: shortlistedVal, pct: `${totalStats > 0 ? Math.round((shortlistedVal / totalStats) * 100) : 0}%`, bg: "bg-purple-50", textColor: "text-purple-500", icon: UserCheck },
      { name: "Interview", value: interviewVal, pct: `${totalStats > 0 ? Math.round((interviewVal / totalStats) * 100) : 0}%`, bg: "bg-amber-50", textColor: "text-amber-500", icon: Clock },
      { name: "Selected", value: selectedVal, pct: `${totalStats > 0 ? Math.round((selectedVal / totalStats) * 100) : 0}%`, bg: "bg-emerald-50", textColor: "text-emerald-500", icon: CheckCircle2 },
      { name: "Joined", value: joinedVal, pct: `${totalStats > 0 ? Math.round((joinedVal / totalStats) * 100) : 0}%`, bg: "bg-cyan-50", textColor: "text-cyan-500", icon: Users },
    ];
  }, [filteredPipeline]);

  const totalActiveCount = useMemo(() => {
    let total = 0;
    const activeStatuses = ["pending", "shortlisted", "interview_scheduled", "interviewed", "on_hold"];
    activeStatuses.forEach((status) => {
      if (pipeline[status]) {
        total += pipeline[status].length;
      }
    });
    return total;
  }, [pipeline]);



  // ── Upcoming Interviews Mapper ────────────────────────
  const mockUpcomingInterviews = [
    { time: "10:00 AM", name: "Rahul Sharma", role: "Frontend Developer", round: "Technical Round", interviewer: "Priyanka Shete", date: "2026-05-13" },
    { time: "11:30 AM", name: "Sneha Patil", role: "Data Analyst", round: "HR Round", interviewer: "Trupti Patkar", date: "2026-05-14" },
    { time: "02:00 PM", name: "Amit Verma", role: "Backend Developer", round: "Technical Round", interviewer: "Karan Gupta", date: "2026-07-13" },
    { time: "04:00 PM", name: "Priya Singh", role: "UI/UX Designer", round: "HR Round", interviewer: "Neha Joshi", date: "2026-07-15" },
  ];

  const allCombinedInterviews = useMemo(() => {
    const pipelineInterviews = [
      ...(pipeline["interview_scheduled"] || []),
      ...(pipeline["interviewed"] || [])
    ];

    let combined: any[] = [];
    const seenCandidates = new Set<string>();

    const addInterview = (item: any) => {
      const key = `${item.name}-${item.role}`.toLowerCase();
      if (!seenCandidates.has(key)) {
        seenCandidates.add(key);
        combined.push(item);
      }
    };

    if (schedules && schedules.length > 0) {
      schedules.forEach((s: any) => {
        if (!s.date) return;
        addInterview({
          id: `sched-${s.id}`,
          time: s.time || "10:00 AM",
          name: s.candidate_name || "Candidate",
          role: s.job_role_title || "Role",
          round: "Interview",
          interviewer: s.interviewer_name || "TBD",
          date: s.date.includes("T") ? s.date.split("T")[0] : s.date,
          sortDate: new Date(s.date).getTime()
        });
      });
    }

    pipelineInterviews.forEach((app: any) => {
      const dStr = app.interview_date || app.status_date;
      if (!dStr) return;
      const d = new Date(dStr);

      const role = jobRoles.find((r: any) => r.id === app.job_role_id);
      const timeString = new Date(dStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      addInterview({
        id: `pipe-${app.id}`,
        time: timeString,
        name: app.candidate_name || "Candidate",
        role: role?.title || "Role",
        round: "Interview",
        interviewer: "TBD",
        date: dateString,
        sortDate: new Date(dStr).getTime()
      });
    });

    return combined.sort((a, b) => a.sortDate - b.sortDate);
  }, [pipeline, schedules, jobRoles]);

  const formattedUpcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = allCombinedInterviews.filter((item: any) => {
      if (!item.date) return false;
      const d = new Date(item.date);
      d.setHours(0, 0, 0, 0);
      return d >= now;
    });

    if (upcoming.length === 0) {
      return [];
    }

    return upcoming.slice(0, 10).map((item: any, i: number) => {
      const colors = [
        { color: "text-blue-600 bg-blue-50 border-blue-100", badgeColor: "bg-blue-100 text-blue-800" },
        { color: "text-indigo-600 bg-indigo-50 border-indigo-100", badgeColor: "bg-purple-100 text-purple-800" },
        { color: "text-amber-600 bg-amber-50 border-amber-100", badgeColor: "bg-blue-100 text-blue-800" },
        { color: "text-emerald-600 bg-emerald-50 border-emerald-100", badgeColor: "bg-purple-100 text-purple-800" },
      ];
      const style = colors[i % colors.length];

      return {
        ...item,
        color: style.color,
        badgeColor: style.badgeColor,
      };
    });
  }, [pipeline, schedules, jobRoles]);

  // ── Filtered Upcoming Interviews based on active dropdowns ────
  const filteredUpcoming = useMemo(() => {
    let list = formattedUpcoming;

    // Filter by View (Round Type)
    if (upcomingView !== "All" && upcomingView !== "View") {
      list = list.filter(item => item.round === upcomingView);
    }

    // Filter by Week
    if (upcomingWeek !== "Week" && upcomingWeek !== "All Weeks") {
      const now = new Date();
      if (upcomingWeek === "This Week") {
        list = list.filter(item => {
          if (!item.date) return false;
          const d = new Date(item.date);
          const start = new Date(now);
          start.setDate(now.getDate() - now.getDay());
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          return d >= start && d <= end;
        });
      } else if (upcomingWeek === "Next Week") {
        list = list.filter(item => {
          if (!item.date) return false;
          const d = new Date(item.date);
          const start = new Date(now);
          start.setDate(now.getDate() - now.getDay() + 7);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          return d >= start && d <= end;
        });
      }
    }

    // Filter by Month
    if (upcomingMonth !== "All Months" && upcomingMonth !== "Month") {
      try {
        const d = new Date(`${upcomingMonth} 01`);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `${yyyy}-${mm}`;
        list = list.filter(item => item.date?.startsWith(prefix));
      } catch (e) {
        // ignore
      }
    }

    return list;
  }, [formattedUpcoming, upcomingView, upcomingWeek, upcomingMonth]);

  // ── Open Positions Mapper ─────────────────────────────
  const openPositionsList = useMemo(() => {
    const allApps = Object.values(pipeline).flat();
    const openRoles = jobRoles.filter((r) => {
      const filledCount = allApps.filter((app: any) => app.job_role_id === r.id && (app.status === "selected" || app.status === "joined")).length;
      const isClosed = r.status?.toLowerCase() === "closed" || (r.positions_required > 0 && filledCount >= r.positions_required);
      return !isClosed;
    });

    return openRoles.map((r) => {
      const companyObj = companies.find((c) => c.id === r.company_id);
      const companyName = r.company_name || companyObj?.name || "Unknown";
      const totalApps = allApps.filter((app: any) => app.job_role_id === r.id).length;
      return {
        id: r.id,
        company: companyName,
        role: r.title,
        positions: r.positions_required || 1,
        count: totalApps,
        status: "Active",
      };
    });
  }, [jobRoles, pipeline, companies]);

  // ── Time helper function ──────────────────────────────
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return "";
    }
  };

  // ── Activity Feed Mapper ──────────────────────────────
  const activitiesList = useMemo(() => {
    if (!data?.activity_feed || data.activity_feed.length === 0) {
      return [];
    }
    return data.activity_feed.map((act: any) => ({
      id: act.id,
      text: act.text,
      time: act.time || formatTimeAgo(act.created_at),
      iconBg: act.iconBg || "bg-slate-50 text-slate-600",
    }));
  }, [data]);

  // ── Selected Date's Interviews Mapper ──────────────────
  const formattedToday = useMemo(() => {
    // Avoid toISOString() which shifts date to UTC and may cause off-by-one day bugs in some timezones.
    const yyyy = selectedCalendarDate.getFullYear();
    const mm = String(selectedCalendarDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedCalendarDate.getDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;
    const targetDateStrReverse = `${dd}-${mm}-${yyyy}`;

    if (!allCombinedInterviews || allCombinedInterviews.length === 0) {
      return [];
    }

    const daySchedules = allCombinedInterviews.filter((s: any) => {
      if (!s.date) return false;
      const sDate = s.date.includes("T") ? s.date.split("T")[0] : s.date;
      return sDate === targetDateStr || sDate === targetDateStrReverse;
    });

    return daySchedules.slice(0, 8).map((s: any) => ({
      time: s.time || "10:00 AM",
      name: s.name || s.candidate_name || "Candidate",
      role: s.role || s.job_role_title || "Developer",
    }));
  }, [allCombinedInterviews, selectedCalendarDate]);

  const todayInterviewsCount = useMemo(() => {
    const yyyy = selectedCalendarDate.getFullYear();
    const mm = String(selectedCalendarDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedCalendarDate.getDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;
    const targetDateStrReverse = `${dd}-${mm}-${yyyy}`;

    if (!allCombinedInterviews || allCombinedInterviews.length === 0) {
      return 0;
    }

    return allCombinedInterviews.filter((s: any) => {
      if (!s.date) return false;
      const sDate = s.date.includes("T") ? s.date.split("T")[0] : s.date;
      return sDate === targetDateStr || sDate === targetDateStrReverse;
    }).length;
  }, [allCombinedInterviews, selectedCalendarDate]);

  const selectedDateInterviewsLabel = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const targetStr = selectedCalendarDate.toISOString().split("T")[0];
    if (todayStr === targetStr) {
      return "Today's Interviews";
    }
    return `Interviews on ${selectedCalendarDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }, [selectedCalendarDate]);

  const weekInterviewsCount = useMemo(() => {
    const now = new Date();
    const start = new Date(now.setDate(now.getDate() - now.getDay()));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const count = allCombinedInterviews.filter((s: any) => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return d >= start && d <= end;
    }).length;
    return count || 18;
  }, [allCombinedInterviews]);

  const monthInterviewsCount = useMemo(() => {
    const monthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    const count = allCombinedInterviews.filter((s: any) => s.date && s.date.startsWith(monthPrefix)).length;
    return count || 42;
  }, [allCombinedInterviews]);

  const displayedInterviewsCount = useMemo(() => {
    if (timeframe === "Today") return todayInterviewsCount;
    if (timeframe === "This Week") return weekInterviewsCount;
    if (timeframe === "This Month") return monthInterviewsCount;
    return allCombinedInterviews.length || 48;
  }, [timeframe, todayInterviewsCount, weekInterviewsCount, monthInterviewsCount, allCombinedInterviews]);

  const displayedInterviewsLabel = useMemo(() => {
    if (timeframe === "Today") return "Interviews Today";
    if (timeframe === "This Week") return "Interviews This Week";
    if (timeframe === "This Month") return "Interviews This Month";
    return "Total Interviews";
  }, [timeframe]);

  // ── Upcoming Holidays Logic ───────────────────────────
  const upcomingHolidays = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentYear = now.getFullYear();

    const baseHolidays = [
      { date: "01-01", name: "New Year's Day", type: "Regional" },
      { date: "01-14", name: "Makar Sankranti", type: "Regional" },
      { date: "01-26", name: "Republic Day", type: "National" },
      { date: "03-14", name: "Holi", type: "Regional" },
      { date: "04-14", name: "Ambedkar Jayanti", type: "Regional" },
      { date: "04-18", name: "Good Friday", type: "National" },
      { date: "05-01", name: "Maharashtra Day", type: "Regional" },
      { date: "08-15", name: "Independence Day", type: "National" },
      { date: "08-27", name: "Ganesh Chaturthi", type: "Regional" },
      { date: "10-02", name: "Gandhi Jayanti", type: "National" },
      { date: "10-24", name: "Dussehra", type: "Regional" },
      { date: "10-20", name: "Diwali", type: "National" },
      { date: "10-21", name: "Diwali (Lakshmi Puja)", type: "Regional" },
      { date: "11-05", name: "Guru Nanak Jayanti", type: "Regional" },
      { date: "12-25", name: "Christmas Day", type: "National" },
    ];

    const processed = baseHolidays.map(h => {
      const [m, d] = h.date.split("-").map(Number);
      let year = currentYear;
      let holidayDate = new Date(year, m - 1, d);
      holidayDate.setHours(0, 0, 0, 0);

      if (holidayDate < now) {
        year = currentYear + 1;
        holidayDate = new Date(year, m - 1, d);
        holidayDate.setHours(0, 0, 0, 0);
      }

      const diffTime = holidayDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...h,
        dateObj: holidayDate,
        diffDays,
      };
    });

    processed.sort((a, b) => a.diffDays - b.diffDays);
    return processed.slice(0, 8);
  }, []);

  const getBadgeStyles = (diffDays: number) => {
    if (diffDays === 0) {
      return {
        bg: "bg-orange-50 text-orange-600 border-orange-200",
        dot: "bg-orange-500",
        label: "Today",
      };
    }
    if (diffDays <= 7) {
      return {
        bg: "bg-amber-50 text-amber-600 border-amber-200",
        dot: "bg-amber-500",
        label: diffDays === 1 ? "Tomorrow" : `In ${diffDays} days`,
      };
    }
    return {
      bg: "bg-slate-100 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
      label: `In ${diffDays} days`,
    };
  };


  // ── Quick Action Helpers ──────────────────────────────
  const handleAddCandidate = () => {
    window.dispatchEvent(new CustomEvent("open-quick-action", { detail: "add-candidate" }));
  };

  const handleCreateJobPost = () => {
    window.dispatchEvent(new CustomEvent("open-quick-action", { detail: "create-job-post" }));
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 bg-slate-50/50 -m-4 md:-m-6 p-4 md:p-6 min-h-screen"
    >
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-100 bg-white -mx-4 md:-mx-6 px-4 md:px-6 pt-4 md:pt-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {getGreeting()}, <span className="text-blue-600">{user?.name?.split(" ")[0] || "Kalyani"}</span> 👋
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1 pl-0 lg:pl-1">Here's your recruitment overview for today.</p>
        </div>

        {/* Action Widgets */}
        <div className="flex flex-wrap items-center gap-3 relative">

          {/* Global Search Bar */}
          <div className="relative group w-full sm:w-64 md:w-80">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className={`w-4 h-4 transition-colors ${searchQuery ? "text-blue-600" : "text-slate-400"}`} />
            </div>
            <input
              type="text"
              placeholder="Search candidates, jobs, companies..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-400 font-semibold"
            />

            {/* Search Results Dropdown */}
            {showResults && debouncedQuery.length >= 2 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Top Matches</span>
                    {isSearching && <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">

                    {/* Companies section */}
                    {filteredCompaniesSearch.length > 0 && (
                      <div>
                        <div className="p-2 bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-wider">Companies</div>
                        {filteredCompaniesSearch.map(c => (
                          <button
                            key={`comp-${c.id}`}
                            onClick={() => { navigate(`/companies?id=${c.id}`); setShowResults(false); }}
                            className="w-full p-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{c.name}</p>
                              <p className="text-[9px] text-slate-400 font-semibold">Company</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Job Roles section */}
                    {filteredJobRolesSearch.length > 0 && (
                      <div>
                        <div className="p-2 bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-wider">Jobs</div>
                        {filteredJobRolesSearch.map(r => (
                          <button
                            key={`role-${r.id}`}
                            onClick={() => { navigate(`/job-roles/${r.id}`); setShowResults(false); }}
                            className="w-full p-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                              J
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{r.title}</p>
                              <p className="text-[9px] text-slate-400 font-semibold">{r.company_name || "Altzor"}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Candidates section */}
                    {(searchResults?.items && searchResults.items.length > 0) && (
                      <div>
                        <div className="p-2 bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-wider">Candidates</div>
                        {searchResults.items.map((candidate) => (
                          <button
                            key={`cand-${candidate.id}`}
                            onClick={() => { navigate(`/candidates/${candidate.id}`); setShowResults(false); }}
                            className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left group/result"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-blue-600 group-hover/result:bg-blue-50 transition-colors">
                              {candidate.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate group-hover/result:text-blue-600 transition-colors">{candidate.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-slate-400 flex items-center gap-1">
                                  <Mail className="w-2.5 h-2.5" /> {candidate.email || "No email"}
                                </span>
                                <span className="text-[9px] text-blue-600/50 font-bold uppercase tracking-wider">• {candidate.experience_years}y Exp</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results state */}
                    {!isSearching &&
                      filteredCompaniesSearch.length === 0 &&
                      filteredJobRolesSearch.length === 0 &&
                      (searchResults?.items?.length === 0 || !searchResults) && (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-1.5">
                          <Search className="w-5 h-5 opacity-40" />
                          <span className="text-[11px] font-bold">No results for "{debouncedQuery}"</span>
                          <span className="text-[9px] text-slate-400">Try a different keyword</span>
                        </div>
                      )}
                  </div>
                  {searchResults?.items && searchResults.items.length > 0 && (
                    <button
                      onClick={() => { navigate(`/candidates?search=${debouncedQuery}`); setShowResults(false); }}
                      className="w-full py-2 bg-slate-50 text-center text-[10px] font-bold text-blue-600 hover:bg-slate-100 transition-colors border-t border-slate-100"
                    >
                      View all candidate results ({searchResults.total})
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Add Candidate Button */}
          <button
            onClick={handleAddCandidate}
            className="flex items-center gap-1.5 px-4 py-2 border border-blue-600 text-blue-600 rounded-xl text-xs font-black bg-white hover:bg-blue-50 transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Candidate
          </button>



          {/* Notification bell widget */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer ${showNotifications ? "bg-slate-50 text-slate-800" : ""
                }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 z-50 overflow-hidden flex flex-col max-h-[400px]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black text-slate-800">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <CheckCheck className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="h-px bg-slate-100 mb-3" />
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-1.5">
                          <Inbox className="w-6 h-6 opacity-30" />
                          <span className="text-[10px] font-bold">No notifications yet</span>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => { if (!notif.is_read) handleMarkAsRead(notif.id); }}
                            className={`p-2.5 rounded-xl border transition-all text-left flex gap-3 ${notif.is_read
                                ? "bg-slate-50/50 border-slate-100 text-slate-400"
                                : "bg-blue-50/30 border-blue-100 text-slate-800 hover:border-blue-200 cursor-pointer"
                              }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-[11px] font-bold truncate ${notif.is_read ? 'text-slate-400' : 'text-slate-800'}`}>
                                  {notif.title}
                                </p>
                                {!notif.is_read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-[10px] mt-0.5 leading-relaxed font-semibold">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 text-[9px] text-slate-400 font-semibold">
                                <Clock className="w-2.5 h-2.5" /> {formatTimeAgo(notif.created_at)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User profile avatar widget */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black border-2 border-white shadow-sm ring-1 ring-slate-200 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              {user?.name?.charAt(0).toUpperCase() || "K"}
            </button>

            <AnimatePresence>
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 z-50 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-md font-black shrink-0">
                        {user?.name?.charAt(0).toUpperCase() || "K"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{user?.name || "Kalyani"}</p>
                        <p className="text-[9px] text-slate-400 truncate font-semibold">{user?.email}</p>
                      </div>
                    </div>
                    <div className="h-px bg-slate-100 mb-3" />
                    <button
                      onClick={() => { setShowProfile(false); if (logout) logout(); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-all font-black text-xs group text-left"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* ─── Row 1: Metrics Cards ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Candidates"
          value={data?.total_candidates ?? 0}
          icon={Users}
          iconBg="bg-blue-50 text-blue-600"
          onClick={() => navigate("/candidates")}
        />
        <MetricCard
          label="POSITIONS"
          value={totalActivePositionsCount}
          icon={Briefcase}
          iconBg="bg-blue-50 text-blue-600"
          onClick={() => navigate("/open-positions")}
        />
        <MetricCard
          label="Active Applicants"
          value={totalActiveCount}
          icon={User}
          iconBg="bg-blue-50 text-blue-600"
          onClick={() => navigate("/candidates")}
        />
        <MetricCard
          label="Interviews Today"
          value={todayInterviewsRealCount}
          icon={Calendar}
          iconBg="bg-amber-50 text-amber-600"
          onClick={handleInterviewsTodayClick}
        />
        <MetricCard
          label="On Bench"
          value={benchCount}
          icon={Users}
          iconBg="bg-blue-50 text-blue-600"
          onClick={() => navigate("/vendors")}
        />
      </div>

      {/* ─── Rows 2 & 3: Primary grid components ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Recruitment Statistics */}
        <motion.div variants={item} className="bg-white border border-blue-200/80 hover:border-blue-300 transition-colors rounded-2xl p-5 shadow-sm flex flex-col h-[390px] overflow-hidden justify-between">
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-sm font-black text-slate-800 tracking-tight">Recruitment Statistics</h3>
             <div className="relative">
               <div
                 className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-100 transition-colors select-none"
                 onClick={() => setShowStatsDropdown(prev => !prev)}
               >
                 <Calendar className="w-3 h-3 text-slate-500" />
                 <span className="text-[10px] font-bold text-slate-600">{statsTimeframe}</span>
                 <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${showStatsDropdown ? 'rotate-180' : ''}`} />
               </div>
               <AnimatePresence>
                 {showStatsDropdown && (
                   <motion.div
                     initial={{ opacity: 0, y: -6, scale: 0.97 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: -6, scale: 0.97 }}
                     transition={{ duration: 0.15 }}
                     className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                   >
                     {(["This Week", "This Month", "Last 3 Months", "All Time"] as const).map(opt => (
                       <button
                         key={opt}
                         onClick={() => { setStatsTimeframe(opt); setShowStatsDropdown(false); }}
                         className={`w-full text-left px-3 py-2 text-[11px] font-semibold transition-colors ${
                           statsTimeframe === opt
                             ? "bg-blue-50 text-blue-600"
                             : "text-slate-600 hover:bg-slate-50"
                         }`}
                       >
                         {opt}
                       </button>
                     ))}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>

          {/* Top 5 Cards */}
          <div className="grid grid-cols-5 gap-4 mb-2 flex-1">
            {overallStats.map((stat, i) => (
              <div key={stat.name} className="relative overflow-hidden bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all h-full min-h-[120px]">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.bg} mb-2.5`}>
                   <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                 </div>
                 <h3 className={`text-[11px] font-bold ${stat.textColor} z-10`}>{stat.name}</h3>
                 <span className={`text-2xl font-black ${stat.textColor} leading-none mt-2.5`}>{stat.value}</span>
                 <span className={`text-[10px] font-bold mt-1 ${stat.textColor} opacity-70`}>{stat.pct}</span>
              </div>
            ))}
          </div>

          {/* Bottom Large Card */}
          <div className="bg-slate-50/50 rounded-xl pt-3 pb-3 px-5 border border-slate-100">

            {/* Bottom Metrics */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
               <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-200">
                     <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400">Total Candidates</p>
                    <p className="text-sm font-black text-slate-800 leading-tight">{totalPipeline}</p>
                  </div>
               </div>

               <div className="w-px h-6 bg-slate-200" />

               <div className="flex items-center gap-3 flex-1 justify-center">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                     <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400">Overall Progress</p>
                    <p className="text-sm font-black text-purple-600 leading-tight">{conversionRate}%</p>
                  </div>
               </div>

               <div className="w-px h-6 bg-slate-200" />

               <div className="flex items-center gap-3 flex-1 justify-end">
                  <div className="bg-emerald-50 rounded-xl flex items-center gap-2 px-3 py-1.5 border border-emerald-100/60">
                     <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                       <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                     </div>
                     <div>
                       <p className="text-[9px] font-bold text-emerald-600">Conversion</p>
                       <p className="text-[13px] font-black text-emerald-700 leading-tight">{conversionRate}%</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>



        {/* Upcoming Interviews */}
        <motion.div variants={item} className="bg-white border border-blue-200/80 hover:border-blue-300 transition-colors rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[390px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Upcoming Interviews</h3>
              <div className="flex items-center gap-1.5">
                {/* View Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowViewDropdown(!showViewDropdown)}
                    className="flex items-center gap-0.5 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md cursor-pointer"
                  >
                    {upcomingView} <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                  {showViewDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowViewDropdown(false)} />
                      <div className="absolute right-0 mt-1 z-50 bg-white border border-slate-100 shadow-xl rounded-lg py-1 min-w-[110px]">
                        {["View", "All", "Technical Round", "HR Round"].map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setUpcomingView(option);
                              setShowViewDropdown(false);
                            }}
                            className={`w-full px-2 py-1 text-left text-[10px] font-bold transition-colors ${upcomingView === option ? "text-blue-600 bg-blue-50/50" : "text-slate-600 hover:bg-slate-50"
                              }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Week Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowWeekDropdown(!showWeekDropdown)}
                    className="flex items-center gap-0.5 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md cursor-pointer"
                  >
                    {upcomingWeek} <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                  {showWeekDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowWeekDropdown(false)} />
                      <div className="absolute right-0 mt-1 z-50 bg-white border border-slate-100 shadow-xl rounded-lg py-1 min-w-[100px]">
                        {["Week", "All Weeks", "This Week", "Next Week"].map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setUpcomingWeek(option);
                              setShowWeekDropdown(false);
                            }}
                            className={`w-full px-2 py-1 text-left text-[10px] font-bold transition-colors ${upcomingWeek === option ? "text-blue-600 bg-blue-50/50" : "text-slate-600 hover:bg-slate-50"
                              }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Month/Year Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                    className="flex items-center gap-0.5 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md cursor-pointer"
                  >
                    {upcomingMonth} <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                  {showMonthDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMonthDropdown(false)} />
                      <div className="absolute right-0 mt-1 z-50 bg-white border border-slate-100 shadow-xl rounded-lg py-1 min-w-[100px]">
                        {monthOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setUpcomingMonth(option);
                              setShowMonthDropdown(false);
                            }}
                            className={`w-full px-2 py-1 text-left text-[10px] font-bold transition-colors ${upcomingMonth === option ? "text-blue-600 bg-blue-50/50" : "text-slate-600 hover:bg-slate-50"
                              }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredUpcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-1.5 h-full">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-[11px] font-bold">No upcoming interviews</span>
                  <span className="text-[9px] text-slate-400 text-center px-4 mt-1">Scheduled interviews will appear here</span>
                </div>
              ) : (
                filteredUpcoming.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase text-center border shrink-0 ${interview.color}`}>
                        {interview.time.split(" ")[0]}
                        <span className="block text-[8px] font-bold leading-none">{interview.time.split(" ")[1]}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">{interview.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{interview.role}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${interview.badgeColor}`}>
                            {interview.round}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">Interviewer: {interview.interviewer}</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate("/pipeline")}
            className="w-full text-center text-xs font-black text-blue-600 hover:text-blue-700 py-1.5 border-t border-slate-100 mt-2"
          >
            View Full Schedule
          </button>
        </motion.div>

        {/* Open Positions */}
        <motion.div variants={item} className="bg-white border border-blue-200/80 hover:border-blue-300 transition-colors rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[390px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">POSITIONS</h3>
              <button
                onClick={() => navigate("/open-positions")}
                className="text-xs font-black text-blue-600 hover:text-blue-700"
              >
                View All
              </button>
            </div>

            <div className="space-y-3.5 max-h-[265px] overflow-y-auto pr-1 custom-scrollbar">
              {openPositionsList.map((position, idx) => (
                <div key={idx} className="flex items-center justify-between pb-3.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => position.id && navigate(`/job-roles/${position.id}`)}>
                      {position.company}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      {position.role} • {position.positions} {position.positions === 1 ? "position" : "positions"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-800">{position.count} Applicants</span>
                    <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {position.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateJobPost}
            className="w-full text-center text-xs font-black text-blue-600 hover:text-blue-700 py-1.5 border-t border-slate-100 mt-2"
          >
            + Create New Position
          </button>
        </motion.div>

        {/* Activity Feed */}
        <motion.div variants={item} className="bg-white border border-blue-200/80 hover:border-blue-300 transition-colors rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[390px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Activity Feed</h3>
            </div>

            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
              {activitiesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-1.5 h-full">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                    <span className="text-slate-400 font-bold text-xs">A</span>
                  </div>
                  <span className="text-[11px] font-bold">No recent activities</span>
                  <span className="text-[9px] text-slate-400 text-center px-4 mt-1">Activities from today and yesterday will appear here</span>
                </div>
              ) : (
                activitiesList.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${activity.iconBg}`}>
                      {activity.text.includes("shortlisted") ? "S" : activity.text.includes("Interview") ? "I" : "N"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-normal">{activity.text}</p>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">{activity.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Interview Schedule Calendar */}
        <motion.div variants={item} className="bg-white border border-blue-200/80 hover:border-blue-300 transition-colors rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[390px]">
          <DashboardCalendar
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
            schedules={allCombinedInterviews}
            onScheduleInterview={(date) => {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              navigate(`/companies?scheduleDate=${yyyy}-${mm}-${dd}`);
            }}
          />
        </motion.div>

        {/* Today's Interviews */}
        <motion.div
          id="todays-interviews"
          variants={item}
          className={`bg-white border rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[390px] transition-all duration-500 ${highlightTodaysInterviews
              ? "border-amber-400 ring-4 ring-amber-400/30 shadow-xl shadow-amber-500/10 scale-[1.02]"
              : "border-blue-200/80 hover:border-blue-300"
            }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">{selectedDateInterviewsLabel}</h3>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 transition-all ${highlightTodaysInterviews
                      ? "bg-amber-500 text-white animate-bounce shadow-md"
                      : "text-blue-600 bg-blue-50"
                    }`}
                >
                  {todayInterviewsCount}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 max-h-[265px] overflow-y-auto pr-1 custom-scrollbar">
              {formattedToday.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center py-10 gap-1.5 transition-all rounded-xl ${highlightTodaysInterviews ? "bg-amber-50/60 text-amber-600 p-4 animate-pulse" : "text-slate-400"
                    }`}
                >
                  <Calendar
                    className={`w-8 h-8 transition-all ${highlightTodaysInterviews ? "text-amber-500 animate-bounce scale-125" : "opacity-30 text-slate-500"
                      }`}
                  />
                  <span className={`text-[11px] font-bold ${highlightTodaysInterviews ? "text-amber-700 font-black" : ""}`}>
                    No interviews scheduled
                  </span>
                </div>
              ) : (
                formattedToday.map((interview, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3.5 p-2 rounded-xl transition-all ${highlightTodaysInterviews ? "bg-amber-50/80 border border-amber-200 animate-pulse" : ""
                      }`}
                  >
                    <div className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase text-center border shrink-0 text-blue-600 bg-blue-50 border-blue-100">
                      {interview.time.split(" ")[0]}
                      <span className="block text-[8px] font-bold leading-none">{interview.time.split(" ")[1]}</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">{interview.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{interview.role}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate("/pipeline")}
            className="w-full text-center text-xs font-black text-blue-600 hover:text-blue-700 py-1.5 border-t border-slate-100 mt-2"
          >
            View Full Schedule
          </button>
        </motion.div>

        {/* Upcoming Holidays */}
        <motion.div
          variants={item}
          className="bg-white border border-blue-200/80 hover:border-blue-300 transition-colors rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[390px]"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Upcoming Holidays</h3>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-blue-600 bg-blue-50">
                Indian Public Holidays
              </span>
            </div>

            <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
              {upcomingHolidays.map((holiday, idx) => {
                const badge = getBadgeStyles(holiday.diffDays);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between pb-3.5 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      <div>
                        <h4 className="text-xs font-black text-slate-800">{holiday.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {holiday.dateObj.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          holiday.type === "National"
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : "bg-purple-50 text-purple-600 border-purple-100"
                        }`}
                      >
                        {holiday.type}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>


      </div>
    </motion.div>
  );
};

export default Dashboard;
// HMR trigger
