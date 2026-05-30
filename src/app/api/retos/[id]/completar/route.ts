import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── POST /api/retos/[id]/completar ────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (String(user.role) !== "student")
    return NextResponse.json({ error: "Solo los alumnos pueden completar retos" }, { status: 403 });

  const { id: challengeId } = await params;

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge)
    return NextResponse.json({ error: "Reto no encontrado" }, { status: 404 });

  // No permitir marcar como completado si ya está validado
  const existing = await prisma.challengeEntry.findUnique({
    where: { challengeId_userId: { challengeId, userId: user.id } },
  });
  if (existing?.status === "validated")
    return NextResponse.json({ error: "Este reto ya fue validado" }, { status: 409 });

  const entry = await prisma.challengeEntry.upsert({
    where: { challengeId_userId: { challengeId, userId: user.id } },
    create: {
      challengeId,
      userId:      user.id,
      status:      "completed",
      completedAt: new Date(),
    },
    update: {
      status:      "completed",
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    entry: {
      id:          entry.id,
      status:      entry.status,
      completedAt: entry.completedAt?.toISOString() ?? null,
      validatedAt: entry.validatedAt?.toISOString() ?? null,
      note:        entry.note,
    },
  });
}
