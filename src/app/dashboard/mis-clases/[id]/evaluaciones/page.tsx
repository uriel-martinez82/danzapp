"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

// ── Types ─────────────────────────────────────────────────────────────────────

type Student = {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
};

type EvalStudent = {
  id:        string;
  firstName: string;
  lastName:  string;
  avatarUrl: string | null;
};

type EvalTeacher = {
  id:        string;
  firstName: string;
  lastName:  string;
};

type Evaluation = {
  id:            string;
  studentId:     string;
  teacherId:     string;
  classId:       string;
  evalDate:      string;
  score:         number | null;
  levelAchieved: string | null;
  notes:         string | null;
  student:       EvalStudent;
  teacher:       EvalTeacher;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  beginner:      { label: "Principiante",  bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
  intermediate:  { label: "Intermedio",    bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  advanced:      { label: "Avanzado",      bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
  outstanding:   { label: "Sobresaliente", bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
};

const LEVEL_OPTIONS = [
  { value: "beginner",    label: "Principiante"  },
  { value: "intermediate",label: "Intermedio"    },
  { value: "advanced",    label: "Avanzado"      },
  { value: "outstanding", label: "Sobresaliente" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** Color de score: 1-4 rojo, 5-6 amarillo, 7-8 verde, 9-10 esmeralda */
function scoreColor(score: number): string {
  if (score <= 4) return "#EF4444";
  if (score <= 6) return "#F59E0B";
  if (score <= 8) return "#22C55E";
  return "#10B981";
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width:        8,
            height:       8,
            borderRadius: "50%",
            background:   i < score ? scoreColor(score) : "#EEECE8",
            flexShrink:   0,
            transition:   "background 0.2s",
          }}
        />
      ))}
      <span
        style={{
          fontFamily:  "var(--font-jakarta)",
          fontSize:    "12px",
          fontWeight:  600,
          color:       scoreColor(score),
          marginLeft:  "6px",
        }}
      >
        {score}/10
      </span>
    </div>
  );
}

// ── Component principal ───────────────────────────────────────────────────────

