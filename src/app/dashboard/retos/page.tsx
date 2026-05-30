"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

// ── Types ─────────────────────────────────────────────────────────────────────

type QuizQuestion = {
  question: string;
  options:  string[];  // exactly 4 options
  correct:  number;    // 0-3 index
};

type QuizAnswer = {
  questionIndex:  number;
  selectedOption: number;
  correct?:       boolean;
};

type MyEntry = {
  id:            string;
  status:        "pending" | "completed" | "validated";
  completedAt:   string | null;
  validatedAt:   string | null;
  note:          string | null;
  mediaUrl:      string | null;
  answers:       QuizAnswer[] | null;
  practiceCount: number;
};

type EntryDetail = MyEntry & {
  userId: string;
  user:   { id: string; firstName: string; lastName: string; avatarUrl: string | null };
};

type Challenge = {
  id:             string;
  title:          string;
  description:    string;
  points:         number;
  dueDate:        string | null;
  targetType:     string;
  targetId:       string | null;
  classId:        string | null;
  className:      string | null;
  createdAt:      string;
  author:         { id: string; firstName: string; lastName: string };
  type:           "simple" | "quiz" | "multimedia" | "practice";
  questions:      QuizQuestion[] | null;
  practiceGoal:   number | null;
  myEntry:        MyEntry | null;
  entriesCount:   number;
  validatedCount: number;
  completedCount: number;
  entries?:       EntryDetail[];
};

type Profile    = { id: string; role: string; firstName: string; lastName: string };
type ClassItem  = { id: string; name: string };
type StudentItem = { id: string; firstName: string; lastName: string };
type Toast      = { msg: string; type: "success" | "error" } | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(iso));
}

