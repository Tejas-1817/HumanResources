export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`shimmer ${className}`} />
);

export const SkeletonCard = () => (
  <div className="glass-card p-5 space-y-4">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-32" />
  </div>
);
