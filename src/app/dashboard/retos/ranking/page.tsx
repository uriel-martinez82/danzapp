import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { AnimatedList, AnimatedItem } from "@/components/AnimatedList";

// ── Types ─────────────────────────────────────────────────────────────────────

type RankedStudent = {
  id:             string;
  firstName:      string;
  lastName:       string;
  avatarUrl:      string | null;
  totalPoints:    number;
  completedCount: number;
  isCurrentUser:  boolean;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Initials({ firstName, lastName }: { firstName: string; lastName: string }) {
  return <>{(firstName[0] ?? "").toUpperCase()}{(lastName[0] ?? "").toUpperCase()}</>;
}

const podiumColors = ["#F59E0B", "#9CA3AF", "#B45309"]; // 🥇🥈🥉
const podiumHeights = [120, 90, 72];

function PodiumBlock({
  student,
  rank,
}: {
  student: RankedStudent;
  rank: number;
}) {
  const color = podiumColors[rank - 1] ?? "#CCCCCC";
  const height = podiumHeights[rank - 1] ?? 60;
  const medal = ["🥇", "🥈", "🥉"][rank - 1] ?? `#${rank}`;

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            "8px",
        order:          rank === 2 ? -1 : rank === 1 ? 0 : 1,
      }}
    >
      {/* Avatar */}
      <div style={{ position: "relative" }}>
        {student.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={student.avatarUrl}
            alt={`${student.firstName} ${student.lastName}`}
            style={{
              width:        rank === 1 ? 64 : 52,
              height:       rank === 1 ? 64 : 52,
              borderRadius: "50%",
              objectFit:    "cover",
              border:       `3px solid ${color}`,
            }}
          />
        ) : (
          <div
            style={{
              width:          rank === 1 ? 64 : 52,
              height:         rank === 1 ? 64 : 52,
              borderRadius:   "50%",
              background:     color,
              border:         `3px solid ${color}`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              color:          "white",
              fontFamily:     "var(--font-jakarta)",
              fontWeight:     700,
              fontSize:       rank === 1 ? "20px" : "16px",
            }}
          >
            <Initials firstName={student.firstName} lastName={student.lastName} />
          </div>
        )}
        <span
          style={{
            position:     "absolute",
            bottom:       -4,
            right:        -4,
            fontSize:     "16px",
            lineHeight:   1,
          }}
        >
          {medal}
        </span>
      </div>

      {/* Name */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-jakarta)",
            fontWeight: 600,
            fontSize:   rank === 1 ? "14px" : "13px",
            color:      student.isCurrentUser ? "#FF3D5E" : "#111111",
            maxWidth:   100,
            overflow:   "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {student.firstName}
        </div>
        <div style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: rank === 1 ? "20px" : "17px", color, lineHeight: 1.1 }}>
          {student.totalPoints} pts
        </div>
      </div>

      {/* Podio block */}
      <div
        style={{
          width:        rank === 1 ? 100 : 80,
          height,
          background:   color,
          borderRadius: "8px 8px 0 0",
          opacity:      0.85,
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          color:        "white",
          fontFamily:   "var(--font-fraunces)",
          fontWeight:   400,
          fontSize:     "22px",
        }}
      >
        {rank}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function RankingPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) redirect("/sign-in");
  if (!user.schoolId) redirect("/dashboard");

  // Alumnos con sus entradas validadas
  const students = await prisma.user.findMany({
    where:   { schoolId: user.schoolId, role: "student", active: true },
    select:  {
      id:        true,
      firstName: true,
      lastName:  true,
      avatarUrl: true,
      challengeEntries: {
        where:   { status: "validated" },
        select:  { challenge: { select: { points: true } } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const ranked: RankedStudent[] = students
    .map((s) => ({
      id:             s.id,
      firstName:      s.firstName,
      lastName:       s.lastName,
      avatarUrl:      s.avatarUrl,
      totalPoints:    s.challengeEntries.reduce((sum, e) => sum + e.challenge.points, 0),
      completedCount: s.challengeEntries.length,
      isCurrentUser:  s.id === user.id,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.lastName.localeCompare(b.lastName));

  const top3  = ranked.slice(0, 3);
  const rest  = ranked.slice(3);
  const role  = String(user.role);

  // Posición del usuario actual
  const myRank = ranked.findIndex((s) => s.isCurrentUser) + 1;

  return (
    <PageTransition>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <Link
            href="/dashboard/retos"
            style={{
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              width:        36,
              height:       36,
              borderRadius: "10px",
              background:   "white",
              border:       "1px solid #EEECE8",
              color:        "#555555",
              textDecoration: "none",
              flexShrink:   0,
            }}
          >
            <i className="ti ti-arrow-left" aria-hidden="true" style={{ fontSize: "16px" }} />
          </Link>
          <div>
            <h1
              style={{
                fontFamily:    "var(--font-fraunces)",
                fontWeight:    300,
                fontSize:      "30px",
                letterSpacing: "-0.03em",
                color:         "#111111",
                lineHeight:    1.1,
              }}
            >
              Ranking de retos
            </h1>
            <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#999999", marginTop: "2px" }}>
              {ranked.length} alumna{ranked.length !== 1 ? "s" : ""} en competencia
            </p>
          </div>
        </div>

        {/* ── Mi posición (solo alumnos) ── */}
        {role === "student" && myRank > 0 && (
          <div
            style={{
              background:   "#FFF0F2",
              borderRadius: "12px",
              padding:      "14px 20px",
              marginBottom: "24px",
              display:      "flex",
              alignItems:   "center",
              gap:          "12px",
            }}
          >
            <i className="ti ti-trophy" aria-hidden="true" style={{ fontSize: "20px", color: "#FF3D5E" }} />
            <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "14px", color: "#111111" }}>
              Tu posición: <strong style={{ color: "#FF3D5E" }}>#{myRank}</strong>
              {" · "}
              <strong>{ranked[myRank - 1]?.totalPoints ?? 0} puntos</strong>
            </span>
          </div>
        )}

        {ranked.length === 0 ? (
          <div
            style={{
              background:   "white",
              borderRadius: "14px",
              border:       "1px solid #EEECE8",
              padding:      "80px 40px",
              textAlign:    "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🏆</div>
            <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "14px", color: "#999999" }}>
              Todavía no hay alumnos con puntos.
            </p>
          </div>
        ) : (
          <>
            {/* ── Podio top 3 ── */}
            {top3.length > 0 && (
              <div
                style={{
                  background:   "white",
                  borderRadius: "18px",
                  border:       "1px solid #EEECE8",
                  padding:      "32px 24px 0",
                  marginBottom: "16px",
                  overflow:     "hidden",
                }}
              >
                <div
                  style={{
                    display:        "flex",
                    justifyContent: "center",
                    alignItems:     "flex-end",
                    gap:            "16px",
                    marginBottom:   "0",
                  }}
                >
                  {/* Reordenar: 2º a la izquierda, 1º al centro, 3º a la derecha */}
                  {[
                    top3[1] && { s: top3[1], rank: 2 },
                    top3[0] && { s: top3[0], rank: 1 },
                    top3[2] && { s: top3[2], rank: 3 },
                  ]
                    .filter(Boolean)
                    .map(({ s, rank }) => (
                      <PodiumBlock key={s.id} student={s} rank={rank} />
                    ))}
                </div>
              </div>
            )}

            {/* ── Tabla completa ── */}
            {rest.length > 0 && (
              <div
                style={{
                  background:   "white",
                  borderRadius: "14px",
                  border:       "1px solid #EEECE8",
                  overflow:     "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display:            "grid",
                    gridTemplateColumns: "44px 1fr 80px 80px",
                    gap:                "0 12px",
                    padding:            "10px 20px",
                    borderBottom:       "1px solid #F4F2EE",
                  }}
                >
                  {(["#", "Alumna", "Retos", "Puntos"] as const).map((h) => (
                    <span
                      key={h}
                      style={{
                        fontFamily:   "var(--font-jakarta)",
                        fontSize:     "11px",
                        fontWeight:   500,
                        color:        "#777777",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <AnimatedList style={{ display: "flex", flexDirection: "column" }}>
                  {rest.map((student, i) => {
                    const rank = i + 4;
                    return (
                      <AnimatedItem key={student.id}>
                        <div
                          style={{
                            display:            "grid",
                            gridTemplateColumns: "44px 1fr 80px 80px",
                            gap:                "0 12px",
                            padding:            "12px 20px",
                            alignItems:         "center",
                            background:         student.isCurrentUser ? "#FFF8F8" : "white",
                            borderBottom:       "1px solid #F4F2EE",
                            borderLeft:         student.isCurrentUser ? "3px solid #FF3D5E" : "3px solid transparent",
                          }}
                        >
                          {/* Rank */}
                          <span
                            style={{
                              fontFamily:    "var(--font-fraunces)",
                              fontWeight:    400,
                              fontSize:      "16px",
                              color:         "#CCCCCC",
                              textAlign:     "center",
                            }}
                          >
                            {rank}
                          </span>

                          {/* Name + avatar */}
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            {student.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={student.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FF3D5E", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "11px", flexShrink: 0 }}>
                                <Initials firstName={student.firstName} lastName={student.lastName} />
                              </div>
                            )}
                            <span
                              style={{
                                fontFamily:   "var(--font-jakarta)",
                                fontSize:     "13px",
                                fontWeight:   student.isCurrentUser ? 600 : 400,
                                color:        student.isCurrentUser ? "#FF3D5E" : "#111111",
                                overflow:     "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace:   "nowrap",
                              }}
                            >
                              {student.firstName} {student.lastName}
                              {student.isCurrentUser && " (vos)"}
                            </span>
                          </div>

                          {/* Retos completados */}
                          <span style={{ fontFamily: "var(--font-jakarta)", fontSize: "13px", color: "#777777" }}>
                            {student.completedCount}
                          </span>

                          {/* Puntos */}
                          <span
                            style={{
                              fontFamily:    "var(--font-fraunces)",
                              fontWeight:    400,
                              fontSize:      "15px",
                              color:         "#FF3D5E",
                            }}
                          >
                            {student.totalPoints}
                          </span>
                        </div>
                      </AnimatedItem>
                    );
                  })}
                </AnimatedList>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
