import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Briefcase,
  Sparkles,
  Info,
  CalendarDays
} from "lucide-react";
import { getInterviewSchedules } from "@/api/resumeiq";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const InterviewCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // ── Fetch Schedules ──────────────────────────────────
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["interview-schedules"],
    queryFn: getInterviewSchedules,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ── Date Calculations ────────────────────────────────
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayIndex = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  // Group schedules by normalized YYYY-MM-DD string
  const schedulesMap = useMemo(() => {
    const map = new Map<string, typeof schedules>();
    schedules.forEach((item) => {
      if (!item.date) return;
      let cleanDate = item.date;
      if (cleanDate.includes("T")) {
        cleanDate = cleanDate.split("T")[0];
      }
      // Ensure date format is YYYY-MM-DD
      const dateParts = cleanDate.split("-");
      if (dateParts.length === 3) {
        const y = dateParts[0];
        const m = dateParts[1].padStart(2, "0");
        const d = dateParts[2].padStart(2, "0");
        cleanDate = `${y}-${m}-${d}`;
      }
      if (!map.has(cleanDate)) {
        map.set(cleanDate, []);
      }
      map.get(cleanDate)!.push(item);
    });
    return map;
  }, [schedules]);

  // Today's formatted date string
  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Helper to format date key for any calendar day
  const getCalendarDayStr = (dayNum: number) => {
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(dayNum).padStart(2, "0");
    return `${year}-${mStr}-${dStr}`;
  };

  // Navigations
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateStr(null);
  };

  // Filtered interviews to show in details list
  const displaySchedules = useMemo(() => {
    if (selectedDateStr) {
      return schedulesMap.get(selectedDateStr) ?? [];
    }

    // Default: show today's interviews first, otherwise all future interviews
    const todayInterviews = schedulesMap.get(todayStr) ?? [];
    if (todayInterviews.length > 0) return todayInterviews;

    // Return all future interviews sorted chronologically
    return schedules
      .filter((item) => {
        let cleanDate = item.date;
        if (cleanDate.includes("T")) cleanDate = cleanDate.split("T")[0];
        return cleanDate >= todayStr;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [schedules, selectedDateStr, schedulesMap, todayStr]);

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  if (isLoading) {
    return (
      <div className="glass-card p-4 border border-border/50 h-[380px] flex flex-col items-center justify-center max-w-4xl mx-auto">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-xs text-muted-foreground animate-pulse">Loading interview schedules...</p>
      </div>
    );
  }

  return (
    <div className="glass-card border border-border/50 overflow-hidden relative max-w-4xl mx-auto">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-3xl -mr-48 -mt-48 rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
        <div>
          <h3 className="heading-md flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Interview Schedule Calendar
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Track interview pipeline schedules, interviewers, and candidates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-foreground min-w-[120px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Side: Calendar Grid */}
        <div className="lg:col-span-7 p-4 border-b lg:border-b-0 lg:border-r border-border/50">
          <div className="grid grid-cols-7 gap-1.5 mb-3 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Calendar Padding Cells */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square bg-transparent" />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = getCalendarDayStr(dayNum);
              const dayInterviews = schedulesMap.get(dateStr) ?? [];
              const hasInterviews = dayInterviews.length > 0;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDateStr(isSelected ? null : dateStr)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-between p-1 transition-all relative border group
                    ${isSelected 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/30" 
                      : isToday 
                        ? "bg-primary/10 text-primary border-primary/30 font-bold" 
                        : "bg-secondary/20 hover:bg-secondary/55 text-foreground border-transparent hover:border-border/60"
                    }`}
                >
                  <span className="text-[11px] font-bold self-start pl-1">{dayNum}</span>
                  
                  {/* Interview Bullet Indicator */}
                  {hasInterviews && (
                    <div className="flex gap-0.5 justify-center w-full mb-1">
                      {dayInterviews.slice(0, 3).map((item, itemIdx) => (
                        <div 
                          key={`dot-${item.id}-${itemIdx}`}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected 
                              ? "bg-white" 
                              : "bg-primary glow-primary"
                          }`} 
                        />
                      ))}
                      {dayInterviews.length > 3 && (
                        <span className={`text-[8px] font-bold leading-none ${
                          isSelected ? "text-white/80" : "text-primary/80"
                        }`}>
                          +
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interview Details Panel */}
        <div className="lg:col-span-5 p-4 flex flex-col h-[320px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {selectedDateStr ? `Schedules for ${new Date(selectedDateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : "Upcoming Interviews"}
            </h4>
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full border border-border">
              {displaySchedules.length} Scheduled
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {displaySchedules.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-xl"
                >
                  <CalendarIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">No interviews scheduled</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Select another date on the calendar.</p>
                </motion.div>
              ) : (
                displaySchedules.map((item, idx) => (
                  <motion.div
                    key={`sch-${item.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="p-3 rounded-xl bg-secondary/35 border border-border/50 hover:border-primary/20 transition-all flex flex-col gap-2 group/card hover:bg-secondary/55"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground truncate group-hover/card:text-primary transition-colors">
                          {item.candidate_name || "Unknown Candidate"}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-1">
                          <Briefcase className="w-2.5 h-2.5 shrink-0 text-muted-foreground/50" />
                          {item.job_role_title || "Job Post"}
                        </p>
                      </div>
                    </div>

                    <div className="h-[1px] bg-border/40" />

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{item.interviewer_name || "Interviewer"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className="w-3 h-3 text-primary/60 shrink-0" />
                        <span className="truncate font-semibold text-foreground">{item.time}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 min-w-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{item.venue || "Online / Office"}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};
