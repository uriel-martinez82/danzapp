import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PageTransition from "@/components/PageTransition";
import PagosClient from "@/app/dashboard/pagos/PagosClient";
import type { SerializedPayment } from "@/app/dashboard/pagos/PagosClient";

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function MisPagosPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) redirect("/sign-in");

  // Solo alumnos
  if (user.role !== "student") redirect("/dashboard");

  const payments = await prisma.payment.findMany({
    where:   { studentId: user.id },
    orderBy: { dueDate: "desc" },
    include: {
      student: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const serialized: SerializedPayment[] = payments.map((p) => ({
    id:        p.id,
    studentId: p.studentId,
    schoolId:  p.schoolId,
    concept:   p.concept,
    amount:    p.amount,
    dueDate:   p.dueDate.toISOString(),
    paidAt:    p.paidAt?.toISOString() ?? null,
    status:    p.status,
    method:    p.method,
    student:   p.student,
  }));

  return (
    <PageTransition>
      <div>
        {/* ── Header ── */}
        <div style={{ paddingBottom: "24px", marginBottom: "4px" }}>
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
            Mis Pagos
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              color: "#999999",
              marginTop: "4px",
            }}
          >
            {payments.length} {payments.length === 1 ? "pago" : "pagos"} registrados
          </p>
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
              Sin pagos registrados
            </h2>
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                color: "#999999",
                lineHeight: 1.6,
              }}
            >
              Cuando el administrador registre un pago, aparecerá aquí.
            </p>
          </div>
        )}

        {/* ── Lista de pagos ── */}
        {payments.length > 0 && <PagosClient payments={serialized} />}
      </div>
    </PageTransition>
  );
}
