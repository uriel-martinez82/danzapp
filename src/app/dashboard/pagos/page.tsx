import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PageTransition from "@/components/PageTransition";
import AnimatedButton from "@/components/AnimatedButton";
import PagosClient from "./PagosClient";
import type { SerializedPayment } from "./PagosClient";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getEffectiveStatus(
  status: string,
  dueDate: Date,
): "paid" | "overdue" | "pending" {
  if (status === "paid") return "paid";
  if (dueDate < new Date()) return "overdue";
  return "pending";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PagosPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) redirect("/sign-in");

  if (user.role !== "admin") redirect("/dashboard");

  if (!user.schoolId) {
    return (
      <PageTransition>
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "14px",
              color: "#999999",
            }}
          >
            No tenés una escuela asignada.
          </p>
        </div>
      </PageTransition>
    );
  }

  const payments = await prisma.payment.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { dueDate: "desc" },
    include: {
      student: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // Serialize for Client Component
  const serialized: SerializedPayment[] = payments.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    schoolId: p.schoolId,
    concept: p.concept,
    amount: p.amount,
    dueDate: p.dueDate.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    status: p.status,
    method: p.method,
    student: p.student,
  }));

  // Server-side stat computation
  const statPending = payments.filter(
    (p) => getEffectiveStatus(p.status, p.dueDate) === "pending",
  );
  const statPaid = payments.filter(
    (p) => getEffectiveStatus(p.status, p.dueDate) === "paid",
  );
  const statOverdue = payments.filter(
    (p) => getEffectiveStatus(p.status, p.dueDate) === "overdue",
  );

  const sumPending = statPending.reduce((acc, p) => acc + p.amount, 0);
  const sumPaid = statPaid.reduce((acc, p) => acc + p.amount, 0);
  const sumOverdue = statOverdue.reduce((acc, p) => acc + p.amount, 0);

  const stats = [
    {
      label: "Pendientes",
      count: statPending.length,
      amount: sumPending,
      icon: "ti-clock",
      iconBg: "#FEF3C7",
      iconColor: "#92400E",
    },
    {
      label: "Pagados",
      count: statPaid.length,
      amount: sumPaid,
      icon: "ti-circle-check",
      iconBg: "#D1FAE5",
      iconColor: "#065F46",
    },
    {
      label: "Vencidos",
      count: statOverdue.length,
      amount: sumOverdue,
      icon: "ti-alert-circle",
      iconBg: "#FEE2E2",
      iconColor: "#991B1B",
    },
  ];

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
              Pagos
            </h1>
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                color: "#999999",
                marginTop: "4px",
              }}
            >
              {payments.length} {payments.length === 1 ? "pago" : "pagos"} en
              total
            </p>
          </div>

          <AnimatedButton
            href="/dashboard/pagos/nuevo"
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
            <i
              className="ti ti-plus"
              aria-hidden="true"
              style={{ fontSize: "14px" }}
            />
            Registrar pago
          </AnimatedButton>
        </div>

        {/* ── Stat cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: "white",
                borderRadius: "14px",
                border: "1px solid #EEECE8",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  background: s.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i
                  className={`ti ${s.icon}`}
                  aria-hidden="true"
                  style={{ fontSize: "18px", color: s.iconColor }}
                />
              </div>

              {/* Text */}
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#999999",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "4px",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-fraunces)",
                    fontWeight: 400,
                    fontSize: "20px",
                    letterSpacing: "-0.02em",
                    color: "#111111",
                    lineHeight: 1,
                  }}
                >
                  {formatCurrency(s.amount)}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "11px",
                    color: "#AAAAAA",
                    marginTop: "2px",
                  }}
                >
                  {s.count} {s.count === 1 ? "pago" : "pagos"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Empty state ── */}
        {payments.length === 0 && (
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
                background: "#FEF3C7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
              }}
            >
              <i
                className="ti ti-cash"
                aria-hidden="true"
                style={{ fontSize: "22px", color: "#92400E" }}
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
              Aún no hay pagos
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
              Registrá el primer pago para comenzar a hacer el seguimiento de
              cobros.
            </p>
            <AnimatedButton
              href="/dashboard/pagos/nuevo"
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
              <i
                className="ti ti-plus"
                aria-hidden="true"
                style={{ fontSize: "14px" }}
              />
              Registrar primer pago
            </AnimatedButton>
          </div>
        )}

        {/* ── Client: filter tabs + list ── */}
        {payments.length > 0 && <PagosClient payments={serialized} />}
      </div>
    </PageTransition>
  );
}
