"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jakarta)",
  fontSize: "12px",
  fontWeight: 500,
  color: "#555555",
  marginBottom: "6px",
  display: "block",
  letterSpacing: "0.01em",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-jakarta)",
  fontSize: "14px",
  padding: "12px 14px",
  border: "1px solid #EEECE8",
  borderRadius: "10px",
  width: "100%",
  background: "#FAFAF8",
  outline: "none",
  color: "#111111",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [name, setName]           = useState("");
  const [city, setCity]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre de la escuela es requerido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), city: city.trim() || undefined }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(
          (json as { error?: string }).error ?? "Error al crear la escuela.",
        );
        return;
      }

      // Redirigir al dashboard — el layout ya tendrá schoolId
      router.push("/dashboard");
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* ── Background photo ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1600&q=80"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
        }}
      />
      {/* ── Dark overlay ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(8, 8, 10, 0.58)",
          zIndex: 1,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* ── Logo ── */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-fraunces)",
              fontWeight: 300,
              fontStyle: "italic",
              fontSize: "28px",
              letterSpacing: "-0.03em",
              color: "white",
              lineHeight: 1,
              marginBottom: "6px",
            }}
          >
            Pas<span style={{ color: "#FF3D5E" }}>a</span>da
          </div>
          <div
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "10px",
              fontWeight: 400,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            gestión de danza
          </div>
        </div>

        {/* ── Card ── */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #EEECE8",
            padding: "36px",
            width: "100%",
            boxShadow: "0 2px 24px rgba(0,0,0,0.05)",
          }}
        >
          {/* Título */}
          <h1
            style={{
              fontFamily: "var(--font-fraunces)",
              fontWeight: 300,
              fontSize: "32px",
              letterSpacing: "-0.03em",
              color: "#111111",
              lineHeight: 1.1,
              marginBottom: "8px",
            }}
          >
            Creá tu escuela
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "14px",
              color: "#666666",
              lineHeight: 1.5,
              marginBottom: "28px",
            }}
          >
            Configurá tu academia en menos de un minuto.
          </p>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "10px",
                padding: "11px 14px",
                marginBottom: "20px",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                color: "#991B1B",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Nombre de la escuela */}
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle} htmlFor="schoolName">
                Nombre de la escuela
              </label>
              <input
                id="schoolName"
                type="text"
                placeholder="Ej: Academia de Danza Lumina"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                autoFocus
                required
              />
            </div>

            {/* Ciudad */}
            <div style={{ marginBottom: "28px" }}>
              <label style={labelStyle} htmlFor="city">
                Ciudad{" "}
                <span style={{ color: "#AAAAAA", fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                id="city"
                type="text"
                placeholder="Ej: Buenos Aires"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={submitting ? {} : { scale: 1.02 }}
              whileTap={submitting ? {}   : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "13px 20px",
                borderRadius: "10px",
                border: "none",
                background: submitting ? "#CCCCCC" : "#FF3D5E",
                color: "white",
                fontFamily: "var(--font-jakarta)",
                fontSize: "14px",
                fontWeight: 500,
                cursor: submitting ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {submitting ? (
                <>
                  <i
                    className="ti ti-loader-2"
                    aria-hidden="true"
                    style={{ fontSize: "15px", animation: "spin 1s linear infinite" }}
                  />
                  Creando tu escuela…
                </>
              ) : (
                <>
                  <i
                    className="ti ti-building"
                    aria-hidden="true"
                    style={{ fontSize: "15px" }}
                  />
                  Crear mi escuela
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p
          style={{
            fontFamily: "var(--font-jakarta)",
            fontSize: "12px",
            color: "rgba(255,255,255,0.35)",
            marginTop: "20px",
            textAlign: "center",
          }}
        >
          Al crear tu escuela aceptás los términos de uso de Pasada.
        </p>
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