export default function EvaluacionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: classId } = use(params);

  const [evaluaciones, setEvaluaciones] = useState<Evaluation[]>([]);
  const [students, setStudents]         = useState<Student[]>([]);
  const [className, setClassName]       = useState<string>("");
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [toast, setToast]               = useState<string | null>(null);
  const toastTimer                      = useState<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [fStudentId,  setFStudentId]    = useState("");
  const [fScore,      setFScore]        = useState<number>(7);
  const [fLevel,      setFLevel]        = useState("intermediate");
  const [fNotes,      setFNotes]        = useState("");
  const [fDate,       setFDate]         = useState(todayStr());
  const [saving,      setSaving]        = useState(false);
  const [formError,   setFormError]     = useState<string | null>(null);

  // ── Cargar datos ───────────────────────────────────────────────────────────

  const loadEvaluaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/evaluaciones?classId=${classId}`);
      if (res.ok) {
        const data: Evaluation[] = await res.json();
        setEvaluaciones(data);
      }
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    // Cargar evaluaciones y alumnos en paralelo
    Promise.all([
      fetch(`/api/evaluaciones?classId=${classId}`).then((r) => r.json()),
      fetch(`/api/clases/${classId}`).then((r) => r.json()),
    ]).then(([evals, claseData]) => {
      if (Array.isArray(evals)) setEvaluaciones(evals);
      if (claseData?.name)      setClassName(claseData.name);
      if (Array.isArray(claseData?.enrollments)) {
        setStudents(
          (claseData.enrollments as { student: Student }[]).map((e) => e.student),
        );
      }
    }).finally(() => setLoading(false));
  }, [classId]);

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    if (toastTimer[0]) clearTimeout(toastTimer[0]);
    setToast(msg);
    toastTimer[0] = setTimeout(() => setToast(null), 3500);
  }

  // ── Abrir / cerrar modal ───────────────────────────────────────────────────

  function openModal() {
    setFStudentId(students[0]?.id ?? "");
    setFScore(7);
    setFLevel("intermediate");
    setFNotes("");
    setFDate(todayStr());
    setFormError(null);
    setModalOpen(true);
  }

  // ── Guardar evaluación ─────────────────────────────────────────────────────

  async function handleSave() {
    if (!fStudentId) { setFormError("Seleccioná un alumno."); return; }
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/evaluaciones", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          studentId:     fStudentId,
          score:         fScore,
          levelAchieved: fLevel,
          notes:         fNotes.trim() || null,
          evalDate:      fDate,
        }),
      });
      const json = await res.json() as Evaluation & { error?: string };
      if (!res.ok) {
        setFormError((json as unknown as { error?: string }).error ?? "Error al guardar.");
        return;
      }
      setEvaluaciones((prev) => [json, ...prev]);
      setModalOpen(false);
      showToast("Evaluación registrada");
    } catch {
      setFormError("Error de red. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // ── Agrupar por alumno ─────────────────────────────────────────────────────

  const byStudent = evaluaciones.reduce<Record<string, Evaluation[]>>((acc, e) => {
    (acc[e.studentId] ??= []).push(e);
    return acc;
  }, {});

  const studentOrder = Object.keys(byStudent).sort((a, b) => {
    const na = `${byStudent[a][0].student.lastName} ${byStudent[a][0].student.firstName}`;
    const nb = `${byStudent[b][0].student.lastName} ${byStudent[b][0].student.firstName}`;
    return na.localeCompare(nb, "es");
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  const labelStyle: React.CSSProperties = {
    fontFamily:    "var(--font-jakarta)",
    fontSize:      "11px",
    fontWeight:    500,
    color:         "#999999",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom:  "6px",
    display:       "block",
  };

  const selectStyle: React.CSSProperties = {
    width:        "100%",
    padding:      "11px 14px",
    borderRadius: "10px",
    border:       "1px solid #EEECE8",
    fontFamily:   "var(--font-jakarta)",
    fontSize:     "14px",
    color:        "#111111",
    background:   "#FAFAF8",
    outline:      "none",
    appearance:   "none",
    cursor:       "pointer",
  };

  return (
    <PageTransition>
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{
              position:     "fixed",
              top:          24,
              right:        28,
              zIndex:       300,
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
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal de nueva evaluación ── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setModalOpen(false)}
              style={{
                position:   "fixed",
                inset:      0,
                background: "rgba(0,0,0,0.5)",
                zIndex:     100,
                backdropFilter: "blur(2px)",
              }}
            />

            {/* Card del modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              style={{
                position:      "fixed",
                top:           "50%",
                left:          "50%",
                transform:     "translate(-50%, -50%)",
                zIndex:        101,
                width:         "100%",
                maxWidth:      500,
                background:    "white",
                borderRadius:  "18px",
                boxShadow:     "0 20px 60px rgba(0,0,0,0.18)",
                overflow:      "hidden",
              }}
            >
              {/* Modal header */}
              <div
                style={{
                  padding:      "22px 26px 18px",
                  borderBottom: "1px solid #F4F2EE",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "space-between",
                }}
              >
                <h2
                  style={{
                    fontFamily:    "var(--font-fraunces)",
                    fontWeight:    400,
                    fontSize:      "20px",
                    letterSpacing: "-0.02em",
                    color:         "#111111",
                  }}
                >
                  Nueva evaluación
                </h2>
                <button
                  onClick={() => !saving && setModalOpen(false)}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    width:          30,
                    height:         30,
                    borderRadius:   "8px",
                    border:         "1px solid #EEECE8",
                    background:     "white",
                    color:          "#777777",
                    cursor:         "pointer",
                    fontSize:       "14px",
                    flexShrink:     0,
                  }}
                >
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>

              {/* Modal body */}
              <div style={{ padding: "22px 26px 26px", display: "flex", flexDirection: "column", gap: "18px" }}>

                {/* Alumno */}
                <div>
                  <label style={labelStyle}>Alumno</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={fStudentId}
                      onChange={(e) => { setFStudentId(e.target.value); setFormError(null); }}
                      style={selectStyle}
                    >
                      {students.length === 0 && (
                        <option value="">Sin alumnos inscriptos</option>
                      )}
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.lastName}, {s.firstName}
                        </option>
                      ))}
                    </select>
                    <i
                      className="ti ti-chevron-down"
                      aria-hidden="true"
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#999999", pointerEvents: "none" }}
                    />
                  </div>
                </div>

                {/* Score */}
                <div>
                  <label style={labelStyle}>
                    Score — <span style={{ color: scoreColor(fScore), fontWeight: 700 }}>{fScore}/10</span>
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {Array.from({ length: 10 }, (_, i) => {
                      const val = i + 1;
                      const active = val <= fScore;
                      return (
                        <motion.button
                          key={val}
                          onClick={() => setFScore(val)}
                          whileHover={{ scale: 1.18 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 400, damping: 18 }}
                          title={String(val)}
                          style={{
                            flex:         1,
                            aspectRatio:  "1",
                            borderRadius: "8px",
                            border:       `1.5px solid ${active ? scoreColor(val) : "#EEECE8"}`,
                            background:   active ? scoreColor(val) : "#FAFAF8",
                            color:        active ? "white" : "#CCCCCC",
                            fontFamily:   "var(--font-jakarta)",
                            fontSize:     "12px",
                            fontWeight:   700,
                            cursor:       "pointer",
                            padding:      0,
                            transition:   "background 0.12s, border-color 0.12s, color 0.12s",
                          }}
                        >
                          {val}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Nivel alcanzado */}
                <div>
                  <label style={labelStyle}>Nivel alcanzado</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={fLevel}
                      onChange={(e) => setFLevel(e.target.value)}
                      style={selectStyle}
                    >
                      {LEVEL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <i
                      className="ti ti-chevron-down"
                      aria-hidden="true"
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#999999", pointerEvents: "none" }}
                    />
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label style={labelStyle}>Notas (opcional)</label>
                  <textarea
                    value={fNotes}
                    onChange={(e) => setFNotes(e.target.value)}
                    placeholder="Observaciones sobre el progreso del alumno…"
                    rows={3}
                    style={{
                      width:        "100%",
                      padding:      "11px 14px",
                      borderRadius: "10px",
                      border:       "1px solid #EEECE8",
                      fontFamily:   "var(--font-jakarta)",
                      fontSize:     "13px",
                      color:        "#111111",
                      background:   "#FAFAF8",
                      outline:      "none",
                      resize:       "vertical",
                      boxSizing:    "border-box",
                      lineHeight:   1.55,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                  />
                </div>

                {/* Fecha */}
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input
                    type="date"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    style={{
                      width:        "100%",
                      padding:      "11px 14px",
                      borderRadius: "10px",
                      border:       "1px solid #EEECE8",
                      fontFamily:   "var(--font-jakarta)",
                      fontSize:     "14px",
                      color:        "#111111",
                      background:   "#FAFAF8",
                      outline:      "none",
                      boxSizing:    "border-box",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                  />
                </div>

                {/* Error */}
                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        background:   "#FEF2F2",
                        border:       "1px solid #FECACA",
                        borderRadius: "8px",
                        padding:      "10px 14px",
                        fontFamily:   "var(--font-jakarta)",
                        fontSize:     "13px",
                        color:        "#991B1B",
                        display:      "flex",
                        alignItems:   "center",
                        gap:          "6px",
                      }}
                    >
                      <i className="ti ti-alert-circle" aria-hidden="true" style={{ fontSize: "14px" }} />
                      {formError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Acciones */}
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
                  <button
                    onClick={() => !saving && setModalOpen(false)}
                    disabled={saving}
                    style={{
                      padding:      "11px 20px",
                      borderRadius: "10px",
                      border:       "1px solid #EEECE8",
                      background:   "white",
                      fontFamily:   "var(--font-jakarta)",
                      fontSize:     "13px",
                      fontWeight:   500,
                      color:        "#555555",
                      cursor:       saving ? "not-allowed" : "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <motion.button
                    onClick={handleSave}
                    disabled={saving}
                    whileHover={saving ? {} : { scale: 1.02 }}
                    whileTap={saving ? {} : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    style={{
                      display:      "inline-flex",
                      alignItems:   "center",
                      gap:          "8px",
                      padding:      "11px 24px",
                      borderRadius: "10px",
                      border:       "none",
                      background:   saving ? "#CCCCCC" : "#FF3D5E",
                      color:        "white",
                      fontFamily:   "var(--font-jakarta)",
                      fontSize:     "13px",
                      fontWeight:   600,
                      cursor:       saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? (
                      <>
                        <i className="ti ti-loader-2" style={{ fontSize: "14px", animation: "spin 1s linear infinite" }} />
                        Guardando…
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check" style={{ fontSize: "14px" }} />
                        Guardar
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px", flexWrap: "wrap" }}>
        {/* Botón volver */}
        <Link
          href={`/dashboard/mis-clases/${classId}`}
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            width:          34,
            height:         34,
            borderRadius:   "9px",
            border:         "1px solid #EEECE8",
            background:     "white",
            color:          "#555555",
            textDecoration: "none",
            flexShrink:     0,
          }}
        >
          <i className="ti ti-arrow-left" aria-hidden="true" style={{ fontSize: "15px" }} />
        </Link>

        {/* Título */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontFamily:    "var(--font-fraunces)",
              fontWeight:    300,
              fontSize:      "28px",
              letterSpacing: "-0.03em",
              color:         "#111111",
              lineHeight:    1.1,
              whiteSpace:    "nowrap",
              overflow:      "hidden",
              textOverflow:  "ellipsis",
            }}
          >
            Evaluaciones
            {className && (
              <span style={{ color: "#AAAAAA", fontWeight: 300 }}> — {className}</span>
            )}
          </h1>
        </div>

        {/* Botón nueva evaluación */}
        <motion.button
          onClick={openModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "8px",
            padding:      "11px 20px",
            borderRadius: "10px",
            border:       "none",
            background:   "#FF3D5E",
            color:        "white",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "13px",
            fontWeight:   600,
            cursor:       "pointer",
            flexShrink:   0,
          }}
        >
          <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
          Nueva evaluación
        </motion.button>
      </div>

      {/* ── Loading ── */}
      {loading && (
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
          Cargando evaluaciones…
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && evaluaciones.length === 0 && (
        <div
          style={{
            background:   "white",
            borderRadius: "14px",
            border:       "1px solid #EEECE8",
            padding:      "80px 40px",
            textAlign:    "center",
          }}
        >
          <div
            style={{
              width:          48,
              height:         48,
              borderRadius:   "12px",
              background:     "#FFF0F2",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              margin:         "0 auto 16px",
            }}
          >
            <i className="ti ti-star" aria-hidden="true" style={{ fontSize: "22px", color: "#FF3D5E" }} />
          </div>
          <h2
            style={{
              fontFamily:    "var(--font-fraunces)",
              fontWeight:    400,
              fontSize:      "18px",
              letterSpacing: "-0.02em",
              color:         "#111111",
              marginBottom:  "8px",
            }}
          >
            Sin evaluaciones aún
          </h2>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999" }}>
            Registrá el progreso de tus alumnos con "Nueva evaluación".
          </p>
        </div>
      )}

      {/* ── Lista por alumno ── */}
      {!loading && studentOrder.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {studentOrder.map((studentId, cardIdx) => {
            const evals   = byStudent[studentId];
            const student = evals[0].student;
            const initials = getInitials(student.firstName, student.lastName);

            return (
              <motion.div
                key={studentId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: cardIdx * 0.06 }}
                style={{
                  background:   "white",
                  borderRadius: "14px",
                  border:       "1px solid #EEECE8",
                  overflow:     "hidden",
                }}
              >
                {/* Card header — alumno */}
                <div
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "12px",
                    padding:      "16px 22px",
                    borderBottom: "1px solid #F4F2EE",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width:          40,
                      height:         40,
                      borderRadius:   "50%",
                      background:     "#FF3D5E",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      color:          "white",
                      fontFamily:     "var(--font-jakarta)",
                      fontWeight:     700,
                      fontSize:       "14px",
                      flexShrink:     0,
                      overflow:       "hidden",
                    }}
                  >
                    {student.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={student.avatarUrl}
                        alt={initials}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily:  "var(--font-jakarta)",
                        fontSize:    "14px",
                        fontWeight:  500,
                        color:       "#111111",
                      }}
                    >
                      {student.firstName} {student.lastName}
                    </div>
                  </div>

                  <span
                    style={{
                      fontFamily:  "var(--font-jakarta)",
                      fontSize:    "12px",
                      color:       "#999999",
                    }}
                  >
                    {evals.length} {evals.length === 1 ? "evaluación" : "evaluaciones"}
                  </span>
                </div>

                {/* Timeline */}
                <div style={{ padding: "18px 22px 20px" }}>
                  <div style={{ position: "relative" }}>
                    {/* Línea vertical */}
                    <div
                      style={{
                        position:   "absolute",
                        left:       7,
                        top:        12,
                        bottom:     12,
                        width:      1,
                        background: "#EEECE8",
                        zIndex:     0,
                      }}
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {evals.map((ev, evIdx) => {
                        const levelCfg = ev.levelAchieved ? (LEVEL_CONFIG[ev.levelAchieved] ?? null) : null;
                        const dotColor = ev.score ? scoreColor(ev.score) : "#CCCCCC";

                        return (
                          <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25, delay: cardIdx * 0.06 + evIdx * 0.04 }}
                            style={{
                              display:  "flex",
                              gap:      "16px",
                              position: "relative",
                              zIndex:   1,
                            }}
                          >
                            {/* Dot de timeline */}
                            <div
                              style={{
                                width:        15,
                                height:       15,
                                borderRadius: "50%",
                                background:   dotColor,
                                border:       `2.5px solid white`,
                                boxShadow:    `0 0 0 1.5px ${dotColor}`,
                                flexShrink:   0,
                                marginTop:    4,
                              }}
                            />

                            {/* Contenido */}
                            <div style={{ flex: 1, minWidth: 0, paddingBottom: evIdx < evals.length - 1 ? "0" : "0" }}>
                              {/* Fecha + nivel */}
                              <div
                                style={{
                                  display:     "flex",
                                  alignItems:  "center",
                                  gap:         "8px",
                                  flexWrap:    "wrap",
                                  marginBottom: "6px",
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily:  "var(--font-jakarta)",
                                    fontSize:    "12px",
                                    fontWeight:  500,
                                    color:       "#555555",
                                  }}
                                >
                                  {formatDate(ev.evalDate)}
                                </span>
                                <span
                                  style={{
                                    fontFamily:  "var(--font-jakarta)",
                                    fontSize:    "11px",
                                    color:       "#AAAAAA",
                                  }}
                                >
                                  por {ev.teacher.firstName} {ev.teacher.lastName}
                                </span>

                                {levelCfg && (
                                  <span
                                    style={{
                                      background:   levelCfg.bg,
                                      color:        levelCfg.color,
                                      border:       `1px solid ${levelCfg.border}`,
                                      borderRadius: "20px",
                                      padding:      "2px 10px",
                                      fontFamily:   "var(--font-jakarta)",
                                      fontSize:     "11px",
                                      fontWeight:   600,
                                    }}
                                  >
                                    {levelCfg.label}
                                  </span>
                                )}
                              </div>

                              {/* Score */}
                              {ev.score !== null && (
                                <div style={{ marginBottom: ev.notes ? "6px" : "0" }}>
                                  <ScoreDots score={ev.score} />
                                </div>
                              )}

                              {/* Notas */}
                              {ev.notes && (
                                <p
                                  style={{
                                    fontFamily:  "var(--font-jakarta)",
                                    fontSize:    "13px",
                                    color:       "#666666",
                                    lineHeight:  1.55,
                                    margin:      0,
                                    marginTop:   "4px",
                                  }}
                                >
                                  {ev.notes}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
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
