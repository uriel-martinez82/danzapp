"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
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
  {
    label:       string;
    icon:        string;
    activeBg:    string;
    activeColor: string;
    activeBorder:string;
    pillBg:      string;
    pillColor:   string;
    pillBorder:  string;
  }
> = {
  present: {
    label:        "Presente",
    icon:         "ti-check",
    activeBg:     "#DCFCE7",
    activeColor:  "#166534",
    activeBorder: "#86EFAC",
    pillBg:       "#DCFCE7",
    pillColor:    "#166534",
    pillBorder:   "#86EFAC",
  },
  absent: {
    label:        "Ausente",
    icon:         "ti-x",
    activeBg:     "#FEE2E2",
    activeColor:  "#991B1B",
    activeBorder: "#FCA5A5",
    pillBg:       "#FEE2E2",
    pillColor:    "#991B1B",
    pillBorder:   "#FCA5A5",
  },
  late: {
    label:        "Tarde",
    icon:         "ti-clock",
    activeBg:     "#FEF3C7",
    activeColor:  "#92400E",
    activeBorder: "#FCD34D",
    pillBg:       "#FEF3C7",
    pillColor:    "#92400E",
    pillBorder:   "#FCD34D",
  },
  justified: {
    label:        "Justificado",
    icon:         "ti-file-text",
    activeBg:     "#DBEAFE",
    activeColor:  "#1E40AF",
    activeBorder: "#93C5FD",
    pillBg:       "#DBEAFE",
    pillColor:    "#1E40AF",
    pillBorder:   "#93C5FD",
  },
};

