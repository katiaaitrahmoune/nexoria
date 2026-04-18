"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth={1.8} fill="none" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth={1.8} fill="none" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth={1.8} fill="none" />
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth={1.8} fill="none" />
      </svg>
    ),
  },
  {
    label: "Portfolio",
    href: "/Portfolio",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth={1.8} fill="none" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        <line x1="10" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    ),
  },
   {
    label: "Sismic Simulation",
    href: "/Sismic",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">

  <line x1="2" y1="16" x2="22" y2="16" strokeLinecap="round" />

 
  <path d="M3 16c2-6 4-6 6 0s4 6 6 0 4-6 6 0" strokeLinecap="round" />

  
  <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
</svg>
    ),
  },
  {
    label: "GIS Map (RPA 99/03)",
    href: "/GIS",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" stroke="currentColor" strokeWidth={1.8} fill="none" strokeLinejoin="round" />
        <line x1="9" y1="3" x2="9" y2="18" stroke="currentColor" strokeWidth={1.8} />
        <line x1="15" y1="6" x2="15" y2="21" stroke="currentColor" strokeWidth={1.8} />
      </svg>
    ),
  },
    {
    label: "AI Recomendations",
    href: "/AI",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" stroke="currentColor" strokeWidth={1.8} fill="none" strokeLinejoin="round" />
        <line x1="9" y1="3" x2="9" y2="18" stroke="currentColor" strokeWidth={1.8} />
        <line x1="15" y1="6" x2="15" y2="21" stroke="currentColor" strokeWidth={1.8} />
      </svg>
    ),
  },
  {
    label: "Insurance Reinsurance",
    href: "/insurance",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <line x1="4" y1="20" x2="4" y2="14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        <line x1="9" y1="20" x2="9" y2="8" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        <line x1="14" y1="20" x2="14" y2="12" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        <line x1="19" y1="20" x2="19" y2="5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    ),
  },
  
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 flex flex-col bg-[#1a4a1a] text-white z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 38, height: 38, background: "#e6b800", borderRadius: 8 }}
        >
          {/* Fallback letter if no logo.svg */}
          <span className="text-[#1a4a1a] font-extrabold text-lg leading-none">G</span>
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">GAM Assurance</p>
          <p className="text-xs text-white/50 leading-tight">Risk Management</p>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold tracking-widest text-white/30 uppercase">Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={label}
              href={href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150
                ${active
                  ? "bg-[#2d7a2d] text-white"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
                }
              `}
            >
              <span className={`shrink-0 ${active ? "text-white" : "text-white/50"}`}>
                {icon}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-white/10 mt-auto">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-all duration-150 group">
          <div className="shrink-0 w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
            AM
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">Abdelhamid Mahi</p>
            <p className="text-xs text-white/45 leading-tight">Admin / Risk Mgr</p>
          </div>
          <svg
            className="w-4 h-4 text-white/35 group-hover:text-white/60 transition-colors shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </aside>
  );
}