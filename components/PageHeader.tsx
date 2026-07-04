import Link from "next/link";

export function PageHeader({
  title,
  breadcrumb = [],
  action,
}: {
  title: string;
  breadcrumb?: string[];
  action?: { href: string; label: string };
}) {
  return (
    <div className="sticky top-0 z-10 -mx-8 -mt-8 mb-6 flex items-center justify-between border-b border-slate-200 bg-white/90 px-8 py-4 backdrop-blur">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
          <span>⌂</span>
          {["Dashboard", ...breadcrumb].map((c, i, arr) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className={i === arr.length - 1 ? "text-slate-600" : ""}>
                {c}
              </span>
              {i < arr.length - 1 && <span>/</span>}
            </span>
          ))}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50">
          <span className="relative">
            ⌾
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-teal-500" />
          </span>
        </button>
        <Link
          href="/settings"
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
        >
          ⚙
        </Link>
        {action && (
          <Link
            href={action.href}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600"
          >
            <span className="text-base leading-none">＋</span>
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
