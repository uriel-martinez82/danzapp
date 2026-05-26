"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NuevoComunicadoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    const audience = formData.get("audience") as string;

    try {
      const res = await fetch("/api/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, audience }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear el comunicado");
      }

      router.push("/dashboard/comunicados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: "28px" }}>
        <Link
          href="/dashboard/comunicados"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: "var(--font-jakarta)",
            fontSize: "13px",
            color: "#999999",
            textDecoration: "none",
            marginBottom: "14px",
          }}
        >
          <i className="ti ti-arrow-left" aria-hidden="true" style={{ fontSize: "13px" }} />
          Volver a comunicados
        </Link>

        <h1
          style={{
            fontFamily: "var(--font-fraunces)",
            fontWeight: 300,
            fontSize: "32px",
            letterSpacing: "-0.03em",
            color: "#111111",
            lineHeight: 1.1,
          }}
        >
          Nuevo comunicado
        </h1>
      </div>

      {/* ── Form card ── */}
      <div style={{ maxWidth: 640 }}>
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            border: "1px solid #EEECE8",
            padding: "28px 32px",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Título */}
            <div>
              <label
                htmlFor="title"
                style={{
                  display: "block",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Título
              </label>
              <input
                id="title"
                type="text"
                name="title"
                required
                placeholder="Ej: Cambio de horario de clases"
                style={{
                  display: "block",
                  width: "100%",
                  border: "1px solid #EEECE8",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "14px",
                  color: "#111111",
                  background: "#FAFAF8",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
              />
            </div>

            {/* Mensaje */}
            <div>
              <label
                htmlFor="body"
                style={{
                  display: "block",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Mensaje
              </label>
              <textarea
                id="body"
                name="body"
                required
                rows={5}
                placeholder="Escribí el mensaje del comunicado…"
                style={{
                  display: "block",
                  width: "100%",
                  border: "1px solid #EEECE8",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "14px",
                  color: "#111111",
                  background: "#FAFAF8",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.6,
                  transition: "border-color 0.15s",
                  minHeight: "120px",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
              />
            </div>

            {/* Audiencia */}
            <div>
              <label
                htmlFor="audience"
                style={{
                  display: "block",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Audiencia
              </label>
              <div style={{ position: "relative" }}>
                <select
                  id="audience"
                  name="audience"
                  defaultValue="all"
                  style={{
                    display: "block",
                    width: "100%",
                    border: "1px solid #EEECE8",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "14px",
                    color: "#111111",
                    background: "#FAFAF8",
                    outline: "none",
                    appearance: "none",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                >
                  <option value="all">Todos</option>
                  <option value="teachers">Solo profesores</option>
                  <option value="students">Solo alumnos</option>
                </select>
                {/* Custom arrow */}
                <i
                  className="ti ti-chevron-down"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "14px",
                    color: "#999999",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "13px",
                  color: "#CC1F3C",
                  background: "#FFF0F2",
                  border: "1px solid #FFD0D8",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                paddingTop: "4px",
              }}
            >
              <Link
                href="/dashboard/comunicados"
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "13px",
                  fontWeight: 400,
                  color: "#999999",
                  textDecoration: "none",
                  padding: "11px 18px",
                }}
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: loading ? "#FFAABB" : "#FF3D5E",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "11px 22px",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {loading ? (
                  <>
                    <i
                      className="ti ti-loader-2"
                      aria-hidden="true"
                      style={{ fontSize: "14px", animation: "spin 1s linear infinite" }}
                    />
                    Enviando…
                  </>
                ) : (
                  <>
                    <i className="ti ti-send" aria-hidden="true" style={{ fontSize: "14px" }} />
                    Enviar comunicado
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
