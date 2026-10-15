import React, { useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import {
  getMonthlyRecruitmentTrends,
  MonthlyRecruitmentTrend,
  RecruitmentFilterParams,
} from "@/api/resumeiq";
import { DateRangePicker, DateRange } from "./DateRangePicker";

interface MonthlyRecruitmentOverviewProps {
  initialData?: MonthlyRecruitmentTrend[];
  className?: string;
}

export const MonthlyRecruitmentOverview: React.FC<MonthlyRecruitmentOverviewProps> = ({
  initialData = [],
  className = "",
}) => {
  // Single date range picker state: defaults to last 6 months
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      startDate: subMonths(now, 5),
      endDate: now,
    };
  });

  // Query parameters applied to backend API
  const [appliedParams, setAppliedParams] = useState<RecruitmentFilterParams>({
    time_period: "last_6_months",
  });

  // Month point highlight interaction (clicking a month column highlights it)
  const [selectedTrendMonth, setSelectedTrendMonth] = useState<string | null>(null);

  // ── Fetch filtered recruitment trends from backend ──
  const {
    data: trendsData = [],
    isLoading: isLoadingTrends,
    isFetching: isFetchingTrends,
    isError: isTrendsError,
    refetch,
  } = useQuery({
    queryKey: ["monthly-recruitment-trends", appliedParams],
    queryFn: () => getMonthlyRecruitmentTrends(appliedParams),
    initialData: initialData.length > 0 ? initialData : undefined,
  });

  // Normalize data ensuring active_positions, closed_positions, lost_positions exist
  const trends = useMemo(() => {
    if (!trendsData || trendsData.length === 0) return [];
    return trendsData.map((item) => ({
      ...item,
      active_positions: item.active_positions ?? item.open_positions ?? 0,
      closed_positions: item.closed_positions ?? item.hired ?? 0,
      lost_positions: item.lost_positions ?? 0,
    }));
  }, [trendsData]);

  // Handle Apply from DateRangePicker
  const handleApplyDateRange = (range: DateRange) => {
    if (range.startDate && range.endDate) {
      setAppliedParams({
        time_period: "custom",
        start_date: format(range.startDate, "yyyy-MM-dd"),
        end_date: format(range.endDate, "yyyy-MM-dd"),
      });
    }
  };

  // Handle Clear from DateRangePicker
  const handleClearDateRange = () => {
    const now = new Date();
    setDateRange({
      startDate: subMonths(now, 5),
      endDate: now,
    });
    setAppliedParams({
      time_period: "last_6_months",
    });
  };

  // Determine default highlighted points for floating badges
  const defaultHighlightMonths = useMemo(() => {
    if (!trends || trends.length === 0) {
      return { activeMonth: null, closedMonth: null, lostMonth: null };
    }

    // 1. Latest month with active positions represents current active snapshot
    const activeWithRoles = trends.filter((m) => (m.active_positions ?? 0) > 0);
    const latestActiveItem =
      activeWithRoles.length > 0 ? activeWithRoles[activeWithRoles.length - 1] : trends[trends.length - 1];
    const activeMonth = latestActiveItem?.month || null;

    // 2. Peak closed positions month
    let maxClosed = -1;
    let peakClosedMonth: string | null = null;
    trends.forEach((item) => {
      if (item && item.closed_positions > maxClosed) {
        maxClosed = item.closed_positions;
        peakClosedMonth = item.month;
      }
    });

    let closedMonth = peakClosedMonth;
    // If closedMonth overlaps with activeMonth, pick alternate month if available
    if (closedMonth === activeMonth) {
      const altClosed = [...trends].reverse().find((m) => m && m.month !== activeMonth && m.closed_positions > 0);
      if (altClosed) {
        closedMonth = altClosed.month;
      }
    }

    // 3. Peak lost positions month (if any lost positions exist)
    let maxLost = 0;
    let peakLostMonth: string | null = null;
    trends.forEach((item) => {
      if (item && item.lost_positions > maxLost) {
        maxLost = item.lost_positions;
        peakLostMonth = item.month;
      }
    });

    return { activeMonth, closedMonth, lostMonth: peakLostMonth };
  }, [trends]);

  // ── Floating Badge Dot Renderers ──

  // Active Positions: Pink (#F45B8D)
  const renderActivePositionsDot = useCallback(
    (props: any) => {
      const { cx, cy, payload, index } = props;
      if (typeof cx !== "number" || typeof cy !== "number" || isNaN(cx) || isNaN(cy) || !payload) {
        return null;
      }
      const isHighlighted =
        (selectedTrendMonth
          ? payload?.month === selectedTrendMonth
          : payload?.month === defaultHighlightMonths.activeMonth) &&
        (payload?.active_positions ?? 0) > 0;

      const isNearRightEdge = index !== undefined && trends && index >= trends.length - 1;
      const badgeOffsetX = isNearRightEdge ? -24 : 0;
      const badgeY = Math.max(16, cy - 28);

      return (
        <g key={`dot-active-${payload?.month || index}`}>
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
              <circle cx={cx} cy={cy} r={7} fill="#F45B8D" fillOpacity={0.25} />
              <g transform={`translate(${cx + badgeOffsetX}, ${badgeY})`}>
                <rect
                  x={-56}
                  y={-12}
                  width={112}
                  height={24}
                  rx={12}
                  fill="#F45B8D"
                  style={{ filter: "drop-shadow(0 3px 6px rgba(244, 91, 141, 0.45))" }}
                />
                <text
                  x={0}
                  y={3.5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight={700}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {`${payload?.active_positions ?? 0} Active Positions`}
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
    },
    [selectedTrendMonth, defaultHighlightMonths.activeMonth, trends]
  );

  // Closed Positions: Teal (#18B99A)
  const renderClosedPositionsDot = useCallback(
    (props: any) => {
      const { cx, cy, payload, index } = props;
      if (typeof cx !== "number" || typeof cy !== "number" || isNaN(cx) || isNaN(cy) || !payload) {
        return null;
      }
      const isHighlighted =
        (selectedTrendMonth
          ? payload?.month === selectedTrendMonth
          : payload?.month === defaultHighlightMonths.closedMonth) &&
        (payload?.closed_positions ?? 0) > 0;

      const isNearRightEdge = index !== undefined && trends && index >= trends.length - 1;
      const isNearLeftEdge = index === 0;
      const badgeOffsetX = isNearRightEdge ? -20 : isNearLeftEdge ? 20 : 0;
      const badgeY = Math.max(16, cy - 28);

      return (
        <g key={`dot-closed-${payload?.month || index}`}>
          {isHighlighted && (
            <>
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={250}
                stroke="#18B99A"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
                strokeWidth={1.5}
              />
              <circle cx={cx} cy={cy} r={7} fill="#18B99A" fillOpacity={0.25} />
              <g transform={`translate(${cx + badgeOffsetX}, ${badgeY})`}>
                <rect
                  x={-56}
                  y={-12}
                  width={112}
                  height={24}
                  rx={12}
                  fill="#18B99A"
                  style={{ filter: "drop-shadow(0 3px 6px rgba(24, 185, 154, 0.45))" }}
                />
                <text
                  x={0}
                  y={3.5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight={700}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {`${payload?.closed_positions ?? 0} Closed Positions`}
                </text>
              </g>
            </>
          )}
          <circle
            cx={cx}
            cy={cy}
            r={isHighlighted ? 4.5 : 3.5}
            fill="#18B99A"
            stroke="#ffffff"
            strokeWidth={isHighlighted ? 2 : 1.5}
          />
        </g>
      );
    },
    [selectedTrendMonth, defaultHighlightMonths.closedMonth, trends]
  );

  // Lost Positions: Orange (#F28C38)
  const renderLostPositionsDot = useCallback(
    (props: any) => {
      const { cx, cy, payload, index } = props;
      if (typeof cx !== "number" || typeof cy !== "number" || isNaN(cx) || isNaN(cy) || !payload) {
        return null;
      }
      const isHighlighted =
        (selectedTrendMonth
          ? payload?.month === selectedTrendMonth
          : payload?.month === defaultHighlightMonths.lostMonth) &&
        (payload?.lost_positions ?? 0) > 0;

      const badgeY = Math.max(16, cy - 28);

      return (
        <g key={`dot-lost-${payload?.month || index}`}>
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
              <circle cx={cx} cy={cy} r={7} fill="#F28C38" fillOpacity={0.25} />
              <g transform={`translate(${cx}, ${badgeY})`}>
                <rect
                  x={-48}
                  y={-12}
                  width={96}
                  height={24}
                  rx={12}
                  fill="#F28C38"
                  style={{ filter: "drop-shadow(0 3px 6px rgba(242, 140, 56, 0.45))" }}
                />
                <text
                  x={0}
                  y={3.5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight={700}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {`${payload?.lost_positions ?? 0} Lost Positions`}
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
    },
    [selectedTrendMonth, defaultHighlightMonths.lostMonth]
  );

  return (
    <div
      className={`bg-white dark:bg-card border border-border/80 rounded-3xl shadow-sm p-4 sm:p-6 min-w-0 relative ${
        className || "w-full"
      }`}
    >
      {/* ─── Card Header: Title & Subtitle + Top-Right Calendar Icon Only ─── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            Recruitment Overview
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
            Track active, closed, and lost position trends over time.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isFetchingTrends && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="hidden sm:inline">Updating...</span>
            </span>
          )}

          {/* Calendar Date-Range Picker (Icon Button in Header) */}
          <DateRangePicker
            value={dateRange}
            onChange={(newRange) => setDateRange(newRange)}
            onApply={handleApplyDateRange}
            onClear={handleClearDateRange}
            defaultLabel="Last 6 Months"
            iconOnly={true}
          />
        </div>
      </div>

      {/* ─── State Management: Loading, Error, Empty, or Chart ─── */}
      {isLoadingTrends && trends.length === 0 ? (
        <div className="h-[300px] sm:h-[350px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-slate-400 font-medium">Aggregating position metrics...</p>
        </div>
      ) : isTrendsError ? (
        <div className="h-[300px] sm:h-[350px] flex flex-col items-center justify-center gap-3 text-center p-4">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Unable to load recruitment trends
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 text-xs font-bold text-white bg-primary rounded-lg shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : trends.length === 0 ? (
        <div className="h-[300px] sm:h-[350px] flex flex-col items-center justify-center gap-2 text-center p-4">
          <TrendingUp className="w-8 h-8 text-slate-400 stroke-1" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            No recruitment position records found for this period
          </p>
          <button
            type="button"
            onClick={handleClearDateRange}
            className="text-xs text-primary font-bold hover:underline mt-1"
          >
            Reset to Last 6 Months
          </button>
        </div>
      ) : (
        <div className="h-[300px] sm:h-[350px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trends}
              margin={{ top: 38, right: 25, left: -20, bottom: 5 }}
              onClick={(state) => {
                if (state && state.activeLabel) {
                  setSelectedTrendMonth((prev) =>
                    prev === state.activeLabel ? null : state.activeLabel!
                  );
                }
              }}
            >
              <defs>
                {/* Active Positions Gradient: Pink (#F45B8D) */}
                <linearGradient id="gradientActivePositions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F45B8D" stopOpacity={0.28} />
                  <stop offset="50%" stopColor="#F45B8D" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#F45B8D" stopOpacity={0.0} />
                </linearGradient>

                {/* Closed Positions Gradient: Teal (#18B99A) */}
                <linearGradient id="gradientClosedPositions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#18B99A" stopOpacity={0.28} />
                  <stop offset="50%" stopColor="#18B99A" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#18B99A" stopOpacity={0.0} />
                </linearGradient>

                {/* Lost Positions Gradient: Orange (#F28C38) */}
                <linearGradient id="gradientLostPositions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F28C38" stopOpacity={0.24} />
                  <stop offset="50%" stopColor="#F28C38" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#F28C38" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(148, 163, 184, 0.15)"
              />

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
                      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 text-xs min-w-[210px]">
                        <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center justify-between">
                          <span>{data.full_month || label}</span>
                          <span className="text-[10px] font-semibold text-slate-400">Position Trends</span>
                        </div>
                        <div className="space-y-2">
                          {/* Active Positions */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F45B8D] shrink-0" />
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                Active Positions:
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {data.active_positions ?? 0}
                            </span>
                          </div>

                          {/* Closed Positions */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#18B99A] shrink-0" />
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                Closed Positions:
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {data.closed_positions ?? 0}
                            </span>
                          </div>

                          {/* Lost Positions */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F28C38] shrink-0" />
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                Lost Positions:
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {data.lost_positions ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* 1. Active Positions Area (Pink #F45B8D) */}
              <Area
                type="natural"
                dataKey="active_positions"
                name="Active Positions"
                stroke="#F45B8D"
                strokeWidth={2.5}
                fill="url(#gradientActivePositions)"
                dot={(props: any) => renderActivePositionsDot(props)}
                activeDot={false}
              />

              {/* 2. Closed Positions Area (Teal #18B99A) */}
              <Area
                type="natural"
                dataKey="closed_positions"
                name="Closed Positions"
                stroke="#18B99A"
                strokeWidth={2.5}
                fill="url(#gradientClosedPositions)"
                dot={(props: any) => renderClosedPositionsDot(props)}
                activeDot={false}
              />

              {/* 3. Lost Positions Area (Orange #F28C38) */}
              <Area
                type="natural"
                dataKey="lost_positions"
                name="Lost Positions"
                stroke="#F28C38"
                strokeWidth={2.5}
                fill="url(#gradientLostPositions)"
                dot={(props: any) => renderLostPositionsDot(props)}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Legend Beneath Chart ─── */}
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 pt-4 pb-1 border-t border-slate-100 dark:border-slate-800/80 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#F45B8D] shadow-xs shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            Active Positions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#18B99A] shadow-xs shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            Closed Positions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#F28C38] shadow-xs shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            Lost Positions
          </span>
        </div>
      </div>
    </div>
  );
};
