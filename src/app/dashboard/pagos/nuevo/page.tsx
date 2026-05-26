"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

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
  padding: "10px 14px",
  border: "1px solid #EEECE8",
  borderRadius: "10px",
  width: "100%",
  background: "#FAFAF8",
  outline: "none",
  color: "#111111",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: "36px",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NuevoPagoPage() {
  const router = useRouter();

  // Students
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Form fields
  const [studentId, setStudentId] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch students on mount
  useEffect(() => {
    fetch("/api/usuarios?role=student")
      .then((r) => r.json())
      .then((data: Student[]) => {
        setStudents(Array.isArray(data) ? data : []);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Seleccioná un alumno.");
      return;
    }
    if (!concept.trim()) {
      setError("El concepto es requerido.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }
    if (!dueDate) {
      setError("La fecha de vencimiento es requerida.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          concept: concept.trim(),
          amount: Number(amount),
          dueDate,
          method: method || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(
          (json as { error?: string }).error ?? "Error al registrar el pago.",
        );
        return;
      }

      router.push("/dashboard/pagos");
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <Link
          href="/dashboard/pagos"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: "9px",
            border: "1px solid #EEECE8",
            background: "white",
            color: "#555555",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <i
            className="ti ti-arrow-left"
            aria-hidden="true"
            style={{ fontSize: "15px" }}
          />
        </Link>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-fraunces)",
              fontWeight: 300,
              fontSize: "28px",
              letterSpacing: "-0.03em",
              color: "#111111",
              lineHeight: 1.1,
            }}
          >
            Registrar pago
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              color: "#999999",
              marginTop: "3px",
            }}
          >
            Completá los datos del cobro
          </p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #EEECE8",
          padding: "32px",
          maxWidth: 560,
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
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

          {/* Alumno */}
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle} htmlFor="studentId">
              Alumno
            </label>
            {loadingStudents ? (
              <div
                style={{
                  ...inputStyle,
                  color: "#AAAAAA",
                  display: "flex",
                  alignItems: "center",
                  height: "42px",
                }}
              >
                Cargando alumnos…
              </div>
            ) : (
              <select
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                style={selectStyle}
                required
              >
                <option value="">Seleccioná un alumno</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            )}
            {!loadingStudents && students.length === 0 && (
              <p
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "12px",
                  color: "#AAAAAA",
                  marginTop: "6px",
                }}
              >
                No hay alumnos registrados en la escuela.
              </p>
            )}
          </div>

          {/* Concepto */}
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle} htmlFor="concept">
              Concepto
            </label>
            <input
              id="concept"
              type="text"
              placeholder="Ej: Cuota junio 2025"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Monto */}
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle} htmlFor="amount">
              Monto
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "14px",
                  color: "#999999",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                $
              </span>
              <input
                id="amount"
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "28px" }}
                required
              />
            </div>
          </div>

          {/* Fecha de vencimiento */}
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle} htmlFor="dueDate">
              Fecha de vencimiento
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Método de pago */}
          <div style={{ marginBottom: "28px" }}>
            <label style={labelStyle} htmlFor="method">
              Método de pago{" "}
              <span style={{ color: "#AAAAAA", fontWeight: 400 }}>
                (opcional)
              </span>
            </label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              style={selectStyle}
            >
              <option value="">Sin especificar</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <Link
              href="/dashboard/pagos"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "11px 20px",
                borderRadius: "10px",
                border: "1px solid #EEECE8",
                background: "white",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                fontWeight: 500,
                color: "#555555",
                textDecoration: "none",
                flex: "0 0 auto",
              }}
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={submitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                padding: "11px 24px",
                borderRadius: "10px",
                border: "none",
                background: submitting ? "#CCCCCC" : "#FF3D5E",
                color: "white",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: submitting ? "not-allowed" : "pointer",
                flex: 1,
                transition: "background 0.15s",
              }}
            >
              {submitting ? (
                <>
                  <i
                    className="ti ti-loader-2"
                    aria-hidden="true"
                    style={{
                      fontSize: "14px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Guardando…
                </>
              ) : (
                <>
                  <i
                    className="ti ti-check"
                    aria-hidden="true"
                    style={{ fontSize: "14px" }}
                  />
                  Registrar pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
