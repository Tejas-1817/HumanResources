import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, actions, className = "mb-6 md:mb-8" }: PageHeaderProps) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${className}`}>
    <div className="min-w-0">
      <h1 className="heading-lg">{title}</h1>
      {description && <p className="body-text mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">{actions}</div>}
  </div>
);
