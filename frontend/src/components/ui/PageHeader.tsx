import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, actions, className = "mb-8" }: PageHeaderProps) => (
  <div className={`flex items-start justify-between ${className}`}>
    <div>
      <h1 className="heading-lg">{title}</h1>
      {description && <p className="body-text mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);
