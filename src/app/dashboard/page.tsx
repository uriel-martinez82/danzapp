import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { AnimatedList, AnimatedItem } from "@/components/AnimatedList";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatCard = {
  label:     string;
  value:     number | string;
  icon:      string;
  iconBg:    string;
  iconColor: string;
};

type ComunicadoItem = {
  id:        string;
  title:     string;
  body:      string;
  audience:  string;
  createdAt: Date;
  author:    { firstName: string; lastName: string };
};

type ClaseItem = {
  id:       string;
  name:     string;
  style:    string | null;
  schedules: { dayOfWeek: number; startTime: string }[];
  teacher:  { firstName: string; lastName: string } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len).trimEnd() + "…" : str;
}

function tiempoRelativo(date: Date): string {
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 2)  return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days  = Math.floor(hours / 24);
  if (days === 1) return "hace 1 día";
  if (days < 7)   return `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "hace 1 semana" : `hace ${weeks} semanas`;
}

function proximoDia(schedules: { dayOfWeek: number; startTime: string }[]): {
  dia:  string;
  hora: string;
} | null {
  if (schedules.length === 0) return null;
  const hoy    = new Date().getDay();            // 0=Dom, 1=Lun…
  const sorted = [...schedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const proximo = sorted.find((s) => s.dayOfWeek >= hoy) ?? sorted[0];
  const nombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return {
    dia:  nombres[proximo.dayOfWeek] ?? "—",
    hora: proximo.startTime,
  };
}

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
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return palette[h % palette.length];
}

const audienceConfig: Record<string, { label: string; bg: string; color: string }> = {
  all:      { label: "Todos",      bg: "#F4F2EE", color: "#555555" },
  teachers: { label: "Profesores", bg: "#EFF5FE", color: "#1565C0" },
  students: { label: "Alumnos",    bg: "#F0FAF5", color: "#1D9E75" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ stat }: { stat: StatCard }) {
  return (
    <div
      className="pasada-card"
      style={{
        background: "white",
        borderRadius: "14px",
        padding: "20px",
        height: "100%",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          background: stat.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <i
          className={`ti ${stat.icon}`}
          aria-hidden="true"
          style={{ fontSize: "16px", color: stat.iconColor, lineHeight: 1 }}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--font-fraunces)",
          fontWeight: 400,
          fontSize: "32px",
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "#111111",
        }}
      >
        {stat.value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jakarta)",
          fontWeight: 400,
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#999999",
          marginTop: "5px",
        }}
      >
        {stat.label}
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  href,
  linkLabel,
}: {
  title:     string;
  href:      string;
  linkLabel: string;
}) {
  return (
    <div
      style={{
        padding: "18px 20px 14px",
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
          fontSize: "16px",
          letterSpacing: "-0.02em",
          color: "#111111",
        }}
      >
        {title}
      </h2>
      <Link
        href={href}
        style={{
          fontFamily: "var(--font-jakarta)",
          fontWeight: 500,
          fontSize: "12px",
          color: "#FF3D5E",
          textDecoration: "none",
        }}
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-jakarta)",
        fontWeight: 400,
        fontSize: "13px",
        color: "#999999",
        textAlign: "center",
        padding: "28px 0",
      }}
    >
      {text}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) redirect("/sign-in");

  const role = String(user.role);

  // ── Branding de la escuela ────────────────────────────────────────────────────
  const school = user.schoolId
    ? await prisma.school.findUnique({
        where:  { id: user.schoolId },
        select: { bannerUrl: true, logoUrl: true, accentColor: true, name: true },
      })
    : null;

  const bannerSrc   = school?.bannerUrl   || "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=1600&q=80";
  const accentColor = school?.accentColor ?? "#FF3D5E";

  const hora    = new Date().getHours();
  const saludo  = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const firstName = user.firstName || user.email.split("@")[0];
  const fechaLarga = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });

  // ── Stats por rol ─────────────────────────────────────────────────────────────

  let stats: StatCard[] = [];

  if (role === "admin" && user.schoolId) {
    const [totalAlumnos, totalClases, pagosPendientes, totalComunicados] =
      await Promise.all([
        prisma.user.count({ where: { schoolId: user.schoolId, role: "student", active: true } }),
        prisma.class.count({ where: { schoolId: user.schoolId, active: true } }),
        prisma.payment.count({ where: { schoolId: user.schoolId, status: "pending" } }),
        prisma.announcement.count({ where: { schoolId: user.schoolId } }),
      ]);

    stats = [
      { label: "Alumnos activos",  value: totalAlumnos,     icon: "ti-users",       iconBg: "#FFF0F2", iconColor: "#FF3D5E" },
      { label: "Clases activas",   value: totalClases,      icon: "ti-calendar",    iconBg: "#F0FAF5", iconColor: "#1D9E75" },
      { label: "Pagos pendientes", value: pagosPendientes,  icon: "ti-credit-card", iconBg: "#FEF8EE", iconColor: "#D97706" },
      { label: "Comunicados",      value: totalComunicados, icon: "ti-bell",        iconBg: "#EFF5FE", iconColor: "#3B82F6" },
    ];
  } else if (role === "teacher") {
    const [misClases, misAlumnos] = await Promise.all([
      prisma.class.count({ where: { teacherId: user.id, active: true } }),
      prisma.enrollment.count({ where: { class: { teacherId: user.id }, status: "active" } }),
    ]);
    stats = [
      { label: "Mis clases activas",    value: misClases,  icon: "ti-calendar", iconBg: "#F0FAF5", iconColor: "#1D9E75" },
      { label: "Alumnos en mis clases", value: misAlumnos, icon: "ti-users",    iconBg: "#FFF0F2", iconColor: "#FF3D5E" },
    ];
  } else if (role === "student") {
    const [misClasesAlumno, misPagosPendientes] = await Promise.all([
      prisma.enrollment.count({ where: { studentId: user.id, status: "active" } }),
      prisma.payment.count({ where: { studentId: user.id, status: "pending" } }),
    ]);
    stats = [
      { label: "Mis clases",       value: misClasesAlumno,    icon: "ti-calendar",    iconBg: "#F0FAF5", iconColor: "#1D9E75" },
      { label: "Pagos pendientes", value: misPagosPendientes, icon: "ti-credit-card", iconBg: "#FEF8EE", iconColor: "#D97706" },
    ];
  }

  // ── Comunicados panel ─────────────────────────────────────────────────────────

  const audienceFilter =
    role === "admin"
      ? {}
      : role === "teacher"
      ? { audience: { in: ["all", "teachers"] as string[] } }
      : { audience: { in: ["all", "students"] as string[] } };

  const comunicados: ComunicadoItem[] = user.schoolId
    ? await prisma.announcement.findMany({
        where:   { schoolId: user.schoolId, ...audienceFilter },
        orderBy: { createdAt: "desc" },
        take:    3,
        include: { author: { select: { firstName: true, lastName: true } } },
      })
    : [];

  // ── Clases panel ──────────────────────────────────────────────────────────────

  let proximasClases: ClaseItem[] = [];

  if (role === "admin" && user.schoolId) {
    const clases = await prisma.class.findMany({
      where:   { schoolId: user.schoolId, active: true },
      include: {
        schedules: true,
        teacher:   { select: { firstName: true, lastName: true } },
      },
      take: 3,
    });
    proximasClases = clases.map((c) => ({
      id:       c.id,
      name:     c.name,
      style:    c.style,
      schedules: c.schedules,
      teacher:  c.teacher,
    }));
  } else if (role === "teacher") {
    const clases = await prisma.class.findMany({
      where:   { teacherId: user.id, active: true },
      include: { schedules: true },
      take:    3,
    });
    proximasClases = clases.map((c) => ({
      id:       c.id,
      name:     c.name,
      style:    c.style,
      schedules: c.schedules,
      teacher:  null,
    }));
  } else if (role === "student") {
    const enrollments = await prisma.enrollment.findMany({
      where:   { studentId: user.id, status: "active" },
      include: {
        class: {
          include: {
            schedules: true,
            teacher:   { select: { firstName: true, lastName: true } },
          },
        },
      },
      take: 3,
    });
    proximasClases = enrollments.map((e) => ({
      id:       e.class.id,
      name:     e.class.name,
      style:    e.class.style,
      schedules: e.class.schedules,
      teacher:  e.class.teacher,
    }));
  }

  // ── Links según rol ───────────────────────────────────────────────────────────

  const clasesHref = role === "admin" ? "/dashboard/clases" : "/dashboard/mis-clases";
  const gridCols   = role === "admin" ? "repeat(4, 1fr)" : "repeat(2, 1fr)";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div>
        {/* ── Hero banner ── */}
        <div
          style={{
            position: "relative",
            height: 200,
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerSrc}
            alt=""
            aria-hidden="true"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 30%",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.64) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "24px 28px",
              display: "flex",
              alignItems: "flex-end",
              gap: "14px",
            }}
          >
            {/* Logo de la escuela si existe */}
            {school?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logoUrl}
                alt={school.name ?? "Logo"}
                style={{
                  width:        52,
                  height:       52,
                  borderRadius: "50%",
                  objectFit:    "cover",
                  border:       "2px solid rgba(255,255,255,0.35)",
                  flexShrink:   0,
                  marginBottom: "4px",
                }}
              />
            )}

            <div>
              <p
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontWeight: 400,
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.58)",
                  marginBottom: "8px",
                }}
              >
                {fechaLarga}
              </p>
              <h1
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontWeight: 300,
                  fontSize: "36px",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  color: "white",
                }}
              >
                {saludo},{" "}
                <em style={{ color: accentColor, fontStyle: "italic", filter: "brightness(1.3)" }}>{firstName}</em>
              </h1>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <AnimatedList
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {stats.map((stat) => (
            <AnimatedItem key={stat.label}>
              <StatCard stat={stat} />
            </AnimatedItem>
          ))}
        </AnimatedList>

        {/* ── Panels ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          {/* ── Panel comunicados ── */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              border: "1px solid #EEECE8",
              overflow: "hidden",
            }}
          >
            <PanelHeader
              title="Últimos comunicados"
              href="/dashboard/comunicados"
              linkLabel="Ver todos"
            />

            <div style={{ padding: "0 20px" }}>
              {comunicados.length === 0 ? (
                <EmptyRow text="No hay comunicados aún" />
              ) : (
                comunicados.map((ann, idx) => {
                  const aud = audienceConfig[ann.audience] ?? audienceConfig.all;
                  return (
                    <div
                      key={ann.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        padding: "12px 0",
                        borderBottom:
                          idx < comunicados.length - 1
                            ? "1px solid #F4F2EE"
                            : "none",
                      }}
                    >
                      {/* Título + badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#111111",
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ann.title}
                        </span>
                        <span
                          style={{
                            background: aud.bg,
                            color: aud.color,
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "10px",
                            fontWeight: 500,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {aud.label}
                        </span>
                      </div>

                      {/* Preview del body */}
                      <p
                        style={{
                          fontFamily: "var(--font-jakarta)",
                          fontSize: "12px",
                          color: "#777777",
                          lineHeight: 1.45,
                          margin: 0,
                        }}
                      >
                        {truncate(ann.body, 80)}
                      </p>

                      {/* Autor + fecha */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "2px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "11px",
                            color: "#BBBBBB",
                          }}
                        >
                          {ann.author.firstName} {ann.author.lastName}
                        </span>
                        <span style={{ color: "#DDDDDD", fontSize: "10px" }}>·</span>
                        <span
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "11px",
                            color: "#BBBBBB",
                          }}
                        >
                          {tiempoRelativo(ann.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Panel clases ── */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              border: "1px solid #EEECE8",
              overflow: "hidden",
            }}
          >
            <PanelHeader
              title={role === "admin" ? "Próximas clases" : "Mis clases"}
              href={clasesHref}
              linkLabel="Ver todas"
            />

            <div style={{ padding: "0 20px" }}>
              {proximasClases.length === 0 ? (
                <EmptyRow text="No hay clases programadas" />
              ) : (
                proximasClases.map((clase, idx) => {
                  const chip  = hashColor(clase.style ?? clase.name);
                  const next  = proximoDia(clase.schedules);
                  return (
                    <div
                      key={clase.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        padding: "12px 0",
                        borderBottom:
                          idx < proximasClases.length - 1
                            ? "1px solid #F4F2EE"
                            : "none",
                      }}
                    >
                      {/* Info */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#111111",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {clase.name}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "11px",
                            color: "#999999",
                            marginTop: "2px",
                          }}
                        >
                          {next ? `${next.dia} ${next.hora}` : "Sin horario"}
                          {clase.teacher
                            ? ` · ${clase.teacher.firstName} ${clase.teacher.lastName}`
                            : ""}
                        </div>
                      </div>

                      {/* Style badge */}
                      {clase.style && (
                        <span
                          style={{
                            background: chip.bg,
                            color: chip.color,
                            fontFamily: "var(--font-jakarta)",
                            fontSize: "11px",
                            fontWeight: 500,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {clase.style}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
