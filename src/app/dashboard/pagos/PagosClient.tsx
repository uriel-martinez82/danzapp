"use client";

import { useState } from "react";
import { AnimatedList, AnimatedItem } from "@/components/AnimatedList";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedPayment = {
  id: string;
  studentId: string;
  schoolId: string;
  concept: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: string;
  method: string | null;
  student: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEffectiveStatus(p: SerializedPayment): "paid" | "overdue" | "pending" {
  if (p.status === "paid") return "paid";
  if (new Date(p.dueDate) < new Date()) return "overdue";
  return "pending";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// ── Config ────────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pendiente", bg: "#FEF3C7", color: "#92400E" },
  paid:    { label: "Pagado",    bg: "#D1FAE5", color: "#065F46" },
  overdue: { label: "Vencido",   bg: "#FEE2E2", color: "#991B1B" },
};

const methodLabels: Record<string, string> = {
  cash:     "Efectivo",
  transfer: "Transf.",
  card:     "Tarjeta",
  other:    "Otro",
};

const tabList = [
  { key: "all",     label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "paid",    label: "Pagados" },
  { key: "overdue", label: "Vencidos" },
] as const;

type Filter = "all" | "pending" | "paid" | "overdue";

// ── Component ─────────────────────────────────────────────────────────────────

export default function PagosClient({ payments }: { payments: SerializedPayment[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  // Attach effective status to each payment
  const withStatus = payments.map((p) => ({
    ...p,
    effectiveStatus: getEffectiveStatus(p),
  }));

  // Tab counts
  const counts: Record<Filter, number> = {
    all:     payments.length,
    pending: withStatus.filter((p) => p.effectiveStatus === "pending").length,
    paid:    withStatus.filter((p) => p.effectiveStatus === "paid").length,
    overdue: withStatus.filter((p) => p.effectiveStatus === "overdue").length,
  };

  const filtered =
    filter === "all" ? withStatus : withStatus.filter((p) => p.effectiveStatus === filter);

  const activeTab = tabList.find((t) => t.key === filter);

  return (
    <div>
      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
        {tabList.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "7px 14px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: isActive ? "#111111" : "#EEECE8",
                background: isActive ? "#111111" : "white",
                color: isActive ? "white" : "#555555",
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                fontWeight: isActive ? 500 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
              <span
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: isActive ? "rgba(255,255,255,0.18)" : "#F4F2EE",
                  color: isActive ? "white" : "#888888",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  minWidth: "18px",
                  textAlign: "center",
                }}
              >
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            border: "1px solid #EEECE8",
            padding: "60px 40px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              color: "#AAAAAA",
            }}
          >
            No hay pagos{" "}
            {filter !== "all"
              ? `con estado "${activeTab?.label.toLowerCase()}"`
              : "registrados"}.
          </p>
        </div>
      )}

      {/* ── Column headers ── */}
      {filtered.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr 130px 110px 100px 80px",
            gap: "0 16px",
            padding: "0 18px 8px",
            alignItems: "center",
          }}
        >
          {(["", "Alumno", "Monto", "Vencimiento", "Estado", "Método"] as const).map(
            (label, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#777777",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
            ),
          )}
        </div>
      )}

      {/* ── Payment rows ── */}
      {filtered.length > 0 && (
        <AnimatedList
          key={filter}
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          {filtered.map((p) => {
            const initials = getInitials(p.student.firstName, p.student.lastName);
            const status = statusConfig[p.effectiveStatus] ?? statusConfig.pending;
            const method = p.method ? (methodLabels[p.method] ?? p.method) : null;
            const isOverdue = p.effectiveStatus === "overdue";

            return (
              <AnimatedItem key={p.id}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr 130px 110px 100px 80px",
                    gap: "0 16px",
                    padding: "14px 18px",
                    background: "white",
                    borderRadius: "12px",
                    border: `1px solid ${isOverdue ? "#FECACA" : "#EEECE8"}`,
                    alignItems: "center",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#FF3D5E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontFamily: "var(--font-jakarta)",
                      fontWeight: 600,
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>

                  {/* Student name + concept */}
                  <div style={{ minWidth: 0 }}>
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
                      {p.student.firstName} {p.student.lastName}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "12px",
                        color: "#555555",
                        marginTop: "2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.concept}
                    </div>
                  </div>

                  {/* Amount */}
                  <div
                    style={{
                      fontFamily: "var(--font-fraunces)",
                      fontWeight: 400,
                      fontSize: "18px",
                      color: "#111111",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {formatCurrency(p.amount)}
                  </div>

                  {/* Due date */}
                  <div
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: "12px",
                      color: isOverdue ? "#991B1B" : "#777777",
                      fontWeight: isOverdue ? 500 : 400,
                    }}
                  >
                    {formatDate(p.dueDate)}
                  </div>

                  {/* Status badge */}
                  <div>
                    <span
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: status.bg,
                        color: status.color,
                        padding: "3px 9px",
                        borderRadius: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Method */}
                  <div
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: "12px",
                      color: "#888888",
                    }}
                  >
                    {method ?? "—"}
                  </div>
                </div>
              </AnimatedItem>
            );
          })}
        </AnimatedList>
      )}
    </div>
  );
}
