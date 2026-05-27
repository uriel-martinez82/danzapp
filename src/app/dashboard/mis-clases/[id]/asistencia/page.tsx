"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | "late" | "justified";

type StudentRecord = {
  enrollmentId: string;
  student: {
    id:        string;
    firstName: string;
    lastName:  string;
    email:     string;
  };
  attendance: { id: string; status: string; sessionDate: string } | null;
};

// ── Config de estados ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; icon: string; solid: string; light: string; border: string }
> = {
  present:   { label: "Presente",    icon: "ti-check",          solid: "#1D9E75", light: "rgba(29,158,117,0.10)",  border: "#1D9E75" },
  absent:    { label: "Ausente",     icon: "ti-x",              solid: "#FF3D5E", light: "rgba(255,61,94,0.10)",   border: "#FF3D5E" },
  late:      { label: "Tarde",       icon: "ti-clock",          solid: "#D97706", light: "rgba(217,119,6,0.10)",   border: "#D97706" },
  justified: { label: "Justificado", icon: "ti-file-description", solid: "#3B82F6", light: "rgba(59,130,246,0.10)", border: "#3B82F6" },
};

const STATUS_KEYS = Object.keys(STATUS_CONFIG) as AttendanceStatus[];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AsistenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: classId } = use(params);
  const searchParams    = useSearchParams();

  const [date, setDate]             = useState(searchParams.get("date") ?? todayStr());
  const [records, setRecords]       = useState<StudentRecord[]>([]);
  const [statuses, setStatuses]     = useState<Record<string, AttendanceStatus | null>>({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [className, setClassName]   = useState<string>("");

  // ── Cargar enrollments + asistencia existente ──────────────────────────────

  const loadAttendance = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/asistencia?classId=${classId}&date=${d}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Error al cargar la asistencia.");
        return;
      }
      const data: StudentRecord[] = await res.json();
      setRecords(data);

      // Pre-seleccionar estados existentes
      const initial: Record<string, AttendanceStatus | null> = {};
      data.forEach((r) => {
        initial[r.enrollmentId] = (r.attendance?.status as AttendanceStatus) ?? null;
      });
      setStatuses(initial);
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  // Cargar nombre de la clase una sola vez
  useEffect(() => {
    fetch(`/api/clases/${classId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.name) setClassName(data.name); })
      .catch(() => {});
  }, [classId]);

  useEffect(() => { loadAttendance(date); }, [date, loadAttendance]);

  // ── Cambiar estado de un alumno ────────────────────────────────────────────

  function toggleStatus(enrollmentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({
      ...prev,
      [enrollmentId]: prev[enrollmentId] === status ? null : status,
    }));
    setSaved(false);
  }

  // ── Guardar asistencia ─────────────────────────────────────────────────────

  async function handleSave() {
    setError(null);
    setSaving(true);
    setSaved(false);

    const toSave = records
      .filter((r) => statuses[r.enrollmentId] !== null && statuses[r.enrollmentId] !== undefined)
      .map((r) => ({ enrollmentId: r.enrollmentId, status: statuses[r.enrollmentId]! }));

    if (toSave.length === 0) {
      setError("Seleccioná al menos un estado antes de guardar.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/asistencia", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ classId, date, records: toSave }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Error al guardar.");
        return;
      }

      setSaved(true);
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
          href={`/dashboard/mis-clases/${classId}`}
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
          <i className="ti ti-arrow-left" aria-hidden="true" style={{ fontSize: "15px" }} />
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontFamily: "var(--font-fraunces)",
              fontWeight: 300,
              fontSize: "26px",
              letterSpacing: "-0.03em",
              color: "#111111",
              lineHeight: 1.1,
            }}
          >
            Asistencia
          </h1>
          {className && (
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                color: "#999999",
                marginTop: "2px",
              }}
            >
              {className}
            </p>
          )}
        </div>

        {/* Selector de fecha */}
        <div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              padding: "8px 12px",
              border: "1px solid #EEECE8",
              borderRadius: "10px",
              background: "white",
              color: "#111111",
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            border: "1px solid #EEECE8",
            padding: "60px 40px",
            textAlign: "center",
            fontFamily: "var(--font-jakarta)",
            fontSize: "13px",
            color: "#AAAAAA",
          }}
        >
          Cargando lista…
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontFamily: "var(--font-jakarta)",
            fontSize: "13px",
            color: "#991B1B",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Lista de alumnos ── */}
      {!loading && records.length === 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            border: "1px solid #EEECE8",
            padding: "60px 40px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              color: "#AAAAAA",
            }}
          >
            No hay alumnos inscriptos en esta clase.
          </p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <>
          {/* ── Leyenda de estados ── */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            {STATUS_KEYS.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <span
                  key={s}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: cfg.solid,
                    background: cfg.light,
                    padding: "4px 10px",
                    borderRadius: "6px",
                  }}
                >
                  <i className={`ti ${cfg.icon}`} aria-hidden="true" style={{ fontSize: "11px" }} />
                  {cfg.label}
                </span>
              );
            })}
          </div>

          {/* ── Rows ── */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              border: "1px solid #EEECE8",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            {records.map((rec, idx) => {
              const initials      = getInitials(rec.student.firstName, rec.student.lastName);
              const selectedStatus = statuses[rec.enrollmentId];

              return (
                <div
                  key={rec.enrollmentId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 20px",
                    borderBottom:
                      idx < records.length - 1 ? "1px solid #F4F2EE" : "none",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#FF3D5E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontFamily: "var(--font-jakarta)",
                      fontWeight: 600,
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>

                  {/* Nombre */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#111111",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {rec.student.firstName} {rec.student.lastName}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "12px",
                        color: "#999999",
                        marginTop: "1px",
                      }}
                    >
                      {rec.student.email}
                    </div>
                  </div>

                  {/* Botones de estado */}
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    {STATUS_KEYS.map((s) => {
                      const cfg      = STATUS_CONFIG[s];
                      const isActive = selectedStatus === s;
                      return (
                        <motion.button
                          key={s}
                          onClick={() => toggleStatus(rec.enrollmentId, s)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          title={cfg.label}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 11px",
                            borderRadius: "8px",
                            border: `1px solid ${cfg.border}`,
                            background: isActive ? cfg.solid : "transparent",
                            color: isActive ? "white" : cfg.solid,
                            opacity: isActive ? 1 : 0.6,
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "12px",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "background 0.15s, color 0.15s, opacity 0.15s",
                          }}
                        >
                          <i
                            className={`ti ${cfg.icon}`}
                            aria-hidden="true"
                            style={{ fontSize: "12px" }}
                          />
                          <span style={{ display: "none" }}>{cfg.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Guardar ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={saving ? {} : { scale: 1.02 }}
              whileTap={saving ? {}   : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "11px 24px",
                borderRadius: "10px",
                border: "none",
                background: saving ? "#CCCCCC" : "#111111",
                color: "white",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {saving ? (
                <>
                  <i
                    className="ti ti-loader-2"
                    aria-hidden="true"
                    style={{ fontSize: "14px", animation: "spin 1s linear infinite" }}
                  />
                  Guardando…
                </>
              ) : (
                <>
                  <i className="ti ti-device-floppy" aria-hidden="true" style={{ fontSize: "14px" }} />
                  Guardar asistencia
                </>
              )}
            </motion.button>

            {/* Mensaje de éxito */}
            <AnimatePresence>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#1D9E75",
                  }}
                >
                  <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: "15px" }} />
                  Asistencia guardada
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error inline */}
            <AnimatePresence>
              {error && !saving && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "13px",
                    color: "#991B1B",
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
