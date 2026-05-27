"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifAuthor = { id: string; firstName: string; lastName: string };

type Notification = {
  id:        string;
  title:     string;
  body:      string;
  createdAt: string;
  createdBy: string;
  author:    NotifAuthor;
  readByMe:  boolean;
};

type Me = { id: string; role: string };
type Toast = { msg: string; type: "success" | "error" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hrs   = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)  return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  if (hrs < 24)  return `hace ${hrs}h`;
  if (days < 7)  return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificacionesPage() {
  const [me, setMe]                   = useState<Me | null>(null);
  const [items, setItems]             = useState<Notification[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [toast, setToast]             = useState<Toast | null>(null);
  const toastTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form
  const [fTitle, setFTitle]           = useState("");
  const [fBody,  setFBody]            = useState("");
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string, type: Toast["type"] = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  // ── Cargar datos ───────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/perfil").then((r) => r.json()),
      fetch("/api/notificaciones").then((r) => r.json()),
    ]).then(([meData, notifs]) => {
      setMe(meData as Me);
      if (Array.isArray(notifs)) setItems(notifs as Notification[]);
    }).catch(() => showToast("Error al cargar notificaciones.", "error"))
      .finally(() => setLoading(false));
  }, []);

  // Al salir/montar: notificar al sidebar del recuento actualizado
  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event("notifications-updated"));
    };
  }, []);

  // ── Marcar como leída ──────────────────────────────────────────────────────

  async function markRead(id: string) {
    // Optimistic update
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readByMe: true } : n)),
    );
    window.dispatchEvent(new Event("notifications-updated"));

    try {
      await fetch(`/api/notificaciones/${id}/leer`, { method: "POST" });
    } catch {
      // No revertimos — UX fluido más importante que consistencia perfecta aquí
    }
  }

  // ── Marcar todas como leídas ───────────────────────────────────────────────

  async function markAllRead() {
    const unread = items.filter((n) => !n.readByMe);
    if (unread.length === 0) return;

    // Optimistic
    setItems((prev) => prev.map((n) => ({ ...n, readByMe: true })));
    window.dispatchEvent(new Event("notifications-updated"));

    await Promise.allSettled(
      unread.map((n) =>
        fetch(`/api/notificaciones/${n.id}/leer`, { method: "POST" }),
      ),
    );
  }

  // ── Crear comunicado ───────────────────────────────────────────────────────

  async function handleCreate() {
    if (!fTitle.trim()) { setFormError("El título es requerido."); return; }
    if (!fBody.trim())  { setFormError("El cuerpo es requerido.");  return; }
    setFormError(null);
    setSaving(true);

    try {
      const res  = await fetch("/api/notificaciones", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: fTitle, body: fBody }),
      });
      const json = await res.json() as Notification & { error?: string };
      if (!res.ok) {
        setFormError((json as unknown as { error?: string }).error ?? "Error al crear.");
        return;
      }
      // Optimistic: agregar al inicio marcado como leída (la creó el mismo admin)
      setItems((prev) => [{ ...json, readByMe: true }, ...prev]);
      setModalOpen(false);
      setFTitle("");
      setFBody("");
      showToast("Comunicado enviado");
    } catch {
      setFormError("Error de red. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const unreadCount = items.filter((n) => !n.readByMe).length;
  const isAdmin     = me?.role === "admin";

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageTransition>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"300px", fontFamily:"var(--font-jakarta)", fontSize:"13px", color:"#AAAAAA" }}>
          Cargando notificaciones…
        </div>
      </PageTransition>
    );
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--font-jakarta)",
    fontSize: "11px",
    fontWeight: 500,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: "6px",
  };

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
              position: "fixed", top: 24, right: 28, zIndex: 200,
              display: "flex", alignItems: "center", gap: "8px",
              background: toast.type === "error" ? "#991B1B" : "#166534",
              color: "white", borderRadius: "12px", padding: "12px 20px",
              fontFamily: "var(--font-jakarta)", fontSize: "13px", fontWeight: 500,
              boxShadow: toast.type === "error"
                ? "0 4px 20px rgba(153,27,27,0.35)"
                : "0 4px 20px rgba(22,101,52,0.35)",
            }}
          >
            <i className={`ti ${toast.type === "error" ? "ti-alert-circle" : "ti-circle-check"}`} style={{ fontSize: "16px" }} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal nuevo comunicado ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !saving && setModalOpen(false)}
            style={{
              position: "fixed", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 50,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              key="modal-card"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative", background: "white", borderRadius: "16px",
                width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
                margin: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              }}
            >
              {/* Header */}
              <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid #F4F2EE", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "20px", letterSpacing: "-0.02em", color: "#111111" }}>
                  Nuevo comunicado
                </h2>
                <button
                  onClick={() => !saving && setModalOpen(false)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:"8px", border:"1px solid #EEECE8", background:"white", color:"#777777", cursor:"pointer", fontSize:"14px" }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "22px 26px 26px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>Título</label>
                  <input
                    type="text"
                    value={fTitle}
                    onChange={(e) => { setFTitle(e.target.value); setFormError(null); }}
                    placeholder="Título del comunicado"
                    style={{ width:"100%", padding:"11px 14px", borderRadius:"10px", border:"1px solid #EEECE8", fontFamily:"var(--font-jakarta)", fontSize:"14px", color:"#111111", background:"#FAFAF8", outline:"none", boxSizing:"border-box", transition:"border-color 0.15s" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Mensaje</label>
                  <textarea
                    value={fBody}
                    onChange={(e) => { setFBody(e.target.value); setFormError(null); }}
                    placeholder="Escribí el mensaje para todos los usuarios…"
                    rows={5}
                    style={{ width:"100%", padding:"11px 14px", borderRadius:"10px", border:"1px solid #EEECE8", fontFamily:"var(--font-jakarta)", fontSize:"13px", color:"#111111", background:"#FAFAF8", outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.55, transition:"border-color 0.15s" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                  />
                </div>

                <AnimatePresence>
                  {formError && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"8px", padding:"10px 14px", fontFamily:"var(--font-jakarta)", fontSize:"13px", color:"#991B1B", display:"flex", alignItems:"center", gap:"6px" }}
                    >
                      <i className="ti ti-alert-circle" style={{ fontSize: "14px" }} />
                      {formError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end", paddingTop:"4px" }}>
                  <button onClick={() => !saving && setModalOpen(false)} disabled={saving}
                    style={{ padding:"11px 20px", borderRadius:"10px", border:"1px solid #EEECE8", background:"white", fontFamily:"var(--font-jakarta)", fontSize:"13px", fontWeight:500, color:"#555555", cursor:saving?"not-allowed":"pointer" }}
                  >
                    Cancelar
                  </button>
                  <motion.button onClick={handleCreate} disabled={saving}
                    whileHover={saving ? {} : { scale: 1.02 }}
                    whileTap={saving ? {} : { scale: 0.97 }}
                    transition={{ type:"spring", stiffness:400, damping:20 }}
                    style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"11px 24px", borderRadius:"10px", border:"none", background:saving?"#CCCCCC":"#FF3D5E", color:"white", fontFamily:"var(--font-jakarta)", fontSize:"13px", fontWeight:600, cursor:saving?"not-allowed":"pointer" }}
                  >
                    {saving ? (
                      <><i className="ti ti-loader-2" style={{ fontSize:"14px", animation:"spin 1s linear infinite" }} />Enviando…</>
                    ) : (
                      <><i className="ti ti-send" style={{ fontSize:"14px" }} />Enviar</>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", paddingBottom:"24px", gap:"16px", flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-fraunces)", fontWeight:300, fontSize:"32px", letterSpacing:"-0.03em", color:"#111111", lineHeight:1.1 }}>
            Notificaciones
          </h1>
          <p style={{ fontFamily:"var(--font-jakarta)", fontSize:"13px", color:"#999999", marginTop:"4px" }}>
            {items.length} {items.length === 1 ? "comunicado" : "comunicados"}
            {unreadCount > 0 && (
              <span style={{ color:"#FF3D5E", fontWeight:500 }}> · {unreadCount} sin leer</span>
            )}
          </p>
        </div>

        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          {/* Marcar todas */}
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{ padding:"10px 18px", borderRadius:"10px", border:"1px solid #EEECE8", background:"white", fontFamily:"var(--font-jakarta)", fontSize:"13px", fontWeight:500, color:"#555555", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", transition:"border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#CCCCCC")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
            >
              <i className="ti ti-checks" style={{ fontSize:"14px" }} />
              Marcar todas como leídas
            </button>
          )}

          {/* Nuevo comunicado — solo admin */}
          {isAdmin && (
            <motion.button
              onClick={() => { setFTitle(""); setFBody(""); setFormError(null); setModalOpen(true); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type:"spring", stiffness:400, damping:20 }}
              style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"11px 20px", borderRadius:"10px", border:"none", background:"#FF3D5E", color:"white", fontFamily:"var(--font-jakarta)", fontSize:"13px", fontWeight:600, cursor:"pointer" }}
            >
              <i className="ti ti-plus" style={{ fontSize:"14px" }} />
              Nuevo comunicado
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {items.length === 0 && (
        <div style={{ background:"white", borderRadius:"14px", border:"1px solid #EEECE8", padding:"80px 40px", textAlign:"center" }}>
          <div style={{ width:48, height:48, borderRadius:"12px", background:"#FFF0F2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <i className="ti ti-bell" style={{ fontSize:"22px", color:"#FF3D5E" }} />
          </div>
          <h2 style={{ fontFamily:"var(--font-fraunces)", fontWeight:400, fontSize:"18px", letterSpacing:"-0.02em", color:"#111111", marginBottom:"8px" }}>
            Sin notificaciones aún
          </h2>
          <p style={{ fontFamily:"var(--font-jakarta)", fontSize:"13px", color:"#999999" }}>
            {isAdmin ? "Creá un comunicado para notificar a todos los usuarios." : "El administrador aún no publicó ningún comunicado."}
          </p>
        </div>
      )}

      {/* ── Lista ── */}
      {items.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {items.map((notif, idx) => {
            const unread = !notif.readByMe;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => unread && markRead(notif.id)}
                style={{
                  background:   unread ? "#FFF8F8" : "white",
                  borderRadius: "14px",
                  border:       `1px solid ${unread ? "#FFD6DA" : "#EEECE8"}`,
                  padding:      "18px 22px",
                  display:      "flex",
                  gap:          "14px",
                  cursor:       unread ? "pointer" : "default",
                  transition:   "background 0.3s ease, border-color 0.3s ease",
                }}
              >
                {/* Dot no leída — CSS puro para evitar conflicto con initial del padre */}
                <div style={{ paddingTop: "5px", flexShrink: 0, width: 8 }}>
                  <div
                    style={{
                      width:      8,
                      height:     8,
                      borderRadius: "50%",
                      background: "#FF3D5E",
                      opacity:    unread ? 1 : 0,
                      transform:  `scale(${unread ? 1 : 0})`,
                      transition: "opacity 0.3s ease, transform 0.3s ease",
                    }}
                  />
                </div>

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px", marginBottom:"6px" }}>
                    <h3 style={{ fontFamily:"var(--font-jakarta)", fontSize:"14px", fontWeight: unread ? 600 : 500, color:"#111111", lineHeight:1.3 }}>
                      {notif.title}
                    </h3>
                    <span style={{ fontFamily:"var(--font-jakarta)", fontSize:"11px", color:"#AAAAAA", whiteSpace:"nowrap", flexShrink:0 }}>
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <p style={{ fontFamily:"var(--font-jakarta)", fontSize:"13px", color:"#555555", lineHeight:1.6, margin:0, marginBottom:"10px" }}>
                    {notif.body}
                  </p>

                  <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:"#3B82F6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontFamily:"var(--font-jakarta)", fontSize:"8px", fontWeight:700, color:"white" }}>
                        {notif.author.firstName[0]}{notif.author.lastName[0]}
                      </span>
                    </div>
                    <span style={{ fontFamily:"var(--font-jakarta)", fontSize:"11px", color:"#AAAAAA" }}>
                      {notif.author.firstName} {notif.author.lastName}
                    </span>
                    {unread && (
                      <span style={{ fontFamily:"var(--font-jakarta)", fontSize:"11px", color:"#FF3D5E", marginLeft:"4px" }}>
                        · Clic para marcar como leída
                      </span>
                    )}
                  </div>
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
