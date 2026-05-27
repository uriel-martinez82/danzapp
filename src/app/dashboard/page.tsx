import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { AnimatedList, AnimatedItem } from "@/components/AnimatedList";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatCard = {
  label:      string;
  value:      number | string;
  icon:       string;
  iconBg:     string;
  iconColor:  string;
};

// ── Stat card component ───────────────────────────────────────────────────────

function StatCard({ stat }: { stat: StatCard }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "14px",
        border: "1px solid #EEECE8",
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

// ── Panel component ───────────────────────────────────────────────────────────

function Panel({
  title,
  linkHref,
  linkLabel,
  empty,
}: {
  title: string;
  linkHref: string;
  linkLabel: string;
  empty: string;
}) {
  return (
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
          href={linkHref}
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
      <div style={{ padding: "16px 20px" }}>
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
          {empty}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) redirect("/sign-in");

  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  const firstName = user.firstName || user.email.split("@")[0];

  const fechaLarga = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Stats por rol ────────────────────────────────────────────────────────────

  let stats: StatCard[] = [];

  if (user.role === "admin" && user.schoolId) {
    const [totalAlumnos, totalClases, pagosPendientes, totalComunicados] =
      await Promise.all([
        prisma.user.count({
          where: { schoolId: user.schoolId, role: "student", active: true },
        }),
        prisma.class.count({
          where: { schoolId: user.schoolId, active: true },
        }),
        prisma.payment.count({
          where: { schoolId: user.schoolId, status: "pending" },
        }),
        prisma.announcement.count({
          where: { schoolId: user.schoolId },
        }),
      ]);

    stats = [
      { label: "Alumnos activos",   value: totalAlumnos,      icon: "ti-users",       iconBg: "#FFF0F2", iconColor: "#FF3D5E" },
      { label: "Clases activas",    value: totalClases,       icon: "ti-calendar",    iconBg: "#F0FAF5", iconColor: "#1D9E75" },
      { label: "Pagos pendientes",  value: pagosPendientes,   icon: "ti-credit-card", iconBg: "#FEF8EE", iconColor: "#D97706" },
      { label: "Comunicados",       value: totalComunicados,  icon: "ti-bell",        iconBg: "#EFF5FE", iconColor: "#3B82F6" },
    ];
  } else if (user.role === "teacher") {
    const [misClases, misAlumnos] = await Promise.all([
      prisma.class.count({
        where: { teacherId: user.id, active: true },
      }),
      prisma.enrollment.count({
        where: { class: { teacherId: user.id }, status: "active" },
      }),
    ]);

    stats = [
      { label: "Mis clases activas",     value: misClases,  icon: "ti-calendar", iconBg: "#F0FAF5", iconColor: "#1D9E75" },
      { label: "Alumnos en mis clases",  value: misAlumnos, icon: "ti-users",    iconBg: "#FFF0F2", iconColor: "#FF3D5E" },
    ];
  } else if (user.role === "student") {
    const [misClasesAlumno, misPagosPendientes] = await Promise.all([
      prisma.enrollment.count({
        where: { studentId: user.id, status: "active" },
      }),
      prisma.payment.count({
        where: { studentId: user.id, status: "pending" },
      }),
    ]);

    stats = [
      { label: "Mis clases",          value: misClasesAlumno,      icon: "ti-calendar",    iconBg: "#F0FAF5", iconColor: "#1D9E75" },
      { label: "Pagos pendientes",    value: misPagosPendientes,   icon: "ti-credit-card", iconBg: "#FEF8EE", iconColor: "#D97706" },
    ];
  }

  // ── Links de paneles según rol ────────────────────────────────────────────────

  const clasesHref = user.role === "admin" ? "/dashboard/clases"  : "/dashboard/mis-clases";
  const pagosHref  = user.role === "student" ? "/dashboard/mis-pagos" : "/dashboard/pagos";

  // Grid de stats: 4 cols para admin, 2 para los demás
  const gridCols =
    user.role === "admin" ? "repeat(4, 1fr)" : "repeat(2, 1fr)";

  return (
    <PageTransition>
      <div>
        {/* ── Header ── */}
        <div style={{ padding: "4px 4px 0", marginBottom: "28px" }}>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontWeight: 400,
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#999999",
              marginBottom: "12px",
            }}
          >
            {fechaLarga}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-fraunces)",
              fontWeight: 300,
              fontSize: "38px",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#111111",
            }}
          >
            {saludo},{" "}
            <em style={{ color: "#FF3D5E", fontStyle: "italic" }}>{firstName}</em>
          </h1>
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
          <Panel
            title="Últimos comunicados"
            linkHref="/dashboard/comunicados"
            linkLabel="Ver todos"
            empty="No hay comunicados aún"
          />

          {user.role === "student" ? (
            <Panel
              title="Mis pagos"
              linkHref={pagosHref}
              linkLabel="Ver todos"
              empty="No hay pagos registrados"
            />
          ) : (
            <Panel
              title={user.role === "admin" ? "Próximas clases" : "Mis clases"}
              linkHref={clasesHref}
              linkLabel="Ver todas"
              empty="No hay clases programadas"
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
