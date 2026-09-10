import React from "react";

interface TableDataCellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable data cell container that strictly enforces:
 * - Natural word wrapping at spaces/hyphens
 * - Never breaks words in the middle of letters (word-break: normal)
 * - Safe overflow wrapping (overflow-wrap: break-word)
 * - white-space: normal
 * - Does not truncate with '...' or allow text to overflow into neighboring columns
 */
export const TableDataCell: React.FC<TableDataCellProps> = ({
  children,
  className = "",
  style,
  ...props
}) => {
  return (
    <div
      className={`min-w-0 cell-text-wrap text-xs font-bold text-foreground leading-snug ${className}`}
      style={{
        whiteSpace: "normal",
        wordBreak: "normal",
        overflowWrap: "break-word",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

interface TableDataCellWithIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  text: React.ReactNode;
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  title?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable cell pairing an icon with wrapping text.
 * The icon stays aligned at the top (items-start mt-0.5) when text wraps onto multiple lines.
 */
export const TableDataCellWithIcon: React.FC<TableDataCellWithIconProps> = ({
  icon,
  text,
  className = "",
  textClassName = "",
  iconClassName = "text-primary opacity-60",
  title,
  style,
  ...props
}) => {
  return (
    <div
      className={`flex items-start gap-2 min-w-0 ${className}`}
      title={title}
      style={style}
      {...props}
    >
      <span className={`shrink-0 mt-0.5 ${iconClassName}`}>
        {icon}
      </span>
      <span
        className={`cell-text-wrap text-xs font-bold text-foreground leading-snug ${textClassName}`}
        style={{
          whiteSpace: "normal",
          wordBreak: "normal",
          overflowWrap: "break-word",
        }}
      >
        {text}
      </span>
    </div>
  );
};

interface SourceBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  source: string;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable Source badge that wraps multi-word source names (e.g. "Hindustan DigiSoft")
 * gracefully onto multiple lines without breaking words or distorting.
 */
export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  icon,
  className = "",
  style,
  ...props
}) => {
  return (
    <div className="flex justify-center min-w-0 w-full">
      <div
        className={`inline-flex items-start gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 border border-border text-[11px] font-semibold text-muted-foreground cell-text-wrap text-left max-w-full ${className}`}
        title={source}
        style={{
          whiteSpace: "normal",
          wordBreak: "normal",
          overflowWrap: "break-word",
          ...style,
        }}
        {...props}
      >
        {icon && <span className="shrink-0 mt-0.5 opacity-60">{icon}</span>}
        <span
          className="cell-text-wrap leading-tight"
          style={{
            whiteSpace: "normal",
            wordBreak: "normal",
            overflowWrap: "break-word",
          }}
        >
          {source}
        </span>
      </div>
    </div>
  );
};

/**
 * Formats a job role title for clean, natural multi-line display:
 * - If the title has a hyphenated client/role prefix (e.g. "Magnifact-Lead Data Engineer-1"),
 *   splits cleanly into:
 *     Line 1: "Magnifact-Lead"
 *     Line 2: "Data Engineer-1"
 * - If the title has "Company - Role", splits into logical lines.
 * - Enforces word-break: normal and overflow-wrap: break-word so words are NEVER split mid-letter.
 */
export const formatJobRoleTitle = (title: string | null | undefined): React.ReactNode => {
  if (!title) return title || "";

  const trimmed = title.trim();

  // Pattern 1: Hyphenated prefix followed by space and words (e.g. "Magnifact-Lead Data Engineer-1")
  const match = trimmed.match(/^([^\s]+-[^\s]+)\s+(.+)$/);
  if (match) {
    return (
      <span className="inline-block leading-snug">
        <span className="block font-bold text-foreground">{match[1]}</span>
        <span className="block font-medium text-muted-foreground">{match[2]}</span>
      </span>
    );
  }

  // Pattern 2: "Company - Role" or "Prefix - Role" (e.g. "VCreaTek - Sr. System Analyst")
  const dashMatch = trimmed.match(/^([^-]+)\s*-\s*(.+)$/);
  if (dashMatch && dashMatch[1].length <= 20) {
    return (
      <span className="inline-block leading-snug">
        <span className="block font-bold text-foreground">{dashMatch[1].trim()}</span>
        <span className="block font-medium text-muted-foreground">{dashMatch[2].trim()}</span>
      </span>
    );
  }

  return trimmed;
};

interface TableActionViewButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  className?: string;
}

/**
 * Reusable Action View Button that displays ONLY the View icon (no text)
 * with accessible title/tooltip and keyboard accessibility.
 */
export const TableActionViewButton: React.FC<TableActionViewButtonProps> = ({
  onClick,
  title = "View",
  className = "",
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all inline-flex items-center justify-center shadow-xs group/view cursor-pointer ${className}`}
      title={title}
      aria-label={title}
      {...props}
    >
      <svg
        className="w-3.5 h-3.5 group-hover/view:scale-110 transition-transform"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    </button>
  );
};
