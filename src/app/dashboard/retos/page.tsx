"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

// ── Types ─────────────────────────────────────────────────────────────────────

type MyEntry = {
  id:          string;
  status:      "pending" | "completed" | "validated";
  completedAt: string | null;
  validatedAt: string | null;
  note:        string | null;
};

type EntryDetail = MyEntry & {
  userId: string;
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
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
  myEntry:        MyEntry | null;
  entriesCount:   number;
  validatedCount: number;
  completedCount: number;
  entries?:       EntryDetail[];
};

type Profile = { id: string; role: string; firstName: string; lastName: string };
type ClassItem = { id: string; name: string };
type StudentItem = { id: string; firstName: string; lastName: string };

type Toast = { msg: string; type: "success" | "error" } | null;

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

  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let cursor = today;

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

// ── Score dot ─────────────────────────────────────────────────────────────────

function PointsBadge({ points }: { points: number }) {
  return (
    <span
      style={{
        background:   "#FF3D5E",
        color:        "white",
        fontFamily:   "var(--font-jakarta)",
        fontWeight:   700,
        fontSize:     "11px",
        padding:      "3px 9px",
        borderRadius: "9999px",
        letterSpacing: "0.02em",
        flexShrink:   0,
      }}
    >
      +{points} pts
    </span>
  );
}

// ── Student view ──────────────────────────────────────────────────────────────

