import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── POST /api/notificaciones/[id]/leer ────────────────────────────────────────

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

  const { id: notificationId } = await params;

  // Verificar que la notificación pertenece a la escuela del usuario
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || notification.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });

  // Upsert — si ya existe el registro no hace nada
  await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: { notificationId, userId: user.id },
    },
    create: { notificationId, userId: user.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
