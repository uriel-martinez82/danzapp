import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { AnimatedList, AnimatedItem } from "@/components/AnimatedList";
import AnimatedButton from "@/components/AnimatedButton";

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  all: "Todos los niveles",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ClasesPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) redirect("/sign-in");

  if (user.role !== "admin") redirect("/dashboard");

  if (!user.schoolId) {
    return (
      <PageTransition>
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "14px", color: "#999999" }}>
            No tenés una escuela asignada.
          </p>
        </div>
      </PageTransition>
    );
  }

  const classes = await prisma.class.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { name: "asc" },
    include: {
      teacher: { select: { firstName: true, lastName: true, email: true } },
      schedules: { orderBy: { dayOfWeek: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });

  return (
    <PageTransition>
      <div>
        {/* ── Hero banner ── */}
        <div
          style={{
            position: "relative",
            height: 180,
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1547153760-18fc86324498?w=1600&q=80"
            alt=""
            aria-hidden="true"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 40%",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.60) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "20px 24px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontWeight: 300,
                  fontSize: "32px",
                  letterSpacing: "-0.03em",
                  color: "white",
                  lineHeight: 1.1,
                }}
              >
                Clases
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.65)",
                  marginTop: "4px",
                }}
              >
                {classes.length} {classes.length === 1 ? "clase" : "clases"}
              </p>
            </div>
            <AnimatedButton
              href="/dashboard/clases/nueva"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#FF3D5E",
                color: "white",
                borderRadius: "10px",
                padding: "10px 20px",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
              Nueva clase
            </AnimatedButton>
          </div>
        </div>

        {/* ── Empty state ── */}
        {classes.length === 0 && (
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
              Aún no hay clases
            </h2>
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                color: "#999999",
                lineHeight: 1.6,
                maxWidth: 320,
                margin: "0 auto 24px",
              }}
            >
              Creá la primera clase para comenzar a organizar tu escuela.
            </p>
            <AnimatedButton
              href="/dashboard/clases/nueva"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#FF3D5E",
                color: "white",
                borderRadius: "10px",
                padding: "10px 20px",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
              Crear primera clase
            </AnimatedButton>
          </div>
        )}

        {/* ── Grid ── */}
        {classes.length > 0 && (
          <AnimatedList
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "14px",
              alignItems: "start",
            }}
          >
            {classes.map((clase) => {
              const styleChip = hashColor(clase.style ?? clase.name);
              const initials = getInitials(
                clase.teacher.firstName,
                clase.teacher.lastName,
              );
              const teacherName = `${clase.teacher.firstName} ${clase.teacher.lastName}`;

              return (
                <AnimatedItem key={clase.id}>
                  <div
                    className="pasada-card"
                    style={{
                      background: "white",
                      borderRadius: "14px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* ── Card body ── */}
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
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
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

                    {/* ── Card footer ── */}
                    <div
                      style={{
                        borderTop: "1px solid #F4F2EE",
                        padding: "11px 22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                        }}
                      >
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
                          <i
                            className="ti ti-users"
                            aria-hidden="true"
                            style={{ fontSize: "12px" }}
                          />
                          {clase._count.enrollments}
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
                            <i
                              className="ti ti-door"
                              aria-hidden="true"
                              style={{ fontSize: "12px" }}
                            />
                            {clase.room}
                          </span>
                        )}
                      </div>

                      {/* Detail link */}
                      <Link
                        href={`/dashboard/clases/${clase.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          borderRadius: "8px",
                          color: "#CCCCCC",
                          textDecoration: "none",
                          flexShrink: 0,
                        }}
                      >
                        <i
                          className="ti ti-chevron-right"
                          aria-hidden="true"
                          style={{ fontSize: "15px" }}
                        />
                      </Link>
                    </div>
                  </div>
                </AnimatedItem>
              );
            })}
          </AnimatedList>
        )}
      </div>
    </PageTransition>
  );
}