function StudentView({
  challenges,
  onComplete,
  toast,
  setToast,
}: {
  challenges: Challenge[];
  onComplete: (id: string) => Promise<void>;
  toast: Toast;
  setToast: (t: Toast) => void;
}) {
  const [tab, setTab] = useState<"pending" | "completed" | "validated">("pending");

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
    { key: "validated", label: "Validados",  count: validated.length },
  ] as const;

  const shown =
    tab === "pending"   ? pending   :
    tab === "completed" ? completed :
    validated;

  return (
    <div>
      {/* ── Hero header ── */}
      <div
        style={{
          display:      "flex",
          alignItems:   "flex-start",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap:     "wrap",
          gap:          "16px",
        }}
      >
        <div>
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
            Mis Retos
          </h1>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", marginTop: "4px" }}>
            Completá desafíos y sumá puntos
          </p>
        </div>

        {/* Points + streak */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div
            className="pasada-card"
            style={{
              background:   "white",
              borderRadius: "14px",
              padding:      "14px 20px",
              textAlign:    "center",
              minWidth:     90,
            }}
          >
            <div
              style={{
                fontFamily:    "var(--font-fraunces)",
                fontWeight:    400,
                fontSize:      "28px",
                letterSpacing: "-0.02em",
                color:         "#FF3D5E",
                lineHeight:    1,
              }}
            >
              {totalPoints}
            </div>
            <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginTop: "4px" }}>
              puntos
            </div>
          </div>

          {streak > 0 && (
            <div
              className="pasada-card"
              style={{
                background:   "white",
                borderRadius: "14px",
                padding:      "14px 20px",
                textAlign:    "center",
                minWidth:     90,
              }}
            >
              <div
                style={{
                  fontFamily:    "var(--font-fraunces)",
                  fontWeight:    400,
                  fontSize:      "28px",
                  letterSpacing: "-0.02em",
                  color:         "#F59E0B",
                  lineHeight:    1,
                }}
              >
                {streak}🔥
              </div>
              <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999", marginTop: "4px" }}>
                racha
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display:      "flex",
          gap:          "4px",
          marginBottom: "20px",
          background:   "white",
          borderRadius: "12px",
          padding:      "4px",
          border:       "1px solid #EEECE8",
          width:        "fit-content",
        }}
      >
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
              <span
                style={{
                  background:   tab === key ? "rgba(255,255,255,0.2)" : "#F4F2EE",
                  color:        tab === key ? "white" : "#777777",
                  borderRadius: "9999px",
                  fontSize:     "11px",
                  fontWeight:   600,
                  padding:      "1px 7px",
                  lineHeight:   1.4,
                }}
              >
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
          style={{
            background:   "white",
            borderRadius: "14px",
            border:       "1px solid #EEECE8",
            padding:      "64px 40px",
            textAlign:    "center",
          }}
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
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Link al ranking */}
      <div style={{ marginTop: "28px", textAlign: "center" }}>
        <Link
          href="/dashboard/retos/ranking"
          style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "6px",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "13px",
            color:        "#FF3D5E",
            fontWeight:   500,
            textDecoration: "none",
          }}
        >
          <i className="ti ti-trophy" aria-hidden="true" />
          Ver ranking
        </Link>
      </div>

      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function StudentCard({
  challenge: c,
  onComplete,
}: {
  challenge: Challenge;
  onComplete: (id: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const status = c.myEntry?.status ?? "pending";

  const isPastDue = c.dueDate ? new Date(c.dueDate) < new Date() : false;

  async function handleComplete() {
    setLoading(true);
    await onComplete(c.id);
    setLoading(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className="pasada-card"
      style={{
        background:   status === "validated" ? "#F0FAF5" : "white",
        borderRadius: "14px",
        padding:      "20px 22px",
        display:      "flex",
        alignItems:   "flex-start",
        gap:          "16px",
      }}
    >
      {/* Puntos circle */}
      <div
        style={{
          width:          48,
          height:         48,
          borderRadius:   "50%",
          background:     status === "validated" ? "#1D9E75" : "#FFF0F2",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
        }}
      >
        <i
          className={`ti ${status === "validated" ? "ti-check" : status === "completed" ? "ti-clock" : "ti-trophy"}`}
          aria-hidden="true"
          style={{
            fontSize: "20px",
            color:    status === "validated" ? "white" : "#FF3D5E",
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <h3
            style={{
              fontFamily:    "var(--font-jakarta)",
              fontWeight:    600,
              fontSize:      "15px",
              color:         "#111111",
              lineHeight:    1.3,
            }}
          >
            {c.title}
          </h3>
          <PointsBadge points={c.points} />
        </div>

        <p
          style={{
            fontFamily: "var(--font-jakarta)",
            fontSize:   "13px",
            color:      "#666666",
            lineHeight: 1.55,
            marginTop:  "6px",
          }}
        >
          {c.description}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
          {c.dueDate && (
            <span
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize:   "12px",
                color:      isPastDue ? "#CC1F3C" : "#888888",
                display:    "flex",
                alignItems: "center",
                gap:        "4px",
              }}
            >
              <i className="ti ti-calendar-due" aria-hidden="true" style={{ fontSize: "13px" }} />
              {isPastDue ? "Venció: " : "Vence: "}{formatDate(c.dueDate)}
            </span>
          )}

          {/* Action */}
          {status === "pending" && (
            <button
              onClick={handleComplete}
              disabled={loading}
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "6px",
                background:   loading ? "#F4F2EE" : "#FF3D5E",
                color:        loading ? "#999" : "white",
                border:       "none",
                borderRadius: "8px",
                padding:      "7px 16px",
                fontFamily:   "var(--font-jakarta)",
                fontSize:     "12px",
                fontWeight:   600,
                cursor:       loading ? "not-allowed" : "pointer",
                transition:   "background 0.15s",
              }}
            >
              {loading ? (
                <>
                  <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: "13px", animation: "spin 1s linear infinite" }} />
                  Guardando…
                </>
              ) : (
                <>
                  <i className="ti ti-check" aria-hidden="true" style={{ fontSize: "13px" }} />
                  ¡Lo hice!
                </>
              )}
            </button>
          )}

          {status === "completed" && (
            <span
              style={{
                display:    "inline-flex",
                alignItems: "center",
                gap:        "5px",
                fontFamily: "var(--font-jakarta)",
                fontSize:   "12px",
                color:      "#888888",
                fontStyle:  "italic",
              }}
            >
              <i className="ti ti-clock" aria-hidden="true" style={{ fontSize: "13px" }} />
              Esperando validación
            </span>
          )}

          {status === "validated" && (
            <span
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "5px",
                fontFamily:   "var(--font-jakarta)",
                fontSize:     "12px",
                fontWeight:   600,
                color:        "#1D9E75",
                background:   "#E8F5E9",
                padding:      "4px 10px",
                borderRadius: "6px",
              }}
            >
              <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: "13px" }} />
              Validado
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Admin / Teacher view ───────────────────────────────────────────────────────

