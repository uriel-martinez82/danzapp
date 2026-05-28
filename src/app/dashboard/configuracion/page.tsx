"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PageTransition from "@/components/PageTransition";

// ── Types ─────────────────────────────────────────────────────────────────────

type School = {
  id:          string;
  name:        string;
  slug:        string;
  logoUrl:     string | null;
  bannerUrl:   string | null;
  accentColor: string;
};

type Toast = { msg: string; type: "success" | "error" } | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily:    "var(--font-jakarta)",
        fontWeight:    600,
        fontSize:      "13px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color:         "#666666",
        marginBottom:  "12px",
      }}
    >
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pasada-card"
      style={{
        background:   "white",
        borderRadius: "14px",
        padding:      "24px",
        marginBottom: "16px",
      }}
    >
      {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const router = useRouter();

  const [school,  setSchool]  = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<Toast>(null);

  // Form state (pendiente para "nombre" y "color")
  const [nameInput,  setNameInput]  = useState("");
  const [colorInput, setColorInput] = useState("#FF3D5E");

  // Upload states
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo,   setUploadingLogo]   = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef   = useRef<HTMLInputElement>(null);

  // Debounce timer para auto-save del color
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load school data ──────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, schoolRes] = await Promise.all([
          fetch("/api/perfil"),
          fetch("/api/school"),
        ]);

        if (!profileRes.ok) { router.replace("/dashboard"); return; }
        const profile = await profileRes.json() as { role: string };
        if (profile.role !== "admin") { router.replace("/dashboard"); return; }

        if (!schoolRes.ok) { setLoading(false); return; }
        const data = await schoolRes.json() as School;
        setSchool(data);
        setNameInput(data.name);
        setColorInput(data.accentColor);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // ── Toast helper ──────────────────────────────────────────────────────────

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  // ── PATCH helper ─────────────────────────────────────────────────────────

  async function patchSchool(data: Record<string, string>) {
    const res = await fetch("/api/school", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(j.error ?? "Error al guardar");
    }
    return res.json() as Promise<School>;
  }

  // ── Save name ─────────────────────────────────────────────────────────────

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    try {
      const updated = await patchSchool({ name: nameInput.trim() });
      setSchool(updated);
      showToast("Nombre actualizado", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  // ── Auto-save color ───────────────────────────────────────────────────────

  function handleColorChange(value: string) {
    setColorInput(value);
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(async () => {
      try {
        const updated = await patchSchool({ accentColor: value });
        setSchool(updated);
        showToast("Color actualizado", "success");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Error", "error");
      }
    }, 600);
  }

  // ── Upload image ──────────────────────────────────────────────────────────

  async function handleUpload(
    file: File,
    type: "banner" | "logo",
  ) {
    const setter = type === "banner" ? setUploadingBanner : setUploadingLogo;
    setter(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/school/upload?type=${type}`, {
        method: "POST",
        body:   fd,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Error al subir la imagen");
      }

      const { url } = await res.json() as { url: string };
      setSchool((prev) =>
        prev
          ? { ...prev, ...(type === "banner" ? { bannerUrl: url } : { logoUrl: url }) }
          : prev,
      );
      showToast(
        type === "banner" ? "Banner actualizado" : "Logo actualizado",
        "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error al subir", "error");
    } finally {
      setter(false);
    }
  }

  // ── Loading / guard ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageTransition>
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            height:         "300px",
          }}
        >
          <i
            className="ti ti-loader-2"
            aria-hidden="true"
            style={{
              fontSize:  "24px",
              color:     "#CCCCCC",
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageTransition>
    );
  }

  if (!school) {
    return (
      <PageTransition>
        <p style={{ fontFamily: "var(--font-jakarta)", color: "#999", fontSize: "14px" }}>
          No se pudo cargar la configuración de la escuela.
        </p>
      </PageTransition>
    );
  }

  const accent = school.accentColor;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      {/* ── Toast ── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position:     "fixed",
            bottom:       "28px",
            right:        "28px",
            zIndex:       999,
            background:   toast.type === "success" ? "#111111" : "#CC1F3C",
            color:        "white",
            fontFamily:   "var(--font-jakarta)",
            fontSize:     "13px",
            fontWeight:   500,
            padding:      "12px 20px",
            borderRadius: "10px",
            boxShadow:    "0 4px 20px rgba(0,0,0,0.18)",
            display:      "flex",
            alignItems:   "center",
            gap:          "8px",
          }}
        >
          <i
            className={`ti ${toast.type === "success" ? "ti-check" : "ti-alert-circle"}`}
            aria-hidden="true"
            style={{ fontSize: "15px" }}
          />
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 720 }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontFamily:    "var(--font-fraunces)",
              fontWeight:    300,
              fontSize:      "32px",
              letterSpacing: "-0.03em",
              color:         "#111111",
              lineHeight:    1.1,
            }}
          >
            Configuración
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize:   "13px",
              color:      "#999999",
              marginTop:  "4px",
            }}
          >
            Personalizá la identidad visual de tu escuela
          </p>
        </div>

        {/* ── Preview en vivo ── */}
        <SectionTitle>Preview del banner</SectionTitle>
        <div
          style={{
            position:     "relative",
            height:       180,
            borderRadius: "16px",
            overflow:     "hidden",
            marginBottom: "24px",
            background:   school.bannerUrl
              ? "transparent"
              : `linear-gradient(135deg, ${accent}22 0%, ${accent}55 100%)`,
          }}
        >
          {school.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.bannerUrl}
              alt="Banner de la escuela"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
            />
          ) : (
            /* Placeholder con gradiente si no hay banner */
            <div
              style={{
                position:   "absolute",
                inset:      0,
                background: `linear-gradient(135deg, ${accent}33 0%, ${accent}88 100%)`,
                display:    "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="ti ti-photo"
                aria-hidden="true"
                style={{ fontSize: "40px", color: `${accent}99` }}
              />
            </div>
          )}

          {/* Overlay oscuro */}
          {school.bannerUrl && (
            <div
              style={{
                position:   "absolute",
                inset:      0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)",
              }}
            />
          )}

          {/* Contenido superpuesto */}
          <div
            style={{
              position: "absolute",
              bottom:   0,
              left:     0,
              right:    0,
              padding:  "20px 24px",
              display:  "flex",
              alignItems: "flex-end",
              gap:      "12px",
            }}
          >
            {/* Logo preview */}
            {school.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logoUrl}
                alt="Logo de la escuela"
                style={{
                  width:        56,
                  height:       56,
                  borderRadius: "50%",
                  objectFit:    "cover",
                  border:       "2px solid rgba(255,255,255,0.4)",
                  flexShrink:   0,
                }}
              />
            ) : (
              <div
                style={{
                  width:           56,
                  height:          56,
                  borderRadius:    "50%",
                  background:      school.bannerUrl ? "rgba(255,255,255,0.18)" : `${accent}44`,
                  border:          "2px solid rgba(255,255,255,0.3)",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  flexShrink:      0,
                }}
              >
                <i
                  className="ti ti-building"
                  aria-hidden="true"
                  style={{
                    fontSize: "22px",
                    color:    school.bannerUrl ? "rgba(255,255,255,0.6)" : accent,
                  }}
                />
              </div>
            )}

            {/* Nombre de la escuela */}
            <div>
              <h2
                style={{
                  fontFamily:    "var(--font-fraunces)",
                  fontWeight:    300,
                  fontSize:      "22px",
                  letterSpacing: "-0.02em",
                  color:         school.bannerUrl ? "white" : accent,
                  lineHeight:    1.2,
                }}
              >
                {school.name}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize:   "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color:      school.bannerUrl ? "rgba(255,255,255,0.58)" : `${accent}99`,
                  marginTop:  "2px",
                }}
              >
                gestión de danza
              </p>
            </div>
          </div>
        </div>

        {/* ── Banner ── */}
        <SectionTitle>Banner</SectionTitle>
        <Card>
          <div
            style={{
              display:    "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap:        "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize:   "13px",
                  fontWeight: 500,
                  color:      "#333333",
                  marginBottom: "4px",
                }}
              >
                Imagen de fondo del dashboard
              </p>
              <p
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize:   "12px",
                  color:      "#999999",
                  lineHeight: 1.5,
                }}
              >
                JPG, PNG o WEBP · máx. 3 MB · recomendado 1600 × 400 px
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              {school.bannerUrl && (
                <button
                  onClick={async () => {
                    try {
                      const updated = await patchSchool({ bannerUrl: "" });
                      setSchool(updated);
                      showToast("Banner eliminado", "success");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Error", "error");
                    }
                  }}
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize:   "12px",
                    color:      "#CC1F3C",
                    background: "none",
                    border:     "none",
                    cursor:     "pointer",
                    padding:    "8px 12px",
                    borderRadius: "8px",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF0F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  Quitar
                </button>
              )}

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { handleUpload(file, "banner"); e.target.value = ""; }
                }}
              />
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          "6px",
                  background:   uploadingBanner ? "#F4F2EE" : "#111111",
                  color:        uploadingBanner ? "#999999" : "white",
                  border:       "none",
                  borderRadius: "10px",
                  padding:      "10px 18px",
                  fontFamily:   "var(--font-jakarta)",
                  fontSize:     "13px",
                  fontWeight:   500,
                  cursor:       uploadingBanner ? "not-allowed" : "pointer",
                  transition:   "background 0.15s",
                  flexShrink:   0,
                }}
              >
                {uploadingBanner ? (
                  <>
                    <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: "14px", animation: "spin 1s linear infinite" }} />
                    Subiendo…
                  </>
                ) : (
                  <>
                    <i className="ti ti-upload" aria-hidden="true" style={{ fontSize: "14px" }} />
                    {school.bannerUrl ? "Cambiar imagen" : "Subir imagen"}
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* ── Logo ── */}
        <SectionTitle>Logo</SectionTitle>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {/* Logo preview circular */}
            {school.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logoUrl}
                alt="Logo actual"
                style={{
                  width:        64,
                  height:       64,
                  borderRadius: "50%",
                  objectFit:    "cover",
                  border:       "2px solid #EEECE8",
                  flexShrink:   0,
                }}
              />
            ) : (
              <div
                style={{
                  width:          64,
                  height:         64,
                  borderRadius:   "50%",
                  background:     "#F4F2EE",
                  border:         "2px solid #EEECE8",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  flexShrink:     0,
                }}
              >
                <i className="ti ti-building" aria-hidden="true" style={{ fontSize: "24px", color: "#CCCCCC" }} />
              </div>
            )}

            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily:   "var(--font-jakarta)",
                  fontSize:     "13px",
                  fontWeight:   500,
                  color:        "#333333",
                  marginBottom: "4px",
                }}
              >
                Logo de la escuela
              </p>
              <p
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize:   "12px",
                  color:      "#999999",
                  lineHeight: 1.5,
                }}
              >
                Se muestra en la esquina del banner · cuadrado recomendado · máx. 3 MB
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              {school.logoUrl && (
                <button
                  onClick={async () => {
                    try {
                      const updated = await patchSchool({ logoUrl: "" });
                      setSchool(updated);
                      showToast("Logo eliminado", "success");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Error", "error");
                    }
                  }}
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    fontSize:   "12px",
                    color:      "#CC1F3C",
                    background: "none",
                    border:     "none",
                    cursor:     "pointer",
                    padding:    "8px 12px",
                    borderRadius: "8px",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF0F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  Quitar
                </button>
              )}

              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { handleUpload(file, "logo"); e.target.value = ""; }
                }}
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          "6px",
                  background:   uploadingLogo ? "#F4F2EE" : "#111111",
                  color:        uploadingLogo ? "#999999" : "white",
                  border:       "none",
                  borderRadius: "10px",
                  padding:      "10px 18px",
                  fontFamily:   "var(--font-jakarta)",
                  fontSize:     "13px",
                  fontWeight:   500,
                  cursor:       uploadingLogo ? "not-allowed" : "pointer",
                  transition:   "background 0.15s",
                  flexShrink:   0,
                }}
              >
                {uploadingLogo ? (
                  <>
                    <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: "14px", animation: "spin 1s linear infinite" }} />
                    Subiendo…
                  </>
                ) : (
                  <>
                    <i className="ti ti-upload" aria-hidden="true" style={{ fontSize: "14px" }} />
                    {school.logoUrl ? "Cambiar logo" : "Subir logo"}
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* ── Nombre ── */}
        <SectionTitle>Nombre de la escuela</SectionTitle>
        <Card>
          <form onSubmit={saveName} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="school-name"
                style={{
                  display:      "block",
                  fontFamily:   "var(--font-jakarta)",
                  fontSize:     "12px",
                  fontWeight:   500,
                  color:        "#555555",
                  marginBottom: "6px",
                }}
              >
                Nombre
              </label>
              <input
                id="school-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nombre de tu escuela"
                required
                style={{
                  display:      "block",
                  width:        "100%",
                  border:       "1px solid #EEECE8",
                  borderRadius: "10px",
                  padding:      "10px 14px",
                  fontFamily:   "var(--font-jakarta)",
                  fontSize:     "14px",
                  color:        "#111111",
                  background:   "#FAFAF8",
                  outline:      "none",
                  transition:   "border-color 0.15s",
                }}
                onFocus={(e)  => (e.currentTarget.style.borderColor = accent)}
                onBlur={(e)   => (e.currentTarget.style.borderColor = "#EEECE8")}
              />
            </div>
            <button
              type="submit"
              disabled={!nameInput.trim() || nameInput.trim() === school.name}
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "6px",
                background:   (!nameInput.trim() || nameInput.trim() === school.name) ? "#F4F2EE" : accent,
                color:        (!nameInput.trim() || nameInput.trim() === school.name) ? "#AAAAAA" : "white",
                border:       "none",
                borderRadius: "10px",
                padding:      "10px 20px",
                fontFamily:   "var(--font-jakarta)",
                fontSize:     "13px",
                fontWeight:   500,
                cursor:       (!nameInput.trim() || nameInput.trim() === school.name) ? "not-allowed" : "pointer",
                transition:   "background 0.15s",
                flexShrink:   0,
                marginBottom: "0",
              }}
            >
              <i className="ti ti-device-floppy" aria-hidden="true" style={{ fontSize: "14px" }} />
              Guardar
            </button>
          </form>
        </Card>

        {/* ── Color de acento ── */}
        <SectionTitle>Color de acento</SectionTitle>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {/* Círculo de color + input nativo superpuesto */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                <div
                  style={{
                    width:        48,
                    height:       48,
                    borderRadius: "50%",
                    background:   colorInput,
                    border:       "3px solid white",
                    boxShadow:    "0 0 0 1px #EEECE8",
                    transition:   "background 0.2s",
                  }}
                />
                {/* Input nativo transparente sobre el círculo — abre el color picker al hacer clic */}
                <input
                  type="color"
                  value={colorInput}
                  onChange={(e) => handleColorChange(e.target.value)}
                  title="Elegir color"
                  style={{
                    position:     "absolute",
                    inset:        0,
                    width:        "100%",
                    height:       "100%",
                    opacity:      0,
                    cursor:       "pointer",
                    border:       "none",
                    borderRadius: "50%",
                    padding:      0,
                  }}
                />
              </div>
              <div>
                <p
                  style={{
                    fontFamily:   "var(--font-jakarta)",
                    fontSize:     "13px",
                    fontWeight:   500,
                    color:        "#333333",
                    marginBottom: "2px",
                  }}
                >
                  Color principal
                </p>
                <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "12px", color: "#999999" }}>
                  {colorInput.toUpperCase()} · Clic en el círculo para elegir
                </p>
              </div>
            </div>

            {/* Paleta de sugerencias */}
            <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
              {["#FF3D5E", "#1D9E75", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899"].map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => handleColorChange(c)}
                  style={{
                    width:        28,
                    height:       28,
                    borderRadius: "50%",
                    background:   c,
                    border:       colorInput === c ? "3px solid white" : "2px solid transparent",
                    boxShadow:    colorInput === c ? `0 0 0 2px ${c}` : "none",
                    cursor:       "pointer",
                    transition:   "box-shadow 0.15s, border 0.15s",
                    flexShrink:   0,
                  }}
                />
              ))}
            </div>
          </div>
        </Card>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </PageTransition>
  );
}
