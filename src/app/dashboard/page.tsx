import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const stats = [
  {
    label: "Alumnos activos",
    value: "—",
    icon: "ti-users",
    iconBg: "#FFF0F2",
    iconColor: "#FF3D5E",
  },
  {
    label: "Clases esta semana",
    value: "—",
    icon: "ti-calendar",
    iconBg: "#F0FAF5",
    iconColor: "#1D9E75",
  },
  {
    label: "Pagos pendientes",
    value: "—",
    icon: "ti-credit-card",
    iconBg: "#FEF8EE",
    iconColor: "#D97706",
  },
  {
    label: "Comunicados",
    value: "—",
    icon: "ti-bell",
    iconBg: "#EFF5FE",
    iconColor: "#3B82F6",
  },
];

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  });
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

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ padding: "4px 4px 0", marginBottom: "28px" }}>
        {/* Fecha */}
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

        {/* Saludo */}
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "white",
              borderRadius: "14px",
              border: "1px solid #EEECE8",
              padding: "20px",
            }}
          >
            {/* Icon chip */}
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

            {/* Number */}
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

            {/* Label */}
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
        ))}
      </div>

      {/* ── Panels ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        {/* Comunicados */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            border: "1px solid #EEECE8",
            overflow: "hidden",
          }}
        >
          {/* Panel header */}
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
              Últimos comunicados
            </h2>
            <a
              href="/dashboard/comunicados"
              style={{
                fontFamily: "var(--font-jakarta)",
                fontWeight: 500,
                fontSize: "12px",
                color: "#FF3D5E",
                textDecoration: "none",
              }}
            >
              Ver todos
            </a>
          </div>

          {/* Panel body */}
          <div style={{ padding: "16px 20px" }}>
            {/* Empty state */}
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
              No hay comunicados aún
            </div>

            {/*
              Cuando haya comunicados, cada ítem se renderizaría así:
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 0", borderBottom: "1px solid #F4F2EE" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF3D5E", marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#111111", fontWeight: 400, lineHeight: 1.4 }}>
                    Texto del comunicado
                  </div>
                  <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", color: "#aaaaaa", marginTop: "3px" }}>
                    hace 2 horas
                  </div>
                </div>
              </div>
            */}
          </div>
        </div>

        {/* Clases */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            border: "1px solid #EEECE8",
            overflow: "hidden",
          }}
        >
          {/* Panel header */}
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
              Próximas clases
            </h2>
            <a
              href="/dashboard/clases"
              style={{
                fontFamily: "var(--font-jakarta)",
                fontWeight: 500,
                fontSize: "12px",
                color: "#FF3D5E",
                textDecoration: "none",
              }}
            >
              Ver todas
            </a>
          </div>

          {/* Panel body */}
          <div style={{ padding: "16px 20px" }}>
            {/* Empty state */}
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
              No hay clases programadas
            </div>

            {/*
              Cuando haya clases, cada ítem se renderizaría así:
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F4F2EE" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", fontWeight: 500, color: "#111111" }}>
                    Ballet Clásico
                  </div>
                  <div style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", color: "#aaaaaa", marginTop: "2px" }}>
                    Lunes 18:00 — Sala A
                  </div>
                </div>
                // Badge por tipo: ballet, jazz, contemporary, etc.
                <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "11px", fontWeight: 500, color: "#1D9E75", background: "#F0FAF5", padding: "3px 8px", borderRadius: "6px" }}>
                  Ballet
                </span>
              </div>
            */}
          </div>
        </div>
      </div>
    </div>
  );
}
