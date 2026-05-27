"use client";

import { useState, useEffect } from "react";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const roleLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
  admin:   { label: "Admin",    bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  teacher: { label: "Profesor", bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
  student: { label: "Alumno",   bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [fieldError, setFieldError]   = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [birthDate, setBirthDate]     = useState("");

  // ── Cargar perfil ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((data: UserProfile) => {
        setProfile(data);
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setPhone(data.phone ?? "");
        setBirthDate(data.birthDate ?? "");
      })
      .catch(() => setError("Error al cargar el perfil."))
      .finally(() => setLoading(false));
  }, []);

  // ── Guardar cambios ────────────────────────────────────────────────────────

  async function handleSave() {
    setFieldError(null);
    setError(null);

    if (!firstName.trim()) {
      setFieldError("El nombre es requerido.");
      return;
    }
    if (!lastName.trim()) {
      setFieldError("El apellido es requerido.");
      return;
    }

    setSaving(true);
    setSaved(false);

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

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Error al guardar.");
        return;
      }

      const updated: UserProfile = await res.json();
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageTransition>
        <div
          style={{
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
            minHeight:     "300px",
            fontFamily:    "var(--font-jakarta)",
            fontSize:      "13px",
            color:         "#AAAAAA",
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
        <div
          style={{
            padding:      "40px",
            textAlign:    "center",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "13px",
            color:        "#991B1B",
          }}
        >
          {error ?? "No se pudo cargar el perfil."}
        </div>
      </PageTransition>
    );
  }

  const initials   = getInitials(profile.firstName, profile.lastName);
  const roleCfg    = roleLabels[profile.role] ?? { label: profile.role, bg: "#F4F2EE", color: "#555555", border: "#EEECE8" };
  const memberSince = new Date(profile.createdAt).toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <PageTransition>
      {/* ── Toast de éxito ── */}
      <AnimatePresence>
        {saved && (
          <motion.div
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
              background:   "#166534",
              color:        "white",
              borderRadius: "12px",
              padding:      "12px 20px",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              fontWeight:   500,
              boxShadow:    "0 4px 20px rgba(22,101,52,0.35)",
            }}
          >
            <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: "16px" }} />
            Perfil actualizado
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
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize:   "13px",
              color:      "#999999",
              marginTop:  "4px",
            }}
          >
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
          {/* Avatar 80px */}
          <div
            style={{
              width:           80,
              height:          80,
              borderRadius:    "50%",
              background:      "#FF3D5E",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              color:           "white",
              fontFamily:      "var(--font-fraunces)",
              fontWeight:      400,
              fontSize:        "28px",
              letterSpacing:   "-0.02em",
              flexShrink:      0,
              boxShadow:       "0 4px 16px rgba(255,61,94,0.28)",
            }}
          >
            {initials}
          </div>

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
            <div
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        "6px",
                marginBottom: "12px",
              }}
            >
              <i
                className="ti ti-mail"
                aria-hidden="true"
                style={{ fontSize: "13px", color: "#AAAAAA" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize:   "13px",
                  color:      "#777777",
                }}
              >
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
          {/* Header de la card */}
          <div
            style={{
              padding:      "18px 28px 14px",
              borderBottom: "1px solid #F4F2EE",
            }}
          >
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

          {/* Campos del formulario */}
          <div style={{ padding: "24px 28px 28px" }}>
            {/* Grid 2 columnas: nombre y apellido */}
            <div
              style={{
                display:             "grid",
                gridTemplateColumns: "1fr 1fr",
                gap:                 "14px",
                marginBottom:        "14px",
              }}
            >
              <div>
                <label
                  style={{
                    display:     "block",
                    fontFamily:  "var(--font-jakarta)",
                    fontSize:    "11px",
                    fontWeight:  500,
                    color:       "#999999",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "6px",
                  }}
                >
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setFieldError(null); }}
                  placeholder="Tu nombre"
                  style={{
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
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>

              <div>
                <label
                  style={{
                    display:     "block",
                    fontFamily:  "var(--font-jakarta)",
                    fontSize:    "11px",
                    fontWeight:  500,
                    color:       "#999999",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "6px",
                  }}
                >
                  Apellido
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setFieldError(null); }}
                  placeholder="Tu apellido"
                  style={{
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
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
            </div>

            {/* Grid 2 columnas: teléfono y fecha de nac. */}
            <div
              style={{
                display:             "grid",
                gridTemplateColumns: "1fr 1fr",
                gap:                 "14px",
                marginBottom:        "24px",
              }}
            >
              <div>
                <label
                  style={{
                    display:     "block",
                    fontFamily:  "var(--font-jakarta)",
                    fontSize:    "11px",
                    fontWeight:  500,
                    color:       "#999999",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "6px",
                  }}
                >
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 11 1234-5678"
                  style={{
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
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>

              <div>
                <label
                  style={{
                    display:     "block",
                    fontFamily:  "var(--font-jakarta)",
                    fontSize:    "11px",
                    fontWeight:  500,
                    color:       "#999999",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "6px",
                  }}
                >
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{
                    width:        "100%",
                    padding:      "12px 14px",
                    borderRadius: "10px",
                    border:       "1px solid #EEECE8",
                    fontFamily:   "var(--font-jakarta)",
                    fontSize:     "14px",
                    color:        birthDate ? "#111111" : "#AAAAAA",
                    background:   "#FAFAF8",
                    outline:      "none",
                    boxSizing:    "border-box",
                    transition:   "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
            </div>

            {/* Email — solo lectura */}
            <div style={{ marginBottom: "28px" }}>
              <label
                style={{
                  display:     "block",
                  fontFamily:  "var(--font-jakarta)",
                  fontSize:    "11px",
                  fontWeight:  500,
                  color:       "#CCCCCC",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: "6px",
                }}
              >
                Email (no editable)
              </label>
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
              {(fieldError || error) && (
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
                  {fieldError ?? error}
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
                  <i
                    className="ti ti-loader-2"
                    aria-hidden="true"
                    style={{ fontSize: "16px", animation: "spin 1s linear infinite" }}
                  />
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
