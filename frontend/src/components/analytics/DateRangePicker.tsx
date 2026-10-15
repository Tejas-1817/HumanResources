import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  format,
  subMonths,
  subDays,
  startOfYear,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isAfter,
  isBefore,
  addMonths,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from "lucide-react";

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onApply: (range: DateRange) => void;
  onClear: () => void;
  className?: string;
  defaultLabel?: string;
  iconOnly?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  onApply,
  onClear,
  className = "",
  defaultLabel = "Last 6 Months",
  iconOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Temporary selection state inside popover before clicking Apply
  const [tempRange, setTempRange] = useState<DateRange>(value);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Viewing month in the calendar
  const [viewDate, setViewDate] = useState<Date>(() => {
    return value.endDate || new Date();
  });

  // Sync temp range when value prop changes or popover opens
  useEffect(() => {
    if (isOpen) {
      setTempRange(value);
      if (value.endDate) {
        setViewDate(value.endDate);
      } else {
        setViewDate(new Date());
      }
    }
  }, [isOpen, value]);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Calendar month days calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const startDayOfWeek = monthStart.getDay(); // 0 is Sunday
    const daysInMonth = monthEnd.getDate();

    const days: (Date | null)[] = [];
    // Padding before 1st of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
    }
    return days;
  }, [viewDate]);

  const handleDateClick = (date: Date) => {
    if (!tempRange.startDate || (tempRange.startDate && tempRange.endDate)) {
      // First click: set start date, clear end date
      setTempRange({ startDate: date, endDate: null });
    } else {
      // Second click: set end date
      if (isBefore(date, tempRange.startDate)) {
        // Clicked date is earlier, so swap
        setTempRange({ startDate: date, endDate: tempRange.startDate });
      } else {
        setTempRange({ startDate: tempRange.startDate, endDate: date });
      }
    }
  };

  const handlePresetSelect = (preset: "last30" | "last3m" | "last6m" | "thisYear") => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (preset === "last30") {
      start = subDays(now, 30);
    } else if (preset === "last3m") {
      start = subMonths(now, 3);
    } else if (preset === "last6m") {
      start = subMonths(now, 6);
    } else {
      start = startOfYear(now);
    }

    setTempRange({ startDate: start, endDate: end });
    setViewDate(end);
  };

  const handleApply = () => {
    onChange(tempRange);
    onApply(tempRange);
    setIsOpen(false);
  };

  const handleClear = () => {
    const now = new Date();
    const default6m = {
      startDate: subMonths(now, 5),
      endDate: now,
    };
    setTempRange(default6m);
    onClear();
    setIsOpen(false);
  };

  const displayText = useMemo(() => {
    if (value.startDate && value.endDate) {
      return `${format(value.startDate, "MMM dd, yyyy")} – ${format(value.endDate, "MMM dd, yyyy")}`;
    }
    if (value.startDate) {
      return `From ${format(value.startDate, "MMM dd, yyyy")}`;
    }
    return defaultLabel;
  }, [value, defaultLabel]);

  // Check if a date falls inside the current or hovered range
  const isInRange = (date: Date) => {
    const start = tempRange.startDate;
    const end = tempRange.endDate || hoverDate;
    if (!start || !end) return false;

    const actualStart = isBefore(start, end) ? start : end;
    const actualEnd = isAfter(start, end) ? start : end;

    return (
      (isAfter(date, actualStart) || isSameDay(date, actualStart)) &&
      (isBefore(date, actualEnd) || isSameDay(date, actualEnd))
    );
  };

  const isSelectedStart = (date: Date) => {
    return tempRange.startDate ? isSameDay(date, tempRange.startDate) : false;
  };

  const isSelectedEnd = (date: Date) => {
    return tempRange.endDate ? isSameDay(date, tempRange.endDate) : false;
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* ─── Single Date-Range Trigger: Icon-only or Input Display Field ─── */}
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 relative flex items-center justify-center cursor-pointer"
          title={`Filter by date: ${displayText}`}
          aria-label="Filter by date range"
        >
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          {value.startDate && value.endDate && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 h-9 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
          title="Select date range"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate max-w-[210px] sm:max-w-none">{displayText}</span>
          {value.startDate && value.endDate && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-1 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Reset to default"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      )}

      {/* ─── Calendar Popover ─── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-[310px] sm:w-[340px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-[11px] font-medium custom-scrollbar">
            <button
              type="button"
              onClick={() => handlePresetSelect("last30")}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect("last3m")}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap"
            >
              Last 3 Mo
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect("last6m")}
              className="px-2 py-1 rounded-lg bg-primary/15 text-primary font-bold hover:bg-primary/20 transition-colors whitespace-nowrap"
            >
              Last 6 Mo
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect("thisYear")}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap"
            >
              This Year
            </button>
          </div>

          {/* Month Header Navigation with Close Option */}
          <div className="flex items-center justify-between pt-3 pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewDate((prev) => subMonths(prev, 1))}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {format(viewDate, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => setViewDate((prev) => addMonths(prev, 1))}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Close filter"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="h-7 w-7" />;
              }

              const isStart = isSelectedStart(date);
              const isEnd = isSelectedEnd(date);
              const inRange = isInRange(date);
              const isToday = isSameDay(date, new Date());

              let btnClass = "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";
              if (isStart || isEnd) {
                btnClass = "bg-primary text-white font-bold shadow-sm";
              } else if (inRange) {
                btnClass = "bg-primary/15 dark:bg-primary/25 text-primary font-semibold rounded-none";
              }

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  onMouseEnter={() => {
                    if (tempRange.startDate && !tempRange.endDate) {
                      setHoverDate(date);
                    }
                  }}
                  className={`h-7 w-full rounded-lg text-xs flex items-center justify-center transition-all ${btnClass} ${
                    isToday && !isStart && !isEnd ? "ring-1 ring-primary/40 font-bold" : ""
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Selected Range Summary */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>
              {tempRange.startDate
                ? tempRange.endDate
                  ? `${format(tempRange.startDate, "MMM d")} – ${format(tempRange.endDate, "MMM d, yyyy")}`
                  : `Start: ${format(tempRange.startDate, "MMM d, yyyy")}`
                : "Select start & end date"}
            </span>
          </div>

          {/* Action Buttons: Close, Clear, and Apply */}
          <div className="mt-2 pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!tempRange.startDate}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
