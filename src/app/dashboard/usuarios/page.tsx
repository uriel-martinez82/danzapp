"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

// ── Types ─────────────────────────────────────────────────────────────────────

type AppUser = {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  role:      string;
  avatarUrl: string | null;
  createdAt: string;
};

type Toast = { msg: string; type: "success" | "error" };

// ── Constantes ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "student", label: "Alumno"   },
  { value: "teacher", label: "Profesor" },
  { value: "admin",   label: "Admin"    },
];

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  student: { label: "Alumno",   bg: "#F4F2EE", color: "#555555", border: "#E2E0DC" },
  teacher: { label: "Profesor", bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  admin:   { label: "Admin",    bg: "#FFF0F2", color: "#C2185B", border: "#FFBAC8" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers]             = useState<AppUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [query, setQuery]             = useState("");
  const [toast, setToast]             = useState<Toast | null>(null);
  const toastRef                      = useState<ReturnType<typeof setTimeout> | null>(null);
  // Tracks which user id is being saved right now
  const [savingId, setSavingId]       = useState<string | null>(null);

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string, type: Toast["type"] = "success") {
    if (toastRef[0]) clearTimeout(toastRef[0]);
    setToast({ msg, type });
    toastRef[0] = setTimeout(() => setToast(null), 3500);
  }

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/perfil").then((r) => r.json()),
      fetch("/api/usuarios").then((r) => r.json()),
    ]).then(([me, allUsers]) => {
      const meTyped = me as AppUser & { role?: string };
      if (String(meTyped.role) !== "admin") {
        router.replace("/dashboard");
        return;
      }
      setCurrentUser(meTyped);
      if (Array.isArray(allUsers)) setUsers(allUsers as AppUser[]);
    }).catch(() => {
      showToast("Error al cargar usuarios.", "error");
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtro local ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  // ── Cambiar rol ────────────────────────────────────────────────────────────

  async function handleRoleChange(userId: string, newRole: string) {
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    );
    setSavingId(userId);

    try {
      const res = await fetch(`/api/usuarios/${userId}/rol`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: newRole }),
      });
      const json = await res.json() as AppUser & { error?: string };

      if (!res.ok) {
        // Revertir
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: u.role } : u)),
        );
        showToast((json as unknown as { error?: string }).error ?? "Error al cambiar rol.", "error");
        return;
      }

      setUsers((prev) => prev.map((u) => (u.id === userId ? json : u)));
      showToast("Rol actualizado");
    } catch {
      showToast("Error de red. Intentá de nuevo.", "error");
    } finally {
      setSavingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageTransition>
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            minHeight:      "300px",
            fontFamily:     "var(--font-jakarta)",
            fontSize:       "13px",
            color:          "#AAAAAA",
          }}
        >
          Cargando usuarios…
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position:     "fixed",
              top:          24,
              right:        28,
              zIndex:       200,
              display:      "flex",
              alignItems:   "center",
              gap:          "8px",
              background:   toast.type === "error" ? "#991B1B" : "#166534",
              color:        "white",
              borderRadius: "12px",
              padding:      "12px 20px",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              fontWeight:   500,
              boxShadow:    toast.type === "error"
                ? "0 4px 20px rgba(153,27,27,0.35)"
                : "0 4px 20px rgba(22,101,52,0.35)",
            }}
          >
            <i
              className={`ti ${toast.type === "error" ? "ti-alert-circle" : "ti-circle-check"}`}
              aria-hidden="true"
              style={{ fontSize: "16px" }}
            />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "flex-end",
          justifyContent: "space-between",
          paddingBottom:  "24px",
          gap:            "16px",
          flexWrap:       "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily:    "var(--font-fraunces)",
              fontWeight:    300,
              fontSize:      "32px",
              letterSpacing: "-0.03em",
              color:         "#111111",
              lineHeight:    1.1,
            }}
          >
            Gestión de usuarios
          </h1>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", marginTop: "4px" }}>
            {users.length} {users.length === 1 ? "usuario" : "usuarios"} en la escuela
          </p>
        </div>

        {/* Buscador */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <i
            className="ti ti-search"
            aria-hidden="true"
            style={{
              position:  "absolute",
              left:      "12px",
              top:       "50%",
              transform: "translateY(-50%)",
              fontSize:  "14px",
              color:     "#AAAAAA",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o email…"
            style={{
              padding:      "10px 14px 10px 36px",
              borderRadius: "10px",
              border:       "1px solid #EEECE8",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              color:        "#111111",
              background:   "white",
              outline:      "none",
              width:        "260px",
              transition:   "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
            onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
          />
        </div>
      </div>

      {/* ── Lista de usuarios ── */}
      {filtered.length === 0 ? (
        <div
          style={{
            background:   "white",
            borderRadius: "14px",
            border:       "1px solid #EEECE8",
            padding:      "60px 40px",
            textAlign:    "center",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "13px",
            color:        "#AAAAAA",
          }}
        >
          {query ? `Sin resultados para "${query}"` : "No hay usuarios en la escuela."}
        </div>
      ) : (
        <div
          style={{
            background:   "white",
            borderRadius: "14px",
            border:       "1px solid #EEECE8",
            overflow:     "hidden",
          }}
        >
          {/* Encabezado de tabla */}
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: "1fr 220px 160px 130px",
              gap:                 "16px",
              padding:             "11px 24px",
              borderBottom:        "1px solid #F4F2EE",
              background:          "#FAFAF8",
            }}
          >
            {["Usuario", "Email", "Miembro desde", "Rol"].map((h) => (
              <span
                key={h}
                style={{
                  fontFamily:    "var(--font-jakarta)",
                  fontSize:      "11px",
                  fontWeight:    500,
                  color:         "#999999",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Filas */}
          {filtered.map((u, idx) => {
            const isSelf    = u.id === currentUser?.id;
            const badgeCfg  = ROLE_BADGE[u.role] ?? ROLE_BADGE.student;
            const initials  = getInitials(u.firstName, u.lastName);
            const isSaving  = savingId === u.id;

            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.04 }}
                style={{
                  display:             "grid",
                  gridTemplateColumns: "1fr 220px 160px 130px",
                  gap:                 "16px",
                  padding:             "14px 24px",
                  alignItems:          "center",
                  borderBottom:
                    idx < filtered.length - 1 ? "1px solid #F4F2EE" : "none",
                  background: isSelf ? "#FFFAF8" : "white",
                  transition: "background 0.15s",
                }}
              >
                {/* Columna 1: Avatar + nombre */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <div
                    style={{
                      width:          38,
                      height:         38,
                      borderRadius:   "50%",
                      background:     "#FF3D5E",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      color:          "white",
                      fontFamily:     "var(--font-jakarta)",
                      fontWeight:     700,
                      fontSize:       "13px",
                      flexShrink:     0,
                      overflow:       "hidden",
                    }}
                  >
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatarUrl}
                        alt={initials}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily:   "var(--font-jakarta)",
                        fontSize:     "14px",
                        fontWeight:   500,
                        color:        "#111111",
                        whiteSpace:   "nowrap",
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {u.firstName} {u.lastName}
                    </div>
                    {isSelf && (
                      <span
                        style={{
                          fontFamily:   "var(--font-jakarta)",
                          fontSize:     "10px",
                          fontWeight:   600,
                          color:        "#FF3D5E",
                          letterSpacing:"0.04em",
                          textTransform:"uppercase",
                        }}
                      >
                        Vos
                      </span>
                    )}
                  </div>
                </div>

                {/* Columna 2: Email */}
                <span
                  style={{
                    fontFamily:   "var(--font-jakarta)",
                    fontSize:     "13px",
                    color:        "#777777",
                    whiteSpace:   "nowrap",
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {u.email}
                </span>

                {/* Columna 3: Fecha de alta */}
                <span
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize:   "12px",
                    color:      "#AAAAAA",
                  }}
                >
                  {formatDate(u.createdAt)}
                </span>

                {/* Columna 4: Rol — badge + select */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isSelf ? (
                    // Propio: solo badge, select deshabilitado
                    <span
                      style={{
                        background:   badgeCfg.bg,
                        color:        badgeCfg.color,
                        border:       `1px solid ${badgeCfg.border}`,
                        borderRadius: "20px",
                        padding:      "4px 12px",
                        fontFamily:   "var(--font-jakarta)",
                        fontSize:     "11px",
                        fontWeight:   600,
                      }}
                    >
                      {badgeCfg.label}
                    </span>
                  ) : (
                    <div style={{ position: "relative", width: "100%" }}>
                      {isSaving && (
                        <div
                          style={{
                            position:       "absolute",
                            right:          8,
                            top:            "50%",
                            transform:      "translateY(-50%)",
                            pointerEvents:  "none",
                            zIndex:         1,
                          }}
                        >
                          <i
                            className="ti ti-loader-2"
                            aria-hidden="true"
                            style={{
                              fontSize:  "13px",
                              color:     "#999999",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        </div>
                      )}
                      <select
                        value={u.role}
                        disabled={isSaving}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          width:        "100%",
                          padding:      "7px 30px 7px 10px",
                          borderRadius: "8px",
                          border:       `1px solid ${badgeCfg.border}`,
                          background:   badgeCfg.bg,
                          color:        badgeCfg.color,
                          fontFamily:   "var(--font-jakarta)",
                          fontSize:     "12px",
                          fontWeight:   600,
                          cursor:       isSaving ? "wait" : "pointer",
                          outline:      "none",
                          appearance:   "none",
                          opacity:      isSaving ? 0.6 : 1,
                          transition:   "opacity 0.15s",
                        }}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {!isSaving && (
                        <i
                          className="ti ti-chevron-down"
                          aria-hidden="true"
                          style={{
                            position:      "absolute",
                            right:         8,
                            top:           "50%",
                            transform:     "translateY(-50%)",
                            fontSize:      "11px",
                            color:         badgeCfg.color,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </PageTransition>
  );
}
