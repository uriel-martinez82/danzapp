"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";

type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

// dayOfWeek es number (1=Lunes … 7=Domingo)
type ScheduleEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const dayOptions = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  border: "1px solid #EEECE8",
  borderRadius: "10px",
  padding: "11px 13px",
  fontFamily: "var(--font-jakarta)",
  fontSize: "14px",
  color: "#111111",
  background: "#FAFAF8",
  outline: "none",
  transition: "border-color 0.15s",
};

// Estilo específico para inputs de hora — fuerza 24 hs sin importar el SO
const timeInputStyle: React.CSSProperties = {
  fontFamily: "var(--font-jakarta)",
  fontSize: 14,
  padding: "10px 14px",
  border: "1px solid #EEECE8",
  borderRadius: 10,
  width: "100%",
  background: "#FAFAF8",
  outline: "none",
  color: "#111111",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-jakarta)",
  fontSize: "13px",
  fontWeight: 500,
  color: "#333333",
  marginBottom: "6px",
};

const scheduleHeaderStyle: React.CSSProperties = {
  fontFamily: "var(--font-jakarta)",
  fontSize: "11px",
  fontWeight: 500,
  color: "#999999",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const sectionStyle: React.CSSProperties = {
  borderTop: "1px solid #F4F2EE",
  marginTop: "8px",
  paddingTop: "20px",
};

export default function NuevaClasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // Inicializado con dayOfWeek: 1 y strings vacíos para startTime/endTime
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    fetch("/api/usuarios?role=teacher")
      .then((r) => r.json())
      .then((data) => {
        setTeachers(Array.isArray(data) ? data : []);
        setLoadingTeachers(false);
      })
      .catch(() => setLoadingTeachers(false));
  }, []);

  function addSchedule() {
    setSchedules((prev) => [
      ...prev,
      { dayOfWeek: 1, startTime: "", endTime: "" },
    ]);
  }

  function removeSchedule(i: number) {
    setSchedules((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSchedule(
    i: number,
    field: keyof ScheduleEntry,
    value: string,
  ) {
    setSchedules((prev) =>
      prev.map((s, idx) =>
        idx === i
          ? { ...s, [field]: field === "dayOfWeek" ? Number(value) : value }
          : s,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const style = (fd.get("style") as string)?.trim() || undefined;
    const level = (fd.get("level") as string) || undefined;
    const room = (fd.get("room") as string)?.trim() || undefined;
    const capacityStr = fd.get("capacity") as string;
    const capacity = capacityStr ? Number(capacityStr) : undefined;
    const teacherId = fd.get("teacherId") as string;

    if (!name) {
      setError("El nombre de la clase es requerido");
      setLoading(false);
      return;
    }
    if (!teacherId) {
      setError("Seleccioná un profesor");
      setLoading(false);
      return;
    }

    // Validar que todos los horarios estén completos
    const incompleteSchedules = schedules.filter(
      (s) => s.startTime === "" || s.endTime === "",
    );
    if (incompleteSchedules.length > 0) {
      setError("Completá los horarios antes de guardar");
      setLoading(false);
      return;
    }

    const validSchedules = schedules.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    try {
      const res = await fetch("/api/clases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          style,
          level,
          room,
          capacity,
          teacherId,
          schedules: validSchedules,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear la clase");
      }

      router.push("/dashboard/clases");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <PageTransition>
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: "28px" }}>
        <Link
          href="/dashboard/clases"
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
          Volver a clases
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
          Nueva clase
        </h1>
      </div>

      {/* ── Form card ── */}
      <div style={{ maxWidth: 700 }}>
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
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            {/* ── Nombre + Estilo ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label htmlFor="name" style={labelStyle}>
                  Nombre de la clase
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  required
                  placeholder="Ej: Ballet Clásico Nivel III"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
              <div>
                <label htmlFor="style" style={labelStyle}>
                  Estilo{" "}
                  <span style={{ color: "#aaaaaa", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  id="style"
                  type="text"
                  name="style"
                  placeholder="Ej: Ballet, Jazz, Contemporáneo"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
            </div>

            {/* ── Nivel + Sala + Capacidad ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: "14px" }}>
              <div>
                <label htmlFor="level" style={labelStyle}>
                  Nivel
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    id="level"
                    name="level"
                    defaultValue=""
                    style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                  >
                    <option value="">Sin especificar</option>
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                    <option value="all">Todos los niveles</option>
                  </select>
                  <i
                    className="ti ti-chevron-down"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "13px",
                      color: "#999999",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="room" style={labelStyle}>
                  Sala{" "}
                  <span style={{ color: "#aaaaaa", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  id="room"
                  type="text"
                  name="room"
                  placeholder="Ej: Sala A"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
              <div>
                <label htmlFor="capacity" style={labelStyle}>
                  Capacidad
                </label>
                <input
                  id="capacity"
                  type="number"
                  name="capacity"
                  min="1"
                  placeholder="—"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>
            </div>

            {/* ── Profesor ── */}
            <div style={sectionStyle}>
              <label htmlFor="teacherId" style={labelStyle}>
                Profesor
              </label>
              <div style={{ position: "relative" }}>
                <select
                  id="teacherId"
                  name="teacherId"
                  defaultValue=""
                  disabled={loadingTeachers}
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    cursor: loadingTeachers ? "not-allowed" : "pointer",
                    color: loadingTeachers ? "#999999" : "#111111",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                >
                  <option value="">
                    {loadingTeachers ? "Cargando profesores…" : "Seleccioná un profesor"}
                  </option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
                <i
                  className="ti ti-chevron-down"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "13px",
                    color: "#999999",
                    pointerEvents: "none",
                  }}
                />
              </div>
              {!loadingTeachers && teachers.length === 0 && (
                <p
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "12px",
                    color: "#999999",
                    marginTop: "6px",
                  }}
                >
                  No hay profesores en tu escuela. Primero agregá un usuario con rol{" "}
                  <em>profesor</em>.
                </p>
              )}
            </div>

            {/* ── Horarios ── */}
            <div style={sectionStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <span style={{ ...labelStyle, marginBottom: 0 }}>Horarios</span>
                <button
                  type="button"
                  onClick={addSchedule}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#FF3D5E",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "13px" }} />
                  Agregar horario
                </button>
              </div>

              {schedules.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #EEECE8",
                    borderRadius: "10px",
                    padding: "20px",
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
                    No hay horarios. Hacé clic en{" "}
                    <strong style={{ color: "#888888" }}>Agregar horario</strong> para añadir uno.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Column headers */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 140px 140px 36px",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={scheduleHeaderStyle}>Día</span>
                    <span style={scheduleHeaderStyle}>Hora inicio</span>
                    <span style={scheduleHeaderStyle}>Hora fin</span>
                    <span />
                  </div>

                  {/* Rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {schedules.map((sched, i) => (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 140px 140px 36px",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        {/* Day select */}
                        <div style={{ position: "relative" }}>
                          <select
                            value={String(sched.dayOfWeek)}
                            onChange={(e) =>
                              updateSchedule(i, "dayOfWeek", e.target.value)
                            }
                            style={{
                              ...inputStyle,
                              appearance: "none",
                              cursor: "pointer",
                              padding: "10px 32px 10px 13px",
                            }}
                            onFocus={(e) =>
                              (e.currentTarget.style.borderColor = "#FF3D5E")
                            }
                            onBlur={(e) =>
                              (e.currentTarget.style.borderColor = "#EEECE8")
                            }
                          >
                            {dayOptions.map((d) => (
                              <option key={d.value} value={String(d.value)}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                          <i
                            className="ti ti-chevron-down"
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "12px",
                              color: "#999999",
                              pointerEvents: "none",
                            }}
                          />
                        </div>

                        {/* Start time */}
                        <input
                          type="time"
                          step={60}
                          value={sched.startTime}
                          onChange={(e) =>
                            updateSchedule(i, "startTime", e.target.value)
                          }
                          style={timeInputStyle}
                        />

                        {/* End time */}
                        <input
                          type="time"
                          step={60}
                          value={sched.endTime}
                          onChange={(e) =>
                            updateSchedule(i, "endTime", e.target.value)
                          }
                          style={timeInputStyle}
                        />

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeSchedule(i)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 36,
                            height: 36,
                            borderRadius: "8px",
                            border: "none",
                            background: "transparent",
                            color: "#CCCCCC",
                            cursor: "pointer",
                            transition: "background 0.15s, color 0.15s",
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#FFF0F2";
                            e.currentTarget.style.color = "#FF3D5E";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#CCCCCC";
                          }}
                          aria-label="Eliminar horario"
                        >
                          <i
                            className="ti ti-trash"
                            aria-hidden="true"
                            style={{ fontSize: "15px" }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Error ── */}
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

            {/* ── Actions ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                paddingTop: "8px",
                borderTop: "1px solid #F4F2EE",
                marginTop: "4px",
              }}
            >
              <Link
                href="/dashboard/clases"
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
                    Creando…
                  </>
                ) : (
                  <>
                    <i className="ti ti-check" aria-hidden="true" style={{ fontSize: "14px" }} />
                    Crear clase
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
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </PageTransition>
  );
}
