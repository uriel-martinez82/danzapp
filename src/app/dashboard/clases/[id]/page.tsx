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

const dayNamesFull: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

const levelLabels: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  all: "Todos los niveles",
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClaseDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const viewer = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!viewer) redirect("/sign-in");

  const clase = await prisma.class.findUnique({
    where: { id },
    include: {
      teacher: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      schedules: { orderBy: { dayOfWeek: "asc" } },
      enrollments: {
        where: { status: "active" },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              active: true,
            },
          },
        },
        orderBy: { enrolledAt: "asc" },
      },
    },
  });

  if (!clase || clase.schoolId !== viewer.schoolId) notFound();

  const styleChip = hashColor(clase.style ?? clase.name);
  const teacherInitials = getInitials(clase.teacher.firstName, clase.teacher.lastName);
  const teacherName = `${clase.teacher.firstName} ${clase.teacher.lastName}`;

  const infoItems = [
    { label: "Estilo",   value: clase.style ?? "—",                           icon: "ti-star" },
    { label: "Nivel",    value: clase.level ? (levelLabels[clase.level] ?? clase.level) : "—", icon: "ti-chart-bar" },
    { label: "Sala",     value: clase.room ?? "—",                            icon: "ti-door" },
    { label: "Capacidad",value: clase.capacity ? `${clase.capacity} alumnos` : "—", icon: "ti-users" },
  ];

  return (
    <PageTransition>
    <div>
      {/* ── Back link ── */}
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
          marginBottom: "24px",
        }}
      >
        <i className="ti ti-arrow-left" aria-hidden="true" style={{ fontSize: "13px" }} />
        Volver a clases
      </Link>

      {/* ── Top: name + badges ── */}
      <div style={{ marginBottom: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
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
          {!clase.active && (
            <span
              style={{
                background: "#F4F2EE",
                color: "#999999",
                fontFamily: "var(--font-jakarta)",
                fontSize: "12px",
                fontWeight: 500,
                padding: "4px 10px",
                borderRadius: "6px",
              }}
            >
              Inactiva
            </span>
          )}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-fraunces)",
            fontWeight: 300,
            fontSize: "36px",
            letterSpacing: "-0.03em",
            color: "#111111",
            lineHeight: 1.1,
          }}
        >
          {clase.name}
        </h1>
      </div>

      {/* ── 2-col layout ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Info card */}
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
                padding: "16px 20px 12px",
                borderBottom: "1px solid #F4F2EE",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontWeight: 400,
                  fontSize: "15px",
                  letterSpacing: "-0.02em",
                  color: "#111111",
                }}
              >
                Información general
              </h2>
            </div>
            <div>
              {infoItems.map(({ label, value, icon }, i) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "13px 20px",
                    borderBottom: i < infoItems.length - 1 ? "1px solid #F4F2EE" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      background: "#F4F2EE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <i
                      className={`ti ${icon}`}
                      aria-hidden="true"
                      style={{ fontSize: "14px", color: "#777777" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "10px",
                        fontWeight: 500,
                        color: "#999999",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: "1px",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "14px",
                        color: value === "—" ? "#AAAAAA" : "#111111",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enrolled students card */}
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
                padding: "16px 20px 12px",
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
                  fontSize: "15px",
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
                  fontWeight: 500,
                  background: "#F4F2EE",
                  color: "#555555",
                  padding: "3px 9px",
                  borderRadius: "6px",
                }}
              >
                {clase.enrollments.length}
              </span>
            </div>

            {clase.enrollments.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "13px",
                    color: "#AAAAAA",
                  }}
                >
                  Aún no hay alumnos inscriptos.
                </p>
              </div>
            ) : (
              <AnimatedList>
                {clase.enrollments.map((enr) => {
                  const studentInitials = getInitials(
                    enr.student.firstName,
                    enr.student.lastName,
                  );
                  return (
                    <AnimatedItem key={enr.id}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 20px",
                          borderBottom: "1px solid #F9F8F6",
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 34,
                            height: 34,
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
                          {studentInitials}
                        </div>

                        {/* Info */}
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
                            {enr.student.firstName} {enr.student.lastName}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-jakarta)",
                              fontSize: "12px",
                              color: "#777777",
                              marginTop: "1px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {enr.student.email}
                          </div>
                        </div>

                        {/* Enrollment date */}
                        <span
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "11px",
                            color: "#AAAAAA",
                            flexShrink: 0,
                          }}
                        >
                          Desde {formatDate(enr.enrolledAt)}
                        </span>
                      </div>
                    </AnimatedItem>
                  );
                })}
              </AnimatedList>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Teacher card */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              border: "1px solid #EEECE8",
              padding: "20px 22px",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-fraunces)",
                fontWeight: 400,
                fontSize: "15px",
                letterSpacing: "-0.02em",
                color: "#111111",
                marginBottom: "16px",
              }}
            >
              Profesor
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#3B82F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontFamily: "var(--font-jakarta)",
                  fontWeight: 700,
                  fontSize: "15px",
                  flexShrink: 0,
                }}
              >
                {teacherInitials}
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
                  {teacherName}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "12px",
                    color: "#777777",
                    marginTop: "2px",
                  }}
                >
                  {clase.teacher.email}
                </div>
              </div>
            </div>
            {clase.teacher.phone && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "14px",
                  paddingTop: "14px",
                  borderTop: "1px solid #F4F2EE",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "12px",
                  color: "#777777",
                }}
              >
                <i className="ti ti-phone" aria-hidden="true" style={{ fontSize: "13px" }} />
                {clase.teacher.phone}
              </div>
            )}
          </div>

          {/* Schedules card */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              border: "1px solid #EEECE8",
              padding: "20px 22px",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-fraunces)",
                fontWeight: 400,
                fontSize: "15px",
                letterSpacing: "-0.02em",
                color: "#111111",
                marginBottom: "16px",
              }}
            >
              Horarios
            </h2>

            {clase.schedules.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "13px",
                  color: "#AAAAAA",
                  fontStyle: "italic",
                }}
              >
                Sin horarios asignados.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {clase.schedules.map((sched) => (
                  <div
                    key={sched.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        background: "#E8F5E9",
                        color: "#388E3C",
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: "6px",
                        minWidth: "72px",
                        textAlign: "center",
                      }}
                    >
                      {dayNamesFull[sched.dayOfWeek] ?? sched.dayOfWeek}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "13px",
                        color: "#555555",
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
