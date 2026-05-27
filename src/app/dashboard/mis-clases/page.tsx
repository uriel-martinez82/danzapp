import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
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

const dayNamesShort: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom",
};

const levelLabels: Record<string, string> = {
  beginner:     "Principiante",
  intermediate: "Intermedio",
  advanced:     "Avanzado",
  all:          "Todos los niveles",
};

// ── Tipos normalizados para el render ─────────────────────────────────────────

type ClaseCard = {
  id:            string;
  name:          string;
  style:         string | null;
  level:         string | null;
  room:          string | null;
  capacity:      number | null;
  enrollCount:   number;
  teacher: {
    firstName: string;
    lastName:  string;
  };
  schedules: {
    id:        string;
    dayOfWeek: number;
    startTime: string;
    endTime:   string;
  }[];
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function MisClasesPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) redirect("/sign-in");

  // Solo teacher y student
  if (user.role === "admin") redirect("/dashboard/clases");

  let cards: ClaseCard[] = [];

  if (user.role === "teacher") {
    const classes = await prisma.class.findMany({
      where:   { teacherId: user.id, active: true },
      orderBy: { name: "asc" },
      include: {
        teacher:   { select: { firstName: true, lastName: true } },
        schedules: { orderBy: { dayOfWeek: "asc" } },
        _count:    { select: { enrollments: true } },
      },
    });

    cards = classes.map((c) => ({
      id:          c.id,
      name:        c.name,
      style:       c.style,
      level:       c.level,
      room:        c.room,
      capacity:    c.capacity,
      enrollCount: c._count.enrollments,
      teacher:     c.teacher,
      schedules:   c.schedules,
    }));
  } else {
    // student
    const enrollments = await prisma.enrollment.findMany({
      where:   { studentId: user.id, status: "active" },
      orderBy: { enrolledAt: "desc" },
      include: {
        class: {
          include: {
            teacher:   { select: { firstName: true, lastName: true } },
            schedules: { orderBy: { dayOfWeek: "asc" } },
            _count:    { select: { enrollments: true } },
          },
        },
      },
    });

    cards = enrollments.map((e) => ({
      id:          e.class.id,
      name:        e.class.name,
      style:       e.class.style,
      level:       e.class.level,
      room:        e.class.room,
      capacity:    e.class.capacity,
      enrollCount: e.class._count.enrollments,
      teacher:     e.class.teacher,
      schedules:   e.class.schedules,
    }));
  }

  const pageTitle  = user.role === "teacher" ? "Mis Clases" : "Mis Clases";
  const pageSubtitle = `${cards.length} ${cards.length === 1 ? "clase" : "clases"}`;

  return (
    <PageTransition>
      <div>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingBottom: "24px",
            marginBottom: "4px",
          }}
        >
          <div>
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
              {pageTitle}
            </h1>
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                color: "#999999",
                marginTop: "4px",
              }}
            >
              {pageSubtitle}
            </p>
          </div>
        </div>

        {/* ── Empty state ── */}
        {cards.length === 0 && (
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              border: "1px solid #EEECE8",
              padding: "80px 40px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                background: "#E8F5E9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
              }}
            >
              <i
                className="ti ti-calendar"
                aria-hidden="true"
                style={{ fontSize: "22px", color: "#388E3C" }}
              />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-fraunces)",
                fontWeight: 400,
                fontSize: "20px",
                letterSpacing: "-0.02em",
                color: "#111111",
                marginBottom: "8px",
              }}
            >
              {user.role === "teacher"
                ? "No tenés clases asignadas"
                : "No estás inscripto en ninguna clase"}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                color: "#999999",
                lineHeight: 1.6,
              }}
            >
              {user.role === "teacher"
                ? "El administrador te asignará clases próximamente."
                : "Contactá al administrador para inscribirte en una clase."}
            </p>
          </div>
        )}

        {/* ── Grid ── */}
        {cards.length > 0 && (
          <>
          <style>{`
            .clase-card {
              transition: box-shadow 0.2s ease, transform 0.2s ease;
            }
            .clase-card:hover {
              box-shadow: 0 8px 28px rgba(0,0,0,0.10);
              transform: translateY(-2px);
            }
          `}</style>
          <AnimatedList
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "14px",
              alignItems: "start",
            }}
          >
            {cards.map((clase) => {
              const styleChip  = hashColor(clase.style ?? clase.name);
              const initials   = getInitials(clase.teacher.firstName, clase.teacher.lastName);
              const teacherName = `${clase.teacher.firstName} ${clase.teacher.lastName}`;

              return (
                <AnimatedItem key={clase.id}>
                  <Link
                    href={`/dashboard/mis-clases/${clase.id}`}
                    className="clase-card"
                    style={{
                      background: "white",
                      borderRadius: "14px",
                      border: "1px solid #EEECE8",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    {/* Card body */}
                    <div style={{ padding: "20px 22px", flex: 1 }}>
                      {/* Badges */}
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginBottom: "14px",
                          flexWrap: "wrap",
                        }}
                      >
                        {clase.style && (
                          <span
                            style={{
                              background: styleChip.bg,
                              color: styleChip.color,
                              fontFamily: "var(--font-jakarta)",
                              fontSize: "11px",
                              fontWeight: 500,
                              padding: "3px 9px",
                              borderRadius: "6px",
                              whiteSpace: "nowrap",
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
                              fontSize: "11px",
                              fontWeight: 500,
                              padding: "3px 9px",
                              borderRadius: "6px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {levelLabels[clase.level] ?? clase.level}
                          </span>
                        )}
                      </div>

                      {/* Class name */}
                      <h3
                        style={{
                          fontFamily: "var(--font-fraunces)",
                          fontWeight: 300,
                          fontSize: "19px",
                          letterSpacing: "-0.02em",
                          color: "#111111",
                          lineHeight: 1.2,
                          marginBottom: "14px",
                        }}
                      >
                        {clase.name}
                      </h3>

                      {/* Teacher */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: "#3B82F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontFamily: "var(--font-jakarta)",
                            fontWeight: 600,
                            fontSize: "10px",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "12px",
                            color: "#555555",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {teacherName}
                        </span>
                      </div>

                      {/* Schedules */}
                      {clase.schedules.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {clase.schedules.map((sched) => (
                            <div
                              key={sched.id}
                              style={{ display: "flex", alignItems: "center", gap: "8px" }}
                            >
                              <span
                                style={{
                                  background: "#F4F2EE",
                                  color: "#555555",
                                  fontFamily: "var(--font-jakarta)",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  letterSpacing: "0.04em",
                                  minWidth: "28px",
                                  textAlign: "center",
                                }}
                              >
                                {dayNamesShort[sched.dayOfWeek] ?? sched.dayOfWeek}
                              </span>
                              <span
                                style={{
                                  fontFamily: "var(--font-jakarta)",
                                  fontSize: "12px",
                                  color: "#555555",
                                }}
                              >
                                {sched.startTime} – {sched.endTime}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "12px",
                            color: "#AAAAAA",
                            fontStyle: "italic",
                          }}
                        >
                          Sin horarios asignados
                        </p>
                      )}
                    </div>

                    {/* Card footer */}
                    <div
                      style={{
                        borderTop: "1px solid #F4F2EE",
                        padding: "11px 22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        {/* Enrollment count */}
                        <span
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "12px",
                            color: "#777777",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <i className="ti ti-users" aria-hidden="true" style={{ fontSize: "12px" }} />
                          {clase.enrollCount}
                          {clase.capacity ? ` / ${clase.capacity}` : ""}
                        </span>

                        {/* Room */}
                        {clase.room && (
                          <span
                            style={{
                              fontFamily: "var(--font-jakarta)",
                              fontSize: "12px",
                              color: "#777777",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className="ti ti-door" aria-hidden="true" style={{ fontSize: "12px" }} />
                            {clase.room}
                          </span>
                        )}
                      </div>

                    </div>
                  </Link>
                </AnimatedItem>
              );
            })}
          </AnimatedList>
          </>
        )}
      </div>
    </PageTransition>
  );
}
