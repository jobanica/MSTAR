"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
  ),
  board: (
    <path d="M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z" />
  ),
  users: (
    <path d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM3 21a7 7 0 0118 0" />
  ),
  box: (
    <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
  ),
  doc: (
    <path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6" />
  ),
  gear: (
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0 1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.9 2 2 0 010-4 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3 1.7 1.7 0 001-1.5 2 2 0 014 0 1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.5 1 2 2 0 010 4 1.7 1.7 0 00-1.5 1z" />
  ),
  badge: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2M12 11a2 2 0 100-4 2 2 0 000 4zM8.5 17a3.5 3.5 0 017 0" />
    </>
  ),
  branch: (
    <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6M9 21h6" />
  ),
  receipt: (
    <path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />
  ),
  stack: (
    <path d="M12 2l9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />
  ),
  truck: (
    <path d="M1 6h13v11H1zM14 9h4l3 3v5h-7M5.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
  ),
  qr: (
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v6M17 20h3" />
  ),
  star: (
    <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z" />
  ),
  gift: (
    <path d="M20 12v8H4v-8M2 8h20v4H2zM12 8v12M12 8S9 3 6.5 4.5 8.5 8 12 8zM12 8s3-5 5.5-3.5S15.5 8 12 8z" />
  ),
  plug: (
    <path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 01-12 0zM12 17v5" />
  ),
  tag: (
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7.2-7.2a2 2 0 01-.6-1.4V4a1 1 0 011-1h8a2 2 0 011.4.6l7.2 7.2a2 2 0 010 2.6zM7.5 7.5h.01" />
  ),
  percent: (
    <path d="M19 5L5 19M6.5 6.5a1.5 1.5 0 100 .01M17.5 17.5a1.5 1.5 0 100 .01" />
  ),
};

export function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-teal-400/20 text-white shadow-sm"
          : "text-teal-100/80 hover:bg-white/5 hover:text-white"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {ICONS[icon]}
      </svg>
      {label}
    </Link>
  );
}
