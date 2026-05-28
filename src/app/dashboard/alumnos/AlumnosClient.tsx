"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatedList, AnimatedItem } from "@/components/AnimatedList";
import AnimatedButton from "@/components/AnimatedButton";

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  active: boolean;
  createdAt: string;
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  border: "1px solid #EEECE8",
  borderRadius: "10px",
  padding: "10px 12px",
  fontFamily: "var(--font-jakarta)",
  fontSize: "14px",
  color: "#111111",
  background: "#FAFAF8",
  outline: "none",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-jakarta)",
  fontSize: "13px",
  fontWeight: 500,
  color: "#333333",
  marginBottom: "6px",
};

export default function AlumnosClient({ students }: { students: Student[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Close modal on Escape, focus first field on open
  useEffect(() => {
    if (!modalOpen) return;
    firstInputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  function openModal() {
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      email: fd.get("email") as string,
      phone: (fd.get("phone") as string) || undefined,
    };

    try {
      const res = await fetch("/api/alumnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al agregar el alumno");
      }

      setModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <>
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
          src="https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=1600&q=80"
          alt=""
          aria-hidden="true"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 35%",
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
              Alumnos
            </h1>
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: "13px",
                color: "rgba(255,255,255,0.65)",
                marginTop: "4px",
              }}
            >
              {students.length} {students.length === 1 ? "alumno" : "alumnos"}
            </p>
          </div>
          <AnimatedButton
            onClick={openModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#FF3D5E",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
            Invitar alumno
          </AnimatedButton>
        </div>
      </div>

      {/* ── Search ── */}
      {students.length > 0 && (
        <div style={{ position: "relative", marginBottom: "20px", maxWidth: 360 }}>
          <i
            className="ti ti-search"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "15px",
              color: "#bbbbbb",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid #EEECE8",
              borderRadius: "10px",
              padding: "10px 14px 10px 38px",
              fontFamily: "var(--font-jakarta)",
              fontSize: "14px",
              color: "#111111",
              background: "white",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
          />
        </div>
      )}

      {/* ── Empty state: no students ── */}
      {students.length === 0 && (
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
              className="ti ti-users"
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
            Aún no hay alumnos
          </h2>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              color: "#999999",
              lineHeight: 1.6,
              maxWidth: 300,
              margin: "0 auto 24px",
            }}
          >
            Invitá al primer alumno para comenzar a gestionar tu escuela.
          </p>
          <AnimatedButton
            onClick={openModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#FF3D5E",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontFamily: "var(--font-jakarta)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "14px" }} />
            Agregar primer alumno
          </AnimatedButton>
        </div>
      )}

      {/* ── Empty state: search no results ── */}
      {students.length > 0 && filtered.length === 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            border: "1px solid #EEECE8",
            padding: "48px 40px",
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "14px", color: "#999999" }}>
            No se encontraron resultados para{" "}
            <strong style={{ color: "#555555" }}>&ldquo;{search}&rdquo;</strong>
          </p>
        </div>
      )}

      {/* ── Student list ── */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "44px 1fr 160px 88px 108px 36px",
              gap: "0 16px",
              padding: "0 18px 8px",
              alignItems: "center",
            }}
          >
            {(["", "Nombre", "Teléfono", "Estado", "Ingreso", ""] as const).map(
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

          {/* Rows */}
          <AnimatedList style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((student) => {
              const initials = getInitials(student.firstName, student.lastName);
              return (
                <AnimatedItem key={student.id}>
                  <div
                    className="pasada-card"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 1fr 160px 88px 108px 36px",
                      gap: "0 16px",
                      padding: "14px 18px",
                      background: "white",
                      borderRadius: "12px",
                      alignItems: "center",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
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

                    {/* Name + email */}
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
                        {student.firstName} {student.lastName}
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
                        {student.email}
                      </div>
                    </div>

                    {/* Phone */}
                    <div
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "13px",
                        color: student.phone ? "#555555" : "#888888",
                      }}
                    >
                      {student.phone ?? "—"}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span
                        style={{
                          fontFamily: "var(--font-jakarta)",
                          fontSize: "11px",
                          fontWeight: 500,
                          background: student.active ? "#F0FAF5" : "#F4F2EE",
                          color: student.active ? "#1D9E75" : "#999999",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {student.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Join date */}
                    <div
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: "12px",
                        color: "#555555",
                      }}
                    >
                      {formatDate(student.createdAt)}
                    </div>

                    {/* Profile link */}
                    <Link
                      href={`/dashboard/alumnos/${student.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        color: "#cccccc",
                        textDecoration: "none",
                        transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#F4F2EE";
                        e.currentTarget.style.color = "#555555";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#cccccc";
                      }}
                    >
                      <i
                        className="ti ti-chevron-right"
                        aria-hidden="true"
                        style={{ fontSize: "16px" }}
                      />
                    </Link>
                  </div>
                </AnimatedItem>
              );
            })}
          </AnimatedList>
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <>
          {/* Overlay */}
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 50,
            }}
            onClick={() => setModalOpen(false)}
          />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: 480,
              width: "calc(100% - 32px)",
              zIndex: 51,
              boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "24px",
              }}
            >
              <h2
                id="modal-title"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontWeight: 400,
                  fontSize: "22px",
                  letterSpacing: "-0.02em",
                  color: "#111111",
                }}
              >
                Agregar alumno
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "none",
                  background: "transparent",
                  color: "#aaaaaa",
                  cursor: "pointer",
                  fontSize: "18px",
                  flexShrink: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F4F2EE";
                  e.currentTarget.style.color = "#555555";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#aaaaaa";
                }}
                aria-label="Cerrar"
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Nombre + Apellido */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label htmlFor="m-firstName" style={labelStyle}>
                    Nombre
                  </label>
                  <input
                    id="m-firstName"
                    ref={firstInputRef}
                    type="text"
                    name="firstName"
                    required
                    placeholder="Ana"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                  />
                </div>
                <div>
                  <label htmlFor="m-lastName" style={labelStyle}>
                    Apellido
                  </label>
                  <input
                    id="m-lastName"
                    type="text"
                    name="lastName"
                    required
                    placeholder="Bermúdez"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="m-email" style={labelStyle}>
                  Email
                </label>
                <input
                  id="m-email"
                  type="email"
                  name="email"
                  required
                  placeholder="ana@ejemplo.com"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="m-phone" style={labelStyle}>
                  Teléfono{" "}
                  <span style={{ color: "#aaaaaa", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  id="m-phone"
                  type="tel"
                  name="phone"
                  placeholder="+54 11 1234 5678"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF3D5E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#EEECE8")}
                />
              </div>

              {/* Error */}
              {formError && (
                <div
                  role="alert"
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "13px",
                    color: "#CC1F3C",
                    background: "#FFF0F2",
                    border: "1px solid #FFD0D8",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    lineHeight: 1.5,
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "10px",
                  paddingTop: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "13px",
                    color: "#999999",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 16px",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: loading ? "#FFAABB" : "#FF3D5E",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 20px",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {loading ? (
                    <>
                      <i
                        className="ti ti-loader-2"
                        aria-hidden="true"
                        style={{
                          fontSize: "14px",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Agregando…
                    </>
                  ) : (
                    <>
                      <i
                        className="ti ti-user-plus"
                        aria-hidden="true"
                        style={{ fontSize: "14px" }}
                      />
                      Agregar alumno
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
