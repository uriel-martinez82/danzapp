import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

function formatDate(date: Date | null, style: "long" | "short" = "long"): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(new Date(date));
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

type InfoRow = {
  label: string;
  value: string;
  icon: string;
};

export default async function AlumnoPerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const viewer = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  });
  if (!viewer) redirect("/sign-in");

  const student = await prisma.user.findUnique({
    where: { id },
  });

  // 404 if not found, wrong school, or wrong role
  if (
    !student ||
    student.role !== "student" ||
    student.schoolId !== viewer.schoolId
  ) {
    notFound();
  }

  const initials = getInitials(student.firstName, student.lastName);

  const infoRows: InfoRow[] = [
    { label: "Email",               value: student.email,                         icon: "ti-mail"     },
    { label: "Teléfono",            value: student.phone ?? "—",                  icon: "ti-phone"    },
    { label: "Fecha de nacimiento", value: formatDate(student.birthDate, "long"),  icon: "ti-cake"     },
    { label: "Fecha de ingreso",    value: formatDate(student.createdAt, "long"),  icon: "ti-calendar" },
  ];

  return (
    <div>
      {/* ── Back link ── */}
      <Link
        href="/dashboard/alumnos"
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
        Volver a alumnos
      </Link>

      {/* ── Profile card ── */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          border: "1px solid #EEECE8",
          padding: "36px 40px",
          maxWidth: 600,
        }}
      >
        {/* Avatar + name + badge */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#FF3D5E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontFamily: "var(--font-jakarta)",
              fontWeight: 700,
              fontSize: "22px",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div>
            <h1
              style={{
                fontFamily: "var(--font-fraunces)",
                fontWeight: 300,
                fontSize: "28px",
                letterSpacing: "-0.03em",
                color: "#111111",
                lineHeight: 1.1,
                marginBottom: "8px",
              }}
            >
              {student.firstName} {student.lastName}
            </h1>
            <span
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: "12px",
                fontWeight: 500,
                background: student.active ? "#F0FAF5" : "#F4F2EE",
                color: student.active ? "#1D9E75" : "#999999",
                padding: "3px 10px",
                borderRadius: "6px",
              }}
            >
              {student.active ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div>
          {infoRows.map(({ label, value, icon }, i) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 0",
                borderBottom: i < infoRows.length - 1 ? "1px solid #F4F2EE" : "none",
              }}
            >
              {/* Icon chip */}
              <div
                style={{
                  width: 34,
                  height: 34,
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
                  style={{ fontSize: "15px", color: "#999999" }}
                />
              </div>

              {/* Label + value */}
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#555555",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: "2px",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "14px",
                    color: value === "—" ? "#888888" : "#111111",
                  }}
                >
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
