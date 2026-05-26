import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const audienceBadge: Record<string, { label: string; bg: string; color: string }> = {
  all:      { label: "Todos",      bg: "#F4F2EE", color: "#666666" },
  teachers: { label: "Profesores", bg: "#F0FAF5", color: "#1D9E75" },
  students: { label: "Alumnos",    bg: "#EFF5FE", color: "#3B82F6" },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function ComunicadosPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  });
  if (!user) redirect("/sign-in");

  if (!user.schoolId) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "14px", color: "#999999" }}>
          No tenés una escuela asignada.
        </p>
      </div>
    );
  }

  const announcements = await prisma.announcement.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { firstName: true, lastName: true, email: true },
      },
      _count: {
        select: { reads: true },
      },
    },
  });

  return (
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
            Comunicados
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              color: "#999999",
              marginTop: "4px",
            }}
          >
            {announcements.length}{" "}
            {announcements.length === 1 ? "comunicado" : "comunicados"}
          </p>
        </div>

        <Link
          href="/dashboard/comunicados/nuevo"
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
          Nuevo comunicado
        </Link>
      </div>

      {/* ── Empty state ── */}
      {announcements.length === 0 && (
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
              background: "#FFF0F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}
          >
            <i
              className="ti ti-bell"
              aria-hidden="true"
              style={{ fontSize: "22px", color: "#FF3D5E" }}
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
            Aún no hay comunicados
          </h2>

          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              color: "#999999",
              lineHeight: 1.6,
              marginBottom: "24px",
              maxWidth: 320,
              margin: "0 auto 24px",
            }}
          >
            Creá el primero para mantener informados a alumnos y profesores.
          </p>

          <Link
            href="/dashboard/comunicados/nuevo"
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
            Crear primer comunicado
          </Link>
        </div>
      )}

      {/* ── List ── */}
      {announcements.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {announcements.map((ann) => {
            const badge = audienceBadge[ann.audience] ?? audienceBadge.all;
            const authorName =
              ann.author.firstName
                ? `${ann.author.firstName} ${ann.author.lastName}`
                : ann.author.email;
            const bodyTruncated =
              ann.body.length > 100 ? ann.body.slice(0, 100) + "…" : ann.body;

            return (
              <div
                key={ann.id}
                style={{
                  background: "white",
                  borderRadius: "14px",
                  border: "1px solid #EEECE8",
                  padding: "20px 22px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#FF3D5E",
                    marginTop: 7,
                    flexShrink: 0,
                  }}
                />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title + badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-fraunces)",
                        fontWeight: 400,
                        fontSize: "16px",
                        letterSpacing: "-0.02em",
                        color: "#111111",
                      }}
                    >
                      {ann.title}
                    </h3>
                    <span
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: badge.bg,
                        color: badge.color,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Body preview */}
                  <p
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: "13px",
                      color: "#555555",
                      lineHeight: 1.55,
                      marginBottom: "12px",
                    }}
                  >
                    {bodyTruncated}
                  </p>

                  {/* Meta */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "11px",
                        color: "#aaaaaa",
                      }}
                    >
                      {authorName}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "11px",
                        color: "#aaaaaa",
                      }}
                    >
                      {formatDate(ann.createdAt)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "11px",
                        color: "#aaaaaa",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <i
                        className="ti ti-eye"
                        aria-hidden="true"
                        style={{ fontSize: "12px" }}
                      />
                      {ann._count.reads}{" "}
                      {ann._count.reads === 1 ? "lectura" : "lecturas"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
