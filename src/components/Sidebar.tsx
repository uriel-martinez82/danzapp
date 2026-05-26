"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

const navItems = [
  { href: "/dashboard", icon: "ti-home", label: "Dashboard" },
  { href: "/dashboard/alumnos", icon: "ti-users", label: "Alumnos" },
  { href: "/dashboard/clases", icon: "ti-calendar", label: "Clases" },
  { href: "/dashboard/comunicados", icon: "ti-bell", label: "Comunicados" },
  { href: "/dashboard/pagos", icon: "ti-credit-card", label: "Pagos" },
];

const roleLabels: Record<string, string> = {
  admin: "Admin",
  teacher: "Profesor",
  student: "Alumno",
};

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-[#FF3D5E18] text-[#CC1F3C]",
  teacher: "bg-[#1D9E7518] text-[#0A5E44]",
  student: "bg-[#378ADD18] text-[#0C447C]",
};

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen flex flex-col bg-[var(--color-dark)] shrink-0">
      <div className="px-6 py-8 border-b border-white/10">
        <div
          className="text-white text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Pas<span className="text-[var(--color-accent)]">a</span>da
        </div>
        <div className="text-white/30 text-xs tracking-widest uppercase mt-1">
          gestión de danza
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-accent)] text-white font-medium"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <i className={`ti ${item.icon} text-lg`} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-5 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {user.firstName?.[0] ?? user.email[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">
              {user.firstName
                ? `${user.firstName} ${user.lastName}`
                : user.email}
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeStyles[user.role] ?? "bg-white/10 text-white/50"}`}
            >
              {roleLabels[user.role] ?? user.role}
            </span>
          </div>
        </div>
        <SignOutButton>
          <button className="w-full text-left text-white/30 hover:text-white/60 text-xs transition-colors flex items-center gap-2">
            <i className="ti ti-logout text-sm" aria-hidden="true" />
            Cerrar sesión
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}