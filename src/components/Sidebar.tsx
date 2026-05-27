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

const schemes: Record<string, Scheme> = {
  dashboard: {
    off:   "rgba(245,158,11,0.10)",
    hover: "rgba(245,158,11,0.22)",
    on:    "#FFF3E0",
    text:  "#7C4A00",
    icon:  "#D97706",
  },
  alumnos: {
    off:   "rgba(233,30,99,0.10)",
    hover: "rgba(233,30,99,0.22)",
    on:    "#FCE4EC",
    text:  "#6D0030",
    icon:  "#C2185B",
  },
  clases: {
    off:   "rgba(76,175,80,0.10)",
    hover: "rgba(76,175,80,0.22)",
    on:    "#E8F5E9",
    text:  "#1B4D1E",
    icon:  "#388E3C",
  },
  comunicados: {
    off:   "rgba(33,150,243,0.10)",
    hover: "rgba(33,150,243,0.22)",
    on:    "#E3F2FD",
    text:  "#0A2E6E",
    icon:  "#1565C0",
  },
  pagos: {
    off:   "rgba(124,58,237,0.10)",
    hover: "rgba(124,58,237,0.22)",
    on:    "#EDE7F6",
    text:  "#240A6E",
    icon:  "#5E35B1",
  },
};

const navItems: {
  href:     string;
  icon:     string;
  label:    string;
  colorKey: string;
  roles:    string[];
  badge:    boolean;
}[] = [
  { href: "/dashboard",                  icon: "ti-home",        label: "Dashboard",       colorKey: "dashboard",   roles: ["admin", "teacher", "student"], badge: false },
  { href: "/dashboard/alumnos",          icon: "ti-users",       label: "Alumnos",         colorKey: "alumnos",     roles: ["admin"],                        badge: false },
  { href: "/dashboard/clases",           icon: "ti-calendar",    label: "Clases",          colorKey: "clases",      roles: ["admin"],                        badge: false },
  { href: "/dashboard/mis-clases",       icon: "ti-calendar",    label: "Mis Clases",      colorKey: "clases",      roles: ["teacher", "student"],           badge: false },
  { href: "/dashboard/notificaciones",   icon: "ti-bell",        label: "Notificaciones",  colorKey: "comunicados", roles: ["admin", "teacher", "student"],  badge: true  },
  { href: "/dashboard/comunicados",      icon: "ti-speakerphone",label: "Comunicados",     colorKey: "comunicados", roles: ["admin", "teacher", "student"],  badge: false },
  { href: "/dashboard/pagos",            icon: "ti-credit-card", label: "Pagos",           colorKey: "pagos",       roles: ["admin"],                        badge: false },
  { href: "/dashboard/mis-pagos",        icon: "ti-credit-card", label: "Mis Pagos",       colorKey: "pagos",       roles: ["student"],                      badge: false },
];

const roleLabels: Record<string, string> = {
  admin:   "Admin",
  teacher: "Profesor",
  student: "Alumno",
};

/** Sección activa — se usa para body[data-section] y las esquinas del tab */
function getActiveSection(pathname: string): string {
  if (pathname.startsWith("/dashboard/alumnos"))     return "alumnos";
  if (pathname.startsWith("/dashboard/clases"))      return "clases";
  if (pathname.startsWith("/dashboard/mis-clases"))  return "clases";
  if (pathname.startsWith("/dashboard/comunicados")) return "comunicados";
  if (pathname.startsWith("/dashboard/pagos"))       return "pagos";
  if (pathname.startsWith("/dashboard/mis-pagos"))   return "pagos";
  return "dashboard";
}

/** Si un item está activo (basado en su href exacto) */
function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({ user }: { user: User }) {
  const pathname      = usePathname();
  const activeSection = getActiveSection(pathname);
  const [hoveredKey, setHoveredKey]     = useState<string | null>(null);
  const [unreadCount, setUnreadCount]   = useState(0);

  // Solo mostrar los items permitidos para el rol del usuario
  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  // Sync body[data-section] for the main background transition
  useEffect(() => {
    document.body.setAttribute("data-section", activeSection);
    return () => { document.body.removeAttribute("data-section"); };
  }, [activeSection]);

  // Badge de notificaciones no leídas
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notificaciones");
        if (!res.ok) return;
        const data = await res.json() as { readByMe: boolean }[];
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n) => !n.readByMe).length);
        }
      } catch { /* silencioso */ }
    }

    fetchUnread();

    // Re-fetch cuando el usuario vuelve a la pestaña o la página de notifs dispara el evento
    window.addEventListener("focus", fetchUnread);
    window.addEventListener("notifications-updated", fetchUnread);
    return () => {
      window.removeEventListener("focus", fetchUnread);
      window.removeEventListener("notifications-updated", fetchUnread);
    };
  }, []);

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
        {visibleItems.map((item) => {
          const isActive  = isItemActive(pathname, item.href);
          const isHovered = !isActive && hoveredKey === item.href;
          const scheme    = schemes[item.colorKey];

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
                  ? `tab-active tab-active-${item.colorKey}`
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
              onMouseEnter={() => setHoveredKey(item.href)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {/* Icon — active gets pop-in spring, inactive gets hover spring */}
              {isActive ? (
                <motion.span
                  key={`icon-active-${item.href}`}
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
                  key={`icon-inactive-${item.href}`}
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

              <span style={{ flex: 1 }}>{item.label}</span>

              {/* Badge de no leídas */}
              {item.badge && unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    minWidth:       18,
                    height:         18,
                    borderRadius:   "9px",
                    background:     "#FF3D5E",
                    color:          "white",
                    fontFamily:     "var(--font-jakarta)",
                    fontSize:       "10px",
                    fontWeight:     700,
                    paddingLeft:    unreadCount > 9 ? "5px" : "0",
                    paddingRight:   unreadCount > 9 ? "5px" : "0",
                    flexShrink:     0,
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </motion.span>
              )}
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
        <Link
          href="/dashboard/perfil"
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "10px",
            marginBottom:   "12px",
            textDecoration: "none",
            borderRadius:   "8px",
            padding:        "4px 2px",
            transition:     "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
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
          <div style={{ minWidth: 0, flex: 1 }}>
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

          {/* Chevron hint */}
          <i
            className="ti ti-chevron-right"
            aria-hidden="true"
            style={{ fontSize: "12px", color: "rgba(255,255,255,0.15)", flexShrink: 0 }}
          />
        </Link>

        {/* Link "Usuarios" — solo para admins */}
        {user.role === "admin" && (
          <Link
            href="/dashboard/usuarios"
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            "6px",
              fontFamily:     "var(--font-jakarta)",
              fontWeight:     400,
              fontSize:       "12px",
              color:          "rgba(255,255,255,0.35)",
              textDecoration: "none",
              marginBottom:   "10px",
              transition:     "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            <i className="ti ti-users" aria-hidden="true" style={{ fontSize: "13px" }} />
            Usuarios
          </Link>
        )}

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
