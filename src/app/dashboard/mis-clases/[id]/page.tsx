import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { AnimatedList, AnimatedItem } from "@/components/AnimatedList";

// ── Helpers ───────────────────────────────────────────────────────────────────

const palette = [
  { bg: "#FFF0F2", color: "#C2185B" },
  { bg: "#F0FAF5", color: "#1D9E75" },
  { bg: "#EFF5FE", color: "#1565C0" },
  { bg: "#FEF8EE", color: "#D97706" },
  { bg: "#EDE7F6", color: "#5E35B1" },
  { bg: "#E3F2FD", color: "#0A2E6E" },
  { bg: "#E8F5E9", color: "#388E3C" },
  { bg: "#FCE4EC", color: "#6D0030" },
];

function hashColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  }
  return palette[h % palette.length];
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

const dayNames: Record<number, string> = {
  1: "Lunes", 2: "Martes", 3: "Miércoles",
  4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo",
};

const levelLabels: Record<string, string> = {
  beginner:     "Principiante",
  intermediate: "Intermedio",
  advanced:     "Avanzado",
  all:          "Todos los niveles",
};

const todayStr = new Date().toISOString().split("T")[0];

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function MiClaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) redirect("/sign-in");

  const clase = await prisma.class.findUnique({
    where:   { id },
    include: {
      teacher:   { select: { id: true, firstName: true, lastName: true, email: true } },
      schedules: { orderBy: { dayOfWeek: "asc" } },
      enrollments: {
        where:   { status: "active" },
        include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { student: { lastName: "asc" } },
      },
    },
  });

  if (!clase) notFound();

  // Control de acceso — String() para evitar problemas de tipado con el campo role de Prisma
  const role      = String(user.role);
  const isTeacher = role === "teacher" && clase.teacherId === user.id;
  const isAdmin   = role === "admin"   && clase.schoolId === user.schoolId;
  const isStudent = role === "student" &&
    clase.enrollments.some((e) => e.student.id === user.id);

  if (!isTeacher && !isAdmin && !isStudent) redirect("/dashboard");

  const styleChip = hashColor(clase.style ?? clase.name);
  const canAttend = isTeacher || isAdmin;

  return (
    <PageTransition>
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
            href="/dashboard/mis-clases"
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
                fontSize: "28px",
                letterSpacing: "-0.03em",
                color: "#111111",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {clase.name}
            </h1>
          </div>

        </div>

        {/* ── Layout 2 columnas ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* ── Columna izquierda: info + alumnos ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Info card */}
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                border: "1px solid #EEECE8",
                padding: "24px",
              }}
            >
              {/* Badges */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
                {clase.style && (
                  <span
                    style={{
                      background: styleChip.bg,
                      color: styleChip.color,
                      fontFamily: "var(--font-jakarta)",
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "4px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    {clase.style}
                  </span>
                )}
                {clase.level && (
                  <span
                    style={{
                      background: "#F4F2EE",
                      color: "#555555",
                      fontFamily: "var(--font-jakarta)",
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "4px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    {levelLabels[clase.level] ?? clase.level}
                  </span>
                )}
              </div>

              {/* Detalles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {clase.room && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <i className="ti ti-door" aria-hidden="true" style={{ fontSize: "15px", color: "#AAAAAA", width: 18 }} />
                    <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#555555" }}>
                      {clase.room}
                    </span>
                  </div>
                )}
                {clase.capacity && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <i className="ti ti-users" aria-hidden="true" style={{ fontSize: "15px", color: "#AAAAAA", width: 18 }} />
                    <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#555555" }}>
                      {clase.enrollments.length} / {clase.capacity} alumnos
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Alumnos inscriptos */}
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                border: "1px solid #EEECE8",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 22px 14px",
                  borderBottom: "1px solid #F4F2EE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-fraunces)",
                    fontWeight: 400,
                    fontSize: "17px",
                    letterSpacing: "-0.02em",
                    color: "#111111",
                  }}
                >
                  Alumnos inscriptos
                </h2>
                <span
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "12px",
                    color: "#999999",
                  }}
                >
                  {clase.enrollments.length} {clase.enrollments.length === 1 ? "alumno" : "alumnos"}
                </span>
              </div>

              {clase.enrollments.length === 0 ? (
                <div
                  style={{
                    padding: "40px 22px",
                    textAlign: "center",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "13px",
                    color: "#AAAAAA",
                  }}
                >
                  Aún no hay alumnos inscriptos en esta clase.
                </div>
              ) : (
                <AnimatedList style={{ display: "flex", flexDirection: "column" }}>
                  {clase.enrollments.map((enr, idx) => {
                    const initials = getInitials(enr.student.firstName, enr.student.lastName);
                    return (
                      <AnimatedItem key={enr.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 22px",
                            borderBottom:
                              idx < clase.enrollments.length - 1
                                ? "1px solid #F4F2EE"
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "#FF3D5E",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontFamily: "var(--font-jakarta)",
                              fontWeight: 600,
                              fontSize: "12px",
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: "var(--font-jakarta)",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#111111",
                              }}
                            >
                              {enr.student.firstName} {enr.student.lastName}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-jakarta)",
                                fontSize: "12px",
                                color: "#999999",
                                marginTop: "1px",
                              }}
                            >
                              {enr.student.email}
                            </div>
                          </div>
                        </div>
                      </AnimatedItem>
                    );
                  })}
                </AnimatedList>
              )}
            </div>

            {/* ── Botón tomar asistencia ── */}
            {canAttend && (
              <>
                <style>{`
                  .attend-btn {
                    transition: background 0.15s ease, transform 0.18s ease;
                  }
                  .attend-btn:hover {
                    background: #222 !important;
                    transform: translateY(-2px);
                  }
                  .attend-btn:active {
                    transform: translateY(0);
                  }
                `}</style>
                <Link
                  href={`/dashboard/mis-clases/${id}/asistencia`}
                  className="attend-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "#111111",
                    color: "white",
                    borderRadius: "12px",
                    padding: "14px 28px",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <i
                    className="ti ti-clipboard-check"
                    aria-hidden="true"
                    style={{ fontSize: "16px", color: "#FF3D5E" }}
                  />
                  Tomar asistencia
                </Link>
              </>
            )}
          </div>

          {/* ── Columna derecha: profesor + horarios ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Profesor */}
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                border: "1px solid #EEECE8",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#999999",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: "14px",
                }}
              >
                Profesor
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "#3B82F6",
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
                  {getInitials(clase.teacher.firstName, clase.teacher.lastName)}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#111111",
                    }}
                  >
                    {clase.teacher.firstName} {clase.teacher.lastName}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: "12px",
                      color: "#999999",
                      marginTop: "1px",
                    }}
                  >
                    {clase.teacher.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Horarios */}
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                border: "1px solid #EEECE8",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#999999",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: "14px",
                }}
              >
                Horarios
              </div>

              {clase.schedules.length === 0 ? (
                <p
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "13px",
                    color: "#AAAAAA",
                    fontStyle: "italic",
                  }}
                >
                  Sin horarios asignados
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {clase.schedules.map((sched) => (
                    <div
                      key={sched.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "#F9F8F6",
                        borderRadius: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-jakarta)",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#333333",
                        }}
                      >
                        {dayNames[sched.dayOfWeek] ?? sched.dayOfWeek}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-jakarta)",
                          fontSize: "12px",
                          color: "#777777",
                        }}
                      >
                        {sched.startTime} – {sched.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
