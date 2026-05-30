import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── POST /api/retos/[id]/validar ──────────────────────────────────────────────

type ValidateBody = {
  userId?:   string;
  approved?: boolean;
  note?:     string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const role = String(user.role);
  if (role !== "admin" && role !== "teacher")
    return NextResponse.json({ error: "Solo admin/profesor puede validar retos" }, { status: 403 });

  const { id: challengeId } = await params;

  let body: ValidateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { userId, approved, note } = body;
  if (!userId)
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  if (approved === undefined)
    return NextResponse.json({ error: "approved es requerido" }, { status: 400 });

  const entry = await prisma.challengeEntry.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  if (!entry)
    return NextResponse.json({ error: "El alumno no completó este reto" }, { status: 404 });

  const updated = await prisma.challengeEntry.update({
    where: { challengeId_userId: { challengeId, userId } },
    data: approved
      ? {
          status:      "validated",
          validatedAt: new Date(),
          validatedBy: user.id,
          note:        note?.trim() ?? null,
        }
      : {
          status:      "pending",
          completedAt: null,
          validatedAt: null,
          validatedBy: null,
          note:        note?.trim() ?? null,
        },
  });

  return NextResponse.json({
    ok: true,
    entry: {
      id:          updated.id,
      status:      updated.status,
      completedAt: updated.completedAt?.toISOString() ?? null,
      validatedAt: updated.validatedAt?.toISOString() ?? null,
      note:        updated.note,
    },
  });
}
