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

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();

  const initial = user.firstName?.[0] ?? user.email[0].toUpperCase();
  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName}`
    : user.email;

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#111111",
        flexShrink: 0,
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: "28px 20px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-fraunces)",
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: "22px",
            lineHeight: 1,
            color: "white",
            letterSpacing: "-0.03em",
          }}
        >
          Pas<span style={{ color: "#FF3D5E" }}>a</span>da
        </div>
        <div
          style={{
            fontFamily: "var(--font-jakarta)",
            fontWeight: 400,
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.25)",
            marginTop: "6px",
          }}
        >
          gestión de danza
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1,
          padding: "14px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={!isActive ? "hover:text-white/70" : ""}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "10px",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "#FF3D5E" : "rgba(255,255,255,0.4)",
                background: isActive ? "rgba(255,61,94,0.12)" : "transparent",
                transition: "color 0.15s, background 0.15s",
                textDecoration: "none",
              }}
            >
              <i
                className={`ti ${item.icon}`}
                aria-hidden="true"
                style={{ fontSize: "15px", lineHeight: 1, flexShrink: 0 }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── User ── */}
      <div
        style={{
          padding: "16px 18px 20px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#FF3D5E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontFamily: "var(--font-jakarta)",
              fontWeight: 600,
              fontSize: "12px",
              color: "white",
            }}
          >
            {initial}
          </div>

          {/* Info */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-jakarta)",
                fontWeight: 400,
                fontSize: "12px",
                color: "rgba(255,255,255,0.6)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jakarta)",
                fontWeight: 400,
                fontSize: "11px",
                color: "rgba(255,255,255,0.25)",
                marginTop: "1px",
              }}
            >
              {roleLabels[user.role] ?? user.role}
            </div>
          </div>
        </div>

        <SignOutButton>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-jakarta)",
              fontWeight: 400,
              fontSize: "12px",
              color: "rgba(255,255,255,0.22)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
          >
            <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: "13px" }} />
            Cerrar sesión
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