function calcStreak(challenges: Challenge[]): number {
  const dates = challenges
    .flatMap((c) => (c.myEntry?.completedAt ? [c.myEntry.completedAt] : []))
    .map((d) => d.split("T")[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
    .reverse();

  if (!dates.length) return 0;
  const today  = new Date().toISOString().split("T")[0];
  let streak   = 0;
  let cursor   = today;
  for (const d of dates) {
    if (d === cursor) {
      streak++;
      const dt = new Date(cursor);
      dt.setDate(dt.getDate() - 1);
      cursor = dt.toISOString().split("T")[0];
    } else if (d < cursor) break;
  }
  return streak;
}

function targetLabel(c: Challenge) {
  if (c.targetType === "all")     return "Todos";
  if (c.targetType === "class")   return `Clase: ${c.className ?? c.classId}`;
  if (c.targetType === "student") return "Alumna específica";
  return c.targetType;
}

const TYPE_LABELS: Record<string, string> = {
  simple:     "Simple",
  quiz:       "Quiz",
  multimedia: "Multimedia",
  practice:   "Práctica",
};

const TYPE_ICONS: Record<string, string> = {
  simple:     "ti-check",
  quiz:       "ti-help",
  multimedia: "ti-photo-video",
  practice:   "ti-repeat",
};

// ── PointsBadge ───────────────────────────────────────────────────────────────

function PointsBadge({ points }: { points: number }) {
  return (
    <span
      style={{
        background:    "#FF3D5E",
        color:         "white",
        fontFamily:    "var(--font-jakarta)",
        fontWeight:    700,
        fontSize:      "11px",
        padding:       "3px 9px",
        borderRadius:  "9999px",
        letterSpacing: "0.02em",
        flexShrink:    0,
      }}
    >
      +{points} pts
    </span>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "4px",
        background:   "#F4F2EE",
        color:        "#555555",
        fontFamily:   "var(--font-jakarta)",
        fontSize:     "11px",
        padding:      "3px 8px",
        borderRadius: "6px",
        flexShrink:   0,
      }}
    >
      <i className={`ti ${TYPE_ICONS[type] ?? "ti-trophy"}`} aria-hidden="true" style={{ fontSize: "11px" }} />
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ── PracticeBar ───────────────────────────────────────────────────────────────

function PracticeBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", color: "#888888" }}>
          Progreso
        </span>
        <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", fontWeight: 600, color: "#555555" }}>
          {current}/{goal}
        </span>
      </div>
      <div style={{ background: "#F4F2EE", borderRadius: "9999px", height: 6, overflow: "hidden" }}>
        <div
          style={{
            width:        `${pct}%`,
            height:       "100%",
            background:   pct === 100 ? "#1D9E75" : "#FF3D5E",
            borderRadius: "9999px",
            transition:   "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── QuizModal ─────────────────────────────────────────────────────────────────

function QuizModal({
  challenge,
  onClose,
  onSubmit,
}: {
  challenge: Challenge;
  onClose:   () => void;
  onSubmit:  (answers: QuizAnswer[]) => Promise<void>;
}) {
  const questions  = challenge.questions ?? [];
  const [step,     setStep]     = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [saving,   setSaving]   = useState(false);

  const current = questions[step];
  const picked  = selected[step];

  function pick(optIdx: number) {
    setSelected((prev) => {
      const next = [...prev];
      next[step] = optIdx;
      return next;
    });
  }

  async function handleNext() {
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      setSaving(true);
      const answers: QuizAnswer[] = selected.map((s, i) => ({
        questionIndex:  i,
        selectedOption: s ?? 0,
      }));
      await onSubmit(answers);
    }
  }

  if (!current) return null;

  const pct = Math.round(((step + 1) / questions.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position:   "fixed",
        inset:      0,
        background: "rgba(0,0,0,0.45)",
        zIndex:     70,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:    "16px",
        backdropFilter: "blur(4px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "white",
          borderRadius: "18px",
          padding:      "32px",
          width:        "100%",
          maxWidth:     480,
          boxShadow:    "0 24px 64px rgba(0,0,0,0.16)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#AAAAAA", marginBottom: "2px" }}>
              Pregunta {step + 1} de {questions.length}
            </p>
            <div style={{ background: "#F4F2EE", borderRadius: "9999px", height: 4, width: 160 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#FF3D5E", borderRadius: "9999px", transition: "width 0.3s ease" }} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAAAAA", fontSize: "18px" }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {/* Question */}
        <h3
          style={{
            fontFamily:    "var(--font-jakarta)",
            fontWeight:    600,
            fontSize:      "17px",
            color:         "#111111",
            lineHeight:    1.4,
            marginBottom:  "20px",
          }}
        >
          {current.question}
        </h3>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {current.options.map((opt, i) => {
            const isSelected = picked === i;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           "12px",
                  padding:       "12px 16px",
                  borderRadius:  "12px",
                  border:        `2px solid ${isSelected ? "#FF3D5E" : "#EEECE8"}`,
                  background:    isSelected ? "#FFF0F2" : "#FAFAF8",
                  cursor:        "pointer",
                  transition:    "border-color 0.15s, background 0.15s",
                  textAlign:     "left",
                }}
              >
                <span
                  style={{
                    width:          28,
                    height:         28,
                    borderRadius:   "50%",
                    background:     isSelected ? "#FF3D5E" : "#F4F2EE",
                    color:          isSelected ? "white" : "#777777",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontFamily:     "var(--font-jakarta)",
                    fontWeight:     700,
                    fontSize:       "12px",
                    flexShrink:     0,
                    transition:     "background 0.15s, color 0.15s",
                  }}
                >
                  {["A", "B", "C", "D"][i]}
                </span>
                <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "14px", color: "#333333", lineHeight: 1.4 }}>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Next / Submit */}
        <button
          onClick={handleNext}
          disabled={picked === null || saving}
          style={{
            width:        "100%",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            gap:          "8px",
            background:   picked === null || saving ? "#F4F2EE" : "#FF3D5E",
            color:        picked === null || saving ? "#AAAAAA" : "white",
            border:       "none",
            borderRadius: "12px",
            padding:      "14px",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "14px",
            fontWeight:   600,
            cursor:       picked === null || saving ? "not-allowed" : "pointer",
            transition:   "background 0.15s, color 0.15s",
          }}
        >
          {saving ? (
            <><i className="ti ti-loader-2" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />Enviando…</>
          ) : step < questions.length - 1 ? (
            <>Siguiente <i className="ti ti-arrow-right" aria-hidden="true" /></>
          ) : (
            <>Enviar respuestas <i className="ti ti-check" aria-hidden="true" /></>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── MultimediaModal ───────────────────────────────────────────────────────────

function MultimediaModal({
  challenge,
  onClose,
  onSubmit,
}: {
  challenge: Challenge;
  onClose:   () => void;
  onSubmit:  (mediaUrl: string) => Promise<void>;
}) {
  const fileRef    = useRef<HTMLInputElement>(null);
  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [drag,     setDrag]     = useState(false);

  function handleFile(f: File) {
    setError(null);
    const isImg   = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImg && !isVideo) {
      setError("Solo se admiten imágenes o videos.");
      return;
    }
    const maxMB = isImg ? 5 : 50;
    if (f.size > maxMB * 1024 * 1024) {
      setError(`El archivo supera el límite de ${maxMB} MB.`);
      return;
    }
    setFile(f);
    if (isImg) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/retos/${challenge.id}/media`, {
        method: "POST",
        body:   form,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Error al subir el archivo");
      }
      const { url } = await res.json() as { url: string };
      await onSubmit(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
      setUploading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position:   "fixed",
        inset:      0,
        background: "rgba(0,0,0,0.45)",
        zIndex:     70,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:    "16px",
        backdropFilter: "blur(4px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "white",
          borderRadius: "18px",
          padding:      "32px",
          width:        "100%",
          maxWidth:     460,
          boxShadow:    "0 24px 64px rgba(0,0,0,0.16)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "20px", letterSpacing: "-0.02em", color: "#111111" }}>
              Subir evidencia
            </h3>
            <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#999999", marginTop: "2px" }}>
              {challenge.title}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAAAAA", fontSize: "18px" }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          style={{
            border:         `2px dashed ${drag ? "#FF3D5E" : "#DDDDDD"}`,
            borderRadius:   "14px",
            padding:        "28px 20px",
            textAlign:      "center",
            cursor:         "pointer",
            background:     drag ? "#FFF0F2" : "#FAFAF8",
            transition:     "border-color 0.15s, background 0.15s",
            marginBottom:   "16px",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="preview"
              style={{ maxHeight: 160, maxWidth: "100%", borderRadius: "10px", objectFit: "cover" }}
            />
          ) : file ? (
            <div>
              <i className="ti ti-video" aria-hidden="true" style={{ fontSize: "36px", color: "#FF3D5E" }} />
              <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#555555", marginTop: "8px" }}>
                {file.name}
              </p>
            </div>
          ) : (
            <>
              <i className="ti ti-cloud-upload" aria-hidden="true" style={{ fontSize: "36px", color: "#CCCCCC" }} />
              <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "14px", color: "#666666", marginTop: "10px" }}>
                Arrastrá o hacé clic para elegir
              </p>
              <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", color: "#AAAAAA", marginTop: "4px" }}>
                Imagen hasta 5 MB · Video hasta 50 MB
              </p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#CC1F3C", marginBottom: "12px" }}>
            <i className="ti ti-alert-circle" aria-hidden="true" style={{ fontSize: "13px" }} /> {error}
          </p>
        )}

        {/* Change + Upload */}
        <div style={{ display: "flex", gap: "10px" }}>
          {file && (
            <button
              onClick={() => { setFile(null); setPreview(null); setError(null); }}
              style={{
                flex:         1,
                padding:      "12px",
                borderRadius: "10px",
                border:       "1px solid #EEECE8",
                background:   "white",
                fontFamily:   "var(--font-jakarta)",
                fontSize:     "13px",
                color:        "#555555",
                cursor:       "pointer",
              }}
            >
              Cambiar
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              flex:         2,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              gap:          "6px",
              padding:      "12px",
              borderRadius: "10px",
              border:       "none",
              background:   !file || uploading ? "#F4F2EE" : "#FF3D5E",
              color:        !file || uploading ? "#AAAAAA" : "white",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       !file || uploading ? "not-allowed" : "pointer",
              transition:   "background 0.15s",
            }}
          >
            {uploading ? (
              <><i className="ti ti-loader-2" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />Subiendo…</>
            ) : (
              <><i className="ti ti-upload" aria-hidden="true" />Enviar evidencia</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── StudentCard ───────────────────────────────────────────────────────────────

function StudentCard({
  challenge:   c,
  onComplete,
  onPractice,
  onOpenQuiz,
  onOpenMedia,
}: {
  challenge:   Challenge;
  onComplete:  (id: string) => Promise<void>;
  onPractice:  (id: string) => Promise<void>;
  onOpenQuiz:  (c: Challenge) => void;
  onOpenMedia: (c: Challenge) => void;
}) {
  const [loading, setLoading] = useState(false);
  const status = c.myEntry?.status ?? "pending";
  const isPastDue = c.dueDate ? new Date(c.dueDate) < new Date() : false;

  const practiceCount = c.myEntry?.practiceCount ?? 0;
  const practiceGoal  = c.practiceGoal ?? 1;

  async function handleSimple() {
    setLoading(true);
    await onComplete(c.id);
    setLoading(false);
  }

  async function handlePracticeClick() {
    setLoading(true);
    await onPractice(c.id);
    setLoading(false);
  }

  const bgColor =
    status === "validated" ? "#F0FAF5" :
    c.type === "practice" && practiceCount > 0 ? "#FFFBF2" :
    "white";

  const iconColor =
    status === "validated" ? "#1D9E75" :
    c.type === "quiz"       ? "#8B5CF6" :
    c.type === "multimedia" ? "#3B82F6" :
    c.type === "practice"   ? "#F59E0B" :
    "#FF3D5E";

  const iconBg =
    status === "validated" ? "#1D9E75" :
    c.type === "quiz"       ? "#EDE9FE" :
    c.type === "multimedia" ? "#EFF6FF" :
    c.type === "practice"   ? "#FEF3C7" :
    "#FFF0F2";

  const iconName =
    status === "validated" ? "ti-check" :
    status === "completed" ? "ti-clock" :
    c.type === "quiz"       ? "ti-help"  :
    c.type === "multimedia" ? "ti-photo-video" :
    c.type === "practice"   ? "ti-repeat" :
    "ti-trophy";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className="pasada-card"
      style={{
        background:   bgColor,
        borderRadius: "14px",
        padding:      "20px 22px",
        display:      "flex",
        alignItems:   "flex-start",
        gap:          "16px",
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width:          48,
          height:         48,
          borderRadius:   "50%",
          background:     iconBg,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
        }}
      >
        <i
          className={`ti ${iconName}`}
          aria-hidden="true"
          style={{
            fontSize: "20px",
            color:    status === "validated" ? "white" : iconColor,
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "15px", color: "#111111", lineHeight: 1.3 }}>
              {c.title}
            </h3>
            <TypeBadge type={c.type} />
          </div>
          <PointsBadge points={c.points} />
        </div>

        <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#666666", lineHeight: 1.55 }}>
          {c.description}
        </p>

        {/* Practice progress bar */}
        {c.type === "practice" && status !== "validated" && (
          <div style={{ marginTop: "12px" }}>
            <PracticeBar current={practiceCount} goal={practiceGoal} />
          </div>
        )}

        {/* Actions row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
          {c.dueDate && (
            <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: isPastDue ? "#CC1F3C" : "#888888", display: "flex", alignItems: "center", gap: "4px" }}>
              <i className="ti ti-calendar-due" aria-hidden="true" style={{ fontSize: "13px" }} />
              {isPastDue ? "Venció: " : "Vence: "}{formatDate(c.dueDate)}
            </span>
          )}

          {/* ── Status / action based on type ── */}
          {status === "validated" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontFamily: "var(--font-jakarta)", fontSize: "12px", fontWeight: 600, color: "#1D9E75", background: "#E8F5E9", padding: "4px 10px", borderRadius: "6px" }}>
              <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: "13px" }} />
              Validado
            </span>
          )}

          {status === "completed" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#888888", fontStyle: "italic" }}>
              <i className="ti ti-clock" aria-hidden="true" style={{ fontSize: "13px" }} />
              Esperando validación
            </span>
          )}

          {status === "pending" && (
            <>
              {/* Simple */}
              {c.type === "simple" && (
                <button
                  onClick={handleSimple}
                  disabled={loading}
                  style={actionBtnStyle(loading, "#FF3D5E")}
                >
                  {loading ? <SpinIcon /> : <i className="ti ti-check" aria-hidden="true" style={{ fontSize: "13px" }} />}
                  {loading ? "Guardando…" : "¡Lo hice!"}
                </button>
              )}

              {/* Quiz */}
              {c.type === "quiz" && (
                <button
                  onClick={() => onOpenQuiz(c)}
                  style={actionBtnStyle(false, "#8B5CF6")}
                >
                  <i className="ti ti-help" aria-hidden="true" style={{ fontSize: "13px" }} />
                  Responder quiz
                </button>
              )}

              {/* Multimedia */}
              {c.type === "multimedia" && (
                <button
                  onClick={() => onOpenMedia(c)}
                  style={actionBtnStyle(false, "#3B82F6")}
                >
                  <i className="ti ti-photo-video" aria-hidden="true" style={{ fontSize: "13px" }} />
                  Subir evidencia
                </button>
              )}

              {/* Practice */}
              {c.type === "practice" && practiceCount < practiceGoal && (
                <button
                  onClick={handlePracticeClick}
                  disabled={loading}
                  style={actionBtnStyle(loading, "#F59E0B")}
                >
                  {loading ? <SpinIcon /> : <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "13px" }} />}
                  {loading ? "Guardando…" : "Registrar práctica"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SpinIcon() {
  return <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: "13px", animation: "spin 1s linear infinite" }} />;
}

function actionBtnStyle(loading: boolean, color: string): React.CSSProperties {
  return {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "6px",
    background:   loading ? "#F4F2EE" : color,
    color:        loading ? "#999" : "white",
    border:       "none",
    borderRadius: "8px",
    padding:      "7px 16px",
    fontFamily:   "var(--font-jakarta)",
    fontSize:     "12px",
    fontWeight:   600,
    cursor:       loading ? "not-allowed" : "pointer",
    transition:   "background 0.15s",
  };
}

// ── StudentView ───────────────────────────────────────────────────────────────

function StudentView({
  challenges,
  onComplete,
  onPractice,
  toast,
  setToast,
}: {
  challenges: Challenge[];
  onComplete: (id: string, body?: Record<string, unknown>) => Promise<void>;
  onPractice: (id: string) => Promise<void>;
  toast:      Toast;
  setToast:   (t: Toast) => void;
}) {
  const [tab,        setTab]        = useState<"pending" | "completed" | "validated">("pending");
  const [quizTarget, setQuizTarget] = useState<Challenge | null>(null);
  const [mediaTarget,setMediaTarget]= useState<Challenge | null>(null);

  const totalPoints = challenges
    .filter((c) => c.myEntry?.status === "validated")
    .reduce((s, c) => s + c.points, 0);

  const streak = calcStreak(challenges);

  const pending   = challenges.filter((c) => !c.myEntry || c.myEntry.status === "pending");
  const completed = challenges.filter((c) => c.myEntry?.status === "completed");
  const validated = challenges.filter((c) => c.myEntry?.status === "validated");

  const tabs = [
    { key: "pending",   label: "Pendientes", count: pending.length },
    { key: "completed", label: "Completados", count: completed.length },
    { key: "validated", label: "Validados",   count: validated.length },
  ] as const;

  const shown =
    tab === "pending"   ? pending   :
    tab === "completed" ? completed :
    validated;

  async function handleQuizSubmit(answers: QuizAnswer[]) {
    if (!quizTarget) return;
    await onComplete(quizTarget.id, { answers });
    setQuizTarget(null);
    setToast({ msg: "¡Quiz enviado! Esperando validación.", type: "success" });
  }

  async function handleMediaSubmit(mediaUrl: string) {
    if (!mediaTarget) return;
    await onComplete(mediaTarget.id, { mediaUrl });
    setMediaTarget(null);
    setToast({ msg: "¡Evidencia enviada! Esperando validación.", type: "success" });
  }

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 300, fontSize: "32px", letterSpacing: "-0.03em", color: "#111111", lineHeight: 1.1 }}>
            Mis Retos
          </h1>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", marginTop: "4px" }}>
            Completá desafíos y sumá puntos
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div className="pasada-card" style={{ background: "white", borderRadius: "14px", padding: "14px 20px", textAlign: "center", minWidth: 90 }}>
            <div style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "28px", letterSpacing: "-0.02em", color: "#FF3D5E", lineHeight: 1 }}>
              {totalPoints}
            </div>
            <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginTop: "4px" }}>puntos</div>
          </div>
          {streak > 0 && (
            <div className="pasada-card" style={{ background: "white", borderRadius: "14px", padding: "14px 20px", textAlign: "center", minWidth: 90 }}>
              <div style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "28px", letterSpacing: "-0.02em", color: "#F59E0B", lineHeight: 1 }}>
                {streak}🔥
              </div>
              <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginTop: "4px" }}>racha</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "white", borderRadius: "12px", padding: "4px", border: "1px solid #EEECE8", width: "fit-content" }}>
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "6px",
              padding:      "8px 16px",
              borderRadius: "8px",
              border:       "none",
              background:   tab === key ? "#111111" : "none",
              color:        tab === key ? "white" : "#555555",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              fontWeight:   tab === key ? 600 : 400,
              cursor:       "pointer",
              transition:   "background 0.15s, color 0.15s",
            }}
          >
            {label}
            {count > 0 && (
              <span style={{ background: tab === key ? "rgba(255,255,255,0.2)" : "#F4F2EE", color: tab === key ? "white" : "#777777", borderRadius: "9999px", fontSize: "11px", fontWeight: 600, padding: "1px 7px", lineHeight: 1.4 }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Cards ── */}
      {shown.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ background: "white", borderRadius: "14px", border: "1px solid #EEECE8", padding: "64px 40px", textAlign: "center" }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>
            {tab === "pending" ? "🎉" : tab === "completed" ? "⏳" : "🏆"}
          </div>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "14px", color: "#999999" }}>
            {tab === "pending"
              ? "¡Estás al día! No hay retos pendientes."
              : tab === "completed"
              ? "No hay retos esperando validación."
              : "Todavía no tenés retos validados."}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {shown.map((c) => (
              <StudentCard
                key={c.id}
                challenge={c}
                onComplete={onComplete}
                onPractice={onPractice}
                onOpenQuiz={setQuizTarget}
                onOpenMedia={setMediaTarget}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Link al ranking */}
      <div style={{ marginTop: "28px", textAlign: "center" }}>
        <Link href="/dashboard/retos/ranking" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#FF3D5E", fontWeight: 500, textDecoration: "none" }}>
          <i className="ti ti-trophy" aria-hidden="true" />
          Ver ranking
        </Link>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {quizTarget && (
          <QuizModal
            challenge={quizTarget}
            onClose={() => setQuizTarget(null)}
            onSubmit={handleQuizSubmit}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mediaTarget && (
          <MultimediaModal
            challenge={mediaTarget}
            onClose={() => setMediaTarget(null)}
            onSubmit={handleMediaSubmit}
          />
        )}
      </AnimatePresence>

      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── AdminView ─────────────────────────────────────────────────────────────────

function AdminView({
  challenges,
  profile,
  onCreated,
  onValidate,
  toast,
  setToast,
}: {
  challenges: Challenge[];
  profile:    Profile;
  onCreated:  (c: Challenge) => void;
  onValidate: (challengeId: string, userId: string, approved: boolean) => Promise<void>;
  toast:      Toast;
  setToast:   (t: Toast) => void;
}) {
  const [newOpen,    setNewOpen]    = useState(false);
  const [detailOpen, setDetailOpen] = useState<Challenge | null>(null);

  const typeIcon = (type: string) => `ti ${TYPE_ICONS[type] ?? "ti-trophy"}`;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 300, fontSize: "32px", letterSpacing: "-0.03em", color: "#111111", lineHeight: 1.1 }}>
            Retos
          </h1>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", marginTop: "4px" }}>
            {challenges.length} {challenges.length === 1 ? "reto creado" : "retos creados"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/dashboard/retos/ranking" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "white", color: "#555555", border: "1px solid #EEECE8", borderRadius: "10px", padding: "10px 18px", fontFamily: "var(--font-jakarta)", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
            <i className="ti ti-trophy" aria-hidden="true" style={{ fontSize: "14px" }} />
            Ranking
          </Link>
          <button
            onClick={() => setNewOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#FF3D5E", color: "white", border: "none", borderRadius: "10px", padding: "10px 20px", fontFamily: "var(--font-jakarta)", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
          >
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
            Nuevo reto
          </button>
        </div>
      </div>

      {/* Empty */}
      {challenges.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ background: "white", borderRadius: "14px", border: "1px solid #EEECE8", padding: "80px 40px", textAlign: "center" }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🏆</div>
          <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "20px", color: "#111111", marginBottom: "8px" }}>
            Aún no hay retos
          </h2>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", maxWidth: 300, margin: "0 auto 24px" }}>
            Creá el primer reto para motivar a tus alumnas.
          </p>
          <button onClick={() => setNewOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#FF3D5E", color: "white", border: "none", borderRadius: "10px", padding: "10px 20px", fontFamily: "var(--font-jakarta)", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
            Crear primer reto
          </button>
        </motion.div>
      )}

      {/* List */}
      {challenges.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {challenges.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="pasada-card"
              style={{ background: "white", borderRadius: "14px", padding: "18px 22px", display: "flex", alignItems: "center", gap: "16px" }}
            >
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FFF0F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${TYPE_ICONS[c.type] ?? "ti-trophy"}`} aria-hidden="true" style={{ fontSize: "18px", color: "#FF3D5E" }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "14px", color: "#111111" }}>{c.title}</span>
                  <PointsBadge points={c.points} />
                  <TypeBadge type={c.type} />
                  <span style={{ background: "#F4F2EE", color: "#555555", fontFamily: "var(--font-jakarta)", fontSize: "11px", padding: "2px 8px", borderRadius: "6px" }}>
                    {targetLabel(c)}
                  </span>
                </div>
                <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#777777", margin: 0 }}>
                  {c.completedCount} completaron · {c.validatedCount} validados
                  {c.dueDate && ` · Vence ${formatDate(c.dueDate)}`}
                </p>
              </div>

              {/* Action */}
              <button
                onClick={() => setDetailOpen(c)}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#F4F2EE", color: "#333333", border: "none", borderRadius: "8px", padding: "8px 14px", fontFamily: "var(--font-jakarta)", fontSize: "12px", fontWeight: 500, cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#EEECE8")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#F4F2EE")}
              >
                <i className="ti ti-eye" aria-hidden="true" style={{ fontSize: "13px" }} />
                Ver respuestas
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {newOpen && (
          <NewChallengeModal
            profile={profile}
            onClose={() => setNewOpen(false)}
            onCreated={(c) => { onCreated(c); setNewOpen(false); }}
            showToast={(msg, type) => setToast({ msg, type })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailOpen && (
          <EntriesModal
            challenge={detailOpen}
            onClose={() => setDetailOpen(null)}
            onValidate={async (userId, approved) => {
              await onValidate(detailOpen.id, userId, approved);
              setDetailOpen(null);
            }}
            showToast={(msg, type) => setToast({ msg, type })}
          />
        )}
      </AnimatePresence>

      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── NewChallengeModal ─────────────────────────────────────────────────────────

const CHALLENGE_TYPES = [
  { key: "simple",     label: "Simple",     icon: "ti-check",       desc: "La alumna confirma haberlo hecho" },
  { key: "quiz",       label: "Quiz",        icon: "ti-help",        desc: "Preguntas con opciones múltiples" },
  { key: "multimedia", label: "Multimedia",  icon: "ti-photo-video", desc: "Sube una foto o video como evidencia" },
  { key: "practice",   label: "Práctica",    icon: "ti-repeat",      desc: "Contador de sesiones de práctica" },
] as const;

type ChallengeTypeKey = typeof CHALLENGE_TYPES[number]["key"];

function NewChallengeModal({
  profile,
  onClose,
  onCreated,
  showToast,
}: {
  profile:    Profile;
  onClose:    () => void;
  onCreated:  (c: Challenge) => void;
  showToast:  (msg: string, type: "success" | "error") => void;
}) {
  const inputStyle: React.CSSProperties = {
    display:      "block",
    width:        "100%",
    border:       "1px solid #EEECE8",
    borderRadius: "10px",
    padding:      "10px 14px",
    fontFamily:   "var(--font-jakarta)",
    fontSize:     "14px",
    color:        "#111111",
    background:   "#FAFAF8",
    outline:      "none",
    transition:   "border-color 0.15s",
    boxSizing:    "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display:      "block",
    fontFamily:   "var(--font-jakarta)",
    fontSize:     "12px",
    fontWeight:   500,
    color:        "#555555",
    marginBottom: "6px",
  };

  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [points,       setPoints]       = useState(10);
  const [dueDate,      setDueDate]      = useState("");
  const [targetType,   setTargetType]   = useState<"all" | "class" | "student">("all");
  const [classId,      setClassId]      = useState("");
  const [targetId,     setTargetId]     = useState("");
  const [type,         setType]         = useState<ChallengeTypeKey>("simple");
  const [practiceGoal, setPracticeGoal] = useState(5);
  const [questions,    setQuestions]    = useState<QuizQuestion[]>([
    { question: "", options: ["", "", "", ""], correct: 0 },
  ]);
  const [classes,      setClasses]      = useState<ClassItem[]>([]);
  const [students,     setStudents]     = useState<StudentItem[]>([]);
  const [submitting,   setSubmitting]   = useState(false);

  useEffect(() => {
    fetch("/api/clases")
      .then((r) => r.json())
      .then((d: { id: string; name: string }[]) => setClasses(d.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
    if (profile.role === "admin") {
      fetch("/api/alumnos")
        .then((r) => r.json())
        .then((d: StudentItem[]) => setStudents(d))
        .catch(() => {});
    }
  }, [profile.role]);

  function addQuestion() {
    setQuestions((prev) => [...prev, { question: "", options: ["", "", "", ""], correct: 0 }]);
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateQuestion(i: number, field: "question" | "correct", value: string | number) {
    setQuestions((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((prev) => {
      const next = [...prev];
      const opts = [...next[qi].options];
      opts[oi] = value;
      next[qi] = { ...next[qi], options: opts };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    if (type === "quiz") {
      const incomplete = questions.some((q) => !q.question.trim() || q.options.some((o) => !o.trim()));
      if (incomplete) {
        showToast("Completá todas las preguntas y opciones del quiz", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/retos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:        title.trim(),
          description:  description.trim(),
          points,
          dueDate:      dueDate || null,
          targetType,
          classId:      targetType === "class"   ? classId  : null,
          targetId:     targetType === "student" ? targetId : null,
          type,
          questions:    type === "quiz"     ? questions   : undefined,
          practiceGoal: type === "practice" ? practiceGoal : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Error al crear el reto");
      }
      const created = await res.json() as Challenge;
      onCreated(created);
      showToast("Reto creado", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: "18px", padding: "32px", width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.16)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "22px", letterSpacing: "-0.02em", color: "#111111" }}>
            Nuevo reto
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#AAAAAA" }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* ── Tipo de reto ── */}
          <div>
            <label style={labelStyle}>Tipo de reto</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {CHALLENGE_TYPES.map((t) => {
                const active = type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    style={{
                      display:       "flex",
                      alignItems:    "flex-start",
                      gap:           "10px",
                      padding:       "12px 14px",
                      borderRadius:  "12px",
                      border:        `2px solid ${active ? "#FF3D5E" : "#EEECE8"}`,
                      background:    active ? "#FFF0F2" : "#FAFAF8",
                      cursor:        "pointer",
                      textAlign:     "left",
                      transition:    "border-color 0.15s, background 0.15s",
                    }}
                  >
                    <i
                      className={`ti ${t.icon}`}
                      aria-hidden="true"
                      style={{ fontSize: "18px", color: active ? "#FF3D5E" : "#888888", marginTop: "1px", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "13px", color: active ? "#FF3D5E" : "#111111" }}>
                        {t.label}
                      </div>
                      <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", color: "#888888", lineHeight: 1.3, marginTop: "2px" }}>
                        {t.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Título ── */}
          <div>
            <label style={labelStyle}>Título del reto</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Practicá 3 veces esta semana"
              required
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
            />
          </div>

          {/* ── Descripción ── */}
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describí qué tiene que hacer la alumna…"
              required
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
            />
          </div>

          {/* ── Quiz: preguntas ── */}
          {type === "quiz" && (
            <div>
              <label style={labelStyle}>Preguntas</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {questions.map((q, qi) => (
                  <div
                    key={qi}
                    style={{ background: "#FAFAF8", borderRadius: "12px", border: "1px solid #EEECE8", padding: "14px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "12px", color: "#555555" }}>
                        Pregunta {qi + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qi)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#AAAAAA", fontSize: "14px" }}
                        >
                          <i className="ti ti-trash" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(qi, "question", e.target.value)}
                      placeholder="Texto de la pregunta…"
                      style={{ ...inputStyle, marginBottom: "10px" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                    />
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <button
                          type="button"
                          onClick={() => updateQuestion(qi, "correct", oi)}
                          title="Marcar como correcta"
                          style={{
                            width:          24,
                            height:         24,
                            borderRadius:   "50%",
                            border:         `2px solid ${q.correct === oi ? "#1D9E75" : "#DDDDDD"}`,
                            background:     q.correct === oi ? "#1D9E75" : "white",
                            cursor:         "pointer",
                            flexShrink:     0,
                            display:        "flex",
                            alignItems:     "center",
                            justifyContent: "center",
                            transition:     "background 0.15s, border-color 0.15s",
                          }}
                        >
                          {q.correct === oi && <i className="ti ti-check" aria-hidden="true" style={{ fontSize: "12px", color: "white" }} />}
                        </button>
                        <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "12px", color: "#999999", width: 16, textAlign: "center", flexShrink: 0 }}>
                          {["A","B","C","D"][oi]}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Opción ${["A","B","C","D"][oi]}…`}
                          style={{ ...inputStyle, flex: 1 }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                          onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
                        />
                      </div>
                    ))}
                    <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", color: "#AAAAAA", marginTop: "4px" }}>
                      Hacé clic en el círculo para marcar la opción correcta
                    </p>
                  </div>
                ))}
              </div>
              {questions.length < 10 && (
                <button
                  type="button"
                  onClick={addQuestion}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "10px", background: "none", border: "1px dashed #CCCCCC", borderRadius: "8px", padding: "7px 14px", fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#777777", cursor: "pointer" }}
                >
                  <i className="ti ti-plus" aria-hidden="true" />
                  Agregar pregunta
                </button>
              )}
            </div>
          )}

          {/* ── Multimedia: info ── */}
          {type === "multimedia" && (
            <div
              style={{ background: "#EFF6FF", borderRadius: "10px", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "flex-start" }}
            >
              <i className="ti ti-info-circle" aria-hidden="true" style={{ fontSize: "16px", color: "#3B82F6", flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#1D4ED8", lineHeight: 1.5, margin: 0 }}>
                Las alumnas deberán subir una foto o video como evidencia (imagen hasta 5 MB, video hasta 50 MB). Vos la revisás antes de validar.
              </p>
            </div>
          )}

          {/* ── Practice: meta ── */}
          {type === "practice" && (
            <div>
              <label style={labelStyle}>
                Meta de prácticas: <strong style={{ color: "#FF3D5E" }}>{practiceGoal} sesiones</strong>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={practiceGoal}
                onChange={(e) => setPracticeGoal(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#FF3D5E" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-jakarta)", fontSize: "11px", color: "#AAAAAA", marginTop: "2px" }}>
                <span>1</span><span>30</span>
              </div>
              <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#888888", marginTop: "6px" }}>
                La alumna registra cada sesión de práctica. Al llegar a {practiceGoal}, el reto se marca como completado.
              </p>
            </div>
          )}

          {/* ── Puntos ── */}
          <div>
            <label style={labelStyle}>Puntos: <strong style={{ color: "#FF3D5E" }}>{points}</strong></label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#FF3D5E" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-jakarta)", fontSize: "11px", color: "#AAAAAA", marginTop: "2px" }}>
              <span>5</span><span>50</span>
            </div>
          </div>

          {/* ── Fecha límite ── */}
          <div>
            <label style={labelStyle}>Fecha límite <span style={{ color: "#AAAAAA", fontWeight: 400 }}>(opcional)</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
            />
          </div>

          {/* ── Destinatario ── */}
          <div>
            <label style={labelStyle}>Dirigido a</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as "all" | "class" | "student")}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="all">Todos los alumnos</option>
              <option value="class">Por clase</option>
              <option value="student">Alumna específica</option>
            </select>
          </div>

          {targetType === "class" && (
            <div>
              <label style={labelStyle}>Clase</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Seleccioná una clase…</option>
                {classes.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
              </select>
            </div>
          )}

          {targetType === "student" && (
            <div>
              <label style={labelStyle}>Alumna</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                required
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Seleccioná una alumna…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
          )}

          {/* ── Submit ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", background: "none", border: "none", cursor: "pointer", padding: "10px 16px" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: submitting ? "#F4F2EE" : "#FF3D5E", color: submitting ? "#999999" : "white", border: "none", borderRadius: "10px", padding: "10px 22px", fontFamily: "var(--font-jakarta)", fontSize: "13px", fontWeight: 500, cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? (
                <><SpinIcon />Creando…</>
              ) : (
                <><i className="ti ti-trophy" aria-hidden="true" style={{ fontSize: "14px" }} />Crear reto</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── EntriesModal ──────────────────────────────────────────────────────────────

function EntriesModal({
  challenge,
  onClose,
  onValidate,
  showToast,
}: {
  challenge:  Challenge;
  onClose:    () => void;
  onValidate: (userId: string, approved: boolean) => Promise<void>;
  showToast:  (msg: string, type: "success" | "error") => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const completedEntries = (challenge.entries ?? []).filter((e) => e.status !== "pending");

  async function handleValidate(userId: string, approved: boolean) {
    setLoadingId(userId);
    try {
      await onValidate(userId, approved);
      showToast(approved ? "¡Reto validado!" : "Reto devuelto a pendiente", "success");
    } catch {
      showToast("Error al validar", "error");
    } finally {
      setLoadingId(null);
    }
  }

  function quizScore(entry: EntryDetail) {
    if (!entry.answers) return null;
    const correct = entry.answers.filter((a) => a.correct).length;
    const total   = challenge.questions?.length ?? 0;
    return { correct, total };
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: "18px", padding: "32px", width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.16)" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "20px", letterSpacing: "-0.02em", color: "#111111" }}>
                {challenge.title}
              </h2>
              <TypeBadge type={challenge.type} />
            </div>
            <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#999999" }}>
              {completedEntries.length} {completedEntries.length === 1 ? "respuesta" : "respuestas"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#AAAAAA", flexShrink: 0 }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {completedEntries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999999", fontFamily: "var(--font-jakarta)", fontSize: "14px" }}>
            Ninguna alumna completó este reto todavía.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
            {completedEntries.map((entry) => {
              const score = challenge.type === "quiz" ? quizScore(entry) : null;
              return (
                <div
                  key={entry.id}
                  style={{ background: entry.status === "validated" ? "#F0FAF5" : "#FAFAF8", borderRadius: "12px", border: `1px solid ${entry.status === "validated" ? "#C3E6CB" : "#EEECE8"}`, overflow: "hidden" }}
                >
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}>
                    {/* Avatar */}
                    {entry.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FF3D5E", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "12px", flexShrink: 0 }}>
                        {entry.user.firstName[0]}{entry.user.lastName[0]}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 500, fontSize: "13px", color: "#111111" }}>
                        {entry.user.firstName} {entry.user.lastName}
                      </div>
                      <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", color: entry.status === "validated" ? "#1D9E75" : "#888888", marginTop: "1px" }}>
                        {entry.status === "validated" ? "✓ Validado" : "Completado · esperando validación"}
                      </div>
                    </div>

                    {/* Validate actions */}
                    {entry.status !== "validated" && (
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                          onClick={() => handleValidate(entry.userId, false)}
                          disabled={loadingId === entry.userId}
                          title="Rechazar"
                          style={{ width: 30, height: 30, borderRadius: "8px", background: "#FFF0F2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#CC1F3C", fontSize: "14px" }}
                        >
                          <i className="ti ti-x" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleValidate(entry.userId, true)}
                          disabled={loadingId === entry.userId}
                          title="Validar"
                          style={{ width: 30, height: 30, borderRadius: "8px", background: "#F0FAF5", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontSize: "14px" }}
                        >
                          {loadingId === entry.userId
                            ? <i className="ti ti-loader-2" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
                            : <i className="ti ti-check" aria-hidden="true" />
                          }
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Type-specific evidence */}
                  {/* Quiz score */}
                  {challenge.type === "quiz" && score && (
                    <div style={{ padding: "0 16px 12px" }}>
                      <div style={{ background: "white", borderRadius: "8px", padding: "10px 14px", border: "1px solid #EEECE8" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <i className="ti ti-help" aria-hidden="true" style={{ fontSize: "14px", color: "#8B5CF6" }} />
                          <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#555555" }}>
                            Puntaje: <strong style={{ color: score.correct === score.total ? "#1D9E75" : "#F59E0B" }}>{score.correct}/{score.total} correctas</strong>
                          </span>
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          <div style={{ background: "#F4F2EE", borderRadius: "9999px", height: 4 }}>
                            <div style={{ width: `${score.total ? (score.correct / score.total) * 100 : 0}%`, height: "100%", background: score.correct === score.total ? "#1D9E75" : "#F59E0B", borderRadius: "9999px" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Multimedia thumbnail/link */}
                  {challenge.type === "multimedia" && entry.mediaUrl && (
                    <div style={{ padding: "0 16px 12px" }}>
                      {entry.mediaUrl.match(/\.(mp4|mov|webm|avi)$/i) ? (
                        <a
                          href={entry.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#3B82F6", textDecoration: "none" }}
                        >
                          <i className="ti ti-video" aria-hidden="true" style={{ fontSize: "14px" }} />
                          Ver video
                        </a>
                      ) : (
                        <a href={entry.mediaUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.mediaUrl}
                            alt="evidencia"
                            style={{ maxHeight: 100, maxWidth: "100%", borderRadius: "8px", objectFit: "cover", display: "block" }}
                          />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Practice progress */}
                  {challenge.type === "practice" && (
                    <div style={{ padding: "0 16px 12px" }}>
                      <PracticeBar
                        current={entry.practiceCount ?? 0}
                        goal={challenge.practiceGoal ?? 1}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastBar({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:     "fixed",
        bottom:       "28px",
        right:        "28px",
        zIndex:       999,
        background:   toast.type === "success" ? "#111111" : "#CC1F3C",
        color:        "white",
        fontFamily:   "var(--font-jakarta)",
        fontSize:     "13px",
        fontWeight:   500,
        padding:      "12px 20px",
        borderRadius: "10px",
        boxShadow:    "0 4px 20px rgba(0,0,0,0.18)",
        display:      "flex",
        alignItems:   "center",
        gap:          "8px",
      }}
    >
      <i className={`ti ${toast.type === "success" ? "ti-check" : "ti-alert-circle"}`} aria-hidden="true" style={{ fontSize: "15px" }} />
      {toast.msg}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RetosPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState<Toast>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, retosRes] = await Promise.all([
          fetch("/api/perfil"),
          fetch("/api/retos"),
        ]);
        if (profileRes.ok) setProfile(await profileRes.json() as Profile);
        if (retosRes.ok)   setChallenges(await retosRes.json() as Challenge[]);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Confetti al ver retos validados nuevos (solo alumnos)
  useEffect(() => {
    if (!profile || profile.role !== "student") return;
    const validatedCount = challenges.filter((c) => c.myEntry?.status === "validated").length;
    if (validatedCount === 0) return;
    const key    = `pasada-validated-${profile.id}`;
    const stored = parseInt(localStorage.getItem(key) ?? "0", 10);
    if (validatedCount > stored) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 }, colors: ["#FF3D5E", "#1D9E75", "#F59E0B", "#3B82F6", "#8B5CF6"] });
      }).catch(() => {});
      localStorage.setItem(key, String(validatedCount));
    }
  }, [challenges, profile]);

  // handleComplete — shared by simple, quiz, multimedia (body varies by type)
  const handleComplete = useCallback(async (challengeId: string, body: Record<string, unknown> = {}) => {
    // Optimistic update for simple type
    const isSimple = Object.keys(body).length === 0;
    if (isSimple) {
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challengeId
            ? { ...c, myEntry: { id: "optimistic", status: "completed", completedAt: new Date().toISOString(), validatedAt: null, note: null, mediaUrl: null, answers: null, practiceCount: 0 } }
            : c,
        ),
      );
    }

    try {
      const res = await fetch(`/api/retos/${challengeId}/completar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Error");
      }
      const { entry } = await res.json() as { entry: MyEntry };
      setChallenges((prev) =>
        prev.map((c) => (c.id === challengeId ? { ...c, myEntry: entry } : c)),
      );
      if (isSimple) setToast({ msg: "¡Reto completado! Esperando validación.", type: "success" });
    } catch (err) {
      if (isSimple) {
        setChallenges((prev) =>
          prev.map((c) => (c.id === challengeId ? { ...c, myEntry: null } : c)),
        );
      }
      setToast({ msg: err instanceof Error ? err.message : "Error", type: "error" });
    }
  }, []);

  // handlePractice — increment practiceCount with optimistic update
  const handlePractice = useCallback(async (challengeId: string) => {
    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge) return;

    const currentCount  = challenge.myEntry?.practiceCount ?? 0;
    const practiceGoal  = challenge.practiceGoal ?? 1;
    const newCount      = currentCount + 1;
    const willComplete  = newCount >= practiceGoal;

    // Optimistic
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? {
              ...c,
              myEntry: {
                ...(c.myEntry ?? { id: "optimistic", validatedAt: null, note: null, mediaUrl: null, answers: null }),
                id:            c.myEntry?.id ?? "optimistic",
                status:        willComplete ? "completed" : "pending",
                completedAt:   willComplete ? new Date().toISOString() : (c.myEntry?.completedAt ?? null),
                validatedAt:   c.myEntry?.validatedAt ?? null,
                note:          c.myEntry?.note ?? null,
                mediaUrl:      c.myEntry?.mediaUrl ?? null,
                answers:       c.myEntry?.answers ?? null,
                practiceCount: newCount,
              },
            }
          : c,
      ),
    );

    try {
      const res = await fetch(`/api/retos/${challengeId}/completar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ increment: true }),
      });
      if (!res.ok) throw new Error();
      const { entry } = await res.json() as { entry: MyEntry };
      setChallenges((prev) =>
        prev.map((c) => (c.id === challengeId ? { ...c, myEntry: entry } : c)),
      );
      if (willComplete) setToast({ msg: "¡Meta alcanzada! Esperando validación.", type: "success" });
    } catch {
      // Revertir
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challengeId
            ? { ...c, myEntry: challenge.myEntry }
            : c,
        ),
      );
      setToast({ msg: "Error al registrar práctica", type: "error" });
    }
  }, [challenges]);

  // handleValidate (admin/teacher)
  const handleValidate = useCallback(
    async (challengeId: string, userId: string, approved: boolean) => {
      const res = await fetch(`/api/retos/${challengeId}/validar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, approved }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Error al validar");
      }
      setChallenges((prev) =>
        prev.map((c) => {
          if (c.id !== challengeId) return c;
          const newEntries = (c.entries ?? []).map((e) =>
            e.userId === userId
              ? { ...e, status: (approved ? "validated" : "pending") as EntryDetail["status"], validatedAt: approved ? new Date().toISOString() : null }
              : e,
          );
          return { ...c, entries: newEntries, validatedCount: newEntries.filter((e) => e.status === "validated").length };
        }),
      );
      setToast({ msg: approved ? "¡Reto validado!" : "Devuelto a pendiente", type: "success" });
    },
    [],
  );

  if (loading) {
    return (
      <PageTransition>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
          <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: "24px", color: "#CCCCCC", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {profile?.role === "student" ? (
        <StudentView
          challenges={challenges}
          onComplete={handleComplete}
          onPractice={handlePractice}
          toast={toast}
          setToast={setToast}
        />
      ) : (
        <AdminView
          challenges={challenges}
          profile={profile!}
          onCreated={(c) => setChallenges((prev) => [c, ...prev])}
          onValidate={handleValidate}
          toast={toast}
          setToast={setToast}
        />
      )}
    </PageTransition>
  );
}
