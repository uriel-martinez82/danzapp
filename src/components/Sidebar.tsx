"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { motion } from "framer-motion";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type Scheme = {
  off:   string;
  hover: string;
  on:    string;
  text:  string;
  icon:  string;
};

const navItems: {
  href:   string;
  key:    string;
  icon:   string;
  label:  string;
  scheme: Scheme;
}[] = [
  {
    href:  "/dashboard",
    key:   "dashboard",
    icon:  "ti-home",
    label: "Dashboard",
    scheme: {
      off:   "rgba(245,158,11,0.10)",
      hover: "rgba(245,158,11,0.22)",
      on:    "#FFF3E0",
      text:  "#7C4A00",
      icon:  "#D97706",
    },
  },
  {
    href:  "/dashboard/alumnos",
    key:   "alumnos",
    icon:  "ti-users",
    label: "Alumnos",
    scheme: {
      off:   "rgba(233,30,99,0.10)",
      hover: "rgba(233,30,99,0.22)",
      on:    "#FCE4EC",
      text:  "#6D0030",
      icon:  "#C2185B",
    },
  },
  {
    href:  "/dashboard/clases",
    key:   "clases",
    icon:  "ti-calendar",
    label: "Clases",
    scheme: {
      off:   "rgba(76,175,80,0.10)",
      hover: "rgba(76,175,80,0.22)",
      on:    "#E8F5E9",
      text:  "#1B4D1E",
      icon:  "#388E3C",
    },
  },
  {
    href:  "/dashboard/comunicados",
    key:   "comunicados",
    icon:  "ti-bell",
    label: "Comunicados",
    scheme: {
      off:   "rgba(33,150,243,0.10)",
      hover: "rgba(33,150,243,0.22)",
      on:    "#E3F2FD",
      text:  "#0A2E6E",
      icon:  "#1565C0",
    },
  },
  {
    href:  "/dashboard/pagos",
    key:   "pagos",
    icon:  "ti-credit-card",
    label: "Pagos",
    scheme: {
      off:   "rgba(124,58,237,0.10)",
      hover: "rgba(124,58,237,0.22)",
      on:    "#EDE7F6",
      text:  "#240A6E",
      icon:  "#5E35B1",
    },
  },
];

const roleLabels: Record<string, string> = {
  admin:   "Admin",
  teacher: "Profesor",
  student: "Alumno",
};

function getActiveKey(pathname: string): string {
  if (pathname.startsWith("/dashboard/alumnos"))     return "alumnos";
  if (pathname.startsWith("/dashboard/clases"))      return "clases";
  if (pathname.startsWith("/dashboard/comunicados")) return "comunicados";
  if (pathname.startsWith("/dashboard/pagos"))       return "pagos";
  return "dashboard";
}

export default function Sidebar({ user }: { user: User }) {
  const pathname  = usePathname();
  const activeKey = getActiveKey(pathname);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Sync body[data-section] for the main background transition
  useEffect(() => {
    document.body.setAttribute("data-section", activeKey);
    return () => { document.body.removeAttribute("data-section"); };
  }, [activeKey]);

  const initial     = user.firstName?.[0] ?? user.email[0].toUpperCase();
  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName}`
    : user.email;

  return (
    <>
      {/* ── Notebook tab styles (pseudo-elements can't be inline) ── */}
      <style>{`
        .tab-active { position: relative; overflow: visible; }

        .tab-active::before,
        .tab-active::after {
          content: '';
          position: absolute;
          right: 0;
          width: 10px;
          height: 10px;
          pointer-events: none;
        }
        .tab-active::before {
          top: -10px;
          border-bottom-right-radius: 8px;
        }
        .tab-active::after {
          bottom: -10px;
          border-top-right-radius: 8px;
        }

        .tab-active-dashboard::before { background: #FFF3E0; box-shadow: 3px  3px 0 3px #111; }
        .tab-active-dashboard::after  { background: #FFF3E0; box-shadow: 3px -3px 0 3px #111; }

        .tab-active-alumnos::before   { background: #FCE4EC; box-shadow: 3px  3px 0 3px #111; }
        .tab-active-alumnos::after    { background: #FCE4EC; box-shadow: 3px -3px 0 3px #111; }

        .tab-active-clases::before    { background: #E8F5E9; box-shadow: 3px  3px 0 3px #111; }
        .tab-active-clases::after     { background: #E8F5E9; box-shadow: 3px -3px 0 3px #111; }

        .tab-active-comunicados::before { background: #E3F2FD; box-shadow: 3px  3px 0 3px #111; }
        .tab-active-comunicados::after  { background: #E3F2FD; box-shadow: 3px -3px 0 3px #111; }

        .tab-active-pagos::before     { background: #EDE7F6; box-shadow: 3px  3px 0 3px #111; }
        .tab-active-pagos::after      { background: #EDE7F6; box-shadow: 3px -3px 0 3px #111; }
      `}</style>

      <aside
        style={{
        width: 220,
        minWidth: 220,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#111111",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* ── Logo ── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
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
      </motion.div>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1,
          padding: "16px 0",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          overflow: "visible",
        }}
      >
        {navItems.map((item) => {
          const isActive  = activeKey === item.key;
          const isHovered = !isActive && hoveredKey === item.key;
          const { scheme } = item;

          const bg = isActive
            ? scheme.on
            : isHovered
            ? scheme.hover
            : scheme.off;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? `tab-active tab-active-${item.key}`
                  : ""
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginLeft:   isActive ? "14px" : "8px",
                marginRight:  isActive ? "0"    : "8px",
                paddingTop:    "9px",
                paddingBottom: "9px",
                paddingLeft:  isActive ? "16px" : "12px",
                paddingRight:  "12px",
                borderRadius: isActive ? "10px 0 0 10px" : "10px",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? scheme.text : "rgba(255,255,255,0.5)",
                background: bg,
                transition:
                  "background 0.2s ease, color 0.2s ease, margin-left 0.2s ease",
                textDecoration: "none",
                position: "relative",
                zIndex: isActive ? 2 : 1,
              }}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {/* Icon — active gets pop-in spring, inactive gets hover spring */}
              {isActive ? (
                <motion.span
                  key={`icon-active-${item.key}`}
                  initial={{ scale: 0.7, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 10 }}
                  style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }}
                >
                  <i
                    className={`ti ${item.icon}`}
                    aria-hidden="true"
                    style={{ fontSize: "15px", color: scheme.icon }}
                  />
                </motion.span>
              ) : (
                <motion.span
                  key={`icon-inactive-${item.key}`}
                  whileHover={{ scale: 1.3, rotate: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }}
                >
                  <i
                    className={`ti ${item.icon}`}
                    aria-hidden="true"
                    style={{ fontSize: "15px", color: scheme.icon }}
                  />
                </motion.span>
              )}

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
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

        <SignOutButton redirectUrl="/sign-in">
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.22)")
            }
          >
            <i
              className="ti ti-logout"
              aria-hidden="true"
              style={{ fontSize: "13px" }}
            />
            Cerrar sesión
          </button>
        </SignOutButton>
      </div>
    </aside>
    </>
  );
}
