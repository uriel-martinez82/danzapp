"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

// ── Types ─────────────────────────────────────────────────────────────────────

type UserProfile = {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string | null;
  birthDate: string | null;
  role:      string;
  schoolId:  string | null;
  avatarUrl: string | null;
  createdAt: string;
};

type ToastType = "success" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

const roleLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
  admin:   { label: "Admin",    bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  teacher: { label: "Profesor", bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
  student: { label: "Alumno",   bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// ── Label helper para inputs ──────────────────────────────────────────────────

function FieldLabel({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <label
      style={{
        display:       "block",
        fontFamily:    "var(--font-jakarta)",
        fontSize:      "11px",
        fontWeight:    500,
        color:         muted ? "#CCCCCC" : "#999999",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        marginBottom:  "6px",
      }}
    >
      {children}
    </label>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);

  // Toast
  const [toast, setToast]           = useState<{ msg: string; type: ToastType } | null>(null);
  const toastTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [firstName, setFirstName]   = useState("");
  const [lastName,  setLastName]    = useState("");
  const [phone,     setPhone]       = useState("");
  const [birthDate, setBirthDate]   = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast helper ───────────────────────────────────────────────────────────

  function showToast(msg: string, type: ToastType = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  // ── Cargar perfil ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((data: UserProfile) => {
        setProfile(data);
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName   ?? "");
        setPhone(data.phone         ?? "");
        setBirthDate(data.birthDate ?? "");
      })
      .catch(() => showToast("Error al cargar el perfil.", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Subir avatar ───────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input para poder re-seleccionar el mismo archivo
    e.target.value = "";

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/perfil/avatar", { method: "POST", body: fd });
      const json = await res.json() as { avatarUrl?: string; error?: string };

      if (!res.ok) {
        showToast(json.error ?? "Error al subir la imagen.", "error");
        return;
      }

      // Actualizar perfil local con la nueva URL
      setProfile((prev) => prev ? { ...prev, avatarUrl: json.avatarUrl! } : prev);
      showToast("Foto actualizada");
    } catch {
      showToast("Error de red al subir la imagen.", "error");
    } finally {
      setUploading(false);
    }
  }

  // ── Guardar cambios de perfil ──────────────────────────────────────────────

  async function handleSave() {
    setFieldError(null);

    if (!firstName.trim()) { setFieldError("El nombre es requerido.");   return; }
    if (!lastName.trim())  { setFieldError("El apellido es requerido."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/perfil", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName:  lastName.trim(),
          phone:     phone.trim() || null,
          birthDate: birthDate || null,
        }),
      });

      const json = await res.json() as UserProfile & { error?: string };
      if (!res.ok) {
        showToast((json as unknown as { error?: string }).error ?? "Error al guardar.", "error");
        return;
      }

      setProfile(json);
      showToast("Perfil actualizado");
    } catch {
      showToast("Error de red. Intentá de nuevo.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

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
          Cargando perfil…
        </div>
      </PageTransition>
    );
  }

  if (!profile) {
    return (
      <PageTransition>
        <div style={{ padding: "40px", textAlign: "center", fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#991B1B" }}>
          No se pudo cargar el perfil.
        </div>
      </PageTransition>
    );
  }

  const initials    = getInitials(profile.firstName, profile.lastName);
  const roleCfg     = roleLabels[profile.role] ?? { label: profile.role, bg: "#F4F2EE", color: "#555555", border: "#EEECE8" };
  const memberSince = new Date(profile.createdAt).toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const inputStyle: React.CSSProperties = {
    width:        "100%",
    padding:      "12px 14px",
    borderRadius: "10px",
    border:       "1px solid #EEECE8",
    fontFamily:   "var(--font-jakarta)",
    fontSize:     "14px",
    color:        "#111111",
    background:   "#FAFAF8",
    outline:      "none",
    boxSizing:    "border-box",
    transition:   "border-color 0.15s",
  };

  return (
    <PageTransition>
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.msg}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
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

      <div style={{ maxWidth: 680 }}>
        {/* ── Page title ── */}
        <div style={{ marginBottom: "28px" }}>
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
            Mi perfil
          </h1>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", marginTop: "4px" }}>
            Miembro desde {memberSince}
          </p>
        </div>

        {/* ── Sección 1: Avatar y datos principales ── */}
        <div
          style={{
            background:   "white",
            borderRadius: "14px",
            border:       "1px solid #EEECE8",
            padding:      "28px 28px 24px",
            marginBottom: "16px",
            display:      "flex",
            alignItems:   "center",
            gap:          "24px",
          }}
        >
          {/* ── Avatar clickeable ── */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            style={{
              position:       "relative",
              width:          80,
              height:         80,
              borderRadius:   "50%",
              flexShrink:     0,
              cursor:         uploading ? "wait" : "pointer",
              overflow:       "hidden",     // overlay no se sale del círculo
            }}
          >
            {/* Imagen o iniciales */}
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={`${profile.firstName} ${profile.lastName}`}
                width={80}
                height={80}
                style={{
                  width:      "100%",
                  height:     "100%",
                  objectFit:  "cover",
                  display:    "block",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <div
                style={{
                  width:           "100%",
                  height:          "100%",
                  background:      "#FF3D5E",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  color:           "white",
                  fontFamily:      "var(--font-fraunces)",
                  fontWeight:      400,
                  fontSize:        "28px",
                  letterSpacing:   "-0.02em",
                  boxShadow:       "0 4px 16px rgba(255,61,94,0.28)",
                }}
              >
                {initials}
              </div>
            )}

            {/* Overlay de cámara (hover) */}
            <div
              style={{
                position:       "absolute",
                inset:          0,
                borderRadius:   "50%",
                background:     "rgba(0,0,0,0.42)",
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            "3px",
                opacity:        (avatarHover && !uploading) ? 1 : 0,
                transition:     "opacity 0.18s ease",
                pointerEvents:  "none",
              }}
            >
              <i className="ti ti-camera" aria-hidden="true" style={{ fontSize: "20px", color: "white" }} />
              <span
                style={{
                  fontFamily:  "var(--font-jakarta)",
                  fontSize:    "9px",
                  fontWeight:  600,
                  color:       "white",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Cambiar
              </span>
            </div>

            {/* Spinner mientras sube */}
            {uploading && (
              <div
                style={{
                  position:       "absolute",
                  inset:          0,
                  borderRadius:   "50%",
                  background:     "rgba(0,0,0,0.55)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className="ti ti-loader-2"
                  aria-hidden="true"
                  style={{
                    fontSize:  "24px",
                    color:     "white",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
            )}
          </div>

          {/* Input file oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontFamily:    "var(--font-fraunces)",
                fontWeight:    300,
                fontSize:      "24px",
                letterSpacing: "-0.02em",
                color:         "#111111",
                lineHeight:    1.1,
                marginBottom:  "6px",
              }}
            >
              {profile.firstName} {profile.lastName}
            </h2>

            {/* Email */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
              <i className="ti ti-mail" aria-hidden="true" style={{ fontSize: "13px", color: "#AAAAAA" }} />
              <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#777777" }}>
                {profile.email}
              </span>
            </div>

            {/* Role badge */}
            <span
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "5px",
                background:   roleCfg.bg,
                color:        roleCfg.color,
                border:       `1.5px solid ${roleCfg.border}`,
                borderRadius: "20px",
                padding:      "4px 12px",
                fontFamily:   "var(--font-jakarta)",
                fontSize:     "11px",
                fontWeight:   600,
                letterSpacing:"0.03em",
              }}
            >
              <i className="ti ti-shield-check" aria-hidden="true" style={{ fontSize: "11px" }} />
              {roleCfg.label}
            </span>
          </div>
        </div>

        {/* ── Sección 2: Formulario de edición ── */}
        <div
          style={{
            background:   "white",
            borderRadius: "14px",
            border:       "1px solid #EEECE8",
            overflow:     "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "18px 28px 14px", borderBottom: "1px solid #F4F2EE" }}>
            <h3
              style={{
                fontFamily:    "var(--font-fraunces)",
                fontWeight:    400,
                fontSize:      "17px",
                letterSpacing: "-0.02em",
                color:         "#111111",
              }}
            >
              Editar información
            </h3>
          </div>

          <div style={{ padding: "24px 28px 28px" }}>
            {/* Nombre + Apellido */}
            <div
              style={{
                display:             "grid",
                gridTemplateColumns: "1fr 1fr",
                gap:                 "14px",
                marginBottom:        "14px",
              }}
            >
              <div>
                <FieldLabel>Nombre</FieldLabel>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setFieldError(null); }}
                  placeholder="Tu nombre"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
              <div>
                <FieldLabel>Apellido</FieldLabel>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setFieldError(null); }}
                  placeholder="Tu apellido"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
            </div>

            {/* Teléfono + Fecha de nac. */}
            <div
              style={{
                display:             "grid",
                gridTemplateColumns: "1fr 1fr",
                gap:                 "14px",
                marginBottom:        "24px",
              }}
            >
              <div>
                <FieldLabel>Teléfono</FieldLabel>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 11 1234-5678"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
              <div>
                <FieldLabel>Fecha de nacimiento</FieldLabel>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{ ...inputStyle, color: birthDate ? "#111111" : "#AAAAAA" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
            </div>

            {/* Email — solo lectura */}
            <div style={{ marginBottom: "28px" }}>
              <FieldLabel muted>Email (no editable)</FieldLabel>
              <div
                style={{
                  padding:      "12px 14px",
                  borderRadius: "10px",
                  border:       "1px solid #F0EDEA",
                  fontFamily:   "var(--font-jakarta)",
                  fontSize:     "14px",
                  color:        "#AAAAAA",
                  background:   "#F9F8F6",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "8px",
                }}
              >
                <i className="ti ti-lock" aria-hidden="true" style={{ fontSize: "13px", color: "#CCCCCC" }} />
                {profile.email}
              </div>
            </div>

            {/* Error de validación */}
            <AnimatePresence>
              {fieldError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background:   "#FEF2F2",
                    border:       "1px solid #FECACA",
                    borderRadius: "10px",
                    padding:      "11px 16px",
                    marginBottom: "16px",
                    fontFamily:   "var(--font-jakarta)",
                    fontSize:     "13px",
                    color:        "#991B1B",
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "8px",
                  }}
                >
                  <i className="ti ti-alert-circle" aria-hidden="true" style={{ fontSize: "14px" }} />
                  {fieldError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botón guardar */}
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={saving ? {} : { scale: 1.02 }}
              whileTap={saving ? {}   : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "8px",
                padding:      "14px 32px",
                borderRadius: "12px",
                border:       "none",
                background:   saving ? "#CCCCCC" : "#FF3D5E",
                color:        "white",
                fontFamily:   "var(--font-jakarta)",
                fontSize:     "14px",
                fontWeight:   600,
                cursor:       saving ? "not-allowed" : "pointer",
                transition:   "background 0.15s",
              }}
            >
              {saving ? (
                <>
                  <i className="ti ti-loader-2" aria-hidden="true"
                    style={{ fontSize: "16px", animation: "spin 1s linear infinite" }} />
                  Guardando…
                </>
              ) : (
                <>
                  <i className="ti ti-device-floppy" aria-hidden="true" style={{ fontSize: "16px" }} />
                  Guardar cambios
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </PageTransition>
  );
}
