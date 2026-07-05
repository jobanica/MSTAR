// PrintOSph brand mark + wordmark, recreated as SVG so it stays crisp
// at any size and adapts to light/dark backgrounds.

const NAVY = "#16223B";
const BLUE = "#4A78EC";
const ORANGE = "#F07C34";

export function LogoMark({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 40" className={className} fill="none" aria-hidden>
      <rect x="1" y="17" width="26" height="20" rx="5" fill={ORANGE} />
      <rect x="8.5" y="10" width="26" height="20" rx="5" fill={BLUE} />
      <rect x="16" y="3" width="26" height="20" rx="5" fill={NAVY} />
    </svg>
  );
}

export function Logo({
  onDark = false,
  className = "",
  markClassName = "h-8 w-auto",
}: {
  onDark?: boolean;
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="text-xl font-extrabold tracking-tight">
        <span style={{ color: onDark ? "#ffffff" : NAVY }}>Print</span>
        <span style={{ color: ORANGE }}>OS</span>
        <span className="text-[0.8em] font-bold text-slate-400">ph</span>
      </span>
    </span>
  );
}