const STATUS_KEYS = Object.keys(STATUS_CONFIG) as AttendanceStatus[];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    year:    "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AsistenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: classId } = use(params);
  const searchParams    = useSearchParams();

  const dateInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate]         = useState(searchParams.get("date") ?? todayStr());
  const [records, setRecords]   = useState<StudentRecord[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Cargar asistencia ──────────────────────────────────────────────────────

  const loadAttendance = useCallback(
    async (d: string) => {
      setLoading(true);
      setError(null);
      setSaved(false);
      try {
        const res = await fetch(`/api/asistencia?classId=${classId}&date=${d}`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError((json as { error?: string }).error ?? "Error al cargar.");
          return;
        }
        const data: StudentRecord[] = await res.json();
        setRecords(data);
        const init: Record<string, AttendanceStatus | null> = {};
        data.forEach((r) => {
          init[r.enrollmentId] = (r.attendance?.status as AttendanceStatus) ?? null;
        });
        setStatuses(init);
      } catch {
        setError("Error de red. Intentá de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [classId],
  );

  useEffect(() => {
    loadAttendance(date);
  }, [date, loadAttendance]);

  // ── Cambiar estado ─────────────────────────────────────────────────────────

  function toggleStatus(enrollmentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({
      ...prev,
      [enrollmentId]: prev[enrollmentId] === status ? null : status,
    }));
    setSaved(false);
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError(null);
    setSaving(true);
    setSaved(false);

    const toSave = records
      .filter((r) => statuses[r.enrollmentId])
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
      setTimeout(() => setSaved(false), 3500);
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // ── Abrir date picker ──────────────────────────────────────────────────────

  function openDatePicker() {
    if (!dateInputRef.current) return;
    try {
      (dateInputRef.current as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      dateInputRef.current.click();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100%" }}>
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
            Asistencia guardada
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div
        style={{
          display:       "flex",
          alignItems:    "center",
          gap:           "16px",
          marginBottom:  "28px",
          flexWrap:      "wrap",
        }}
      >
        {/* Volver */}
        <Link
          href={`/dashboard/mis-clases/${classId}`}
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            width:           34,
            height:          34,
            borderRadius:    "9px",
            border:          "1px solid #EEECE8",
            background:      "white",
            color:           "#555555",
            textDecoration:  "none",
            flexShrink:      0,
          }}
        >
          <i className="ti ti-arrow-left" aria-hidden="true" style={{ fontSize: "15px" }} />
        </Link>

        {/* Título */}
        <h1
          style={{
            fontFamily:    "var(--font-fraunces)",
            fontWeight:    300,
            fontSize:      "28px",
            letterSpacing: "-0.03em",
            color:         "#111111",
            lineHeight:    1,
            flex:          1,
          }}
        >
          Asistencia
        </h1>

        {/* Chip de fecha */}
        <div style={{ position: "relative" }}>
          <motion.div
            onClick={openDatePicker}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          "8px",
              background:   "#F4F2EE",
              borderRadius: "20px",
              padding:      "8px 16px",
              cursor:       "pointer",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              fontWeight:   500,
              color:        "#333333",
              userSelect:   "none",
            }}
          >
            <i className="ti ti-calendar" aria-hidden="true" style={{ fontSize: "14px", color: "#FF3D5E" }} />
            {formatDateDisplay(date)}
          </motion.div>

          {/* Input date oculto detrás del chip */}
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              position:      "absolute",
              opacity:       0,
              pointerEvents: "none",
              width:         0,
              height:        0,
              top:           0,
              left:          0,
            }}
          />
        </div>
      </div>

      {/* ── Leyenda de estados ── */}
      <div
        style={{
          display:      "flex",
          gap:          "8px",
          flexWrap:     "wrap",
          marginBottom: "20px",
        }}
      >
        {STATUS_KEYS.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <span
              key={s}
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "6px",
                background:   cfg.pillBg,
                color:        cfg.pillColor,
                border:       `1.5px solid ${cfg.pillBorder}`,
                borderRadius: "20px",
                padding:      "6px 14px",
                fontFamily:   "var(--font-jakarta)",
                fontSize:     "12px",
                fontWeight:   600,
              }}
            >
              <i className={`ti ${cfg.icon}`} aria-hidden="true" style={{ fontSize: "13px" }} />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div
          style={{
            background:   "white",
            borderRadius: "16px",
            border:       "1px solid #EEECE8",
            padding:      "60px 40px",
            textAlign:    "center",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "13px",
            color:        "#AAAAAA",
          }}
        >
          Cargando lista…
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && records.length === 0 && (
        <div
          style={{
            background:   "white",
            borderRadius: "16px",
            border:       "1px solid #EEECE8",
            padding:      "60px 40px",
            textAlign:    "center",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "13px",
            color:        "#AAAAAA",
          }}
        >
          No hay alumnos inscriptos en esta clase.
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div
          style={{
            background:   "#FEF2F2",
            border:       "1px solid #FECACA",
            borderRadius: "10px",
            padding:      "12px 16px",
            marginBottom: "16px",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "13px",
            color:        "#991B1B",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Lista de alumnos ── */}
      {!loading && records.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {records.map((rec) => {
            const initials = getInitials(rec.student.firstName, rec.student.lastName);
            const selected = statuses[rec.enrollmentId];

            return (
              <div
                key={rec.enrollmentId}
                style={{
                  background:    "white",
                  borderRadius:  "16px",
                  border:        "1px solid #EEECE8",
                  padding:       "16px 20px",
                  display:       "flex",
                  alignItems:    "center",
                  gap:           "16px",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width:           48,
                    height:          48,
                    borderRadius:    "50%",
                    background:      "#FF3D5E",
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "center",
                    color:           "white",
                    fontFamily:      "var(--font-jakarta)",
                    fontWeight:      700,
                    fontSize:        "16px",
                    flexShrink:      0,
                  }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily:    "var(--font-fraunces)",
                      fontWeight:    400,
                      fontSize:      "16px",
                      letterSpacing: "-0.01em",
                      color:         "#111111",
                      whiteSpace:    "nowrap",
                      overflow:      "hidden",
                      textOverflow:  "ellipsis",
                    }}
                  >
                    {rec.student.firstName} {rec.student.lastName}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize:   "12px",
                      color:      "#888888",
                      marginTop:  "2px",
                    }}
                  >
                    {rec.student.email}
                  </div>
                </div>

                {/* Botones de estado 64×64 */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  {STATUS_KEYS.map((s) => {
                    const cfg      = STATUS_CONFIG[s];
                    const isActive = selected === s;

                    return (
                      <motion.button
                        key={s}
                        onClick={() => toggleStatus(rec.enrollmentId, s)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ scale: isActive ? 1.05 : 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        title={cfg.label}
                        style={{
                          width:          64,
                          height:         64,
                          borderRadius:   "12px",
                          border:         `1.5px solid ${isActive ? cfg.activeBorder : "#EEECE8"}`,
                          background:     isActive ? cfg.activeBg : "#FAFAF8",
                          cursor:         "pointer",
                          display:        "flex",
                          flexDirection:  "column",
                          alignItems:     "center",
                          justifyContent: "center",
                          gap:            "4px",
                          padding:        0,
                          transition:     "border-color 0.15s, background 0.15s",
                        }}
                      >
                        <i
                          className={`ti ${cfg.icon}`}
                          aria-hidden="true"
                          style={{
                            fontSize: "22px",
                            color:    isActive ? cfg.activeColor : "#CCCCCC",
                            lineHeight: 1,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize:   "9px",
                            fontWeight: 600,
                            color:      isActive ? cfg.activeColor : "#AAAAAA",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {cfg.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Guardar ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingTop: "4px" }}>
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
                  Guardar asistencia
                </>
              )}
            </motion.button>

            {/* Error inline (solo si no hay toast) */}
            <AnimatePresence>
              {error && !saving && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize:   "13px",
                    color:      "#991B1B",
                  }}
                >
                  {error}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
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
