export const Logo = ({ className = "w-5 h-5", glow = false }: { className?: string, glow?: boolean }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {glow && (
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      )}
      
      <g filter={glow ? "url(#glow)" : undefined}>
        {/* Abstract Triangle/Molecule Base */}
        <path d="M50 20 L35 50 L65 50 Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
        <path d="M35 50 L20 80 L50 80 Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
        <path d="M65 50 L50 80 L80 80 Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
        
        {/* Spheres */}
        <circle cx="50" cy="20" r="10" fill="currentColor" />
        <circle cx="35" cy="50" r="10" fill="currentColor" />
        <circle cx="65" cy="50" r="10" fill="currentColor" />
        <circle cx="20" cy="80" r="10" fill="currentColor" />
        <circle cx="50" cy="80" r="10" fill="currentColor" />
        <circle cx="80" cy="80" r="10" fill="currentColor" />
      </g>
    </svg>
  );
};