function AdminView({
  challenges,
  profile,
  onCreated,
  onValidate,
  toast,
  setToast,
}: {
  challenges: Challenge[];
  profile: Profile;
  onCreated: (c: Challenge) => void;
  onValidate: (challengeId: string, userId: string, approved: boolean) => Promise<void>;
  toast: Toast;
  setToast: (t: Toast) => void;
}) {
  const [newOpen,     setNewOpen]     = useState(false);
  const [detailOpen,  setDetailOpen]  = useState<Challenge | null>(null);

  return (
    <div>
      {/* ── Header ── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "flex-end",
          justifyContent: "space-between",
          marginBottom:   "24px",
          flexWrap:       "wrap",
          gap:            "12px",
        }}
      >
        <div>
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
            Retos
          </h1>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", marginTop: "4px" }}>
            {challenges.length} {challenges.length === 1 ? "reto activo" : "retos creados"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link
            href="/dashboard/retos/ranking"
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          "6px",
              background:   "white",
              color:        "#555555",
              border:       "1px solid #EEECE8",
              borderRadius: "10px",
              padding:      "10px 18px",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              fontWeight:   500,
              textDecoration: "none",
            }}
          >
            <i className="ti ti-trophy" aria-hidden="true" style={{ fontSize: "14px" }} />
            Ranking
          </Link>
          <button
            onClick={() => setNewOpen(true)}
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          "6px",
              background:   "#FF3D5E",
              color:        "white",
              border:       "none",
              borderRadius: "10px",
              padding:      "10px 20px",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              fontWeight:   500,
              cursor:       "pointer",
            }}
          >
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
            Nuevo reto
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {challenges.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background:   "white",
            borderRadius: "14px",
            border:       "1px solid #EEECE8",
            padding:      "80px 40px",
            textAlign:    "center",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🏆</div>
          <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "20px", color: "#111111", marginBottom: "8px" }}>
            Aún no hay retos
          </h2>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", maxWidth: 300, margin: "0 auto 24px" }}>
            Creá el primer reto para motivar a tus alumnas.
          </p>
          <button
            onClick={() => setNewOpen(true)}
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          "6px",
              background:   "#FF3D5E",
              color:        "white",
              border:       "none",
              borderRadius: "10px",
              padding:      "10px 20px",
              fontFamily:   "var(--font-jakarta)",
              fontSize:     "13px",
              fontWeight:   500,
              cursor:       "pointer",
            }}
          >
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
            Crear primer reto
          </button>
        </motion.div>
      )}

      {/* ── List ── */}
      {challenges.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {challenges.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="pasada-card"
              style={{
                background:   "white",
                borderRadius: "14px",
                padding:      "18px 22px",
                display:      "flex",
                alignItems:   "center",
                gap:          "16px",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width:          44,
                  height:         44,
                  borderRadius:   "50%",
                  background:     "#FFF0F2",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  flexShrink:     0,
                }}
              >
                <i className="ti ti-trophy" aria-hidden="true" style={{ fontSize: "18px", color: "#FF3D5E" }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "14px", color: "#111111" }}>
                    {c.title}
                  </span>
                  <PointsBadge points={c.points} />
                  <span
                    style={{
                      background:   "#F4F2EE",
                      color:        "#555555",
                      fontFamily:   "var(--font-jakarta)",
                      fontSize:     "11px",
                      padding:      "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
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
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          "5px",
                  background:   "#F4F2EE",
                  color:        "#333333",
                  border:       "none",
                  borderRadius: "8px",
                  padding:      "8px 14px",
                  fontFamily:   "var(--font-jakarta)",
                  fontSize:     "12px",
                  fontWeight:   500,
                  cursor:       "pointer",
                  flexShrink:   0,
                  transition:   "background 0.15s",
                }}
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

      {/* ── Modal nuevo reto ── */}
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

      {/* ── Modal ver respuestas ── */}
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

// ── Modal: Nuevo reto ─────────────────────────────────────────────────────────

function NewChallengeModal({
  profile,
  onClose,
  onCreated,
  showToast,
}: {
  profile: Profile;
  onClose: () => void;
  onCreated: (c: Challenge) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [points,      setPoints]      = useState(10);
  const [dueDate,     setDueDate]     = useState("");
  const [targetType,  setTargetType]  = useState<"all" | "class" | "student">("all");
  const [classId,     setClassId]     = useState("");
  const [targetId,    setTargetId]    = useState("");
  const [classes,     setClasses]     = useState<ClassItem[]>([]);
  const [students,    setStudents]    = useState<StudentItem[]>([]);
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    fetch("/api/clases")
      .then((r) => r.json())
      .then((d: { id: string; name: string }[]) => setClasses(d.map(c => ({ id: c.id, name: c.name }))))
      .catch(() => {});
    if (profile.role === "admin") {
      fetch("/api/alumnos")
        .then((r) => r.json())
        .then((d: StudentItem[]) => setStudents(d))
        .catch(() => {});
    }
  }, [profile.role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/retos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:      title.trim(),
          description: description.trim(),
          points,
          dueDate:    dueDate || null,
          targetType,
          classId:    targetType === "class"   ? classId   : null,
          targetId:   targetType === "student" ? targetId  : null,
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position:   "fixed",
        inset:      0,
        background: "rgba(0,0,0,0.4)",
        zIndex:     60,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:    "16px",
        backdropFilter: "blur(4px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "white",
          borderRadius: "18px",
          padding:      "32px",
          width:        "100%",
          maxWidth:     520,
          maxHeight:    "90vh",
          overflowY:    "auto",
          boxShadow:    "0 24px 64px rgba(0,0,0,0.16)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "22px", letterSpacing: "-0.02em", color: "#111111" }}>
            Nuevo reto
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#AAAAAA", width: 32, height: 32, borderRadius: "8px" }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Título */}
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

          {/* Descripción */}
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describí qué tiene que hacer la alumna para completarlo…"
              required
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#EEECE8")}
            />
          </div>

          {/* Puntos */}
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

          {/* Fecha límite */}
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

          {/* Destinatario */}
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
                {classes.map((cl) => (
                  <option key={cl.id} value={cl.id}>{cl.name}</option>
                ))}
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
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Submit */}
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
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "6px",
                background:   submitting ? "#F4F2EE" : "#FF3D5E",
                color:        submitting ? "#999999" : "white",
                border:       "none",
                borderRadius: "10px",
                padding:      "10px 22px",
                fontFamily:   "var(--font-jakarta)",
                fontSize:     "13px",
                fontWeight:   500,
                cursor:       submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? (
                <><i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: "14px", animation: "spin 1s linear infinite" }} />Creando…</>
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

// ── Modal: Ver respuestas ──────────────────────────────────────────────────────

function EntriesModal({
  challenge,
  onClose,
  onValidate,
  showToast,
}: {
  challenge: Challenge;
  onClose: () => void;
  onValidate: (userId: string, approved: boolean) => Promise<void>;
  showToast: (msg: string, type: "success" | "error") => void;
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position:   "fixed",
        inset:      0,
        background: "rgba(0,0,0,0.4)",
        zIndex:     60,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:    "16px",
        backdropFilter: "blur(4px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "white",
          borderRadius: "18px",
          padding:      "32px",
          width:        "100%",
          maxWidth:     500,
          maxHeight:    "85vh",
          overflowY:    "auto",
          boxShadow:    "0 24px 64px rgba(0,0,0,0.16)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "20px", letterSpacing: "-0.02em", color: "#111111" }}>
              {challenge.title}
            </h2>
            <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#999999", marginTop: "2px" }}>
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
            {completedEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "12px",
                  padding:      "12px 16px",
                  background:   entry.status === "validated" ? "#F0FAF5" : "#FAFAF8",
                  borderRadius: "12px",
                  border:       `1px solid ${entry.status === "validated" ? "#C3E6CB" : "#EEECE8"}`,
                }}
              >
                {/* Avatar */}
                {entry.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FF3D5E", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "12px", flexShrink: 0 }}>
                    {entry.user.firstName[0]}{entry.user.lastName[0]}
                  </div>
                )}

                {/* Name + status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 500, fontSize: "13px", color: "#111111" }}>
                    {entry.user.firstName} {entry.user.lastName}
                  </div>
                  <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", color: entry.status === "validated" ? "#1D9E75" : "#888888", marginTop: "1px" }}>
                    {entry.status === "validated" ? "✓ Validado" : "Completado · esperando validación"}
                  </div>
                </div>

                {/* Actions */}
                {entry.status !== "validated" && (
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => handleValidate(entry.userId, false)}
                      disabled={loadingId === entry.userId}
                      title="Rechazar"
                      style={{
                        width: 30, height: 30, borderRadius: "8px",
                        background: "#FFF0F2", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#CC1F3C", fontSize: "14px",
                      }}
                    >
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleValidate(entry.userId, true)}
                      disabled={loadingId === entry.userId}
                      title="Validar"
                      style={{
                        width: 30, height: 30, borderRadius: "8px",
                        background: "#F0FAF5", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#1D9E75", fontSize: "14px",
                      }}
                    >
                      {loadingId === entry.userId
                        ? <i className="ti ti-loader-2" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
                        : <i className="ti ti-check" aria-hidden="true" />
                      }
                    </button>
                  </div>
                )}
              </div>
            ))}
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

  // ── Load data ──────────────────────────────────────────────────────────────

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

  // ── Confetti al ver retos validados nuevos (solo alumnos) ──────────────────

  useEffect(() => {
    if (!profile || profile.role !== "student") return;
    const validatedCount = challenges.filter((c) => c.myEntry?.status === "validated").length;
    if (validatedCount === 0) return;

    const key     = `pasada-validated-${profile.id}`;
    const stored  = parseInt(localStorage.getItem(key) ?? "0", 10);

    if (validatedCount > stored) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({
          particleCount: 140,
          spread:        80,
          origin:        { y: 0.55 },
          colors:        ["#FF3D5E", "#1D9E75", "#F59E0B", "#3B82F6", "#8B5CF6"],
        });
      }).catch(() => {});
      localStorage.setItem(key, String(validatedCount));
    }
  }, [challenges, profile]);

  // ── Optimistic complete ────────────────────────────────────────────────────

  const handleComplete = useCallback(async (challengeId: string) => {
    // Optimistic update
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? {
              ...c,
              myEntry: {
                id:          "optimistic",
                status:      "completed",
                completedAt: new Date().toISOString(),
                validatedAt: null,
                note:        null,
              },
            }
          : c,
      ),
    );

    try {
      const res = await fetch(`/api/retos/${challengeId}/completar`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Error");
      }
      const { entry } = await res.json() as { entry: MyEntry };
      // Reemplazar con dato real
      setChallenges((prev) =>
        prev.map((c) => (c.id === challengeId ? { ...c, myEntry: entry } : c)),
      );
      setToast({ msg: "¡Reto completado! Esperando validación.", type: "success" });
    } catch (err) {
      // Revertir
      setChallenges((prev) =>
        prev.map((c) => (c.id === challengeId ? { ...c, myEntry: null } : c)),
      );
      setToast({ msg: err instanceof Error ? err.message : "Error", type: "error" });
    }
  }, []);

  // ── Handle validate ────────────────────────────────────────────────────────

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

      // Actualizar estado local
      setChallenges((prev) =>
        prev.map((c) => {
          if (c.id !== challengeId) return c;
          const newEntries = (c.entries ?? []).map((e) =>
            e.userId === userId
              ? {
                  ...e,
                  status:      (approved ? "validated" : "pending") as EntryDetail["status"],
                  validatedAt: approved ? new Date().toISOString() : null,
                }
              : e,
          );
          return {
            ...c,
            entries:        newEntries,
            validatedCount: newEntries.filter((e) => e.status === "validated").length,
          };
        }),
      );

      setToast({ msg: approved ? "¡Reto validado!" : "Devuelto a pendiente", type: "success" });
    },
    [],
  );

  // ── Loading ────────────────────────────────────────────────────────────────

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
